const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
router.use(auth, roleCheck('ADMIN'));

// ─── Dashboard ───
router.get('/dashboard', async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
    const txWhere = { merchant: { adminId }, ...(startDate || endDate ? { createdAt: dateFilter } : {}) };

    const [clearedAgg, pendingCount, pickedCount, totalLimit, usedLimit, adminComm, mC, aC, cC] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...txWhere, status: 'CLEARED' }, _sum: { amount: true }, _count: true }),
      prisma.transaction.count({ where: { ...txWhere, status: 'PENDING' } }),
      prisma.transaction.count({ where: { ...txWhere, status: { in: ['PICKED', 'PAID'] } } }),
      prisma.merchant.aggregate({ where: { adminId }, _sum: { maxPaymentLimit: true } }),
      prisma.merchant.aggregate({ where: { adminId }, _sum: { usedLimit: true } }),
      prisma.transaction.aggregate({ where: { ...txWhere, status: 'CLEARED' }, _sum: { adminCommission: true } }),
      prisma.merchant.count({ where: { adminId } }),
      prisma.agent.count({ where: { adminId } }),
      prisma.collector.count({ where: { adminId } }),
    ]);

    const tl = parseFloat(totalLimit._sum.maxPaymentLimit || 0);
    const tu = parseFloat(usedLimit._sum.usedLimit || 0);

    // ✅ FIX: availableLimit = maxPaymentLimit - usedLimit per merchant (correctly clamped to 0)
    // Replace the merchantLimits block with this:
    const pendingAvailable = await prisma.transaction.aggregate({
      where: { status: "PENDING", merchant: { adminId } },
      _sum: { amount: true },
    });

    const availableLimit = parseFloat(pendingAvailable._sum.amount || 0);

    res.json({
      success: true,
      data: {
        totalRtgsAmount: clearedAgg._sum.amount || 0,
        totalRtgsCount: clearedAgg._count || 0,
        totalPending: pendingCount,
        totalPicked: pickedCount,
        totalCleared: clearedAgg._count || 0,
        totalAdminCommission: adminComm._sum.adminCommission || 0,
        totalMerchantLimit: tl,
        totalUsedLimit: tu,
        availableLimit,  // ✅ now correctly clamped per merchant
        merchantCount: mC,
        agentCount: aC,
        collectorCount: cC,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ═══ MERCHANTS ═══
router.get('/merchants', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query; const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { adminId: req.user.adminId }; if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      prisma.merchant.findMany({ where, include: { user: { select: { id: true, username: true, plainPassword: true, isActive: true } }, _count: { select: { transactions: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.merchant.count({ where })
    ]);
    res.json({ success: true, data, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/merchants', async (req, res) => {
  try {
    const { name, description, maxPaymentLimit, commissionChargePercent, assignAgentIds, assignAll, username, password } = req.body;
    if (!name || !maxPaymentLimit || !commissionChargePercent || !username || !password) return res.status(400).json({ success: false, message: 'Required fields missing.' });
    const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: 'Username exists.' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.create({ data: { name, description, maxPaymentLimit: parseFloat(maxPaymentLimit), commissionChargePercent: parseFloat(commissionChargePercent), adminId: req.user.adminId } });
      const u = await tx.user.create({ data: { name, username: username.toLowerCase().trim(), password: hashed, plainPassword: password, role: 'MERCHANT', merchantId: m.id, createdBy: req.user.id } });
      if (assignAll) { const all = await tx.agent.findMany({ where: { adminId: req.user.adminId }, select: { id: true } }); if (all.length) await tx.merchantAgent.createMany({ data: all.map(a => ({ merchantId: m.id, agentId: a.id })) }); }
      else if (assignAgentIds?.length) await tx.merchantAgent.createMany({ data: assignAgentIds.map(id => ({ merchantId: m.id, agentId: parseInt(id) })) });
      return { m, u };
    });
    res.status(201).json({ success: true, data: result.m, credentials: { username: username.toLowerCase().trim(), password } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/merchants/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { name, description, maxPaymentLimit, commissionChargePercent, isActive, assignAgentIds, assignAll } = req.body;
    const data = {}; if (name) data.name = name; if (description !== undefined) data.description = description;
    if (maxPaymentLimit) data.maxPaymentLimit = parseFloat(maxPaymentLimit); if (commissionChargePercent) data.commissionChargePercent = parseFloat(commissionChargePercent);
    if (typeof isActive === 'boolean') data.isActive = isActive;
    await prisma.$transaction(async (tx) => {
      await tx.merchant.update({ where: { id }, data });
      if (name) { const u = await tx.user.findFirst({ where: { merchantId: id } }); if (u) await tx.user.update({ where: { id: u.id }, data: { name, isActive: isActive ?? u.isActive } }); }
      if (assignAll !== undefined || assignAgentIds) {
        await tx.merchantAgent.deleteMany({ where: { merchantId: id } });
        if (assignAll) { const all = await tx.agent.findMany({ where: { adminId: req.user.adminId }, select: { id: true } }); if (all.length) await tx.merchantAgent.createMany({ data: all.map(a => ({ merchantId: id, agentId: a.id })) }); }
        else if (assignAgentIds?.length) await tx.merchantAgent.createMany({ data: assignAgentIds.map(aid => ({ merchantId: id, agentId: parseInt(aid) })) });
      }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/merchants/:id', async (req, res) => {
  try { const id = parseInt(req.params.id); await prisma.$transaction(async (tx) => { await tx.merchant.update({ where: { id }, data: { isActive: false } }); const u = await tx.user.findFirst({ where: { merchantId: id } }); if (u) await tx.user.update({ where: { id: u.id }, data: { isActive: false } }); }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ═══ AGENTS (FIXED edit/delete) ═══
router.get('/agents', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query; const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { adminId: req.user.adminId }; if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      prisma.agent.findMany({ where, include: { user: { select: { id: true, username: true, plainPassword: true, isActive: true } }, _count: { select: { operators: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.agent.count({ where })
    ]);
    res.json({ success: true, data, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/agents', async (req, res) => {
  try {
    const { name, description, commissionChargePercent, username, password } = req.body;
    if (!name || !commissionChargePercent || !username || !password) return res.status(400).json({ success: false, message: 'Required.' });
    const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: 'Username exists.' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const a = await tx.agent.create({ data: { name, description, commissionChargePercent: parseFloat(commissionChargePercent), adminId: req.user.adminId } });
      await tx.user.create({ data: { name, username: username.toLowerCase().trim(), password: hashed, plainPassword: password, role: 'AGENT', agentId: a.id, createdBy: req.user.id } });
      return a;
    });
    res.status(201).json({ success: true, data: result, credentials: { username: username.toLowerCase().trim(), password } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/agents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { name, description, commissionChargePercent, isActive } = req.body;
    const data = {}; if (name) data.name = name; if (description !== undefined) data.description = description;
    if (commissionChargePercent !== undefined) data.commissionChargePercent = parseFloat(commissionChargePercent);
    if (typeof isActive === 'boolean') data.isActive = isActive;
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id }, data });
      const u = await tx.user.findFirst({ where: { agentId: id } });
      if (u) { const ud = {}; if (name) ud.name = name; if (typeof isActive === 'boolean') ud.isActive = isActive; if (Object.keys(ud).length) await tx.user.update({ where: { id: u.id }, data: ud }); }
    });
    res.json({ success: true });
  } catch (error) { console.error('Agent update:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => { await tx.agent.update({ where: { id }, data: { isActive: false } }); const u = await tx.user.findFirst({ where: { agentId: id } }); if (u) await tx.user.update({ where: { id: u.id }, data: { isActive: false } }); });
    res.json({ success: true });
  } catch (error) { console.error('Agent delete:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ═══ COLLECTORS ═══
router.get('/collectors', async (req, res) => {
  try { const data = await prisma.collector.findMany({ where: { adminId: req.user.adminId }, include: { user: { select: { id: true, username: true, plainPassword: true, isActive: true } } }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data, total: data.length }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/collectors', async (req, res) => {
  try {
    const { name, description, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ success: false, message: 'Required.' });
    const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: 'Username exists.' });
    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const c = await tx.collector.create({ data: { name, description, adminId: req.user.adminId } });
      await tx.user.create({ data: { name, username: username.toLowerCase().trim(), password: hashed, plainPassword: password, role: 'COLLECTOR', collectorId: c.id, createdBy: req.user.id } });
    });
    res.status(201).json({ success: true, credentials: { username: username.toLowerCase().trim(), password } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ═══ EXPENSE MANAGERS (Admin creates) ═══
router.post('/expense-managers', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ success: false, message: 'Required.' });
    const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: 'Username exists.' });
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, username: username.toLowerCase().trim(), password: hashed, plainPassword: password, role: 'EXPENSE_MANAGER', createdBy: req.user.id } });
    res.status(201).json({ success: true, credentials: { username: username.toLowerCase().trim(), password } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/expense-managers', async (req, res) => {
  try { const data = await prisma.user.findMany({ where: { role: 'EXPENSE_MANAGER', createdBy: req.user.id }, select: { id: true, name: true, username: true, plainPassword: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ═══ TRANSACTIONS (with remark filter, reject reason visible) ═══
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, merchantId, agentId, operatorId, startDate, endDate, search, remark } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { merchant: { adminId: req.user.adminId } };
    if (status) where.status = status; if (merchantId) where.merchantId = parseInt(merchantId);
    if (agentId) where.agentId = parseInt(agentId); if (operatorId) where.operatorId = parseInt(operatorId);
    if (remark) where.notes = { contains: remark, mode: 'insensitive' };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z'); }
    if (search) { where.OR = [{ utrNumber: { contains: search, mode: 'insensitive' } }, { upiId: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }]; }
    const allRemarks = await prisma.transaction.findMany({ where: { merchant: { adminId: req.user.adminId }, notes: { not: null } }, select: { notes: true }, distinct: ['notes'] });
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({ where, include: { merchant: { select: { id: true, name: true } }, agent: { select: { id: true, name: true } }, operator: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.transaction.count({ where })
    ]);
    res.json({ success: true, data, total, remarks: allRemarks.map(r => r.notes).filter(Boolean) });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ═══ COLLECTIONS ═══
router.post('/collections', async (req, res) => {
  try { const { amount, merchantId, description } = req.body; const c = await prisma.collection.create({ data: { amount: parseFloat(amount), merchantId: parseInt(merchantId), description } }); res.status(201).json({ success: true, data: c }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});
router.get('/collections', async (req, res) => {
  try { const data = await prisma.collection.findMany({ include: { merchant: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data, total: data.length }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/blocked-ifsc', async (req, res) => { try { res.json({ success: true, data: await prisma.blockedIfsc.findMany({ where: { adminId: req.user.adminId }, orderBy: { createdAt: 'desc' } }) }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });
router.post('/blocked-ifsc', async (req, res) => { try { res.status(201).json({ success: true, data: await prisma.blockedIfsc.create({ data: { ifscCode: req.body.ifscCode.toUpperCase(), reason: req.body.reason, adminId: req.user.adminId } }) }); } catch (e) { res.status(500).json({ success: false, message: e.code === 'P2002' ? 'Already blocked.' : 'Server error.' }); } });
router.delete('/blocked-ifsc/:id', async (req, res) => { try { await prisma.blockedIfsc.delete({ where: { id: parseInt(req.params.id) } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });

router.get('/beneficiary-accounts', async (req, res) => { try { res.json({ success: true, data: await prisma.beneficiaryAccount.findMany({ orderBy: { createdAt: 'desc' } }) }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });
router.post('/beneficiary-accounts', async (req, res) => { try { res.status(201).json({ success: true, data: await prisma.beneficiaryAccount.create({ data: req.body }) }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });
router.get('/cash-entries', async (req, res) => { try { res.json({ success: true, data: await prisma.cashEntry.findMany({ where: { adminId: req.user.adminId }, orderBy: { createdAt: 'desc' } }) }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });
router.post('/cash-entries', async (req, res) => { try { res.status(201).json({ success: true, data: await prisma.cashEntry.create({ data: { ...req.body, amount: parseFloat(req.body.amount), adminId: req.user.adminId } }) }); } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); } });

module.exports = router;
