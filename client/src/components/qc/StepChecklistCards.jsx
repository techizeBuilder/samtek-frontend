import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Hash, Settings2, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ChecklistPickerDialog from './ChecklistPickerDialog';

// Per-step QC checklists (QC multi-checkpoint redesign, 2026-09-25 — see
// server/docs/qc-multi-checkpoint-redesign-discussion-2026-09.md). Every
// step flagged QC on the item's own BOM Process Definition gets its own
// checklist, picked from that level's master list — shared by Sub Child
// Part / Child Part / Product Master QC. A step is identified by category +
// step name (qcChecklistController.js's per-step routes).

// The one master stage each level's step checklists are picked from.
export const STEP_STAGE = { subChildPart: 'default', childPart: 'process', productMaster: 'process' };

const stepQuery = (category, step) => `category=${encodeURIComponent(category)}&step=${encodeURIComponent(step)}`;

// The item's QC steps + Final step + orphaned step checklists — shared with
// ProductMasterQC.jsx (which shows the Final step on its own Final card);
// react-query dedupes the two callers into one request.
export function useItemQcSteps(module, itemId) {
  return useQuery({
    queryKey: ['qc-item-steps', module, itemId],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${module}/qc-steps/${itemId}`),
    enabled: !!module && !!itemId,
  });
}

export function ChecklistRowSummary({ row }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
      {row.type === 'checkbox'
        ? <CheckSquare className="h-4 w-4 text-blue-500 flex-shrink-0" />
        : <Hash className="h-4 w-4 text-purple-500 flex-shrink-0" />}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">
          {row.label}
          {row.isDiscontinued && <Badge variant="outline" className="ml-2 text-xs align-middle">Discontinued</Badge>}
        </p>
        {row.reference && <p className="text-xs text-slate-400 mt-0.5">{row.reference}</p>}
      </div>
      {row.type === 'value' && (
        <span className="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded flex-shrink-0">{row.expectedValue}</span>
      )}
    </div>
  );
}

const TYPE_BADGE = {
  InHouse: { label: 'In-House', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  OutSource: { label: 'Out Source', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function StepChecklistCards({ module, itemId, itemCode, canManage, onManageMaster }) {
  const stage = STEP_STAGE[module];
  const qc = useQueryClient();
  const [picker, setPicker] = useState(null); // { category, step }

  const { data, isLoading } = useItemQcSteps(module, itemId);
  const steps = data?.data?.steps || [];
  const orphans = data?.data?.orphans || [];
  const refreshSteps = () => qc.invalidateQueries({ queryKey: ['qc-item-steps', module, itemId] });

  const removeOrphan = useMutation({
    mutationFn: ({ category, step }) => apiRequest('DELETE', `/api/rd/qc-checklist/${module}/${stage}/item/${itemId}/step?${stepQuery(category, step)}`),
    onSuccess: () => { showSuccessToast('Removed', 'Old step checklist removed'); refreshSteps(); },
    onError: (e) => showSmartToast(e, 'Failed to remove checklist'),
  });

  if (isLoading) {
    return <div className="text-center py-6 text-slate-400 text-sm">Loading QC steps…</div>;
  }

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center text-slate-400 text-sm">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No QC steps flagged in this item's BOM yet — flag them in BOM Management's Process Definition.
          </CardContent>
        </Card>
      ) : steps.map(s => {
        const badge = TYPE_BADGE[s.type];
        return (
          <Card key={`${s.category}::${s.step}`} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-normal">{s.category} ›</span> {s.step}
                  {badge && <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>}
                  {s.finalQc && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Final QC step</Badge>}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">QC step checklist</p>
              </div>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setPicker({ category: s.category, step: s.step })}>
                  <Settings2 className="h-4 w-4 mr-1.5" /> Manage Checklist
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {s.selected.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">No checks selected — QC will get an empty checklist for this step.</div>
              ) : (
                <div className="space-y-2">
                  {s.selected.map(row => <ChecklistRowSummary key={String(row.masterItemId)} row={row} />)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {orphans.length > 0 && (
        <Card className="border-none shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="border-b border-slate-50 pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Checklists no longer matching a BOM step
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">The step was renamed, removed or un-flagged in BOM Management. Re-pick the checklist on the current step, then remove these.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {orphans.map(o => (
              <div key={`${o.category}::${o.step}`} className="flex items-center justify-between gap-3 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                <p className="text-sm text-slate-700">
                  <span className="text-slate-400">{o.category} ›</span> {o.step}
                  <span className="text-xs text-slate-400 ml-2">{o.selectedCount} check{o.selectedCount === 1 ? '' : 's'}</span>
                </p>
                {canManage && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 h-7" disabled={removeOrphan.isPending} onClick={() => removeOrphan.mutate(o)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {picker && (
        <ChecklistPickerDialog
          open={!!picker}
          onOpenChange={(o) => !o && setPicker(null)}
          module={module}
          stage={stage}
          targetPath={`item/${itemId}/step?${stepQuery(picker.category, picker.step)}`}
          title={`${picker.category} › ${picker.step}${itemCode ? ` — ${itemCode}` : ''}`}
          emptyMasterHint="No checks defined yet in the master checklist."
          onManageMaster={onManageMaster}
          onSaved={refreshSteps}
        />
      )}
    </div>
  );
}
