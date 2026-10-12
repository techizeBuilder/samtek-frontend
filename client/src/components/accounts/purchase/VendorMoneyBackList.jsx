import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Undo2 } from 'lucide-react';

// Money a vendor holds of ours that came off a PO's bill (2026-10-12,
// accounts Slice 3): the advance paid on QC-rejected material they took back
// (refund or credit), on rejected material they wouldn't replace (written
// off), or on lines cancelled after the advance (Accounts decides).
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const TONE = {
  'To decide': 'bg-red-50 text-red-700 border-red-200',
  'Refund due': 'bg-amber-50 text-amber-800 border-amber-200',
  'Refunded': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Credit available': 'bg-violet-50 text-violet-700 border-violet-200',
  'Credit used': 'bg-slate-50 text-slate-600 border-slate-200',
  'Written off': 'bg-slate-100 text-slate-600 border-slate-300',
};
const KEY = '/api/accounts/purchases/money-back';

function RefundForm({ item, bankAccounts, onDone }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!accountId) return toast({ title: 'Choose the account the refund came into', variant: 'destructive' });
    setSaving(true);
    try {
      await apiRequest('PUT', `${KEY}/${item._id}/refund`, { accountId, receivedAt: date, reference });
      toast({ title: `Refund of ${inr(item.amount)} recorded` });
      onDone();
    } catch (err) {
      toast({ title: 'Not saved', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <select className="border rounded-md px-2 h-8 text-xs bg-white" value={accountId} onChange={e => setAccountId(e.target.value)}>
        <option value="">Into account…</option>
        {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <Input type="date" className="h-8 w-36 text-xs" value={date} max={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
      <Input className="h-8 w-40 text-xs" placeholder="Reference / UTR" value={reference} onChange={e => setReference(e.target.value)} />
      <Button size="sm" className="h-8" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record refund'}</Button>
    </div>
  );
}

export default function VendorMoneyBackList({ vendorId = '', bankAccounts = [], canEdit = true }) {
  const { toast } = useToast();
  const [refunding, setRefunding] = useState(null);
  const { data } = useQuery({
    queryKey: [KEY, vendorId],
    queryFn: () => apiRequest('GET', `${KEY}${vendorId ? `?vendorId=${vendorId}` : ''}`),
  });
  const items = data?.data?.items || [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [KEY] });
    queryClient.invalidateQueries({ queryKey: ['/api/accounts/bank-cash/summary'] });
    setRefunding(null);
  };
  const decide = async (item, mode) => {
    try {
      const res = await apiRequest('PUT', `${KEY}/${item._id}/decide`, { mode });
      toast({ title: res?.message || 'Saved' });
      refresh();
    } catch (err) {
      toast({ title: 'Not saved', description: err.message, variant: 'destructive' });
    }
  };
  const openItems = items.filter(i => ['To decide', 'Refund due', 'Credit available'].includes(i.status));
  const shown = items.slice(0, 30);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Advance that came off a PO's bill — on QC-rejected material the vendor took back, or on cancelled lines. {openItems.length ? <strong>{openItems.length} open.</strong> : 'Nothing open.'}
      </p>
      {shown.length === 0 ? <p className="text-sm text-slate-400 italic py-4 text-center">Nothing yet.</p> : (
        <div className="divide-y border rounded-lg bg-white">
          {shown.map(i => (
            <div key={i._id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Undo2 className="w-3.5 h-3.5 text-slate-400" />
                  <strong>{inr(i.amount)}</strong>
                  <span className="text-slate-600">{i.vendorName} · {i.poNumber}</span>
                  <Badge variant="outline" className={`text-[10px] ${TONE[i.status] || ''}`}>{i.status}</Badge>
                </span>
                {canEdit && i.status === 'To decide' && (
                  <span className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide(i, 'Refund')}>Vendor refunds it</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide(i, 'Credit')}>Keep as credit</Button>
                  </span>
                )}
                {canEdit && i.status === 'Refund due' && refunding !== i._id && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRefunding(i._id)}>Refund received…</Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 pl-5">
                {i.source === 'Rejection'
                  ? `QC rejection ${i.rejection?.number || ''}${i.rejection ? ` — ${i.rejection.rejectedQty} ${i.rejection.qtyUnit} ${i.rejection.itemName}` : ''}`
                  : 'PO cancelled / short closed after the advance'}
                {i.status === 'Credit available' && i.used > 0 ? ` · ${inr(i.amount - i.used)} left of the credit` : ''}
                {i.status === 'Refunded' && i.refund?.receivedAt ? ` · received ${day(i.refund.receivedAt)}${i.refund.account?.accountName ? ` into ${i.refund.account.accountName}` : ''}${i.refund.reference ? ` (${i.refund.reference})` : ''}` : ''}
                {` · ${day(i.createdAt)}`}
              </p>
              {refunding === i._id && <RefundForm item={i} bankAccounts={bankAccounts} onDone={refresh} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
