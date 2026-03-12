const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
router.use(auth, roleCheck("AGENT"));
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "uploads/settlements",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Update the route to use upload middleware

router.get("/dashboard", async (req, res) => {
  try {
    const agentId = req.user.agentId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const txWhere = {
      agentId,
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    };

    const [
  commAgg, payOutAgg, payOutCount, pendingCount, pendingAmt, clearedAmt, adminCommAgg,
] = await Promise.all([
  prisma.transaction.aggregate({ where: { ...txWhere, status: "CLEARED" }, _sum: { agentCommission: true } }),
  prisma.transaction.aggregate({ where: { ...txWhere, status: "CLEARED" }, _sum: { amount: true } }),
  prisma.transaction.count({ where: { ...txWhere, status: "CLEARED" } }),
  prisma.transaction.count({ where: { ...txWhere, status: { in: ["PENDING", "PICKED", "PAID"] } } }),
  prisma.transaction.aggregate({ where: { ...txWhere, status: { in: ["PENDING", "PICKED", "PAID"] } }, _sum: { amount: true } }),
  prisma.transaction.aggregate({ where: { agentId, status: "CLEARED" }, _sum: { amount: true } }),
  prisma.transaction.aggregate({ where: { ...txWhere, status: "CLEARED" }, _sum: { adminCommission: true } }),
]);

    // Available limit = SUM of assigned merchants' (maxPaymentLimit - usedLimit)
    const assigned = await prisma.merchantAgent.findMany({
      where: { agentId },
      include: {
        merchant: {
          select: { maxPaymentLimit: true, usedLimit: true, isActive: true },
        },
      },
    });
    // Available Details = sum of all PENDING transactions for assigned merchants
    const assignedMerchantIds = assigned
      .map((ma) => ma.merchant)
      .filter((m) => m.isActive)
      .map((_, i) => assigned[i].merchantId);
    const pendingAvailable = await prisma.transaction.aggregate({
      where: { status: "PENDING", merchantId: { in: assignedMerchantIds } },
      _sum: { amount: true },
    });
    const availableLimit = parseFloat(pendingAvailable._sum.amount || 0);
    // Calculate Pay Out in AED and USDT
    const rateConfig = await prisma.rateConfig.findFirst({
      where: {
        OR: [
          { agentId: req.user.agentId },
          { merchantId: { in: assigned.map((a) => a.merchantId) } },
        ],
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    const payOutAmount = parseFloat(payOutAgg._sum.amount || 0);
    const aedRate = parseFloat(rateConfig?.aedTodayRate || 0);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 0);

    // Confirmed settlements paid to agent
    const [confirmedAed, confirmedUsdt] = await Promise.all([
      prisma.settlement.aggregate({
        where: { agentId, status: "CONFIRMED", currency: "AED" },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: { agentId, status: "CONFIRMED", currency: "USDT" },
        _sum: { amount: true },
      }),
    ]);

    const confirmedAedAmount = parseFloat(confirmedAed._sum.amount || 0);
    const confirmedUsdtAmount = parseFloat(confirmedUsdt._sum.amount || 0);

    // Convert confirmed AED/USDT to INR to subtract from totalPaymentLunga
    const agentCommission = parseFloat(commAgg._sum.agentCommission || 0);

    // Agent net commission = operator commission - agent commission
    const operatorCommAgg = await prisma.transaction.aggregate({
      where: { ...txWhere, status: "CLEARED" },
      _sum: { operatorCommission: true },
    });
    const operatorCommission = parseFloat(
      operatorCommAgg._sum.operatorCommission || 0,
    );
    const netAgentCommission = operatorCommission - agentCommission;

    const totalPaymentLunga = payOutAmount - agentCommission;

    const confirmedInInr =
      (aedRate > 0 ? confirmedAedAmount * aedRate : 0) +
      (usdtRate > 0 ? confirmedUsdtAmount * usdtRate : 0);

    const adjustedPaymentLunga = Math.max(
      0,
      totalPaymentLunga - confirmedInInr,
    );

    const payOutInAed = aedRate > 0 ? adjustedPaymentLunga / aedRate : 0;
    const payOutInUsdt = usdtRate > 0 ? adjustedPaymentLunga / usdtRate : 0;

    res.json({
      success: true,
      data: {
        totalAgentCommission: netAgentCommission,
        totalPayOutAmount: payOutAmount,
        totalPayOutTransactions: payOutCount,
        totalPendingTransactions: pendingCount,
        totalPendingAmount: pendingAmt._sum.amount || 0,
        availableLimit,
        totalPaymentLunga: adjustedPaymentLunga,
        payOutInAed,
        payOutInUsdt,
        confirmedSettlementAed: confirmedAedAmount,
        confirmedSettlementUsdt: confirmedUsdtAmount,
        totalAdminCommission: parseFloat(adminCommAgg._sum.adminCommission || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ Operators ═══
router.get("/operators", async (req, res) => {
  try {
    const where = { agentId: req.user.agentId };
    if (req.query.search)
      where.name = { contains: req.query.search, mode: "insensitive" };
    res.json({
      success: true,
      data: await prisma.operator.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/operators", async (req, res) => {
  try {
    const {
      name,
      maxTransactionAmount,
      minTransactionAmount,
      commissionChargePercent,
      description,
    } = req.body;
    if (
      !name ||
      !maxTransactionAmount ||
      !minTransactionAmount ||
      !commissionChargePercent
    )
      return res.status(400).json({ success: false, message: "Required." });
    const agent = await prisma.agent.findUnique({
      where: { id: req.user.agentId },
    });
    if (
      parseFloat(commissionChargePercent) <=
      parseFloat(agent.commissionChargePercent)
    ) {
      return res.status(400).json({
        success: false,
        message: `Operator commission must be greater than agent commission (${agent.commissionChargePercent}%).`,
      });
    }
    const op = await prisma.operator.create({
      data: {
        name,
        maxTransactionAmount: parseFloat(maxTransactionAmount),
        minTransactionAmount: parseFloat(minTransactionAmount),
        commissionChargePercent: parseFloat(commissionChargePercent),
        description,
        agentId: req.user.agentId,
      },
    });
    res.status(201).json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.put("/operators/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.operator.findFirst({
      where: { id, agentId: req.user.agentId },
    });
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found." });
    const {
      name,
      maxTransactionAmount,
      minTransactionAmount,
      commissionChargePercent,
      description,
      isActive,
    } = req.body;
    const data = {};
    if (name) data.name = name;
    if (maxTransactionAmount !== undefined)
      data.maxTransactionAmount = parseFloat(maxTransactionAmount);
    if (minTransactionAmount !== undefined)
      data.minTransactionAmount = parseFloat(minTransactionAmount);
    if (commissionChargePercent !== undefined) {
      const agent = await prisma.agent.findUnique({
        where: { id: req.user.agentId },
      });
      if (
        parseFloat(commissionChargePercent) <=
        parseFloat(agent.commissionChargePercent)
      ) {
        return res.status(400).json({
          success: false,
          message: `Operator commission must be greater than agent commission (${agent.commissionChargePercent}%).`,
        });
      }
      data.commissionChargePercent = parseFloat(commissionChargePercent);
    }
    if (description !== undefined) data.description = description;
    if (typeof isActive === "boolean") data.isActive = isActive;
    await prisma.operator.update({ where: { id }, data });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.delete("/operators/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ex = await prisma.operator.findFirst({
      where: { id, agentId: req.user.agentId },
    });
    if (!ex)
      return res.status(404).json({ success: false, message: "Not found." });
    await prisma.operator.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ Operator Users ═══
router.get("/operator-users", async (req, res) => {
  try {
    const where = { role: "OPERATOR", operator: { agentId: req.user.agentId } };
    if (req.query.operatorId) where.operatorId = parseInt(req.query.operatorId);
    res.json({
      success: true,
      data: await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          plainPassword: true,
          isActive: true,
          createdAt: true,
          operator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/operator-users", async (req, res) => {
  try {
    const { username, password, operatorId } = req.body;
    if (!username || !password || !operatorId)
      return res.status(400).json({ success: false, message: "Required." });
    const exists = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Username exists." });
    const op = await prisma.operator.findFirst({
      where: { id: parseInt(operatorId), agentId: req.user.agentId },
    });
    if (!op)
      return res
        .status(400)
        .json({ success: false, message: "Invalid operator." });
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: username,
        username: username.toLowerCase().trim(),
        password: hashed,
        role: "OPERATOR",
        operatorId: parseInt(operatorId),
        createdBy: req.user.id,
      },
    });
    res.status(201).json({
      success: true,
      credentials: { username: username.toLowerCase().trim(), password },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.put("/operator-users/:id", async (req, res) => {
  try {
    const { username, password, operatorId, isActive } = req.body;
    const data = {};
    if (username) {
      data.username = username.toLowerCase().trim();
      data.name = username;
    }
    if (password) data.password = await bcrypt.hash(password, 10);
    if (operatorId) data.operatorId = parseInt(operatorId);
    if (typeof isActive === "boolean") data.isActive = isActive;
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.delete("/operator-users/:id", async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ Transactions ═══
router.get("/transactions", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      operatorId,
      startDate,
      endDate,
      search,
      remark,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { agentId: req.user.agentId };
    if (status) where.status = status;
    if (operatorId) where.operatorId = parseInt(operatorId);
    if (remark) where.notes = { contains: remark, mode: "insensitive" };
    if (startDate || endDate) {
      const dateField =
        status === "CLEARED" ? "transactionClearTime" : "createdAt";
      where[dateField] = {};
      if (startDate) where[dateField].gte = new Date(startDate);
      if (endDate) where[dateField].lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (search) {
      where.OR = [
        { utrNumber: { contains: search, mode: "insensitive" } },
        { upiId: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          merchant: { select: { name: true, maxPaymentLimit: true } },
          operator: {
            select: {
              name: true,
              maxTransactionAmount: true,
              minTransactionAmount: true,
              transactionPicked: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ Ledger ═══
router.get("/ledger", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { agentId: req.user.agentId, status: "CLEARED" };
    if (startDate || endDate) {
      where.transactionClearTime = {};
      if (startDate) where.transactionClearTime.gte = new Date(startDate);
      if (endDate)
        where.transactionClearTime.lte = new Date(endDate + "T23:59:59.999Z");
    }
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        agentCommission: true,
        notes: true,
        transactionClearTime: true,
        merchant: { select: { name: true } },
        operator: { select: { name: true } },
      },
      orderBy: { transactionClearTime: "desc" },
    });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});
// ═══ Settlements ═══
router.get("/settlements", async (req, res) => {
  try {
    const data = await prisma.settlement.findMany({
      where: { agentId: req.user.agentId },
      include: {
        merchant: { select: { name: true } },
        collector: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/settlements", upload.single("image"), async (req, res) => {
  try {
    const { remark, merchantId } = req.body;

    const settlement = await prisma.settlement.create({
      data: {
        amount: 0,
        agent: { connect: { id: req.user.agentId } },
        ...(merchantId
          ? { merchant: { connect: { id: parseInt(merchantId) } } }
          : {}),
        remark: remark || null,
        proofImage: req.file ? req.file.filename : null,
      },
    });

    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    console.error(error);
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
    if (settlement.agentId !== req.user.agentId)
      return res
        .status(403)
        .json({ success: false, message: "Not your settlement." });
    if (settlement.status !== "PENDING")
      return res
        .status(400)
        .json({ success: false, message: "Already picked." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "PICKED" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post(
  "/settlements/:id/submit",
  upload.single("qrImage"),
  async (req, res) => {
    try {
      const settlement = await prisma.settlement.findUnique({
        where: { id: parseInt(req.params.id) },
      });
      if (!settlement)
        return res.status(404).json({ success: false, message: "Not found." });
      if (settlement.agentId !== req.user.agentId)
        return res
          .status(403)
          .json({ success: false, message: "Not your settlement." });
      if (settlement.status !== "PICKED")
        return res
          .status(400)
          .json({ success: false, message: "Must be picked first." });
      const { walletAddress } = req.body;
      const updated = await prisma.settlement.update({
        where: { id: parseInt(req.params.id) },
        data: {
          status: "SUBMITTED",
          walletAddress: walletAddress || null,
          proofImage: req.file ? req.file.filename : settlement.proofImage,
        },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

router.post("/settlements/:id/reject", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.agentId !== req.user.agentId)
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
router.post("/settlements/:id/confirm", async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!settlement)
      return res.status(404).json({ success: false, message: "Not found." });
    if (settlement.agentId !== req.user.agentId)
      return res
        .status(403)
        .json({ success: false, message: "Not your settlement." });
    if (settlement.status !== "PAID")
      return res
        .status(400)
        .json({ success: false, message: "Must be paid first." });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "CONFIRMED" },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});
module.exports = router;
