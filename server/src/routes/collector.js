const router = require("express").Router();
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
router.use(auth, roleCheck("COLLECTOR"));
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/settlements/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });
router.get("/dashboard", async (req, res) => {
  try {
    const collectorId = req.user.collectorId;

    const collector = await prisma.collector.findUnique({
      where: { id: collectorId },
      select: { adminId: true },
    });
    const adminId = collector.adminId;

    const merchants = await prisma.merchant.findMany({
      where: { adminId },
      select: { id: true },
    });
    const merchantIds = merchants.map((m) => m.id);

    const [
      clearedAgg,
      agentCommAgg,
      adminCommAgg,
      merchantSettledList,
      agentSettledList,
      merchantPending,
      merchantConfirmed,
      agentPending,
      agentConfirmed,
      allMerchantRates,   // ← added
      allAgentRates,      // ← added
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { merchantId: { in: merchantIds }, status: "CLEARED" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { merchantId: { in: merchantIds }, status: "CLEARED" },
        _sum: { agentCommission: true },
      }),
      prisma.transaction.aggregate({
        where: { merchantId: { in: merchantIds }, status: "CLEARED" },
        _sum: { adminCommission: true },
      }),
      prisma.settlement.findMany({
        where: { collectorId, merchantId: { not: null }, status: "CONFIRMED" },
        select: { amount: true, currency: true, merchantId: true }, // ← added merchantId
      }),
      prisma.settlement.findMany({
        where: { collectorId, agentId: { not: null }, status: "CONFIRMED" },
        select: { amount: true, currency: true, agentId: true }, // ← added agentId
      }),
      prisma.settlement.findMany({
        where: {
          collectorId,
          merchantId: { not: null },
          status: { in: ["PENDING", "PICKED", "SUBMITTED"] },
        },
        select: { amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: {
          collectorId,
          merchantId: { not: null },
          status: { in: ["CONFIRMED", "PAID"] },
        },
        select: { amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: {
          collectorId,
          agentId: { not: null },
          status: { in: ["PENDING", "PICKED", "SUBMITTED"] },
        },
        select: { amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: {
          collectorId,
          agentId: { not: null },
          status: { in: ["CONFIRMED", "PAID"] },
        },
        select: { amount: true, currency: true },
      }),
      prisma.rateConfig.findMany({
        where: { merchantId: { not: null }, adminId },
        select: { merchantId: true, aedTodayRate: true, usdtTodayRate: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.rateConfig.findMany({
        where: { agentId: { not: null }, adminId },
        select: { agentId: true, aedTodayRate: true, usdtTodayRate: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // ✅ Build per-entity rate maps
    const merchantRateMap = {};
    allMerchantRates.forEach((r) => {
      if (!merchantRateMap[r.merchantId]) merchantRateMap[r.merchantId] = r;
    });
    const agentRateMap = {};
    allAgentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    // ✅ Fallback global rate
    const rateConfig = await prisma.rateConfig.findFirst({
      where: { adminId },
      orderBy: { updatedAt: "desc" },
    });
    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);

    // ✅ Per-merchant rate for settlements
    const merchantSettledInr = merchantSettledList.reduce((sum, s) => {
      const rate = parseFloat(merchantRateMap[s.merchantId]?.aedTodayRate || aedRate);
      const uRate = parseFloat(merchantRateMap[s.merchantId]?.usdtTodayRate || usdtRate);
      const amt = parseFloat(s.amount || 0);
      return sum + (s.currency === "USDT" ? amt * uRate : amt * rate);
    }, 0);

    // ✅ Per-agent rate for settlements
    const agentSettledInr = agentSettledList.reduce((sum, s) => {
      const rate = parseFloat(agentRateMap[s.agentId]?.aedTodayRate || aedRate);
      const uRate = parseFloat(agentRateMap[s.agentId]?.usdtTodayRate || usdtRate);
      const amt = parseFloat(s.amount || 0);
      return sum + (s.currency === "USDT" ? amt * uRate : amt * rate);
    }, 0);

    const sumByCurrency = (list) => ({
      aed: list
        .filter((s) => s.currency !== "USDT")
        .reduce((s, r) => s + parseFloat(r.amount), 0),
      usdt: list
        .filter((s) => s.currency === "USDT")
        .reduce((s, r) => s + parseFloat(r.amount), 0),
    });

    const totalCleared = parseFloat(clearedAgg._sum.amount || 0);
    const totalAgentCommission = parseFloat(agentCommAgg._sum.agentCommission || 0);

    const totalMerchantLena = totalCleared - merchantSettledInr;
    const totalAgentDena = totalCleared - totalAgentCommission - agentSettledInr;

    res.json({
      success: true,
      data: {
        totalCleared,
        totalMerchantLena,
        totalAgentDena,
        merchantSettled: sumByCurrency(merchantSettledList),
        agentSettled: sumByCurrency(agentSettledList),
        merchantPending: sumByCurrency(merchantPending),
        merchantConfirmed: sumByCurrency(merchantConfirmed),
        agentPending: sumByCurrency(agentPending),
        agentConfirmed: sumByCurrency(agentConfirmed),
        totalAdminCommission: parseFloat(adminCommAgg._sum.adminCommission || 0),
      },
    });
  } catch (error) {
    console.error("Collector dashboard error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/requests", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await prisma.request.findMany({
        where: { collectorId: req.user.collectorId },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/requests", async (req, res) => {
  try {
    const { amount, description } = req.body;
    res.status(201).json({
      success: true,
      data: await prisma.request.create({
        data: {
          amount: parseFloat(amount),
          description,
          collectorId: req.user.collectorId,
        },
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Settlements ───
router.get("/settlements", async (req, res) => {
  try {
    const data = await prisma.settlement.findMany({
      where: {
        OR: [
          { status: "PENDING", collectorId: null }, // merchant requests to pick
          { collectorId: req.user.collectorId }, // this collector's own records
        ],
      },
      include: {
        merchant: { select: { name: true } },
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements/:id/pick", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.status !== "PENDING")
      return res
        .status(400)
        .json({ success: false, message: "Already picked." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "PICKED", collectorId: req.user.collectorId },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements/:id/submit", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.collectorId !== req.user.collectorId)
      return res
        .status(403)
        .json({ success: false, message: "Not your settlement." });
    if (settlement.status !== "PICKED")
      return res
        .status(400)
        .json({ success: false, message: "Must be picked first." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "SUBMITTED" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements/:id/reject", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.collectorId !== req.user.collectorId)
      return res
        .status(403)
        .json({ success: false, message: "Not your settlement." });
    if (settlement.status !== "PICKED")
      return res
        .status(400)
        .json({ success: false, message: "Must be picked first." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "REJECTED" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});
router.get("/agents", async (req, res) => {
  try {
    const data = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements", async (req, res) => {
  try {
    const { amount, currency, agentId, remark } = req.body;
    const s = await prisma.settlement.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || "AED",
        collectorId: req.user.collectorId,
        agentId: agentId ? parseInt(agentId) : null,
        remark,
      },
    });
    res.status(201).json({ success: true, data: s });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});
router.post(
  "/settlements/:id/pay",
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const settlement = await prisma.settlement.findUnique({
        where: { id: parseInt(req.params.id) },
      });
      if (!settlement)
        return res.status(404).json({ success: false, message: "Not found." });
      if (settlement.status !== "SUBMITTED")
        return res
          .status(400)
          .json({ success: false, message: "Must be submitted first." });

      const { payRemark } = req.body;
      const updated = await prisma.settlement.update({
        where: { id: parseInt(req.params.id) },
        data: {
          status: "PAID",
          payRemark: payRemark || null,
          payScreenshot: req.file ? req.file.filename : null,
        },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

router.get("/ledger", async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;

    const collector = await prisma.collector.findUnique({
      where: { id: req.user.collectorId },
      select: { adminId: true },
    });
    const adminId = collector.adminId;

    const merchants = await prisma.merchant.findMany({
      where: { adminId },
      select: { id: true, name: true },
    });
    const merchantIds = merchants.map((m) => m.id);
    const merchantNameMap = {};
    merchants.forEach((m) => (merchantNameMap[m.id] = m.name));

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");

    const txWhere = { merchantId: { in: merchantIds }, status: "CLEARED" };
    if (startDate || endDate) txWhere.transactionClearTime = { ...dateFilter };
    if (agentId) txWhere.agentId = parseInt(agentId);

    const [
      clearedTxns,
      agentTotals,
      merchantSettlements,
      agentSettlements,
      allAgentRates,
      agents,
      adminCommAgg,
    ] = await Promise.all([
      // Use stored aedRate per transaction for merchant AED calculation
      prisma.transaction.findMany({
        where: txWhere,
        select: { merchantId: true, agentId: true, amount: true, agentCommission: true, aedRate: true },
      }),
      prisma.transaction.groupBy({
        by: ["agentId"],
        where: txWhere,
        _sum: { amount: true, agentCommission: true },
      }),
      prisma.settlement.findMany({
        where: {
          merchant: { adminId },
          status: "CONFIRMED",
          ...(startDate || endDate ? { updatedAt: dateFilter } : {}),
        },
        select: { merchantId: true, amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: {
          agent: { adminId },
          status: "CONFIRMED",
          ...(startDate || endDate ? { updatedAt: dateFilter } : {}),
        },
        select: { agentId: true, amount: true, currency: true },
      }),
      prisma.rateConfig.findMany({ where: { agentId: { not: null }, adminId }, orderBy: { updatedAt: "desc" } }),
      prisma.agent.findMany({ where: { adminId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.transaction.aggregate({ where: txWhere, _sum: { adminCommission: true } }),
    ]);

    // Agent rate map (agent's own rate)
    const agentRateMap = {};
    allAgentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    const agentNameMap = {};
    agents.forEach((a) => (agentNameMap[a.id] = a.name));

    // ── Merchant: compute totalAED from stored per-transaction aedRate ──
    const merchantMap = {};
    clearedTxns.forEach((tx) => {
      const mId = tx.merchantId;
      if (!merchantMap[mId]) merchantMap[mId] = { totalINR: 0, totalAED: 0, lastRate: 0 };
      const amt = parseFloat(tx.amount || 0);
      const rate = parseFloat(tx.aedRate || 0);
      merchantMap[mId].totalINR += amt;
      if (rate > 0) {
        merchantMap[mId].totalAED += amt / rate;
        merchantMap[mId].lastRate = rate;
      }
    });

    // Merchant settled in AED directly
    const merchantSettledAedMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledAedMap[s.merchantId]) merchantSettledAedMap[s.merchantId] = 0;
      if (s.currency === "AED") {
        merchantSettledAedMap[s.merchantId] += parseFloat(s.amount || 0);
      }
    });

    // Agent settled in INR using agent's own rate
    const agentSettledMap = {};
    agentSettlements.forEach((s) => {
      const aedRate = parseFloat(agentRateMap[s.agentId]?.aedTodayRate || 1);
      const usdtRate = parseFloat(agentRateMap[s.agentId]?.usdtTodayRate || 1);
      const inr = s.currency === "USDT" ? parseFloat(s.amount) * usdtRate : parseFloat(s.amount) * aedRate;
      if (!agentSettledMap[s.agentId]) agentSettledMap[s.agentId] = 0;
      agentSettledMap[s.agentId] += inr;
    });

    // ── Merchant ledger rows — AED based ──
    const merchantLedger = Object.keys(merchantMap).map((mId) => {
      const id = parseInt(mId);
      const data = merchantMap[id];
      const totalAed = parseFloat(data.totalAED.toFixed(2));
      const settledAed = parseFloat((merchantSettledAedMap[id] || 0).toFixed(2));
      const pendingAed = parseFloat((totalAed - settledAed).toFixed(2));
      const effectiveRate = data.totalAED > 0 ? data.totalINR / data.totalAED : data.lastRate;
      const pendingInr = parseFloat((pendingAed * effectiveRate).toFixed(2));
      const settledInr = parseFloat((settledAed * effectiveRate).toFixed(2));
      return {
        id,
        name: merchantNameMap[id] || "Unknown",
        total: data.totalINR,
        settled: settledInr,
        settledAed,
        pending: pendingInr,
        pendingAed,
        aedRate: parseFloat(effectiveRate.toFixed(4)),
      };
    });

    // ── Agent ledger rows — use agent's own rate ──
    const agentLedger = agentTotals.filter((a) => a.agentId).map((a) => {
      const aedRate = parseFloat(agentRateMap[a.agentId]?.aedTodayRate || 1);
      const total = parseFloat(a._sum.amount || 0);
      const commission = parseFloat(a._sum.agentCommission || 0);
      const net = total - commission;
      const settled = agentSettledMap[a.agentId] || 0;
      const pending = net - settled;
      return {
        id: a.agentId,
        name: agentNameMap[a.agentId] || "Unknown",
        total: net,
        settled,
        settledAed: aedRate > 0 ? settled / aedRate : 0,
        pending,
        pendingAed: aedRate > 0 ? pending / aedRate : 0,
        aedRate,
      };
    });

    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);
    const mGrandPending = merchantLedger.reduce((s, e) => s + e.pending, 0);
    const aGrandPending = agentLedger.reduce((s, e) => s + e.pending, 0);
    const mGrandPendingAed = merchantLedger.reduce((s, e) => s + e.pendingAed, 0);
    const aGrandPendingAed = agentLedger.reduce((s, e) => s + e.pendingAed, 0);
    const mGrandSettledAed = merchantLedger.reduce((s, e) => s + e.settledAed, 0);
    const aGrandSettledAed = agentLedger.reduce((s, e) => s + e.settledAed, 0);

    res.json({
      success: true,
      merchantLedger,
      agentLedger,
      agents,
      summary: {
        merchantPending: mGrandPending,
        merchantPendingAed: mGrandPendingAed,
        merchantSettled: merchantLedger.reduce((s, e) => s + e.settled, 0),
        merchantSettledAed: mGrandSettledAed,
        agentPending: aGrandPending,
        agentPendingAed: aGrandPendingAed,
        agentSettled: agentLedger.reduce((s, e) => s + e.settled, 0),
        agentSettledAed: aGrandSettledAed,
        totalAdminCommission,
        totalAdminCommissionAed: mGrandPendingAed > 0 ? totalAdminCommission / (mGrandPending / mGrandPendingAed || 1) : 0,
        agentPendingWithComm: aGrandPending + totalAdminCommission,
        agentPendingWithCommAed: aGrandPendingAed,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/trial-balance", async (req, res) => {
  try {
    const collectorId = req.user.collectorId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");

    const collector = await prisma.collector.findUnique({
      where: { id: collectorId },
      select: { adminId: true },
    });
    const adminId = collector?.adminId;

    const merchants = await prisma.merchant.findMany({
      where: { adminId },
      select: { id: true, name: true },
    });
    const merchantIds = merchants.map((m) => m.id);
    const merchantNameMap = {};
    merchants.forEach((m) => (merchantNameMap[m.id] = m.name));

    const txWhere = {
      merchantId: { in: merchantIds },
      status: "CLEARED",
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    };

    const [
      clearedTxns,
      agentTotals,
      merchantSettlements,
      agentSettlements,
      allAgentRates,
      adminCommAgg,
    ] = await Promise.all([
      // Use stored aedRate per transaction for merchant AED calculation
      prisma.transaction.findMany({
        where: txWhere,
        select: { merchantId: true, agentId: true, amount: true, agentCommission: true, aedRate: true },
      }),
      prisma.transaction.groupBy({
        by: ["agentId"],
        where: txWhere,
        _sum: { amount: true, agentCommission: true },
      }),
      prisma.settlement.findMany({
        where: { collectorId, merchantId: { not: null }, status: "CONFIRMED" },
        select: { merchantId: true, amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: { collectorId, agentId: { not: null }, status: "CONFIRMED" },
        select: { agentId: true, amount: true, currency: true },
      }),
      prisma.rateConfig.findMany({
        where: { agentId: { not: null }, adminId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.transaction.aggregate({
        where: txWhere,
        _sum: { adminCommission: true },
      }),
    ]);

    const agentRateMap = {};
    allAgentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    // ── Merchant: compute totalAED from stored per-transaction aedRate ──
    const merchantAedMap = {};
    const merchantTotalInrMap = {};
    clearedTxns.forEach((tx) => {
      const mId = tx.merchantId;
      if (!merchantAedMap[mId]) merchantAedMap[mId] = { totalAED: 0, lastRate: 0 };
      if (!merchantTotalInrMap[mId]) merchantTotalInrMap[mId] = 0;
      const amt = parseFloat(tx.amount || 0);
      const rate = parseFloat(tx.aedRate || 0);
      merchantTotalInrMap[mId] += amt;
      if (rate > 0) {
        merchantAedMap[mId].totalAED += amt / rate;
        merchantAedMap[mId].lastRate = rate;
      }
    });

    // Merchant settled in AED directly
    const merchantSettledAedMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledAedMap[s.merchantId]) merchantSettledAedMap[s.merchantId] = 0;
      if (s.currency === "AED") {
        merchantSettledAedMap[s.merchantId] += parseFloat(s.amount || 0);
      }
    });

    // Agent settled in INR using agent's own rate
    const agentSettledMap = {};
    agentSettlements.forEach((s) => {
      const aedRate = parseFloat(agentRateMap[s.agentId]?.aedTodayRate || 1);
      const usdtRate = parseFloat(agentRateMap[s.agentId]?.usdtTodayRate || 1);
      const inr = s.currency === "USDT" ? parseFloat(s.amount) * usdtRate : parseFloat(s.amount) * aedRate;
      if (!agentSettledMap[s.agentId]) agentSettledMap[s.agentId] = 0;
      agentSettledMap[s.agentId] += inr;
    });

    const agentIds = agentTotals.map((a) => a.agentId).filter(Boolean);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentNameMap = {};
    agents.forEach((a) => (agentNameMap[a.id] = a.name));

    // Merchant lena — AED based
    const merchantLena = Object.keys(merchantAedMap).map((mId) => {
      const id = parseInt(mId);
      const totalAED = parseFloat(merchantAedMap[id].totalAED.toFixed(2));
      const settledAED = parseFloat((merchantSettledAedMap[id] || 0).toFixed(2));
      const pendingAED = parseFloat((totalAED - settledAED).toFixed(2));
      const effectiveRate = merchantAedMap[id].totalAED > 0
        ? merchantTotalInrMap[id] / merchantAedMap[id].totalAED
        : merchantAedMap[id].lastRate;
      const pendingINR = parseFloat((pendingAED * effectiveRate).toFixed(2));
      return {
        name: merchantNameMap[id] || "Unknown",
        total: merchantTotalInrMap[id] || 0,
        confirmed: settledAED * effectiveRate,
        pending: pendingINR,
        aedRate: parseFloat(effectiveRate.toFixed(4)),
      };
    });

    // Agent dena — use agent's own rate
    const agentDena = agentTotals.filter((a) => a.agentId).map((a) => {
      const aedRate = parseFloat(agentRateMap[a.agentId]?.aedTodayRate || 0);
      const total = parseFloat(a._sum.amount || 0);
      const commission = parseFloat(a._sum.agentCommission || 0);
      const net = total - commission;
      const settled = agentSettledMap[a.agentId] || 0;
      const pending = net - settled;
      return {
        name: agentNameMap[a.agentId] || "Unknown",
        total: net,
        confirmed: settled,
        pending,
        aedRate,
      };
    });

    const totalMerchantLena = merchantLena.reduce((s, e) => s + e.pending, 0);
    const totalAgentDena = agentDena.reduce((s, e) => s + e.pending, 0);
    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);

    res.json({
      success: true,
      data: {
        merchantLena,
        agentDena,
        totalMerchantLena,
        totalAgentDena,
        totalAdminCommission,
      },
    });
  } catch (error) {
    console.error("Collector trial balance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});
module.exports = router;
