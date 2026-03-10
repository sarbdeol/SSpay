const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/expense-invoices',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.use(auth, roleCheck('EXPENSE_MANAGER'));

// ─── Dashboard ───
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const [totalExpenses, thisMonthExpenses, entryCount] = await Promise.all([
      prisma.expenseEntry.aggregate({ where: { createdById: userId }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({
        where: { createdById: userId, expenseDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { amount: true }
      }),
      prisma.expenseEntry.count({ where: { createdById: userId } }),
    ]);
    res.json({ success: true, data: { totalExpenses: totalExpenses._sum.amount || 0, thisMonthExpenses: thisMonthExpenses._sum.amount || 0, entryCount } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── List entries ───
router.get('/entries', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { createdById: req.user.id };
    if (category) where.category = category;
    if (startDate || endDate) { where.expenseDate = {}; if (startDate) where.expenseDate.gte = new Date(startDate); if (endDate) where.expenseDate.lte = new Date(endDate + 'T23:59:59.999Z'); }

    const [data, total] = await Promise.all([
      prisma.expenseEntry.findMany({ where, orderBy: { expenseDate: 'desc' }, skip, take: parseInt(limit) }),
      prisma.expenseEntry.count({ where })
    ]);
    res.json({ success: true, data, total });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Create entry (with invoice photo) ───
router.post('/entries', upload.single('invoice'), async (req, res) => {
  try {
    const { category, expenseDate, description, amount } = req.body;
    if (!category || !amount || !expenseDate) return res.status(400).json({ success: false, message: 'Category, date, and amount required.' });

    const entry = await prisma.expenseEntry.create({
      data: {
        category,
        expenseDate: new Date(expenseDate),
        description: description || null,
        amount: parseFloat(amount),
        invoiceImage: req.file ? req.file.filename : null,
        createdById: req.user.id,
      }
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) { console.error('Create expense entry:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Delete entry ───
router.delete('/entries/:id', async (req, res) => {
  try {
    const entry = await prisma.expenseEntry.findFirst({ where: { id: parseInt(req.params.id), createdById: req.user.id } });
    if (!entry) return res.status(404).json({ success: false, message: 'Not found.' });
    await prisma.expenseEntry.delete({ where: { id: entry.id } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
