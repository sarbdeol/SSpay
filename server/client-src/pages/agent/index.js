// ═══════════════════════════════════════════
// AGENT PAGES
// ═══════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect, FormTextarea, Toggle, StatusBadge } from '../../components/common';
import toast from 'react-hot-toast';

export function AgentDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/agent/dashboard').then(r => setStats(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Agent Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Agent Commission" value={stats?.totalAgentCommission || 0} index={0} />
        <StatCard title="Total Pay Out Transactions" value={stats?.totalPayOutTransactions || 0} prefix="" index={1} />
        <StatCard title="Total Pay Out Amount" value={stats?.totalPayOutAmount || 0} index={2} />
        <StatCard title="Total Pending Transactions" value={stats?.totalPendingTransactions || 0} prefix="" index={3} />
        <StatCard title="Available Details" value={stats?.availableDetails?.available || 0} index={4} />
        <StatCard title="Total Payment Lunga" value={stats?.totalPaymentLunga || 0} index={5} />
        <StatCard title="Total Receivable Amount" value={stats?.totalReceivableAmount || 0} index={0} />
      </div>
    </div>
  );
}

export function AgentOperators() {
  const [operators, setOperators] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', maxTransactionAmount: '', minTransactionAmount: '', commissionChargePercent: '', description: '' });

  const fetch = () => api.get('/agent/operators').then(r => setOperators(r.data.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/agent/operators', form); toast.success('Operator created!'); setShowCreate(false); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  return (
    <div>
      <PageHeader title="Operators List" action={<Button onClick={() => setShowCreate(true)}>Create</Button>} />
      <DataTable columns={[
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Is Active', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
      ]} data={operators} total={operators.length} page={1}
        actions={r => (
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-mac">✏️</button>
            <button onClick={async () => { await api.delete(`/agent/operators/${r.id}`); fetch(); }}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-mac">🗑️</button>
          </div>
        )}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Operator Form">
        <form onSubmit={handleCreate}>
          <FormInput label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Operator Name" />
          <FormInput label="Max Transaction Amount" required type="number" value={form.maxTransactionAmount} onChange={e => setForm({ ...form, maxTransactionAmount: e.target.value })} />
          <FormInput label="Min Transaction Amount" required type="number" value={form.minTransactionAmount} onChange={e => setForm({ ...form, minTransactionAmount: e.target.value })} />
          <FormInput label="Commission Charge Percent" required type="number" step="0.01" value={form.commissionChargePercent} onChange={e => setForm({ ...form, commissionChargePercent: e.target.value })} placeholder="e.g 4, 0.8, 2.6" />
          <FormTextarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" className="w-full">Save Operator</Button>
        </form>
      </Modal>
    </div>
  );
}

export function AgentOperatorUsers() {
  const [users, setUsers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', operatorId: '' });

  const fetch = () => {
    api.get('/agent/operator-users').then(r => setUsers(r.data.data));
    api.get('/agent/operators').then(r => setOperators(r.data.data));
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/agent/operator-users', form); toast.success('User created!'); setShowCreate(false); fetch(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  return (
    <div>
      <PageHeader title="Operators User List" action={<Button onClick={() => setShowCreate(true)}>Create</Button>} />
      <DataTable columns={[
        { header: 'ID', key: 'id' },
        { header: 'Name', render: r => r.username || r.name },
        { header: 'Operator', render: r => r.operator?.name || '-' },
        { header: 'Is Active', render: r => <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /> },
      ]} data={users} total={users.length} page={1}
        actions={r => (
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg hover:bg-gray-100">📋</button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100">✏️</button>
            <button onClick={async () => { await api.delete(`/agent/operator-users/${r.id}`); fetch(); }}
              className="p-1.5 rounded-lg hover:bg-red-50">🗑️</button>
          </div>
        )}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Operator User Form">
        <form onSubmit={handleCreate}>
          <FormInput label="User Name" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <FormInput label="Password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <FormSelect label="Select Operator" required placeholder="Select Option"
            options={operators.map(o => ({ value: o.id, label: o.name }))}
            value={form.operatorId} onChange={e => setForm({ ...form, operatorId: e.target.value })} />
          <Button type="submit" className="w-full">Save Operator</Button>
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
    api.get(`/agent/transactions?page=${page}&limit=10`).then(r => {
      setTransactions(r.data.data); setTotal(r.data.total); setLoading(false);
    });
  }, [page]);

  const handleExport = async () => {
    const r = await api.get('/reports/export/transactions', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.xlsx'; a.click();
  };

  return (
    <div>
      <PageHeader title="Transactions List" />
      <DataTable columns={[
        { header: 'ID', key: 'id' },
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'UTR Number', render: r => r.utrNumber || '-' },
        { header: 'Notes', render: r => r.notes || '-' },
        { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
        { header: 'Cleared Date', render: r => r.transactionClearTime ? new Date(r.transactionClearTime).toLocaleString() : '-' },
        { header: 'Status', render: r => <StatusBadge status={r.status} /> },
      ]} data={transactions} total={total} page={page} onPageChange={setPage}
        loading={loading} onExport={handleExport}
        actions={r => <button onClick={() => setShowDetail(r)} className="text-brand-500 text-sm">View All</button>}
      />

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Transaction Details" maxWidth="max-w-md">
        {showDetail && (
          <div className="text-sm space-y-2">
            {[['Amount', `₹${parseFloat(showDetail.amount).toLocaleString()}`], ['Type', showDetail.transactionType],
              ['UTR', showDetail.utrNumber || '-'], ['Status', showDetail.status],
              ['Operator Pick', showDetail.operatorPickTime ? new Date(showDetail.operatorPickTime).toLocaleString() : '-'],
              ['Clear Time', showDetail.transactionClearTime ? new Date(showDetail.transactionClearTime).toLocaleString() : '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
            {showDetail.merchant && (
              <div className="mt-3 pt-3 border-t">
                <p className="font-semibold text-gray-800 mb-2">Merchant</p>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{showDetail.merchant.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Max Limit</span><span>₹{parseFloat(showDetail.merchant.maxPaymentLimit || 0).toLocaleString()}</span></div>
              </div>
            )}
            {showDetail.operator && (
              <div className="mt-3 pt-3 border-t">
                <p className="font-semibold text-gray-800 mb-2">Operator</p>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{showDetail.operator.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Max Txn</span><span>₹{parseFloat(showDetail.operator.maxTransactionAmount || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Min Txn</span><span>₹{parseFloat(showDetail.operator.minTransactionAmount || 0).toLocaleString()}</span></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
