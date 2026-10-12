// Shared bits for Vendor Master v2 (procurement-v2, 2026-10-08) — used by
// Vendor Master (Purchase) and the Company Admin's Purchase & Vendor Approval
// page, so both show a vendor's stage, documents and labels the same way.
import { config } from '@/config/environment';

// Stage = Supplier.approvalStatus, or for an Approved vendor the derived
// Probationary / Active / Watchlist (server: vendorApprovalService.js
// getVendorStanding).
export const STAGE_META = {
  Draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  'Pending Approval': { label: 'Pending Approval', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  Approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Probationary: { label: 'Probationary', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Watchlist: { label: 'Watchlist', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  Suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 border-red-200' },
  Blacklisted: { label: 'Blacklisted', className: 'bg-red-100 text-red-800 border-red-300' },
};

export const vendorStage = (vendor) => vendor?.standing?.stage || vendor?.approvalStatus || 'Draft';

export const DOC_TYPES = [
  'GST Certificate', 'PAN Card', 'MSME/Udyam Certificate', 'Company Registration',
  'ISO/Quality Certificate', 'Authorization/Dealership Certificate', 'Product Certificate',
  'Cancelled Cheque/Bank Proof', 'Other',
];

export const SENSITIVE_LABELS = {
  supplierName: 'Legal Name',
  gstNumber: 'GSTIN',
  panNumber: 'PAN',
  bankDetails: 'Bank Details',
};

export const BANK_LABELS = {
  accountName: 'Account Name',
  accountNumber: 'Account Number',
  bankName: 'Bank Name',
  branchName: 'Branch Name',
  ifscCode: 'IFSC Code',
};

// Uploaded files are served by the backend's /uploads static route.
export const fileHref = (fileUrl) =>
  !fileUrl ? '#' : /^https?:\/\//.test(fileUrl) ? fileUrl : `${config.baseURL}${fileUrl}`;

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

// A document's expiry date is a calendar DAY (saved from a date input as that
// day's UTC midnight) — compare/show it by its 'YYYY-MM-DD', never as a
// timestamp, or in India it reads as already past from 5:30 AM on the very
// day it's still valid. Server does the same (vendorApprovalService.js).
const pad2 = (n) => String(n).padStart(2, '0');
const dayKeyOf = (d) => new Date(d).toISOString().slice(0, 10);
const todayKey = () => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`; };

export const formatDay = (d) => {
  if (!d) return '—';
  const [y, m, day] = dayKeyOf(d).split('-');
  return `${day}/${m}/${y}`;
};

// 'expired' (before today) | 'today' | 'soon' (within 30 days) | null.
// Valid THROUGH the expiry date itself.
export const expiryState = (expiryDate) => {
  if (!expiryDate) return null;
  const key = dayKeyOf(expiryDate);
  const today = todayKey();
  if (key < today) return 'expired';
  if (key === today) return 'today';
  const days = (Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
  return days <= 30 ? 'soon' : null;
};

// Badge text + colour for a document's expiry, shared by Vendor Master and
// the Company Admin's approval page.
export const expiryBadge = (expiryDate) => {
  const state = expiryState(expiryDate);
  if (state === 'expired') return { text: `Expired ${formatDay(expiryDate)}`, className: 'bg-red-50 text-red-700 border-red-200' };
  if (state === 'today') return { text: 'Expires today', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (state === 'soon') return { text: `Expires ${formatDay(expiryDate)}`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { text: `Expires ${formatDay(expiryDate)}`, className: 'bg-slate-50 text-slate-500 border-slate-200' };
};

export const formatAddress = (a) =>
  [a?.street, a?.city, a?.state, a?.zipCode, a?.country].filter(Boolean).join(', ') || '—';
