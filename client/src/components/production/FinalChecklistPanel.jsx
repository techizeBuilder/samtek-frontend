import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardCheck } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ChecklistStepper from './ChecklistStepper';

const API = (orderId) => `/api/production-mfg/orders/${orderId}/final-checklist`;

// Production's own fill-in of the SAME checklist QC will review on the
// Final Testing step — R&D's Final-stage selection, same one every Purchase
// product's QC job already used, wired into Production for the first time
// (confirmed 2026-09-02). markProcessComplete refuses to mark Final Testing
// done until this is filled; QC's own decision (submitDecision) is still
// the real completion gate, unchanged.
export default function FinalChecklistPanel({ orderId, canEdit, procStatus }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  // canEdit here was only ever the page's RBAC permission — it never
  // accounted for the step itself having already moved past active editing
  // (Mark Complete'd, or the whole order already QC-decided), so the
  // stepper stayed fully interactive — Pass/Fail, Save, all still clickable
  // — even after Final Testing showed "Completed" (real bug, caught
  // 2026-09-02: the server already blocked the resave, but the UI never
  // stopped offering it). Only actually editable while still In Progress.
  const editable = canEdit && procStatus === 'In Progress';

  const { data, isFetching } = useQuery({
    queryKey: ['final-checklist', orderId],
    queryFn: () => apiRequest('GET', API(orderId)),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!isFetching && data?.data?.rows) setRows(data.data.rows.map(r => ({ ...r })));
  }, [isFetching, data]);

  const saveMutation = useMutation({
    mutationFn: (results) => apiRequest('PUT', API(orderId), { results }),
    onSuccess: () => {
      showSuccessToast('Saved', 'Final Testing checklist saved.');
      qc.invalidateQueries({ queryKey: ['final-checklist', orderId] });
    },
    onError: (e) => showSmartToast(e, 'Failed to save checklist'),
  });

  const filledBy = data?.data?.filledBy;

  if (isFetching) return <p className="text-xs text-slate-400 py-3 text-center">Loading checklist…</p>;
  if (!rows.length) return (
    <p className="text-xs text-slate-400 py-3 text-center">No Final checklist configured yet for this product in Product Master QC.</p>
  );

  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-slate-500" /> Final Testing Checklist</h4>
        {filledBy && <span className="text-[10px] text-slate-400">Filled by {filledBy}</span>}
      </div>
      {!editable && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-3 py-2 mb-3">
          {procStatus === 'Completed' ? 'Final Testing is complete — view only.' : procStatus === 'QC Pending' ? 'Sent to QC — view only until QC decides.' : 'View only.'}
        </p>
      )}
      <ChecklistStepper
        rows={rows}
        setRows={setRows}
        canEdit={editable}
        onSave={() => saveMutation.mutate(rows)}
        saving={saveMutation.isPending}
        saveLabel="Save Checklist"
      />
    </div>
  );
}
