import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, StatusBadge } from '../../components/common';
import toast from 'react-hot-toast';

export function CollectorDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/collector/dashboard').then(r => setStats(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Collector Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Merchant Se Lena" value={stats?.totalMerchantSeLena || 0} index={0} />
        {/* <StatCard title="Total Settled" value={stats?.totalSettled || 0} index={1} /> */}
        <StatCard title="Total Agent Ko Dena" value={stats?.totalAgentKoDena || 0} index={2} />
        <StatCard title="Total Admin Ko Dena" value={stats?.totalAdminKoDena || 0} index={3} />
      </div>
    </div>
  );
}

export function CollectorRequests() {
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '' });
  const fetch = () => api.get('/collector/requests').then(r => setItems(r.data.data));
  useEffect(() => { fetch(); }, []);
  const handleCreate = async (e) => { e.preventDefault(); try { await api.post('/collector/requests', form); toast.success('Created!'); setShowCreate(false); fetch(); } catch (e) { toast.error('Error.'); } };
  return (
    <div>
      <PageHeader title="Requests" action={<Button onClick={() => setShowCreate(true)}>Create Request</Button>} />
      <DataTable columns={[
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'Description', render: r => r.description || '-' },
        { header: 'Status', render: r => <StatusBadge status={r.status} /> },
        { header: 'Date', render: r => new Date(r.createdAt).toLocaleString() },
      ]} data={items} total={items.length} page={1} />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Request">
        <form onSubmit={handleCreate}><FormInput label="Amount" required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /><FormInput label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /><Button type="submit" className="w-full">Submit Request</Button></form>
      </Modal>
    </div>
  );
}

export function CollectorLedger() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/collector/ledger').then(r => setItems(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Ledger" />
      <DataTable columns={[
        { header: 'Type', key: 'entryType' },
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'Description', render: r => r.description || '-' },
        { header: 'Balance After', render: r => `₹${parseFloat(r.balanceAfter).toLocaleString()}` },
        { header: 'Date', render: r => new Date(r.createdAt).toLocaleString() },
      ]} data={items} total={items.length} page={1} />
    </div>
  );
}
