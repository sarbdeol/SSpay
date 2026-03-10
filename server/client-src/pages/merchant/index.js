// ═══════════════════════════════════════════
// MERCHANT PAGES
// ═══════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect, FormTextarea, StatusBadge, DateFilter } from '../../components/common';
import toast from 'react-hot-toast';

export function MerchantDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/merchant/dashboard').then(r => setStats(r.data.data)); }, []);

  return (
    <div>
      <PageHeader title="Merchant Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard title="Total Commission Amount" value={stats?.totalCommissionAmount || 0} index={0} />
        <StatCard title="Total Pay Out Amount" value={stats?.totalPayOutAmount || 0} index={1} />
        <StatCard title="Total Pay Out Transactions" value={stats?.totalPayOutTransactions || 0} prefix="" index={2} />
        <StatCard title="Pending" value={stats?.pendingCount || 0} prefix="" index={3} />
        <StatCard title="Pending Amount" value={stats?.pendingAmount || 0} index={4} />
        <StatCard title="Total Payment Dena" value={stats?.totalPaymentDena || 0} index={5} />
      </div>
      {/* Limit info */}
      <div className="bg-white rounded-2xl shadow-card p-5 max-w-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Limits</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-emerald-600">Available Details</span><span className="font-semibold">₹{(stats?.availableLimit || 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-amber-600">Used Limit</span><span className="font-semibold">₹{(stats?.usedLimit || 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Maximum Limit</span><span className="font-semibold">₹{(stats?.maxPaymentLimit || 0).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}

export function MerchantTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ transactionType: 'UPI', amount: '', upiId: '', accountNumber: '', ifscCode: '', accountHolderName: '', notes: '' });

  const fetch = async () => {
    setLoading(true);
    const r = await api.get(`/merchant/transactions?page=${page}&limit=10`);
    setTransactions(r.data.data); setTotal(r.data.total); setLoading(false);
  };
  useEffect(() => { fetch(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/merchant/transactions', form);
      toast.success('Transaction created!');
      setShowCreate(false);
      setForm({ transactionType: 'UPI', amount: '', upiId: '', accountNumber: '', ifscCode: '', accountHolderName: '', notes: '' });
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleExport = async () => {
    const r = await api.get('/reports/export/transactions', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.xlsx'; a.click();
  };

  const handleReceipt = async (id) => {
    const r = await api.get(`/reports/receipt/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
    { header: 'UTR Number', render: r => r.utrNumber || '-' },
    { header: 'UPI ID', render: r => r.upiId || '-' },
    { header: 'Bank', render: r => r.bankName || '-' },
    { header: 'IFSC', render: r => r.ifscCode || '-' },
    { header: 'Holder', render: r => r.accountHolderName || '-' },
    { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Transactions List" action={
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(true)}>Create</Button>
        </div>
      } />
      <DataTable columns={columns} data={transactions} total={total} page={page}
        onPageChange={setPage} loading={loading} onExport={handleExport}
        actions={r => (
          <div className="flex gap-2">
            <button onClick={() => setShowDetail(r)} className="text-brand-500 text-sm hover:underline">View All</button>
            {r.status === 'CLEARED' && <button onClick={() => handleReceipt(r.id)} className="text-emerald-500 text-sm">📥</button>}
          </div>
        )}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Merchant Transaction Form">
        <form onSubmit={handleCreate}>
          <FormSelect label="Select Transaction Type" required
            options={[{ value: 'UPI', label: 'UPI' }, { value: 'BANK_ACCOUNT', label: 'Bank Account' }]}
            value={form.transactionType} onChange={e => setForm({ ...form, transactionType: e.target.value })} />

          {form.transactionType === 'UPI' ? (
            <FormInput label="UPI Id" required value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} placeholder="Enter UPI Id" />
          ) : (
            <>
              <FormInput label="Account Number" required value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
              <FormInput label="IFSC Code" required value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value })} />
              <FormInput label="Account Holder Name" required value={form.accountHolderName} onChange={e => setForm({ ...form, accountHolderName: e.target.value })} />
            </>
          )}
          <FormInput label="Amount" required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter Amount" />
          <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Transaction Details">
        {showDetail && (
          <div className="space-y-2 text-sm">
            {[['Amount', `₹${parseFloat(showDetail.amount).toLocaleString()}`], ['Type', showDetail.transactionType],
              ['UPI ID', showDetail.upiId || '-'], ['UTR', showDetail.utrNumber || '-'], ['Status', showDetail.status],
              ['Created', new Date(showDetail.createdAt).toLocaleString()],
              ['Cleared', showDetail.transactionClearTime ? new Date(showDetail.transactionClearTime).toLocaleString() : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function MerchantSubmerchants() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', username: '', password: '' });

  const fetch = () => api.get('/merchant/submerchants').then(r => setItems(r.data.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/merchant/submerchants', form);
      toast.success('Sub-merchant created!');
      setShowCreate(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  return (
    <div>
      <PageHeader title="Sub-Merchants" action={<Button onClick={() => setShowCreate(true)}>Create Sub-Merchant</Button>} />
      <DataTable
        columns={[
          { header: 'Name', key: 'name' },
          { header: 'Username', render: r => r.user?.username || '-' },
          { header: 'Status', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
        ]}
        data={items} total={items.length} page={1}
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
    </div>
  );
}

export function MerchantSettlements() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: '', collectorId: '', remark: '' });

  const fetch = () => api.get('/merchant/settlements').then(r => setItems(r.data.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/merchant/settlements', form); toast.success('Settlement created!'); setShowCreate(false); fetch(); }
    catch (e) { toast.error('Error.'); }
  };

  return (
    <div>
      <PageHeader title="Settlement Transactions" action={<Button onClick={() => setShowCreate(true)}>Create</Button>} />
      <DataTable columns={[
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'Collector', render: r => r.collector?.name || '-' },
        { header: 'Remark', render: r => r.remark || '-' },
        { header: 'Status', render: r => <StatusBadge status={r.status} /> },
      ]} data={items} total={items.length} page={1} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Settlement to Collector">
        <form onSubmit={handleCreate}>
          <FormInput label="Amount" required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <FormInput label="Collector Name" value={form.collectorId} onChange={e => setForm({ ...form, collectorId: e.target.value })} placeholder="Collector ID" />
          <FormInput label="Remark" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>
    </div>
  );
}
