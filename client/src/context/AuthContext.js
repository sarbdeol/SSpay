import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const ROLE_ROUTES = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', MERCHANT: '/merchant', SUB_MERCHANT: '/submerchant', AGENT: '/agent', OPERATOR: '/operator', COLLECTOR: '/collector', EXPENSE_MANAGER: '/expense-manager' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonationStack, setImpersonationStack] = useState(() => {
    try { return JSON.parse(localStorage.getItem('impersonationStack') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const stored = localStorage.getItem('user'), token = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      api.get('/auth/me').then(r => { setUser(r.data.user); localStorage.setItem('user', JSON.stringify(r.data.user)); })
        .catch(() => { localStorage.removeItem('user'); localStorage.removeItem('token'); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    if (r.data.success) { localStorage.setItem('token', r.data.token); localStorage.setItem('user', JSON.stringify(r.data.user)); setUser(r.data.user); return r.data.user; }
    throw new Error(r.data.message);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch(e){}
    localStorage.removeItem('token'); localStorage.removeItem('user');
    localStorage.removeItem('impersonationStack');
    setUser(null); setImpersonationStack([]);
  };

  const impersonate = async (userId) => {
    const r = await api.post(`/auth/impersonate/${userId}`);
    if (r.data.success) {
      // Push current user+token onto stack
      const newStack = [...impersonationStack, { token: localStorage.getItem('token'), user: JSON.parse(localStorage.getItem('user')) }];
      setImpersonationStack(newStack);
      localStorage.setItem('impersonationStack', JSON.stringify(newStack));
      // Also keep originalToken/originalUser for backward compat
      if (newStack.length === 1) { localStorage.setItem('originalToken', newStack[0].token); localStorage.setItem('originalUser', JSON.stringify(newStack[0].user)); }
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      setUser(r.data.user);
      return r.data.user;
    }
  };

  // Jump to any level in the stack (0 = root)
  const jumpToStack = (index) => {
    const entry = impersonationStack[index];
    if (!entry) return;
    const newStack = impersonationStack.slice(0, index);
    setImpersonationStack(newStack);
    localStorage.setItem('impersonationStack', JSON.stringify(newStack));
    localStorage.setItem('token', entry.token);
    localStorage.setItem('user', JSON.stringify(entry.user));
    if (newStack.length === 0) { localStorage.removeItem('originalToken'); localStorage.removeItem('originalUser'); }
    else { localStorage.setItem('originalToken', newStack[0].token); localStorage.setItem('originalUser', JSON.stringify(newStack[0].user)); }
    setUser(entry.user);
  };

  const stopImpersonating = () => {
    if (impersonationStack.length === 0) return;
    jumpToStack(impersonationStack.length - 1);
  };

  const getDashboardRoute = () => ROLE_ROUTES[user?.role] || '/login';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, impersonate, stopImpersonating, getDashboardRoute, impersonationStack, jumpToStack }}>
      {children}
    </AuthContext.Provider>
  );
}