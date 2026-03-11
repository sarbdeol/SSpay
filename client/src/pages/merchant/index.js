import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect, FormTextarea, StatusBadge } from '../../components/common';
import toast from 'react-hot-toast';

export function MerchantDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/merchant/dashboard').then(r => setStats(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Merchant Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard title="Total Commission" value={stats?.totalCommissionAmount || 0} index={0} />
        <StatCard title="Total Pay Out" value={stats?.totalPayOutAmount || 0} index={1} />
        <StatCard title="Pay Out Transactions" value={stats?.totalPayOutTransactions || 0} prefix="" index={2} />
        <StatCard title="Pending" value={stats?.pendingCount || 0} prefix="" index={3} />
        <StatCard title="Pending Amount" value={stats?.pendingAmount || 0} index={4} />
        <StatCard title="Total Payment Dena" value={stats?.totalPaymentDena || 0} index={5} />
      </div>
      <div className="bg-white rounded-2xl shadow-card p-5 max-w-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Limits</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-emerald-600">Available</span><span className="font-semibold">₹{(stats?.availableLimit || 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-amber-600">Used</span><span className="font-semibold">₹{(stats?.usedLimit || 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Maximum</span><span className="font-semibold">₹{(stats?.maxPaymentLimit || 0).toLocaleString()}</span></div>
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

  const fetch = () => { api.get(`/merchant/transactions?page=${page}&limit=10`).then(r => { setTransactions(r.data.data); setTotal(r.data.total); setLoading(false); }); };
  useEffect(() => { fetch(); }, [page]);

  const handleExport = async () => { const r = await api.get('/reports/export/transactions', { responseType: 'blob' }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.data])); a.download = 'transactions.xlsx'; a.click(); };

  return (
    <div>
      <PageHeader title="Transactions List" />
      <DataTable columns={[
        { header: 'ID', key: 'id' },
        { header: 'Amount', render: r => `${r.currency} ${parseFloat(r.amount).toLocaleString()}` },
        { header: 'UTR', render: r => r.utrNumber || '-' },
        { header: 'UPI ID', render: r => r.upiId || '-' },
        { header: 'Remark', render: r => r.notes || '-' },
        { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
        { header: 'Status', render: r => <StatusBadge status={r.status} /> },
      ]} data={transactions} total={total} page={page} onPageChange={setPage} loading={loading} onExport={handleExport}
        actions={r => (
          <div className="flex gap-2">
            <button onClick={() => setShowDetail(r)} className="text-brand-500 text-sm hover:underline">View All</button>
            {r.status === 'CLEARED' && <button onClick={() => { api.get(`/reports/receipt/${r.id}`, { responseType: 'blob' }).then(res => window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank')); }} className="text-emerald-500 text-sm">📥</button>}
          </div>
        )}
      />
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Transaction Details">
        {showDetail && <div className="space-y-2 text-sm">
          {[['Amount', `₹${parseFloat(showDetail.amount).toLocaleString()}`], ['Type', showDetail.transactionType], ['UPI ID', showDetail.upiId || '-'], ['UTR', showDetail.utrNumber || '-'], ['Remark', showDetail.notes || '-'], ['Status', showDetail.status],
            ...(showDetail.status === 'REJECTED' ? [['Reject Reason', showDetail.rejectReason || 'No reason provided']] : []),
            ['Created', new Date(showDetail.createdAt).toLocaleString()], ['Cleared', showDetail.transactionClearTime ? new Date(showDetail.transactionClearTime).toLocaleString() : '-'],
          ].map(([k, v]) => <div key={k} className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className={`font-medium ${k === 'Reject Reason' ? 'text-red-600' : ''}`}>{v}</span></div>)}
        </div>}
      </Modal>
    </div>
  );
}

// ─── Sub-Merchants (with copy credentials + impersonate) ───
export function MerchantSubmerchants() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreds, setShowCreds] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', username: '', password: '' });
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  const fetch = () => api.get('/merchant/submerchants').then(r => setItems(r.data.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { const r = await api.post('/merchant/submerchants', form); toast.success('Created!'); setShowCreate(false); setShowCreds(r.data.credentials); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };
  const handleImpersonate = async (userId) => { try { await impersonate(userId); navigate('/submerchant'); } catch (e) { toast.error('Failed.'); } };

  return (
    <div>
      <PageHeader title="Sub-Merchants" action={<Button onClick={() => setShowCreate(true)}>Create Sub-Merchant</Button>} />
      <DataTable columns={[
        { header: 'Name', key: 'name' }, { header: 'Username', render: r => r.user?.username || '-' },
        { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
      ]} data={items} total={items.length} page={1}
        actions={r => (
          <div className="flex gap-1">
            <button onClick={() => handleCopy(`Username: ${r.user?.username}\nPassword: ${r.user?.plainPassword || 'N/A'}\nLogin: ${window.location.origin}/login`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-sm" title="Copy">📋</button>
            <button onClick={() => handleImpersonate(r.user?.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Login as">🔑</button>
          </div>
        )}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sub-Merchant">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <FormTextarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <FormInput label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>
      <Modal open={!!showCreds} onClose={() => setShowCreds(null)} title="Credentials">
        {showCreds && <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between"><span className="text-gray-500 text-sm">Username</span><span className="font-mono font-semibold">{showCreds.username}</span></div>
          <div className="flex justify-between"><span className="text-gray-500 text-sm">Password</span><span className="font-mono font-semibold">{showCreds.password}</span></div>
          <Button onClick={() => handleCopy(`Username: ${showCreds.username}\nPassword: ${showCreds.password}`)} className="w-full mt-2" variant="outline">Copy All</Button>
        </div>}
      </Modal>
    </div>
  );
}

export function MerchantSettlements() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: '', currency: 'AED', remark: '' });

  const loadItems = () => api.get('/merchant/settlements').then(r => setItems(r.data.data));

  useEffect(() => { loadItems(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/merchant/settlements', form);
      toast.success('Settlement request created!');
      setShowCreate(false);
      setForm({ amount: '', currency: 'AED', remark: '' });
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create settlement.');
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'PENDING':   return 'Pending';
      case 'PICKED':    return 'Picked by Collector';
      case 'SUBMITTED': return 'Submitted by Collector';
      case 'REJECTED':  return 'Rejected by Collector';
      default:          return status;
    }
  };

  const statusStyle = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-emerald-100 text-emerald-700';
      case 'PICKED':    return 'bg-blue-100 text-blue-700';
      case 'REJECTED':  return 'bg-red-100 text-red-700';
      default:          return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div>
      <PageHeader
        title="Settlement Transactions"
        action={<Button onClick={() => setShowCreate(true)}>Create Request</Button>}
      />
      <DataTable
        columns={[
          { header: 'Amount', render: r => `${r.currency} ${parseFloat(r.amount).toLocaleString()}` },
          { header: 'Collector', render: r => r.collector?.name || '-' },
          { header: 'Remark', render: r => r.remark || '-' },
          { header: 'Date', render: r => new Date(r.createdAt).toLocaleString() },
          {
            header: 'Status',
            render: r => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(r.status)}`}>
                {statusLabel(r.status)}
              </span>
            ),
          },
        ]}
        data={items} total={items.length} page={1}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Settlement Request">
        <form onSubmit={handleCreate}>
          <FormSelect
  label="Currency"
  required
  options={[{ value: 'AED', label: 'AED' }, { value: 'USDT', label: 'USDT' }]}
  value={form.currency}
  onChange={e => setForm({ ...form, currency: e.target.value })}
/>
<FormInput
  label={`Amount (${form.currency})`}
  required
  type="number"
  step="0.01"
  min="0"
  value={form.amount}
  onChange={e => setForm({ ...form, amount: e.target.value })}
/>
          <FormInput label="Remark" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
          <Button type="submit" className="w-full">Submit Request</Button>
        </form>
      </Modal>
    </div>
  );
}

export function MerchantConfiguration() {
  const [subMerchants, setSubMerchants] = useState([]);
  const [form, setForm] = useState({ subMerchantId: '', usdtTodayRate: '', aedTodayRate: '' });

  useEffect(() => {
    api.get('/merchant/rate-config').then(r => setSubMerchants(r.data.subMerchants || []));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/merchant/rate-config', form);
      toast.success('Rate updated!');
    } catch (e) { toast.error('Error updating rate.'); }
  };

  return (
    <div>
      <PageHeader title="Configuration" subtitle="Set AED and USDT rates for sub-merchants" />
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-lg">
        <form onSubmit={handleUpdate}>
          <FormSelect label="Select Sub-Merchant" placeholder="All Sub-Merchants"
            options={subMerchants.map(s => ({ value: s.id, label: s.name }))}
            value={form.subMerchantId} onChange={e => setForm({ ...form, subMerchantId: e.target.value })} />
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