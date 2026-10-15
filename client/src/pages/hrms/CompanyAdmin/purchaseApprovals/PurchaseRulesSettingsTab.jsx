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
  const [threshold, setThreshold] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-settings'],
    queryFn: () => apiRequest('GET', '/api/purchase-settings'),
  });
  const settings = data?.settings;
  useEffect(() => {
    if (!settings) return;
    setMinVendors(String(settings.minVendorsPerItem ?? 3));
    setThreshold(settings.poApprovalThreshold == null ? '' : String(settings.poApprovalThreshold));
  }, [settings?.minVendorsPerItem, settings?.poApprovalThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveM = useMutation({
    mutationFn: () => apiRequest('PUT', '/api/purchase-settings/approval-rules', {
      minVendorsPerItem: Number(minVendors),
      poApprovalThreshold: threshold.trim() === '' ? null : Number(threshold),
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
          <label className="text-sm font-semibold text-gray-800">PO approval threshold (₹)</label>
          <p className="text-xs text-gray-500 mb-1.5">
            A purchase order whose final total — goods + charges + all GST — is <b>above</b> this amount waits for your approval
            (PO Approvals tab) before it becomes a real PO. At or below it, the PO is created straight away.
            Leave empty if no PO should need approval.
          </p>
          <Input type="number" min="0" className="w-48" placeholder="No approval needed" value={threshold} onChange={e => setThreshold(e.target.value)} />
        </div>
        <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || !(Number(minVendors) >= 1)}>
          <Save className="w-4 h-4 mr-1.5" />{saveM.isPending ? 'Saving...' : 'Save settings'}
        </Button>
      </CardContent>
    </Card>
    <VendorScoreSettings settings={settings} />
    <PurchaserScoreSettings settings={settings} />
    </div>
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
