const router = require("express").Router();
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
router.use(auth, roleCheck("COLLECTOR"));

router.get('/dashboard', async (req, res) => {
  try {
    const collectorId = req.user.collectorId;

    // Get collector's adminId to find their merchants
    const collector = await prisma.collector.findUnique({
      where: { id: collectorId },
      select: { adminId: true }
    });

    const merchants = await prisma.merchant.findMany({
      where: { adminId: collector.adminId },
      select: { id: true }
    });
    const merchantIds = merchants.map(m => m.id);

    const [
  clearedAgg, agentCommAgg, adminCommAgg,
  merchantSettledList, agentSettledList,
  merchantPending, merchantConfirmed,
  agentPending, agentConfirmed,
] = await Promise.all([
      // Total cleared transactions for these merchants
      prisma.transaction.aggregate({ where: { merchantId: { in: merchantIds }, status: 'CLEARED' }, _sum: { amount: true } }),
      // Agent commission on those transactions
      prisma.transaction.aggregate({ where: { merchantId: { in: merchantIds }, status: 'CLEARED' }, _sum: { agentCommission: true } }),
      // Admin commission on those transactions
      prisma.transaction.aggregate({ where: { merchantId: { in: merchantIds }, status: 'CLEARED' }, _sum: { adminCommission: true } }),
      // Merchant settlements confirmed
      prisma.settlement.findMany({ where: { collectorId, merchantId: { not: null }, status: 'CONFIRMED' }, select: { amount: true, currency: true } }),
      // Agent settlements confirmed
      prisma.settlement.findMany({ where: { collectorId, agentId: { not: null }, status: 'CONFIRMED' }, select: { amount: true, currency: true } }),
      // Merchant settlements pending
      prisma.settlement.findMany({ where: { collectorId, merchantId: { not: null }, status: { in: ['PENDING', 'PICKED', 'SUBMITTED'] } }, select: { amount: true, currency: true } }),
      // Merchant settlements confirmed (for cards)
      prisma.settlement.findMany({ where: { collectorId, merchantId: { not: null }, status: { in: ['CONFIRMED', 'PAID'] } }, select: { amount: true, currency: true } }),
      // Agent settlements pending
      prisma.settlement.findMany({ where: { collectorId, agentId: { not: null }, status: { in: ['PENDING', 'PICKED', 'SUBMITTED'] } }, select: { amount: true, currency: true } }),
      // Agent settlements confirmed (for cards)
      prisma.settlement.findMany({ where: { collectorId, agentId: { not: null }, status: { in: ['CONFIRMED', 'PAID'] } }, select: { amount: true, currency: true } }),
    ]);

    const rateConfig = await prisma.rateConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);

    const calcInr = (list) => list.reduce((sum, s) => {
      const amt = parseFloat(s.amount || 0);
      return sum + (s.currency === 'USDT' ? amt * usdtRate : amt * aedRate);
    }, 0);

    const sumByCurrency = (list) => ({
      aed: list.filter(s => s.currency !== 'USDT').reduce((s, r) => s + parseFloat(r.amount), 0),
      usdt: list.filter(s => s.currency === 'USDT').reduce((s, r) => s + parseFloat(r.amount), 0),
    });

    const totalCleared = parseFloat(clearedAgg._sum.amount || 0);
    const totalAgentCommission = parseFloat(agentCommAgg._sum.agentCommission || 0);

    const merchantSettledInr = calcInr(merchantSettledList);
    const agentSettledInr = calcInr(agentSettledList);

    // Pending lena = total cleared - confirmed settlements
    const totalMerchantLena = totalCleared - merchantSettledInr;
    // Pending dena = total cleared - agent commission - confirmed settlements
    const totalAgentDena = (totalCleared - totalAgentCommission) - agentSettledInr;

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
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
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
router.post("/settlements/:id/pay", async (req, res) => {
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
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "PAID" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

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

    const txWhere = { merchantId: { in: merchantIds }, status: "CLEARED" };
    if (startDate || endDate) {
      txWhere.transactionClearTime = {};
      if (startDate) txWhere.transactionClearTime.gte = new Date(startDate);
      if (endDate) txWhere.transactionClearTime.lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (agentId) txWhere.agentId = agentId;

    const [merchantTotals, agentTotals, merchantSettlements, agentSettlements, rateConfig, agents, adminCommAgg] = await Promise.all([
      prisma.transaction.groupBy({ by: ["merchantId"], where: txWhere, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ["agentId"], where: txWhere, _sum: { amount: true, agentCommission: true } }),
      prisma.settlement.findMany({ where: { merchant: { adminId }, status: "CONFIRMED" }, select: { merchantId: true, amount: true, currency: true } }),
      prisma.settlement.findMany({ where: { agent: { adminId }, status: "CONFIRMED" }, select: { agentId: true, amount: true, currency: true } }),
      prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.agent.findMany({ where: { adminId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.transaction.aggregate({ where: txWhere, _sum: { adminCommission: true } }),
    ]);

    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);
    const toInr = (amt, currency) => currency === "USDT" ? amt * usdtRate : amt * aedRate;

    const merchantSettledMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledMap[s.merchantId]) merchantSettledMap[s.merchantId] = 0;
      merchantSettledMap[s.merchantId] += toInr(parseFloat(s.amount), s.currency);
    });

    const agentSettledMap = {};
    agentSettlements.forEach((s) => {
      if (!agentSettledMap[s.agentId]) agentSettledMap[s.agentId] = 0;
      agentSettledMap[s.agentId] += toInr(parseFloat(s.amount), s.currency);
    });

    const agentNameMap = {};
    agents.forEach((a) => (agentNameMap[a.id] = a.name));

    const merchantLedger = merchantTotals.map((m) => {
      const total = parseFloat(m._sum.amount || 0);
      const settled = merchantSettledMap[m.merchantId] || 0;
      const pending = total - settled;
      return { id: m.merchantId, name: merchantNameMap[m.merchantId] || "Unknown", total, settled, pending, pendingAed: pending / aedRate, aedRate };
    });

    const agentLedger = agentTotals.filter((a) => a.agentId).map((a) => {
      const total = parseFloat(a._sum.amount || 0);
      const commission = parseFloat(a._sum.agentCommission || 0);
      const net = total - commission;
      const settled = agentSettledMap[a.agentId] || 0;
      const pending = net - settled;
      return { id: a.agentId, name: agentNameMap[a.agentId] || "Unknown", total: net, settled, pending, pendingAed: pending / aedRate, aedRate };
    });

    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);
    const mGrandPending = merchantLedger.reduce((s, e) => s + e.pending, 0);
    const aGrandPending = agentLedger.reduce((s, e) => s + e.pending, 0);

    res.json({
      success: true,
      merchantLedger,
      agentLedger,
      agents,
      summary: {
        merchantPending: mGrandPending,
        merchantPendingAed: mGrandPending / aedRate,
        merchantSettledAed: merchantLedger.reduce((s, e) => s + e.settled, 0) / aedRate,
        agentPending: aGrandPending,
        agentPendingAed: aGrandPending / aedRate,
        agentSettledAed: agentLedger.reduce((s, e) => s + e.settled, 0) / aedRate,
        totalAdminCommission,
        totalAdminCommissionAed: totalAdminCommission / aedRate,
        agentPendingWithComm: aGrandPending + totalAdminCommission,
        agentPendingWithCommAed: (aGrandPending + totalAdminCommission) / aedRate,
        aedRate,
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

    const [merchantTotals, agentTotals, merchantSettlements, agentSettlements, rateConfig, adminCommAgg] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["merchantId"],
        where: txWhere,
        _sum: { amount: true },
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
      prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.transaction.aggregate({
        where: txWhere,
        _sum: { adminCommission: true },
      }),
    ]);

    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);
    const toInr = (amt, currency) => currency === "USDT" ? amt * usdtRate : amt * aedRate;

    const merchantSettledMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledMap[s.merchantId]) merchantSettledMap[s.merchantId] = 0;
      merchantSettledMap[s.merchantId] += toInr(parseFloat(s.amount), s.currency);
    });

    const agentSettledMap = {};
    agentSettlements.forEach((s) => {
      if (!agentSettledMap[s.agentId]) agentSettledMap[s.agentId] = 0;
      agentSettledMap[s.agentId] += toInr(parseFloat(s.amount), s.currency);
    });

    const agentIds = agentTotals.map((a) => a.agentId).filter(Boolean);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });
    const agentNameMap = {};
    agents.forEach((a) => (agentNameMap[a.id] = a.name));

    const merchantLena = merchantTotals.map((m) => {
      const total = parseFloat(m._sum.amount || 0);
      const settled = merchantSettledMap[m.merchantId] || 0;
      const pending = total - settled;
      return { name: merchantNameMap[m.merchantId] || "Unknown", total, confirmed: settled, pending };
    });

    const agentDena = agentTotals
      .filter((a) => a.agentId)
      .map((a) => {
        const total = parseFloat(a._sum.amount || 0);
        const commission = parseFloat(a._sum.agentCommission || 0);
        const net = total - commission;
        const settled = agentSettledMap[a.agentId] || 0;
        const pending = net - settled;
        return { name: agentNameMap[a.agentId] || "Unknown", total: net, confirmed: settled, pending };
      });

    const totalMerchantLena = merchantLena.reduce((s, e) => s + e.pending, 0);
    const totalAgentDena = agentDena.reduce((s, e) => s + e.pending, 0);
    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);

    res.json({
      success: true,
      data: { merchantLena, agentDena, totalMerchantLena, totalAgentDena, totalAdminCommission },
    });
  } catch (error) {
    console.error("Collector trial balance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});
module.exports = router;
