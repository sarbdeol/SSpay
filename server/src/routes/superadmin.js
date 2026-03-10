const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
router.use(auth, roleCheck('SUPER_ADMIN'));

router.get('/dashboard', async (req, res) => {
  try {
    const [totalAdmins, totalMerchants, totalAgents, totalCollectors, totalUsers, totalExpenseManagers] = await Promise.all([
      prisma.admin.count(), prisma.merchant.count(), prisma.agent.count(), prisma.collector.count(), prisma.user.count(),
      prisma.user.count({ where: { role: 'EXPENSE_MANAGER' } }),
    ]);
    res.json({ success: true, data: { totalAdmins, totalMerchants, totalAgents, totalCollectors, totalUsers, totalExpenseManagers } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/admins', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [admins, total] = await Promise.all([
      prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, username: true, plainPassword: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.user.count({ where: { role: 'ADMIN' } })
    ]);
    res.json({ success: true, data: admins, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/admins', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ success: false, message: 'All fields required.' });
    const exists = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (exists) return res.status(400).json({ success: false, message: 'Username exists.' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const admin = await tx.admin.create({ data: { name } });
      const user = await tx.user.create({ data: { name, username: username.toLowerCase().trim(), password: hashed, plainPassword: password, role: 'ADMIN', adminId: admin.id, createdBy: req.user.id } });
      return user;
    });
    res.status(201).json({ success: true, message: 'Admin created.', data: { id: result.id, name: result.name, username: result.username }, credentials: { username: username.toLowerCase().trim(), password } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/admins/:id', async (req, res) => {
  try {
    const { name, isActive, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/admins/:id', async (req, res) => {
  try { await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (role) where.role = role;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { username: { contains: search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, name: true, username: true, plainPassword: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.user.count({ where })
    ]);
    res.json({ success: true, data: users, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Expense Manager entries (SuperAdmin can view) ───
router.get('/expense-entries', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.expenseEntry.findMany({ include: { createdByUser: { select: { name: true, username: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.expenseEntry.count()
    ]);
    res.json({ success: true, data, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
