const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
router.use(auth, roleCheck("MERCHANT"));

router.get("/dashboard", async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const txWhere = {
      merchantId,
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    };
    const [
      merchant,
      commAgg,
      payOutAgg,
      payOutCount,
      pendingCount,
      pendingAmt,
      settledAgg,
    ] = await Promise.all([
      prisma.merchant.findUnique({ where: { id: merchantId } }),
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "CLEARED" },
        _sum: { merchantCommission: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "CLEARED" },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where: { ...txWhere, status: "CLEARED" } }),
      prisma.transaction.count({ where: { ...txWhere, status: "PENDING" } }),
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: { merchantId, status: "CONFIRMED" },
        _sum: { amount: true },
      }),
    ]);
    const maxL = parseFloat(merchant?.maxPaymentLimit || 0),
      used = parseFloat(merchant?.usedLimit || 0);
    const totalPayOut = parseFloat(payOutAgg._sum.amount || 0);
    const totalCommission = parseFloat(commAgg._sum.merchantCommission || 0);
    const totalSettledAed = parseFloat(settledAgg._sum.amount || 0);

    // Get rate to convert settled AED back to INR
    const rateConfig = await prisma.rateConfig.findFirst({
      where: { merchantId },
      orderBy: { updatedAt: "desc" },
    });
    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const totalSettledInr = totalSettledAed * aedRate;
    const totalPaymentDena = totalPayOut - totalCommission - totalSettledInr;

    res.json({
      success: true,
      data: {
        totalCommissionAmount: totalCommission,
        totalPayOutAmount: totalPayOut,
        totalPayOutTransactions: payOutCount,
        pendingCount,
        pendingAmount: pendingAmt._sum.amount || 0,
        maxPaymentLimit: maxL,
        usedLimit: used,
        availableLimit: maxL - used,
        totalSettledAed,
        totalSettledInr,
        totalPaymentDena,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Sub-Merchants (with credentials) ───
router.get("/submerchants", async (req, res) => {
  try {
    const data = await prisma.subMerchant.findMany({
      where: { merchantId: req.user.merchantId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            plainPassword: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/submerchants", async (req, res) => {
  try {
    const { name, description, username, password } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ success: false, message: "Required." });
    const exists = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Username exists." });
    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const sm = await tx.subMerchant.create({
        data: { name, description, merchantId: req.user.merchantId },
      });
      await tx.user.create({
        data: {
          name,
          username: username.toLowerCase().trim(),
          password: hashed,
          plainPassword: password,
          role: "SUB_MERCHANT",
          subMerchantId: sm.id,
          createdBy: req.user.id,
        },
      });
    });
    res.status(201).json({
      success: true,
      credentials: { username: username.toLowerCase().trim(), password },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Transactions (READ ONLY) ───
router.get("/transactions", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
      remark,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { merchantId: req.user.merchantId };
    if (status) where.status = status;
    if (remark) where.notes = { contains: remark, mode: "insensitive" };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (search) {
      where.OR = [
        { utrNumber: { contains: search, mode: "insensitive" } },
        { upiId: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }
    const allRemarks = await prisma.transaction.findMany({
      where: { merchantId: req.user.merchantId, notes: { not: null } },
      select: { notes: true },
      distinct: ["notes"],
    });
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      success: true,
      data,
      total,
      remarks: allRemarks.map((r) => r.notes).filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/transactions/:id", async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: parseInt(req.params.id), merchantId: req.user.merchantId },
    });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Settlements ───
router.post("/settlements", async (req, res) => {
  try {
    const { amount, currency, remark } = req.body;
    const s = await prisma.settlement.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || "AED",
        merchantId: req.user.merchantId,
        remark,
      },
    });
    res.status(201).json({ success: true, data: s });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/settlements", async (req, res) => {
  try {
    const data = await prisma.settlement.findMany({
      where: { merchantId: req.user.merchantId },
      include: { collector: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements/:id/confirm", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.merchantId !== req.user.merchantId)
      return res
        .status(403)
        .json({ success: false, message: "Not your settlement." });
    if (settlement.status !== "SUBMITTED")
      return res
        .status(400)
        .json({ success: false, message: "Must be submitted first." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "CONFIRMED" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Rate Configuration for Sub-Merchants ───
router.get("/rate-config", async (req, res) => {
  try {
    const subMerchants = await prisma.subMerchant.findMany({
      where: { merchantId: req.user.merchantId },
      select: { id: true, name: true },
    });
    const rates = await prisma.rateConfig.findMany({
      where: { merchantId: req.user.merchantId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, subMerchants, rates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/rate-config", async (req, res) => {
  try {
    const { subMerchantId, usdtTodayRate, aedTodayRate } = req.body;
    if (!usdtTodayRate || !aedTodayRate)
      return res
        .status(400)
        .json({ success: false, message: "Both rates required." });

    const existing = await prisma.rateConfig.findFirst({
      where: {
        merchantId: req.user.merchantId,
        ...(subMerchantId ? { agentId: parseInt(subMerchantId) } : {}),
      },
    });

    if (existing) {
      await prisma.rateConfig.update({
        where: { id: existing.id },
        data: {
          usdtTodayRate: parseFloat(usdtTodayRate),
          aedTodayRate: parseFloat(aedTodayRate),
        },
      });
    } else {
      const merchant = await prisma.merchant.findUnique({
        where: { id: req.user.merchantId },
      });
      await prisma.rateConfig.create({
        data: {
          usdtTodayRate: parseFloat(usdtTodayRate),
          aedTodayRate: parseFloat(aedTodayRate),
          merchantId: req.user.merchantId,
          adminId: merchant.adminId,
        },
      });
    }
    res.json({ success: true, message: "Rate updated." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Ledger — uses stored aedRate/usdtRate per transaction ───
router.get("/ledger", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { merchantId: req.user.merchantId, status: "CLEARED" };
    if (startDate || endDate) {
      where.transactionClearTime = {};
      if (startDate) where.transactionClearTime.gte = new Date(startDate);
      if (endDate)
        where.transactionClearTime.lte = new Date(endDate + "T23:59:59.999Z");
    }
    const data = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        merchantCommission: true,
        notes: true,
        transactionClearTime: true,
        createdAt: true,
        aedRate: true,
        usdtRate: true,
        subMerchant: { select: { name: true } },
        operator: { select: { name: true } },
      },
      orderBy: { transactionClearTime: "desc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
