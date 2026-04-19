const router = require("express").Router();
const prisma = require("../config/database");
const { auth, roleCheck } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "uploads/payment-proof",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });
router.use(auth, roleCheck("OPERATOR"));

router.get("/dashboard", async (req, res) => {
  try {
    const operatorId = req.user.operatorId;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const txWhere = {
      operatorId,
      ...(startDate || endDate ? { createdAt: dateFilter } : {}),
    };

    const [operator, transferAgg, pendingAgg, paymentLunga] = await Promise.all(
      [
        prisma.operator.findUnique({
          where: { id: operatorId },
          include: { agent: { select: { id: true } } },
        }),
        prisma.transaction.aggregate({
          where: { ...txWhere, status: "CLEARED" },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.transaction.aggregate({
          where: { ...txWhere, status: { in: ["PENDING", "PICKED", "PAID"] } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.transaction.aggregate({
          where: { ...txWhere, status: "CLEARED" },
          _sum: { amount: true },
        }),
      ],
    );

    let aedLunga = 0,
      usdtLunga = 0,
      availableLimit = 0;

    if (operator?.agent?.id) {
      const assigned = await prisma.merchantAgent.findMany({
        where: { agentId: operator.agent.id },
        include: { merchant: { select: { id: true, isActive: true } } },
      });

      const assignedMerchantIds = assigned
        .filter((ma) => ma.merchant.isActive)
        .map((ma) => ma.merchantId);

      const pendingAvailable = await prisma.transaction.aggregate({
        where: { status: "PENDING", merchantId: { in: assignedMerchantIds } },
        _sum: { amount: true },
      });
      availableLimit = parseFloat(pendingAvailable._sum.amount || 0);

      const agentMerchants = await prisma.merchantAgent.findMany({
        where: { agentId: operator.agent.id },
        select: { merchantId: true },
      });

      const rc = await prisma.rateConfig.findFirst({
        where: {
          OR: [
            { agentId: operator.agent.id },
            { merchantId: { in: agentMerchants.map((m) => m.merchantId) } },
          ],
          isActive: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (rc) {
        const tc = parseFloat(paymentLunga._sum.amount || 0);
        const aR = parseFloat(rc.aedTodayRate || 0);
        const uR = parseFloat(rc.usdtTodayRate || 0);
        aedLunga = aR > 0 ? tc / aR : 0;
        usdtLunga = uR > 0 ? tc / uR : 0;
      }
    }

    const totalAmount = parseFloat(paymentLunga._sum.amount || 0);
    const commissionPercent = parseFloat(
      operator?.commissionChargePercent || 0,
    );
    const agentCommissionAmount = (totalAmount * commissionPercent) / 100;
    const totalPaymentLunga = totalAmount - agentCommissionAmount;
    res.json({
      success: true,
      data: {
        totalTransferAmount: transferAgg._sum.amount || 0,
        totalTransferCount: transferAgg._count || 0,
        totalPendingAmount: pendingAgg._sum.amount || 0,
        totalPendingCount: pendingAgg._count || 0,
        agentCommissionAmount,
        totalPaymentLunga,
        totalAedLunga: aedLunga,
        totalUsdtLunga: usdtLunga,
        availableLimit,
        availableDetails: {
          maxTransaction: operator?.maxTransactionAmount || 0,
          minTransaction: operator?.minTransactionAmount || 0,
          transactionPicked: operator?.transactionPicked || 0,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { operatorId: req.user.operatorId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (search) {
      where.OR = [
        { utrNumber: { contains: search, mode: "insensitive" } },
        { upiId: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ success: true, data, total });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/transactions/:id/pick", async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const operatorId = req.user.operatorId;
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
    });
    const tx = await prisma.transaction.findFirst({
      where: { id: txId, status: "PENDING" },
    });
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Not found or processed." });
    await prisma.$transaction(async (pc) => {
      await pc.transaction.update({
        where: { id: txId },
        data: {
          status: "PICKED",
          operatorId,
          agentId: operator.agentId,
          operatorPickTime: new Date(),
        },
      });
      await pc.operator.update({
        where: { id: operatorId },
        data: { transactionPicked: { increment: 1 } },
      });
    });
    res.json({ success: true, message: "Picked." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/transactions/:id/pay", async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: {
        id: parseInt(req.params.id),
        operatorId: req.user.operatorId,
        status: "PICKED",
      },
    });
    if (!tx)
      return res
        .status(400)
        .json({ success: false, message: "Not found or not picked." });
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: "PAID" },
    });
    res.json({ success: true, message: "Marked PAID." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post(
  "/transactions/:id/clear",
  upload.single("proof"),
  async (req, res) => {
    try {
      const txId = parseInt(req.params.id);
      const { utrNumber } = req.body;
      if (!utrNumber)
        return res
          .status(400)
          .json({ success: false, message: "UTR required." });
      const tx = await prisma.transaction.findFirst({
        where: { id: txId, operatorId: req.user.operatorId, status: "PAID" },
        include: {
          merchant: { select: { commissionChargePercent: true } },
          operator: {
            select: { commissionChargePercent: true, agentId: true },
          },
        },
      });
      if (!tx)
        return res
          .status(400)
          .json({ success: false, message: "Not found or not PAID." });
      const agent = await prisma.agent.findUnique({
        where: { id: tx.operator.agentId },
      });
      const amt = parseFloat(tx.amount);
      const aC = (amt * parseFloat(agent?.commissionChargePercent || 0)) / 100;
      const oC = (amt * parseFloat(tx.operator.commissionChargePercent)) / 100;
      const adC = aC;
      const mC = 0;

      // Fetch rate active for this merchant at clear time
      const rateAtClear = await prisma.rateConfig.findFirst({
        where: { merchantId: tx.merchantId, agentId: null },
        orderBy: { updatedAt: "desc" },
      });
      const aedRate = parseFloat(rateAtClear?.aedTodayRate || 0) || null;
      const usdtRate = parseFloat(rateAtClear?.usdtTodayRate || 0) || null;

      await prisma.$transaction(async (pc) => {
        await pc.transaction.update({
          where: { id: txId },
          data: {
            status: "CLEARED",
            utrNumber,
            proofImage: req.file ? req.file.filename : null,
            transactionClearTime: new Date(),
            merchantCommission: mC,
            agentCommission: aC,
            operatorCommission: oC,
            adminCommission: adC > 0 ? adC : 0,
            aedRate,
            usdtRate,
          },
        });
        await pc.operator.update({
          where: { id: req.user.operatorId },
          data: { transactionPicked: { decrement: 1 } },
        });
      });
      res.json({ success: true, message: "Cleared." });
    } catch (error) {
      console.error("Clear:", error);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

// ─── Reject with REASON ───
router.post("/transactions/:id/reject", async (req, res) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: {
        id: parseInt(req.params.id),
        operatorId: req.user.operatorId,
        status: { in: ["PICKED", "PAID"] },
      },
    });
    if (!tx)
      return res.status(400).json({ success: false, message: "Not found." });
    const { reason } = req.body;
    await prisma.$transaction(async (pc) => {
      await pc.transaction.update({
        where: { id: tx.id },
        data: {
          status: "REJECTED",
          rejectReason: reason || null,
          transactionClearTime: new Date(),
        },
      });
      await pc.merchant.update({
        where: { id: tx.merchantId },
        data: { usedLimit: { decrement: parseFloat(tx.amount) } },
      });
      await pc.operator.update({
        where: { id: req.user.operatorId },
        data: { transactionPicked: { decrement: 1 } },
      });
    });
    res.json({ success: true, message: "Rejected." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/pending-transactions", async (req, res) => {
  try {
    const { amount } = req.query;
    const budget = parseFloat(amount);

    if (!budget || budget <= 0) {
      return res.json({ success: true, data: [] });
    }

    const op = await prisma.operator.findUnique({
      where: { id: req.user.operatorId },
    });
    const ma = await prisma.merchantAgent.findMany({
      where: { agentId: op.agentId },
      select: { merchantId: true },
    });
    const mIds = ma.map((m) => m.merchantId);

    // Fetch all pending, smallest amount first, oldest as tiebreaker
    const all = await prisma.transaction.findMany({
      where: { status: "PENDING", merchantId: { in: mIds } },
      orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        amount: true,
        transactionType: true,
        createdAt: true,
        merchantId: true,
        // NO accountNumber, NO upiId, NO ifscCode, NO accountHolderName
      },
    });

    // Greedy fill within budget
    let running = 0;
    const result = [];
    for (const tx of all) {
      const txAmt = parseFloat(tx.amount);
      if (running + txAmt <= budget) {
        running += txAmt;
        result.push(tx);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Bulk Pick ───
router.post("/transactions/bulk-pick", async (req, res) => {
  try {
    const { transactionIds } = req.body;
    if (!transactionIds?.length)
      return res
        .status(400)
        .json({ success: false, message: "No transactions selected." });
    const operatorId = req.user.operatorId;
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
    });
    let picked = 0;
    for (const txId of transactionIds) {
      const tx = await prisma.transaction.findFirst({
        where: { id: parseInt(txId), status: "PENDING" },
      });
      if (!tx) continue;
      await prisma.$transaction(async (pc) => {
        await pc.transaction.update({
          where: { id: tx.id },
          data: {
            status: "PICKED",
            operatorId,
            agentId: operator.agentId,
            operatorPickTime: new Date(),
          },
        });
        await pc.operator.update({
          where: { id: operatorId },
          data: { transactionPicked: { increment: 1 } },
        });
      });
      picked++;
    }
    res.json({ success: true, message: `${picked} transactions picked.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Export Picked ───
router.get("/transactions/export-picked", async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const transactions = await prisma.transaction.findMany({
      where: {
        operatorId: req.user.operatorId,
        status: { in: ["PICKED", "PAID"] },
      },
      orderBy: { createdAt: "asc" },
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Picked Transactions");
    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Amount", key: "amount", width: 12 },
      { header: "Type", key: "type", width: 14 },
      { header: "UPI ID", key: "upiId", width: 25 },
      { header: "Account Number", key: "accountNumber", width: 20 },
      { header: "IFSC", key: "ifsc", width: 14 },
      { header: "Holder Name", key: "holderName", width: 20 },
      { header: "Remark", key: "remark", width: 15 },
      { header: "UTR Number", key: "utrNumber", width: 20 },
      { header: "Status", key: "status", width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E5EA" },
    };
    transactions.forEach((tx) => {
      sheet.addRow({
        id: tx.id,
        amount: parseFloat(tx.amount),
        type: tx.transactionType,
        upiId: tx.upiId || "",
        accountNumber: tx.accountNumber || "",
        ifsc: tx.ifscCode || "",
        holderName: tx.accountHolderName || "",
        remark: tx.notes || "",
        utrNumber: "",
        status: tx.status,
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=picked-transactions.xlsx",
    );
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Export:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── Bulk Clear ───
// ─── Bulk Clear — updated to match by accountNumber + amount ───
const bulkUpload = multer({ storage: multer.memoryStorage() });
router.post(
  "/transactions/bulk-clear",
  bulkUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "File required." });

      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];

      let cleared = 0, skipped = 0, errors = [];

      // Read header row to detect column positions dynamically
      const headerRow = sheet.getRow(1);
      const headers = {};
      headerRow.eachCell((cell, colIdx) => {
        if (cell.value) headers[cell.value.toString().trim().toLowerCase()] = colIdx;
      });

      // Support both SSpay export format (col by index) and XPay export format (col by name)
      const getCol = (row, name, fallbackIdx) => {
        const idx = headers[name.toLowerCase()];
        const val = idx ? row.getCell(idx).value : row.getCell(fallbackIdx).value;
        return val?.toString()?.trim() || '';
      };

      const rows = [];
      sheet.eachRow((row, idx) => {
        if (idx === 1) return; // skip header
        const idVal          = getCol(row, 'id', 1);
        const utrNumber      = getCol(row, 'utrnumber', 9);
        const accountNumber  = getCol(row, 'accountnumber', 5);
        const amountVal      = getCol(row, 'amount', 2);

        rows.push({
          idVal,
          utrNumber,
          accountNumber,
          amount: parseFloat(amountVal) || 0,
        });
      });

      for (const row of rows) {
        if (!row.utrNumber) {
          skipped++;
          continue;
        }

        let tx = null;

        // Strategy 1: match by SSpay integer id (original format)
        const numId = parseInt(row.idVal);
        if (!isNaN(numId) && numId > 0) {
          tx = await prisma.transaction.findFirst({
            where: {
              id: numId,
              operatorId: req.user.operatorId,
              status: { in: ["PICKED", "PAID"] },
            },
            include: {
              merchant: { select: { commissionChargePercent: true } },
              operator: { select: { commissionChargePercent: true, agentId: true } },
            },
          });
        }

        // Strategy 2: match by accountNumber + amount (XPay export format)
        if (!tx && row.accountNumber && row.amount > 0) {
          tx = await prisma.transaction.findFirst({
            where: {
              accountNumber: row.accountNumber,
              amount: row.amount,
              operatorId: req.user.operatorId,
              status: { in: ["PICKED", "PAID"] },
            },
            include: {
              merchant: { select: { commissionChargePercent: true } },
              operator: { select: { commissionChargePercent: true, agentId: true } },
            },
          });
        }

        // Strategy 3: match by accountNumber + amount without operatorId filter
        // (in case transaction was picked by different operator session)
        if (!tx && row.accountNumber && row.amount > 0) {
          tx = await prisma.transaction.findFirst({
            where: {
              accountNumber: row.accountNumber,
              amount: row.amount,
              status: { in: ["PICKED", "PAID"] },
            },
            include: {
              merchant: { select: { commissionChargePercent: true } },
              operator: { select: { commissionChargePercent: true, agentId: true } },
            },
          });
        }

        if (!tx) {
          skipped++;
          errors.push(`Row skipped — no matching PICKED/PAID transaction for account: ${row.accountNumber}, amount: ${row.amount}`);
          continue;
        }

        const agent = await prisma.agent.findUnique({
          where: { id: tx.operator.agentId },
        });
        const amt = parseFloat(tx.amount);
        const aC = (amt * parseFloat(agent?.commissionChargePercent || 0)) / 100;
        const oC = (amt * parseFloat(tx.operator.commissionChargePercent)) / 100;
        const adC = aC;
        const mC = 0;

        const rateAtClear = await prisma.rateConfig.findFirst({
          where: { merchantId: tx.merchantId, agentId: null },
          orderBy: { updatedAt: "desc" },
        });
        const aedRate  = parseFloat(rateAtClear?.aedTodayRate  || 0) || null;
        const usdtRate = parseFloat(rateAtClear?.usdtTodayRate || 0) || null;

        await prisma.$transaction(async (pc) => {
          await pc.transaction.update({
            where: { id: tx.id },
            data: {
              status: "CLEARED",
              utrNumber: row.utrNumber,
              transactionClearTime: new Date(),
              merchantCommission: mC,
              agentCommission: aC,
              operatorCommission: oC,
              adminCommission: adC > 0 ? adC : 0,
              aedRate,
              usdtRate,
            },
          });
          await pc.operator.update({
            where: { id: req.user.operatorId },
            data: { transactionPicked: { decrement: 1 } },
          });
        });
        cleared++;
      }

      res.json({
        success: true,
        message: `${cleared} cleared, ${skipped} skipped.`,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk clear:", error);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);
router.get("/ledger", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { operatorId: req.user.operatorId, status: "CLEARED" };
    if (startDate || endDate) {
      where.AND = [
        {
          OR: [
            {
              transactionClearTime: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate
                  ? { lte: new Date(endDate + "T23:59:59.999Z") }
                  : {}),
              },
            },
            {
              transactionClearTime: null,
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate
                  ? { lte: new Date(endDate + "T23:59:59.999Z") }
                  : {}),
              },
            },
          ],
        },
      ];
    }
    const data = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        accountHolderName: true,
        accountNumber: true,
        ifscCode: true,
        utrNumber: true,
        notes: true,
        transactionClearTime: true,
        createdAt: true,
        operatorCommission: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error("LEDGER ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
