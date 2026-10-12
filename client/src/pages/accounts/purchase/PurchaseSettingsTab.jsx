import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Trash2, Save, RefreshCw, Lock, CalendarClock, TrendingUp } from 'lucide-react';

// Purchase & Outsource → Purchase → Settings (procurement-v2, 2026-10-08).
// Quote rules (2026-10-09): quote validity in days (an older quote can't be
// ordered) and the price-rise warning % against the last PO — PUT
// /api/purchase-settings/quote-rules; see services/quoteChecksService.js.
// Below them, the master template of NAMES offered when creating a PO — the values are
// typed on each PO. Charges and payment terms are whole-PO (client
// decision). Advance % and Credit Days are built in (the system uses them:
// Credit Days sets the invoice due date, Advance % the payment hint), so
// they're always on the PO and not editable here. Editing needs the
// accounts.purchaseSettings permission (Company Admin → Roles & Permissions).
// Backend: PUT /api/purchase-settings/templates.
export default function PurchaseSettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('accounts', 'purchaseSettings', 'edit');
  const [charges, setCharges] = useState([]);
  const [terms, setTerms] = useState([]);
  const [validityDays, setValidityDays] = useState('30');
  const [warnPercent, setWarnPercent] = useState('10');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-settings'],
    queryFn: () => apiRequest('GET', '/api/purchase-settings'),
  });
  const settings = data?.settings;
  useEffect(() => {
    if (!settings) return;
    setCharges((settings.chargeLabels || []).map(c => ({ name: c.name, defaultGstPercent: String(c.defaultGstPercent ?? 0) })));
    setTerms((settings.termLabels || []).map(t => ({ name: t.name })));
    setValidityDays(String(settings.quoteValidityDays ?? 30));
    setWarnPercent(String(settings.priceJumpWarnPercent ?? 10));
  }, [settings?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quote rules (2026-10-09) — saved on their own, separate from the templates.
  const rulesM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/quote-rules', {
      quoteValidityDays: Number(validityDays),
      priceJumpWarnPercent: Number(warnPercent),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-settings'] });
      toast({ title: 'Quote rules saved', description: 'They apply to every quote straight away.' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });
  const rulesChanged = settings && (Number(validityDays) !== (settings.quoteValidityDays ?? 30) || Number(warnPercent) !== (settings.priceJumpWarnPercent ?? 10));
  const validityOk = validityDays !== '' && Number.isInteger(Number(validityDays)) && Number(validityDays) >= 1 && Number(validityDays) <= 365;
  const warnOk = warnPercent !== '' && Number(warnPercent) >= 0;

  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/templates', {
      chargeLabels: charges.map(c => ({ name: c.name, defaultGstPercent: Number(c.defaultGstPercent) || 0 })),
      termLabels: terms,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-settings'] });
      toast({ title: 'Templates saved' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const setRow = (list, setList, i, patch) => setList(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      {!canEdit && (
        <p className="text-sm text-amber-700 inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> View only — editing needs the "Purchase Settings" permission.</p>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-slate-800">Quote rules</h3>
            <p className="text-xs text-slate-500">Apply to every quotation, old and new, as soon as you save.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm text-slate-700 space-y-1">
              <span className="font-medium flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-slate-400" /> Quote validity</span>
              <span className="flex items-center gap-2">
                <Input className="w-24" type="number" min="1" max="365" value={validityDays} disabled={!canEdit} onChange={e => setValidityDays(e.target.value)} />
                <span className="text-xs text-slate-500">days</span>
              </span>
              <span className="block text-xs text-slate-500">
                A quote can be put on a PO for this many days after the vendor gives it. After that it shows as <b>Expired</b> on RFQ/PO and can't be ordered — get a fresh quote. Vendors see this on the quotation email and page.
              </span>
              {!validityOk && <span className="block text-xs text-red-600">Enter a whole number from 1 to 365.</span>}
            </label>
            <label className="text-sm text-slate-700 space-y-1">
              <span className="font-medium flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-slate-400" /> Price-rise warning</span>
              <span className="flex items-center gap-2">
                <Input className="w-24" type="number" min="0" step="0.5" value={warnPercent} disabled={!canEdit} onChange={e => setWarnPercent(e.target.value)} />
                <span className="text-xs text-slate-500">% above the last bought price</span>
              </span>
              <span className="block text-xs text-slate-500">
                A quote this much above what we last paid <b>that vendor</b> for the item ("Bought before": delivered purchases, same unit, before GST) is flagged in amber on RFQ/PO, in the PO review and on the Company Admin's approvals. A warning only — it never blocks. 0 = flag any rise.
              </span>
              {!warnOk && <span className="block text-xs text-red-600">Enter 0 or more.</span>}
            </label>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => rulesM.mutate()} disabled={rulesM.isPending || !rulesChanged || !validityOk || !warnOk}>
              <Save className="w-4 h-4 mr-1.5" />{rulesM.isPending ? 'Saving...' : 'Save quote rules'}
            </Button>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500 pt-2">Names offered when creating a PO. You type the amounts / values on each PO.</p>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-slate-800">Charges</h3>
            <p className="text-xs text-slate-500">Added to the whole PO as a flat ₹ amount. The GST % here is the default for that charge; it can be changed on the PO.</p>
          </div>
          {charges.length === 0 && <p className="text-xs text-slate-400 italic">No charge names yet.</p>}
          {charges.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" placeholder="e.g. Freight, Packing, Loading, Insurance" value={c.name} disabled={!canEdit} onChange={e => setRow(charges, setCharges, i, { name: e.target.value })} />
              <div className="flex items-center gap-1">
                <Input className="w-20" type="number" min="0" max="100" value={c.defaultGstPercent} disabled={!canEdit} onChange={e => setRow(charges, setCharges, i, { defaultGstPercent: e.target.value })} />
                <span className="text-xs text-slate-500">% GST</span>
              </div>
              {canEdit && (
                <button type="button" onClick={() => setCharges(charges.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button type="button" size="sm" variant="outline" onClick={() => setCharges([...charges, { name: '', defaultGstPercent: '0' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add charge name
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-slate-800">Payment terms</h3>
            <p className="text-xs text-slate-500">
              <b>Advance %</b> and <b>Credit Days</b> are always on every PO (Credit Days sets the invoice due date). Add any other terms here —
              their text is typed on the PO and printed on it (e.g. "Delivery", "Inspection", "Warranty").
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Advance %', 'Credit Days'].map(b => (
              <span key={b} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-600"><Lock className="w-3 h-3" />{b}</span>
            ))}
          </div>
          {terms.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" placeholder="e.g. Delivery, Inspection, Warranty" value={t.name} disabled={!canEdit} onChange={e => setRow(terms, setTerms, i, { name: e.target.value })} />
              {canEdit && (
                <button type="button" onClick={() => setTerms(terms.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button type="button" size="sm" variant="outline" onClick={() => setTerms([...terms, { name: '' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add term name
            </Button>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
          <Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save templates'}
        </Button>
      )}
    </div>
  );
}
