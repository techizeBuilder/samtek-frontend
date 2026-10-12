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
  );
}
