import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect, StatusBadge } from '../../components/common';
import toast from 'react-hot-toast';

export function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/superadmin/dashboard').then(r => setStats(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Super Admin Dashboard" subtitle="System overview" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Total Admins" value={stats?.totalAdmins || 0} prefix="" index={0} />
        <StatCard title="Total Merchants" value={stats?.totalMerchants || 0} prefix="" index={1} />
        <StatCard title="Total Agents" value={stats?.totalAgents || 0} prefix="" index={2} />
        <StatCard title="Total Collectors" value={stats?.totalCollectors || 0} prefix="" index={3} />
        <StatCard title="Total Users" value={stats?.totalUsers || 0} prefix="" index={4} />
      </div>
    </div>
  );
}

export function AdminsList() {
  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreds, setShowCreds] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchAdmins = async () => { setLoading(true); const r = await api.get(`/superadmin/admins?page=${page}&limit=10`); setAdmins(r.data.data); setTotal(r.data.total); setLoading(false); };
  useEffect(() => { fetchAdmins(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/superadmin/admins', form);
      toast.success('Admin created!');
      setShowCreate(false);
      setShowCreds(r.data.credentials); // show credentials modal
      setForm({ name: '', username: '', password: '' });
      fetchAdmins();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleImpersonate = async (userId) => {
    try {
      const user = await impersonate(userId);
      const routes = { ADMIN: '/admin', MERCHANT: '/merchant', SUB_MERCHANT: '/submerchant', AGENT: '/agent', OPERATOR: '/operator', COLLECTOR: '/collector' };
      navigate(routes[user.role] || '/admin');
    } catch (e) { toast.error('Failed.'); }
  };

  const handleCopyCredentials = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const columns = [
    { header: 'Sr No.', render: (r) => admins.indexOf(r) + 1 + (page - 1) * 10 },
    { header: 'Admin Name', key: 'name' },
    { header: 'Username', key: 'username' },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
    { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <div>
      <PageHeader title="Admins" action={<Button onClick={() => setShowCreate(true)}>Add New</Button>} />
      <DataTable columns={columns} data={admins} total={total} page={page} onPageChange={setPage} loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => handleCopyCredentials(`Username: ${row.username}\nPassword: ${row.plainPassword || 'N/A'}\nLogin: ${window.location.origin}/login`)} title="Copy Username" className="p-1.5 rounded-lg hover:bg-gray-100 transition-mac text-sm">📋</button>
            <button onClick={() => handleImpersonate(row.id)} title="Login as" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-mac">🔑</button>
            <button onClick={async () => { await api.delete(`/superadmin/admins/${row.id}`); fetchAdmins(); }} title="Deactivate" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-mac">❌</button>
          </div>
        )}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Admin">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Admin Name" />
          <FormInput label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username" />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" />
          <Button type="submit" className="w-full mt-2">Create Admin</Button>
        </form>
      </Modal>

      {/* Credentials Copy Modal */}
      <Modal open={!!showCreds} onClose={() => setShowCreds(null)} title="Credentials Created">
        {showCreds && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Username</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{showCreds.username}</span>
                  <button onClick={() => handleCopyCredentials(showCreds.username)} className="text-brand-500 text-sm hover:underline">Copy</button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{showCreds.password}</span>
                  <button onClick={() => handleCopyCredentials(showCreds.password)} className="text-brand-500 text-sm hover:underline">Copy</button>
                </div>
              </div>
            </div>
            <Button onClick={() => handleCopyCredentials(`Username: ${showCreds.username}\nPassword: ${showCreds.password}`)} className="w-full" variant="outline">Copy All</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══ ALL USERS TAB ═══
export function AllUsersList() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (roleFilter) params.role = roleFilter;
    const r = await api.get('/superadmin/users', { params });
    setUsers(r.data.data); setTotal(r.data.total); setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleImpersonate = async (userId) => {
    try {
      const user = await impersonate(userId);
      const routes = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', MERCHANT: '/merchant', SUB_MERCHANT: '/submerchant', AGENT: '/agent', OPERATOR: '/operator', COLLECTOR: '/collector' };
      navigate(routes[user.role] || '/');
    } catch (e) { toast.error('Failed.'); }
  };

  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Username', key: 'username' },
    { header: 'Role', render: r => <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{r.role?.replace(/_/g, ' ')}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="All Users" subtitle="View and manage all users across all roles" />
      <DataTable columns={columns} data={users} total={total} page={page} onPageChange={setPage} loading={loading}
        onSearch={v => { setPage(1); /* search handled server-side */ }}
        filters={
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-gray-200 rounded-lg">
            <option value="">All Roles</option>
            {['SUPER_ADMIN', 'ADMIN', 'MERCHANT', 'SUB_MERCHANT', 'AGENT', 'OPERATOR', 'COLLECTOR'].map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        }
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => navigator.clipboard.writeText(`Username: ${row.username}\nPassword: ${row.plainPassword || 'N/A'}\nLogin: ${window.location.origin}/login`).then(() => toast.success('Credentials copied!'))} title="Copy Username" className="p-1.5 rounded-lg hover:bg-gray-100 text-sm">📋</button>
            <button onClick={() => handleImpersonate(row.id)} title="Login as" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">🔑</button>
          </div>
        )}
      />
    </div>
  );
}

// ═══ LOGIN HISTORY ═══
export function LoginHistoryList() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/auth/login-history?page=${page}&limit=20`).then(r => { setData(r.data.data); setTotal(r.data.total); setLoading(false); });
  }, [page]);
  return (
    <div>
      <PageHeader title="Login History" subtitle="Track all user login activity" />
      <DataTable columns={[
        { header: 'User', render: r => r.user?.name || '-' },
        { header: 'Username', render: r => r.user?.username || '-' },
        { header: 'Role', render: r => <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.user?.role?.replace(/_/g, ' ')}</span> },
        { header: 'IP Address', key: 'ipAddress' },
        { header: 'User Agent', render: r => <span className="text-xs text-gray-500 truncate block max-w-[200px]">{r.userAgent?.substring(0, 60) || '-'}</span> },
        { header: 'Login Time', render: r => new Date(r.loginAt).toLocaleString() },
      ]} data={data} total={total} page={page} onPageChange={setPage} loading={loading} />
    </div>
  );
}

// ═══ EXPENSE ENTRIES (SuperAdmin view) ═══
export function ExpenseEntriesView() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  useEffect(() => {
    api.get(`/superadmin/expense-entries?page=${page}&limit=20`).then(r => { setData(r.data.data); setTotal(r.data.total); });
  }, [page]);
  return (
    <div>
      <PageHeader title="All Expense Entries" subtitle="View all expense entries from expense managers" />
      <DataTable columns={[
        { header: 'Category', key: 'category' },
        { header: 'Date', render: r => new Date(r.expenseDate).toLocaleDateString() },
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'Description', render: r => r.description || '-' },
        { header: 'Invoice', render: r => r.invoiceImage ? <a href={`/uploads/expense-invoices/${r.invoiceImage}`} target="_blank" rel="noreferrer" className="text-brand-500 text-sm">View</a> : '-' },
        { header: 'Created By', render: r => r.createdByUser?.name || '-' },
        { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
      ]} data={data} total={total} page={page} onPageChange={setPage} />
    </div>
  );
}
