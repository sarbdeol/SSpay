const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
router.use(auth, roleCheck('COLLECTOR'));

router.get('/dashboard', async (req, res) => {
  try {
    const collectorId = req.user.collectorId;
    const [merchantOwed, settled, agentKoDena, adminKoDena] = await Promise.all([
      prisma.settlement.aggregate({ where: { collectorId, status: 'PENDING' }, _sum: { amount: true } }),
      prisma.settlement.aggregate({ where: { collectorId, status: 'APPROVED' }, _sum: { amount: true } }),
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

router.get('/ledger', async (req, res) => {
  try { res.json({ success: true, data: await prisma.ledger.findMany({ where: { collectorId: req.user.collectorId }, orderBy: { createdAt: 'desc' } }) }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
