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
  StatusBadge,
} from "../../components/common";
import toast from "react-hot-toast";

export function CollectorDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/collector/dashboard").then((r) => setStats(r.data.data));
  }, []);
  return (
    <div>
      <PageHeader title="Collector Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Merchant Se Lena"
          value={stats?.totalMerchantSeLena || 0}
          index={0}
        />
        {/* <StatCard title="Total Settled" value={stats?.totalSettled || 0} index={1} /> */}
        <StatCard
          title="Total Agent Ko Dena"
          value={stats?.totalAgentKoDena || 0}
          index={2}
        />
        <StatCard
          title="Total Admin Ko Dena"
          value={stats?.totalAdminKoDena || 0}
          index={3}
        />
      </div>
    </div>
  );
}

export function CollectorRequests() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "" });
  const fetch = () =>
    api.get("/collector/requests").then((r) => setItems(r.data.data));
  useEffect(() => {
    fetch();
  }, []);
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/collector/requests", form);
      toast.success("Created!");
      setShowCreate(false);
      fetch();
    } catch (e) {
      toast.error("Error.");
    }
  };
  return (
    <div>
      <PageHeader
        title="Requests"
        action={
          <Button onClick={() => setShowCreate(true)}>Create Request</Button>
        }
      />
      <DataTable
        columns={[
          {
            header: "Amount",
            render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "Description", render: (r) => r.description || "-" },
          {
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
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
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Request"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Amount"
            required
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <FormInput
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Submit Request
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function CollectorLedger() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [rates, setRates] = useState({ aedTodayRate: 1 });
  const [selectedMerchant, setSelectedMerchant] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/collector/ledger", { params: { startDate: selectedDate, endDate: selectedDate } }),
      api.get("/config/current-rates"),
    ]).then(([r, rateRes]) => {
      setItems(r.data.data || []);
      const rt = rateRes.data.data?.[0];
      if (rt) setRates({ aedTodayRate: parseFloat(rt.aedTodayRate || 1) });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedDate]);

  const { aedTodayRate } = rates;
  const toAed = (n) => aedTodayRate > 0 ? n / aedTodayRate : 0;
  const fmt = (n) => parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Group by merchant
  const grouped = {};
  items.forEach(r => {
    const name = r.merchant?.name || 'Unknown';
    if (!grouped[name]) grouped[name] = { name, totalINR: 0 };
    grouped[name].totalINR += parseFloat(r.amount || 0);
  });

  const allMerchants = Object.keys(grouped);
  const rows = Object.values(grouped).filter(r => !selectedMerchant || r.name === selectedMerchant);
  const grandINR = rows.reduce((s, r) => s + r.totalINR, 0);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Select Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Select Merchant</label>
          <select value={selectedMerchant} onChange={e => setSelectedMerchant(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac min-w-[180px]">
            <option value="">All Merchants</option>
            {allMerchants.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {selectedMerchant && (
          <button onClick={() => setSelectedMerchant('')}
            className="h-9 px-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        )}
        <div className="ml-auto">
          <PageHeader title="Ledger" />
        </div>
      </div>

      <div className="bg-brand-500 text-white text-center py-3 rounded-t-xl font-bold text-lg">
        COLLECTOR LEDGER ({new Date(selectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, "-")})
        {selectedMerchant && <span className="ml-2 text-base font-normal opacity-90">— {selectedMerchant}</span>}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50">
              <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 w-12">SR.</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">MERCHANT</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">RATE</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">AMOUNT (INR)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">AMOUNT (AED)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="border border-gray-200 px-3 py-6 text-center text-gray-400">No cleared transactions for this date.</td></tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-500">{idx + 1}</td>
                  <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-800">{r.name.toUpperCase()}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right text-gray-600">{aedTodayRate}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-medium">₹{fmt(r.totalINR)}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-green-700">{fmt(toAed(r.totalINR))}</td>
                </tr>
              ))
            )}
            <tr className="bg-brand-500 text-white font-bold">
              <td className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>TOTAL</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt(grandINR)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{fmt(toAed(grandINR))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total INR:</span>
          <span className="ml-2 font-bold text-gray-800">₹{fmt(grandINR)}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total AED:</span>
          <span className="ml-2 font-bold text-green-700">{fmt(toAed(grandINR))}</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Merchants:</span>
          <span className="ml-2 font-bold">{rows.length}</span>
        </div>
      </div>
    </div>
  );
}
export function CollectorTrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const r = await api.get('/collector/trial-balance', { params });
      setData(r.data.data);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (n) => parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const lena = data?.merchantLena || [];
  const dena = data?.agentDena || [];
  const maxRows = Math.max(lena.length, dena.length, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Trial Balance" />
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500" />
          </div>
          <button onClick={fetchData} className="h-9 px-4 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600">Show</button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th colSpan={2} className="border border-gray-300 bg-red-50 px-3 py-2 text-center font-bold text-red-800">Merchant Se Lena (Debit)</th>
              <th colSpan={2} className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-bold text-blue-800">Agent Ko Dena (Credit)</th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Merchant</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Agent</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">{lena[i]?.name || ''}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-red-600">{lena[i] ? fmt(lena[i].amount) : ''}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">{dena[i]?.name || ''}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-blue-600">{dena[i] ? fmt(dena[i].amount) : ''}</td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-300 px-3 py-2 text-red-800">Total Lena</td>
              <td className="border border-gray-300 px-3 py-2 text-right text-red-800">{fmt(data?.totalMerchantLena)}</td>
              <td className="border border-gray-300 px-3 py-2 text-blue-800">Total Dena</td>
              <td className="border border-gray-300 px-3 py-2 text-right text-blue-800">{fmt(data?.totalAgentDena)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total Lena (from Merchants):</span>
          <span className="ml-2 font-bold text-red-700">{fmt(data?.totalMerchantLena)}</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total Dena (to Agents):</span>
          <span className="ml-2 font-bold text-blue-700">{fmt(data?.totalAgentDena)}</span>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${(data?.totalMerchantLena - data?.totalAgentDena) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <span className="text-gray-500">Net Balance:</span>
          <span className={`ml-2 font-bold ${(data?.totalMerchantLena - data?.totalAgentDena) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmt((data?.totalMerchantLena || 0) - (data?.totalAgentDena || 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CollectorSettlements() {
  const [items, setItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    currency: "AED",
    agentId: "",
    remark: "",
  });

  const loadItems = () =>
    api.get("/collector/settlements").then((r) => setItems(r.data.data));

  useEffect(() => {
    loadItems();
    api.get("/collector/agents").then((r) => setAgents(r.data.data || []));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/collector/settlements", form);
      toast.success("Request created!");
      setShowCreate(false);
      setForm({ amount: "", currency: "AED", agentId: "", remark: "" });
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed.");
    }
  };

  const handlePick = async (id) => {
    try {
      await api.post(`/collector/settlements/${id}/pick`);
      toast.success("Picked!");
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleSubmit = async (id) => {
    try {
      await api.post(`/collector/settlements/${id}/submit`);
      toast.success("Submitted!");
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handlePay = async (id) => {
    try {
      await api.post(`/collector/settlements/${id}/pay`);
      toast.success("Marked as Paid!");
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter reject reason:");
    if (!reason) return;
    try {
      await api.post(`/collector/settlements/${id}/reject`, { reason });
      toast.success("Rejected.");
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "PICKED":
        return "Picked by You";
      case "SUBMITTED":
        return "Submitted";
      case "PAID":
        return "Paid";
      case "CONFIRMED":
        return "Confirmed";
      case "REJECTED":
        return "Rejected";
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
      case "PAID":
        return "bg-purple-100 text-purple-700";
      case "CONFIRMED":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <div>
      <PageHeader
        title="Settlements"
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
          { header: "Merchant", render: (r) => r.merchant?.name || "-" },
          { header: "Agent", render: (r) => r.agent?.name || "-" },
          { header: "Remark", render: (r) => r.remark || "-" },
          {
            header: "Wallet",
            render: (r) =>
              r.walletAddress ? (
                <span className="font-mono text-xs">{r.walletAddress}</span>
              ) : (
                "-"
              ),
          },
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
                  View QR
                </a>
              ) : (
                "-"
              ),
          },
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
            {r.status === "PENDING" && r.merchantId && (
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
                  onClick={() => handleSubmit(r.id)}
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
            {r.status === "SUBMITTED" && r.agentId && (
              <Button
                onClick={() => handlePay(r.id)}
                variant="primary"
                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                Pay
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
          <FormSelect
            label="Agent"
            required
            placeholder="Select agent"
            options={agents.map((a) => ({ value: a.id, label: a.name }))}
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
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
