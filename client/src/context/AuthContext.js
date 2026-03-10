import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const ROLE_ROUTES = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', MERCHANT: '/merchant', SUB_MERCHANT: '/submerchant', AGENT: '/agent', OPERATOR: '/operator', COLLECTOR: '/collector', EXPENSE_MANAGER: '/expense-manager' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem('user'), token = localStorage.getItem('token');
    if (stored && token) { setUser(JSON.parse(stored)); api.get('/auth/me').then(r => { setUser(r.data.user); localStorage.setItem('user', JSON.stringify(r.data.user)); }).catch(() => { localStorage.removeItem('user'); localStorage.removeItem('token'); setUser(null); }).finally(() => setLoading(false)); }
    else setLoading(false);
  }, []);
  const login = async (username, password) => { const r = await api.post('/auth/login', { username, password }); if (r.data.success) { localStorage.setItem('token', r.data.token); localStorage.setItem('user', JSON.stringify(r.data.user)); setUser(r.data.user); return r.data.user; } throw new Error(r.data.message); };
  const logout = async () => { try { await api.post('/auth/logout'); } catch(e){} localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  const impersonate = async (userId) => { const r = await api.post(`/auth/impersonate/${userId}`); if (r.data.success) { localStorage.setItem('originalToken', localStorage.getItem('token')); localStorage.setItem('originalUser', localStorage.getItem('user')); localStorage.setItem('token', r.data.token); localStorage.setItem('user', JSON.stringify(r.data.user)); setUser(r.data.user); return r.data.user; } };
  const stopImpersonating = () => { const t = localStorage.getItem('originalToken'), u = localStorage.getItem('originalUser'); if (t && u) { localStorage.setItem('token', t); localStorage.setItem('user', u); localStorage.removeItem('originalToken'); localStorage.removeItem('originalUser'); setUser(JSON.parse(u)); } };
  const getDashboardRoute = () => ROLE_ROUTES[user?.role] || '/login';
  return <AuthContext.Provider value={{ user, login, logout, loading, impersonate, stopImpersonating, getDashboardRoute }}>{children}</AuthContext.Provider>;
}
