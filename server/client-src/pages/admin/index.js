import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect, FormTextarea, Toggle, StatusBadge, DateFilter } from '../../components/common';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════
export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const r = await api.get('/admin/dashboard', { params });
    setStats(r.data.data);
  }, [startDate, endDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Admin Dashboard" />
        <DateFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total RTGS Amount" value={stats?.totalRtgsAmount || 0} index={0} />
        <StatCard title="Pending" value={stats?.totalPending || 0} prefix="" index={1} />
        <StatCard title="Picked / In Process" value={stats?.totalPicked || 0} prefix="" index={2} />
        <StatCard title="Cleared" value={stats?.totalCleared || 0} prefix="" index={3} />
        <StatCard title="Available Details" value={stats?.availableLimit || 0} index={4} />
        <StatCard title="Total Used" value={stats?.totalUsedLimit || 0} index={5} />
        <StatCard title="Admin Commission" value={stats?.totalAdminCommission || 0} index={0} />
        <StatCard title="Merchants" value={stats?.merchantCount || 0} prefix="" index={1} />
      </div>
    </div>
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
  const [form, setForm] = useState({
    name: '', description: '', maxPaymentLimit: '', commissionChargePercent: '',
    username: '', password: '', assignAgentIds: [], isActive: true,
  });

  const fetchMerchants = async () => {
    setLoading(true);
    const r = await api.get(`/admin/merchants?page=${page}&limit=10`);
    setMerchants(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  const fetchAgents = async () => {
    const r = await api.get('/admin/agents?limit=100');
    setAgents(r.data.data);
  };

  useEffect(() => { fetchMerchants(); fetchAgents(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/merchants', form);
      toast.success('Merchant created!');
      setShowCreate(false);
      setForm({ name: '', description: '', maxPaymentLimit: '', commissionChargePercent: '', username: '', password: '', assignAgentIds: [], isActive: true });
      fetchMerchants();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleToggle = async (merchant) => {
    try {
      await api.put(`/admin/merchants/${merchant.id}`, { isActive: !merchant.isActive });
      toast.success('Updated.');
      fetchMerchants();
    } catch (e) { toast.error('Error.'); }
  };

  const columns = [
    { header: 'Sr No.', render: (r) => merchants.indexOf(r) + 1 + (page - 1) * 10 },
    { header: 'Mer. Name', key: 'name' },
    { header: 'Mer. Username', render: r => r.user?.username || '-' },
    { header: 'Transactions', render: r => r._count?.transactions || 0 },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
    { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <div>
      <PageHeader title="Merchants" action={<Button onClick={() => setShowCreate(true)}>Add Merchant</Button>} />

      <DataTable columns={columns} data={merchants} total={total} page={page}
        onPageChange={setPage} loading={loading}
        actions={(row) => (
          <div className="flex gap-1">
            <button onClick={() => handleToggle(row)}
              className={`p-1.5 rounded-lg transition-mac ${row.isActive ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}>
              {row.isActive ? '⏸' : '▶️'}
            </button>
          </div>
        )}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Merchant Form" maxWidth="max-w-xl">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Merchant Name" />
          <FormTextarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          <FormInput label="Maximum Payment Limit" required type="number" value={form.maxPaymentLimit}
            onChange={e => setForm({ ...form, maxPaymentLimit: e.target.value })} placeholder="e.g 500000" />
          <FormInput label="Commission Charge Percent" required type="number" step="0.01" value={form.commissionChargePercent}
            onChange={e => setForm({ ...form, commissionChargePercent: e.target.value })} placeholder="e.g 4, 0.8, 2.6" />
          <FormSelect label="Assign Agents" options={agents.map(a => ({ value: a.id, label: a.name }))} placeholder="Select agent"
            value={form.assignAgentIds[0] || ''} onChange={e => setForm({ ...form, assignAgentIds: e.target.value ? [e.target.value] : [] })} />
          <FormInput label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Login username" />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Login password" />
          <Toggle label="Is Active" checked={form.isActive} onChange={() => setForm({ ...form, isActive: !form.isActive })} />
          <Button type="submit" className="w-full">Save Merchant</Button>
        </form>
      </Modal>
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
  const [form, setForm] = useState({ name: '', description: '', commissionChargePercent: '', username: '', password: '', isActive: true });

  const fetchAgents = async () => {
    setLoading(true);
    const r = await api.get(`/admin/agents?page=${page}&limit=10`);
    setAgents(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/agents', form);
      toast.success('Agent created!');
      setShowCreate(false);
      setForm({ name: '', description: '', commissionChargePercent: '', username: '', password: '', isActive: true });
      fetchAgents();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const columns = [
    { header: 'Sr No.', render: (r) => agents.indexOf(r) + 1 },
    { header: 'Agent Name', key: 'name' },
    { header: 'Username', render: r => r.user?.username || '-' },
    { header: 'Commission %', key: 'commissionChargePercent' },
    { header: 'Operators', render: r => r._count?.operators || 0 },
    { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <div>
      <PageHeader title="Agents" action={<Button onClick={() => setShowCreate(true)}>Add Agent</Button>} />
      <DataTable columns={columns} data={agents} total={total} page={page} onPageChange={setPage} loading={loading} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Admin Agent Form">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent Name" />
          <FormTextarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          <FormInput label="Commission Charge Percent" required type="number" step="0.01" value={form.commissionChargePercent}
            onChange={e => setForm({ ...form, commissionChargePercent: e.target.value })} placeholder="e.g 4, 0.8, 2.6" />
          <FormInput label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Login username" />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Login password" />
          <Toggle label="Is Active" checked={form.isActive} onChange={() => setForm({ ...form, isActive: !form.isActive })} />
          <Button type="submit" className="w-full">Save Agent</Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// COLLECTORS
// ═══════════════════════════════════════════
export function AdminCollectors() {
  const [collectors, setCollectors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', username: '', password: '' });

  const fetchCollectors = async () => {
    const r = await api.get('/admin/collectors');
    setCollectors(r.data.data);
  };

  useEffect(() => { fetchCollectors(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/collectors', form);
      toast.success('Collector created!');
      setShowCreate(false);
      setForm({ name: '', description: '', username: '', password: '' });
      fetchCollectors();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const columns = [
    { header: 'Sr No.', render: (r) => collectors.indexOf(r) + 1 },
    { header: 'Name', key: 'name' },
    { header: 'Username', render: r => r.user?.username || '-' },
    { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <div>
      <PageHeader title="Collectors" action={<Button onClick={() => setShowCreate(true)}>Add Collector</Button>} />
      <DataTable columns={columns} data={collectors} total={collectors.length} page={1} />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Collector">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Collector Name" />
          <FormTextarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <FormInput label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" className="w-full">Create Collector</Button>
        </form>
      </Modal>
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
  const [filters, setFilters] = useState({ status: '', merchantId: '', agentId: '', startDate: '', endDate: '' });
  const [showDetail, setShowDetail] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    const params = { page, limit: 10, ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    const r = await api.get('/admin/transactions', { params });
    setTransactions(r.data.data);
    setTotal(r.data.total);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, [page, filters]);

  const handleExport = async () => {
    try {
      const r = await api.get('/reports/export/transactions', { params: filters, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${Date.now()}.xlsx`;
      link.click();
      toast.success('Exported!');
    } catch (e) { toast.error('Export failed.'); }
  };

  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
    { header: 'UTR Number', render: r => r.utrNumber || '-' },
    { header: 'UPI ID', render: r => r.upiId || '-' },
    { header: 'Merchant', render: r => r.merchant?.name || '-' },
    { header: 'Agent', render: r => r.agent?.name || '-' },
    { header: 'Operator', render: r => r.operator?.name || '-' },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Transaction List" />
      <DataTable
        columns={columns} data={transactions} total={total} page={page}
        onPageChange={setPage} loading={loading} onExport={handleExport}
        onSearch={v => setFilters({ ...filters, search: v })}
        filters={
          <div className="flex flex-wrap gap-3">
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PICKED">Picked</option>
              <option value="CLEARED">Cleared</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <DateFilter startDate={filters.startDate} endDate={filters.endDate}
              onStartChange={v => setFilters({ ...filters, startDate: v })}
              onEndChange={v => setFilters({ ...filters, endDate: v })} />
          </div>
        }
        actions={(row) => (
          <button onClick={() => setShowDetail(row)} className="text-brand-500 text-sm hover:underline">View All</button>
        )}
      />

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Transaction Details" maxWidth="max-w-md">
        {showDetail && (
          <div className="space-y-3 text-sm">
            {Object.entries({
              'Amount': `₹${parseFloat(showDetail.amount).toLocaleString()}`,
              'Transaction Type': showDetail.transactionType,
              'UPI ID': showDetail.upiId || '-',
              'Account Number': showDetail.accountNumber || '-',
              'IFSC': showDetail.ifscCode || '-',
              'UTR Number': showDetail.utrNumber || '-',
              'Status': showDetail.status,
              'Merchant': showDetail.merchant?.name || '-',
              'Agent': showDetail.agent?.name || '-',
              'Operator': showDetail.operator?.name || '-',
              'Created': new Date(showDetail.createdAt).toLocaleString(),
              'Cleared': showDetail.transactionClearTime ? new Date(showDetail.transactionClearTime).toLocaleString() : '-',
            }).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
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
  const [form, setForm] = useState({ type: 'merchant', entityId: '', usdtTodayRate: '', aedTodayRate: '', currency: 'AED' });

  useEffect(() => {
    api.get('/admin/merchants?limit=100').then(r => setMerchants(r.data.data));
    api.get('/admin/agents?limit=100').then(r => setAgents(r.data.data));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = { usdtTodayRate: form.usdtTodayRate, aedTodayRate: form.aedTodayRate, currency: form.currency };
      if (form.type === 'merchant') data.merchantId = form.entityId;
      else data.agentId = form.entityId;

      await api.post('/config/rates', data);
      toast.success('Rate updated!');
    } catch (e) { toast.error('Error updating rate.'); }
  };

  return (
    <div>
      <PageHeader title="Configuration" subtitle="Set AED and USDT rates per merchant or agent" />
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-lg">
        <form onSubmit={handleUpdate}>
          <FormSelect label="Type" options={[{ value: 'merchant', label: 'Merchant' }, { value: 'agent', label: 'Agent' }]}
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value, entityId: '' })} />

          <FormSelect label={form.type === 'merchant' ? 'Select Merchant' : 'Select Agent'} required placeholder="Select..."
            options={(form.type === 'merchant' ? merchants : agents).map(e => ({ value: e.id, label: e.name }))}
            value={form.entityId} onChange={e => setForm({ ...form, entityId: e.target.value })} />

          <FormInput label="USDT Today Rate" required type="number" step="0.0001" value={form.usdtTodayRate}
            onChange={e => setForm({ ...form, usdtTodayRate: e.target.value })} placeholder="e.g. 3.67" />
          <FormInput label="AED Today Rate" required type="number" step="0.0001" value={form.aedTodayRate}
            onChange={e => setForm({ ...form, aedTodayRate: e.target.value })} placeholder="e.g. 3.67" />

          <Button type="submit" className="w-full">Update Rate</Button>
        </form>
      </div>
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
  const [form, setForm] = useState({ amount: '', merchantId: '', description: '' });

  useEffect(() => {
    api.get('/admin/collections').then(r => setCollections(r.data.data));
    api.get('/admin/merchants?limit=100').then(r => setMerchants(r.data.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/collections', form);
      toast.success('Collection created!');
      setShowCreate(false);
      api.get('/admin/collections').then(r => setCollections(r.data.data));
    } catch (e) { toast.error('Error.'); }
  };

  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
    { header: 'Merchant', render: r => r.merchant?.name || '-' },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="Collections" action={<Button onClick={() => setShowCreate(true)}>Create</Button>} />
      <DataTable columns={columns} data={collections} total={collections.length} page={1} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Collection Form">
        <form onSubmit={handleCreate}>
          <FormInput label="Amount" required type="number" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })} />
          <FormSelect label="Select Merchant" required placeholder="Select Option"
            options={merchants.map(m => ({ value: m.id, label: m.name }))}
            value={form.merchantId} onChange={e => setForm({ ...form, merchantId: e.target.value })} />
          <FormTextarea label="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          <Button type="submit" className="w-full">Save Collection</Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// DAILY REPORT (Reusable)
// ═══════════════════════════════════════════
export function DailyReport({ apiPath = '/reports/daily' }) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (startDate && endDate) {
      api.get(apiPath, { params: { startDate, endDate } }).then(r => setData(r.data.data));
    }
  }, [startDate, endDate, apiPath]);

  const handleDownload = async () => {
    try {
      const r = await api.get('/reports/daily/pdf', { params: { startDate, endDate }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank'); // Opens PDF preview, user can download from there
    } catch (e) { toast.error('Download failed.'); }
  };

  return (
    <div>
      <PageHeader title="Download Daily Report" />
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-3xl">
        <div className="flex gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Pay Out" value={data?.totalPayOut || 0} index={0} />
          <StatCard title="Total Commission" value={data?.totalCommission || 0} index={1} />
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Amount by Currency</p>
            <p className="text-lg font-semibold text-gray-400">{data?.amountByCurrency || 'No Data'}</p>
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
  const [form, setForm] = useState({ ifscCode: '', reason: '' });

  const fetchData = () => api.get('/admin/blocked-ifsc').then(r => setItems(r.data.data));
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/blocked-ifsc', form);
      toast.success('IFSC blocked!');
      setShowCreate(false);
      setForm({ ifscCode: '', reason: '' });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/blocked-ifsc/${id}`);
    toast.success('Unblocked.');
    fetchData();
  };

  return (
    <div>
      <PageHeader title="Blocked IFSC" action={<Button onClick={() => setShowCreate(true)}>Block IFSC</Button>} />
      <DataTable
        columns={[
          { header: 'IFSC Code', key: 'ifscCode' },
          { header: 'Reason', render: r => r.reason || '-' },
          { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
        ]}
        data={items} total={items.length} page={1}
        actions={r => <button onClick={() => handleDelete(r.id)} className="text-red-500 text-sm hover:underline">Unblock</button>}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Block IFSC">
        <form onSubmit={handleCreate}>
          <FormInput label="IFSC Code" required value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value })} />
          <FormInput label="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <Button type="submit" className="w-full">Block</Button>
        </form>
      </Modal>
    </div>
  );
}
