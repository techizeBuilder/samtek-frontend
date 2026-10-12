import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck, ChevronDown, ChevronUp,
  FileText, AlertTriangle, PauseCircle,
} from 'lucide-react';
import {
  fileHref, formatDate, formatDay, formatAddress, expiryBadge, SENSITIVE_LABELS, BANK_LABELS,
} from '@/components/accounts/vendor/vendorUi';
import LowVendorCoverageTab from './purchaseApprovals/LowVendorCoverageTab';
import PoApprovalsTab from './purchaseApprovals/PoApprovalsTab';
import PurchaseRulesSettingsTab from './purchaseApprovals/PurchaseRulesSettingsTab';
import { AuditLogTable } from '@/components/accounts/purchase/AuditLog';

// Company Admin's "Purchase & Vendor Approval" page (procurement-v2,
// 2026-10-08). Client decision: every approval the procurement blueprint
// gives to Purchase Head / Purchase Manager / Management belongs to the
// Company Admin, on this one page with a tab per approval type. Vendor tabs
// first; PR / vendor-selection / PO approvals get added here as more tabs
// when the rebuild reaches them. Backend: /api/vendor-approvals
// (vendorApprovalController.js). Built like LeadSettingRequests.jsx.
const TABS = [
  { id: 'NewVendor', label: 'New Vendors', types: 'NewVendor' },
  { id: 'DetailsChange', label: 'Vendor Changes', types: 'DetailsChange' },
  { id: 'Status', label: 'Suspend / Blacklist', types: 'Suspend,Blacklist,Reinstate' },
  { id: 'Watchlist', label: 'Watchlist', types: null },
  // procurement-v2, 2026-10-08 — company-wide purchase rules (min vendors per
  // item, PO approval threshold) and the items short of vendors.
  { id: 'POApprovals', label: 'PO Approvals', types: null },
  { id: 'LowCoverage', label: 'Low Vendor Coverage', types: null },
  { id: 'Settings', label: 'Settings', types: null },
  // gap 17 (2026-10-10) — every step of every PO.
  { id: 'AuditLog', label: 'Audit Log', types: null },
];
// The tabs grouped under parent tabs (2026-10-10) — the flat row had grown
// to eight. A parent's badge is the sum of its children's pending counts.
const GROUPS = [
  { id: 'vendors', label: 'Vendors', tabs: ['NewVendor', 'DetailsChange', 'Status', 'Watchlist', 'LowCoverage'] },
  { id: 'orders', label: 'Purchase Orders', tabs: ['POApprovals', 'AuditLog'] },
  { id: 'settings', label: 'Settings', tabs: ['Settings'] },
];
// Tabs that render their own component instead of the request list.
const CUSTOM_TABS = {
  Watchlist: () => <WatchlistTab />,
  POApprovals: () => <PoApprovalsTab />,
  LowCoverage: () => <LowVendorCoverageTab />,
  Settings: () => <PurchaseRulesSettingsTab />,
  AuditLog: () => <AuditLogTable />,
};
const STATUS_TABS = ['Pending', 'Approved', 'Rejected'];
const TYPE_LABEL = {
  NewVendor: 'New vendor', DetailsChange: 'Detail change', Suspend: 'Suspend', Blacklist: 'Blacklist', Reinstate: 'Reinstate',
};
const who = (u) => u?.fullName || u?.username || 'Unknown';

// ── Shared review controls: Approve / Reject-with-reason ─────────────────────
function ReviewBar({ onApprove, onReject, busy, approveDisabled, approveHint }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy || approveDisabled} onClick={onApprove} title={approveHint}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
        </Button>
        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setShowReject(v => !v)}>
          <XCircle className="h-4 w-4 mr-1.5" />Reject
        </Button>
      </div>
      {approveDisabled && approveHint && <p className="text-[11px] text-slate-400">{approveHint}</p>}
      {showReject && (
        <div className="w-72 space-y-2">
          <Textarea rows={2} className="text-sm" placeholder="Reason (required — Purchase sees this)" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReject(reason.trim())}>Confirm Reject</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestMeta({ request }) {
  return (
    <>
      <p className="text-xs text-gray-500 mt-1">
        Requested by {who(request.requestedBy)} · {new Date(request.requestedAt || request.createdAt).toLocaleString()}
      </p>
      {request.status !== 'Pending' && (
        <p className="text-xs text-gray-500 mt-0.5">
          {request.status} by {who(request.reviewedBy)}
          {request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleString()}` : ''}
          {request.reviewRemarks ? ` — "${request.reviewRemarks}"` : ''}
        </p>
      )}
    </>
  );
}

// ── Full vendor details, for checking a new vendor before approving ─────────
const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase text-slate-400 font-semibold">{label}</p>
    <p className="text-sm text-slate-800 break-words">{value || '—'}</p>
  </div>
);

function VendorDetails({ vendor }) {
  const bank = vendor.bankDetails || {};
  const coi = vendor.conflictOfInterest?.declared;
  return (
    <div className="mt-3 space-y-4 border-t pt-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Legal name" value={vendor.supplierName} />
        <Field label="Trade name" value={vendor.tradeName} />
        <Field label="Entity type" value={vendor.entityType} />
        <Field label="Business type" value={(vendor.businessTypes || []).join(', ')} />
        <Field label="OEM / Distributor" value={vendor.oemStatus === 'None' ? 'Neither' : vendor.oemStatus} />
        <Field label="Capacity" value={vendor.capacity} />
        <Field label="GSTIN" value={vendor.gstNumber || 'Not GST-registered'} />
        <Field label="PAN" value={vendor.panNumber} />
        <Field label="CIN / MSME / IEC" value={[vendor.cinNumber, vendor.msmeNumber, vendor.iecNumber].filter(Boolean).join(' · ')} />
        <Field label="Contact" value={[vendor.contactPerson, vendor.contactDesignation].filter(Boolean).join(', ')} />
        <Field label="Phone / WhatsApp" value={[vendor.phone, vendor.whatsappNumber].filter(Boolean).join(' / ')} />
        <Field label="Email" value={vendor.email} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Registered address" value={formatAddress(vendor.address)} />
        <Field label="Billing address" value={vendor.billingSameAsRegistered !== false ? 'Same as registered' : formatAddress(vendor.billingAddress)} />
        <Field label="Dispatch address" value={vendor.dispatchSameAsRegistered !== false ? 'Same as registered' : formatAddress(vendor.dispatchAddress)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(BANK_LABELS).map(([k, label]) => <Field key={k} label={label} value={bank[k]} />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Quality system" value={vendor.qualitySystem} />
        <Field label="Certificates" value={[vendor.providesInspectionCertificate && 'Inspection', vendor.providesMaterialTestCertificate && 'Material test'].filter(Boolean).join(', ') || 'None'} />
        <Field label="Risk class (Purchase's view)" value={vendor.riskClass} />
        <Field label="Locations served" value={vendor.locationsServed} />
        <Field label="Conflict of interest" value={coi == null ? 'Not answered' : coi ? `Yes — ${vendor.conflictOfInterest?.details || 'no details'}` : 'No'} />
      </div>
      <div>
        <p className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Products ({(vendor.suppliedItems || []).length}) / Services ({(vendor.services || []).length})</p>
        <div className="flex flex-wrap gap-1">
          {(vendor.suppliedItems || []).map(it => (
            <span key={it._id || it} className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">{it.name || it}{it.code ? ` (${it.code})` : ''}</span>
          ))}
          {(vendor.services || []).map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">{s}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Documents</p>
        <div className="border rounded-md divide-y">
          {(vendor.documents || []).length === 0 && <p className="text-xs text-slate-400 px-3 py-2">None</p>}
          {(vendor.documents || []).map(doc => {
            // Valid THROUGH its expiry date — compared by day (vendorUi.js).
            const badge = doc.expiryDate ? expiryBadge(doc.expiryDate) : null;
            return (
              <div key={doc._id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <a href={fileHref(doc.fileUrl)} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{doc.docType}</a>
                <span className="text-xs text-slate-400">{doc.docNumber}</span>
                {badge && (
                  <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.text}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: New vendor ────────────────────────────────────────────────────────
function NewVendorCard({ request, onReview, busy }) {
  const vendor = request.vendor || {};
  const hasGst = !!String(vendor.gstNumber || '').trim();
  const [open, setOpen] = useState(request.status === 'Pending');
  const [checks, setChecks] = useState({ gstVerified: false, panVerified: false, bankVerified: false, documentsVerified: false });
  const [riskClass, setRiskClass] = useState(vendor.riskClass || '');
  const [remarks, setRemarks] = useState('');
  const allTicked = (!hasGst || checks.gstVerified) && checks.panVerified && checks.bankVerified && checks.documentsVerified;
  const toggle = (k) => setChecks(c => ({ ...c, [k]: !c[k] }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(o => !o)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{vendor.supplierName || '(vendor deleted)'}</span>
              <span className="text-xs font-mono text-gray-400">{vendor.supplierCode}</span>
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
            <RequestMeta request={request} />
          </button>
        </div>
        {open && vendor._id && <VendorDetails vendor={vendor} />}

        {request.status === 'Pending' && vendor._id && (
          <div className="mt-4 border-t pt-3 flex flex-wrap gap-4 justify-between items-start">
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Verification — tick after checking</p>
              {[
                ['gstVerified', hasGst ? 'GSTIN checked against the GST certificate' : 'GSTIN — not GST-registered (nothing to check)', !hasGst],
                ['panVerified', 'PAN checked against the PAN card', false],
                ['bankVerified', 'Bank details checked against the cancelled cheque / bank proof', false],
                ['documentsVerified', 'Documents are genuine and in date', false],
              ].map(([k, label, disabled]) => (
                <label key={k} className={`flex items-center gap-2 ${disabled ? 'text-slate-400' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={disabled ? true : checks[k]} disabled={disabled} onChange={() => toggle(k)} /> {label}
                </label>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500">Risk class:</span>
                <select value={riskClass} onChange={e => setRiskClass(e.target.value)} className="border rounded-md px-2 py-1 text-sm">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <Textarea rows={2} className="text-sm w-80" placeholder="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
            <ReviewBar
              busy={busy}
              approveDisabled={!allTicked}
              approveHint={!allTicked ? 'Tick every verification check to approve' : undefined}
              onApprove={() => onReview(request._id, 'approve', remarks, { verification: { ...checks, gstVerified: hasGst ? checks.gstVerified : false }, riskClass })}
              onReject={(reason) => onReview(request._id, 'reject', reason)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab 2: legal name / GSTIN / PAN / bank change on an approved vendor ──────
function ChangeCard({ request, onReview, busy }) {
  const vendor = request.vendor || {};
  const payload = request.payload || {};
  const prev = request.previousValue || {};
  const rows = [];
  for (const field of Object.keys(payload)) {
    if (field === 'bankDetails') {
      for (const [k, label] of Object.entries(BANK_LABELS)) {
        const before = prev.bankDetails?.[k] || '';
        const after = payload.bankDetails?.[k] || '';
        rows.push({ label: `Bank — ${label}`, before, after, changed: before !== after });
      }
    } else {
      rows.push({ label: SENSITIVE_LABELS[field] || field, before: prev[field] || '', after: payload[field] || '', changed: true });
    }
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{vendor.supplierName || '(vendor deleted)'}</span>
              <span className="text-xs font-mono text-gray-400">{vendor.supplierCode}</span>
            </div>
            <table className="mt-2 text-sm w-full max-w-xl">
              <thead><tr className="text-[11px] uppercase text-slate-400 text-left"><th className="font-semibold pr-3">Field</th><th className="font-semibold pr-3">Current</th><th className="font-semibold">Proposed</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.label} className={r.changed ? '' : 'text-slate-400'}>
                    <td className="pr-3 py-0.5">{r.label}</td>
                    <td className="pr-3 py-0.5">{r.before || '—'}</td>
                    <td className={`py-0.5 ${r.changed ? 'font-semibold text-blue-700' : ''}`}>{r.after || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payload.bankDetails && request.status === 'Pending' && (
              <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Bank change — confirm with the vendor directly (not just by email) before approving. Payments keep going to the current account until you do.
              </p>
            )}
            <RequestMeta request={request} />
          </div>
          {request.status === 'Pending' && (
            <ReviewBar busy={busy} onApprove={() => onReview(request._id, 'approve')} onReject={(reason) => onReview(request._id, 'reject', reason)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab 3: Suspend / Blacklist / Reinstate ───────────────────────────────────
function StatusRequestCard({ request, onReview, busy }) {
  const vendor = request.vendor || {};
  const payload = request.payload || {};
  const tone = request.type === 'Reinstate' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>{TYPE_LABEL[request.type]}</span>
              <span className="font-semibold text-gray-800">{vendor.supplierName || '(vendor deleted)'}</span>
              <span className="text-xs text-gray-400">currently {vendor.approvalStatus}</span>
            </div>
            <p className="text-sm text-gray-800 mt-1.5"><b>Reason:</b> {payload.reason || '—'}</p>
            {payload.fromWatchlist && <p className="text-xs text-gray-500">From the Watchlist — rating {payload.rating ?? '—'} over {payload.ratingEvents ?? 0} events</p>}
            {payload.reviewDate && <p className="text-xs text-gray-500">Review on {formatDay(payload.reviewDate)}</p>}
            {(request.evidence || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {request.evidence.map((e, i) => (
                  <a key={i} href={fileHref(e.fileUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" />{e.fileName || `Evidence ${i + 1}`}
                  </a>
                ))}
              </div>
            )}
            <RequestMeta request={request} />
          </div>
          {request.status === 'Pending' && (
            <ReviewBar busy={busy} onApprove={() => onReview(request._id, 'approve')} onReject={(reason) => onReview(request._id, 'reject', reason)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab 4: Watchlist (derived from the existing vendor rating) ───────────────
function WatchlistTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-approvals', 'watchlist'],
    queryFn: () => apiRequest('GET', '/api/vendor-approvals/watchlist'),
  });
  const suspendM = useMutation({
    mutationFn: ({ vendorId }) => apiRequest('POST', `/api/vendor-approvals/watchlist/${vendorId}/suspend`, { reason, reviewDate: reviewDate || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-approvals'] });
      setSuspending(null);
      toast({ title: 'Vendor suspended' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const t = data?.thresholds;
  const list = data?.watchlist || [];

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;
  return (
    <div className="space-y-3">
      {t && (
        <p className="text-xs text-gray-500">
          Approved vendors whose rating (on-time delivery + QC results, from the Vendor Ratings tab) is below {t.ratingBelow} over at least {t.minEvents} events.
          Nothing happens to them automatically — suspend one here if needed.
        </p>
      )}
      {list.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Clock className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">No vendor is on the watchlist.</p></div>
      ) : list.map(v => (
        <Card key={v._id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800">{v.supplierName} <span className="text-xs font-mono text-gray-400">{v.supplierCode}</span></p>
                <p className="text-sm text-orange-700 mt-0.5">Rating {v.standing?.rating} / 5 over {v.standing?.eventCount} events · {v.standing?.receivedPOCount} received POs</p>
                <p className="text-xs text-gray-500">{v.contactPerson} · {v.phone}</p>
              </div>
              {suspending === v._id ? (
                <div className="w-72 space-y-2">
                  <Textarea rows={2} className="text-sm" placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
                  <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
                  <p className="text-[11px] text-gray-400 -mt-1">Review date (optional)</p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSuspending(null)}>Cancel</Button>
                    <Button size="sm" variant="destructive" disabled={suspendM.isPending || !reason.trim()} onClick={() => suspendM.mutate({ vendorId: v._id })}>Confirm Suspend</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSuspending(v._id); setReason(''); setReviewDate(''); }}>
                  <PauseCircle className="h-4 w-4 mr-1.5" />Suspend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PurchaseVendorApprovals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [group, setGroup] = useState('vendors');
  const [tab, setTab] = useState('NewVendor');
  const [status, setStatus] = useState('Pending');
  const tabDef = TABS.find(t => t.id === tab);
  const groupDef = GROUPS.find(g => g.id === group);
  const openGroup = (id) => { setGroup(id); setTab(GROUPS.find(g => g.id === id).tabs[0]); setStatus('Pending'); };

  // Pending counts for the tab badges.
  const { data: pendingData } = useQuery({
    queryKey: ['vendor-approvals', 'pending-counts'],
    queryFn: () => apiRequest('GET', '/api/vendor-approvals?status=Pending'),
  });
  const pendingCount = (types) => (pendingData?.requests || []).filter(r => types.split(',').includes(r.type)).length;
  // POs waiting for a decision (new POs + cancellation requests).
  const { data: poPending } = useQuery({
    queryKey: ['po-approvals', 'Pending', 'count'],
    queryFn: () => apiRequest('GET', '/api/po-approvals?status=Pending&page=1&limit=1'),
  });
  const tabCount = (id) => {
    if (id === 'POApprovals') return poPending?.pagination?.total || 0;
    const t = TABS.find(x => x.id === id);
    return t?.types ? pendingCount(t.types) : 0;
  };
  const groupCount = (g) => g.tabs.reduce((sum, id) => sum + tabCount(id), 0);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-approvals', tab, status],
    queryFn: () => apiRequest('GET', `/api/vendor-approvals?type=${tabDef.types}&status=${status}`),
    enabled: !!tabDef.types,
  });
  const requests = data?.requests || [];

  const reviewM = useMutation({
    mutationFn: ({ id, decision, remarks, extra }) => apiRequest('PUT', `/api/vendor-approvals/${id}/review`, { decision, remarks, ...(extra || {}) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-approvals'] });
      toast({ title: vars.decision === 'approve' ? 'Approved' : 'Rejected', description: 'Purchase has been notified.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const handleReview = (id, decision, remarks, extra) => reviewM.mutate({ id, decision, remarks, extra });

  const CardFor = tab === 'NewVendor' ? NewVendorCard : tab === 'DetailsChange' ? ChangeCard : StatusRequestCard;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-800">Purchase &amp; Vendor Approval</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Purchase decisions that need your sign-off. A new vendor can't be quoted or ordered from until you approve it here;
        changes to an approved vendor's legal name, GSTIN, PAN or bank details, and any suspension, blacklisting or reinstatement, also wait for you.
      </p>

      {/* Parent tabs */}
      <div className="inline-flex flex-wrap gap-1 mb-3 rounded-lg bg-gray-100 p-1">
        {GROUPS.map(g => {
          const n = groupCount(g);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => openGroup(g.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 ${group === g.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {g.label}
              {n > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-blue-600">{n}</Badge>}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs of the open parent (none when it has just one) */}
      {groupDef.tabs.length > 1 && (
      <div className="flex gap-1 mb-4 border-b border-gray-200 flex-wrap">
        {groupDef.tabs.map(id => TABS.find(t => t.id === id)).map(t => {
          const n = tabCount(t.id);
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setStatus('Pending'); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {n > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-blue-600">{n}</Badge>}
            </button>
          );
        })}
      </div>
      )}

      {CUSTOM_TABS[tab] ? CUSTOM_TABS[tab]() : (
        <>
          <div className="flex gap-1.5 mb-4">
            {STATUS_TABS.map(s => (
              <button
                key={s} type="button" onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                {s}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No {status.toLowerCase()} requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => <CardFor key={r._id} request={r} onReview={handleReview} busy={reviewM.isPending} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
