// ============================================
// Config Routes - Rate Configuration
// ============================================
const router = require("express").Router();
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");

router.use(auth);
const adminOnly = roleCheck("ADMIN");

// ─── Get rates ───
router.get("/rates", adminOnly, async (req, res) => {
  try {
    const { merchantId, agentId } = req.query;
    const where = { adminId: req.user.adminId };
    if (merchantId) where.merchantId = parseInt(merchantId);
    if (agentId) where.agentId = parseInt(agentId);

    const allRates = await prisma.rateConfig.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Keep only latest rate per merchant/agent combo
    const seen = new Set();
    const latestRates = allRates.filter((r) => {
      const key = `m${r.merchantId || 0}-a${r.agentId || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ success: true, data: latestRates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Set/Update rate ───
router.post("/rates", adminOnly, async (req, res) => {
  try {
    const { merchantId, agentId, usdtTodayRate, aedTodayRate, currency } =
      req.body;

    if (!usdtTodayRate || !aedTodayRate) {
      return res
        .status(400)
        .json({ success: false, message: "USDT and AED rates required." });
    }

    // Check if rate exists for this merchant/agent
    const existingWhere = { adminId: req.user.adminId };
    if (merchantId) existingWhere.merchantId = parseInt(merchantId);
    if (agentId) existingWhere.agentId = parseInt(agentId);

    const existing = await prisma.rateConfig.findFirst({
      where: existingWhere,
    });

    let rate;
    if (existing) {
      rate = await prisma.rateConfig.update({
        where: { id: existing.id },
        data: {
          usdtTodayRate: parseFloat(usdtTodayRate),
          aedTodayRate: parseFloat(aedTodayRate),
          currency: currency || "AED",
        },
      });
    } else {
      rate = await prisma.rateConfig.create({
        data: {
          usdtTodayRate: parseFloat(usdtTodayRate),
          aedTodayRate: parseFloat(aedTodayRate),
          currency: currency || "AED",
          merchantId: merchantId ? parseInt(merchantId) : null,
          agentId: agentId ? parseInt(agentId) : null,
          adminId: req.user.adminId,
        },
      });
    }

    res.json({ success: true, message: "Rate updated.", data: rate });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Get current rates (for header dropdown - all roles) ───
router.get("/current-rates", async (req, res) => {
  try {
    const user = req.user;

    // SUPER_ADMIN — no rates needed
    if (user.role === "SUPER_ADMIN") {
      return res.json({ success: true, data: [] });
    }

    // MERCHANT — rate set by admin for this merchant
    if (user.role === "MERCHANT") {
      const rate = await prisma.rateConfig.findFirst({
        where: { merchantId: user.merchantId },
        orderBy: { updatedAt: "desc" },
      });
      return res.json({ success: true, data: rate ? [rate] : [] });
    }

    // SUB_MERCHANT — rate set by merchant for this sub-merchant (stored as agentId)
    // fallback to merchant rate if no sub-merchant specific rate
    if (user.role === "SUB_MERCHANT") {
      // Sub-merchant rate is set by merchant, so merchantId must be set too
      const sm = await prisma.subMerchant.findUnique({
        where: { id: user.subMerchantId },
      });
      if (sm) {
        const rate = await prisma.rateConfig.findFirst({
          where: {
            agentId: user.subMerchantId,
            merchantId: sm.merchantId, // ← scope to parent merchant only
          },
          orderBy: { updatedAt: "desc" },
        });
        if (rate) return res.json({ success: true, data: [rate] });
        // fallback to merchant rate
        const merchantRate = await prisma.rateConfig.findFirst({
          where: { merchantId: sm.merchantId, agentId: null },
          orderBy: { updatedAt: "desc" },
        });
        return res.json({
          success: true,
          data: merchantRate ? [merchantRate] : [],
        });
      }
      return res.json({ success: true, data: [] });
    }

    // AGENT — rate set by admin for this agent
    if (user.role === "AGENT") {
      const rate = await prisma.rateConfig.findFirst({
        where: { agentId: user.agentId },
        orderBy: { updatedAt: "desc" },
      });
      return res.json({ success: true, data: rate ? [rate] : [] });
    }

    // OPERATOR — rate set by admin for parent agent
    if (user.role === "OPERATOR") {
      const op = await prisma.operator.findUnique({
        where: { id: user.operatorId },
      });
      if (op) {
        const rate = await prisma.rateConfig.findFirst({
          where: { agentId: op.agentId },
          orderBy: { updatedAt: "desc" },
        });
        return res.json({ success: true, data: rate ? [rate] : [] });
      }
      return res.json({ success: true, data: [] });
    }

    // ADMIN — global rate for this admin
    if (user.role === "ADMIN") {
      const rate = await prisma.rateConfig.findFirst({
        where: { adminId: user.adminId, merchantId: null, agentId: null },
        orderBy: { updatedAt: "desc" },
      });
      return res.json({ success: true, data: rate ? [rate] : [] });
    }

    // COLLECTOR — rate from parent admin
    if (user.role === "COLLECTOR") {
      const collector = await prisma.collector.findUnique({
        where: { id: user.collectorId },
      });
      if (collector) {
        const rate = await prisma.rateConfig.findFirst({
          where: {
            adminId: collector.adminId,
            merchantId: null,
            agentId: null,
          },
          orderBy: { updatedAt: "desc" },
        });
        return res.json({ success: true, data: rate ? [rate] : [] });
      }
      return res.json({ success: true, data: [] });
    }

    // EXPENSE_MANAGER — no rates needed
    return res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
