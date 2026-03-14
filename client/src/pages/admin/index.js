import React, { useState, useEffect, useCallback } from "react";
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
  FormTextarea,
  Toggle,
  StatusBadge,
  DateFilter,
} from "../../components/common";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════
function AdminCommissionCard({ stats }) {


  const hasAed = (stats?.merchantSettledAed || 0) > 0 || (stats?.agentSettledAed || 0) > 0;
  const hasUsdt = (stats?.merchantSettledUsdt || 0) > 0 || (stats?.agentSettledUsdt || 0) > 0;

  const aedDiffInr = hasAed ? (stats?.totalAedDiffInr || 0) : 0;
  const usdtDiffInr = hasUsdt ? (stats?.totalUsdtDiffInr || 0) : 0;
  const aedDiff = hasAed ? (stats?.totalAedDiff || 0) : 0;
  const usdtDiff = hasUsdt ? (stats?.totalUsdtDiff || 0) : 0;
  const total = (stats?.totalAdminCommission || 0) + aedDiffInr + usdtDiffInr;

  return (
    <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-5 text-white shadow-sm">
      <p className="text-sm font-medium opacity-80 mb-2">Admin Commission</p>
      <p className="text-xl font-bold">₹{fmt(total)}</p>
      <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
        <div className="flex justify-between opacity-90">
          <span>INR (Commission %)</span>
          <strong>₹{fmt(stats?.totalAdminCommission)}</strong>
        </div>
        {hasAed && (
          <div className="flex justify-between opacity-90">
            <span>AED Diff ({fmt(aedDiff)} AED)</span>
            <strong>+ ₹{fmt(aedDiffInr)}</strong>
          </div>
        )}
        {hasUsdt && (
          <div className="flex justify-between opacity-90">
            <span>USDT Diff ({fmt(usdtDiff)} USDT)</span>
            <strong>+ ₹{fmt(usdtDiffInr)}</strong>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-white/20 pt-1">
          <span>Total (INR)</span>
          <span>₹{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStats = useCallback(async () => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const r = await api.get("/admin/dashboard", { params });
    setStats(r.data.data);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);



  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Admin Dashboard" />
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total RTGS Amount" value={stats?.totalRtgsAmount || 0} index={0} />

        {/* Total Lena */}
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">Total Lena (from Merchants)</p>
          <p className="text-xl font-bold">₹{fmt(stats?.totalLena)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
            <div className="flex justify-between opacity-90">
              <span>Total Cleared (INR)</span>
              <strong>₹{fmt(stats?.totalRtgsAmount)}</strong>
            </div>
            <div className="flex justify-between opacity-90">
              <span>Settled (AED)</span>
              <strong>- AED {fmt(stats?.merchantSettledAed)}</strong>
            </div>
            {(stats?.merchantSettledUsdt || 0) > 0 && (
              <div className="flex justify-between opacity-90">
                <span>Settled (USDT)</span>
                <strong>- USDT {fmt(stats?.merchantSettledUsdt)}</strong>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-white/20 pt-1">
              <span>Remaining (INR)</span>
              <span>₹{fmt(stats?.totalLena)}</span>
            </div>
          </div>
        </div>

        {/* Total Dena */}
        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-80 mb-2">Total Dena (to Agents)</p>
          <p className="text-xl font-bold">₹{fmt(stats?.totalDena)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1">
            <div className="flex justify-between opacity-90">
              <span>Cleared - Commission (INR)</span>
              <strong>₹{fmt((stats?.totalRtgsAmount || 0) - (stats?.totalAdminCommission || 0))}</strong>
            </div>
            <div className="flex justify-between opacity-90">
              <span>Settled (AED)</span>
              <strong>- AED {fmt(stats?.agentSettledAed)}</strong>
            </div>
            {(stats?.agentSettledUsdt || 0) > 0 && (
              <div className="flex justify-between opacity-90">
                <span>Settled (USDT)</span>
                <strong>- USDT {fmt(stats?.agentSettledUsdt)}</strong>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-white/20 pt-1">
              <span>Remaining (INR)</span>
              <span>₹{fmt(stats?.totalDena)}</span>
            </div>
          </div>
        </div>

        <AdminCommissionCard stats={stats} />

        <StatCard title="Available Details" value={stats?.availableLimit || 0} index={4} />
        <StatCard title="Total Used" value={stats?.totalUsedLimit || 0} index={5} />
        <StatCard title="Pending" value={stats?.totalPending || 0} prefix="" index={6} />
        <StatCard title="Picked / In Process" value={stats?.totalPicked || 0} prefix="" index={7} />
        <StatCard title="Cleared" value={stats?.totalCleared || 0} prefix="" index={0} />
        <StatCard title="Merchants" value={stats?.merchantCount || 0} prefix="" index={1} />
        <StatCard title="Agents" value={stats?.agentCount || 0} prefix="" index={2} />
        <StatCard title="Collectors" value={stats?.collectorCount || 0} prefix="" index={3} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// EDIT USER DETAIL MODAL (Reusable)
// ═══════════════════════════════════════════
function EditUserDetailModal({ open, onClose, entity, entityType, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    username: "",
    newPassword: "",
    isActive: true,
    maxPaymentLimit: "",
    commissionChargePercent: "",
    agentCommissionChargePercent: "",
    assignAgentIds: [],
    assignAll: false,
  });
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (entity) {
      setForm({
        name: entity.name || "",
        description: entity.description || "",
        username: entity.user?.username || "",
        newPassword: "",
        isActive: entity.isActive ?? true,
        maxPaymentLimit: entity.maxPaymentLimit || "",
        commissionChargePercent: entity.commissionChargePercent || "",
        agentCommissionChargePercent: entity.commissionChargePercent || "",
        assignAgentIds: [],
        assignAll: false,
      });
      if (entityType === "merchant" && entity.id) {
        api
          .get("/admin/agents?limit=100")
          .then((r) => setAgents(r.data.data || []));
        api
          .get(`/admin/merchants/${entity.id}/agents`)
          .then((r) => {
            setForm((prev) => ({
              ...prev,
              assignAgentIds: (r.data.data || []).map((a) =>
                a.agentId.toString(),
              ),
            }));
          })
          .catch(() => {});
      }
    }
  }, [entity, entityType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Build entity update payload
      const entityPayload = {
        name: form.name,
        description: form.description,
        isActive: form.isActive,
      };
      if (entityType === "merchant") {
        entityPayload.maxPaymentLimit = form.maxPaymentLimit;
        entityPayload.commissionChargePercent = form.commissionChargePercent;
      }
      if (entityType === "agent") {
        entityPayload.commissionChargePercent =
          form.agentCommissionChargePercent;
      }

      // Update entity
      if (entityType === "merchant") {
        entityPayload.assignAll = form.assignAll;
        entityPayload.assignAgentIds = form.assignAgentIds;
      }
      await api.put(`/admin/${entityType}s/${entity.id}`, entityPayload);

      // Update username / password if changed
      const userPayload = {};
      if (form.username && form.username !== entity.user?.username)
        userPayload.username = form.username;
      if (form.newPassword) userPayload.password = form.newPassword;
      if (Object.keys(userPayload).length > 0) {
        await api.put(`/admin/users/${entity.user?.id}`, userPayload);
      }

      toast.success(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} updated!`,
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating.");
    } finally {
      setSaving(false);
    }
  };

  const title =
    {
      merchant: "Edit Merchant Details",
      agent: "Edit Agent Details",
      collector: "Edit Collector Details",
    }[entityType] || "Edit Details";

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-xl">
      {entity && (
        <form onSubmit={handleSubmit}>
          {/* ── Profile Info ── */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Profile Info
            </p>
            <FormInput
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Display name"
            />
            <FormTextarea
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional description"
            />

            {entityType === "agent" && (
              <FormInput
                label="Commission Charge %"
                type="number"
                step="0.01"
                value={form.agentCommissionChargePercent}
                onChange={(e) =>
                  setForm({
                    ...form,
                    agentCommissionChargePercent: e.target.value,
                  })
                }
                placeholder="e.g. 2.5"
              />
            )}
            {entityType === "merchant" && (
              <>
                <FormInput
                  label="Maximum Payment Limit"
                  type="number"
                  value={form.maxPaymentLimit}
                  onChange={(e) =>
                    setForm({ ...form, maxPaymentLimit: e.target.value })
                  }
                  placeholder="e.g. 500000"
                />
                <FormInput
                  label="Commission Charge %"
                  type="number"
                  step="0.01"
                  value={form.commissionChargePercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      commissionChargePercent: e.target.value,
                    })
                  }
                  placeholder="e.g. 2.5"
                />
              </>
            )}
            {entityType === "merchant" && agents.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assigned Agents
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.assignAll}
                      onChange={() =>
                        setForm({
                          ...form,
                          assignAll: !form.assignAll,
                          assignAgentIds: [],
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-brand-500"
                    />
                    <span className="text-sm text-gray-600">
                      Select All Agents
                    </span>
                  </label>
                </div>
                {!form.assignAll && (
                  <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {agents.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.assignAgentIds.includes(
                            a.id.toString(),
                          )}
                          onChange={() => {
                            const id = a.id.toString();
                            setForm({
                              ...form,
                              assignAgentIds: form.assignAgentIds.includes(id)
                                ? form.assignAgentIds.filter((i) => i !== id)
                                : [...form.assignAgentIds, id],
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-brand-500"
                        />
                        <span className="text-sm text-gray-700">{a.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Toggle
              label="Is Active"
              checked={form.isActive}
              onChange={() => setForm({ ...form, isActive: !form.isActive })}
            />
          </div>

          {/* ── Login Credentials ── */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Login Credentials
            </p>
            <FormInput
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Login username"
            />
            <FormInput
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={(e) =>
                setForm({ ...form, newPassword: e.target.value })
              }
              placeholder="Leave blank to keep current password"
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════
// MERCHANTS LIST + CREATE
// ═══════════════════════════════════════════
export function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [agents, setAgents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    maxPaymentLimit: "",
    commissionChargePercent: "",
    username: "",
    password: "",
    assignAgentIds: [],
    assignAll: false,
    isActive: true,
  });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchMerchants = async () => {
    setLoading(true);
    const r = await api.get(`/admin/merchants?page=${page}&limit=10`);
    setMerchants(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  const fetchAgents = async () => {
    const r = await api.get("/admin/agents?limit=100");
    setAgents(r.data.data);
  };

  useEffect(() => {
    fetchMerchants();
    fetchAgents();
  }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!form.assignAll && form.assignAgentIds.length === 0) {
        toast.error("At least one agent required.");
        return;
      }
      await api.post("/admin/merchants", form);
      toast.success("Merchant created!");
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        maxPaymentLimit: "",
        commissionChargePercent: "",
        username: "",
        password: "",
        assignAgentIds: [],
        assignAll: false,
        isActive: true,
      });
      fetchMerchants();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleToggle = async (merchant) => {
    try {
      await api.put(`/admin/merchants/${merchant.id}`, {
        isActive: !merchant.isActive,
      });
      toast.success("Updated.");
      fetchMerchants();
    } catch (e) {
      toast.error("Error.");
    }
  };

  const columns = [
    {
      header: "Sr No.",
      render: (r) => merchants.indexOf(r) + 1 + (page - 1) * 10,
    },
    { header: "Mer. Name", key: "name" },
    { header: "Mer. Username", render: (r) => r.user?.username || "-" },
    { header: "Transactions", render: (r) => r._count?.transactions || 0 },
    {
      header: "Created",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      header: "Status",
      render: (r) => (
        <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Merchants"
        action={
          <Button onClick={() => setShowCreate(true)}>Add Merchant</Button>
        }
      />

      <DataTable
        columns={columns}
        data={merchants}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        actions={(row) => (
          <div className="flex gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Username: ${row.user?.username}\nPassword: ${row.user?.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`,
                );
                toast.success("Copied!");
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-sm"
              title="Copy credentials"
            >
              📋
            </button>
            <button
              onClick={() => setEditEntity(row)}
              className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500"
              title="Edit details"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                try {
                  await impersonate(row.user?.id);
                  navigate("/merchant");
                } catch (e) {
                  toast.error("Failed.");
                }
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as merchant"
            >
              🔑
            </button>
            <button
              onClick={() => handleToggle(row)}
              className={`p-1.5 rounded-lg transition-mac ${row.isActive ? "hover:bg-red-50 text-red-400" : "hover:bg-green-50 text-green-500"}`}
            >
              {row.isActive ? "⏸" : "▶️"}
            </button>
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Merchant Form"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Merchant Name"
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
          <FormInput
            label="Maximum Payment Limit"
            required
            type="number"
            value={form.maxPaymentLimit}
            onChange={(e) =>
              setForm({ ...form, maxPaymentLimit: e.target.value })
            }
            placeholder="e.g 500000"
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign Agents *
            </label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.assignAll}
                  onChange={() =>
                    setForm({
                      ...form,
                      assignAll: !form.assignAll,
                      assignAgentIds: [],
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-500"
                />
                <span className="text-sm text-gray-600">Select All Agents</span>
              </label>
            </div>
            {!form.assignAll && (
              <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                {agents.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.assignAgentIds.includes(a.id.toString())}
                      onChange={() => {
                        const id = a.id.toString();
                        setForm({
                          ...form,
                          assignAgentIds: form.assignAgentIds.includes(id)
                            ? form.assignAgentIds.filter((i) => i !== id)
                            : [...form.assignAgentIds, id],
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500"
                    />
                    <span className="text-sm text-gray-700">{a.name}</span>
                  </label>
                ))}
              </div>
            )}
            {!form.assignAll && form.assignAgentIds.length === 0 && (
              <p className="text-xs text-red-400 mt-1">
                At least one agent required
              </p>
            )}
          </div>
          <FormInput
            label="Username"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Login username"
          />
          <FormInput
            label="Password"
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Login password"
          />
          <Toggle
            label="Is Active"
            checked={form.isActive}
            onChange={() => setForm({ ...form, isActive: !form.isActive })}
          />
          <Button type="submit" className="w-full">
            Save Merchant
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <EditUserDetailModal
        open={!!editEntity}
        onClose={() => setEditEntity(null)}
        entity={editEntity}
        entityType="merchant"
        onSaved={fetchMerchants}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// AGENTS LIST + CREATE
// ═══════════════════════════════════════════
export function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    commissionChargePercent: "",
    username: "",
    password: "",
    isActive: true,
  });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchAgents = async () => {
    setLoading(true);
    const r = await api.get(`/admin/agents?page=${page}&limit=10`);
    setAgents(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
  }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/agents", form);
      toast.success("Agent created!");
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        commissionChargePercent: "",
        username: "",
        password: "",
        isActive: true,
      });
      fetchAgents();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const columns = [
    { header: "Sr No.", render: (r) => agents.indexOf(r) + 1 },
    { header: "Agent Name", key: "name" },
    { header: "Username", render: (r) => r.user?.username || "-" },
    { header: "Commission %", key: "commissionChargePercent" },
    { header: "Operators", render: (r) => r._count?.operators || 0 },
    {
      header: "Status",
      render: (r) => (
        <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Agents"
        action={<Button onClick={() => setShowCreate(true)}>Add Agent</Button>}
      />
      <DataTable
        columns={columns}
        data={agents}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        actions={(row) => (
          <div className="flex gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Username: ${row.user?.username}\nPassword: ${row.user?.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`,
                );
                toast.success("Copied!");
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-sm"
              title="Copy credentials"
            >
              📋
            </button>
            <button
              onClick={() => setEditEntity(row)}
              className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500"
              title="Edit details"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                try {
                  await impersonate(row.user?.id);
                  navigate("/agent");
                } catch (e) {
                  toast.error("Failed.");
                }
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as agent"
            >
              🔑
            </button>
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Admin Agent Form"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Agent Name"
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
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
          <FormInput
            label="Username"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Login username"
          />
          <FormInput
            label="Password"
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Login password"
          />
          <Toggle
            label="Is Active"
            checked={form.isActive}
            onChange={() => setForm({ ...form, isActive: !form.isActive })}
          />
          <Button type="submit" className="w-full">
            Save Agent
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <EditUserDetailModal
        open={!!editEntity}
        onClose={() => setEditEntity(null)}
        entity={editEntity}
        entityType="agent"
        onSaved={fetchAgents}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// COLLECTORS
// ═══════════════════════════════════════════
export function AdminCollectors() {
  const [collectors, setCollectors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    username: "",
    password: "",
  });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchCollectors = async () => {
    const r = await api.get("/admin/collectors");
    setCollectors(r.data.data);
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/collectors", form);
      toast.success("Collector created!");
      setShowCreate(false);
      setForm({ name: "", description: "", username: "", password: "" });
      fetchCollectors();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const columns = [
    { header: "Sr No.", render: (r) => collectors.indexOf(r) + 1 },
    { header: "Name", key: "name" },
    { header: "Username", render: (r) => r.user?.username || "-" },
    {
      header: "Status",
      render: (r) => (
        <StatusBadge status={r.isActive ? "Active" : "Inactive"} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Collectors"
        action={
          <Button onClick={() => setShowCreate(true)}>Add Collector</Button>
        }
      />
      <DataTable
        columns={columns}
        data={collectors}
        total={collectors.length}
        page={1}
        actions={(row) => (
          <div className="flex gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Username: ${row.user?.username}\nPassword: ${row.user?.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`,
                );
                toast.success("Copied!");
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-sm"
              title="Copy credentials"
            >
              📋
            </button>
            <button
              onClick={() => setEditEntity(row)}
              className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500"
              title="Edit details"
            >
              ✏️
            </button>
            <button
              onClick={async () => {
                try {
                  await impersonate(row.user?.id);
                  navigate("/collector");
                } catch (e) {
                  toast.error("Failed.");
                }
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as collector"
            >
              🔑
            </button>
          </div>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Collector"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Collector Name"
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
            Create Collector
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <EditUserDetailModal
        open={!!editEntity}
        onClose={() => setEditEntity(null)}
        entity={editEntity}
        entityType="collector"
        onSaved={fetchCollectors}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN TRANSACTIONS
// ═══════════════════════════════════════════
export function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    merchantId: "",
    agentId: "",
    startDate: "",
    endDate: "",
  });
  const [showDetail, setShowDetail] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    const params = { page, limit: 10, ...filters };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    const r = await api.get("/admin/transactions", { params });
    setTransactions(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  const handleExport = async () => {
    try {
      const r = await api.get("/reports/export/transactions", {
        params: filters,
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${Date.now()}.xlsx`;
      link.click();
      toast.success("Exported!");
    } catch (e) {
      toast.error("Export failed.");
    }
  };

  const columns = [
    { header: "ID", key: "id" },
    {
      header: "Amount",
      render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
    },
    { header: "UTR Number", render: (r) => r.utrNumber || "-" },
    { header: "UPI ID", render: (r) => r.upiId || "-" },
    { header: "Merchant", render: (r) => r.merchant?.name || "-" },
    { header: "Agent", render: (r) => r.agent?.name || "-" },
    { header: "Operator", render: (r) => r.operator?.name || "-" },
    {
      header: "Created",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Transaction List" />
      <DataTable
        columns={columns}
        data={transactions}
        total={total}
        page={page}
        onPageChange={setPage}
        loading={loading}
        onExport={handleExport}
        onSearch={(v) => setFilters({ ...filters, search: v })}
        filters={
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PICKED">Picked</option>
              <option value="CLEARED">Cleared</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <DateFilter
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartChange={(v) => setFilters({ ...filters, startDate: v })}
              onEndChange={(v) => setFilters({ ...filters, endDate: v })}
            />
          </div>
        }
        actions={(row) => (
          <button
            onClick={() => setShowDetail(row)}
            className="text-brand-500 text-sm hover:underline"
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
          <div className="space-y-3 text-sm">
            {Object.entries({
              Amount: `₹${parseFloat(showDetail.amount).toLocaleString()}`,
              "Transaction Type": showDetail.transactionType,
              "UPI ID": showDetail.upiId || "-",
              "Account Number": showDetail.accountNumber || "-",
              IFSC: showDetail.ifscCode || "-",
              "UTR Number": showDetail.utrNumber || "-",
              Status: showDetail.status,
              Merchant: showDetail.merchant?.name || "-",
              Agent: showDetail.agent?.name || "-",
              Operator: showDetail.operator?.name || "-",
              Created: new Date(showDetail.createdAt).toLocaleString(),
              Cleared: showDetail.transactionClearTime
                ? new Date(showDetail.transactionClearTime).toLocaleString()
                : "-",
            }).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between py-1.5 border-b border-gray-50"
              >
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN CONFIGURATION (Rate Config)
// ═══════════════════════════════════════════
export function AdminConfiguration() {
  const [merchants, setMerchants] = useState([]);
  const [agents, setAgents] = useState([]);
  const [existingRates, setExistingRates] = useState([]);
  const [form, setForm] = useState({
    type: "merchant",
    entityId: "",
    usdtTodayRate: "",
    aedTodayRate: "",
    currency: "AED",
  });
  const [editRate, setEditRate] = useState(null);

  const fetchRates = () => {
    api.get("/config/rates").then((r) => setExistingRates(r.data.data || []));
  };

  useEffect(() => {
    api
      .get("/admin/merchants?limit=100")
      .then((r) => setMerchants(r.data.data));
    api.get("/admin/agents?limit=100").then((r) => setAgents(r.data.data));
    fetchRates();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        usdtTodayRate: form.usdtTodayRate,
        aedTodayRate: form.aedTodayRate,
        currency: form.currency,
      };
      if (form.type === "merchant") data.merchantId = form.entityId;
      else data.agentId = form.entityId;
      await api.post("/config/rates", data);
      toast.success("Rate updated!");
      setForm({
        type: "merchant",
        entityId: "",
        usdtTodayRate: "",
        aedTodayRate: "",
        currency: "AED",
      });
      fetchRates();
    } catch (e) {
      toast.error("Error updating rate.");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        usdtTodayRate: editRate.usdtTodayRate,
        aedTodayRate: editRate.aedTodayRate,
      };
      if (editRate.merchantId) data.merchantId = editRate.merchantId;
      if (editRate.agentId) data.agentId = editRate.agentId;
      await api.post("/config/rates", data);
      toast.success("Rate updated!");
      setEditRate(null);
      fetchRates();
    } catch (e) {
      toast.error("Error.");
    }
  };

  const getMerchantName = (id) =>
    merchants.find((m) => m.id === id)?.name || "-";
  const getAgentName = (id) => agents.find((a) => a.id === id)?.name || "-";

  return (
    <div>
      <PageHeader
        title="Configuration"
        subtitle="Set AED and USDT rates per merchant or agent"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Set New Rate
          </h3>
          <form onSubmit={handleUpdate}>
            <FormSelect
              label="Type"
              options={[
                { value: "merchant", label: "Merchant" },
                { value: "agent", label: "Agent" },
              ]}
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value, entityId: "" })
              }
            />
            <FormSelect
              label={
                form.type === "merchant" ? "Select Merchant" : "Select Agent"
              }
              required
              placeholder="Select..."
              options={(form.type === "merchant" ? merchants : agents).map(
                (e) => ({ value: e.id, label: e.name }),
              )}
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value })}
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
              placeholder="e.g. 92"
            />
            <FormInput
              label="AED Today Rate"
              required
              type="number"
              step="0.0001"
              value={form.aedTodayRate}
              onChange={(e) =>
                setForm({ ...form, aedTodayRate: e.target.value })
              }
              placeholder="e.g. 26.05"
            />
            <Button type="submit" className="w-full">
              Update Rate
            </Button>
          </form>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Current Rates
          </h3>
          {existingRates.length === 0 ? (
            <p className="text-sm text-gray-400">No rates configured yet.</p>
          ) : (
            <div className="space-y-3">
              {existingRates.map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-mac"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {rate.merchantId
                        ? `Merchant: ${getMerchantName(rate.merchantId)}`
                        : ""}
                      {rate.agentId
                        ? `Agent: ${getAgentName(rate.agentId)}`
                        : ""}
                      {!rate.merchantId && !rate.agentId ? "Global" : ""}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>
                        AED:{" "}
                        <strong className="text-green-600">
                          {parseFloat(rate.aedTodayRate).toFixed(4)}
                        </strong>
                      </span>
                      <span>
                        USDT:{" "}
                        <strong className="text-blue-600">
                          {parseFloat(rate.usdtTodayRate).toFixed(4)}
                        </strong>
                      </span>
                      <span>
                        Updated: {new Date(rate.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEditRate({
                        ...rate,
                        aedTodayRate: parseFloat(rate.aedTodayRate),
                        usdtTodayRate: parseFloat(rate.usdtTodayRate),
                      })
                    }
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-sm transition-mac"
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal
        open={!!editRate}
        onClose={() => setEditRate(null)}
        title="Edit Rate"
      >
        {editRate && (
          <form onSubmit={handleEdit}>
            <p className="text-sm text-gray-500 mb-4">
              {editRate.merchantId
                ? `Merchant: ${getMerchantName(editRate.merchantId)}`
                : ""}
              {editRate.agentId
                ? `Agent: ${getAgentName(editRate.agentId)}`
                : ""}
            </p>
            <FormInput
              label="AED Today Rate"
              required
              type="number"
              step="0.0001"
              value={editRate.aedTodayRate}
              onChange={(e) =>
                setEditRate({ ...editRate, aedTodayRate: e.target.value })
              }
            />
            <FormInput
              label="USDT Today Rate"
              required
              type="number"
              step="0.0001"
              value={editRate.usdtTodayRate}
              onChange={(e) =>
                setEditRate({ ...editRate, usdtTodayRate: e.target.value })
              }
            />
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN COLLECTIONS
// ═══════════════════════════════════════════
export function AdminCollections() {
  const [collections, setCollections] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    merchantId: "",
    description: "",
  });

  useEffect(() => {
    api.get("/admin/collections").then((r) => setCollections(r.data.data));
    api
      .get("/admin/merchants?limit=100")
      .then((r) => setMerchants(r.data.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/collections", form);
      toast.success("Collection created!");
      setShowCreate(false);
      api.get("/admin/collections").then((r) => setCollections(r.data.data));
    } catch (e) {
      toast.error("Error.");
    }
  };

  const columns = [
    { header: "ID", key: "id" },
    {
      header: "Amount",
      render: (r) => `₹${parseFloat(r.amount).toLocaleString()}`,
    },
    { header: "Merchant", render: (r) => r.merchant?.name || "-" },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      header: "Created",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Collections"
        action={<Button onClick={() => setShowCreate(true)}>Create</Button>}
      />
      <DataTable
        columns={columns}
        data={collections}
        total={collections.length}
        page={1}
      />
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Collection Form"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="Amount"
            required
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <FormSelect
            label="Select Merchant"
            required
            placeholder="Select Option"
            options={merchants.map((m) => ({ value: m.id, label: m.name }))}
            value={form.merchantId}
            onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
          />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
          <Button type="submit" className="w-full">
            Save Collection
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// DAILY REPORT (Reusable)
// ═══════════════════════════════════════════
export function DailyReport({ apiPath = "/reports/daily" }) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split("T")[0];
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (startDate && endDate) {
      api
        .get(apiPath, { params: { startDate, endDate } })
        .then((r) => setData(r.data.data));
    }
  }, [startDate, endDate, apiPath]);

  const handleDownload = async () => {
    try {
      const r = await api.get("/reports/daily/pdf", {
        params: { startDate, endDate },
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([r.data], { type: "application/pdf" }),
      );
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Download failed.");
    }
  };

  return (
    <div>
      <PageHeader title="Download Daily Report" />
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-3xl">
        <div className="flex gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Pay Out"
            value={data?.totalPayOut || 0}
            index={0}
          />
          <StatCard
            title="Total Commission"
            value={data?.totalCommission || 0}
            index={1}
          />
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Amount by Currency</p>
            <p className="text-lg font-semibold text-gray-400">
              {data?.amountByCurrency || "No Data"}
            </p>
          </div>
        </div>
        <div className="text-center">
          <Button onClick={handleDownload}>Download Report</Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// BLOCKED IFSC
// ═══════════════════════════════════════════
export function AdminBlockedIfsc() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ifscCode: "", reason: "" });

  const fetchData = () =>
    api.get("/admin/blocked-ifsc").then((r) => setItems(r.data.data));
  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/blocked-ifsc", form);
      toast.success("IFSC blocked!");
      setShowCreate(false);
      setForm({ ifscCode: "", reason: "" });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/blocked-ifsc/${id}`);
    toast.success("Unblocked.");
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Blocked IFSC"
        action={<Button onClick={() => setShowCreate(true)}>Block IFSC</Button>}
      />
      <DataTable
        columns={[
          { header: "IFSC Code", key: "ifscCode" },
          { header: "Reason", render: (r) => r.reason || "-" },
          {
            header: "Created",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
        data={items}
        total={items.length}
        page={1}
        actions={(r) => (
          <button
            onClick={() => handleDelete(r.id)}
            className="text-red-500 text-sm hover:underline"
          >
            Unblock
          </button>
        )}
      />
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Block IFSC"
      >
        <form onSubmit={handleCreate}>
          <FormInput
            label="IFSC Code"
            required
            value={form.ifscCode}
            onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
          />
          <FormInput
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Block
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN LEDGER - Daily Collection
// ═══════════════════════════════════════════
export function AdminLedger() {
  const [merchantLedger, setMerchantLedger] = useState([]);
  const [agentLedger, setAgentLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [view, setView] = useState("merchant"); // merchant | agent
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    setSelectedName("");
    setLoading(true);
    const params = {};
    if (selectedDate) { params.startDate = selectedDate; params.endDate = selectedDate; }
    api.get("/admin/ledger", { params })
      .then((r) => {
        setMerchantLedger(r.data.merchantLedger || []);
        setAgentLedger(r.data.agentLedger || []);
        setSummary(r.data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);



  const isMerchant = view === "merchant";
  const rows = isMerchant ? merchantLedger : agentLedger;
  const filteredRows = rows.filter((r) => !selectedName || r.name === selectedName);

  const grandPending = filteredRows.reduce((s, r) => s + r.pending, 0);
  const grandPendingAed = filteredRows.reduce((s, r) => s + r.pendingAed, 0);
  const grandSettled = filteredRows.reduce((s, r) => s + r.settled, 0);
  const grandSettledAed = filteredRows.reduce((s, r) => s + r.settledAed, 0);
  const grandTotal = filteredRows.reduce((s, r) => s + r.total, 0);
  const grandTotalAed = grandTotal / (summary?.aedRate || 1);

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
// ═══════════════════════════════════════════
// ADMIN TRIAL BALANCE
// ═══════════════════════════════════════════
export function AdminTrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [aedRate, setAedRate] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const [r, rateRes] = await Promise.all([
      api.get("/admin/trial-balance", { params }),
      api.get("/config/current-rates"),
    ]);
    setData(r.data.data);
    const rt = rateRes.data.data?.[0];
    if (rt) setAedRate(parseFloat(rt.aedTodayRate || 1));
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const credit = (data?.credit || []).filter(
    (e) => !search || e.name.toLowerCase().includes(search.toLowerCase()),
  );
  const debit = (data?.debit || []).filter(
    (e) => !search || e.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toAed = (inr) => (aedRate > 0 ? inr / aedRate : 0);


  const adminComm = parseFloat(data?.totalAdminCommission || 0);
  const totalCredit = credit.reduce(
    (s, e) => s + (parseFloat(e.pending) || 0),
    0,
  );
  const totalDebit = debit.reduce(
    (s, e) => s + (parseFloat(e.pending) || 0),
    0,
  );
  const totalCreditWithComm = totalCredit + adminComm;
  const maxRows = Math.max(credit.length + 1, debit.length, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Final Trial Balance" />
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-t-xl px-4 py-3 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Party Name</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-8 px-3 text-sm border border-gray-300 rounded-lg w-48 outline-none focus:border-brand-500"
        />
        <button
          onClick={fetchData}
          className="h-8 px-4 bg-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300"
        >
          Show
        </button>
        <button
          onClick={() => window.print()}
          className="h-8 px-4 bg-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300"
        >
          Print
        </button>
        <button
          onClick={fetchData}
          className="h-8 px-4 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-b-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th
                colSpan={3}
                className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-bold text-blue-800"
              >
                Credit / Jama / Dena (Agent Ko Dena)
              </th>
              <th
                colSpan={3}
                className="border border-gray-300 bg-red-50 px-3 py-2 text-center font-bold text-red-800"
              >
                Debit / Nama / Lena (Merchant Se Lena)
              </th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Agent
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (INR)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (AED)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Merchant
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (INR)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (AED)
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {i < credit.length ? (
                    credit[i].name
                  ) : i === credit.length ? (
                    <span className="font-semibold text-purple-700">
                      ADMIN COMMISSION
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-blue-700">
                  {i < credit.length
                    ? fmt(credit[i].pending)
                    : i === credit.length
                      ? fmt(adminComm)
                      : ""}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-blue-500">
                  {i < credit.length
                    ? fmt(toAed(credit[i].pending))
                    : i === credit.length
                      ? fmt(toAed(adminComm))
                      : ""}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {debit[i]?.name || ""}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-red-600">
                  {debit[i] ? fmt(debit[i].pending) : ""}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-red-400">
                  {debit[i] ? fmt(toAed(debit[i].pending)) : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-brand-500 text-white font-bold">
              <td colSpan={2} className="border border-gray-300 px-3 py-2">
                Total Dena + Commission
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>{fmt(totalCreditWithComm)}</div>
                <div className="text-xs font-normal opacity-90">
                  AED {fmt(toAed(totalCreditWithComm))}
                </div>
              </td>
              <td colSpan={2} className="border border-gray-300 px-3 py-2">
                Total Lena (Pending)
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                <div>{fmt(totalDebit)}</div>
                <div className="text-xs font-normal opacity-90">
                  AED {fmt(toAed(totalDebit))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">
            Total Dena to Agents (INR)
          </div>
          <div className="font-bold text-blue-700">₹{fmt(totalCredit)}</div>
          <div className="text-xs text-blue-500 mt-0.5">
            AED {fmt(toAed(totalCredit))}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Admin Commission (INR)</div>
          <div className="font-bold text-purple-700">₹{fmt(adminComm)}</div>
          <div className="text-xs text-purple-500 mt-0.5">
            AED {fmt(toAed(adminComm))}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">
            Total Dena + Commission (INR)
          </div>
          <div className="font-bold text-blue-700">
            ₹{fmt(totalCreditWithComm)}
          </div>
          <div className="text-xs text-blue-500 mt-0.5">
            AED {fmt(toAed(totalCreditWithComm))}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">
            Total Lena from Merchants (INR)
          </div>
          <div className="font-bold text-red-700">₹{fmt(totalDebit)}</div>
          <div className="text-xs text-red-500 mt-0.5">
            AED {fmt(toAed(totalDebit))}
          </div>
        </div>
        <div
          className={`border rounded-xl px-4 py-3 ${totalDebit - totalCreditWithComm === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="text-gray-500 text-xs">Difference (should be 0)</div>
          <div
            className={`font-bold ${totalDebit - totalCreditWithComm === 0 ? "text-green-700" : "text-red-700"}`}
          >
            ₹{fmt(totalDebit - totalCreditWithComm)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            AED {fmt(toAed(totalDebit - totalCreditWithComm))}
          </div>
        </div>
      </div>
    </div>
  );
}


export function AdminExpenseManagers() {
  const [managers, setManagers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchManagers = async () => {
    const r = await api.get("/admin/expense-managers");
    setManagers(r.data.data || []);
  };

  useEffect(() => { fetchManagers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/admin/expense-managers", form);
      toast.success("Expense Manager created!");
      setShowCreate(false);
      setForm({ name: "", username: "", password: "" });
      fetchManagers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error.");
    }
  };

  const columns = [
    { header: "Sr No.", render: (r) => managers.indexOf(r) + 1 },
    { header: "Name", key: "name" },
    { header: "Username", key: "username" },
    { header: "Status", render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} /> },
    { header: "Created", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader
        title="Expense Managers"
        action={<Button onClick={() => setShowCreate(true)}>Add Expense Manager</Button>}
      />
      <DataTable
        columns={columns}
        data={managers}
        total={managers.length}
        page={1}
        actions={(row) => (
          <div className="flex gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Username: ${row.username}\nPassword: ${row.plainPassword || "N/A"}\nLogin: ${window.location.origin}/login`
                );
                toast.success("Copied!");
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-sm"
              title="Copy credentials"
            >📋</button>
            <button
              onClick={async () => {
                try {
                  await impersonate(row.id);
                  navigate("/expense-manager");
                } catch (e) {
                  toast.error("Failed.");
                }
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
              title="Login as Expense Manager"
            >🔑</button>
          </div>
        )}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Expense Manager">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name" />
          <FormInput label="Username" required value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Login username" />
          <FormInput label="Password" required type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Login password" />
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>
    </div>
  );
}