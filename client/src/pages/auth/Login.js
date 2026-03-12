import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const ROLE_ROUTES = {
    SUPER_ADMIN: '/superadmin',
    ADMIN: '/admin',
    MERCHANT: '/merchant',
    SUB_MERCHANT: '/submerchant',
    AGENT: '/agent',
    OPERATOR: '/operator',
    COLLECTOR: '/collector',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Username and password are required.'); return; }
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(ROLE_ROUTES[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex flex-1 bg-[#1a1a2e] flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute -top-[30%] -right-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.08)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.05)_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-md text-center">
          <div className="w-[72px] h-[72px] bg-white/[0.08] backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/[0.06]">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4L30 10V26L18 32L6 26V10L18 4Z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
              <circle cx="18" cy="18" r="4" fill="rgba(0,122,255,0.8)"/>
            </svg>
          </div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight mb-3">SS PAY</h1>
          <p className="text-[15px] text-white/60 leading-relaxed">
            Secure payment processing platform.<br/>Fast settlements. Real-time tracking.
          </p>

          <div className="flex gap-10 mt-12 pt-10 border-t border-white/[0.06] justify-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
              { value: 'AES-256', label: 'Encrypted' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[22px] font-semibold text-white tracking-tight">{s.value}</p>
                <p className="text-[12px] text-white/50 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-[#fafafa]">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e]">SS PAY</h1>
          </div>

          <div className="mb-9">
            <h2 className="text-[24px] font-semibold text-[#1c1c1e] tracking-tight mb-2">Welcome back</h2>
            <p className="text-[14px] text-[#636366]">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-[#1c1c1e] mb-1.5">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username" autoComplete="username"
                className="w-full h-[44px] px-[14px] text-[14px] bg-white border border-[#e5e5ea] rounded-[10px] outline-none
                  transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                  hover:border-[#c7c7cc] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]
                  focus:border-[#007aff] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]
                  placeholder:text-[#aeaeb2]"
              />
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-medium text-[#1c1c1e] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" autoComplete="current-password"
                  className="w-full h-[44px] px-[14px] pr-[44px] text-[14px] bg-white border border-[#e5e5ea] rounded-[10px] outline-none
                    transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    hover:border-[#c7c7cc] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]
                    focus:border-[#007aff] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]
                    placeholder:text-[#aeaeb2]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#aeaeb2] hover:text-[#636366] transition-colors">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center mb-7">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-[13px] text-[#636366]">Remember me</span>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-[44px] bg-[#007aff] text-white text-[14px] font-semibold rounded-[10px]
                transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                hover:bg-[#0062d1] hover:shadow-[0_4px_14px_rgba(0,122,255,0.25)] hover:-translate-y-[1px]
                active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed
                flex items-center justify-center gap-2">
              {loading && <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? '' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-[#e5e5ea]">
            <p className="text-[12px] text-[#aeaeb2]">© 2026 SS PAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
