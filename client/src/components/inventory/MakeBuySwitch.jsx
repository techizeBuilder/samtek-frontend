import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Make or buy a Child Part / Sub Child Part (2026-10-28,
// server/docs/make-or-buy-parts-2026-10.md) — the same Purchasable / Internal
// Manufacturing radio Machines have on Product Master. Switching goes through
// R&D's own endpoint (it re-prices and notifies Accounts + the Company Admin),
// never the plain item save; a change is confirmed first.
// A part's own make / buy choice — never `purchase`, which defaults to true.
export const isBoughtPart = (item) => item?.partSourcing === 'buy';

export function MakeBuyBadge({ item }) {
  if (!isBoughtPart(item)) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
      Bought{item.pricePending ? ' · price pending' : ''}
    </span>
  );
}

export default function MakeBuySwitch({ item, readOnly = false, onSwitched }) {
  const { toast } = useToast();
  const current = isBoughtPart(item) ? 'buy' : 'make';
  const [asked, setAsked] = useState(null); // the mode waiting for confirmation

  const switchM = useMutation({
    mutationFn: (mode) => apiRequest('PUT', `/api/rd/parts/${item._id}/make-buy`, { mode }),
    onSuccess: (res) => {
      toast({ title: 'Switched — re-approve it', description: `${res?.message || ''} Its QC List sign-off and Release were pulled back: redo them on R&D → Approval.` });
      setAsked(null);
      onSwitched?.(res?.data);
    },
    onError: (e) => { toast({ title: 'Could not switch', description: e.message, variant: 'destructive' }); setAsked(null); },
  });

  const last = (item.makeBuyHistory || [])[item.makeBuyHistory?.length - 1];
  const option = (mode, label) => (
    <label className={`flex items-center gap-2 text-sm ${readOnly ? 'text-slate-500' : 'cursor-pointer'}`}>
      <input type="radio" name={`make-buy-${item._id}`} checked={(asked || current) === mode} disabled={readOnly || switchM.isPending}
        onChange={() => setAsked(mode === current ? null : mode)} />
      {label}
    </label>
  );

  return (
    <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-600">Make or buy</p>
      <div className="flex flex-wrap gap-4">
        {option('buy', 'Purchasable (Vendor)')}
        {option('make', 'Internal Manufacturing')}
      </div>
      {current === 'buy' && (
        <p className="text-[11px] text-slate-500">
          {item.pricePending
            ? 'Price pending — Accounts has been asked for an estimated vendor price; machine prices using it are provisional until then.'
            : `Price in use: ₹${Number(item.purchaseCost || 0).toFixed(2)} (${item.purchaseCostKind === 'actual' ? 'last purchase' : 'estimate'}).`}
        </p>
      )}
      {asked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-2">
          <p className="text-xs text-amber-800">
            {asked === 'buy'
              ? 'Switch to bought from a vendor? Shortfalls will raise purchase requests instead of build orders, and Accounts is asked for a price if it has never been bought. Open build orders finish as they are.'
              : 'Switch to made here? Shortfalls will raise build orders again and its price comes from its BOM. Open POs still come in.'}
          </p>
          <p className="text-xs font-semibold text-amber-900">
            Approvals: its QC List sign-off and Release will be pulled back. Afterwards, on R&amp;D → Approval, {asked === 'buy'
              ? 'set and approve its Incoming (bought) checklist, then release it again'
              : 'approve its build checklists (and Design / BOM if needed), then release it again'} — until then it gets no automatic orders.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => switchM.mutate(asked)} disabled={switchM.isPending}>
              {switchM.isPending ? 'Switching...' : asked === 'buy' ? 'Yes, buy it' : 'Yes, make it'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAsked(null)} disabled={switchM.isPending}>Cancel</Button>
          </div>
        </div>
      )}
      {item.approvalRedo?.at && !asked && (
        <p className="text-[11px] font-semibold text-amber-800">
          {item.approvalRedo.to
            ? <>Needs re-approval after the switch — <a href="/r&d/design-approval" className="underline">open the Approval page</a> to re-sign its QC List and release it.</>
            : <>Needs re-approval after a BOM change — <a href="/r&d/design-approval" className="underline">open the Approval page</a> to approve its BOM and release it.</>}
        </p>
      )}
      {last && !asked && (
        <p className="text-[11px] text-slate-400">
          Last switched to {last.to === 'buy' ? 'Bought' : 'Made'}{last.byName ? ` by ${last.byName}` : ''} on {new Date(last.at).toLocaleDateString('en-IN')}.
        </p>
      )}
    </div>
  );
}
