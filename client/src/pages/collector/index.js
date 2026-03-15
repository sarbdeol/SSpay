import React, { useState, useEffect } from "react";
import { fmt } from "../../utils/fmt";
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

      {/* Main Lena / Dena */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">
            Merchant Se Lena (Pending)
          </p>
          <p className="text-2xl font-bold">
            ₹{fmt(stats?.totalMerchantLena || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
            <div className="flex justify-between opacity-90">
              <span>Total Cleared (INR)</span>
              <strong>₹{fmt(stats?.totalCleared || 0)}</strong>
            </div>
            <div className="flex justify-between opacity-90">
              <span>Settled (AED)</span>
              <strong>- AED {fmt(stats?.merchantSettled?.aed || 0)}</strong>
            </div>
            {stats?.merchantSettled?.usdt > 0 && (
              <div className="flex justify-between opacity-90">
                <span>Settled (USDT)</span>
                <strong>- USDT {fmt(stats?.merchantSettled?.usdt)}</strong>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-white/20 pt-1">
              <span>Remaining (INR)</span>
              <span>₹{fmt(stats?.totalMerchantLena || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">
            Agent Ko Dena (Pending)
          </p>
          <p className="text-2xl font-bold">
            ₹{fmt(stats?.totalAgentDena || 0)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
            <div className="flex justify-between opacity-90">
              <span>Total Cleared (INR)</span>
              <strong>₹{fmt(stats?.totalCleared || 0)}</strong>
            </div>
            <div className="flex justify-between opacity-90">
              <span>Settled (AED)</span>
              <strong>- AED {fmt(stats?.agentSettled?.aed || 0)}</strong>
            </div>
            {stats?.agentSettled?.usdt > 0 && (
              <div className="flex justify-between opacity-90">
                <span>Settled (USDT)</span>
                <strong>- USDT {fmt(stats?.agentSettled?.usdt)}</strong>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-white/20 pt-1">
              <span>Remaining (INR)</span>
              <span>₹{fmt(stats?.totalAgentDena || 0)}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Admin Commission */}
      <div className="mb-4">
        <StatCard
          title="Admin Commission"
          value={stats?.totalAdminCommission || 0}
          index={3}
        />
      </div>
      {/* Settlement Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-amber-400">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            🏪 Merchant Settlements Request Pending
          </p>
          <p className="text-lg font-bold text-amber-600">
            AED {fmt(stats?.merchantPending?.aed)}
          </p>
          {stats?.merchantPending?.usdt > 0 && (
            <p className="text-sm text-amber-500">
              USDT {fmt(stats?.merchantPending?.usdt)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-teal-400">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            ✅ Merchant Settlements Request Confirmed
          </p>
          <p className="text-lg font-bold text-teal-600">
            AED {fmt(stats?.merchantConfirmed?.aed)}
          </p>
          {stats?.merchantConfirmed?.usdt > 0 && (
            <p className="text-sm text-teal-500">
              USDT {fmt(stats?.merchantConfirmed?.usdt)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-blue-400">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            🤝 Agent Settlements Request Pending
          </p>
          <p className="text-lg font-bold text-blue-600">
            AED {fmt(stats?.agentPending?.aed)}
          </p>
          {stats?.agentPending?.usdt > 0 && (
            <p className="text-sm text-blue-500">
              USDT {fmt(stats?.agentPending?.usdt)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-indigo-400">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            ✅ Agent Settlements Request Confirmed
          </p>
          <p className="text-lg font-bold text-indigo-600">
            AED {fmt(stats?.agentConfirmed?.aed)}
          </p>
          {stats?.agentConfirmed?.usdt > 0 && (
            <p className="text-sm text-indigo-500">
              USDT {fmt(stats?.agentConfirmed?.usdt)}
            </p>
          )}
        </div>
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
  const [merchantLedger, setMerchantLedger] = useState([]);
  const [agentLedger, setAgentLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [view, setView] = useState("merchant");
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    setSelectedName("");
    setLoading(true);
    const params = {};
    if (selectedDate) { params.startDate = selectedDate; params.endDate = selectedDate; }
    api.get("/collector/ledger", { params })
      .then((r) => {
        setMerchantLedger(r.data.merchantLedger || []);
        setAgentLedger(r.data.agentLedger || []);
        setSummary(r.data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  // const fmt = (n) => parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isMerchant = view === "merchant";
  const rows = isMerchant ? merchantLedger : agentLedger;
  const filteredRows = rows.filter((r) => !selectedName || r.name === selectedName);

  const grandPending = filteredRows.reduce((s, r) => s + r.pending, 0);
  const grandPendingAed = filteredRows.reduce((s, r) => s + r.pendingAed, 0);
  const grandSettled = filteredRows.reduce((s, r) => s + r.settled, 0);
  const grandSettledAed = filteredRows.reduce((s, r) => s + r.settledAed, 0);
  const grandTotal = filteredRows.reduce((s, r) => s + r.total, 0);
  const grandTotalAed = filteredRows.reduce((s, r) => s + (r.aedRate > 0 ? r.total / r.aedRate : 0), 0);


  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Collection Ledger" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Select Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500" />
        </div>

        {/* Lena / Dena Toggle */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">View</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden h-9">
            <button
              onClick={() => { setView("merchant"); setSelectedName(""); }}
              className={`px-4 text-sm font-semibold transition-all ${isMerchant ? "bg-red-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >Merchant Se Lena</button>
            <button
              onClick={() => { setView("agent"); setSelectedName(""); }}
              className={`px-4 text-sm font-semibold transition-all ${!isMerchant ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >Agent Ko Dena</button>
          </div>
        </div>

        {/* Name filter */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{isMerchant ? "Merchant" : "Agent"}</label>
          <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 min-w-[180px]">
            <option value="">All {isMerchant ? "Merchants" : "Agents"}</option>
            {rows.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>

        {selectedDate && (
          <button onClick={() => setSelectedDate("")} className="h-9 px-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 mt-5">Clear Date</button>
        )}
        {selectedName && (
          <button onClick={() => setSelectedName("")} className="h-9 px-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 mt-5">Clear Filter</button>
        )}
      </div>

      {/* Table */}
      <div className={`text-white text-center py-2 rounded-t-xl font-bold text-base ${isMerchant ? "bg-red-500" : "bg-blue-500"}`}>
        {isMerchant ? "Merchant Se Lena" : "Agent Ko Dena"}
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className={isMerchant ? "bg-red-50" : "bg-blue-50"}>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">{isMerchant ? "MERCHANT" : "AGENT"}</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">RATE</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">TOTAL (INR)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">TOTAL (AED)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 bg-green-50">SETTLED (AED)</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 bg-red-50">OUTSTANDING (AED)</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="border border-gray-200 px-3 py-6 text-center text-gray-400">No data found.</td></tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-800">{row.name.toUpperCase()}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right text-gray-500">{row.aedRate}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-gray-700">₹{fmt(row.total)}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-gray-700">{fmt(row.aedRate > 0 ? row.total / row.aedRate : 0)}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-green-600 bg-green-50">{fmt(row.settledAed)}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-semibold text-red-600 bg-red-50">{fmt(row.pendingAed)}</td>
                </tr>
              ))
            )}
            {!isMerchant && (
              <tr className="bg-purple-50">
                <td className="border border-gray-200 px-3 py-1.5 font-semibold text-purple-700" colSpan={4}>ADMIN COMMISSION</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-purple-700"></td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-purple-700">{fmt(summary?.totalAdminCommissionAed)}</td>
              </tr>
            )}
            <tr className={`text-white font-bold ${isMerchant ? "bg-red-500" : "bg-blue-500"}`}>
              <td className="border border-gray-300 px-3 py-2" colSpan={2}>TOTAL</td>
              <td className="border border-gray-300 px-3 py-2 text-right">₹{fmt(grandTotal)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{fmt(grandTotalAed)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{fmt(grandSettledAed)}</td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {fmt(isMerchant ? grandPendingAed : grandPendingAed + (summary?.totalAdminCommissionAed || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className={`border rounded-xl px-4 py-3 ${isMerchant ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
          <div className="text-gray-500 text-xs">Outstanding (INR)</div>
          <div className={`font-bold ${isMerchant ? "text-red-700" : "text-blue-700"}`}>₹{fmt(grandPending)}</div>
          <div className={`text-xs mt-0.5 ${isMerchant ? "text-red-500" : "text-blue-500"}`}>AED {fmt(grandPendingAed)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Settled (AED)</div>
          <div className="font-bold text-green-700">AED {fmt(grandSettledAed)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Total Cleared (INR)</div>
          <div className="font-bold text-gray-800">₹{fmt(grandTotal)}</div>
          <div className="text-xs text-gray-500 mt-0.5">AED {fmt(grandTotalAed)}</div>
        </div>
        {!isMerchant && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div className="text-gray-500 text-xs">Admin Commission</div>
            <div className="font-bold text-purple-700">₹{fmt(summary?.totalAdminCommission)}</div>
            <div className="text-xs text-purple-500 mt-0.5">AED {fmt(summary?.totalAdminCommissionAed)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
export function CollectorTrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const r = await api.get("/collector/trial-balance", { params });
      setData(r.data.data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const lena = data?.merchantLena || [];
  const dena = data?.agentDena || [];
  const adminComm = parseFloat(data?.totalAdminCommission || 0);
  const totalLena = lena.reduce((s, e) => s + (parseFloat(e.pending) || 0), 0);
  const totalDena = dena.reduce((s, e) => s + (parseFloat(e.pending) || 0), 0);
  const totalDenaWithComm = totalDena + adminComm;
  const maxRows = Math.max(lena.length, dena.length + 1, 1);

  const toAed = (inr, aedRate) => (aedRate > 1 ? inr / aedRate : 0);
  const fallbackRate = lena[0]?.aedRate || dena[0]?.aedRate || 0;
  const totalLenaAed = lena.reduce((s, e) => s + toAed(parseFloat(e.pending) || 0, e.aedRate), 0);
  const totalDenaAed = dena.reduce((s, e) => s + toAed(parseFloat(e.pending) || 0, e.aedRate), 0);
  const totalDenaWithCommAed = totalDenaAed + toAed(adminComm, fallbackRate);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Trial Balance" />
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={fetchData}
            className="h-9 px-4 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600"
          >
            Show
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th
                colSpan={3}
                className="border border-gray-300 bg-red-50 px-3 py-2 text-center font-bold text-red-800"
              >
                Merchant Se Lena (Debit)
              </th>
              <th
                colSpan={3}
                className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-bold text-blue-800"
              >
                Agent Ko Dena (Credit)
              </th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                Merchant
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                Amount (INR)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                Amount (AED)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                Agent
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                Amount (INR)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                Amount (AED)
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">
                  {lena[i]?.name || ""}
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-red-600">
                  {lena[i] ? fmt(lena[i].pending) : ""}
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-red-400">
                  {lena[i] ? fmt(toAed(lena[i].pending, lena[i].aedRate)) : ""}
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-gray-800">
                  {i < dena.length ? (
                    dena[i].name
                  ) : i === dena.length ? (
                    <span className="font-semibold text-purple-700">ADMIN COMMISSION</span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-blue-700">
                  {i < dena.length
                    ? fmt(dena[i].pending)
                    : i === dena.length
                      ? fmt(adminComm)
                      : ""}
                </td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-medium text-blue-500">
                  {i < dena.length
                    ? fmt(toAed(dena[i].pending, dena[i].aedRate))
                    : i === dena.length
                      ? fmt(toAed(adminComm, fallbackRate))
                      : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-brand-500 text-white font-bold">
              <td colSpan={2} className="border border-gray-300 px-3 py-2">
                Total Lena (Pending)
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>{fmt(totalLena)}</div>
                <div className="text-xs font-normal opacity-90">AED {fmt(totalLenaAed)}</div>
              </td>
              <td colSpan={2} className="border border-gray-300 px-3 py-2">
                Total Dena + Commission
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>{fmt(totalDenaWithComm)}</div>
                <div className="text-xs font-normal opacity-90">AED {fmt(totalDenaWithCommAed)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Pending Lena (from Merchants)</div>
          <div className="font-bold text-red-700">₹{fmt(totalLena)}</div>
          <div className="text-xs text-red-500 mt-0.5">AED {fmt(totalLenaAed)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Pending Dena (to Agents)</div>
          <div className="font-bold text-blue-700">₹{fmt(totalDena)}</div>
          <div className="text-xs text-blue-500 mt-0.5">AED {fmt(totalDenaAed)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Admin Commission</div>
          <div className="font-bold text-purple-700">₹{fmt(adminComm)}</div>
          <div className="text-xs text-purple-500 mt-0.5">AED {fmt(toAed(adminComm, fallbackRate))}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Total Dena + Commission</div>
          <div className="font-bold text-blue-700">₹{fmt(totalDenaWithComm)}</div>
          <div className="text-xs text-blue-500 mt-0.5">AED {fmt(totalDenaWithCommAed)}</div>
        </div>
      </div>
    </div>
  );
}
export function CollectorSettlements() {
  const [items, setItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [payRemark, setPayRemark] = useState("");
  const [payScreenshot, setPayScreenshot] = useState(null);
  const [form, setForm] = useState({ amount: "", currency: "AED", agentId: "", remark: "" });

  const loadItems = () => api.get("/collector/settlements").then((r) => setItems(r.data.data));

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
    try { await api.post(`/collector/settlements/${id}/pick`); toast.success("Picked!"); loadItems(); }
    catch (e) { toast.error(e.response?.data?.message || "Error."); }
  };

  const handleSubmit = async (id) => {
    try { await api.post(`/collector/settlements/${id}/submit`); toast.success("Submitted!"); loadItems(); }
    catch (e) { toast.error(e.response?.data?.message || "Error."); }
  };

  const openPay = (r) => {
    setShowPay(r);
    setPayRemark("");
    setPayScreenshot(null);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("payRemark", payRemark);
      if (payScreenshot) fd.append("screenshot", payScreenshot);
      await api.post(`/collector/settlements/${showPay.id}/pay`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Marked as Paid!");
      setShowPay(null);
      loadItems();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter reject reason:");
    if (!reason) return;
    try { await api.post(`/collector/settlements/${id}/reject`, { reason }); toast.success("Rejected."); loadItems(); }
    catch (e) { toast.error(e.response?.data?.message || "Error."); }
  };

  const statusLabel = (s) => ({ PENDING: "Pending", PICKED: "Picked", SUBMITTED: "Submitted", PAID: "Paid", CONFIRMED: "Confirmed", REJECTED: "Rejected" }[s] || s);
  const statusStyle = (s) => ({ SUBMITTED: "bg-emerald-100 text-emerald-700", PICKED: "bg-blue-100 text-blue-700", REJECTED: "bg-red-100 text-red-700", PAID: "bg-purple-100 text-purple-700", CONFIRMED: "bg-teal-100 text-teal-700" }[s] || "bg-amber-100 text-amber-700");

  return (
    <div>
      <PageHeader title="Settlements" action={<Button onClick={() => setShowCreate(true)}>Create Request</Button>} />
      <DataTable
        columns={[
          { header: "Amount", render: (r) => `${r.currency} ${parseFloat(r.amount).toLocaleString()}` },
          { header: "Agent", render: (r) => r.agent?.name || "-" },
          { header: "Remark", render: (r) => r.remark || "-" },
          { header: "Wallet", render: (r) => r.walletAddress
            ? <span className="font-mono text-xs truncate max-w-[100px] block">{r.walletAddress}</span>
            : "-"
          },
          { header: "QR", render: (r) => r.proofImage
            ? <a href={`/uploads/settlements/${r.proofImage}`} target="_blank" rel="noreferrer" className="text-blue-500 text-xs underline">View QR</a>
            : "-"
          },
          { header: "Pay SS", render: (r) => r.payScreenshot
            ? <a href={`/uploads/settlements/${r.payScreenshot}`} target="_blank" rel="noreferrer" className="text-green-600 text-xs underline">View SS</a>
            : "-"
          },
          { header: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
          { header: "Status", render: (r) => (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(r.status)}`}>
              {statusLabel(r.status)}
            </span>
          )},
        ]}
        data={items}
        total={items.length}
        page={1}
        actions={(r) => (
          <div className="flex gap-1">
            {/* Only show Pick for merchant-created pending settlements */}
            {r.status === "PENDING" && r.merchantId && (
              <Button onClick={() => handlePick(r.id)} variant="primary" className="h-7 px-2 text-xs">Pick</Button>
            )}
            {/* Only show Submit/Reject for collector-picked (no agentId = collector flow) */}
            {r.status === "PICKED" && !r.agentId && (
              <>
                <Button onClick={() => handleSubmit(r.id)} variant="primary" className="h-7 px-2 text-xs">Submit</Button>
                <Button onClick={() => handleReject(r.id)} variant="danger" className="h-7 px-2 text-xs">Reject</Button>
              </>
            )}
            {/* Pay — only when agent has submitted with wallet details */}
            {r.status === "SUBMITTED" && r.agentId && (
              <Button onClick={() => openPay(r)} variant="primary" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700">Pay</Button>
            )}
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Settlement Request">
        <form onSubmit={handleCreate}>
          <FormSelect
            label="Currency" required
            options={[{ value: "AED", label: "AED" }, { value: "USDT", label: "USDT" }]}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
          <FormInput
            label={`Amount (${form.currency})`} required type="number" step="0.01" min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <FormSelect
            label="Agent" required placeholder="Select agent"
            options={agents.map((a) => ({ value: a.id, label: a.name }))}
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
          />
          <FormInput
            label="Remark"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
          <Button type="submit" className="w-full">Submit Request</Button>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal open={!!showPay} onClose={() => setShowPay(null)} title="Pay Settlement">
        {showPay && (
          <form onSubmit={handlePay}>
            {/* Agent wallet details */}
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent Payment Details</p>
              <div className="flex gap-4 items-start">
                {showPay.proofImage && (
                  <a href={`/uploads/settlements/${showPay.proofImage}`} target="_blank" rel="noreferrer">
                    <img
                      src={`/uploads/settlements/${showPay.proofImage}`}
                      alt="QR"
                      className="h-24 w-24 object-contain rounded-xl border border-gray-200 bg-white cursor-pointer hover:opacity-80"
                    />
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Amount</p>
                  <p className="text-lg font-bold text-gray-800">{showPay.currency} {parseFloat(showPay.amount).toLocaleString()}</p>
                  {showPay.walletAddress ? (
                    <>
                      <p className="text-xs text-gray-400 mt-2 mb-1">Wallet Address</p>
                      <p className="text-sm font-mono text-gray-800 break-all">{showPay.walletAddress}</p>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(showPay.walletAddress); toast.success("Copied!"); }}
                        className="mt-1 text-xs text-brand-500 hover:underline"
                      >
                        Copy Address
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-amber-500 mt-2">No wallet address provided by agent.</p>
                  )}
                  {showPay.remark && (
                    <>
                      <p className="text-xs text-gray-400 mt-2 mb-1">Agent Remark</p>
                      <p className="text-sm text-gray-600">{showPay.remark}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Screenshot</label>
              <input
                type="file" accept="image/*"
                onChange={(e) => setPayScreenshot(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
              />
              {payScreenshot && <p className="text-xs text-gray-400 mt-1">Selected: {payScreenshot.name}</p>}
            </div>
            <FormInput
              label="Remark"
              value={payRemark}
              onChange={(e) => setPayRemark(e.target.value)}
              placeholder="Optional payment remark"
            />
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Confirm Payment</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
