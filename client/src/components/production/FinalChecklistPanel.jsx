import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ChecklistStepper from './ChecklistStepper';

const API = (orderId, unitNumber) => `/api/production-mfg/orders/${orderId}/final-checklist?unit=${unitNumber}`;

// Production's own fill-in of the SAME checklist QC will review on the
// Final Testing step — R&D's Final-stage selection, same one every Purchase
// product's QC job already used, wired into Production for the first time
// (confirmed 2026-09-02). Redesigned 2026-09-19: submitting this checklist
// is now the actual completion action for this unit's Final Testing step —
// no more separate "Mark Complete" / self-certify "Approve QC" click
// afterward (same vestigial-self-certify fix already applied to Child
// Part's Assembly the same day) — and the real cost/expense capture moved
// here too, required only on the very first submission (confirmed with the
// user: a later QC-reject rework resubmit must not ask for it again).
export default function FinalChecklistPanel({ orderId, canEdit, procStatus, unitNumber = 1 }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [productionCost, setProductionCost] = useState('');
  const [productionExpense, setProductionExpense] = useState('');
  // canEdit here was only ever the page's RBAC permission — it never
  // accounted for the step itself having already moved past active editing
  // (submitted, or the whole order already QC-decided), so the stepper
  // stayed fully interactive — Pass/Fail, Save, all still clickable — even
  // after Final Testing showed "Completed"/"QC Pending" (real bug, caught
  // 2026-09-02). Only actually editable while still In Progress — the
  // backend enforces this same gate independently (saveFinalChecklist),
  // this is just so the UI doesn't offer an action the server will refuse.
  const editable = canEdit && procStatus === 'In Progress';

  const { data, isFetching } = useQuery({
    queryKey: ['final-checklist', orderId],
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${orderId}/final-checklist`),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!isFetching && data?.data?.rows) setRows(data.data.rows.map(r => ({ ...r })));
  }, [isFetching, data]);

  const filledBy = data?.data?.filledBy;
  // Cost/expense only ever get asked for on the FIRST submission — once
  // `filledBy` is set (even across a later reject→resubmit cycle, since
  // nothing ever clears it) they were already captured and stay fixed.
  const isFirstSubmission = !filledBy;

  const saveMutation = useMutation({
    mutationFn: (results) => {
      const body = { results };
      if (isFirstSubmission) {
        body.productionCost = Number(productionCost);
        body.productionExpense = Number(productionExpense);
      }
      return apiRequest('PUT', API(orderId, unitNumber), body);
    },
    onSuccess: () => {
      showSuccessToast('Sent to QC', 'Final Testing checklist submitted.');
      qc.invalidateQueries({ queryKey: ['final-checklist', orderId] });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    },
    onError: (e) => showSmartToast(e, 'Failed to submit checklist'),
  });

  const costRequired = editable && isFirstSubmission;
  const costValid = !costRequired || (
    productionCost !== '' && productionExpense !== '' && Number(productionCost) >= 0 && Number(productionExpense) >= 0
  );

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
      {costRequired && (
        <div className="grid grid-cols-2 gap-3 mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost *</label>
            <Input type="number" min="0" placeholder="0" value={productionCost} onChange={e => setProductionCost(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense *</label>
            <Input type="number" min="0" placeholder="0" value={productionExpense} onChange={e => setProductionExpense(e.target.value)} />
          </div>
          <p className="col-span-2 text-[10px] text-slate-400">Reported once, on this first submission — a later QC-reject rework won't ask again.</p>
        </div>
      )}
      <ChecklistStepper
        rows={rows}
        setRows={setRows}
        canEdit={editable}
        onSave={() => saveMutation.mutate(rows)}
        saving={saveMutation.isPending}
        saveLabel="Submit to QC"
        extraDisabled={!costValid}
      />
    </div>
  );
}
