// ============================================
// Reports Routes - Professional PDF + Excel
// ============================================
const router = require('express').Router();
const prisma = require('../config/database');
const { auth } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

router.use(auth);

// ─── Helper: Draw table row ───
function drawTableRow(doc, y, cols, data, opts = {}) {
  const { bold, bg, textColor, fontSize = 8 } = opts;
  if (bg) {
    doc.rect(cols[0].x - 5, y - 3, 515, 18).fill(bg);
  }
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(textColor || '#1c1c1e');
  cols.forEach((col, i) => {
    const text = data[i]?.toString() || '-';
    doc.text(text, col.x, y, { width: col.w, align: col.align || 'left' });
  });
  return y + 18;
}

// ─── Helper: Draw horizontal line ───
function drawLine(doc, y) {
  doc.moveTo(45, y).lineTo(560, y).strokeColor('#e5e5ea').lineWidth(0.5).stroke();
  return y + 5;
}

// ─── Daily Report Data ───
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Dates required.' });

    const dateFilter = { createdAt: { gte: new Date(startDate), lte: new Date(endDate + 'T23:59:59.999Z') } };
    let txWhere = { ...dateFilter, status: 'CLEARED' };

    if (user.role === 'MERCHANT') txWhere.merchantId = user.merchantId;
    else if (user.role === 'SUB_MERCHANT') txWhere.subMerchantId = user.subMerchantId;
    else if (user.role === 'AGENT') txWhere.agentId = user.agentId;
    else if (user.role === 'OPERATOR') txWhere.operatorId = user.operatorId;
    else if (user.role === 'ADMIN') txWhere.merchant = { adminId: user.adminId };

    const [payOut, commission] = await Promise.all([
      prisma.transaction.aggregate({ where: txWhere, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: txWhere, _sum: { merchantCommission: true, agentCommission: true, operatorCommission: true, adminCommission: true } }),
    ]);

    let totalCommission = 0;
    if (user.role === 'MERCHANT') totalCommission = commission._sum.merchantCommission || 0;
    else if (user.role === 'AGENT') totalCommission = commission._sum.agentCommission || 0;
    else if (user.role === 'OPERATOR') totalCommission = commission._sum.operatorCommission || 0;
    else if (user.role === 'ADMIN') totalCommission = commission._sum.adminCommission || 0;

    res.json({ success: true, data: { totalPayOut: payOut._sum.amount || 0, totalCommission, amountByCurrency: null, startDate, endDate } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Professional PDF Report ───
router.get('/daily/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

    let txWhere = { status: 'CLEARED', createdAt: { gte: new Date(startDate), lte: new Date(endDate + 'T23:59:59.999Z') } };
    if (user.role === 'MERCHANT') txWhere.merchantId = user.merchantId;
    else if (user.role === 'AGENT') txWhere.agentId = user.agentId;
    else if (user.role === 'OPERATOR') txWhere.operatorId = user.operatorId;
    else if (user.role === 'ADMIN') txWhere.merchant = { adminId: user.adminId };

    const transactions = await prisma.transaction.findMany({
      where: txWhere, orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { name: true } }, agent: { select: { name: true } }, operator: { select: { name: true } } }
    });

    const totalPayOut = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalCommission = transactions.reduce((s, t) => {
      if (user.role === 'MERCHANT') return s + parseFloat(t.merchantCommission || 0);
      if (user.role === 'AGENT') return s + parseFloat(t.agentCommission || 0);
      if (user.role === 'OPERATOR') return s + parseFloat(t.operatorCommission || 0);
      if (user.role === 'ADMIN') return s + parseFloat(t.adminCommission || 0);
      return s;
    }, 0);

    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=report-${startDate}-to-${endDate}.pdf`);
    doc.pipe(res);

    // ─── Header Banner ───
    doc.rect(0, 0, 612, 80).fill('#1a1a2e');
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('SS PAY', 45, 20);
    doc.fontSize(9).font('Helvetica').fillColor('#aeaeb2').text('Secure Payment Processing Platform', 45, 48);
    doc.fontSize(9).fillColor('#ffffff').text(`Daily Report`, 400, 20, { align: 'right', width: 160 });
    doc.fontSize(8).fillColor('#aeaeb2').text(`${startDate} to ${endDate}`, 400, 35, { align: 'right', width: 160 });
    doc.fontSize(8).fillColor('#aeaeb2').text(`Generated: ${new Date().toISOString().split('T')[0]}`, 400, 48, { align: 'right', width: 160 });

    // ─── Summary Cards ───
    let y = 100;
    
    // Card 1 - Total Pay Out
    doc.roundedRect(45, y, 160, 55, 6).fill('#f0fdf4');
    doc.fontSize(8).font('Helvetica').fillColor('#166534').text('Total Pay Out', 55, y + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#166534').text(`₹${totalPayOut.toLocaleString()}`, 55, y + 25);

    // Card 2 - Total Commission
    doc.roundedRect(220, y, 160, 55, 6).fill('#eff6ff');
    doc.fontSize(8).font('Helvetica').fillColor('#1e40af').text('Total Commission', 230, y + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e40af').text(`₹${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 230, y + 25);

    // Card 3 - Transactions
    doc.roundedRect(395, y, 160, 55, 6).fill('#fef3c7');
    doc.fontSize(8).font('Helvetica').fillColor('#92400e').text('Total Transactions', 405, y + 10);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#92400e').text(`${transactions.length}`, 405, y + 25);

    // ─── Info Row ───
    y = 175;
    doc.fontSize(8).font('Helvetica').fillColor('#636366');
    doc.text(`Role: ${user.role.replace(/_/g, ' ')}`, 45, y);
    doc.text(`User: ${user.name}`, 200, y);
    doc.text(`Period: ${startDate} to ${endDate}`, 380, y);

    // ─── Table ───
    y = 200;
    y = drawLine(doc, y);

    const cols = [
      { x: 45, w: 30, align: 'left' },    // ID
      { x: 75, w: 60, align: 'right' },    // Amount
      { x: 140, w: 55, align: 'left' },    // Type
      { x: 200, w: 80, align: 'left' },    // UTR
      { x: 285, w: 70, align: 'left' },    // Merchant
      { x: 360, w: 50, align: 'left' },    // Agent
      { x: 415, w: 55, align: 'left' },    // Remark
      { x: 475, w: 80, align: 'left' },    // Date
    ];

    // Table header
    y = drawTableRow(doc, y, cols, ['ID', 'Amount', 'Type', 'UTR Number', 'Merchant', 'Agent', 'Remark', 'Date'], { bold: true, bg: '#f5f5f4', fontSize: 7 });
    y = drawLine(doc, y);

    // Table rows
    transactions.forEach((tx, i) => {
      if (y > 750) { doc.addPage(); y = 50; }
      y = drawTableRow(doc, y, cols, [
        tx.id.toString(),
        `₹${parseFloat(tx.amount).toLocaleString()}`,
        tx.transactionType,
        tx.utrNumber || '-',
        tx.merchant?.name || '-',
        tx.agent?.name || '-',
        tx.notes || '-',
        tx.createdAt.toISOString().split('T')[0],
      ], { bg: i % 2 === 0 ? null : '#fafafa', fontSize: 7 });
    });

    y = drawLine(doc, y + 5);

    // Total row
    y = drawTableRow(doc, y, cols, [
      '', `₹${totalPayOut.toLocaleString()}`, '', '', '', '', '', `${transactions.length} txns`
    ], { bold: true, bg: '#e0e9ff', fontSize: 8 });

    // ─── Footer ───
    const pageHeight = 841;
    doc.rect(0, pageHeight - 40, 612, 40).fill('#f5f5f4');
    doc.fontSize(7).font('Helvetica').fillColor('#aeaeb2');
    doc.text('This is a system-generated report. © 2026 SS PAY', 45, pageHeight - 28);
    doc.text(`Page 1`, 500, pageHeight - 28, { align: 'right', width: 60 });

    doc.end();
  } catch (error) { console.error('PDF error:', error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── Professional Receipt PDF ───
router.get('/receipt/:transactionId', async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: parseInt(req.params.transactionId) },
      include: { merchant: { select: { name: true } }, agent: { select: { name: true } }, operator: { select: { name: true } } }
    });
    if (!tx || tx.status !== 'CLEARED') return res.status(404).json({ success: false, message: 'Not found.' });

    const doc = new PDFDocument({ margin: 0, size: [400, 620] });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt-${tx.id}.pdf`);
    doc.pipe(res);

    const W = 400;
    const amt = parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    // ─── White background ───
    doc.rect(0, 0, W, 620).fill('#ffffff');

    // ─── Top green circle with checkmark ───
    const circleX = W / 2;
    const circleY = 70;
    const circleR = 38;
    doc.circle(circleX, circleY, circleR + 10).fill('#e6faf5');
    doc.circle(circleX, circleY, circleR).fill('#00c896');
    doc.moveTo(circleX - 14, circleY + 2)
      .lineTo(circleX - 4, circleY + 13)
      .lineTo(circleX + 16, circleY - 10)
      .strokeColor('#ffffff')
      .lineWidth(4)
      .lineJoin('round')
      .lineCap('round')
      .stroke();

    // ─── Title ───
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1c1c1e')
      .text('Payment Successful', 0, 125, { align: 'center', width: W });
    doc.fontSize(10).font('Helvetica').fillColor('#8e8e93')
      .text(`Successfully Paid INR ${amt}`, 0, 147, { align: 'center', width: W });

    // ─── DETAILS label ───
    let y = 190;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1c1c1e')
      .text('DETAILS', 40, y);
    y += 22;

    // ─── Detail rows ───
    const clearTime = tx.transactionClearTime ? new Date(tx.transactionClearTime) : null;
    const dateTimeStr = clearTime
      ? clearTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
        '  ' +
        clearTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '-';

    const details = [
      ['Transaction ID', tx.id.toString()],
      ['Date & Time',    dateTimeStr],
      ['Type',           tx.transactionType === 'UPI' ? 'UPI Payment' : 'Bank Transfer'],
      ['UPI / Account',  tx.upiId || tx.accountNumber || '-'],
      ['IFSC',           tx.ifscCode || '-'],
      ['UTR Number',     tx.utrNumber || '-'],
      ['Remark',          'No Remark'],
      ['Total Amount',   `INR ${amt}`],
    ];

    details.forEach(([label, value]) => {
      doc.moveTo(40, y).lineTo(360, y)
        .strokeColor('#f0f0f0').lineWidth(0.8).stroke();
      y += 10;

      doc.fontSize(9).font('Helvetica').fillColor('#8e8e93')
        .text(label, 40, y);
      doc.fontSize(9)
        .font(label === 'Total Amount' ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(label === 'Total Amount' ? '#1c1c1e' : '#3a3a3c')
        .text(value, 200, y, { width: 160, align: 'right' });

      y += 22;
    });

    // ─── Bottom separator ───
    doc.moveTo(40, y).lineTo(360, y)
      .strokeColor('#f0f0f0').lineWidth(0.8).stroke();
    y += 20;

    // ─── Footer ───
    doc.fontSize(7).font('Helvetica').fillColor('#c7c7cc')
      .text('This is a system-generated receipt.', 0, y, { align: 'center', width: W });
    doc.fontSize(7).fillColor('#c7c7cc')
      .text('© 2026 SS PAY - Secure Payment Processing', 0, y + 12, { align: 'center', width: W });

    doc.end();
  } catch (error) {
    console.error('Receipt error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Excel Export (Professional styled) ───
router.get('/export/transactions', async (req, res) => {
  try {
    const { startDate, endDate, status, merchantId, agentId, operatorId } = req.query;
    const user = req.user;
    const where = {};
    if (status) where.status = status;
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z'); }

    if (user.role === 'MERCHANT') where.merchantId = user.merchantId;
    else if (user.role === 'SUB_MERCHANT') where.subMerchantId = user.subMerchantId;
    else if (user.role === 'AGENT') where.agentId = user.agentId;
    else if (user.role === 'OPERATOR') where.operatorId = user.operatorId;
    else if (user.role === 'ADMIN') {
      where.merchant = { adminId: user.adminId };
      if (merchantId) where.merchantId = parseInt(merchantId);
      if (agentId) where.agentId = parseInt(agentId);
      if (operatorId) where.operatorId = parseInt(operatorId);
    }

    const transactions = await prisma.transaction.findMany({
      where, include: { merchant: { select: { name: true } }, agent: { select: { name: true } }, operator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SS PAY';
    const sheet = workbook.addWorksheet('Transactions', {
      headerFooter: { firstHeader: 'SS PAY - Transaction Report' }
    });

    // Title row
    sheet.mergeCells('A1:Q1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SS PAY - Transaction Report';
    titleCell.font = { size: 14, bold: true, color: { argb: 'FF1a1a2e' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:Q2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Generated: ${new Date().toISOString().split('T')[0]} | Role: ${user.role.replace(/_/g, ' ')} | User: ${user.name}`;
    dateCell.font = { size: 9, color: { argb: 'FF636366' } };
    dateCell.alignment = { horizontal: 'center' };

    // Headers at row 4
    const headers = ['ID', 'Amount', 'Type', 'UTR Number', 'Bank', 'IFSC', 'Account No.', 'Holder Name', 'UPI ID', 'Merchant', 'Agent', 'Operator', 'Remark', 'Reject Reason', 'Status', 'Created', 'Cleared'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFe5e5ea' } } };
    });
    headerRow.height = 25;

    // Column widths
    [8, 14, 12, 18, 12, 14, 18, 18, 22, 15, 12, 12, 15, 18, 10, 20, 20].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // Data rows
    transactions.forEach((tx, i) => {
      const row = sheet.getRow(5 + i);
      const values = [
        tx.id, parseFloat(tx.amount), tx.transactionType, tx.utrNumber || '',
        tx.bankName || '', tx.ifscCode || '', tx.accountNumber || '', tx.accountHolderName || '',
        tx.upiId || '', tx.merchant?.name || '', tx.agent?.name || '', tx.operator?.name || '',
        'No Remark', tx.rejectReason || '', tx.status,
        tx.createdAt?.toISOString().replace('T', ' ').substring(0, 19) || '',
        tx.transactionClearTime?.toISOString().replace('T', ' ').substring(0, 19) || '',
      ];
      values.forEach((v, j) => {
        const cell = row.getCell(j + 1);
        cell.value = v;
        cell.font = { size: 9 };
        cell.alignment = { vertical: 'middle' };
        if (i % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });

      // Color status
      const statusCell = row.getCell(15);
      if (tx.status === 'CLEARED') statusCell.font = { size: 9, bold: true, color: { argb: 'FF166534' } };
      else if (tx.status === 'REJECTED') statusCell.font = { size: 9, bold: true, color: { argb: 'FFDC2626' } };
      else if (tx.status === 'PENDING') statusCell.font = { size: 9, bold: true, color: { argb: 'FFD97706' } };

      // Format amount
      row.getCell(2).numFmt = '₹#,##0.00';
    });

    // Summary row
    const sumRow = sheet.getRow(5 + transactions.length + 1);
    sumRow.getCell(1).value = 'TOTAL';
    sumRow.getCell(1).font = { bold: true, size: 10 };
    sumRow.getCell(2).value = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);
    sumRow.getCell(2).numFmt = '₹#,##0.00';
    sumRow.getCell(2).font = { bold: true, size: 10 };
    sumRow.getCell(15).value = `${transactions.length} transactions`;
    sumRow.getCell(15).font = { bold: true, size: 9 };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=SSPAY-Transactions-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
  } catch (error) { console.error('Export:', error); res.status(500).json({ success: false, message: 'Export failed.' }); }
});

module.exports = router;