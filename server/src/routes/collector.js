const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
router.use(auth, roleCheck('COLLECTOR'));

router.get('/dashboard', async (req, res) => {
  try {
    const collectorId = req.user.collectorId;
    const [merchantOwed, settled, agentKoDena, adminKoDena] = await Promise.all([
      prisma.settlement.aggregate({ where: { collectorId, status: 'PENDING' }, _sum: { amount: true } }),
      prisma.settlement.aggregate({ where: { collectorId, status: 'SUBMITTED' }, _sum: { amount: true } }),
      prisma.settlement.aggregate({ where: { collectorId, status: 'PENDING', agentId: { not: null } }, _sum: { amount: true } }),
      prisma.settlement.aggregate({ where: { collectorId, status: 'PENDING', agentId: null }, _sum: { amount: true } }),
    ]);
    res.json({ success: true, data: { totalMerchantSeLena: merchantOwed._sum.amount || 0, totalSettled: settled._sum.amount || 0, totalAgentKoDena: agentKoDena._sum.amount || 0, totalAdminKoDena: adminKoDena._sum.amount || 0 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/requests', async (req, res) => {
  try { res.json({ success: true, data: await prisma.request.findMany({ where: { collectorId: req.user.collectorId }, orderBy: { createdAt: 'desc' } }) }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/requests', async (req, res) => {
  try { const { amount, description } = req.body; res.status(201).json({ success: true, data: await prisma.request.create({ data: { amount: parseFloat(amount), description, collectorId: req.user.collectorId } }) }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});



// ─── Settlements ───
router.get('/settlements', async (req, res) => {
  try {
    const data = await prisma.settlement.findMany({
      where: {
        OR: [
          { status: 'PENDING', collectorId: null },        // merchant requests to pick
          { collectorId: req.user.collectorId },            // this collector's own records
        ]
      },
      include: {
        merchant: { select: { name: true } },
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/settlements/:id/pick', async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!settlement) return res.status(404).json({ success: false, message: 'Not found.' });
    if (settlement.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Already picked.' });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PICKED', collectorId: req.user.collectorId }
    });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/settlements/:id/submit', async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!settlement) return res.status(404).json({ success: false, message: 'Not found.' });
    if (settlement.collectorId !== req.user.collectorId) return res.status(403).json({ success: false, message: 'Not your settlement.' });
    if (settlement.status !== 'PICKED') return res.status(400).json({ success: false, message: 'Must be picked first.' });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'SUBMITTED' }
    });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/settlements/:id/reject', async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!settlement) return res.status(404).json({ success: false, message: 'Not found.' });
    if (settlement.collectorId !== req.user.collectorId) return res.status(403).json({ success: false, message: 'Not your settlement.' });
    if (settlement.status !== 'PICKED') return res.status(400).json({ success: false, message: 'Must be picked first.' });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});
router.get('/agents', async (req, res) => {
  try {
    const data = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/settlements', async (req, res) => {
  try {
    const { amount, currency, agentId, remark } = req.body;
    const s = await prisma.settlement.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || 'AED',
        collectorId: req.user.collectorId,
        agentId: agentId ? parseInt(agentId) : null,
        remark,
      }
    });
    res.status(201).json({ success: true, data: s });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});
router.post('/settlements/:id/pay', async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!settlement) return res.status(404).json({ success: false, message: 'Not found.' });
    if (settlement.status !== 'SUBMITTED') return res.status(400).json({ success: false, message: 'Must be submitted first.' });
    const updated = await prisma.settlement.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PAID' }
    });
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});


router.get('/ledger', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get collector's adminId
    const collector = await prisma.collector.findUnique({
      where: { id: req.user.collectorId },
      select: { adminId: true }
    });

    // Get all merchants under same admin
    const merchants = await prisma.merchant.findMany({
      where: { adminId: collector.adminId },
      select: { id: true }
    });
    const merchantIds = merchants.map(m => m.id);

    // Get cleared transactions for those merchants
    const where = { merchantId: { in: merchantIds }, status: 'CLEARED' };
    if (startDate || endDate) {
      where.transactionClearTime = {};
      if (startDate) where.transactionClearTime.gte = new Date(startDate);
      if (endDate) where.transactionClearTime.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const data = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        accountHolderName: true,
        ifscCode: true,
        utrNumber: true,
        notes: true,
        transactionClearTime: true,
        createdAt: true,
        merchant: { select: { name: true } },
        operator: { select: { name: true } },
      },
      orderBy: { transactionClearTime: 'desc' },
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/trial-balance', async (req, res) => {
  try {
    const collectorId = req.user.collectorId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
    const dateWhere = startDate || endDate ? { createdAt: dateFilter } : {};

    // Merchant Se Lena = settlements from merchants (PENDING/PICKED/SUBMITTED)
    const merchantSettlements = await prisma.settlement.findMany({
      where: { collectorId, merchantId: { not: null }, ...dateWhere },
      include: { merchant: { select: { name: true } } },
    });

    // Agent Ko Dena = settlements to agents
    const agentSettlements = await prisma.settlement.findMany({
      where: { collectorId, agentId: { not: null }, ...dateWhere },
      include: { agent: { select: { name: true } } },
    });

    // Group merchants
    const merchantMap = {};
    merchantSettlements.forEach(s => {
      const name = s.merchant?.name || 'Unknown';
      if (!merchantMap[name]) merchantMap[name] = { name, amount: 0 };
      if (!['REJECTED'].includes(s.status)) merchantMap[name].amount += parseFloat(s.amount);
    });

    // Group agents
    const agentMap = {};
    agentSettlements.forEach(s => {
      const name = s.agent?.name || 'Unknown';
      if (!agentMap[name]) agentMap[name] = { name, amount: 0 };
      if (!['REJECTED'].includes(s.status)) agentMap[name].amount += parseFloat(s.amount);
    });

    const totalMerchantLena = Object.values(merchantMap).reduce((s, e) => s + e.amount, 0);
    const totalAgentDena = Object.values(agentMap).reduce((s, e) => s + e.amount, 0);

    res.json({
      success: true,
      data: {
        merchantLena: Object.values(merchantMap),
        agentDena: Object.values(agentMap),
        totalMerchantLena,
        totalAgentDena,
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});
module.exports = router;