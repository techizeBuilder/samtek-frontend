import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { History, Mail, Award, FileCheck, Paperclip, ShieldCheck, ShieldAlert } from 'lucide-react';
import { fileHref } from '@/components/accounts/vendor/vendorUi';

// "All quotes" (procurement-v2, 2026-10-08; was "Quote history", renamed
// 2026-10-09 so it isn't confused with "Bought before" — PriceCheck.jsx —
// which is what was PAID on earlier purchases). Every quotation taken for some
// items: all vendors, both channels, oldest first, including replaced,
// declined and not-chosen ones; the winning quote is highlighted. Opened from
// the RFQ/PO vendor card (before the PO), the Purchase Orders tab and the
// Company Admin's PO approval card (after). `endpoint` returns
// { purchase, sections: [{ key, itemName, itemCode, quantity, purchaseUnit, quotes }] }
// — see itemQuoteGroupController.buildQuoteHistory.
// Evidence (2026-10-09): every quote shows where it came from — an emailed
// quote is the vendor's own submission through their link (QR-…); a manual
// quote carries the files it was entered with (MQ-…: channel, date on the
// evidence, contact, notes, who entered it). A manual quote that replaced an
// earlier price shows the reason. Manual quotes from before 2026-10-09 have
// no evidence and say so.
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const STATUS = {
  Submitted: { label: 'Quoted', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  Selected: { label: 'Chosen', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Not chosen', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  Superseded: { label: 'Replaced', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
  Declined: { label: 'Not quoted', cls: 'bg-red-50 text-red-600 border-red-200' },
  Invited: { label: 'Waiting', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function QuoteHistoryDialog({ open, onOpenChange, endpoint, title, vendorId = null, vendorName = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlyVendor, setOnlyVendor] = useState(false);

  useEffect(() => {
    if (!open || !endpoint) return;
    setLoading(true);
    setError('');
    setOnlyVendor(false);
    apiRequest('GET', endpoint)
      .then(res => setData(res?.data || null))
      .catch(err => { setData(null); setError(err.message); })
      .finally(() => setLoading(false));
  }, [open, endpoint]);

  const sections = useMemo(() => (data?.sections || []).map(s => ({
    ...s,
    quotes: onlyVendor && vendorId ? s.quotes.filter(q => String(q.vendor) === String(vendorId)) : s.quotes,
  })), [data, onlyVendor, vendorId]);

  // Each emailed request once, with the vendor's charges / payment terms.
  const requests = useMemo(() => {
    const m = new Map();
    for (const s of sections) for (const q of s.quotes) {
      const qr = q.quotationRequest;
      if (qr?._id && !m.has(String(qr._id))) m.set(String(qr._id), { ...qr, vendorName: q.vendorName });
    }
    return [...m.values()].filter(qr => qr.status === 'Submitted');
  }, [sections]);

  // Each manual quotation's evidence once.
  const evidence = useMemo(() => {
    const m = new Map();
    for (const s of sections) for (const q of s.quotes) {
      const mq = q.manualQuotation;
      if (mq?._id && !m.has(String(mq._id))) m.set(String(mq._id), { ...mq, vendorName: q.vendorName, items: [] });
      if (mq?._id) m.get(String(mq._id)).items.push(s.itemName);
    }
    return [...m.values()];
  }, [sections]);

  // Charges + payment terms each quotation carried — emailed requests, and
  // manual quotations (captured since 2026-10-09; older ones have none on record).
  const quotedTerms = useMemo(() => [
    ...requests.map(qr => ({ ...qr, at: qr.submittedAt, atLabel: 'submitted' })),
    ...evidence.map(mq => ({ ...mq, at: mq.createdAt, atLabel: 'entered', notRecorded: mq.charges === undefined })),
  ], [requests, evidence]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> {title || 'All quotes'}</DialogTitle>
          <DialogDescription>
            Every quote (offer) vendors made for these items, oldest first — the chosen one is highlighted. For what we actually paid on earlier purchases, see <b>Bought before</b>.
            {data?.quoteValidityDays ? ` Quotes are valid for ${data.quoteValidityDays} days.` : ''}
          </DialogDescription>
        </DialogHeader>

        {vendorId && (
          <div className="inline-flex rounded-md border p-0.5 text-xs self-start">
            <button type="button" className={`px-2.5 py-1 rounded ${!onlyVendor ? 'bg-slate-800 text-white' : 'text-slate-600'}`} onClick={() => setOnlyVendor(false)}>All vendors</button>
            <button type="button" className={`px-2.5 py-1 rounded ${onlyVendor ? 'bg-slate-800 text-white' : 'text-slate-600'}`} onClick={() => setOnlyVendor(true)}>{vendorName || 'This vendor'} only</button>
          </div>
        )}

        {loading ? <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          : error ? <p className="text-sm text-red-600 py-6 text-center">{error}</p>
            : !sections.length ? <p className="text-sm text-slate-400 py-8 text-center">No quotations on record for this order.</p>
              : (
                <div className="space-y-4">
                  {sections.map(s => (
                    <div key={s.key} className="border rounded-lg">
                      <div className="px-3 py-2 bg-slate-50 border-b rounded-t-lg flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{s.itemName} {s.itemCode && <span className="font-normal text-xs text-slate-400">({s.itemCode})</span>}</p>
                        <span className="text-xs text-slate-500">{s.quantity} {s.purchaseUnit || ''}</span>
                      </div>
                      {s.quotes.length === 0 ? <p className="text-xs text-slate-400 px-3 py-3">No quotations{onlyVendor ? ' from this vendor' : ''}.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 text-left">
                                <th className="px-3 py-1.5 font-medium">Date</th>
                                <th className="px-3 py-1.5 font-medium">Vendor</th>
                                <th className="px-3 py-1.5 font-medium">Via</th>
                                <th className="px-3 py-1.5 font-medium text-right">Rate</th>
                                <th className="px-3 py-1.5 font-medium">GST</th>
                                <th className="px-3 py-1.5 font-medium text-right">Qty</th>
                                <th className="px-3 py-1.5 font-medium">Delivery</th>
                                <th className="px-3 py-1.5 font-medium">Status</th>
                                <th className="px-3 py-1.5 font-medium">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {s.quotes.map(q => {
                                // A request closed (item ordered elsewhere) before the vendor replied.
                                const noReply = q.status === 'Rejected' && q.source === 'Email' && !q.submittedAt;
                                const st = q.chosen ? STATUS.Selected
                                  : noReply ? { label: 'Closed — no reply', cls: STATUS.Rejected.cls }
                                    : q.expired ? { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200' }
                                      : (STATUS[q.status] || { label: q.status, cls: '' });
                                const answered = !noReply && !['Invited', 'Declined'].includes(q.status);
                                return (
                                  <tr key={q._id} className={q.chosen ? 'bg-emerald-50/70' : q.status === 'Superseded' ? 'text-slate-400' : ''}>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{fmt(q.submittedAt || q.createdAt)}</td>
                                    <td className={`px-3 py-1.5 ${vendorId && String(q.vendor) === String(vendorId) ? 'font-semibold' : ''}`}>{q.vendorName}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">
                                      {q.source === 'Email' ? <Mail className="w-3 h-3 inline mr-1" /> : <FileCheck className="w-3 h-3 inline mr-1" />}
                                      {q.quotationRequest?.number || q.manualQuotation?.number || q.source}
                                      {q.manualQuotation && <Paperclip className="w-3 h-3 inline ml-1 text-violet-600" title="Evidence attached — see below" />}
                                      {q.source === 'Manual' && !q.manualQuotation && <span className="block text-[10px] text-amber-700">no evidence (old)</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-right whitespace-nowrap">{answered ? <>{inr(q.unitPrice)}{q.purchaseUnit ? `/${q.purchaseUnit}` : ''}</> : '—'}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{!answered ? '—' : q.gstInclusive ? 'incl.' : q.gstPercent != null ? `${q.gstPercent}%` : '—'}</td>
                                    <td className="px-3 py-1.5 text-right">{q.quantity}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{answered ? `${q.deliveryDays}d${q.warrantyMonths ? ` · ${q.warrantyMonths}m wty` : ''}` : '—'}</td>
                                    <td className="px-3 py-1.5">
                                      <Badge variant="outline" className={`${st.cls} text-[10px] font-normal whitespace-nowrap`}>
                                        {q.chosen && <Award className="w-2.5 h-2.5 mr-0.5" />}{st.label}
                                      </Badge>
                                      {q.validUntil && !q.chosen && (
                                        <span className="block text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{q.expired ? 'on' : 'valid till'} {fmt(q.validUntil)}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-500 max-w-[200px]">
                                      <span className="block truncate" title={q.remarks || ''}>{q.remarks || ''}</span>
                                      {q.revisionReason && <span className="block text-[10px] text-amber-800" title={q.revisionReason}>New price — reason: {q.revisionReason}</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}

                  {(evidence.length > 0 || requests.length > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Evidence</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {requests.map(qr => (
                          <div key={`ev-${qr._id}`} className="border rounded-lg p-2.5 text-xs space-y-0.5">
                            <p className="font-semibold text-slate-700 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />{qr.number} · {qr.vendorName}</p>
                            <p className="text-slate-600">Submitted by the vendor through their own email link on {fmt(qr.submittedAt)} — no upload needed.</p>
                          </div>
                        ))}
                        {evidence.map(mq => (
                          <div key={mq._id} className="border border-violet-200 rounded-lg p-2.5 text-xs space-y-1">
                            <p className="font-semibold text-slate-700 flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-violet-600" />{mq.number} · {mq.vendorName}</p>
                            <p className="text-slate-600">
                              {mq.channel === 'Other' ? mq.channelOther : mq.channel} · dated {fmt(mq.quoteDate)}
                              {mq.contactPerson ? ` · contact ${mq.contactPerson}` : ''}
                            </p>
                            <p className="text-slate-500">For: {[...new Set(mq.items)].join(', ')}</p>
                            {mq.notes && <p className="text-slate-500 italic">"{mq.notes}"</p>}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {(mq.files || []).map((f, i) => (
                                <a key={i} href={fileHref(f.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-800 hover:bg-violet-100 max-w-full">
                                  <Paperclip className="w-3 h-3 shrink-0" /><span className="truncate">{f.fileName || `File ${i + 1}`}</span>
                                </a>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400">Entered by {mq.createdBy?.fullName || mq.createdBy?.username || '—'} on {fmt(mq.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                      {sections.some(s => s.quotes.some(q => q.source === 'Manual' && !q.manualQuotation)) && (
                        <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />Manual quotes marked "no evidence (old)" were entered before evidence became required.</p>
                      )}
                    </div>
                  )}

                  {quotedTerms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Charges &amp; payment terms the vendors quoted</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {quotedTerms.map(qr => {
                          const t = qr.paymentTerms || {};
                          if (qr.notRecorded) {
                            return (
                              <div key={qr._id} className="border rounded-lg p-2.5 text-xs space-y-1">
                                <p className="font-semibold text-slate-700">{qr.vendorName} · {qr.number} <span className="font-normal text-slate-400">entered {fmt(qr.at)}</span></p>
                                <p className="text-slate-400">Charges and terms weren't recorded with manual quotations before 9 Oct 2026.</p>
                              </div>
                            );
                          }
                          return (
                            <div key={qr._id} className="border rounded-lg p-2.5 text-xs space-y-1">
                              <p className="font-semibold text-slate-700">{qr.vendorName} · {qr.number} <span className="font-normal text-slate-400">{qr.atLabel} {fmt(qr.at)}</span></p>
                              {(qr.charges || []).length ? (qr.charges || []).map((c, i) => (
                                <p key={i} className="flex justify-between text-slate-600"><span>{c.label}{c.custom ? <span className="text-slate-400"> (their own)</span> : ''}</span><span>{inr(c.amount)} + {c.gstPercent || 0}% GST</span></p>
                              )) : <p className="text-slate-400">No charges</p>}
                              <p className="text-slate-600">
                                {[t.advancePercent != null ? `Advance ${t.advancePercent}%` : null, t.creditDays != null ? `Credit ${t.creditDays} days` : null, ...(t.others || []).map(o => `${o.label}: ${o.value}`)].filter(Boolean).join(' · ') || <span className="text-slate-400">No payment terms given</span>}
                              </p>
                              {qr.vendorRemarks && <p className="text-slate-500 italic">"{qr.vendorRemarks}"</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
      </DialogContent>
    </Dialog>
  );
}
