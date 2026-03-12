import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import {
  StatCard,
  DataTable,
  PageHeader,
  Button,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea,
  StatusBadge,
} from "../../components/common";
import toast from "react-hot-toast";

export function MerchantDashboard() {
  const [stats, setStats] = useState(null);
  const [rates, setRates] = useState({ aedTodayRate: 1 });

  useEffect(() => {
    api.get("/merchant/dashboard").then((r) => setStats(r.data.data));
    api
      .get("/config/current-rates")
      .then((r) => {
        const rt = r.data.data?.[0];
        if (rt) setRates({ aedTodayRate: parseFloat(rt.aedTodayRate || 1) });
      })
      .catch(() => {});
  }, []);

  const { aedTodayRate } = rates;
  const toAed = (n) => (aedTodayRate > 0 ? n / aedTodayRate : 0);
  const fmt = (n) =>
    parseFloat(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      <PageHeader title="Merchant Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          title="Total Commission"
          value={stats?.totalCommissionAmount || 0}
          index={0}
        />
        <StatCard
          title="Total Pay Out"
          value={stats?.totalPayOutAmount || 0}
          index={1}
        />
        <StatCard
          title="Pay Out Transactions"
          value={stats?.totalPayOutTransactions || 0}
          prefix=""
          index={2}
        />
        <StatCard
          title="Pending"
          value={stats?.pendingCount || 0}
          prefix=""
          index={3}
        />
        <StatCard
          title="Pending Amount"
          value={stats?.pendingAmount || 0}
          index={4}
        />
        <StatCard
          title="Total Payment Dena"
          value={stats?.totalPaymentDena || 0}
          index={5}
        />
        <StatCard
          title="Payment Dena (AED)"
          value={toAed(stats?.totalPaymentDena || 0)}
          prefix="AED "
          index={0}
        />
        <StatCard title="Total Settled (AED)" value={stats?.totalSettledAed || 0} prefix="AED " index={1} />
<StatCard title="Total Settled (INR)" value={stats?.totalSettledInr || 0} index={2} />
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-white rounded-2xl shadow-card p-5 min-w-[220px]">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Payment Limits
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-600">Available</span>
              <span className="font-semibold">
                ₹{(stats?.availableLimit || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">Used</span>
              <span className="font-semibold">
                ₹{(stats?.usedLimit || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Maximum</span>
              <span className="font-semibold">
                ₹{(stats?.maxPaymentLimit || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions (READ ONLY - no create button) ───
export function MerchantTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);

  const fetch = () => {
    api.get(`/merchant/transactions?page=${page}&limit=10`).then((r) => {
      setTransactions(r.data.data);
      setTotal(r.data.total);
      setLoading(false);
    });
  };
  useEffect(() => {
    fetch();
  }, [page]);

  const handleExport = async () => {
    const r = await api.get("/reports/export/transactions", {
      responseType: "blob",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([r.data]));
    a.download = "transactions.xlsx";
    a.click();
  };

  return (
    <div>
      <PageHeader title="Transactions List" />
      <DataTable
        columns={[
          { header: "ID", key: "id" },
          {
            header: "Amount",
            render: (r) =>
              `${r.currency} ${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "UTR", render: (r) => r.utrNumber || "-" },
          { header: "UPI ID", render: (r) => r.upiId || "-" },
          { header: "Remark", render: (r) => r.notes || "-" },
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
        onExport={handleExport}
        actions={(r) => (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDetail(r)}
              className="text-brand-500 text-sm hover:underline"
            >
              View All
            </button>
            {r.status === "CLEARED" && (
              <button
                onClick={() => {
                  api
                    .get(`/reports/receipt/${r.id}`, { responseType: "blob" })
                    .then((res) =>
                      window.open(
                        URL.createObjectURL(
                          new Blob([res.data], { type: "application/pdf" }),
                        ),
                        "_blank",
                      ),
                    );
                }}
                className="text-emerald-500 text-sm"
              >
                📥
              </button>
            )}
          </div>
        )}
      />
      <Modal
        open={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Transaction Details"
      >
        {showDetail && (
          <div className="space-y-2 text-sm">
            {[
              ["Amount", `₹${parseFloat(showDetail.amount).toLocaleString()}`],
              ["Type", showDetail.transactionType],
              ["UPI ID", showDetail.upiId || "-"],
              ["UTR", showDetail.utrNumber || "-"],
              ["Remark", showDetail.notes || "-"],
              ["Status", showDetail.status],
              ...(showDetail.status === "REJECTED"
                ? [
                    [
                      "Reject Reason",
                      showDetail.rejectReason || "No reason provided",
                    ],
                  ]
                : []),
              ["Created", new Date(showDetail.createdAt).toLocaleString()],
              [
                "Cleared",
                showDetail.transactionClearTime
                  ? new Date(showDetail.transactionClearTime).toLocaleString()
                  : "-",
              ],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between py-1.5 border-b border-gray-50"
              >
                <span className="text-gray-500">{k}</span>
                <span
                  className={`font-medium ${k === "Reject Reason" ? "text-red-600" : ""}`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Sub-Merchants (with copy credentials + impersonate) ───
export function MerchantSubmerchants() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreds, setShowCreds] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    username: "",
    password: "",
  });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetch = () =>
    api.get("/merchant/submerchants").then((r) => setItems(r.data.data));
  useEffect(() => {
    fetch();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/merchant/submerchants", form);
      toast.success("Created!");
      setShowCreate(false);
      setShowCreds(r.data.credentials);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };
  const handleImpersonate = async (userId) => {
    try {
      await impersonate(userId);
      navigate("/submerchant");
    } catch (e) {
      toast.error("Failed.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Sub-Merchants"
        action={
          <Button onClick={() => setShowCreate(true)}>
            Create Sub-Merchant
          </Button>
        }
      />
      <DataTable
        columns={[
          { header: "Name", key: "name" },
          { header: "Username", render: (r) => r.user?.username || "-" },
          {
            header: "Status",
            render: (r) => (
              <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
            ),
          },
        ]}
        data={items}
        total={items.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            <button
              onClick={() =>
                handleCopy(
                  `Username: ${r.user?.username}\nPassword: ${r.user?.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`,
                )
              }
              className="p-1.5 rounded-lg hover:bg-gray-100 text-sm"
              title="Copy"
            >
              📋
            </button>
            <button
              onClick={() => handleImpersonate(r.user?.id)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as"
            >
              🔑
            </button>
          </div>
        )}
      />
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Sub-Merchant"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <FormInput
            label="Username"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <FormInput
            label="Password"
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!showCreds}
        onClose={() => setShowCreds(null)}
        title="Credentials"
      >
        {showCreds && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Username</span>
              <span className="font-mono font-semibold">
                {showCreds.username}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Password</span>
              <span className="font-mono font-semibold">
                {showCreds.password}
              </span>
            </div>
            <Button
              onClick={() =>
                handleCopy(
                  `Username: ${showCreds.username}\nPassword: ${showCreds.password}`,
                )
              }
              className="w-full mt-2"
              variant="outline"
            >
              Copy All
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function MerchantSettlements() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "AED", remark: "" });

  const loadItems = () =>
    api.get("/merchant/settlements").then((r) => setItems(r.data.data));
  const handleConfirm = async (id) => {
    try {
      await api.post(`/merchant/settlements/${id}/confirm`);
      toast.success("Settlement confirmed!");
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };
  useEffect(() => {
    loadItems();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/merchant/settlements", form);
      toast.success("Settlement request created!");
      setShowCreate(false);
      setForm({ amount: "", currency: "AED", remark: "" });
      loadItems();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create settlement.",
      );
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "PICKED":
        return "Picked by Collector";
      case "SUBMITTED":
        return "Submitted by Collector";
      case "REJECTED":
        return "Rejected by Collector";
      case 'CONFIRMED': return 'Confirmed';

      default:
        return status;
    }
  };

  const statusStyle = (status) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-emerald-100 text-emerald-700";
      case "PICKED":
        return "bg-blue-100 text-blue-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case 'CONFIRMED': return 'bg-teal-100 text-teal-700';
      default:
        return "bg-amber-100 text-amber-700";
      
    }
  };

  return (
    <div>
      <PageHeader
        title="Settlement Transactions"
        action={
          <Button onClick={() => setShowCreate(true)}>Create Request</Button>
        }
      />
      <DataTable
        columns={[
          {
            header: "Amount",
            render: (r) =>
              `${r.currency} ${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "Collector", render: (r) => r.collector?.name || "-" },
          { header: "Remark", render: (r) => r.remark || "-" },
          {
            header: "Date",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            header: "Status",
            render: (r) => (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(r.status)}`}
              >
                {statusLabel(r.status)}
              </span>
            ),
          },
        ]}
        data={items}
        total={items.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            {r.status === "SUBMITTED" && (
              <Button
                onClick={() => handleConfirm(r.id)}
                variant="primary"
                className="h-7 px-2 text-xs bg-teal-600 hover:bg-teal-700"
              >
                Confirm
              </Button>
            )}
          </div>
        )}
      />
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Settlement Request"
      >
        <form onSubmit={handleCreate}>
          <FormSelect
            label="Currency"
            required
            options={[
              { value: "AED", label: "AED" },
              { value: "USDT", label: "USDT" },
            ]}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
          <FormInput
            label={`Amount (${form.currency})`}
            required
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <FormInput
            label="Remark"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Submit Request
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function MerchantConfiguration() {
  const [subMerchants, setSubMerchants] = useState([]);
  const [form, setForm] = useState({
    subMerchantId: "",
    usdtTodayRate: "",
    aedTodayRate: "",
  });

  useEffect(() => {
    api
      .get("/merchant/rate-config")
      .then((r) => setSubMerchants(r.data.subMerchants || []));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/merchant/rate-config", form);
      toast.success("Rate updated!");
    } catch (e) {
      toast.error("Error updating rate.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Configuration"
        subtitle="Set AED and USDT rates for sub-merchants"
      />
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-lg">
        <form onSubmit={handleUpdate}>
          <FormSelect
            label="Select Sub-Merchant"
            placeholder="All Sub-Merchants"
            options={subMerchants.map((s) => ({ value: s.id, label: s.name }))}
            value={form.subMerchantId}
            onChange={(e) =>
              setForm({ ...form, subMerchantId: e.target.value })
            }
          />
          <FormInput
            label="USDT Today Rate"
            required
            type="number"
            step="0.0001"
            value={form.usdtTodayRate}
            onChange={(e) =>
              setForm({ ...form, usdtTodayRate: e.target.value })
            }
            placeholder="e.g. 3.67"
          />
          <FormInput
            label="AED Today Rate"
            required
            type="number"
            step="0.0001"
            value={form.aedTodayRate}
            onChange={(e) => setForm({ ...form, aedTodayRate: e.target.value })}
            placeholder="e.g. 3.67"
          />
          <Button type="submit" className="w-full">
            Update Rate
          </Button>
        </form>
      </div>
    </div>
  );
}

export function MerchantLedger() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [rates, setRates] = useState({ aedTodayRate: 1, usdtTodayRate: 1 });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/merchant/ledger", {
        params: { startDate: selectedDate, endDate: selectedDate },
      }),
      api.get("/config/current-rates"),
    ])
      .then(([txRes, rateRes]) => {
        setTransactions(txRes.data.data || []);
        const r = rateRes.data.data?.[0];
        if (r)
          setRates({
            aedTodayRate: parseFloat(r.aedTodayRate || 1),
            usdtTodayRate: parseFloat(r.usdtTodayRate || 1),
          });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  const groupBySubMerchant = () => {
    const groups = {};
    transactions.forEach((tx) => {
      const name = tx.subMerchant?.name || "Direct";
      if (!groups[name])
        groups[name] = { name, totalINR: 0, totalCommission: 0 };
      groups[name].totalINR += parseFloat(tx.amount);
      groups[name].totalCommission += parseFloat(tx.merchantCommission || 0);
    });
    return groups;
  };

  const groups = groupBySubMerchant();
  const { aedTodayRate, usdtTodayRate } = rates;
  const toAed = (inr) => (aedTodayRate > 0 ? inr / aedTodayRate : 0);
  const toUsdt = (inr) => (usdtTodayRate > 0 ? inr / usdtTodayRate : 0);
  const grandINR = Object.values(groups).reduce((s, g) => s + g.totalINR, 0);
  const grandCommission = Object.values(groups).reduce(
    (s, g) => s + g.totalCommission,
    0,
  );
  const grandBalance = grandINR - grandCommission;
  const fmt = (n) =>
    parseFloat(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Merchant Ledger" />
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac"
          />
        </div>
      </div>

      <div className="bg-brand-500 text-white text-center py-3 rounded-t-xl font-bold text-lg">
        MERCHANT DAILY COLLECTION (
        {new Date(selectedDate)
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })
          .replace(/\//g, "-")}
        )
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50">
              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 w-12">
                SR.
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                SUB MERCHANT
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                TOTAL AMOUNT (INR)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                COMMISSION (INR)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                DENA BALANCE
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groups).length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-gray-200 px-3 py-6 text-center text-gray-400"
                >
                  No cleared transactions for this date.
                </td>
              </tr>
            ) : (
              Object.values(groups).map((group, idx) => {
                const balance = group.totalINR - group.totalCommission;
                return (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-800">
                      {group.name.toUpperCase()}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right font-medium">
                      ₹{fmt(group.totalINR)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right text-red-600 font-medium">
                      ₹{fmt(group.totalCommission)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-right">
                      <div className="font-semibold text-green-600">
                        ₹{fmt(balance)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        AED {fmt(toAed(balance))} | USDT {fmt(toUsdt(balance))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="bg-brand-500 text-white font-bold">
              <td
                className="border border-gray-300 px-3 py-2 text-center"
                colSpan={2}
              >
                TOTAL
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                ₹{fmt(grandINR)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                ₹{fmt(grandCommission)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>₹{fmt(grandBalance)}</div>
                <div className="text-xs font-normal mt-0.5 opacity-90">
                  AED {fmt(toAed(grandBalance))} | USDT{" "}
                  {fmt(toUsdt(grandBalance))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total INR:</span>
          <span className="ml-2 font-bold text-gray-800">₹{fmt(grandINR)}</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Commission:</span>
          <span className="ml-2 font-bold text-red-700">
            ₹{fmt(grandCommission)}
          </span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Dena Balance:</span>
          <span className="ml-2 font-bold text-green-600">
            ₹{fmt(grandBalance)}
          </span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">In AED:</span>
          <span className="ml-2 font-bold text-green-700">
            {fmt(toAed(grandBalance))}
          </span>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">In USDT:</span>
          <span className="ml-2 font-bold text-purple-700">
            {fmt(toUsdt(grandBalance))}
          </span>
        </div>
      </div>
    </div>
  );
}
