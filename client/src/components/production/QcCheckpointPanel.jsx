import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ChecklistStepper from './ChecklistStepper';

const API = (orderId, unitNumber) => `/api/production-mfg/orders/${orderId}/qc-checkpoint?unit=${unitNumber}`;
const SUBMIT_API = (orderId, unitNumber) => `/api/production-mfg/orders/${orderId}/qc-checkpoint/submit?unit=${unitNumber}`;

// Stage 3b (2026-09-23) — the ONE real QC checkpoint's self-check + submit
// panel (server/controllers/productionMfgController.js's qcCheckpointIndex/
// getQcCheckpoint/submitQcCheckpoint). Generalizes FinalChecklistPanel
// (Machine/Sub Child Part's flat one-stage checklist) and Child Part's own
// staged Initial/Process UI into one component driven by the checkpoint's
// actual position instead of a hardcoded step name — ProcessExecution.jsx
// only ever mounts this on the one card whose own idx matches the
// checkpoint, so it never needs to ask "am I the checkpoint" itself.
export default function QcCheckpointPanel({ orderId, canEdit, procStatus, unitNumber = 1 }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [cpStage, setCpStage] = useState('initial');
  const [initialDraft, setInitialDraft] = useState([]);
  const [processDraft, setProcessDraft] = useState([]);
  const [productionCost, setProductionCost] = useState('');
  const [productionExpense, setProductionExpense] = useState('');

  const queryKey = ['qc-checkpoint', orderId, unitNumber];
  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: () => apiRequest('GET', API(orderId, unitNumber)),
    enabled: !!orderId,
  });
  const info = data?.data;

  useEffect(() => {
    if (!info) return;
    if (info.shape === 'flat' && info.rows) setRows(info.rows.map(r => ({ ...r })));
    if (info.shape === 'unitChecks' && info.entry) {
      setInitialDraft((info.entry.initial || []).map(r => ({ ...r })));
      setProcessDraft((info.entry.process || []).map(r => ({ ...r })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.entry, info?.rows]);

  // Per-unit Machine (2026-09-24): same unitChecks entry as Child Part, but
  // one stage only (its Final checklist, stored as the entry's process[]) —
  // no Initial tab, straight to Submit to QC.
  const singleStage = !!info?.singleStage;
  useEffect(() => { setCpStage(singleStage ? 'process' : 'initial'); }, [orderId, unitNumber, singleStage]);

  const editable = canEdit && procStatus === 'In Progress';
  const costRequired = editable && !!info?.isTrueLastStep;
  const costValid = !costRequired || (
    productionCost !== '' && productionExpense !== '' && Number(productionCost) >= 0 && Number(productionExpense) >= 0
  );

  const flatSaveMutation = useMutation({
    mutationFn: (results) => {
      const body = { results };
      if (costRequired) { body.productionCost = Number(productionCost); body.productionExpense = Number(productionExpense); }
      return apiRequest('PUT', SUBMIT_API(orderId, unitNumber), body);
    },
    onSuccess: () => {
      showSuccessToast('Sent to QC', 'Checkpoint submitted.');
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    },
    onError: (e) => showSmartToast(e, 'Failed to submit checklist'),
  });

  const stagedSaveMutation = useMutation({
    mutationFn: (stage) => {
      const draft = stage === 'initial' ? initialDraft : processDraft;
      const body = {
        stage,
        results: draft.map(r => ({ parameter: r.parameter, standardValue: r.standardValue, type: r.type, actualValue: r.actualValue, status: r.status, remarks: r.remarks })),
      };
      if (stage === 'process' && costRequired) { body.productionCost = Number(productionCost); body.productionExpense = Number(productionExpense); }
      return apiRequest('PUT', SUBMIT_API(orderId, unitNumber), body);
    },
    onSuccess: (_data, stage) => {
      showSuccessToast(stage === 'process' ? 'Sent to QC' : 'Saved', stage === 'process' ? 'Checkpoint submitted.' : 'Initial checklist saved.');
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    },
    onError: (e) => showSmartToast(e, 'Failed to save checklist'),
  });

  if (isFetching) return <p className="text-xs text-slate-400 py-3 text-center">Loading checklist…</p>;
  if (!info || info.checkpointIndex === -1) return null;

  const costFields = costRequired && (
    <div className="grid grid-cols-2 gap-3 mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost *</label>
        <Input type="number" min="0" placeholder="0" value={productionCost} onChange={e => setProductionCost(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense *</label>
        <Input type="number" min="0" placeholder="0" value={productionExpense} onChange={e => setProductionExpense(e.target.value)} />
      </div>
      <p className="col-span-2 text-[10px] text-slate-400">Reported once, when submitting this checkpoint — a later QC-reject rework won't ask again.</p>
    </div>
  );

  if (info.shape === 'unitChecks') {
    const entry = info.entry;
    if (!entry) return <p className="text-xs text-slate-400 py-3 text-center">No QC checklist entry for this unit yet.</p>;
    const entryEditable = editable && ['Awaiting Production', 'Rejected'].includes(entry.status);
    const draft = cpStage === 'initial' ? initialDraft : processDraft;
    const initialSaved = initialDraft.length > 0 && initialDraft.every(r => r.status === 'Pass' || r.status === 'Fail');
    return (
      <div className="w-full mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-slate-500" /> QC Checkpoint — {info.step}</h4>
          <span className="text-[10px] text-slate-400">{entry.status}</span>
        </div>
        {!singleStage && (
        <div className="flex gap-2 mb-3">
          <button className={`px-3 py-1 rounded-full text-xs font-semibold border ${cpStage === 'initial' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`} onClick={() => setCpStage('initial')}>Initial</button>
          <button
            className={`px-3 py-1 rounded-full text-xs font-semibold border disabled:opacity-40 ${cpStage === 'process' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
            disabled={!initialSaved}
            title={!initialSaved ? 'Save the Initial checklist first' : undefined}
            onClick={() => setCpStage('process')}
          >Process</button>
        </div>
        )}
        {cpStage === 'process' && costFields}
        {draft.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No {singleStage ? '' : `${cpStage} `}checklist configured yet — ask R&D to set one up.</p>
        ) : (
          <ChecklistStepper
            rows={draft}
            setRows={cpStage === 'initial' ? setInitialDraft : setProcessDraft}
            canEdit={entryEditable}
            onSave={() => stagedSaveMutation.mutate(cpStage)}
            saving={stagedSaveMutation.isPending}
            saveLabel={cpStage === 'process' ? 'Submit to QC' : 'Save Initial'}
            extraDisabled={cpStage === 'process' && !costValid}
          />
        )}
      </div>
    );
  }

  // Flat shape — Sub Child Part / Machine.
  if (!rows.length) return <p className="text-xs text-slate-400 py-3 text-center">No QC checklist configured yet for this item.</p>;
  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-slate-500" /> QC Checkpoint — {info.step}</h4>
        {info.filledBy && <span className="text-[10px] text-slate-400">Filled by {info.filledBy}</span>}
      </div>
      {!editable && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-3 py-2 mb-3">
          {procStatus === 'Completed' ? 'This checkpoint is complete — view only.' : procStatus === 'QC Pending' ? 'Sent to QC — view only until QC decides.' : 'View only.'}
        </p>
      )}
      {costFields}
      <ChecklistStepper
        rows={rows}
        setRows={setRows}
        canEdit={editable}
        onSave={() => flatSaveMutation.mutate(rows)}
        saving={flatSaveMutation.isPending}
        saveLabel="Submit to QC"
        extraDisabled={!costValid}
      />
    </div>
  );
}
