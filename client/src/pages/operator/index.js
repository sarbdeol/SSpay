import React, { useState, useEffect, useRef } from "react";
import api from "../../utils/api";
import {
  StatCard,
  DataTable,
  PageHeader,
  Button,
  Modal,
  FormInput,
  StatusBadge,
} from "../../components/common";
import toast from "react-hot-toast";

// QR Code generator without external library
function QRCodeCanvas({ value, size = 180 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Dynamically load qrcode library via script tag approach
    // Use a simple QR API instead
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;

    // Use Google Charts QR API via Image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
      // Fallback: draw placeholder
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR Code", size / 2, size / 2);
    };
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

// Account Details Modal
function AccountDetailsModal({ transaction, onClose }) {
  if (!transaction) return null;

  const isUPI = transaction.transactionType === "UPI";
  const qrValue = isUPI
    ? `upi://pay?pa=${transaction.upiId}&pn=Payment&am=${transaction.amount}&cu=INR`
    : null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied!");
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-lg"
        >
          ×
        </button>

        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Account Details
        </h2>

        {isUPI ? (
          <div className="flex flex-col items-center gap-3">
            {/* UPI ID Row */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 font-medium">UPI ID:</span>
              <span className="font-semibold text-gray-800">
                {transaction.upiId}
              </span>
              <button
                onClick={() => handleCopy(transaction.upiId)}
                className="text-blue-500 hover:text-blue-600 ml-1"
                title="Copy UPI ID"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>

            {/* Amount */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">Amount</span>:{" "}
              <span className="font-semibold">
                {parseFloat(transaction.amount).toLocaleString()}
              </span>
            </div>

            {/* QR Code */}
            <div className="border rounded-xl overflow-hidden p-2 bg-white shadow-sm">
              <QRCodeCanvas value={qrValue} size={180} />
            </div>
          </div>
        ) : (
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium text-gray-500">Bank:</span>{" "}
              {transaction.bankName}
            </div>
            <div>
              <span className="font-medium text-gray-500">Account:</span>{" "}
              {transaction.accountNumber}
            </div>
            <div>
              <span className="font-medium text-gray-500">IFSC:</span>{" "}
              {transaction.ifscCode}
            </div>
            <div>
              <span className="font-medium text-gray-500">Holder:</span>{" "}
              {transaction.accountHolderName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OperatorDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/operator/dashboard").then((r) => setStats(r.data.data));
  }, []);

  return (
    <div>
      <PageHeader title="Operator Dashboard" />

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Transfer Amount"
          value={stats?.totalTransferAmount || 0}
          index={0}
        />
        <StatCard
          title="Total Pending Amount"
          value={stats?.totalPendingAmount || 0}
          index={1}
        />
        <StatCard
          title="Total Payment Lunga"
          value={stats?.totalPaymentLunga || 0}
          index={2}
        />
        <StatCard
          title="Pending Count"
          value={stats?.totalPendingCount || 0}
          prefix=""
          index={3}
        />
        <StatCard
          title="Cleared Count"
          value={stats?.totalTransferCount || 0}
          prefix=""
          index={4}
        />
        <StatCard
          title="Total AED Lunga"
          value={stats?.totalAedLunga || 0}
          prefix="AED "
          index={5}
        />
        <StatCard
          title="Total USDT Lunga"
          value={stats?.totalUsdtLunga || 0}
          prefix="USDT "
          index={0}
        />
        <StatCard
          title="Available Details"
          value={stats?.availableLimit || 0}
          index={6}
        />
        <StatCard
          title="Operator Commission Amount"
          value={stats?.operatorCommissionAmount || 0}
          index={1}
        />
      </div>
    </div>
  );
}

export function OperatorTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pending, setPending] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showPay, setShowPay] = useState(null);
  const [showUtr, setShowUtr] = useState(null);
  const [showAccountDetails, setShowAccountDetails] = useState(null);

  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkPick = async () => {
    if (!selectedIds.length) {
      toast.error("Select transactions first.");
      return;
    }
    try {
      const r = await api.post("/operator/transactions/bulk-pick", {
        transactionIds: selectedIds,
      });
      toast.success(r.data.message);
      setSelectedIds([]);
      setBulkMode(false);
      fetchData();
    } catch (e) {
      toast.error("Error.");
    }
  };

  const handleExportPicked = async () => {
    try {
      const r = await api.get("/operator/transactions/export-picked", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "picked-transactions.xlsx";
      a.click();
      toast.success("Exported! Fill UTR column and re-upload.");
    } catch (e) {
      toast.error("Export failed.");
    }
  };

  const handleBulkClear = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await api.post("/operator/transactions/bulk-clear", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(r.data.message);
      fetchData();
    } catch (err) {
      toast.error("Upload failed.");
    }
    e.target.value = "";
  };
  const fetchData = () => {
    setLoading(true);
    api.get(`/operator/transactions?page=${page}&limit=10`).then((r) => {
      setTransactions(r.data.data);
      setTotal(r.data.total);
      setLoading(false);
    });
    api.get("/operator/pending-transactions").then((r) => {
      setPending(r.data.data);
    });
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handlePick = async (id) => {
    try {
      await api.post(`/operator/transactions/${id}/pick`);
      toast.success("Transaction picked");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error picking transaction");
    }
  };

  const handlePay = async () => {
    try {
      await api.post(`/operator/transactions/${showPay.id}/pay`);
      toast.success("Payment marked as PAID");
      setShowPay(null);
      fetchData();
    } catch (e) {
      toast.error("Payment error");
    }
  };

  const handleClear = async () => {
    if (!utr) {
      toast.error("UTR required");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("utrNumber", utr);
      if (proof) formData.append("proof", proof);
      await api.post(`/operator/transactions/${showUtr.id}/clear`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Transaction cleared");
      setShowUtr(null);
      setUtr("");
      setProof(null);
      fetchData();
    } catch (e) {
      toast.error("Error clearing transaction");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter reject reason:");
    try {
      await api.post(`/operator/transactions/${id}/reject`, { reason });
      toast.success("Transaction rejected");
      fetchData();
    } catch (e) {
      toast.error("Error rejecting transaction");
    }
  };

  return (
    <div>
      {/* Pending Transactions */}
      {pending.length > 0 && (
        <div className="mb-6">
          <PageHeader
            title="Available Transactions"
            subtitle="Pick a transaction to process"
          />
          <DataTable
            columns={[
              { header: "", render: (r) => (
                <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-500" />
              )},
              { header: "ID", key: "id" },
              { header: "Amount", render: (r) => `₹${parseFloat(r.amount).toLocaleString()}` },
              { header: "Type", key: "transactionType" },
              { header: "UPI ID", render: (r) => r.upiId || "-" },
              { header: "Account", render: (r) => r.accountNumber || "-" },
              { header: "Created", render: (r) => new Date(r.createdAt).toLocaleString() },
            ]}
            data={pending}
            total={pending.length}
            page={1}
            actions={(r) => (
              <Button onClick={() => handlePick(r.id)} variant="primary" className="h-8 px-3 text-xs">Pick</Button>
            )}
          />
          {selectedIds.length > 0 && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <span className="text-sm text-blue-700 font-medium">{selectedIds.length} selected</span>
              <Button onClick={handleBulkPick} variant="primary" className="h-8 px-3 text-xs">Bulk Pick Selected</Button>
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      {/* Transactions List */}
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Transactions List" />
        <div className="flex gap-2">
          <Button onClick={handleExportPicked} variant="primary" className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700">
            Export Picked 📥
          </Button>
          <label className="h-9 px-3 bg-brand-500 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center cursor-pointer hover:bg-brand-600 transition-mac">
            Upload Cleared 📤
            <input type="file" accept=".xlsx,.xls" onChange={handleBulkClear} className="hidden" />
          </label>
        </div>
      </div>

      <DataTable
        columns={[
          { header: "ID", key: "id" },
          {
            header: "Amount",
            render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "UTR Number", render: (r) => r.utrNumber || "-" },
          { header: "Notes", render: (r) => r.notes || "-" },
          {
            header: "Created",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            header: "Cleared/Rejected",
            render: (r) =>
              r.transactionClearTime
                ? new Date(r.transactionClearTime).toLocaleString()
                : "-",
          },
          {
            header: "Transaction Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            header: "View",
            render: (r) => (
              <button
                onClick={() => setShowAccountDetails(r)}
                className="text-blue-500 text-xs underline hover:text-blue-700"
              >
                Account Details
              </button>
            ),
          },
        ]}
        data={transactions}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        actions={(r) => (
          <div className="flex gap-1">
            {r.status === "PICKED" && (
              <Button
                onClick={() => setShowPay(r)}
                variant="primary"
                className="h-7 px-2 text-xs"
              >
                Pay
              </Button>
            )}
            {r.status === "PAID" && (
              <>
                <Button
                  onClick={() => setShowUtr(r)}
                  variant="primary"
                  className="h-7 px-2 text-xs"
                >
                  Submit UTR
                </Button>
                <Button
                  onClick={() => handleReject(r.id)}
                  variant="danger"
                  className="h-7 px-2 text-xs"
                >
                  Reject
                </Button>
              </>
            )}
            {r.status === "CLEARED" && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await api.get(`/reports/receipt/${r.id}`, { responseType: 'json' });
                      // If your receipt endpoint returns PDF, we'll build an image instead
                    } catch (e) {}
                  }}
                  className="text-emerald-600 text-sm font-medium py-2 px-3 min-h-[40px] bg-emerald-50 rounded-lg hover:bg-emerald-100 inline-flex items-center"
                >
                  Receipt
                </button>
              </div>
            )}
          </div>
        )}
      />

      {/* Account Details Modal */}
      {showAccountDetails && (
        <AccountDetailsModal
          transaction={showAccountDetails}
          onClose={() => setShowAccountDetails(null)}
        />
      )}

      {/* PAY MODAL */}
      <Modal
        open={!!showPay}
        onClose={() => setShowPay(null)}
        title="Make Payment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Transaction #{showPay?.id} — ₹
            {showPay && parseFloat(showPay.amount).toLocaleString()}
          </p>
          {showPay?.transactionType === "UPI" && (
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-sm text-gray-600 mb-2">Scan to Pay</p>
              <div className="flex justify-center mb-3">
                <QRCodeCanvas
                  value={`upi://pay?pa=${showPay.upiId}&pn=Payment&am=${showPay.amount}&cu=INR`}
                  size={180}
                />
              </div>
              <p className="text-sm font-semibold">{showPay.upiId}</p>
              <p className="text-sm text-gray-500">
                Amount: ₹{parseFloat(showPay.amount).toLocaleString()}
              </p>
            </div>
          )}
          {showPay?.transactionType === "BANK_ACCOUNT" && (
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p>
                <b>Bank:</b> {showPay.bankName}
              </p>
              <p>
                <b>Account:</b> {showPay.accountNumber}
              </p>
              <p>
                <b>IFSC:</b> {showPay.ifscCode}
              </p>
              <p>
                <b>Holder:</b> {showPay.accountHolderName}
              </p>
            </div>
          )}
          <Button onClick={handlePay} className="w-full">
            Mark as Paid
          </Button>
        </div>
      </Modal>

      {/* UTR MODAL */}
      <Modal
        open={!!showUtr}
        onClose={() => setShowUtr(null)}
        title="Submit Payment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Transaction #{showUtr?.id} — ₹
            {showUtr && parseFloat(showUtr.amount).toLocaleString()}
          </p>
          <FormInput
            label="UTR Number"
            required
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="Enter UTR Number"
          />
          <div>
            <label className="text-sm text-gray-700">
              Upload Payment Proof
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProof(e.target.files[0])}
              className="mt-1 block w-full text-sm"
            />
          </div>
          <Button onClick={handleClear} className="w-full">
            Submit Payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
