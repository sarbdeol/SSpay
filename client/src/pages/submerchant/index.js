import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import api from "../../utils/api";
import {
  StatCard,
  DataTable,
  PageHeader,
  Button,
  Modal,
  FormInput,
  FormSelect,
  StatusBadge,
} from "../../components/common";
import toast from "react-hot-toast";
function ReceiptImageModal({ transaction, onClose }) {
  const receiptRef = useRef(null);
  if (!transaction) return null;

  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${transaction.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Image saved!');
    } catch (e) { toast.error('Save failed.'); }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `receipt-${transaction.id}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Receipt #${transaction.id}` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${transaction.id}.png`;
          a.click();
          toast.success('Image saved! Share from gallery.');
        }
      }, 'image/png');
    } catch (e) { toast.error('Share failed.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div ref={receiptRef}>
          <div style={{ background: '#1a1a2e', padding: '20px 24px', borderRadius: '16px 16px 0 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>INDU PAY</div>
                <div style={{ color: '#aeaeb2', fontSize: '12px', marginTop: '2px' }}>Payment Receipt</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontSize: '13px' }}>#{transaction.id}</div>
                <div style={{ color: '#34d399', fontSize: '11px', fontWeight: 'bold' }}>{transaction.status}</div>
              </div>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', padding: '16px 24px', textAlign: 'center' }}>
            <div style={{ color: '#166534', fontSize: '12px' }}>Amount</div>
            <div style={{ color: '#166534', fontSize: '28px', fontWeight: 'bold' }}>₹{parseFloat(transaction.amount).toLocaleString()}</div>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {[
              ['Type', transaction.transactionType],
              ['UPI ID', transaction.upiId || '-'],
              ['Account', transaction.accountNumber || '-'],
              ['IFSC', transaction.ifscCode || '-'],
              ['Holder', transaction.accountHolderName || '-'],
              ['UTR Number', transaction.utrNumber || '-'],
              ['Remark', transaction.notes || '-'],
              ['Created', new Date(transaction.createdAt).toLocaleString()],
              ['Cleared', transaction.transactionClearTime ? new Date(transaction.transactionClearTime).toLocaleString() : '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '12px' }}>
                <span style={{ color: '#9ca3af' }}>{label}</span>
                <span style={{ color: '#1f2937', fontWeight: '600', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 24px 20px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ color: '#aeaeb2', fontSize: '10px' }}>System generated receipt</div>
            <div style={{ color: '#aeaeb2', fontSize: '10px' }}>© 2026 INDU PAY</div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={handleSaveImage} className="flex-1 h-11 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600">Save Image</button>
          <button onClick={handleShare} className="flex-1 h-11 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600">Share</button>
          <button onClick={onClose} className="h-11 px-4 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}
export function SubMerchantDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/submerchant/dashboard").then((r) => setStats(r.data.data));
  }, []);
  return (
    <div>
      <PageHeader title="Sub-Merchant Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total RTGS" value={stats?.totalRtgs || 0} index={0} />
        <StatCard
          title="Pending Details"
          value={stats?.pendingCount || 0}
          prefix=""
          index={1}
        />
        <StatCard
          title="Pending Amount"
          value={stats?.pendingAmount || 0}
          index={2}
        />
        <StatCard
          title="Total Pay Out Transactions"
          value={stats?.totalPayOutTransactions || 0}
          prefix=""
          index={3}
        />
        <StatCard
          title="Total Payment Dena"
          value={stats?.totalPaymentDena || 0}
          index={4}
        />
      </div>
    </div>
  );
}

export function SubMerchantLedger() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/submerchant/ledger").then((r) => setItems(r.data.data));
  }, []);
  return (
    <div>
      <PageHeader title="All Ledger" />
      <DataTable
        columns={[
          { header: "Type", key: "entryType" },
          {
            header: "Amount",
            render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "Description", render: (r) => r.description || "-" },
          {
            header: "Balance",
            render: (r) => `₹${parseFloat(r.balanceAfter).toLocaleString()}`,
          },
          {
            header: "Date",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        data={items}
        total={items.length}
        page={1}
      />
    </div>
  );
}

export function SubMerchantTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [remarkFilter, setRemarkFilter] = useState("");
  const [form, setForm] = useState({
    transactionType: "UPI",
    amount: "",
    upiId: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    notes: "",
  });

  const fetchData = () => {
    const params = new URLSearchParams({ page, limit: 10 });
    if (remarkFilter) params.append("remark", remarkFilter);
    api.get(`/submerchant/transactions?${params}`).then((r) => {
      setTransactions(r.data.data);
      setTotal(r.data.total);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [page, remarkFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/submerchant/transactions", form);
      toast.success("Transaction created!");
      setShowCreate(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleExport = async () => {
    const r = await api.get("/reports/export/transactions", {
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.xlsx";
    a.click();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await api.post("/submerchant/transactions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(r.data.message);
      fetchData();
    } catch (err) {
      toast.error("Upload failed.");
    }
  };

  const handleExample = async () => {
    try {
      const r = await api.get("/submerchant/transactions/example", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "transaction-example.xlsx";
      a.click();
    } catch (e) {
      toast.error("Download failed.");
    }
  };
  return (
    <div>
      <PageHeader
        title="Transactions List"
        action={
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Export 📥
            </Button>
            <label className="h-11 px-5 bg-brand-500 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center cursor-pointer hover:bg-brand-600 transition-mac">
              Upload 📤{" "}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
            <Button onClick={handleExample} variant="outline">
              Example 📄
            </Button>
            <Button onClick={() => setShowCreate(true)}>Create</Button>
          </div>
        }
      />

      {/* Remark Filter */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by remark..."
          value={remarkFilter}
          onChange={(e) => {
            setRemarkFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {remarkFilter && (
          <button
            onClick={() => {
              setRemarkFilter("");
              setPage(1);
            }}
            className="text-sm text-red-400 hover:text-red-600"
          >
            ✕ Clear
          </button>
        )}
      </div>

      <DataTable
        columns={[
          { header: "ID", key: "id" },
          {
            header: "Amount",
            render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "UTR", render: (r) => r.utrNumber || "-" },
          { header: "UPI ID", render: (r) => r.upiId || "-" },
          { header: "Bank", render: (r) => r.bankName || "-" },
          { header: "IFSC", render: (r) => r.ifscCode || "-" },
          { header: "Holder", render: (r) => r.accountHolderName || "-" },
          { header: "Remark", render: (r) => r.notes || "-" }, // ✅ show remark
          {
            header: "Created",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
        ]}
        data={transactions}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        actions={(r) =>
          r.status === "CLEARED" && (
            <button
              onClick={() => setShowReceipt(r)}
              className="text-emerald-600 text-sm font-medium py-2 px-3 min-h-[40px] bg-emerald-50 rounded-lg hover:bg-emerald-100 inline-flex items-center"
            >
              Receipt
            </button>
          )
        }
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Merchant Transaction Form"
      >
        <form onSubmit={handleCreate}>
          <FormSelect
            label="Select Transaction Type"
            options={[
              { value: "UPI", label: "UPI" },
              { value: "BANK_ACCOUNT", label: "Bank Account" },
            ]}
            value={form.transactionType}
            onChange={(e) =>
              setForm({ ...form, transactionType: e.target.value })
            }
          />
          {form.transactionType === "UPI" ? (
            <FormInput
              label="UPI Id"
              required
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
            />
          ) : (
            <>
              <FormInput
                label="Account Number"
                required
                value={form.accountNumber}
                onChange={(e) =>
                  setForm({ ...form, accountNumber: e.target.value })
                }
              />
              <FormInput
                label="IFSC Code"
                required
                value={form.ifscCode}
                onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
              />
              <FormInput
                label="Account Holder Name"
                required
                value={form.accountHolderName}
                onChange={(e) =>
                  setForm({ ...form, accountHolderName: e.target.value })
                }
              />
            </>
          )}
          <FormInput
            label="Amount"
            required
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          {/* ✅ Remark field */}
          <FormInput
            label="Remark"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional remark"
          />
          <Button type="submit" className="w-full">
            Save Transaction
          </Button>
        </form>
      </Modal>
    {showReceipt && <ReceiptImageModal transaction={showReceipt} onClose={() => setShowReceipt(null)} />}
    </div>
  );
}


