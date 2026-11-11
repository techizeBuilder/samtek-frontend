import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackageCheck } from 'lucide-react';
import ChecklistPickerDialog from './ChecklistPickerDialog';
import { ChecklistRowSummary } from './StepChecklistCards';

// A bought Child Part / Sub Child Part's incoming inspection (make or buy,
// 2026-10-28 — server/docs/make-or-buy-parts-2026-10.md §6): it arrives
// finished, so none of the build-step checks apply. Store's receive → QC job
// uses this list while the part is bought; the step checklists stay as they
// are for when it's made. Stage 'incoming', item-level.
export default function IncomingChecklistCard({ module, itemId, bought, canManage, onManageMaster }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['qc-target-checklist', module, 'incoming', `item/${itemId}`],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${module}/incoming/item/${itemId}`),
    enabled: !!itemId,
  });
  const rows = data?.data?.selected || [];
  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-teal-600" /> Incoming (bought)
          <span className={`text-[10px] font-semibold rounded-full border px-1.5 py-0.5 ${bought ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {bought ? 'In use — this part is bought' : 'Used when it\'s bought'}
          </span>
        </CardTitle>
        <p className="text-xs text-slate-500">Checked by QC when Store receives it from a vendor — the build-step checklists don't apply to a finished part.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <p className="text-xs text-slate-400">Loading…</p>
          : rows.length ? rows.map(row => <ChecklistRowSummary key={row.masterItemId || row.label} row={row} />)
          : <p className="text-xs text-slate-400 italic">No incoming checks chosen yet.</p>}
        {canManage && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{rows.length ? 'Edit checks' : 'Choose checks'}</Button>
          </div>
        )}
      </CardContent>
      {open && (
        <ChecklistPickerDialog
          open={open} onOpenChange={setOpen} module={module} stage="incoming" targetPath={`item/${itemId}`}
          title="Incoming (bought) checklist"
          emptyMasterHint="The incoming master list is empty — add checks to it first."
          onManageMaster={onManageMaster}
          onSaved={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
