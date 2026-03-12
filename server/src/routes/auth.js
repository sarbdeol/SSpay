const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { auth } = require('../middleware/auth');

// ─── Login (with login history) ───
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required.' });

    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Save login history
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    try {
      await prisma.loginHistory.create({ data: { userId: user.id, ipAddress: ip.toString().split(',')[0].trim(), userAgent, location: '' } });
    } catch (e) { console.error('Login history save error:', e); }

    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role,
        adminId: user.adminId, merchantId: user.merchantId, subMerchantId: user.subMerchantId,
        agentId: user.agentId, operatorId: user.operatorId, collectorId: user.collectorId }
    });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ success: true }); });

router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, username: true, role: true, isActive: true, adminId: true, merchantId: true, subMerchantId: true, agentId: true, operatorId: true, collectorId: true }
    });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Impersonate - chain: SA→any, Admin→their users, Merchant→their submerchants, Agent→their operators ───
router.post('/impersonate/:userId', auth, async (req, res) => {
  try {
    const cur = req.user;
    const target = await prisma.user.findUnique({
      where: { id: parseInt(req.params.userId) },
      include: {
        merchant: { select: { adminId: true } }, agent: { select: { adminId: true } },
        collector: { select: { adminId: true } },
        subMerchant: { select: { merchantId: true, merchant: { select: { adminId: true } } } },
        operator: { select: { agentId: true, agent: { select: { adminId: true } } } },
      }
    });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    let allowed = false;
    if (cur.role === 'SUPER_ADMIN') allowed = true;
    else if (cur.role === 'ADMIN') {
      if (target.merchant?.adminId === cur.adminId || target.agent?.adminId === cur.adminId ||
          target.collector?.adminId === cur.adminId || target.subMerchant?.merchant?.adminId === cur.adminId ||
          target.operator?.agent?.adminId === cur.adminId) allowed = true;
      else if (target.role === 'EXPENSE_MANAGER' && target.createdBy === cur.id) allowed = true;
    }
    
    
    else if (cur.role === 'MERCHANT' && target.subMerchant?.merchantId === cur.merchantId) allowed = true;
    else if (cur.role === 'AGENT' && target.operator?.agentId === cur.agentId) allowed = true;

    if (!allowed) return res.status(403).json({ success: false, message: 'Not allowed.' });

    const token = jwt.sign({ userId: target.id, role: target.role, impersonatedBy: cur.id }, process.env.JWT_SECRET, { expiresIn: '4h' });
    res.json({
      success: true, token,
      user: { id: target.id, name: target.name, username: target.username, role: target.role,
        adminId: target.adminId, merchantId: target.merchantId, subMerchantId: target.subMerchantId,
        agentId: target.agentId, operatorId: target.operatorId, collectorId: target.collectorId, impersonated: true }
    });
  } catch (error) { console.error('Impersonate error:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Login History (SuperAdmin) ───
router.get('/login-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ success: false, message: 'Access denied.' });
    const { page = 1, limit = 20, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (userId) where.userId = parseInt(userId);

    const [data, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where, include: { user: { select: { name: true, username: true, role: true } } },
        orderBy: { loginAt: 'desc' }, skip, take: parseInt(limit),
      }),
      prisma.loginHistory.count({ where })
    ]);
    res.json({ success: true, data, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
