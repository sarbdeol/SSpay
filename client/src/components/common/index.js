import React, { useState } from 'react';
import { HiChevronDown, HiX, HiSearch, HiDownload } from 'react-icons/hi';

// ════════════════════════════════════════════
// STAT CARD - Colorful gradient dashboard card
// ════════════════════════════════════════════
const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-teal-400 to-emerald-500',
  'from-orange-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-green-400 to-teal-500',
  'from-purple-400 to-pink-500',
];

export function StatCard({ title, value, prefix = '₹', index = 0, onClick }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-card 
        hover:shadow-card-hover hover:scale-[1.02] transition-mac cursor-pointer`}
    >
      <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
      <p className="text-2xl font-bold tracking-tight">
        {typeof value === 'number' ? `${prefix}${value.toLocaleString()}` : value}
      </p>
      {onClick && <p className="text-xs opacity-60 mt-3">Show More Details →</p>}
    </div>
  );
}

// ════════════════════════════════════════════
// DATA TABLE - Reusable table with filters
// ════════════════════════════════════════════
export function DataTable({
  columns, data, total = 0, page = 1, limit = 10,
  onPageChange, loading, actions, onSearch, searchPlaceholder,
  onExport, title, filters
}) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-white rounded-2xl shadow-card">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          <div className="flex items-center gap-2">
            {onSearch && (
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={searchPlaceholder || 'Search...'}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-9 pr-4 h-9 text-sm border border-gray-200 rounded-lg focus:border-brand-500 
                    focus:ring-2 focus:ring-brand-500/10 outline-none transition-mac hover:border-gray-300"
                />
              </div>
            )}
            {onExport && (
              <button onClick={onExport}
                className="flex items-center gap-1.5 px-3 h-9 bg-emerald-600 text-white text-sm font-medium 
                  rounded-lg hover:bg-emerald-700 transition-mac">
                <HiDownload className="w-4 h-4" /> Export
              </button>
            )}
          </div>
        </div>
        {filters && <div className="flex flex-wrap gap-3 mt-3">{filters}</div>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {columns.map((col, i) => (
                <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-5 py-10 text-center text-gray-400">Loading...</td></tr>
            ) : data?.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-5 py-10 text-center text-gray-400">No records found.</td></tr>
            ) : (
              data?.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-gray-50/50 transition-mac">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-5 py-3.5 text-sm text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && <td className="px-5 py-3.5">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => onPageChange?.(i + 1)}
                className={`w-8 h-8 text-sm rounded-lg transition-mac ${
                  page === i + 1 ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// FORM INPUT - Styled input with label
// ════════════════════════════════════════════
export function FormInput({ label, required, error, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        {...props}
        className={`w-full h-11 px-4 text-sm border rounded-xl bg-white outline-none transition-mac
          ${error ? 'border-red-400 focus:ring-red-500/10' : 'border-gray-200 hover:border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10'}
          ${props.className || ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ════════════════════════════════════════════
// FORM SELECT - Styled dropdown
// ════════════════════════════════════════════
export function FormSelect({ label, required, error, options = [], placeholder, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full h-11 px-4 pr-10 text-sm border rounded-xl bg-white outline-none appearance-none transition-mac
            ${error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10'}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <HiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ════════════════════════════════════════════
// FORM TEXTAREA
// ════════════════════════════════════════════
export function FormTextarea({ label, required, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        {...props}
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white outline-none transition-mac
          hover:border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-y min-h-[80px]"
      />
    </div>
  );
}

// ════════════════════════════════════════════
// TOGGLE SWITCH
// ════════════════════════════════════════════
export function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer mb-4">
      <div className={`relative w-11 h-6 rounded-full transition-mac ${checked ? 'bg-brand-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-mac
          ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      </div>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
    </label>
  );
}

// ════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-modal w-full ${maxWidth} max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-mac">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// BUTTON
// ════════════════════════════════════════════
export function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm hover:shadow-md',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`h-11 px-5 text-sm font-semibold rounded-xl transition-mac inline-flex items-center justify-center gap-2
        ${variants[variant]} ${loading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════
// STATUS BADGE
// ════════════════════════════════════════════
export function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
    PICKED: 'bg-blue-50 text-blue-600 border-blue-200',
    PAID: 'bg-violet-50 text-violet-600 border-violet-200',
    CLEARED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-600 border-red-200',
    EXPIRED: 'bg-gray-50 text-gray-600 border-gray-200',
    APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Inactive: 'bg-red-50 text-red-600 border-red-200',
  };

  const style = styles[status] || styles.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border ${style}`}>
      {status}
    </span>
  );
}

// ════════════════════════════════════════════
// DATE FILTER
// ════════════════════════════════════════════
export function DateFilter({ startDate, endDate, onStartChange, onEndChange }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Start Date</label>
        <input type="date" value={startDate} onChange={e => onStartChange(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">End Date</label>
        <input type="date" value={endDate} onChange={e => onEndChange(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition-mac" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// PAGE HEADER
// ════════════════════════════════════════════
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
