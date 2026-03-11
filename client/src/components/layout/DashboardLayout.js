import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { HiOutlineViewGrid, HiOutlineDocumentReport, HiOutlineCog, HiOutlineLogout, HiOutlineUserGroup, HiOutlineCollection, HiOutlineCash, HiOutlineClipboardList, HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineMenu, HiOutlineUsers, HiOutlineSwitchHorizontal, HiOutlineDocumentText, HiOutlineFolder, HiOutlineClock } from 'react-icons/hi';

const MENUS = {
  SUPER_ADMIN: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/superadmin' },
    { label: "Admin's", icon: HiOutlineUserGroup, path: '/superadmin/admins' },
    { label: 'All Users', icon: HiOutlineUsers, path: '/superadmin/users' },
    { label: 'Login History', icon: HiOutlineClock, path: '/superadmin/login-history' },
    { label: 'Expense Entries', icon: HiOutlineCash, path: '/superadmin/expense-entries' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/admin' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/admin/daily-report' },
    { label: 'Merchants', icon: HiOutlineCollection, path: '/admin/merchants' },
    { label: 'Agents', icon: HiOutlineUsers, path: '/admin/agents' },
    { label: 'Collectors', icon: HiOutlineCash, path: '/admin/collectors' },
    { label: 'Expense Managers', icon: HiOutlineDocumentText, path: '/admin/expense-managers' },
    { label: 'Ledger', icon: HiOutlineDocumentText, path: '/admin/ledger' },
    { label: 'Trial Balance', icon: HiOutlineCash, path: '/admin/trial-balance' },
    { label: 'Others', icon: HiOutlineFolder, children: [
      { label: 'Transactions', path: '/admin/transactions' },
      { label: 'Collection', path: '/admin/collections' },
      { label: 'Configuration', path: '/admin/configuration' },
    ]},
  ],
  MERCHANT: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/merchant' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/merchant/daily-report' },
    { label: 'Sub-Merchants', icon: HiOutlineUserGroup, path: '/merchant/submerchants' },
    { label: 'Configurations', icon: HiOutlineCog, children: [
      { label: 'Transactions', path: '/merchant/transactions' },
      { label: 'Settlements', path: '/merchant/settlements' },
      { label: 'Configuration', path: '/merchant/configuration' },
    ]},
  ],
  SUB_MERCHANT: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/submerchant' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/submerchant/daily-report' },
    { label: 'Ledger', icon: HiOutlineDocumentText, path: '/submerchant/ledger' },
    { label: 'Configurations', icon: HiOutlineCog, children: [{ label: 'Transactions', path: '/submerchant/transactions' }] },
  ],
  AGENT: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/agent' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/agent/daily-report' },
    { label: 'Ledger', icon: HiOutlineDocumentText, path: '/agent/ledger' },
    { label: 'Settlements', icon: HiOutlineCash, path: '/agent/settlements' },
    { label: 'Configurations', icon: HiOutlineCog, children: [
      { label: 'Operators', path: '/agent/operators' },
      { label: 'Operator Users', path: '/agent/operator-users' },
      { label: 'Transactions', path: '/agent/transactions' },
    ]},
  ],
  OPERATOR: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/operator' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/operator/daily-report' },
    { label: 'Transactions', icon: HiOutlineClipboardList, path: '/operator/transactions' },
  ],
  COLLECTOR: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/collector' },
    { label: 'Daily Report', icon: HiOutlineDocumentReport, path: '/collector/daily-report' },
    { label: 'Configuration', icon: HiOutlineCog, children: [
      { label: 'Settlements', path: '/collector/settlements' },
      { label: 'Ledger', path: '/collector/ledger' },
    ]},
  ],
  EXPENSE_MANAGER: [
    { label: 'Dashboard', icon: HiOutlineViewGrid, path: '/expense-manager' },
    { label: 'Expense Entries', icon: HiOutlineCash, path: '/expense-manager/entries' },
  ],
};
function CurrencyRatesDropdown() {
  const [rates, setRates] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get('/config/current-rates').then(r => {
      if (r.data.data?.length) setRates(r.data.data[0]);
    }).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 h-9 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-mac">
        Currency Rates <HiOutlineChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-lg border border-gray-100 p-4 min-w-[200px]">
            {rates ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">AED Rate</span><span className="font-semibold text-green-600">{parseFloat(rates.aedTodayRate).toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">USDT Rate</span><span className="font-semibold text-blue-600">{parseFloat(rates.usdtTodayRate).toFixed(4)}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No rates set</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function SidebarItem({ item, collapsed }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon || HiOutlineFolder;
  if (item.children) {
    return (<div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-mac">
        <Icon className="w-5 h-5 flex-shrink-0" />{!collapsed && <><span className="flex-1 text-left">{item.label}</span>{open ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronRight className="w-4 h-4" />}</>}
      </button>
      {open && !collapsed && <div className="ml-8 mt-1 space-y-0.5">{item.children.map(c => <NavLink key={c.path} to={c.path} className={({ isActive }) => `block px-3 py-2 text-sm rounded-lg transition-mac ${isActive ? 'text-brand-500 bg-brand-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{c.label}</NavLink>)}</div>}
    </div>);
  }
  return <NavLink to={item.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-mac ${isActive ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}><Icon className="w-5 h-5 flex-shrink-0" />{!collapsed && <span>{item.label}</span>}</NavLink>;
}

export default function DashboardLayout({ children }) {
  const { user, logout, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems = MENUS[user?.role] || [];
  const isImp = !!localStorage.getItem('originalToken');
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-100 px-4">{sidebarOpen ? <h1 className="text-lg font-bold text-brand-dark tracking-tight">INDU PAY</h1> : <span className="text-lg font-bold text-brand-500">IP</span>}</div>
        <div className="px-4 py-3 border-b border-gray-50"><p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p><p className="text-xs text-gray-400 truncate">{user?.role?.replace(/_/g, ' ')}</p></div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">{menuItems.map((item, i) => <SidebarItem key={i} item={item} collapsed={!sidebarOpen} />)}</nav>
        <div className="p-3 border-t border-gray-100">
          {isImp && <button onClick={() => { stopImpersonating(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-xl transition-mac mb-1"><HiOutlineSwitchHorizontal className="w-5 h-5" />{sidebarOpen && <span>Back to Original</span>}</button>}
          <button onClick={async () => { await logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-mac"><HiOutlineLogout className="w-5 h-5" />{sidebarOpen && <span>Logout</span>}</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => { if (window.innerWidth < 1024) setMobileOpen(!mobileOpen); else setSidebarOpen(!sidebarOpen); }} className="p-2 rounded-lg hover:bg-gray-100 transition-mac"><HiOutlineMenu className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-3"><CurrencyRatesDropdown /><div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">{user?.name?.charAt(0).toUpperCase()}</div></div>
        </header>
        {isImp && <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700">⚠️ Viewing as <strong>{user?.name}</strong> ({user?.role?.replace(/_/g, ' ')})</div>}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
