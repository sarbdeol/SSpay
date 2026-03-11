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
  useEffect(() => {
    api.get("/collector/ledger").then((r) => setItems(r.data.data));
  }, []);
  return (
    <div>
      <PageHeader title="Ledger" />
      <DataTable
        columns={[
          { header: "Type", key: "entryType" },
          {
            header: "Amount",
            render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
          },
          { header: "Description", render: (r) => r.description || "-" },
          {
            header: "Balance After",
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
