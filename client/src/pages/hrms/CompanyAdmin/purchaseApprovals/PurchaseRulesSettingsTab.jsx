import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Save } from 'lucide-react';

// Company Admin → Purchase & Vendor Approval → Settings (procurement-v2,
// 2026-10-08). The two company-wide purchase rules the Company Admin owns;
// the PO charge / payment-term label templates are Purchase's, on their own
// Settings tab. Backend: PUT /api/purchase-settings/approval-rules.
export default function PurchaseRulesSettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [minVendors, setMinVendors] = useState('');
  // Minimum quotations received per item (2026-10-29) — never above minVendors.
  const [minQuotations, setMinQuotations] = useState('1');
  const [threshold, setThreshold] = useState('');
  // Outsource order limit (outsource-v2 slice 2, 2026-10-20) — separate from the PO limit.
  const [outsourceThreshold, setOutsourceThreshold] = useState('');
  // Pricing types (2026-10-22): approve orders with a per minute / per hour rate.
  const [approveTimeBased, setApproveTimeBased] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-settings'],
    queryFn: () => apiRequest('GET', '/api/purchase-settings'),
  });
  const settings = data?.settings;
  useEffect(() => {
    if (!settings) return;
    setMinVendors(String(settings.minVendorsPerItem ?? 3));
    setMinQuotations(String(settings.minQuotationsPerItem ?? 1));
    setThreshold(settings.poApprovalThreshold == null ? '' : String(settings.poApprovalThreshold));
    setOutsourceThreshold(settings.outsourceApprovalThreshold == null ? '' : String(settings.outsourceApprovalThreshold));
    setApproveTimeBased(!!settings.approveTimeBasedOutsource);
  }, [settings?.minVendorsPerItem, settings?.minQuotationsPerItem, settings?.poApprovalThreshold, settings?.outsourceApprovalThreshold, settings?.approveTimeBasedOutsource]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/approval-rules', {
      minVendorsPerItem: Number(minVendors),
      minQuotationsPerItem: Number(minQuotations),
      poApprovalThreshold: threshold.trim() === '' ? null : Number(threshold),
      outsourceApprovalThreshold: outsourceThreshold.trim() === '' ? null : Number(outsourceThreshold),
      approveTimeBasedOutsource: approveTimeBased,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-settings'] });
      toast({ title: 'Settings saved' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
    <Card>
      <CardContent className="p-5 space-y-5 max-w-xl">
        <div>
          <label className="text-sm font-semibold text-gray-800">Minimum vendors per item</label>
          <p className="text-xs text-gray-500 mb-1.5">
            One number for every item. When an item has fewer approved, active vendors than this, Purchase sees a warning on the RFQ/PO page,
            and the item appears under Low Vendor Coverage. It's a warning only — it never blocks a purchase.
          </p>
          <Input type="number" min="1" step="1" className="w-32" value={minVendors} onChange={e => setMinVendors(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800">Minimum quotations per item</label>
          <p className="text-xs text-gray-500 mb-1.5">
            How many <b>different vendors must have quoted</b> (a valid, unexpired price) before an item can go on a PO.
            Short of it, the PO <b>can't be made</b> while more quotes can still come — waiting replies, vendors not asked yet, expired
            quotes to ask again. If they can't (too few vendors supply it, or they said "can't supply"), Purchase gives a reason and the
            PO comes to you for approval. Can't be more than the minimum vendors above. 1 = no rule.
          </p>
          <Input type="number" min="1" step="1" className="w-32" value={minQuotations} onChange={e => setMinQuotations(e.target.value)} />
          {Number(minQuotations) > Number(minVendors) && <p className="text-xs text-red-600 mt-1">Can't be more than the minimum vendors per item ({minVendors}).</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800">PO approval threshold (₹)</label>
          <p className="text-xs text-gray-500 mb-1.5">
            A purchase order whose final total — goods + charges + all GST — is <b>above</b> this amount waits for your approval
            (PO Approvals tab) before it becomes a real PO. At or below it, the PO is created straight away.
            Leave empty if no PO should need approval.
          </p>
          <Input type="number" min="0" className="w-48" placeholder="No approval needed" value={threshold} onChange={e => setThreshold(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800">Outsource order limit (₹)</label>
          <p className="text-xs text-gray-500 mb-1.5">
            An outsource (job-work) order whose final total — work + charges + all GST — is <b>above</b> this amount waits for your approval
            (Purchase Orders → Outsource Orders) before it can go to the vendor. Separate from the PO limit.
            Leave empty if no outsource order should need approval.
          </p>
          <Input type="number" min="0" className="w-48" placeholder="No approval needed" value={outsourceThreshold} onChange={e => setOutsourceThreshold(e.target.value)} />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
            <input type="checkbox" className="h-4 w-4" checked={approveTimeBased} onChange={e => setApproveTimeBased(e.target.checked)} />
            Approve time-based outsource orders
          </label>
          <p className="text-xs text-gray-500 mt-1">
            A step priced <b>per minute / per hour</b> has no amount until Purchase enters the time later. Ticked: an order with such a step
            waits for your approval even under the limit, so you can check the rate. Either way you're notified when the time (the amount) is entered.
            The limit above is checked on the amounts already known.
          </p>
        </div>
        <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || !(Number(minVendors) >= 1) || !(Number(minQuotations) >= 1) || Number(minQuotations) > Number(minVendors)}>
          <Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save settings'}
        </Button>
      </CardContent>
    </Card>
    <VendorScoreSettings settings={settings} />
    <VendorDocumentSettings types={data?.vendorDocumentTypes} />
    <PurchaserScoreSettings settings={settings} />
    </div>
  );
}

// Vendor documents (2026-10-28, client): which documents a vendor must have to
// be submitted, which of them the Company Admin ticks at approval, and the
// type list itself. The nine original types are permanent (only their choice
// changes); the admin's own can be added, renamed and deleted — a type that's
// still Required can't be deleted. Backend: PUT /api/purchase-settings/vendor-documents.
const DOC_RULE_OPTIONS = [['none', 'Not required'], ['required', 'Required'], ['verified', 'Required and verified']];

function VendorDocumentSettings({ types }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rules, setRules] = useState({});
  const [custom, setCustom] = useState([]);
  const typesKey = JSON.stringify(types || []);
  useEffect(() => {
    setRules(Object.fromEntries((types || []).filter(t => t.builtIn && !t.uploadOnly).map(t => [t.name, t.rule])));
    setCustom((types || []).filter(t => !t.builtIn).map(t => ({ _id: t._id, name: t.name, rule: t.rule })));
  }, [typesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/vendor-documents', { rules, custom }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-settings'] });
      qc.invalidateQueries({ queryKey: ['/api/vendor-approvals'] });
      toast({ title: 'Vendor documents saved', description: 'They apply from the next submission; vendors already approved are not affected.' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const ruleSelect = (value, onChange) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm bg-white">
      {DOC_RULE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
  const setCustomRow = (i, patch) => setCustom(c => c.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const builtIns = (types || []).filter(t => t.builtIn && !t.uploadOnly);

  return (
    <Card>
      <CardContent className="p-5 space-y-4 max-w-xl">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Vendor documents</h3>
          <p className="text-xs text-gray-500">
            <b>Required</b>: Purchase can't submit a vendor without it. <b>Required and verified</b>: also, you tick that you checked it
            before approving. The original types can't be renamed or removed; add your own below.
            The GST Certificate only applies when the vendor has a GSTIN. <b>Other</b> isn't listed here — it's always
            there when uploading, for any extra document without a title of its own, and never required.
          </p>
        </div>
        <div className="space-y-2">
          {builtIns.map(t => (
            <div key={t.name} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-800">{t.name}{t.onlyWithGstin ? <span className="text-[11px] text-gray-400"> (when a GSTIN is entered)</span> : null}</span>
              {ruleSelect(rules[t.name] ?? t.rule, v => setRules(r => ({ ...r, [t.name]: v })))}
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Your own document types</p>
          {custom.length === 0 && <p className="text-xs text-gray-400 italic">None yet.</p>}
          {custom.map((c, i) => (
            <div key={c._id || `new-${i}`} className="flex items-center gap-2">
              <Input className="flex-1" placeholder="e.g. Insurance Certificate" value={c.name} onChange={e => setCustomRow(i, { name: e.target.value })} />
              {ruleSelect(c.rule, v => setCustomRow(i, { rule: v }))}
              <button type="button" onClick={() => setCustom(list => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 text-lg leading-none" title="Delete this type">×</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setCustom(c => [...c, { name: '', rule: 'none' }])}>+ Add document type</Button>
        </div>
        <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
          <Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save vendor documents'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Purchaser score (2026-10-13, blueprint §13): the nine weights (whole
// numbers adding up to 100). Backend: PUT /api/purchase-settings/purchaser-score.
const P_SCORE_PARTS = [
  ['coverage', 'RFQ coverage', 'Enough vendors asked for every item'],
  ['completeness', 'Quotation completeness', 'Manual quotations fully filled; answered email requests'],
  ['savings', 'Savings / landed cost', 'The cheapest full landed quote ÷ the one chosen'],
  ['followUp', 'Delivery follow-up', 'How soon a missed due date was followed up'],
  ['quality', 'Quality outcome', 'QC results on their POs, by severity'],
  ['documentation', 'Documentation accuracy', 'PO emailed + lines backed by a quote with evidence'],
  ['poAccuracy', 'PO accuracy', 'Not rejected, not cancelled as our mistake'],
  ['relationship', 'Relationship process', 'Vendor\'s answer on a QC rejection recorded on time'],
  ['policy', 'Policy compliance', 'POs without a vendor selection exception'],
];
const DEFAULT_P_WEIGHTS = { coverage: 15, completeness: 10, savings: 15, followUp: 15, quality: 15, documentation: 10, poAccuracy: 10, relationship: 5, policy: 5 };

function PurchaserScoreSettings({ settings }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weights, setWeights] = useState(DEFAULT_P_WEIGHTS);
  useEffect(() => {
    if (!settings) return;
    const w = settings.purchaserScore?.weights || {};
    setWeights(Object.fromEntries(P_SCORE_PARTS.map(([k]) => [k, w[k] ?? DEFAULT_P_WEIGHTS[k]])));
  }, [settings?._id, settings?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = P_SCORE_PARTS.reduce((s, [k]) => s + (Number(weights[k]) || 0), 0);
  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/purchaser-score', { weights: Object.fromEntries(P_SCORE_PARTS.map(([k]) => [k, Number(weights[k])])) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-settings'] }); toast({ title: 'Purchaser score settings saved' }); },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });
  return (
    <Card>
      <CardContent className="p-5 space-y-4 max-w-xl">
        <div>
          <p className="text-sm font-semibold text-gray-800">Purchaser score</p>
          <p className="text-xs text-gray-500">How much each part counts in a purchaser's score out of 100 (Purchasers → Purchaser Score). Whole numbers that add up to 100.</p>
        </div>
        <div className="space-y-2">
          {P_SCORE_PARTS.map(([k, label, hint]) => (
            <div key={k} className="flex items-center gap-3">
              <Input type="number" min="0" max="100" step="1" className="w-20" value={weights[k]} onChange={e => setWeights(w => ({ ...w, [k]: e.target.value }))} />
              <div className="min-w-0"><p className="text-sm text-gray-800">{label}</p><p className="text-[11px] text-gray-500">{hint}</p></div>
            </div>
          ))}
          <p className={`text-xs font-semibold ${total === 100 ? 'text-emerald-700' : 'text-red-600'}`}>Total {total} {total === 100 ? '✓' : '— must be 100'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || total !== 100}><Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save purchaser score'}</Button>
          <Button variant="outline" onClick={() => setWeights(DEFAULT_P_WEIGHTS)}>Blueprint defaults</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Vendor score (2026-10-13, blueprint §11–§12): the six weights (whole
// numbers adding up to 100) and the score below which a vendor goes on the
// Watchlist. Backend: PUT /api/purchase-settings/vendor-score.
const SCORE_PARTS = [
  ['price', 'Price', 'Each delivered price vs the lowest any vendor charged or quoted'],
  ['quality', 'Quality', 'Share QC accepted, rejections weighed by severity'],
  ['delivery', 'Delivery', 'Against the date first promised, −10 per day late'],
  ['credit', 'Credit terms', 'Credit days and advance % on each PO'],
  ['warranty', 'Warranty', 'Months quoted vs the best, and warranty claims'],
  ['response', 'Response', 'Quotation requests answered, and how fast'],
];
const DEFAULT_SCORE_WEIGHTS = { price: 25, quality: 30, delivery: 20, credit: 10, warranty: 10, response: 5 };

function VendorScoreSettings({ settings }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weights, setWeights] = useState(DEFAULT_SCORE_WEIGHTS);
  const [below, setBelow] = useState('60');
  useEffect(() => {
    if (!settings) return;
    const w = settings.vendorScore?.weights || {};
    setWeights(Object.fromEntries(SCORE_PARTS.map(([k]) => [k, w[k] ?? DEFAULT_SCORE_WEIGHTS[k]])));
    setBelow(String(settings.vendorScore?.watchlistBelow ?? 60));
  }, [settings?._id, settings?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = SCORE_PARTS.reduce((s, [k]) => s + (Number(weights[k]) || 0), 0);

  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/vendor-score', {
      weights: Object.fromEntries(SCORE_PARTS.map(([k]) => [k, Number(weights[k])])),
      watchlistBelow: Number(below),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-settings'] });
      toast({ title: 'Vendor score settings saved' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4 max-w-xl">
        <div>
          <p className="text-sm font-semibold text-gray-800">Vendor score</p>
          <p className="text-xs text-gray-500">
            How much each part counts in a vendor's score out of 100 (Purchase → Vendor Ratings). Whole numbers that add up to 100.
          </p>
        </div>
        <div className="space-y-2">
          {SCORE_PARTS.map(([k, label, hint]) => (
            <div key={k} className="flex items-center gap-3">
              <Input type="number" min="0" max="100" step="1" className="w-20" value={weights[k]} onChange={e => setWeights(w => ({ ...w, [k]: e.target.value }))} />
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-500">{hint}</p>
              </div>
            </div>
          ))}
          <p className={`text-xs font-semibold ${total === 100 ? 'text-emerald-700' : 'text-red-600'}`}>Total {total} {total === 100 ? '✓' : '— must be 100'}</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-800">Watchlist below</label>
          <p className="text-xs text-gray-500 mb-1.5">
            An approved vendor whose score falls below this (once it has at least 5 deliveries / QC checks) goes on the Watchlist, and you're notified once.
          </p>
          <Input type="number" min="0" max="100" className="w-24" value={below} onChange={e => setBelow(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || total !== 100}>
            <Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save vendor score'}
          </Button>
          <Button variant="outline" onClick={() => { setWeights(DEFAULT_SCORE_WEIGHTS); setBelow('60'); }}>Blueprint defaults</Button>
        </div>
      </CardContent>
    </Card>
  );
}
