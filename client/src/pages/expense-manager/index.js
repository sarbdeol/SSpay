import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { StatCard, DataTable, PageHeader, Button, Modal, FormInput, FormSelect } from '../../components/common';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'HOUSE_RENT', label: 'House Rent' }, { value: 'CAR', label: 'Car' },
  { value: 'DRIVER_SALARY', label: 'Driver Salary' }, { value: 'COOK_SALARY', label: 'Cook Salary' },
  { value: 'STAFF_SALARY', label: 'Staff Salary' }, { value: 'MISC', label: 'Misc Expense' },
  { value: 'ADMIN_WITHDRAWAL', label: 'Admin Withdrawal' },
];

export function ExpenseManagerDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/expense-manager/dashboard').then(r => setStats(r.data.data)); }, []);
  return (
    <div>
      <PageHeader title="Expense Manager Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Expenses" value={stats?.totalExpenses || 0} index={0} />
        <StatCard title="This Month" value={stats?.thisMonthExpenses || 0} index={1} />
        <StatCard title="Total Entries" value={stats?.entryCount || 0} prefix="" index={2} />
      </div>
    </div>
  );
}

export function ExpenseManagerEntries() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ category: '', expenseDate: '', description: '', amount: '' });
  const [invoice, setInvoice] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get(`/expense-manager/entries?page=${page}&limit=20`).then(r => { setEntries(r.data.data); setTotal(r.data.total); setLoading(false); });
  };
  useEffect(() => { fetch(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.expenseDate) { toast.error('Category, date, and amount required.'); return; }
    const fd = new FormData();
    fd.append('category', form.category);
    fd.append('expenseDate', form.expenseDate);
    fd.append('description', form.description);
    fd.append('amount', form.amount);
    if (invoice) fd.append('invoice', invoice);

    try {
      await api.post('/expense-manager/entries', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Entry created!');
      setShowCreate(false);
      setForm({ category: '', expenseDate: '', description: '', amount: '' });
      setInvoice(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await api.delete(`/expense-manager/entries/${id}`); toast.success('Deleted.'); fetch(); }
    catch (e) { toast.error('Error.'); }
  };

  return (
    <div>
      <PageHeader title="Expense Entries" action={<Button onClick={() => setShowCreate(true)}>Add Entry</Button>} />
      <DataTable columns={[
        { header: 'Category', render: r => CATEGORIES.find(c => c.value === r.category)?.label || r.category },
        { header: 'Date', render: r => new Date(r.expenseDate).toLocaleDateString() },
        { header: 'Amount', render: r => `₹${parseFloat(r.amount).toLocaleString()}` },
        { header: 'Description', render: r => r.description || '-' },
        { header: 'Invoice', render: r => r.invoiceImage ? <a href={`/uploads/expense-invoices/${r.invoiceImage}`} target="_blank" rel="noreferrer" className="text-brand-500 text-sm underline">View</a> : '-' },
        { header: 'Created', render: r => new Date(r.createdAt).toLocaleString() },
      ]} data={entries} total={total} page={page} onPageChange={setPage} loading={loading}
        actions={r => <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">🗑️</button>}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Expense Entry">
        <form onSubmit={handleCreate}>
          <FormSelect label="Category" required options={CATEGORIES} placeholder="Select category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <FormInput label="Date" required type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} />
          <FormInput label="Amount" required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount" />
          <FormInput label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Photo</label>
            <input type="file" accept="image/*" onChange={e => setInvoice(e.target.files[0])} className="w-full text-sm border border-gray-200 rounded-xl p-2" />
          </div>
          <Button type="submit" className="w-full">Save Entry</Button>
        </form>
      </Modal>
    </div>
  );
}
