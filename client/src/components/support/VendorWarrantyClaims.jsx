import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fileHref } from '@/components/accounts/vendor/vendorUi';
import { Search, Plus, ArrowLeft, Star, FileText, Loader2 } from 'lucide-react';

// Vendor warranty claims (2026-10-13, serial numbers Part 2) — opened from
// Complaints → Support beside "+ Create Ticket". A customer's unit failed: we
// find it by the serial they give (our serial records from Store's receive),
// or pick the vendor + item by hand, and record what we told the vendor, how
// they answered, how it ended and how satisfied we were. Feeds the vendor
// score's warranty part (claim response time, resolution).
const KEY = '/api/vendor-warranty-claims';
const DEFECTS = ['Electrical', 'Mechanical', 'Performance', 'Physical damage', 'Missing part', 'Other'];
const SEVERITIES = ['Minor', 'Major', 'Critical'];
const OUTCOMES = ['Repaired', 'Replaced', 'Credit note', 'Refused', 'Not covered'];
const FILTERS = [['open', 'Open'], ['Waiting for vendor', 'Waiting for vendor'], ['Vendor responded', 'Vendor responded'], ['Closed', 'Closed'], ['all', 'All']];
const TONE = {
  'Waiting for vendor': 'bg-amber-50 text-amber-800 border-amber-200',
  'Vendor responded': 'bg-blue-50 text-blue-700 border-blue-200',
  'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const today = () => new Date().toISOString().split('T')[0];
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const daysSince = (a, b = new Date()) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
const field = 'border rounded-md px-2 h-9 text-sm bg-white w-full';

function StatusChip({ status }) {
  return <span className={`inline-block text-[11px] font-semibold border rounded-full px-2 py-0.5 ${TONE[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{status}</span>;
}

function Stars({ value, onChange, size = 18 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={onChange ? 'cursor-pointer' : 'cursor-default'} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star style={{ width: size, height: size }} className={n <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`text-xs px-2.5 py-1 rounded-md font-medium ${value === o ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{o}</button>
      ))}
    </div>
  );
}

function EvidenceInput({ files, onChange, max }) {
  return (
    <div className="space-y-1">
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="text-xs"
        onChange={(e) => onChange(Array.from(e.target.files || []).slice(0, max))}
      />
      <p className="text-[11px] text-slate-500">{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} chosen` : `Photos or PDFs, up to ${max}, 10 MB each.`}</p>
    </div>
  );
}

// ── List ────────────────────────────────────────────────────────────────────
function ClaimList({ onOpen, onNew, canAdd }) {
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const params = new URLSearchParams({ status: filter, limit: '50' });
  if (q) params.set('search', q);
  const { data, isLoading } = useQuery({ queryKey: [KEY, filter, q], queryFn: () => apiRequest('GET', `${KEY}?${params}`) });
  const rows = data?.rows || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setFilter(v)} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${filter === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {l}{v === 'open' && data?.open != null ? ` (${data.open})` : ''}
            </button>
          ))}
        </div>
        {canAdd && <Button size="sm" className="ml-auto" onClick={onNew}><Plus className="w-4 h-4 mr-1" /> New claim</Button>}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <Input className="pl-8" placeholder="Claim no., serial, vendor, item, customer or ticket…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="border rounded-lg divide-y bg-white max-h-[55vh] overflow-y-auto">
        {isLoading ? <p className="p-6 text-center text-sm text-slate-400">Loading…</p>
          : rows.length === 0 ? <p className="p-6 text-center text-sm text-slate-400 italic">No claims here.</p>
            : rows.map(c => (
              <button key={c._id} type="button" onClick={() => onOpen(c._id)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex flex-wrap items-start gap-x-4 gap-y-1">
                <div className="min-w-[150px]">
                  <p className="font-semibold text-slate-800 text-sm">{c.number}</p>
                  <p className="font-mono text-[11px] text-slate-500">{c.serialNumber || '—'}</p>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm text-slate-700">{c.itemName}</p>
                  <p className="text-[11px] text-slate-500">{c.vendorName}{c.customerName ? ` · ${c.customerName}` : ''}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <StatusChip status={c.status} />
                  <p className="text-[11px] text-slate-500">
                    {c.vendorRespondedAt ? `Responded in ${daysSince(c.reportedToVendorAt, c.vendorRespondedAt)} d` : `Waiting ${daysSince(c.reportedToVendorAt)} d`}
                    {c.outcome ? ` · ${c.outcome}` : ''}
                  </p>
                  {c.satisfaction?.rating ? <div className="flex justify-end"><Stars value={c.satisfaction.rating} size={12} /></div> : null}
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}

// ── New claim ───────────────────────────────────────────────────────────────
function NewClaim({ onBack, onCreated }) {
  const { toast } = useToast();
  const [serial, setSerial] = useState('');
  const [matches, setMatches] = useState(null);   // null = not searched yet
  const [unitId, setUnitId] = useState('');
  const [finding, setFinding] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({ underWarranty: 'Unsure', customerName: '', ticketRef: '', problem: '', defectType: 'Other', severity: 'Major', reportedToVendorAt: today() });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const byHand = matches && matches.length === 0;
  const unit = (matches || []).find(u => u._id === unitId) || null;

  const { data: vendors } = useQuery({ queryKey: [KEY, 'vendors'], queryFn: () => apiRequest('GET', `${KEY}/vendors`), enabled: !!byHand });
  const iq = useDebouncedValue(itemSearch.trim(), 300);
  const { data: items } = useQuery({ queryKey: [KEY, 'items', iq], queryFn: () => apiRequest('GET', `${KEY}/items?search=${encodeURIComponent(iq)}`), enabled: !!byHand && !item });

  const find = async () => {
    if (!serial.trim()) return;
    setFinding(true);
    try {
      const r = await apiRequest('GET', `${KEY}/lookup?serial=${encodeURIComponent(serial.trim())}`);
      const list = r?.data || [];
      setMatches(list);
      setUnitId(list.length === 1 ? list[0]._id : '');
    } catch (err) {
      toast({ title: 'Lookup failed', description: err.message, variant: 'destructive' });
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    if (!matches) return toast({ title: 'Find the serial first', variant: 'destructive' });
    if (!byHand && !unit) return toast({ title: 'Pick which unit it is', variant: 'destructive' });
    if (byHand && !vendorId) return toast({ title: 'Pick the vendor', variant: 'destructive' });
    if (byHand && !item && !itemSearch.trim()) return toast({ title: 'Pick the item', variant: 'destructive' });
    if (!form.problem.trim()) return toast({ title: 'Describe the problem', variant: 'destructive' });
    setSaving(true);
    try {
      const fd = new FormData();
      if (unit) fd.append('purchasedUnit', unit._id);
      else {
        fd.append('serialNumber', serial.trim());
        fd.append('vendor', vendorId);
        if (item) fd.append('item', item._id); else fd.append('itemName', itemSearch.trim());
      }
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('evidence', f));
      const r = await apiRequest('POST', KEY, fd);
      toast({ title: r?.message || 'Claim raised' });
      queryClient.invalidateQueries({ queryKey: [KEY] });
      onCreated(r?.data?._id);
    } catch (err) {
      toast({ title: 'Not saved', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const months = unit ? unit.vendorWarrantyMonths : item ? item.warrantyMonths : null;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> All claims</button>

      {/* 1. The unit */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-slate-700">Serial number the customer gave <span className="text-rose-500">*</span></Label>
        <div className="flex gap-2">
          <Input value={serial} onChange={(e) => { setSerial(e.target.value); setMatches(null); setUnitId(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } }} placeholder="e.g. GEN-0104" className="font-mono" />
          <Button type="button" variant="outline" onClick={find} disabled={finding || !serial.trim()}>{finding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}<span className="ml-1">Find</span></Button>
        </div>

        {matches && matches.length > 0 && (
          <div className="space-y-2">
            {matches.length > 1 && <p className="text-xs text-amber-700">This serial was received for {matches.length} items — pick the one that failed.</p>}
            {matches.map(u => (
              <label key={u._id} className={`block border rounded-lg p-3 cursor-pointer ${unitId === u._id ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-start gap-2">
                  {matches.length > 1 && <input type="radio" checked={unitId === u._id} onChange={() => setUnitId(u._id)} className="mt-1" />}
                  <div className="flex-1 text-sm space-y-0.5">
                    <p className="font-semibold text-slate-800">{u.itemName}{u.isLot ? <span className="text-[11px] font-normal text-slate-500"> · lot of {u.lotQty} {u.qtyUnit}</span> : null}</p>
                    <p className="text-slate-600">{u.vendorName || '—'} · {u.poNumber || 'no PO'} · received {day(u.receivedAt)}</p>
                    <p className="text-slate-600">Vendor warranty: <strong>{u.vendorWarrantyMonths > 0 ? `${u.vendorWarrantyMonths} months` : 'none'}</strong>
                      {u.warrantyCardUrl && <a href={fileHref(u.warrantyCardUrl)} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-0.5"><FileText className="w-3 h-3" /> card</a>}
                    </p>
                    {u.claims.length > 0 && (
                      <p className="text-[11px] text-red-700">Earlier claims on this serial: {u.claims.map(c => `${c.number} (${c.outcome || c.status})`).join(', ')}</p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {byHand && (
          <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-3 bg-slate-50">
            <p className="text-xs text-slate-600">Not in our serial records (received before serials were kept, or not bought on a PO). Pick the vendor and the item — the warranty months come from the item.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vendor <span className="text-rose-500">*</span></Label>
                <select className={field} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">Choose…</option>
                  {(vendors?.data || []).map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Item <span className="text-rose-500">*</span></Label>
                {item ? (
                  <div className="flex items-center gap-2 h-9 px-2 border rounded-md bg-white text-sm">
                    <span className="flex-1 truncate">{item.name}</span>
                    <button type="button" className="text-xs text-blue-600" onClick={() => { setItem(null); setItemSearch(''); }}>Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Search item name or code" />
                    {iq && (items?.data || []).length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border rounded-md shadow">
                        {items.data.map(i => (
                          <button key={i._id} type="button" onClick={() => setItem(i)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-50">
                            {i.name} <span className="text-[11px] text-slate-400">{i.code}{i.warrantyMonths ? ` · ${i.warrantyMonths} mo` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {months != null && <p className="text-xs text-slate-600">Warranty months on record: <strong>{months || 0}</strong> {unit ? '(from the vendor, at receive)' : '(the item\'s own warranty)'}</p>}
      </div>

      {/* 2. The claim */}
      {matches && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-slate-700">Under the vendor's warranty?</Label>
            <Segmented value={form.underWarranty} onChange={set('underWarranty')} options={['Yes', 'No', 'Unsure']} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Customer</Label><Input value={form.customerName} onChange={(e) => set('customerName')(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Ticket no. (optional)</Label><Input value={form.ticketRef} onChange={(e) => set('ticketRef')(e.target.value)} placeholder="e.g. TKT-0042" /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Problem <span className="text-rose-500">*</span></Label>
            <Textarea rows={3} value={form.problem} onChange={(e) => set('problem')(e.target.value)} placeholder="What failed, and how" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Defect type</Label><select className={field} value={form.defectType} onChange={(e) => set('defectType')(e.target.value)}>{DEFECTS.map(d => <option key={d}>{d}</option>)}</select></div>
            <div className="space-y-1"><Label className="text-xs">Severity</Label><select className={field} value={form.severity} onChange={(e) => set('severity')(e.target.value)}>{SEVERITIES.map(d => <option key={d}>{d}</option>)}</select></div>
            <div className="space-y-1"><Label className="text-xs">Vendor told on <span className="text-rose-500">*</span></Label><Input type="date" max={today()} value={form.reportedToVendorAt} onChange={(e) => set('reportedToVendorAt')(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Evidence</Label><EvidenceInput files={files} onChange={setFiles} max={5} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onBack} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Raise claim'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One claim ───────────────────────────────────────────────────────────────
function ClaimDetail({ id, onBack, canEdit }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: [KEY, 'one', id], queryFn: () => apiRequest('GET', `${KEY}/${id}`) });
  const c = data?.data;
  const [resp, setResp] = useState({ vendorRespondedAt: '', vendorResponse: '' });
  const [close, setClose] = useState({ outcome: '', resolvedAt: today(), costToUs: '', notes: '', satisfactionRating: 0, satisfactionComment: '' });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  if (isLoading || !c) return <p className="p-6 text-center text-sm text-slate-400">Loading…</p>;
  const open = c.status !== 'Closed';

  const save = async () => {
    const fd = new FormData();
    let any = false;
    if (!c.vendorRespondedAt && resp.vendorRespondedAt) { fd.append('vendorRespondedAt', resp.vendorRespondedAt); fd.append('vendorResponse', resp.vendorResponse); any = true; }
    if (close.outcome) {
      if (!close.satisfactionRating) return toast({ title: 'Rate the vendor\'s handling (1–5 stars) to close the claim', variant: 'destructive' });
      Object.entries(close).forEach(([k, v]) => fd.append(k, v));
      any = true;
    }
    files.forEach(f => fd.append('evidence', f));
    if (files.length) any = true;
    if (!any) return toast({ title: 'Nothing to save', description: 'Enter the vendor\'s response, close the claim, or add evidence.' });
    setSaving(true);
    try {
      const r = await apiRequest('PUT', `${KEY}/${c._id}`, fd);
      toast({ title: r?.message || 'Saved' });
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: [KEY] });
    } catch (err) {
      toast({ title: 'Not saved', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> All claims</button>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-slate-900">{c.number} <StatusChip status={c.status} /></p>
          <p className="text-sm text-slate-600">{c.itemName} · <span className="font-mono">{c.serialNumber || '—'}</span></p>
          <p className="text-sm text-slate-600">{c.vendorName}{c.poNumber ? ` · ${c.poNumber}` : ''}{c.receivedAt ? ` · received ${day(c.receivedAt)}` : ''}</p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          <p>Warranty: <strong>{c.vendorWarrantyMonths || 0} months</strong> ({c.monthsSource === 'serial' ? 'vendor, at receive' : 'item'})</p>
          <p>Under vendor warranty: <strong>{c.underWarranty}</strong></p>
          {c.customerName && <p>Customer: {c.customerName}</p>}
          {c.ticketRef && <p>Ticket: {c.ticketRef}</p>}
        </div>
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-sm space-y-1">
        <p className="text-slate-800 whitespace-pre-wrap">{c.problem}</p>
        <p className="text-[11px] text-slate-500">{c.defectType} · {c.severity} · vendor told {day(c.reportedToVendorAt)}</p>
        {(c.evidence || []).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {c.evidence.map((e, i) => <a key={i} href={fileHref(e.url)} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"><FileText className="w-3 h-3" /> {e.name || `File ${i + 1}`}</a>)}
          </div>
        )}
      </div>

      {c.vendorRespondedAt && (
        <div className="text-sm"><p className="font-semibold text-slate-700">Vendor responded {day(c.vendorRespondedAt)} <span className="font-normal text-slate-500">({daysSince(c.reportedToVendorAt, c.vendorRespondedAt)} days)</span></p>{c.vendorResponse && <p className="text-slate-600 whitespace-pre-wrap">{c.vendorResponse}</p>}</div>
      )}
      {!open && (
        <div className="text-sm border border-emerald-200 bg-emerald-50 rounded-lg p-3 space-y-1">
          <p className="font-semibold text-emerald-800">{c.outcome} · resolved {day(c.resolvedAt)}{c.costToUs ? ` · cost to us ₹${Number(c.costToUs).toLocaleString('en-IN')}` : ''}</p>
          <Stars value={c.satisfaction?.rating} size={14} />
          {c.satisfaction?.comment && <p className="text-slate-700">{c.satisfaction.comment}</p>}
          {c.notes && <p className="text-slate-600 whitespace-pre-wrap">{c.notes}</p>}
        </div>
      )}

      {open && canEdit && (
        <div className="space-y-4 border-t pt-4">
          {!c.vendorRespondedAt && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-700">Vendor's response</p>
              <div className="grid sm:grid-cols-[160px_1fr] gap-2">
                <Input type="date" max={today()} value={resp.vendorRespondedAt} onChange={(e) => setResp(r => ({ ...r, vendorRespondedAt: e.target.value }))} />
                <Input placeholder="What they said" value={resp.vendorResponse} onChange={(e) => setResp(r => ({ ...r, vendorResponse: e.target.value }))} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-700">Close the claim</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <select className={field} value={close.outcome} onChange={(e) => setClose(s => ({ ...s, outcome: e.target.value }))}>
                <option value="">Outcome…</option>
                {OUTCOMES.map(o => <option key={o}>{o}</option>)}
              </select>
              <Input type="date" max={today()} value={close.resolvedAt} onChange={(e) => setClose(s => ({ ...s, resolvedAt: e.target.value }))} title="Resolved on" />
              <Input type="number" min="0" placeholder="Cost to us ₹" value={close.costToUs} onChange={(e) => setClose(s => ({ ...s, costToUs: e.target.value }))} />
            </div>
            {close.outcome && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-700">How satisfied are we with the vendor's handling? <span className="text-rose-500">*</span></span>
                  <Stars value={close.satisfactionRating} onChange={(n) => setClose(s => ({ ...s, satisfactionRating: n }))} />
                </div>
                <Input placeholder="Comment on their handling" value={close.satisfactionComment} onChange={(e) => setClose(s => ({ ...s, satisfactionComment: e.target.value }))} />
                <Textarea rows={2} placeholder="Notes" value={close.notes} onChange={(e) => setClose(s => ({ ...s, notes: e.target.value }))} />
              </>
            )}
          </div>
          {(c.evidence || []).length < 5 && (
            <div className="space-y-1"><p className="text-xs font-semibold uppercase text-slate-700">Add evidence</p><EvidenceInput files={files} onChange={setFiles} max={5 - (c.evidence || []).length} /></div>
          )}
          <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : close.outcome ? 'Close claim' : 'Save'}</Button></div>
        </div>
      )}

      {(c.history || []).length > 0 && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-semibold uppercase text-slate-500">History</p>
          {[...c.history].reverse().map((h, i) => (
            <p key={i} className="text-[11px] text-slate-600"><span className="text-slate-400">{day(h.at)}{h.byName ? ` · ${h.byName}` : ''}:</span> {h.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VendorWarrantyClaims({ open, onClose, canAdd = true, canEdit = true }) {
  const [view, setView] = useState('list'); // 'list' | 'new' | claim id
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setView('list'); onClose(); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendor Warranty Claims</DialogTitle>
          <DialogDescription>A purchased unit failed at a customer — record what we told the vendor, how they answered and how it ended.</DialogDescription>
        </DialogHeader>
        {view === 'list' && <ClaimList canAdd={canAdd} onNew={() => setView('new')} onOpen={(id) => setView(id)} />}
        {view === 'new' && <NewClaim onBack={() => setView('list')} onCreated={(id) => setView(id || 'list')} />}
        {view !== 'list' && view !== 'new' && <ClaimDetail id={view} canEdit={canEdit} onBack={() => setView('list')} />}
      </DialogContent>
    </Dialog>
  );
}
