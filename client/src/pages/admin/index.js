import React, { useState, useEffect, useCallback } from "react";
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
        <StatCard
          title="Total RTGS Amount"
          value={stats?.totalRtgsAmount || 0}
          index={0}
        />
        <StatCard
          title="Pending"
          value={stats?.totalPending || 0}
          prefix=""
          index={1}
        />
        <StatCard
          title="Picked / In Process"
          value={stats?.totalPicked || 0}
          prefix=""
          index={2}
        />
        <StatCard
          title="Cleared"
          value={stats?.totalCleared || 0}
          prefix=""
          index={3}
        />
        <StatCard
          title="Available Details"
          value={stats?.availableLimit || 0}
          index={4}
        />
        <StatCard
          title="Total Used"
          value={stats?.totalUsedLimit || 0}
          index={5}
        />
        <StatCard
          title="Admin Commission"
          value={stats?.totalAdminCommission || 0}
          index={0}
        />
        <StatCard
          title="Merchants"
          value={stats?.merchantCount || 0}
          prefix=""
          index={1}
        />
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
  const [transactions, setTransactions] = useState([]);
  const [merchantRates, setMerchantRates] = useState({});
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/transactions", {
        params: {
          status: "CLEARED",
          startDate: selectedDate,
          endDate: selectedDate,
          limit: 1000,
        },
      }),
      api.get("/config/rates"),
    ])
      .then(([txRes, rateRes]) => {
        setTransactions(txRes.data.data || []);
        const rateMap = {};
        (rateRes.data.data || []).forEach((r) => {
          if (r.merchantId)
            rateMap[r.merchantId] = parseFloat(r.aedTodayRate || 1);
        });
        setMerchantRates(rateMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  const groupByMerchant = () => {
    const groups = {};
    transactions.forEach((tx) => {
      const mName = tx.merchant?.name || "Unknown";
      if (!groups[mName])
        groups[mName] = {
          merchantName: mName,
          merchantId: tx.merchantId || tx.merchant?.id,
          remarks: {},
          totalAmount: 0,
        };
      const remark = tx.notes || "No Remark";
      if (!groups[mName].remarks[remark]) groups[mName].remarks[remark] = 0;
      groups[mName].remarks[remark] += parseFloat(tx.amount);
      groups[mName].totalAmount += parseFloat(tx.amount);
    });
    return groups;
  };

  const merchantGroups = groupByMerchant();
  const grandTotal = Object.values(merchantGroups).reduce(
    (s, g) => s + g.totalAmount,
    0,
  );
  const grandTotalAed = Object.values(merchantGroups).reduce((s, g) => {
    const mRate = merchantRates[g.merchantId] || 1;
    return s + (mRate > 0 ? g.totalAmount / mRate : 0);
  }, 0);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Daily Collection Ledger" />
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

      <div className="bg-green-500 text-white text-center py-3 rounded-t-xl font-bold text-lg">
        DAILY COLLECTION (
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
            <tr className="bg-green-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-[140px]">
                PARTY
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-[180px]">
                GROUP
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[120px]">
                TODAY AMOUNT (INR)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[120px]">
                TODAY AMOUNT (AED)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[140px]">
                PREVIOUS OUTSTANDING (AED)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[120px]">
                RECEIVED (AED)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[130px]">
                OUTSTANDING (AED)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[100px]">
                LIMIT
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(merchantGroups).length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-gray-200 px-3 py-6 text-center text-gray-400"
                >
                  No cleared transactions for this date.
                </td>
              </tr>
            ) : (
              Object.values(merchantGroups).map((group, gIdx) => {
                const remarkEntries = Object.entries(group.remarks);
                const mRate = merchantRates[group.merchantId] || 1;
                const todayAed = mRate > 0 ? group.totalAmount / mRate : 0;
                const outstanding = todayAed;
                return remarkEntries.map(([remark, amount], rIdx) => (
                  <tr
                    key={`${gIdx}-${rIdx}`}
                    className={gIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 font-semibold text-gray-800 align-top"
                        rowSpan={remarkEntries.length}
                      >
                        {group.merchantName.toUpperCase()}
                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                          Rate: {mRate}
                        </div>
                      </td>
                    )}
                    <td className="border border-gray-200 px-3 py-1.5 text-gray-600">
                      {remark}
                    </td>
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right font-medium align-top"
                        rowSpan={remarkEntries.length}
                      >
                        ₹
                        {group.totalAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right font-medium align-top"
                        rowSpan={remarkEntries.length}
                      >
                        {todayAed.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right text-gray-400 align-top"
                        rowSpan={remarkEntries.length}
                      >
                        -
                      </td>
                    )}
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right text-gray-400 align-top"
                        rowSpan={remarkEntries.length}
                      >
                        -
                      </td>
                    )}
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right font-semibold text-red-600 align-top"
                        rowSpan={remarkEntries.length}
                      >
                        {outstanding.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {rIdx === 0 && (
                      <td
                        className="border border-gray-200 px-3 py-1.5 text-right text-gray-400 align-top"
                        rowSpan={remarkEntries.length}
                      >
                        -
                      </td>
                    )}
                  </tr>
                ));
              })
            )}
            <tr>
              <td
                colSpan={8}
                className="border border-gray-200 h-1 bg-gray-100"
              ></td>
            </tr>
            <tr className="bg-green-500 text-white font-bold">
              <td className="border border-gray-300 px-3 py-2" colSpan={2}>
                TOTAL
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                ₹
                {grandTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {grandTotalAed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">-</td>
              <td className="border border-gray-300 px-3 py-2 text-right">-</td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {grandTotalAed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total INR:</span>
          <span className="ml-2 font-bold text-gray-800">
            ₹
            {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Total AED:</span>
          <span className="ml-2 font-bold text-green-700">
            {grandTotalAed.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Rates:</span>
          <span className="ml-2 font-bold">Per Merchant</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span className="text-gray-500">Merchants:</span>
          <span className="ml-2 font-bold">
            {Object.keys(merchantGroups).length}
          </span>
        </div>
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
  const [merchantRates, setMerchantRates] = useState({});
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const [r, rateRes] = await Promise.all([
      api.get("/admin/trial-balance", { params }),
      api.get("/config/rates"),
    ]);
    setData(r.data.data);
    const rateMap = {};
    (rateRes.data.data || []).forEach((rt) => {
      if (rt.merchantId)
        rateMap[rt.merchantId] = parseFloat(rt.aedTodayRate || 1);
      if (rt.agentId)
        rateMap["agent_" + rt.agentId] = parseFloat(rt.aedTodayRate || 1);
    });
    setMerchantRates(rateMap);
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

  // Admin commission (deducted from credit side)
  const totalAdminComm =
    data?.totalAdminCommission ||
    credit.reduce((s, e) => s + (e.commission || 0), 0);
  const creditExtras = [];
  if (totalAdminComm > 0)
    creditExtras.push({ name: "ADMIN COMMISSION", amount: totalAdminComm });

  const debitExtras = [];

  // Credit total = agent amounts (no deduction)
  const totalCredit = credit.reduce((s, e) => s + e.amount, 0);
  // Debit total = merchant amounts
  const totalDebit = debit.reduce((s, e) => s + e.amount, 0);
  const maxCreditRows = Math.max(credit.length, creditExtras.length, 1);
  const maxDebitRows = Math.max(debit.length, debitExtras.length, 1);
  const maxRows = Math.max(maxCreditRows, maxDebitRows);
  // AED conversions
  const totalDebitAed = credit.reduce((s, e) => {
    const rate =
      merchantRates["agent_" + e.id] || Object.values(merchantRates)[0] || 1;
    return s + (rate > 0 ? e.amount / rate : 0);
  }, 0);
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
                colSpan={4}
                className="border border-gray-300 bg-blue-50 px-3 py-2 text-center font-bold text-blue-800"
              >
                Credit / Jama / Dena
              </th>
              <th
                colSpan={4}
                className="border border-gray-300 bg-red-50 px-3 py-2 text-center font-bold text-red-800"
              >
                Debit / Lena
              </th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (Cr)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (Cr)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (Dr)
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">
                Amount (Dr)
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {/* Credit Col 1 - Agents */}
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {credit[i] ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      {credit[i].name}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-blue-700">
                  {credit[i] ? (
                    <div>
                      <div>
                        {(
                          credit[i].amount - credit[i].commission
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                </td>
                {/* Credit Col 2 - Extras (Admin Commission etc) */}
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {creditExtras[i] ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      {creditExtras[i].name}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-blue-700">
                  {creditExtras[i]
                    ? `${creditExtras[i].amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                    : ""}
                </td>
                {/* Debit Col 1 - Merchants */}
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {debit[i] ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      {debit[i].name}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-red-600">
                  {debit[i]
                    ? `-${debit[i].amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                    : ""}
                </td>
                {/* Debit Col 2 - Extras (Agent Commission etc) */}
                <td className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {debitExtras[i] ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300"
                      />
                      {debitExtras[i].name}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border border-gray-200 px-2 py-1.5 text-right font-medium text-red-600">
                  {debitExtras[i]
                    ? `-${debitExtras[i].amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                    : ""}
                </td>
              </tr>
            ))}

            <tr className="bg-gray-200 font-bold">
              <td
                colSpan={3}
                className="border border-gray-300 px-3 py-2 text-blue-800"
              >
                Credit / Jama / Dena Total
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right text-blue-800">
                {totalCredit.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                })}
              </td>
              <td
                colSpan={3}
                className="border border-gray-300 px-3 py-2 text-red-800"
              >
                Debit / Name / Lena Total
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right text-red-800">
                -
                {totalDebit.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="text-gray-500 text-xs">Total Lena (INR / AED)</div>
          <div className="font-bold text-red-700">
            ₹
            {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-red-500 mt-0.5">
            AED{" "}
            {totalDebitAed.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
