// ═══════════════════════════════════════════
// AGENT PAGES
// ═══════════════════════════════════════════
import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import {
  StatCard,
  DataTable,
  PageHeader,
  Button,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea,
  Toggle,
  StatusBadge,
} from "../../components/common";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
export function AgentDashboard() {
  const [stats, setStats] = useState(null);
  const [rates, setRates] = useState({ aedTodayRate: 1, usdtTodayRate: 1 });

  useEffect(() => {
    Promise.all([
      api.get("/agent/dashboard"),
      api.get("/config/current-rates"),
    ]).then(([r, rateRes]) => {
      setStats(r.data.data);
      const rt = rateRes.data.data?.[0];
      if (rt) setRates({
        aedTodayRate: parseFloat(rt.aedTodayRate || 1),
        usdtTodayRate: parseFloat(rt.usdtTodayRate || 1),
      });
    });
  }, []);

  const fmt = (n) => parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { aedTodayRate, usdtTodayRate } = rates;

  const settledInr =
    parseFloat(stats?.confirmedSettlementAed || 0) * aedTodayRate +
    parseFloat(stats?.confirmedSettlementUsdt || 0) * usdtTodayRate;
  const settledAed = aedTodayRate > 0 ? settledInr / aedTodayRate : 0;

  return (
    <div>
      <PageHeader title="Agent Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <StatCard title="Total Pay Out Amount" value={stats?.totalPayOutAmount || 0} index={2} />

        {/* Admin Commission To Pay */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">Admin Commission (To Pay)</p>
          <p className="text-xl font-bold">₹{fmt(stats?.totalAdminCommission || 0)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs">
            <div className="flex justify-between opacity-90">
              <span>In AED</span>
              <strong>AED {fmt(aedTodayRate > 0 ? (stats?.totalAdminCommission || 0) / aedTodayRate : 0)}</strong>
            </div>
          </div>
        </div>

        <StatCard title="Total Agent Commission" value={stats?.totalAgentCommission || 0} index={0} />

        {/* Total Settlement Received */}
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">Total Settlement Received</p>
          <p className="text-xl font-bold">₹{fmt(settledInr)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs">
            <div className="flex justify-between font-bold">
              <span>Total in AED</span>
              <span>AED {fmt(settledAed)}</span>
            </div>
          </div>
        </div>

        {/* Total Payment Lunga */}
        <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">Total Payment Lunga</p>
          <p className="text-xl font-bold">₹{fmt(stats?.totalPaymentLunga || 0)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
            <div className="flex justify-between opacity-90">
              <span>In AED</span>
              <strong>AED {fmt(stats?.payOutInAed || 0)}</strong>
            </div>
            <div className="flex justify-between opacity-90">
              <span>In USDT</span>
              <strong>USDT {fmt(stats?.payOutInUsdt || 0)}</strong>
            </div>
          </div>
        </div>

        <StatCard title="Pending Amount" value={stats?.totalPendingAmount || 0} index={4} />
        <StatCard title="Available Details" value={stats?.availableLimit || 0} index={5} />
        <StatCard title="Total Pay Out Transactions" value={stats?.totalPayOutTransactions || 0} prefix="" index={1} />
        <StatCard title="Total Pending Transactions" value={stats?.totalPendingTransactions || 0} prefix="" index={3} />

      </div>
    </div>
  );
}

export function AgentOperators() {
  const [operators, setOperators] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null); // ✅ edit state
  const [form, setForm] = useState({
    name: "",
    maxTransactionAmount: "",
    minTransactionAmount: "",
    commissionChargePercent: "",
    description: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    maxTransactionAmount: "",
    minTransactionAmount: "",
    commissionChargePercent: "",
    description: "",
    isActive: true,
  });

  const fetch = () =>
    api.get("/agent/operators").then((r) => setOperators(r.data.data));
  useEffect(() => {
    fetch();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/agent/operators", form);
      toast.success("Operator created!");
      setShowCreate(false);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  // ✅ open edit modal with existing data
  const handleEditOpen = (operator) => {
    setEditForm({
      name: operator.name,
      maxTransactionAmount: operator.maxTransactionAmount,
      minTransactionAmount: operator.minTransactionAmount,
      commissionChargePercent: operator.commissionChargePercent,
      description: operator.description || "",
      isActive: operator.isActive,
    });
    setShowEdit(operator);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/agent/operators/${showEdit.id}`, editForm);
      toast.success("Operator updated!");
      setShowEdit(null);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Operators List"
        action={<Button onClick={() => setShowCreate(true)}>Create</Button>}
      />
      <DataTable
        columns={[
          { header: "ID", key: "id" },
          { header: "Name", key: "name" },
          {
            header: "Max Txn",
            render: (r) =>
              `₹${parseFloat(r.maxTransactionAmount).toLocaleString()}`,
          },
          {
            header: "Min Txn",
            render: (r) =>
              `₹${parseFloat(r.minTransactionAmount).toLocaleString()}`,
          },
          { header: "Commission %", key: "commissionChargePercent" },
          {
            header: "Is Active",
            render: (r) => (
              <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
            ),
          },
        ]}
        data={operators}
        total={operators.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            <button
              onClick={() => handleEditOpen(r)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-mac"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                await api.delete(`/agent/operators/${r.id}`);
                fetch();
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-mac"
            >
              🗑️
            </button>
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Operator Form"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Operator Name"
          />
          <FormInput
            label="Max Transaction Amount"
            required
            type="number"
            value={form.maxTransactionAmount}
            onChange={(e) =>
              setForm({ ...form, maxTransactionAmount: e.target.value })
            }
          />
          <FormInput
            label="Min Transaction Amount"
            required
            type="number"
            value={form.minTransactionAmount}
            onChange={(e) =>
              setForm({ ...form, minTransactionAmount: e.target.value })
            }
          />
          <FormInput
            label="Commission Charge Percent"
            required
            type="number"
            step="0.01"
            value={form.commissionChargePercent}
            onChange={(e) =>
              setForm({ ...form, commissionChargePercent: e.target.value })
            }
            placeholder="e.g 4, 0.8, 2.6"
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Save Operator
          </Button>
        </form>
      </Modal>

      {/* ✅ Edit Modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(null)}
        title="Edit Operator"
      >
        <form onSubmit={handleEdit}>
          <FormInput
            label="Name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <FormInput
            label="Max Transaction Amount"
            required
            type="number"
            value={editForm.maxTransactionAmount}
            onChange={(e) =>
              setEditForm({ ...editForm, maxTransactionAmount: e.target.value })
            }
          />
          <FormInput
            label="Min Transaction Amount"
            required
            type="number"
            value={editForm.minTransactionAmount}
            onChange={(e) =>
              setEditForm({ ...editForm, minTransactionAmount: e.target.value })
            }
          />
          <FormInput
            label="Commission Charge Percent"
            required
            type="number"
            step="0.01"
            value={editForm.commissionChargePercent}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                commissionChargePercent: e.target.value,
              })
            }
          />
          <FormTextarea
            label="Description"
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
          <Toggle
            label="Is Active"
            checked={editForm.isActive}
            onChange={() =>
              setEditForm({ ...editForm, isActive: !editForm.isActive })
            }
          />
          <Button type="submit" className="w-full">
            Update Operator
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function AgentOperatorUsers() {
  const [users, setUsers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    operatorId: "",
  });
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    operatorId: "",
    isActive: true,
  });
  const { impersonate } = useAuth();
  const navigate = useNavigate();
  const fetchData = () => {
    api.get("/agent/operator-users").then((r) => setUsers(r.data.data));
    api.get("/agent/operators").then((r) => setOperators(r.data.data));
  };
  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/agent/operator-users", form);
      toast.success("User created!");
      setShowCreate(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleEditOpen = (user) => {
    setEditForm({
      username: user.username,
      password: "",
      operatorId: user.operator?.id || "",
      isActive: user.isActive,
    });
    setShowEdit(user);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/agent/operator-users/${showEdit.id}`, editForm);
      toast.success("User updated!");
      setShowEdit(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Operators User List"
        action={<Button onClick={() => setShowCreate(true)}>Create</Button>}
      />
      <DataTable
        columns={[
          { header: "ID", key: "id" },
          { header: "Name", render: (r) => r.username || r.name },
          { header: "Operator", render: (r) => r.operator?.name || "-" },
          {
            header: "Is Active",
            render: (r) => (
              <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
            ),
          },
        ]}
        data={users}
        total={users.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Username: ${r.username}\nPassword: ${r.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`,
                );
                toast.success("Credentials copied!");
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              title="Copy Credentials"
            >
              📋
            </button>
            <button
              onClick={async () => {
                try {
                  await impersonate(r.id);
                  navigate("/operator");
                } catch (e) {
                  toast.error("Failed.");
                }
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as Operator"
            >
              🔑
            </button>
            <button
              onClick={() => handleEditOpen(r)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                await api.delete(`/agent/operator-users/${r.id}`);
                fetchData();
              }}
              className="p-1.5 rounded-lg hover:bg-red-50"
            >
              🗑️
            </button>
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Operator User Form"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="User Name"
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
          <FormSelect
            label="Select Operator"
            required
            placeholder="Select Option"
            options={operators.map((o) => ({ value: o.id, label: o.name }))}
            value={form.operatorId}
            onChange={(e) => setForm({ ...form, operatorId: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Save User
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(null)}
        title="Edit Operator User"
      >
        <form onSubmit={handleEdit}>
          <FormInput
            label="Username"
            required
            value={editForm.username}
            onChange={(e) =>
              setEditForm({ ...editForm, username: e.target.value })
            }
          />
          <FormInput
            label="New Password"
            type="password"
            value={editForm.password}
            onChange={(e) =>
              setEditForm({ ...editForm, password: e.target.value })
            }
            placeholder="Leave blank to keep current"
          />
          <FormSelect
            label="Select Operator"
            required
            placeholder="Select Option"
            options={operators.map((o) => ({ value: o.id, label: o.name }))}
            value={editForm.operatorId}
            onChange={(e) =>
              setEditForm({ ...editForm, operatorId: e.target.value })
            }
          />
          <Toggle
            label="Is Active"
            checked={editForm.isActive}
            onChange={() =>
              setEditForm({ ...editForm, isActive: !editForm.isActive })
            }
          />
          <Button type="submit" className="w-full">
            Update User
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function AgentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => {
    api.get(`/agent/transactions?page=${page}&limit=10`).then((r) => {
      setTransactions(r.data.data);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, [page]);

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

  return (
    <div>
      <PageHeader title="Transactions List" />
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
            header: "Cleared Date",
            render: (r) =>
              r.transactionClearTime
                ? new Date(r.transactionClearTime).toLocaleString()
                : "-",
          },
          {
            header: "Status",
            render: (r) => {
              const labels = {
                PENDING: "Pending",
                PICKED: "Picked",
                SUBMITTED: "Submitted",
                PAID: "Paid",
                CONFIRMED: "Confirmed",
                REJECTED: "Rejected",
              };
              const styles = {
                SUBMITTED: "bg-emerald-100 text-emerald-700",
                PICKED: "bg-blue-100 text-blue-700",
                REJECTED: "bg-red-100 text-red-700",
                PAID: "bg-purple-100 text-purple-700",
                CONFIRMED: "bg-teal-100 text-teal-700",
              };
              return (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[r.status] || "bg-amber-100 text-amber-700"}`}
                >
                  {labels[r.status] || r.status}
                </span>
              );
            },
          },
        ]}
        data={transactions}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        onExport={handleExport}
        actions={(r) => (
          <button
            onClick={() => setShowDetail(r)}
            className="text-brand-500 text-sm"
          >
            View All
          </button>
        )}
      />

      <Modal
        open={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Transaction Details"
        maxWidth="max-w-md"
      >
        {showDetail && (
          <div className="text-sm space-y-2">
            {[
              ["Amount", `₹${parseFloat(showDetail.amount).toLocaleString()}`],
              ["Type", showDetail.transactionType],
              ["UTR", showDetail.utrNumber || "-"],
              ["Status", showDetail.status],
              [
                "Operator Pick",
                showDetail.operatorPickTime
                  ? new Date(showDetail.operatorPickTime).toLocaleString()
                  : "-",
              ],
              [
                "Clear Time",
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
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {showDetail.merchant && (
              <div className="mt-3 pt-3 border-t">
                <p className="font-semibold text-gray-800 mb-2">Merchant</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span>{showDetail.merchant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Limit</span>
                  <span>
                    ₹
                    {parseFloat(
                      showDetail.merchant.maxPaymentLimit || 0,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {showDetail.operator && (
              <div className="mt-3 pt-3 border-t">
                <p className="font-semibold text-gray-800 mb-2">Operator</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span>{showDetail.operator.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Txn</span>
                  <span>
                    ₹
                    {parseFloat(
                      showDetail.operator.maxTransactionAmount || 0,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min Txn</span>
                  <span>
                    ₹
                    {parseFloat(
                      showDetail.operator.minTransactionAmount || 0,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══ AGENT LEDGER ═══
export function AgentLedger() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [rates, setRates] = useState({ aedTodayRate: 1, usdtTodayRate: 1 });
  const [settlements, setSettlements] = useState([]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (selectedDate) { params.startDate = selectedDate; params.endDate = selectedDate; }
    Promise.all([
      api.get("/agent/ledger", { params }),
      api.get("/config/current-rates"),
      api.get("/agent/settlements"),
    ])
      .then(([txRes, rateRes, settlRes]) => {
        setTransactions(txRes.data.data || []);
        const r = rateRes.data.data?.[0];
        if (r) setRates({
          aedTodayRate: parseFloat(r.aedTodayRate || 1),
          usdtTodayRate: parseFloat(r.usdtTodayRate || 1),
        });
        const daySettlements = (settlRes.data.data || []).filter((s) => {
          if (!selectedDate) return s.status === "CONFIRMED" || s.status === "SUBMITTED";
          const d = new Date(s.updatedAt).toISOString().split("T")[0];
          return d === selectedDate && (s.status === "CONFIRMED" || s.status === "SUBMITTED");
        });
        setSettlements(daySettlements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  const groupByOperator = () => {
    const groups = {};
    transactions.forEach((tx) => {
      const opName = tx.operator?.name || "No Operator";
      if (!groups[opName]) groups[opName] = { operatorName: opName, totalINR: 0, totalCommission: 0 };
      groups[opName].totalINR += parseFloat(tx.amount);
      groups[opName].totalCommission += parseFloat(tx.agentCommission || 0);
    });
    return groups;
  };

  const operatorGroups = groupByOperator();
  const { aedTodayRate, usdtTodayRate } = rates;
  const toAed = (inr) => (aedTodayRate > 0 ? inr / aedTodayRate : 0);
  const toUsdt = (inr) => (usdtTodayRate > 0 ? inr / usdtTodayRate : 0);
  const grandINR = Object.values(operatorGroups).reduce((s, g) => s + g.totalINR, 0);
  const grandCommission = Object.values(operatorGroups).reduce((s, g) => s + g.totalCommission, 0);
  const grandBalance = grandINR - grandCommission;
  const totalSettledAed = settlements.filter((s) => s.currency === "AED").reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalSettledUsdt = settlements.filter((s) => s.currency === "USDT").reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalSettledInr = totalSettledAed * aedTodayRate + totalSettledUsdt * usdtTodayRate;
  const netBalance = grandBalance - totalSettledInr;
  const fmt = (n) => parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const dateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, "-")
    : "All";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Agent Collection Ledger" />
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Select Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac" />
          </div>
          {selectedDate && (
            <button onClick={() => setSelectedDate("")}
              className="h-9 px-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-brand-500 text-white text-center py-3 rounded-t-xl font-bold text-lg">
        AGENT DAILY COLLECTION ({dateLabel})
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50">
              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 w-12">SR.</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">OPERATOR</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">TOTAL AMOUNT (INR)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">COMMISSION (INR)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">LENA BALANCE</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">SETTLEMENT (AED)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">NET LENA</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(operatorGroups).length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                  No cleared transactions{selectedDate ? " for this date" : ""}.
                </td>
              </tr>
            ) : (
              Object.values(operatorGroups).map((group, idx) => {
                const balance = group.totalINR - group.totalCommission;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-800">{group.operatorName.toUpperCase()}</td>
                    <td className="border border-gray-200 px-3 py-2 text-right font-medium">₹{fmt(group.totalINR)}</td>
                    <td className="border border-gray-200 px-3 py-2 text-right text-red-600 font-medium">₹{fmt(group.totalCommission)}</td>
                    <td className="border border-gray-200 px-3 py-2 text-right">
                      <div className="font-semibold text-green-600">₹{fmt(balance)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">AED {fmt(toAed(balance))} | USDT {fmt(toUsdt(balance))}</div>
                    </td>
                    {idx === 0 && (
                      <>
                        <td className="border border-gray-200 px-3 py-2 text-right text-orange-600 font-medium" rowSpan={Object.keys(operatorGroups).length}>
                          {totalSettledAed > 0 && <div>AED {fmt(totalSettledAed)}</div>}
                          {totalSettledUsdt > 0 && <div>USDT {fmt(totalSettledUsdt)}</div>}
                          <div className="text-xs text-gray-400 mt-0.5">₹{fmt(totalSettledInr)}</div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-right" rowSpan={Object.keys(operatorGroups).length}>
                          <div className="font-semibold text-blue-600">₹{fmt(netBalance)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">AED {fmt(toAed(grandBalance) - totalSettledAed)} | USDT {fmt(toUsdt(netBalance))}</div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
            <tr className="bg-brand-500 text-white font-bold">
              <td className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>TOTAL</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt(grandINR)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt(grandCommission)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>₹{fmt(grandBalance)}</div>
                <div className="text-xs font-normal mt-0.5 opacity-90">AED {fmt(toAed(grandBalance))} | USDT {fmt(toUsdt(grandBalance))}</div>
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {totalSettledAed > 0 && <div>AED {fmt(totalSettledAed)}</div>}
                {totalSettledUsdt > 0 && <div>USDT {fmt(totalSettledUsdt)}</div>}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>₹{fmt(netBalance)}</div>
                <div className="text-xs font-normal mt-0.5 opacity-90">AED {fmt(toAed(grandBalance) - totalSettledAed)} | USDT {fmt(toUsdt(netBalance))}</div>
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
          <span className="ml-2 font-bold text-red-700">₹{fmt(grandCommission)}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Lena Balance:</span>
          <span className="ml-2 font-bold text-green-600">₹{fmt(grandBalance)}</span>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Settlement:</span>
          {totalSettledAed > 0 && <span className="ml-2 font-bold text-orange-600">AED {fmt(totalSettledAed)}</span>}
          {totalSettledUsdt > 0 && <span className="ml-2 font-bold text-orange-600">USDT {fmt(totalSettledUsdt)}</span>}
          {totalSettledAed === 0 && totalSettledUsdt === 0 && <span className="ml-2 font-bold text-gray-400">—</span>}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Net Lena:</span>
          <span className="ml-2 font-bold text-blue-700">₹{fmt(netBalance)}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Net AED:</span>
          <span className="ml-2 font-bold text-green-700">{fmt(toAed(grandBalance) - totalSettledAed)}</span>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Net USDT:</span>
          <span className="ml-2 font-bold text-purple-700">{fmt(toUsdt(netBalance))}</span>
        </div>
      </div>
    </div>
  );
}
// ═══ AGENT SETTLEMENTS (with USDT wallet) ═══
export function AgentSettlements() {
  const [items, setItems] = useState([]);
  const [showSubmit, setShowSubmit] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [qrImage, setQrImage] = useState(null);

  const fetchData = () =>
    api.get("/agent/settlements").then((r) => setItems(r.data.data));
  useEffect(() => {
    fetchData();
  }, []);

  const handlePick = async (id) => {
    try {
      await api.post(`/agent/settlements/${id}/pick`);
      toast.success("Picked!");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("walletAddress", walletAddress);
      if (qrImage) formData.append("qrImage", qrImage);
      await api.post(`/agent/settlements/${showSubmit.id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Submitted!");
      setShowSubmit(null);
      setWalletAddress("");
      setQrImage(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };
  const handleConfirm = async (id) => {
    try {
      await api.post(`/agent/settlements/${id}/confirm`);
      toast.success("Confirmed! Payment received.");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };
  const handleReject = async (id) => {
    const reason = window.prompt("Enter reject reason:");
    if (!reason) return;
    try {
      await api.post(`/agent/settlements/${id}/reject`, { reason });
      toast.success("Rejected.");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  return (
    <div>
      <PageHeader title="Settlements" />
      <DataTable
        columns={[
          {
            header: "Amount",
            render: (r) =>
              `${r.currency || ""} ${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "Collector", render: (r) => r.collector?.name || "-" },
          { header: "Remark", render: (r) => r.remark || "-" },
          { header: "Wallet", render: (r) => r.walletAddress || "-" },
          {
            header: "QR",
            render: (r) =>
              r.proofImage ? (
                <a
                  href={`/uploads/settlements/${r.proofImage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 text-xs underline"
                >
                  View
                </a>
              ) : (
                "-"
              ),
          },
          {
            header: "Status",
            render: (r) => {
              const labels = {
                PENDING: "Pending",
                PICKED: "Picked",
                SUBMITTED: "Submitted",
                PAID: "Paid",
                CONFIRMED: "Confirmed",
                REJECTED: "Rejected",
              };
              const styles = {
                SUBMITTED: "bg-emerald-100 text-emerald-700",
                PICKED: "bg-blue-100 text-blue-700",
                REJECTED: "bg-red-100 text-red-700",
                PAID: "bg-purple-100 text-purple-700",
                CONFIRMED: "bg-teal-100 text-teal-700",
              };
              return (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[r.status] || "bg-amber-100 text-amber-700"}`}
                >
                  {labels[r.status] || r.status}
                </span>
              );
            },
          },
          {
            header: "Date",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        data={items}
        total={items.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            {r.status === "PENDING" && (
              <Button
                onClick={() => handlePick(r.id)}
                variant="primary"
                className="h-7 px-2 text-xs"
              >
                Pick
              </Button>
            )}
            {r.status === "PICKED" && (
              <>
                <Button
                  onClick={() => {
                    setShowSubmit(r);
                    setWalletAddress("");
                    setQrImage(null);
                  }}
                  variant="primary"
                  className="h-7 px-2 text-xs"
                >
                  Submit
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
            {r.status === "PAID" && (
              <Button
                onClick={() => handleConfirm(r.id)}
                variant="primary"
                className="h-7 px-2 text-xs bg-teal-600 hover:bg-teal-700"
              >
                Confirm Received
              </Button>
            )}
          </div>
        )}
      />

      <Modal
        open={!!showSubmit}
        onClose={() => setShowSubmit(null)}
        title="Submit Settlement"
      >
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-500 mb-3">
            {showSubmit?.currency}{" "}
            {showSubmit && parseFloat(showSubmit.amount).toLocaleString()} —{" "}
            {showSubmit?.collector?.name || "Collector"}
          </p>
          <FormInput
            label="USDT Wallet Address"
            required
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter USDT wallet address"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload QR Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setQrImage(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
            />
            {qrImage && (
              <p className="text-xs text-gray-400 mt-1">
                Selected: {qrImage.name}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </Modal>
    </div>
  );
}
