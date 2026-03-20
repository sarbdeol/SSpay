const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
router.use(auth, roleCheck("ADMIN"));

// ─── Dashboard ───
router.get("/dashboard", async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const txWhere = {
      merchant: { adminId },
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    };

    const [
      clearedAgg,
      pendingCount,
      pickedCount,
      totalLimit,
      usedLimit,
      adminComm,
      mC,
      aC,
      cC,
      agentCommAgg,
      pendingAvailable,
      merchantSettledList,
      agentSettledList,
      merchantRates,
      agentRates,
      clearedTxns,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "CLEARED" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.count({ where: { ...txWhere, status: "PENDING" } }),
      prisma.transaction.count({
        where: { ...txWhere, status: { in: ["PICKED", "PAID"] } },
      }),
      prisma.merchant.aggregate({
        where: { adminId },
        _sum: { maxPaymentLimit: true },
      }),
      prisma.merchant.aggregate({
        where: { adminId },
        _sum: { usedLimit: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "CLEARED" },
        _sum: { adminCommission: true },
      }),
      prisma.merchant.count({ where: { adminId } }),
      prisma.agent.count({ where: { adminId } }),
      prisma.collector.count({ where: { adminId } }),
      prisma.transaction.aggregate({
        where: { ...txWhere, status: "CLEARED" },
        _sum: { agentCommission: true },
      }),
      prisma.transaction.aggregate({
        where: { status: "PENDING", merchant: { adminId } },
        _sum: { amount: true },
      }),
      prisma.settlement.findMany({
        where: { merchant: { adminId }, status: "CONFIRMED" },
        select: { amount: true, currency: true, merchantId: true },
      }),
      prisma.settlement.findMany({
        where: { agent: { adminId }, status: "CONFIRMED" },
        select: { amount: true, currency: true, agentId: true },
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
      prisma.transaction.findMany({
        where: { ...txWhere, status: "CLEARED" },
        select: { amount: true, merchantId: true, agentId: true },
      }),
    ]);

    const tl = parseFloat(totalLimit._sum.maxPaymentLimit || 0);
    const tu = parseFloat(usedLimit._sum.usedLimit || 0);
    const availableLimit = parseFloat(pendingAvailable._sum.amount || 0);
    const totalCleared = parseFloat(clearedAgg._sum.amount || 0);
    const totalAgentCommission = parseFloat(
      agentCommAgg._sum.agentCommission || 0,
    );
    const totalAdminCommission = parseFloat(
      adminComm._sum.adminCommission || 0,
    );

    const merchantRateMap = {};
    merchantRates.forEach((r) => {
      if (!merchantRateMap[r.merchantId]) merchantRateMap[r.merchantId] = r;
    });
    const agentRateMap = {};
    agentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    const rateConfig = await prisma.rateConfig.findFirst({
      where: { adminId },
      orderBy: { updatedAt: "desc" },
    });
    const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
    const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);

    const merchantSettledInr = merchantSettledList.reduce((sum, s) => {
      const rate = parseFloat(
        merchantRateMap[s.merchantId]?.aedTodayRate || aedRate,
      );
      const uRate = parseFloat(
        merchantRateMap[s.merchantId]?.usdtTodayRate || usdtRate,
      );
      const amt = parseFloat(s.amount || 0);
      return sum + (s.currency === "USDT" ? amt * uRate : amt * rate);
    }, 0);

    const agentSettledInr = agentSettledList.reduce((sum, s) => {
      const rate = parseFloat(agentRateMap[s.agentId]?.aedTodayRate || aedRate);
      const uRate = parseFloat(
        agentRateMap[s.agentId]?.usdtTodayRate || usdtRate,
      );
      const amt = parseFloat(s.amount || 0);
      return sum + (s.currency === "USDT" ? amt * uRate : amt * rate);
    }, 0);

    const merchantSettledAed = merchantSettledList
      .filter((s) => s.currency === "AED")
      .reduce((s, r) => s + parseFloat(r.amount), 0);
    const merchantSettledUsdt = merchantSettledList
      .filter((s) => s.currency === "USDT")
      .reduce((s, r) => s + parseFloat(r.amount), 0);
    const agentSettledAed = agentSettledList
      .filter((s) => s.currency === "AED")
      .reduce((s, r) => s + parseFloat(r.amount), 0);
    const agentSettledUsdt = agentSettledList
      .filter((s) => s.currency === "USDT")
      .reduce((s, r) => s + parseFloat(r.amount), 0);

    const totalLena = totalCleared - merchantSettledInr;
    const totalDena = totalCleared - totalAgentCommission - agentSettledInr;

    let totalAedDiff = 0;
    let totalAedDiffInr = 0;
    let totalUsdtDiff = 0;
    let totalUsdtDiffInr = 0;

    clearedTxns.forEach((tx) => {
      const amt = parseFloat(tx.amount || 0);
      const mRate = merchantRateMap[tx.merchantId];
      const aRate = tx.agentId ? agentRateMap[tx.agentId] : null;

      const mAed = parseFloat(mRate?.aedTodayRate || aedRate);
      const aAed = parseFloat(aRate?.aedTodayRate || aedRate);
      const mUsdt = parseFloat(mRate?.usdtTodayRate || usdtRate);
      const aUsdt = parseFloat(aRate?.usdtTodayRate || usdtRate);

      if (mAed > 0 && aAed > 0) {
        const lenaAed = amt / mAed;
        const denaAed = amt / aAed;
        const diffAed = lenaAed - denaAed;
        totalAedDiff += diffAed;
        totalAedDiffInr += diffAed * mAed;
      }

      if (mUsdt > 0 && aUsdt > 0) {
        const lenaUsdt = amt / mUsdt;
        const denaUsdt = amt / aUsdt;
        const diffUsdt = lenaUsdt - denaUsdt;
        totalUsdtDiff += diffUsdt;
        totalUsdtDiffInr += diffUsdt * mUsdt;
      }
    });

    const totalCommissionCard =
      totalAdminCommission + totalAedDiffInr + totalUsdtDiffInr;

    res.json({
      success: true,
      data: {
        totalRtgsAmount: clearedAgg._sum.amount || 0,
        totalRtgsCount: clearedAgg._count || 0,
        totalPending: pendingCount,
        totalPicked: pickedCount,
        totalCleared: clearedAgg._count || 0,
        totalAdminCommission,
        totalMerchantLimit: tl,
        totalUsedLimit: tu,
        availableLimit,
        totalLena,
        totalDena,
        merchantSettledAed,
        merchantSettledUsdt,
        agentSettledAed,
        agentSettledUsdt,
        merchantCount: mC,
        agentCount: aC,
        collectorCount: cC,
        totalAedDiff,
        totalAedDiffInr,
        totalUsdtDiff,
        totalUsdtDiffInr,
        totalCommissionCard,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ MERCHANTS ═══
router.get("/merchants", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { adminId: req.user.adminId };
    if (search) where.name = { contains: search, mode: "insensitive" };
    const [data, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              plainPassword: true,
              isActive: true,
            },
          },
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.merchant.count({ where }),
    ]);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/merchants", async (req, res) => {
  try {
    const {
      name,
      description,
      maxPaymentLimit,
      commissionChargePercent,
      assignAgentIds,
      assignAll,
      username,
      password,
    } = req.body;
    if (
      !name ||
      !maxPaymentLimit ||
      !commissionChargePercent ||
      !username ||
      !password
    )
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing." });
    const exists = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Username exists." });
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.create({
        data: {
          name,
          description,
          maxPaymentLimit: parseFloat(maxPaymentLimit),
          commissionChargePercent: parseFloat(commissionChargePercent),
          adminId: req.user.adminId,
        },
      });
      const u = await tx.user.create({
        data: {
          name,
          username: username.toLowerCase().trim(),
          password: hashed,
          plainPassword: password,
          role: "MERCHANT",
          merchantId: m.id,
          createdBy: req.user.id,
        },
      });
      if (assignAll) {
        const all = await tx.agent.findMany({
          where: { adminId: req.user.adminId },
          select: { id: true },
        });
        if (all.length)
          await tx.merchantAgent.createMany({
            data: all.map((a) => ({ merchantId: m.id, agentId: a.id })),
          });
      } else if (assignAgentIds?.length)
        await tx.merchantAgent.createMany({
          data: assignAgentIds.map((id) => ({
            merchantId: m.id,
            agentId: parseInt(id),
          })),
        });
      return { m, u };
    });
    res.status(201).json({
      success: true,
      data: result.m,
      credentials: { username: username.toLowerCase().trim(), password },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.put("/merchants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name,
      description,
      maxPaymentLimit,
      commissionChargePercent,
      isActive,
      assignAgentIds,
      assignAll,
    } = req.body;
    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (maxPaymentLimit) data.maxPaymentLimit = parseFloat(maxPaymentLimit);
    if (commissionChargePercent)
      data.commissionChargePercent = parseFloat(commissionChargePercent);
    if (typeof isActive === "boolean") data.isActive = isActive;
    await prisma.$transaction(async (tx) => {
      await tx.merchant.update({ where: { id }, data });
      if (name) {
        const u = await tx.user.findFirst({ where: { merchantId: id } });
        if (u)
          await tx.user.update({
            where: { id: u.id },
            data: { name, isActive: isActive ?? u.isActive },
          });
      }
      if (assignAll !== undefined || assignAgentIds) {
        await tx.merchantAgent.deleteMany({ where: { merchantId: id } });
        if (assignAll) {
          const all = await tx.agent.findMany({
            where: { adminId: req.user.adminId },
            select: { id: true },
          });
          if (all.length)
            await tx.merchantAgent.createMany({
              data: all.map((a) => ({ merchantId: id, agentId: a.id })),
            });
        } else if (assignAgentIds?.length)
          await tx.merchantAgent.createMany({
            data: assignAgentIds.map((aid) => ({
              merchantId: id,
              agentId: parseInt(aid),
            })),
          });
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.delete("/merchants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.merchant.update({ where: { id }, data: { isActive: false } });
      const u = await tx.user.findFirst({ where: { merchantId: id } });
      if (u)
        await tx.user.update({
          where: { id: u.id },
          data: { isActive: false },
        });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ AGENTS ═══
router.get("/agents", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { adminId: req.user.adminId };
    if (search) where.name = { contains: search, mode: "insensitive" };
    const [data, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              plainPassword: true,
              isActive: true,
            },
          },
          _count: { select: { operators: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.agent.count({ where }),
    ]);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/agents", async (req, res) => {
  try {
    const { name, description, commissionChargePercent, username, password } =
      req.body;
    if (!name || !commissionChargePercent || !username || !password)
      return res.status(400).json({ success: false, message: "Required." });
    const exists = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Username exists." });
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const a = await tx.agent.create({
        data: {
          name,
          description,
          commissionChargePercent: parseFloat(commissionChargePercent),
          adminId: req.user.adminId,
        },
      });
      await tx.user.create({
        data: {
          name,
          username: username.toLowerCase().trim(),
          password: hashed,
          plainPassword: password,
          role: "AGENT",
          agentId: a.id,
          createdBy: req.user.id,
        },
      });
      return a;
    });
    res.status(201).json({
      success: true,
      data: result,
      credentials: { username: username.toLowerCase().trim(), password },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.put("/agents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, commissionChargePercent, isActive } = req.body;
    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (commissionChargePercent !== undefined)
      data.commissionChargePercent = parseFloat(commissionChargePercent);
    if (typeof isActive === "boolean") data.isActive = isActive;
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id }, data });
      const u = await tx.user.findFirst({ where: { agentId: id } });
      if (u) {
        const ud = {};
        if (name) ud.name = name;
        if (typeof isActive === "boolean") ud.isActive = isActive;
        if (Object.keys(ud).length)
          await tx.user.update({ where: { id: u.id }, data: ud });
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Agent update:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.delete("/agents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id }, data: { isActive: false } });
      const u = await tx.user.findFirst({ where: { agentId: id } });
      if (u)
        await tx.user.update({
          where: { id: u.id },
          data: { isActive: false },
        });
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Agent delete:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ COLLECTORS ═══
router.get("/collectors", async (req, res) => {
  try {
    const data = await prisma.collector.findMany({
      where: { adminId: req.user.adminId },
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

router.post("/collectors", async (req, res) => {
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
      const c = await tx.collector.create({
        data: { name, description, adminId: req.user.adminId },
      });
      await tx.user.create({
        data: {
          name,
          username: username.toLowerCase().trim(),
          password: hashed,
          plainPassword: password,
          role: "COLLECTOR",
          collectorId: c.id,
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

// ═══ EXPENSE MANAGERS ═══
router.post("/expense-managers", async (req, res) => {
  try {
    const { name, username, password } = req.body;
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
    await prisma.user.create({
      data: {
        name,
        username: username.toLowerCase().trim(),
        password: hashed,
        plainPassword: password,
        role: "EXPENSE_MANAGER",
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

router.get("/expense-managers", async (req, res) => {
  try {
    const data = await prisma.user.findMany({
      where: { role: "EXPENSE_MANAGER", createdBy: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        plainPassword: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ TRANSACTIONS ═══
router.get("/transactions", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      merchantId,
      agentId,
      operatorId,
      startDate,
      endDate,
      search,
      remark,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { merchant: { adminId: req.user.adminId } };
    if (status) where.status = status;
    if (merchantId) where.merchantId = parseInt(merchantId);
    if (agentId) where.agentId = parseInt(agentId);
    if (operatorId) where.operatorId = parseInt(operatorId);
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
      where: { merchant: { adminId: req.user.adminId }, notes: { not: null } },
      select: { notes: true },
      distinct: ["notes"],
    });
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
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

router.delete("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tx = await prisma.transaction.findFirst({
      where: { id, merchant: { adminId: req.user.adminId } },
    });
    if (!tx)
      return res.status(404).json({ success: false, message: "Not found." });
    if (tx.status !== "PENDING")
      return res
        .status(400)
        .json({
          success: false,
          message: "Only PENDING transactions can be deleted.",
        });
    await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, message: "Deleted." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ COLLECTIONS ═══
router.post("/collections", async (req, res) => {
  try {
    const { amount, merchantId, description } = req.body;
    const c = await prisma.collection.create({
      data: {
        amount: parseFloat(amount),
        merchantId: parseInt(merchantId),
        description,
      },
    });
    res.status(201).json({ success: true, data: c });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/collections", async (req, res) => {
  try {
    const data = await prisma.collection.findMany({
      include: { merchant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ BLOCKED IFSC ═══
router.get("/blocked-ifsc", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await prisma.blockedIfsc.findMany({
        where: { adminId: req.user.adminId },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/blocked-ifsc", async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      data: await prisma.blockedIfsc.create({
        data: {
          ifscCode: req.body.ifscCode.toUpperCase(),
          reason: req.body.reason,
          adminId: req.user.adminId,
        },
      }),
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.code === "P2002" ? "Already blocked." : "Server error.",
    });
  }
});

router.delete("/blocked-ifsc/:id", async (req, res) => {
  try {
    await prisma.blockedIfsc.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ BENEFICIARY ACCOUNTS ═══
router.get("/beneficiary-accounts", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await prisma.beneficiaryAccount.findMany({
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/beneficiary-accounts", async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      data: await prisma.beneficiaryAccount.create({ data: req.body }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ CASH ENTRIES ═══
router.get("/cash-entries", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await prisma.cashEntry.findMany({
        where: { adminId: req.user.adminId },
        orderBy: { createdAt: "desc" },
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/cash-entries", async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      data: await prisma.cashEntry.create({
        data: {
          ...req.body,
          amount: parseFloat(req.body.amount),
          adminId: req.user.adminId,
        },
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ TRIAL BALANCE ═══
router.get("/trial-balance", async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const txWhere = {
      merchant: { adminId },
      status: "CLEARED",
      ...(startDate || endDate ? { transactionClearTime: dateFilter } : {}),
    };

    const [
      agentTotals,
      clearedTxns,
      agents,
      merchants,
      adminCommAgg,
      merchantSettlements,
      agentSettlements,
      allAgentRates,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["agentId"],
        where: txWhere,
        _sum: { amount: true, agentCommission: true },
      }),
      // Fetch all cleared txns with stored aedRate
      prisma.transaction.findMany({
        where: txWhere,
        select: { merchantId: true, agentId: true, amount: true, agentCommission: true, adminCommission: true, aedRate: true },
      }),
      prisma.agent.findMany({
        where: { adminId },
        select: { id: true, name: true },
      }),
      prisma.merchant.findMany({
        where: { adminId },
        select: { id: true, name: true },
      }),
      prisma.transaction.aggregate({
        where: txWhere,
        _sum: { adminCommission: true },
      }),
      prisma.settlement.findMany({
        where: { merchant: { adminId }, status: "CONFIRMED" },
        select: { merchantId: true, amount: true, currency: true },
      }),
      prisma.settlement.findMany({
        where: { agent: { adminId }, status: "CONFIRMED" },
        select: { agentId: true, amount: true, currency: true },
      }),
      prisma.rateConfig.findMany({
        where: { agentId: { not: null }, adminId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const agentRateMap = {};
    allAgentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    const agentMap = {};
    agents.forEach((a) => (agentMap[a.id] = a.name));
    const merchantMap = {};
    merchants.forEach((m) => (merchantMap[m.id] = m.name));

    // ── Merchant: compute totalAED from stored per-transaction aedRate ──
    const merchantAedMap = {};
    const merchantTotalsMap = {};
    clearedTxns.forEach((tx) => {
      const mId = tx.merchantId;
      if (!merchantAedMap[mId]) merchantAedMap[mId] = { totalAED: 0, lastRate: 0 };
      if (!merchantTotalsMap[mId]) merchantTotalsMap[mId] = 0;
      const amt = parseFloat(tx.amount || 0);
      const rate = parseFloat(tx.aedRate || 0);
      merchantTotalsMap[mId] += amt;
      if (rate > 0) {
        merchantAedMap[mId].totalAED += amt / rate;
        merchantAedMap[mId].lastRate = rate;
      }
    });

    // ── Agent: compute totalAED from agent's own rate ──
    const agentAedMap = {};
    const agentTotalsMap = {};
    clearedTxns.forEach((tx) => {
      if (!tx.agentId) return;
      const aId = tx.agentId;
      if (!agentAedMap[aId]) agentAedMap[aId] = 0;
      if (!agentTotalsMap[aId]) agentTotalsMap[aId] = { totalINR: 0, commission: 0 };
      const amt = parseFloat(tx.amount || 0);
      const comm = parseFloat(tx.agentCommission || 0);
      const aedRate = parseFloat(agentRateMap[aId]?.aedTodayRate || 0);
      agentTotalsMap[aId].totalINR += amt;
      agentTotalsMap[aId].commission += comm;
      if (aedRate > 0) agentAedMap[aId] += amt / aedRate;
    });

    // ── Admin commission in AED using stored per-transaction rate ──
    const totalAdminCommissionAed = parseFloat(
      clearedTxns
        .filter(t => t.aedRate && t.adminCommission)
        .reduce((s, t) => {
          const rate = parseFloat(t.aedRate || 0);
          return s + (rate > 0 ? parseFloat(t.adminCommission || 0) / rate : 0);
        }, 0).toFixed(2)
    );

    // ── Merchant settled in AED directly ──
    const merchantSettledAedMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledAedMap[s.merchantId]) merchantSettledAedMap[s.merchantId] = 0;
      if (s.currency === "AED") {
        merchantSettledAedMap[s.merchantId] += parseFloat(s.amount || 0);
      }
    });

    // ── Agent settled in AED directly ──
    const agentSettledAedMap = {};
    agentSettlements.forEach((s) => {
      if (!agentSettledAedMap[s.agentId]) agentSettledAedMap[s.agentId] = 0;
      if (s.currency === "AED") {
        agentSettledAedMap[s.agentId] += parseFloat(s.amount || 0);
      }
    });

    // ── Credit entries (agents) — work in AED ──
    const creditEntries = agentTotals.map((a) => {
      const aedRate = parseFloat(agentRateMap[a.agentId]?.aedTodayRate || 0);
      const totalINR = agentTotalsMap[a.agentId]?.totalINR || 0;
      const commission = agentTotalsMap[a.agentId]?.commission || 0;
      const netINR = totalINR - commission;
      const netAed = parseFloat((agentAedMap[a.agentId] || 0).toFixed(2));
      const commAed = aedRate > 0 ? parseFloat((commission / aedRate).toFixed(2)) : 0;
      const netAedAfterComm = parseFloat((netAed - commAed).toFixed(2));
      const settledAed = parseFloat((agentSettledAedMap[a.agentId] || 0).toFixed(2));
      const pendingAed = parseFloat((netAedAfterComm - settledAed).toFixed(2));
      const pendingINR = parseFloat((pendingAed * aedRate).toFixed(2));
      return {
        id: a.agentId,
        name: agentMap[a.agentId] || "Unknown",
        total: netINR,
        commission,
        settled: settledAed * aedRate,
        pending: pendingINR,
        pendingAed,
        aedRate,
      };
    });

    // ── Debit entries (merchants) — work in AED ──
    const debitEntries = Object.keys(merchantAedMap).map((mId) => {
      const id = parseInt(mId);
      const totalAED = parseFloat(merchantAedMap[id].totalAED.toFixed(2));
      const settledAED = parseFloat((merchantSettledAedMap[id] || 0).toFixed(2));
      const pendingAED = parseFloat((totalAED - settledAED).toFixed(2));
      const effectiveRate = merchantAedMap[id].lastRate || 1;
      const totalINR = merchantTotalsMap[id] || 0;
      const pendingINR = parseFloat((pendingAED * effectiveRate).toFixed(2));
      return {
        id,
        name: merchantMap[id] || "Unknown",
        total: totalINR,
        totalAED,
        settled: settledAED * effectiveRate,
        settledAED,
        pending: pendingINR,
        pendingAED,
        aedRate: effectiveRate,
      };
    });

    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);
    const totalCredit = creditEntries.reduce((s, e) => s + e.pending, 0);
    const totalDebit = debitEntries.reduce((s, e) => s + e.pending, 0);

    res.json({
      success: true,
      data: {
        credit: creditEntries,
        debit: debitEntries,
        totalCredit,
        totalDebit,
        totalAdminCommission,
        totalAdminCommissionAed,
      },
    });
  } catch (error) {
    console.error("Trial balance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ LEDGER ═══
// ═══ LEDGER ═══
// ═══ LEDGER ═══
router.get("/ledger", async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");

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
      ...(startDate || endDate ? { transactionClearTime: dateFilter } : {}),
    };

    const [
      clearedTxns,
      merchantSettlements,
      agentSettlements,
      allAgentRates,
      agents,
      adminCommAgg,
    ] = await Promise.all([
      // Fetch all cleared transactions with stored merchant rate
      prisma.transaction.findMany({
        where: txWhere,
        select: {
          merchantId: true,
          agentId: true,
          amount: true,
          agentCommission: true,
          aedRate: true,   // merchant's rate stored at clear time
        },
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
      // Agent rates from rate_configs (agent's own rate)
      prisma.rateConfig.findMany({
        where: { agentId: { not: null }, adminId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.agent.findMany({
        where: { adminId },
        select: { id: true, name: true },
      }),
      prisma.transaction.aggregate({
        where: txWhere,
        _sum: { adminCommission: true },
      }),
    ]);

    // Agent rate map — agent's own rate from rate_configs
    const agentRateMap = {};
    allAgentRates.forEach((r) => {
      if (!agentRateMap[r.agentId]) agentRateMap[r.agentId] = r;
    });

    const agentNameMap = {};
    agents.forEach((a) => (agentNameMap[a.id] = a.name));

    // ── Merchant ledger: use stored tx.aedRate (merchant's rate at clear time) ──
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

    // ── Agent ledger: use agent's OWN rate from rate_configs ──
    const agentMap = {};
    clearedTxns.forEach((tx) => {
      if (!tx.agentId) return;
      const aId = tx.agentId;
      if (!agentMap[aId]) agentMap[aId] = { totalINR: 0, commission: 0 };
      agentMap[aId].totalINR += parseFloat(tx.amount || 0);
      agentMap[aId].commission += parseFloat(tx.agentCommission || 0);
    });

    // Merchant settled map
    const merchantCurrentRateMap = {};
    clearedTxns.forEach((tx) => {
      if (tx.aedRate && !merchantCurrentRateMap[tx.merchantId]) {
        merchantCurrentRateMap[tx.merchantId] = parseFloat(tx.aedRate);
      }
    });

    const merchantSettledMap = {};
    merchantSettlements.forEach((s) => {
      if (!merchantSettledMap[s.merchantId]) merchantSettledMap[s.merchantId] = { aed: 0, inr: 0 };
      const amt = parseFloat(s.amount || 0);
      const rate = merchantCurrentRateMap[s.merchantId] || 1;
      if (s.currency === "USDT") {
        merchantSettledMap[s.merchantId].inr += amt * rate;
        merchantSettledMap[s.merchantId].aed += amt;
      } else {
        merchantSettledMap[s.merchantId].aed += amt;
        merchantSettledMap[s.merchantId].inr += amt * rate;
      }
    });

    // Agent settled map — use agent's own rate
    const agentSettledMap = {};
    agentSettlements.forEach((s) => {
      if (!agentSettledMap[s.agentId]) agentSettledMap[s.agentId] = { aed: 0, inr: 0 };
      const amt = parseFloat(s.amount || 0);
      const rate = parseFloat(agentRateMap[s.agentId]?.aedTodayRate || 1);
      if (s.currency === "USDT") {
        agentSettledMap[s.agentId].inr += amt * rate;
        agentSettledMap[s.agentId].aed += amt;
      } else {
        agentSettledMap[s.agentId].aed += amt;
        agentSettledMap[s.agentId].inr += amt * rate;
      }
    });

    // ── Build merchant ledger rows ──
    const merchantLedger = Object.keys(merchantMap).map((mId) => {
      const id = parseInt(mId);
      const data = merchantMap[mId];
      const settled = merchantSettledMap[id] || { aed: 0, inr: 0 };
      const effectiveRate = data.totalAED > 0 ? data.totalINR / data.totalAED : data.lastRate;
      const pendingAed = data.totalAED - settled.aed;
      const pendingInr = data.totalINR - settled.inr;
      return {
        id,
        name: merchantNameMap[id] || "Unknown",
        total: data.totalINR,
        totalAed: data.totalAED,
        settled: settled.inr,
        settledAed: settled.aed,
        pending: pendingInr,
        pendingAed,
        aedRate: parseFloat(effectiveRate.toFixed(4)),
      };
    });

    // ── Build agent ledger rows using agent's own rate ──
    const agentLedger = Object.keys(agentMap).map((aId) => {
      const id = parseInt(aId);
      const data = agentMap[id];
      // Use agent's own rate from rate_configs
      const aedRate = parseFloat(agentRateMap[id]?.aedTodayRate || 0);
      const netINR = data.totalINR - data.commission;
      const totalAed = aedRate > 0 ? data.totalINR / aedRate : 0;
      const netAed = aedRate > 0 ? netINR / aedRate : 0;
      const settled = agentSettledMap[id] || { aed: 0, inr: 0 };
      const pendingAed = netAed - settled.aed;
      const pendingInr = netINR - settled.inr;
      return {
        id,
        name: agentNameMap[id] || "Unknown",
        total: netINR,
        totalAed: netAed,
        settled: settled.inr,
        settledAed: settled.aed,
        pending: pendingInr,
        pendingAed,
        aedRate,
      };
    });

    const mGrandPending = merchantLedger.reduce((s, e) => s + e.pending, 0);
    const aGrandPending = agentLedger.reduce((s, e) => s + e.pending, 0);
    const totalAdminCommission = parseFloat(adminCommAgg._sum.adminCommission || 0);
    const mGrandPendingAed = merchantLedger.reduce((s, e) => s + e.pendingAed, 0);
    const aGrandPendingAed = agentLedger.reduce((s, e) => s + e.pendingAed, 0);
    const mGrandSettledAed = merchantLedger.reduce((s, e) => s + e.settledAed, 0);
    const aGrandSettledAed = agentLedger.reduce((s, e) => s + e.settledAed, 0);

    res.json({
      success: true,
      merchantLedger,
      agentLedger,
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
        totalAdminCommissionAed:
          mGrandPendingAed > 0
            ? totalAdminCommission / (mGrandPending / mGrandPendingAed || 1)
            : 0,
        agentPendingWithComm: aGrandPending + totalAdminCommission,
        agentPendingWithCommAed: aGrandPendingAed,
      },
    });
  } catch (error) {
    console.error("Admin ledger error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ═══ MERCHANT AGENTS ═══
router.get("/merchants/:id/agents", async (req, res) => {
  try {
    const data = await prisma.merchantAgent.findMany({
      where: { merchantId: parseInt(req.params.id) },
      select: { agentId: true },
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
