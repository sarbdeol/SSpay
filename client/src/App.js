import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';

import { SuperAdminDashboard, AdminsList, AllUsersList, LoginHistoryList, ExpenseEntriesView } from './pages/superadmin';
import { AdminDashboard, AdminMerchants, AdminAgents, AdminCollectors, AdminTransactions, AdminConfiguration, AdminCollections, DailyReport, AdminLedger, AdminTrialBalance } from './pages/admin';
import { MerchantDashboard, MerchantTransactions, MerchantSubmerchants, MerchantSettlements, MerchantConfiguration } from './pages/merchant';
import { SubMerchantDashboard, SubMerchantLedger, SubMerchantTransactions } from './pages/submerchant';
import { AgentDashboard, AgentOperators, AgentOperatorUsers, AgentTransactions, AgentLedger, AgentSettlements } from './pages/agent';
import { OperatorDashboard, OperatorTransactions } from './pages/operator';
import { CollectorDashboard, CollectorRequests, CollectorLedger } from './pages/collector';
import { ExpenseManagerDashboard, ExpenseManagerEntries } from './pages/expense-manager';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AutoRedirect() {
  const { user, loading, getDashboardRoute } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>;
  if (user) return <Navigate to={getDashboardRoute()} replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'DM Sans', fontSize: '14px', borderRadius: '12px' }, success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } }, error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AutoRedirect />} />

          {/* Super Admin */}
          <Route path="/superadmin" element={<ProtectedRoute roles={['SUPER_ADMIN']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/admins" element={<ProtectedRoute roles={['SUPER_ADMIN']}><AdminsList /></ProtectedRoute>} />
          <Route path="/superadmin/users" element={<ProtectedRoute roles={['SUPER_ADMIN']}><AllUsersList /></ProtectedRoute>} />
          <Route path="/superadmin/login-history" element={<ProtectedRoute roles={['SUPER_ADMIN']}><LoginHistoryList /></ProtectedRoute>} />
          <Route path="/superadmin/expense-entries" element={<ProtectedRoute roles={['SUPER_ADMIN']}><ExpenseEntriesView /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/daily-report" element={<ProtectedRoute roles={['ADMIN']}><DailyReport /></ProtectedRoute>} />
          <Route path="/admin/merchants" element={<ProtectedRoute roles={['ADMIN']}><AdminMerchants /></ProtectedRoute>} />
          <Route path="/admin/agents" element={<ProtectedRoute roles={['ADMIN']}><AdminAgents /></ProtectedRoute>} />
          <Route path="/admin/collectors" element={<ProtectedRoute roles={['ADMIN']}><AdminCollectors /></ProtectedRoute>} />
          <Route path="/admin/expense-managers" element={<ProtectedRoute roles={['ADMIN']}><AdminCollectors /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute roles={['ADMIN']}><AdminTransactions /></ProtectedRoute>} />
          <Route path="/admin/configuration" element={<ProtectedRoute roles={['ADMIN']}><AdminConfiguration /></ProtectedRoute>} />
          <Route path="/admin/collections" element={<ProtectedRoute roles={['ADMIN']}><AdminCollections /></ProtectedRoute>} />
          <Route path="/admin/ledger" element={<ProtectedRoute roles={['ADMIN']}><AdminLedger /></ProtectedRoute>} />
          <Route path="/admin/trial-balance" element={<ProtectedRoute roles={['ADMIN']}><AdminTrialBalance /></ProtectedRoute>} />
          {/* Merchant */}
          <Route path="/merchant" element={<ProtectedRoute roles={['MERCHANT']}><MerchantDashboard /></ProtectedRoute>} />
          <Route path="/merchant/daily-report" element={<ProtectedRoute roles={['MERCHANT']}><DailyReport /></ProtectedRoute>} />
          <Route path="/merchant/submerchants" element={<ProtectedRoute roles={['MERCHANT']}><MerchantSubmerchants /></ProtectedRoute>} />
          <Route path="/merchant/transactions" element={<ProtectedRoute roles={['MERCHANT']}><MerchantTransactions /></ProtectedRoute>} />
          <Route path="/merchant/configuration" element={<ProtectedRoute roles={['MERCHANT']}><MerchantConfiguration /></ProtectedRoute>} />

          {/* Sub-Merchant */}
          <Route path="/submerchant" element={<ProtectedRoute roles={['SUB_MERCHANT']}><SubMerchantDashboard /></ProtectedRoute>} />
          <Route path="/submerchant/daily-report" element={<ProtectedRoute roles={['SUB_MERCHANT']}><DailyReport /></ProtectedRoute>} />
          <Route path="/submerchant/ledger" element={<ProtectedRoute roles={['SUB_MERCHANT']}><SubMerchantLedger /></ProtectedRoute>} />
          <Route path="/submerchant/transactions" element={<ProtectedRoute roles={['SUB_MERCHANT']}><SubMerchantTransactions /></ProtectedRoute>} />

          {/* Agent */}
          <Route path="/agent" element={<ProtectedRoute roles={['AGENT']}><AgentDashboard /></ProtectedRoute>} />
          <Route path="/agent/daily-report" element={<ProtectedRoute roles={['AGENT']}><DailyReport /></ProtectedRoute>} />
          <Route path="/agent/ledger" element={<ProtectedRoute roles={['AGENT']}><AgentLedger /></ProtectedRoute>} />
          <Route path="/agent/settlements" element={<ProtectedRoute roles={['AGENT']}><AgentSettlements /></ProtectedRoute>} />
          <Route path="/agent/operators" element={<ProtectedRoute roles={['AGENT']}><AgentOperators /></ProtectedRoute>} />
          <Route path="/agent/operator-users" element={<ProtectedRoute roles={['AGENT']}><AgentOperatorUsers /></ProtectedRoute>} />
          <Route path="/agent/transactions" element={<ProtectedRoute roles={['AGENT']}><AgentTransactions /></ProtectedRoute>} />

          {/* Operator */}
          <Route path="/operator" element={<ProtectedRoute roles={['OPERATOR']}><OperatorDashboard /></ProtectedRoute>} />
          <Route path="/operator/daily-report" element={<ProtectedRoute roles={['OPERATOR']}><DailyReport /></ProtectedRoute>} />
          <Route path="/operator/transactions" element={<ProtectedRoute roles={['OPERATOR']}><OperatorTransactions /></ProtectedRoute>} />

          {/* Collector */}
          <Route path="/collector" element={<ProtectedRoute roles={['COLLECTOR']}><CollectorDashboard /></ProtectedRoute>} />
          <Route path="/collector/daily-report" element={<ProtectedRoute roles={['COLLECTOR']}><DailyReport /></ProtectedRoute>} />
          <Route path="/collector/requests" element={<ProtectedRoute roles={['COLLECTOR']}><CollectorRequests /></ProtectedRoute>} />
          <Route path="/collector/ledger" element={<ProtectedRoute roles={['COLLECTOR']}><CollectorLedger /></ProtectedRoute>} />

          {/* Expense Manager */}
          <Route path="/expense-manager" element={<ProtectedRoute roles={['EXPENSE_MANAGER']}><ExpenseManagerDashboard /></ProtectedRoute>} />
          <Route path="/expense-manager/entries" element={<ProtectedRoute roles={['EXPENSE_MANAGER']}><ExpenseManagerEntries /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
