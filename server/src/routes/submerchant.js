const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleCheck } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth, roleCheck('SUB_MERCHANT'));

router.get('/dashboard', async (req, res) => {
  try {
    const subMerchantId = req.user.subMerchantId;
    const subMerchant = await prisma.subMerchant.findUnique({
      where: { id: subMerchantId }, include: { merchant: { select: { maxPaymentLimit: true, usedLimit: true } } }
    });
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
    const txWhere = { subMerchantId, ...(startDate || endDate ? { createdAt: dateFilter } : {}) };

    const [payOut, payOutCount, pendingCount, pendingAmt, totalAll] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...txWhere, status: 'CLEARED' }, _sum: { amount: true } }),
      prisma.transaction.count({ where: { ...txWhere, status: 'CLEARED' } }),
      prisma.transaction.count({ where: { ...txWhere, status: 'PENDING' } }),
      prisma.transaction.aggregate({ where: { ...txWhere, status: 'PENDING' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { subMerchantId, status: { not: 'REJECTED' } }, _sum: { amount: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalRtgs: payOut._sum.amount || 0,
        totalPayOutTransactions: payOutCount,
        pendingCount,
        pendingAmount: pendingAmt._sum.amount || 0,
        totalPaymentDena: totalAll._sum.amount || 0,
        merchantLimit: subMerchant?.merchant?.maxPaymentLimit || 0,
        merchantUsed: subMerchant?.merchant?.usedLimit || 0,
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/ledger', async (req, res) => {
  try { res.json({ success: true, data: await prisma.ledger.findMany({ where: { subMerchantId: req.user.subMerchantId }, orderBy: { createdAt: 'desc' } }) }); }
  catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, search, remark } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { subMerchantId: req.user.subMerchantId };
    if (status) where.status = status;
    if (remark) where.notes = { contains: remark, mode: 'insensitive' };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z'); }
    if (search) { where.OR = [{ utrNumber: { contains: search, mode: 'insensitive' } }, { upiId: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }]; }

    const allRemarks = await prisma.transaction.findMany({ where: { subMerchantId: req.user.subMerchantId, notes: { not: null } }, select: { notes: true }, distinct: ['notes'] });
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.transaction.count({ where })
    ]);
    res.json({ success: true, data: transactions, total, remarks: allRemarks.map(r => r.notes).filter(Boolean) });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/transactions', async (req, res) => {
  try {
    const { transactionType, amount, upiId, accountNumber, ifscCode, accountHolderName, notes } = req.body;
    const subMerchantId = req.user.subMerchantId;
    const subMerchant = await prisma.subMerchant.findUnique({ where: { id: subMerchantId }, include: { merchant: true } });
    const available = parseFloat(subMerchant.merchant.maxPaymentLimit) - parseFloat(subMerchant.merchant.usedLimit);
    if (parseFloat(amount) > available) return res.status(400).json({ success: false, message: `Insufficient limit. Available: ${available}` });

    if (transactionType === 'BANK_ACCOUNT' && ifscCode) {
      const blocked = await prisma.blockedIfsc.findUnique({ where: { ifscCode: ifscCode.toUpperCase() } });
      if (blocked) return res.status(400).json({ success: false, message: 'IFSC blocked.' });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          amount: parseFloat(amount), transactionType, merchantId: subMerchant.merchantId, subMerchantId,
          upiId: transactionType === 'UPI' ? upiId : null,
          accountNumber: transactionType === 'BANK_ACCOUNT' ? accountNumber : null,
          ifscCode: transactionType === 'BANK_ACCOUNT' ? ifscCode?.toUpperCase() : null,
          accountHolderName: transactionType === 'BANK_ACCOUNT' ? accountHolderName : null,
          notes,
        }
      });
      await tx.merchant.update({ where: { id: subMerchant.merchantId }, data: { usedLimit: { increment: parseFloat(amount) } } });
      // Add ledger entry
      const lastLedger = await tx.ledger.findFirst({ where: { subMerchantId }, orderBy: { createdAt: 'desc' } });
      const prevBalance = lastLedger ? parseFloat(lastLedger.balanceAfter) : 0;
      await tx.ledger.create({ data: { entryType: 'DEBIT', amount: parseFloat(amount), description: `Transaction #${txn.id} - ${transactionType} - ${notes || 'No remark'}`, balanceAfter: prevBalance + parseFloat(amount), subMerchantId } });
      return txn;
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/transactions/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File required.' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    const transactions = [];
    sheet.eachRow((row, idx) => {
      if (idx === 1) return;
      const type = row.getCell(1).value?.toString().toUpperCase();
      transactions.push({
        transactionType: type === 'UPI' ? 'UPI' : 'BANK_ACCOUNT',
        amount: parseFloat(row.getCell(2).value) || 0,
        upiId: type === 'UPI' ? row.getCell(3).value?.toString() : null,
        accountNumber: type !== 'UPI' ? row.getCell(3).value?.toString() : null,
        ifscCode: type !== 'UPI' ? row.getCell(4).value?.toString() : null,
        accountHolderName: type !== 'UPI' ? row.getCell(5).value?.toString() : null,
        notes: row.getCell(6).value?.toString() || null,
      });
    });
    const subMerchant = await prisma.subMerchant.findUnique({ where: { id: req.user.subMerchantId }, include: { merchant: true } });
    let created = 0;
    for (const tx of transactions) {
      if (tx.amount <= 0) continue;
      await prisma.$transaction(async (pc) => {
        await pc.transaction.create({ data: { ...tx, merchantId: subMerchant.merchantId, subMerchantId: req.user.subMerchantId } });
        await pc.merchant.update({ where: { id: subMerchant.merchantId }, data: { usedLimit: { increment: tx.amount } } });
      });
      created++;
    }
    res.json({ success: true, message: `${created} transactions created.` });
  } catch (error) { res.status(500).json({ success: false, message: 'Upload failed.' }); }
});

router.get('/transactions/example', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    sheet.addRow(['Type', 'Amount', 'UPI_ID / Account_Number', 'IFSC_Code', 'Account_Holder_Name', 'Remark']);
    sheet.addRow(['UPI', '500', '9876543210@upi', '', '', 'Monthly payment']);
    sheet.addRow(['BANK_ACCOUNT', '1000', '1234567890', 'SBIN0001234', 'John Doe', 'Salary']);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transaction_example.xlsx');
    await workbook.xlsx.write(res);
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
