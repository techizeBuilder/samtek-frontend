import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProduction, useProductionOrdersList, computeOrderProgress, PROCESS_TYPE_MAP, stepsForOrderKind } from '@/contexts/ProductionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Cog, Play, CheckCircle, XCircle, AlertTriangle, ChevronDown, Lock,
  Clock, Users, RotateCcw, ThumbsUp, ThumbsDown, Package, Search,
  FileCheck, FileText, Eye, Download, Send
} from 'lucide-react';
import SubChildPartQCPanel from '@/components/production/SubChildPartQCPanel';
import FinalChecklistPanel from '@/components/production/FinalChecklistPanel';
import QcCheckpointPanel from '@/components/production/QcCheckpointPanel';
import StepMaterialStatus from '@/components/production/StepMaterialStatus';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { showSmartToast } from '@/lib/toast-utils';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const fileExt = (url) => (url || '').split('.').pop()?.toLowerCase().split('?')[0] || '';

// Fresh, all-Pending process steps for a unit the backend hasn't
// materialized into `extraUnits` yet, from a plain list of step names —
// mirrors the backend's own buildStepsFromList (ProductionOrder.js), kept
// local here since this file resolves unit processes directly off a held
// order object (see getUnitProcessesFor) rather than via a context lookup
// by id, so it can work for a selected order from either the active list
// or the paginated Completed tab below.
const buildStepsFromNames = (stepNames) => stepNames.map(step => ({
  step, type: PROCESS_TYPE_MAP[step], status: 'Pending', assignedTeam: null,
  startDate: null, endDate: null, qcStatus: 'Pending', qcBy: null, qcDate: null,
  notes: '', reworks: [], subEntries: [],
}));

// Fresh, all-Pending copies of Unit 1's own real process objects — for a
// unit the backend hasn't materialized into `extraUnits` yet. Copies every
// BOM-carried field (category, type, materialSource, materialRefs,
// qcRequired), not just the step name, so a not-yet-touched unit's cards
// show the right type badge and category grouping instead of guessing via
// the static PROCESS_TYPE_MAP above (which only knows the old hardcoded
// step names, not dynamic Process-Definition ones — the bug this fixes).
const buildFreshUnitProcesses = (templateProcesses) => templateProcesses.map(p => ({
  step: p.step, type: p.type, category: p.category,
  materialSource: p.materialSource, materialRefs: p.materialRefs, qcRequired: p.qcRequired,
  outsourceStatus: p.type === 'Outsourcing' ? 'NotStarted' : undefined,
  status: 'Pending', assignedTeam: null, startDate: null, endDate: null,
  startedAt: null, completedAt: null, qcStatus: 'Pending', qcBy: null, qcDate: null,
  notes: '', reworks: [], subEntries: [],
}));

const getUnitCountFor = (order) => Math.max(1, Number(order?.orderQuantity) || 1);

const getUnitProcessesFor = (order, unitNumber = 1) => {
  if (!order) return [];
  if (unitNumber <= 1) {
    if (order.processes?.length) return order.processes;
    // Legacy pre-fix ChildPart data safety net only (see
    // new-bom-hierarchy-bug-fixes.md #3/#6) — a Sub Child Part order never
    // uses processes[] at all (empty is its permanent, correct state), and
    // a real Machine order always gets a non-empty processes[] at
    // creation, so neither should ever hit this branch.
    return order.orderKind === 'ChildPart' ? buildStepsFromNames(stepsForOrderKind('ChildPart')) : [];
  }
  const extra = order.extraUnits?.[unitNumber - 2];
  if (extra) return extra.processes;
  // Mirror Unit 1's OWN real process objects, not just step names — a
  // Machine order can legitimately be either the old hardcoded pipeline or
  // a new BOM-driven one, both under orderKind:'Machine', so only the real
  // document (already loaded, right here) can tell them apart. Copying the
  // full objects (buildFreshUnitProcesses) rather than rebuilding from bare
  // names keeps category/type/materialSource intact for a not-yet-touched
  // unit — losing them through a name-only rebuild was why category
  // grouping and the type badge only ever showed on Unit 1. Falls back to
  // the ChildPart-only legacy default for the same edge case as the Unit 1
  // branch above.
  return order.processes?.length
    ? buildFreshUnitProcesses(order.processes)
    : (order.orderKind === 'ChildPart' ? buildStepsFromNames(stepsForOrderKind('ChildPart')) : []);
};

// Groups a flat processes[] array into consecutive runs sharing the same
// Category label (proc.category — the BOM Process Definition's parent
// Category, set by processStepBuilderService.js's buildOrderStepsFromProcessDefinition).
// Purely a display grouping: original flat indices are preserved per item,
// so every existing per-step action/lock (canStart(activeProcesses, idx),
// etc.) keeps operating on the real, ungrouped array. A step with no
// category (older hardcoded pipelines predating Phase 2) falls into its own
// headerless group, so legacy orders render exactly as before.
const groupProcessesByCategory = (processes) => {
  const groups = [];
  processes.forEach((proc, idx) => {
    const category = proc.category || null;
    const last = groups[groups.length - 1];
    if (last && last.category === category) {
      last.items.push({ proc, idx });
    } else {
      groups.push({ category, items: [{ proc, idx }] });
    }
  });
  return groups;
};

const stepColor = {
  'Pending': 'border-slate-200 bg-white',
  'In Progress': 'border-blue-300 bg-blue-50',
  'QC Pending': 'border-amber-300 bg-amber-50',
  'Completed': 'border-emerald-300 bg-emerald-50',
};

const stepBadge = {
  'Pending': 'bg-slate-100 text-slate-500',
  'In Progress': 'bg-blue-100 text-blue-700',
  'QC Pending': 'bg-amber-100 text-amber-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
};

const stepIcon = {
  'Pending': <Clock className="h-4 w-4 text-slate-400" />,
  'In Progress': <Play className="h-4 w-4 text-blue-600" />,
  'QC Pending': <AlertTriangle className="h-4 w-4 text-amber-500" />,
  'Completed': <CheckCircle className="h-4 w-4 text-emerald-600" />,
};

const typeColor = {
  'Outsourcing': 'bg-purple-100 text-purple-700 border-purple-200',
  'In-House': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ProcessExecution() {
  const {
    orders, teams, getTeamById,
    assignTeam, startProcess, markProcessComplete,
    approveQC, rejectQC, updateProcessNotes, raiseRDRequest,
  } = useProduction();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('production', 'orders', 'edit');
  const qc = useQueryClient();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  // Held directly when an order is picked from the Completed tab below,
  // since a Completed order may not be present in `orders` (the active-work
  // feed) — see selectedOrder derivation.
  const [selectedCompletedOrder, setSelectedCompletedOrder] = useState(null);
  // Arriving from Order Management's Plan modal (?order=<machineId>) —
  // auto-select that machine's own Production Order the moment it shows up
  // in the active-work feed. Only ever consumed once (autoSelectDone guards
  // it), so navigating here again manually afterward isn't fought by a stale
  // query param re-selecting something the user has since moved away from.
  const [autoSelectDone, setAutoSelectDone] = useState(false);
  useEffect(() => {
    if (autoSelectDone) return;
    const orderIdParam = new URLSearchParams(window.location.search).get('order');
    if (!orderIdParam) return;
    const match = orders.find(o => String(o._id || o.id) === orderIdParam);
    if (match) {
      setSelectedOrderId(String(match._id || match.id));
      // So reopening the picker right after arriving from Order Management's
      // "Plan" button shows the matching tab already active, instead of
      // defaulting to Machine Orders and silently excluding the very order
      // just navigated to.
      setPickerKindFilter(match.orderKind === 'ChildPart' ? 'ChildPart' : match.orderKind === 'SubChildPart' ? 'SubChildPart' : 'Machine');
      setAutoSelectDone(true);
    }
  }, [orders, autoSelectDone]);
  // Which physical machine (1-based) of a multi-quantity order is shown —
  // only relevant when the order's orderQuantity > 1 (tabs render then).
  const [activeUnit, setActiveUnit] = useState(1);
  const [qcDialog, setQcDialog] = useState(null); // { step, action: 'approve'|'reject' }
  const [qcBy, setQcBy] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  // Only asked for when approving 'Final Testing' — that's the step that
  // means this physical unit is now built (see handleQCSubmit).
  const [productionCost, setProductionCost] = useState('');
  const [productionExpense, setProductionExpense] = useState('');
  const [notesDialog, setNotesDialog] = useState(null); // { step, notes }
  const [notesValue, setNotesValue] = useState('');
  const [assignDialog, setAssignDialog] = useState(null); // { step }
  const [selectedTeam, setSelectedTeam] = useState('');

  // ── Order picker: two tabs — Pending/In Progress (all, from the active-work
  // feed) and Completed (server-paginated + searchable, since that list only
  // grows over time and shouldn't all load at once). ─────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState('active');
  const [pickerSearch, setPickerSearch] = useState('');
  const [completedPage, setCompletedPage] = useState(1);
  // Machine Orders vs Sub Child Part Orders — same toggle as the Orders page
  // (OrderManagement.jsx), so this picker can be narrowed the same way
  // before searching within it.
  const [pickerKindFilter, setPickerKindFilter] = useState('Machine');

  const changePickerSearch = (value) => { setPickerSearch(value); setCompletedPage(1); };
  const changePickerKindFilter = (kind) => { setPickerKindFilter(kind); setCompletedPage(1); };

  // Missing orderKind on an older record means Machine, same fallback the
  // backend already uses (see getOrders/getActiveOrders) — never silently
  // hides a pre-existing order from the Machine Orders filter.
  const matchesKindFilter = (o) => pickerKindFilter === 'ChildPart'
    ? o.orderKind === 'ChildPart'
    : pickerKindFilter === 'SubChildPart'
      ? o.orderKind === 'SubChildPart'
      : (o.orderKind === 'Machine' || !o.orderKind);

  const activeOrders = orders.filter(o => o.status !== 'Completed' && matchesKindFilter(o));
  const activeOrdersFiltered = activeOrders.filter(o => {
    if (!pickerSearch) return true;
    const q = pickerSearch.toLowerCase();
    return (o.orderId || '').toLowerCase().includes(q) ||
      (o.machineCode || '').toLowerCase().includes(q) ||
      (o.machineName || '').toLowerCase().includes(q);
  });

  // Only fetched once the picker is actually open, so switching to this tab
  // doesn't cost anything until the user asks for it.
  const { data: completedOrdersData, isLoading: completedLoading } = useProductionOrdersList(
    { page: completedPage, limit: 20, search: pickerSearch, status: 'Completed', orderKind: pickerKindFilter },
    { enabled: pickerOpen }
  );
  const completedOrders = completedOrdersData?.data?.orders || [];
  const completedPagination = completedOrdersData?.data?.pagination || {};

  // Prefer the live, reactive copy from the active-work feed (so in-flight
  // mutations update the view immediately); fall back to the snapshot held
  // from the Completed tab for orders outside that feed.
  const selectedOrder = orders.find(o => String(o._id || o.id) === selectedOrderId) || selectedCompletedOrder;
  const progress = selectedOrder ? computeOrderProgress(selectedOrder) : 0;

  // How many physical machines this order builds, and which one is on screen.
  const unitCount = getUnitCountFor(selectedOrder);
  const activeProcesses = getUnitProcessesFor(selectedOrder, activeUnit);
  // Stage 3b (2026-09-23) — client-side mirror of the backend's
  // qcCheckpointIndex (productionMfgController.js): the ONE real QC
  // checkpoint's position, from Phase 1's qcRequired flag, or Sub Child
  // Part's fixed always-last-step rule. -1 for a legacy order with nothing
  // flagged (not Sub Child Part) — every existing hardcoded-name branch
  // below stays exactly as it was for that case.
  const checkpointIdx = !selectedOrder ? -1
    : selectedOrder.orderKind === 'SubChildPart' ? activeProcesses.length - 1
    : activeProcesses.findIndex(p => p.qcRequired);
  const isDynamicOrder = checkpointIdx !== -1;
  const trueLastStepAfterCheckpoint = isDynamicOrder && checkpointIdx < activeProcesses.length - 1
    ? activeProcesses.length - 1 : -1;

  // ── BOM & Design — replaces the per-order R&D request with a live check:
  // is the machine's BOM locked (R&D → BOM Management) and its design
  // Approved (R&D → Design Approval)? If both, this auto-verifies the order
  // (see productionMfgController.js's getBomDesignStatus) and Production
  // never has to raise a request at all. If not, the existing "Raise R&D
  // Request" flow is the fallback, unchanged. ──────────────────────────────
  const selectedOrderKey = selectedOrder ? String(selectedOrder._id || selectedOrder.id) : null;
  const { data: bomDesignResponse, isLoading: bomDesignLoading } = useQuery({
    queryKey: ['bom-design-status', selectedOrderKey],
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${selectedOrderKey}/bom-design-status`),
    enabled: !!selectedOrderKey && selectedOrder?.orderKind !== 'SubChildPart',
  });
  const bomDesign = bomDesignResponse?.data;
  // The status check can auto-verify the order as a side effect — refresh the
  // orders feed so selectedOrder.bomVerified/designVerified (used by the
  // "Materials not issued"-style gating below and elsewhere) catch up too.
  useEffect(() => {
    if (bomDesign?.autoVerifiedNow) {
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    }
  }, [bomDesign?.autoVerifiedNow]);

  const [designPickerOpen, setDesignPickerOpen] = useState(false);
  // Sub Child Part order's "BOM" — no PDF. Its View button opens the plain
  // per-piece material list (what one unit of the part is made of, straight
  // from bomDesign.materials — no order scaling, no availability). That's
  // the BOM itself; the order-scaled numbers live in the separate Material
  // List section below (see below / buildSubChildPartMaterialList).
  const [bomViewOpen, setBomViewOpen] = useState(false);
  // The order-level Material List (client's own design, 2026-09-13 — see
  // subChildPartReorderService.js's buildSubChildPartMaterialList). Fetched
  // whenever a Sub Child Part order is selected, shown inline on the page.
  const isSubChildPartOrder = selectedOrder?.orderKind === 'ChildPart';
  // The REAL, new, lowest-hierarchy Sub Child Part in-house build order —
  // not to be confused with isSubChildPartOrder above (old naming, actually
  // means "Child Part"). No processes[]/BOM-lock/unit concept at all — see
  // its own section below instead of the Machine/Child Part rendering this
  // whole page otherwise shares.
  const isInHouseSubChildPart = selectedOrder?.orderKind === 'SubChildPart';
  // A Machine order has no dedicated orderKind value of its own — it's
  // whatever's left once Child Part/Sub Child Part are ruled out (matches
  // OrderManagement.jsx's own kind-filter fallback: missing/unset ===
  // Machine). The Material List section below (2026-09-17) is the first
  // thing on this page shared by both Machine and Child Part orders, so it
  // picks its endpoint off this flag.
  const isMachineOrder = !!selectedOrder && !isSubChildPartOrder && !isInHouseSubChildPart;
  // 3-way branch (2026-09-19) — Sub Child Part orders get their own Material
  // List now too (subChildPartOrderService.js's buildSubChildPartRawMaterialList/
  // requestSubChildPartRawMaterial), same {categories:[...]} shape and same
  // table below, reused as-is; only the endpoint differs per tier.
  const materialListEndpoint = isSubChildPartOrder ? 'sub-child-part-material-list'
    : isInHouseSubChildPart ? 'sub-child-part/material-list'
    : 'machine-material-list';
  const materialListRequestEndpoint = isSubChildPartOrder ? 'sub-child-part-material/request'
    : isInHouseSubChildPart ? 'sub-child-part/material-request'
    : 'machine-material/request';
  const scpMaterialKey = ['material-list', selectedOrderKey, isSubChildPartOrder ? 'childpart' : isInHouseSubChildPart ? 'subchildpart' : 'machine'];
  const { data: materialListResponse, isLoading: materialListLoading } = useQuery({
    queryKey: scpMaterialKey,
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${selectedOrderKey}/${materialListEndpoint}`),
    enabled: !!selectedOrderKey && (isSubChildPartOrder || isMachineOrder || isInHouseSubChildPart),
  });
  const materialListCategories = materialListResponse?.data?.categories || [];

  // ── Sub Child Part material Issue / Receive / Return — full handshake,
  // reusing the machine-order demand pipeline (see
  // subChildPartReorderService.js's requestSubChildPartMaterial and the
  // existing receiveMaterialInProduction / returnMaterialToStore). ──────────
  const refreshScpMaterial = () => {
    qc.invalidateQueries({ queryKey: scpMaterialKey });
    qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    // Broad (no orderId/unit/stepIndex suffix) — invalidates every mounted
    // StepMaterialStatus panel's query at once, same "Issue/Receive changed
    // the floor" trigger the old Fabrication-status query used to need.
    qc.invalidateQueries({ queryKey: ['step-material-status'] });
  };
  const [issueRow, setIssueRow] = useState(null);   // material list row
  const [issueQty, setIssueQty] = useState('');
  const [returnRow, setReturnRow] = useState(null);
  const [returnForm, setReturnForm] = useState({ qty: '', type: 'Excess', reason: '', lenValue: '', lenUnit: 'Millimeter', widValue: '', widUnit: 'Millimeter' });

  const issueMut = useMutation({
    mutationFn: ({ demandKey, requestQuantity }) =>
      apiRequest('POST', `/api/production-mfg/orders/${selectedOrderKey}/${materialListRequestEndpoint}`, { demandKey, requestQuantity }),
    onSuccess: () => { refreshScpMaterial(); showSmartToast({ message: 'Material request sent to Store.' }, ''); setIssueRow(null); setIssueQty(''); },
    onError: (e) => showSmartToast(e, 'Request Failed'),
  });
  const receiveMut = useMutation({
    mutationFn: ({ demandKey, receivedQuantity }) =>
      apiRequest('PUT', `/api/production-mfg/orders/${selectedOrderKey}/mark-material-issued`, { materialCode: demandKey, receivedQuantity }),
    onSuccess: () => { refreshScpMaterial(); showSmartToast({ message: 'Material received.' }, ''); },
    onError: (e) => showSmartToast(e, 'Receive Failed'),
  });
  const returnMut = useMutation({
    mutationFn: (body) => apiRequest('POST', `/api/production-mfg/orders/${selectedOrderKey}/materials/return`, body),
    onSuccess: () => { refreshScpMaterial(); showSmartToast({ message: 'Return request submitted — awaiting Store.' }, ''); setReturnRow(null); },
    onError: (e) => showSmartToast(e, 'Return Failed'),
  });

  const openReturn = (row) => {
    setReturnForm({ qty: '', type: 'Excess', reason: '', lenValue: '', lenUnit: 'Millimeter', widValue: '', widUnit: 'Millimeter' });
    setReturnRow(row);
  };
  const submitReturn = () => {
    const isSheet = returnRow.category === 'Sheet Metal';
    const body = {
      materialCode: returnRow.demandKey,
      returnQuantity: Number(returnForm.qty),
      reason: returnForm.reason,
      returnType: returnForm.type,
    };
    if (isSheet) {
      body.leftoverLengthValue = Number(returnForm.lenValue);
      body.leftoverLengthUnit = returnForm.lenUnit;
      body.leftoverWidthValue = Number(returnForm.widValue);
      body.leftoverWidthUnit = returnForm.widUnit;
    }
    returnMut.mutate(body);
  };

  // ── Child Part per-unit QC checklist (module:'childPart', staged Initial/
  // Process) — keyed by [order, activeUnit, stage] and staged in two
  // sections instead of one
  // (confirmed with the user 2026-09-16: same UI as R&D's Child Part
  // Inventory QC split). Each unit reaches/leaves QC entirely independently
  // of its siblings — switching activeUnit switches which unit's checklist
  // these queries/mutations operate on. ────────────────────────────────────
  const [cpStage, setCpStage] = useState('initial');
  const [cpInitialDraft, setCpInitialDraft] = useState([]);
  const [cpProcessDraft, setCpProcessDraft] = useState([]);
  const [cpBusy, setCpBusy] = useState(false);
  const [paintDialog, setPaintDialog] = useState(false);
  const [paintCost, setPaintCost] = useState('');
  const [paintExpense, setPaintExpense] = useState('');

  // This unit's own Assembly must at least be Started before the checklist
  // queries fire (redesigned 2026-09-19 — submitting the Process checklist
  // below is what completes Assembly now, so this has to stay true once
  // Assembly reaches 'Completed' too, not flip back off — otherwise
  // reopening the order/switching units after submitting would disable the
  // very queries that show what was already submitted). 'Pending' is the
  // only status where there's genuinely nothing to fetch yet. Explicit
  // truthiness check on the found step itself (not a bare
  // `?.status !== 'Pending'`) — a missing/not-yet-loaded Assembly step must
  // read as "not started", not silently collapse to "started" the way
  // `undefined !== 'Pending'` would (the exact shape of the finalChecklist
  // premature-QCJob bug this same pass just fixed elsewhere).
  const cpAssemblyProc = activeProcesses.find(p => p.step === 'Assembly');
  const cpAssemblyStarted = !!cpAssemblyProc && cpAssemblyProc.status !== 'Pending';
  const cpEnabled = !!selectedOrderKey && isSubChildPartOrder && cpAssemblyStarted;

  const { data: cpInitialResp, isLoading: cpInitialLoading } = useQuery({
    queryKey: ['child-part-unit-checklist', selectedOrderKey, activeUnit, 'initial'],
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${selectedOrderKey}/child-part/${activeUnit}/initial`),
    enabled: cpEnabled,
  });
  useEffect(() => {
    if (cpInitialResp?.data?.rows) setCpInitialDraft(cpInitialResp.data.rows);
  }, [cpInitialResp]);
  const cpUnitStatus = cpInitialResp?.data?.unitStatus || 'Awaiting Production';
  const cpUnitEditable = ['Awaiting Production', 'Rejected'].includes(cpUnitStatus);
  // Server-truth (the freshly-fetched response, not the locally-edited
  // draft) — a saved row's status is always Pass/Fail (save rejects any
  // Pending row), so "every row already has a real verdict" reliably means
  // Initial was actually saved to the server, not just filled in locally.
  const cpInitialSaved = (cpInitialResp?.data?.rows?.length > 0)
    && cpInitialResp.data.rows.every(r => r.status === 'Pass' || r.status === 'Fail');

  const { data: cpProcessResp, isLoading: cpProcessLoading } = useQuery({
    queryKey: ['child-part-unit-checklist', selectedOrderKey, activeUnit, 'process'],
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${selectedOrderKey}/child-part/${activeUnit}/process`),
    enabled: cpEnabled && cpInitialSaved,
  });
  useEffect(() => {
    if (cpProcessResp?.data?.rows) setCpProcessDraft(cpProcessResp.data.rows);
  }, [cpProcessResp]);

  // Reset to the Initial tab whenever the selected order or unit changes, so
  // switching units doesn't leave a stale "Process" tab open for a unit
  // whose Initial hasn't even been saved yet.
  useEffect(() => { setCpStage('initial'); }, [selectedOrderKey, activeUnit]);

  const refreshCpChecklist = () => {
    qc.invalidateQueries({ queryKey: ['child-part-unit-checklist', selectedOrderKey, activeUnit] });
    qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
  };

  const updateCpRow = (stage, parameter, patch) => {
    const setter = stage === 'initial' ? setCpInitialDraft : setCpProcessDraft;
    setter(prev => prev.map(r => r.parameter === parameter ? { ...r, ...patch } : r));
  };

  const handleSaveCpChecklist = async (stage) => {
    const draft = stage === 'initial' ? cpInitialDraft : cpProcessDraft;
    setCpBusy(true);
    try {
      await apiRequest('PUT', `/api/production-mfg/orders/${selectedOrderKey}/child-part/${activeUnit}/${stage}`, {
        results: draft.map(r => ({ parameter: r.parameter, standardValue: r.standardValue, type: r.type, actualValue: r.actualValue, status: r.status, remarks: r.remarks })),
      });
      refreshCpChecklist();
      showSmartToast({ message: stage === 'process' ? `Unit ${activeUnit} sent to QC.` : 'Initial checklist saved.' }, '');
    } catch (error) {
      showSmartToast(error, 'Save Checklist Failed');
    } finally {
      setCpBusy(false);
    }
  };

  const handleCompletePainting = async () => {
    setCpBusy(true);
    try {
      await apiRequest('PUT', `/api/production-mfg/orders/${selectedOrderKey}/child-part/${activeUnit}/complete-painting`, {
        productionCost: Number(paintCost), productionExpense: Number(paintExpense),
      });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
      setPaintDialog(false); setPaintCost(''); setPaintExpense('');
      showSmartToast({ message: `Unit ${activeUnit} completed — added to Child Part Inventory.` }, '');
    } catch (error) {
      showSmartToast(error, 'Complete Painting Failed');
    } finally {
      setCpBusy(false);
    }
  };

  // Stage 3b (2026-09-23) — generic twin of handleCompletePainting, for the
  // true last step of a dynamic Child Part/Machine order whose QC
  // checkpoint sits earlier in the sequence (completeFinalProcessStep,
  // productionMfgController.js). Sub Child Part never reaches this — its
  // checkpoint is always the last step, captured inline via the checkpoint
  // panel instead.
  const [finalStepDialog, setFinalStepDialog] = useState(null); // { stepIndex, step }
  const [finalStepCost, setFinalStepCost] = useState('');
  const [finalStepExpense, setFinalStepExpense] = useState('');
  const [finalStepBusy, setFinalStepBusy] = useState(false);
  const handleCompleteFinalStep = async () => {
    setFinalStepBusy(true);
    try {
      await apiRequest('PUT', `/api/production-mfg/orders/${selectedOrderKey}/processes/${finalStepDialog.stepIndex}/complete-final?unit=${activeUnit}`, {
        productionCost: Number(finalStepCost), productionExpense: Number(finalStepExpense),
      });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
      showSmartToast({ message: `${finalStepDialog.step} completed.` }, '');
      setFinalStepDialog(null); setFinalStepCost(''); setFinalStepExpense('');
    } catch (error) {
      showSmartToast(error, 'Complete Step Failed');
    } finally {
      setFinalStepBusy(false);
    }
  };

  // Phase 2 — Production's own "Send for Outsourcing" trigger for a dynamic
  // Process-Definition-built Out Source step (proc.type==='Outsourcing' on a
  // step carrying the new fields — see processStepBuilderService.js). Sends
  // just THIS one step for now, not a multi-step bundle picker — the backend
  // (outsourceWorkController.js) supports bundling a consecutive run into
  // one hand-off, but building that picker UI is follow-up work; sending
  // each step of a run one at a time still works correctly today, just with
  // one click per step instead of one click per run. unitIndex is 0-based on
  // that controller (0 = top-level `processes`), while activeUnit here is
  // 1-based (Unit 1, Unit 2, ...) — converted below.
  //
  // Multi-unit outsource handoff batching (2026-09-25, see the discussion
  // doc's own section) — a hand-off's unit set is fixed once created, so
  // before sending we check which OTHER units are currently eligible for
  // this exact step run (same step INDEX required, per the confirmed
  // design) and only show a picker when there's a real choice to make; the
  // common case (no other unit ready yet, or a single-unit order) still
  // sends in one click, unchanged from before this feature.
  const [outsourceBusy, setOutsourceBusy] = useState(false);
  const [outsourceUnitPicker, setOutsourceUnitPicker] = useState(null); // { stepIndex, eligibleUnits: [1-based...], selectedUnits: Set<number> }

  const sendOutsourceHandoff = async (stepIndex, unitIndices) => {
    setOutsourceBusy(true);
    try {
      await apiRequest('POST', `/api/outsource-work/orders/${selectedOrderKey}/handoffs`, {
        unitIndices,
        stepIndices: [stepIndex],
      });
      qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
      showSmartToast({
        message: unitIndices.length > 1
          ? `Sent ${unitIndices.length} units for outsourcing — Purchase will pick this up.`
          : 'Sent for outsourcing — Purchase will pick this up.',
      }, '');
    } catch (error) {
      showSmartToast(error, 'Send for Outsourcing Failed');
    } finally {
      setOutsourceBusy(false);
    }
  };

  const handleSendForOutsourcing = async (stepIndex) => {
    setOutsourceBusy(true);
    try {
      const res = await apiRequest('GET', `/api/outsource-work/orders/${selectedOrderKey}/eligible-units?stepIndices=${stepIndex}&unitIndex=${activeUnit - 1}`);
      const otherEligible = (res?.data?.eligibleUnitIndices || []).filter(i => i !== activeUnit - 1);
      if (!otherEligible.length) {
        await sendOutsourceHandoff(stepIndex, [activeUnit - 1]);
        return;
      }
      setOutsourceUnitPicker({
        stepIndex,
        eligibleUnits: otherEligible.map(i => i + 1).sort((a, b) => a - b),
        selectedUnits: new Set(),
      });
    } catch (error) {
      showSmartToast(error, 'Send for Outsourcing Failed');
    } finally {
      setOutsourceBusy(false);
    }
  };

  const handleConfirmSendForOutsourcing = async () => {
    if (!outsourceUnitPicker) return;
    const unitIndices = [activeUnit - 1, ...[...outsourceUnitPicker.selectedUnits].map(u => u - 1)];
    const stepIndex = outsourceUnitPicker.stepIndex;
    setOutsourceUnitPicker(null);
    await sendOutsourceHandoff(stepIndex, unitIndices);
  };

  // { name, fileUrl } — fileUrl is either a plain static /uploads/... URL
  // (design files, same as Design Approval's own preview) or a blob: URL
  // (the BOM PDF, which sits behind an authenticated route — see
  // fetchBomPdfBlob below). Either way the preview dialog below renders it
  // the same way.
  const [previewFile, setPreviewFile] = useState(null);
  const [bomActionLoading, setBomActionLoading] = useState(false);
  const closePreview = () => {
    if (previewFile?.fileUrl?.startsWith('blob:')) window.URL.revokeObjectURL(previewFile.fileUrl);
    setPreviewFile(null);
  };

  // BOM PDF download is an authenticated route (unlike a design file's plain
  // static /uploads/... URL) — needs the same fetch-with-Bearer-token +
  // blob pattern BOMCreationTab.jsx's own "Download BOM" button already uses.
  // Reached only for a Machine order (Child Part has its own flat-list View
  // modal, bomViewOpen, above) — keyed by machineItemId, MachineBOM's own
  // download route (GET /api/rd/machine-bom/:machineId/download), not the
  // old RDBOM one this used before the 2026-09-16 cutover.
  const fetchBomPdfBlob = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${config.baseURL}/api/rd/machine-bom/${bomDesign.machineItemId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to load BOM PDF');
    return response.blob();
  };
  const handleViewBom = async () => {
    if (!bomDesign?.machineItemId) return;
    setBomActionLoading(true);
    try {
      const blob = await fetchBomPdfBlob();
      setPreviewFile({ name: `BOM — ${selectedOrder.machineName}`, fileUrl: window.URL.createObjectURL(blob) });
    } catch (error) {
      showSmartToast(error, 'Load BOM PDF');
    } finally {
      setBomActionLoading(false);
    }
  };
  const handleDownloadBom = async () => {
    if (!bomDesign?.machineItemId) return;
    setBomActionLoading(true);
    try {
      const blob = await fetchBomPdfBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOM_${selectedOrder.machineCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showSmartToast(error, 'Download BOM');
    } finally {
      setBomActionLoading(false);
    }
  };
  const handleRaiseRDRequestHere = async () => {
    try {
      await raiseRDRequest(selectedOrderKey);
    } catch (error) {
      showSmartToast(error, 'Raise R&D Request');
    }
  };

  const selectOrder = (order, fromCompletedTab) => {
    setSelectedOrderId(String(order._id || order.id));
    setSelectedCompletedOrder(fromCompletedTab ? order : null);
    setActiveUnit(1); // reset to Unit 1 whenever the order selection changes
    setPickerOpen(false);
  };

  // A step can only start if the previous step is Completed (QC Approved).
  // Child Part's own Fabrication->Assembly->Painting are all real per-unit
  // steps now (Job Work dropped 2026-09-16), so the generic rule applies
  // uniformly — no more special-casing a whole-order predecessor here.
  const canStart = (processes, stepIndex) => {
    if (stepIndex === 0) return true;
    return processes[stepIndex - 1].status === 'Completed';
  };

  const isFinalStepApproval = qcDialog?.action === 'approve' && qcDialog?.step === 'Final Testing';

  const handleQCSubmit = () => {
    if (!qcBy.trim()) return;
    if (qcDialog.action === 'approve') {
      if (isFinalStepApproval) {
        if (productionCost === '' || productionExpense === '' || Number(productionCost) < 0 || Number(productionExpense) < 0) return;
        approveQC(selectedOrderId, qcDialog.step, qcBy, activeUnit, Number(productionCost), Number(productionExpense));
      } else {
        approveQC(selectedOrderId, qcDialog.step, qcBy, activeUnit);
      }
    } else {
      rejectQC(selectedOrderId, qcDialog.step, qcBy, rejectReason, activeUnit);
    }
    setQcDialog(null);
    setQcBy('');
    setRejectReason('');
    setProductionCost('');
    setProductionExpense('');
  };

  const handleSaveNotes = () => {
    updateProcessNotes(selectedOrderId, notesDialog.step, notesValue, activeUnit);
    setNotesDialog(null);
  };

  const handleAssignTeam = () => {
    if (!selectedTeam) return;
    assignTeam(selectedOrderId, assignDialog.step, selectedTeam, activeUnit);
    setAssignDialog(null);
    setSelectedTeam('');
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Cog className="h-6 w-6 text-blue-600" /> Process Execution & QC
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Sequential process flow — each step requires supervisor QC approval before the next begins
        </p>
      </div>

      {/* Order Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Production Order</label>
          {/* Machine Orders vs Sub Child Part Orders — same toggle as the
              Orders page, narrows the picker (both tabs inside it) before
              searching within it. */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 gap-1 mb-2">
            {[['Machine', 'Machine Orders'], ['ChildPart', 'Child Part Orders'], ['SubChildPart', 'Sub Child Part Orders']].map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => changePickerKindFilter(kind)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${pickerKindFilter === kind
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative max-w-md">
            <button
              type="button"
              onClick={() => setPickerOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className={`truncate ${selectedOrder ? 'text-slate-800' : 'text-slate-400'}`}>
                {selectedOrder
                  ? `${selectedOrder.orderId || selectedOrder.id} — ${selectedOrder.machineName} [${selectedOrder.status}]`
                  : '-- Select an order --'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPickerTab('active')}
                      className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${pickerTab === 'active' ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/60' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Pending / In Progress ({activeOrdersFiltered.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab('completed')}
                      className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${pickerTab === 'completed' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/60' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Completed {completedPagination.total != null ? `(${completedPagination.total})` : ''}
                    </button>
                  </div>

                  {/* Search */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        className="pl-8 h-8 text-xs"
                        placeholder="Search by order no. or machine code..."
                        value={pickerSearch}
                        onChange={e => changePickerSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-64 overflow-y-auto">
                    {pickerTab === 'active' ? (
                      activeOrdersFiltered.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">No matching orders.</p>
                      ) : activeOrdersFiltered.map(o => (
                        <button
                          key={o._id || o.id}
                          type="button"
                          onClick={() => selectOrder(o, false)}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors ${selectedOrderId === String(o._id || o.id) ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          {o.orderId || o.id} — {o.machineName} <span className="text-slate-400">[{o.status}]</span>
                        </button>
                      ))
                    ) : completedLoading ? (
                      <p className="text-center text-xs text-slate-400 py-6">Loading...</p>
                    ) : completedOrders.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">No completed orders match.</p>
                    ) : completedOrders.map(o => (
                      <button
                        key={o._id || o.id}
                        type="button"
                        onClick={() => selectOrder(o, true)}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-emerald-50 transition-colors ${selectedOrderId === String(o._id || o.id) ? 'bg-emerald-50 font-semibold' : ''}`}
                      >
                        {o.orderId || o.id} — {o.machineName} <span className="text-emerald-500">[Completed]</span>
                      </button>
                    ))}
                  </div>

                  {/* Pagination — Completed tab only; the active tab shows everything at once */}
                  {pickerTab === 'completed' && completedPagination.pages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                      <Button
                        size="sm" variant="outline" className="h-6 text-xs px-2"
                        disabled={completedPagination.page <= 1}
                        onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <span className="text-[11px] text-slate-500">
                        Page {completedPagination.page} of {completedPagination.pages}
                      </span>
                      <Button
                        size="sm" variant="outline" className="h-6 text-xs px-2"
                        disabled={completedPagination.page >= completedPagination.pages}
                        onClick={() => setCompletedPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedOrderId && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Cog className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select an order to manage its process execution and QC approvals</p>
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <>
          {/* Informative summary + BOM & Design — combines what Order
              Management's per-machine view and this page each used to show
              separately. Process Steps below is unchanged. */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-slate-900">{selectedOrder.machineName}</h2>
                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedOrder.machineCode}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedOrder.orderId || selectedOrder.id}{selectedOrder.orderCode ? ` · ${selectedOrder.orderCode}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">Progress</div>
                  <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{progress}%</span>
                </div>
              </div>

              {/* Informative tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-500 mb-1">Quantity</p>
                  <p className="font-bold text-blue-800 text-base">{unitCount} unit{unitCount > 1 ? 's' : ''}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Priority</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedOrder.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {selectedOrder.priority}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Received</p>
                  <p className="font-semibold text-slate-800">{selectedOrder.receivedDate}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Delivery</p>
                  <p className="font-semibold text-slate-800">{selectedOrder.deliveryDate}</p>
                  <p className="text-[10px] text-slate-400">{selectedOrder.status}</p>
                </div>
              </div>

              {/* BOM & Design — doesn't apply to an in-house Sub Child Part
                  order (no lockable BOM/design-approval concept at this
                  level — see its own section below instead). See the
                  query/handlers above for the actual lock/approval check and
                  view/download logic. */}
              {!isInHouseSubChildPart && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" /> BOM & Design
                </h3>
                {bomDesignLoading ? (
                  <p className="text-xs text-slate-400">Checking BOM lock & design approval status…</p>
                ) : selectedOrder.orderKind === 'ChildPart' ? (
                  // No whole-BOM to lock or design-approval workflow for a
                  // Sub Child Part — just two existence checks (see
                  // getBomDesignStatus). BOM's View shows the plain per-piece
                  // material list (what one unit is made of); the order-scaled
                  // numbers are in the Material List section below.
                  <div className="flex gap-3 flex-wrap">
                    <div className={`flex-1 min-w-[220px] p-3 rounded-lg border text-sm ${bomDesign?.bomLocked ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">
                          {bomDesign?.bomLocked ? `✓ Materials Defined (${bomDesign.materials?.length || 0})` : '✗ No Materials Defined'}
                        </span>
                        {bomDesign?.bomLocked && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBomViewOpen(true)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className={`flex-1 min-w-[220px] p-3 rounded-lg border text-sm ${bomDesign?.designApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">
                          {bomDesign?.designApproved ? '✓ Design File Available' : '✗ Design File Missing'}
                        </span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!bomDesign?.designFiles?.length} onClick={() => setDesignPickerOpen(true)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : bomDesign?.autoVerified || (selectedOrder.bomVerified && selectedOrder.designVerified) ? (
                  // Fixed 2026-09-24 (found live, unrelated to today's Phase
                  // 2 work — a pre-existing gap): bomDesign.autoVerified only
                  // ever reflects the LIVE MachineBOM.isLocked/designApproved
                  // check (getBomDesignStatus). R&D's own manual "Initial BOM
                  // Approval" override (see new-bom-hierarchy-bug-fixes.md
                  // #11 — R&D can approve as an explicit judgment call
                  // without the BOM actually being locked yet) only ever sets
                  // the STORED order.bomVerified/designVerified flags, which
                  // this branch's condition never checked — so after R&D
                  // approved, /production/orders (OrderManagement.jsx, which
                  // reads these same stored flags directly) correctly showed
                  // verified, while this page kept showing "BOM Not Locked"
                  // and still offered "Raise R&D Request" forever, since the
                  // underlying MachineBOM genuinely never gets locked by that
                  // override path. Now treats either signal as verified.
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px] p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-emerald-700">✓ BOM Locked & Verified</span>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bomActionLoading} onClick={handleViewBom}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bomActionLoading} onClick={handleDownloadBom}>
                            <Download className="h-3.5 w-3.5 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[220px] p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-emerald-700">✓ Design Approved</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!bomDesign.designFiles?.length} onClick={() => setDesignPickerOpen(true)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View / Download{bomDesign.designFiles?.length > 1 ? ` (${bomDesign.designFiles.length})` : ''}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 flex-wrap">
                      <div className={`flex-1 min-w-[220px] p-3 rounded-lg border text-sm ${bomDesign?.bomLocked ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold">{bomDesign?.bomLocked ? '✓ BOM Locked' : '✗ BOM Not Locked'}</span>
                          {/* MachineBOM's download route only requires the
                              document to exist, not be locked — R&D can have
                              real content entered well before formally
                              locking it, so this shows regardless of
                              bomLocked, same as the ChildPart branch's own
                              View button one section up. */}
                          {bomDesign?.materials?.length > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bomActionLoading} onClick={handleViewBom}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className={`flex-1 min-w-[220px] p-3 rounded-lg border text-sm ${bomDesign?.designApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <span className="font-semibold">{bomDesign?.designApproved ? '✓ Design Approved' : '✗ Design Not Approved'}</span>
                      </div>
                    </div>
                    {!selectedOrder.rdRequestRaised ? (
                      <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs" onClick={handleRaiseRDRequestHere}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Raise R&D Request
                      </Button>
                    ) : (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> R&D request raised — awaiting design & BOM from R&D team
                      </p>
                    )}
                  </div>
                )}
              </div>
              )}

              {!isInHouseSubChildPart && !selectedOrder.materialIssued && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Materials not issued. Raise material demand in Order Management before starting Job Work.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material List — Child Part orders and Machine orders (2026-09-17),
              and Sub Child Part orders too (2026-09-19). Shown inline right
              after BOM & Design (not behind a button, no BOM PDF), same
              position for all 3 order kinds — moved back above the Sub Child
              Part block below (2026-09-19; had drifted below it, unlike
              Machine/Child Part's own position here). Categorized (Child/Sub
              Child Part reference / Raw Material / Tool / Sheet Metal /
              Length Fabrication), per-piece and whole-order totals, live
              Available/Sent to Purchase — see buildSubChildPartMaterialList /
              buildMachineMaterialList / buildSubChildPartRawMaterialList (one
              row always, a Sub Child Part's own BOM is exactly one raw
              material line). */}
          {(isSubChildPartOrder || isMachineOrder || isInHouseSubChildPart) && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="h-4 w-4" /> Material List
                  </h2>
                  <span className="text-xs text-slate-400">Order Quantity: {selectedOrder.orderQuantity || 1}</span>
                </div>
                {materialListLoading ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading materials…</p>
                ) : materialListCategories.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No materials defined yet.</p>
                ) : (
                  <div className="space-y-6">
                    {materialListCategories.map(cat => (
                      <div key={cat.name}>
                        <h4 className="text-sm font-bold text-slate-700 mb-1.5">{cat.name}</h4>
                        {cat.note && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {cat.note}
                          </p>
                        )}
                        <div className="overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="w-full text-sm min-w-[860px]">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Material</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Process Type</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Sub-Process Type</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Total Qty</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Availability</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.materials.map(m => {
                                const row = { ...m, category: cat.name };
                                const inTransit = (m.transferredQty || 0) - (m.issuedQty || 0);
                                const onFloor = (m.issuedQty || 0) - (m.returnPendingQty || 0);
                                const canRequestMore = (m.requestedQty || 0) < (m.issueTotal || 0);
                                const pct = m.issueTotal ? Math.min(100, Math.round((m.issuedQty / m.issueTotal) * 100)) : 0;
                                return (
                                  <tr key={m.demandKey} className="border-b border-slate-50 last:border-0 align-top">
                                    <td className="px-3 py-2 max-w-[200px]">
                                      <span className="block text-slate-700 line-clamp-2" title={m.name}>{m.name}</span>
                                      <span className="block font-mono text-[11px] text-blue-600 truncate" title={m.code}>{m.code}</span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600 max-w-[130px]">
                                      <span className="block line-clamp-2" title={m.processType || ''}>{m.processType || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600 max-w-[130px]">
                                      <span className="block line-clamp-2" title={m.subProcessType || ''}>{m.subProcessType || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {m.amount ? `${m.amount.value} ${m.amount.unit}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">{m.quantity ?? '—'} {m.unit}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                      {m.totalAmount != null ? `${m.totalAmount} ${m.amount?.unit || ''}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                                      {m.totalQuantity != null ? `${m.totalQuantity} ${m.totalQuantityLabel || m.unit || ''}` : '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                      {m.demandStatus ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-xs text-slate-600">{m.issuedQty}/{m.issueTotal}</span>
                                          </div>
                                          <span className="text-[11px] font-semibold text-slate-500">{m.demandStatus}{m.returnPendingQty > 0 ? ` · ${m.returnPendingQty} return pending` : ''}</span>
                                        </>
                                      ) : (
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                          m.availability === 'Available' ? 'bg-emerald-100 text-emerald-700'
                                            : m.availability === 'Sent to Purchase' ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>{m.availability}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex justify-end gap-1.5">
                                        {inTransit > 0 && (
                                          <Button size="sm" className="h-7 text-xs" disabled={receiveMut.isPending}
                                            onClick={() => receiveMut.mutate({ demandKey: m.demandKey, receivedQuantity: inTransit })}>
                                            Receive {inTransit}
                                          </Button>
                                        )}
                                        {canRequestMore && inTransit <= 0 && (
                                          <Button size="sm" variant="outline" className="h-7 text-xs"
                                            onClick={() => { setIssueRow(row); setIssueQty(''); }}>
                                            Issue
                                          </Button>
                                        )}
                                        {onFloor > 0 && (
                                          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                            onClick={() => openReturn(row)}>
                                            Return
                                          </Button>
                                        )}
                                        {!inTransit && !canRequestMore && !onFloor && (
                                          <span className="text-xs text-slate-300">—</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Machine / Unit Tabs — only shown when this order builds more than
              one physical machine, so single-quantity orders look exactly as
              before. Each tab tracks its own independent process pipeline.
              Doesn't apply to an in-house Sub Child Part order — its
              orderQuantity is a batch size, not a count of separately
              tracked physical units. */}
          {unitCount > 1 && !isInHouseSubChildPart && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 pl-1">{isSubChildPartOrder ? 'Unit:' : 'Machine:'}</span>
                  {Array.from({ length: unitCount }, (_, i) => i + 1).map(unitNo => {
                    const unitProcs = getUnitProcessesFor(selectedOrder, unitNo);
                    const unitDone = unitProcs.filter(p => p.status === 'Completed').length;
                    const unitComplete = unitDone === unitProcs.length;
                    return (
                      <button
                        key={unitNo}
                        onClick={() => setActiveUnit(unitNo)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeUnit === unitNo
                            ? 'bg-blue-600 text-white border-blue-600'
                            : unitComplete
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        {unitComplete && <CheckCircle className="h-3 w-3" />}
                        Unit {unitNo}
                        <span className={`text-[10px] ${activeUnit === unitNo ? 'text-blue-100' : 'text-slate-400'}`}>
                          {unitDone}/{unitProcs.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Steps — grouped by the BOM Process Definition's Category
              label (proc.category). Purely a display grouping: the category
              is just a heading, every action/state below is still wired to
              the individual internal-process step, unchanged. */}
          <div className="space-y-5">
            {groupProcessesByCategory(activeProcesses).map((group, gIdx) => (
              <div key={`${group.category || 'ungrouped'}-${gIdx}`} className="space-y-3">
                {group.category && (
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                    {group.category}
                  </h3>
                )}
                {group.items.map(({ proc, idx }) => {
              const unlocked = canStart(activeProcesses, idx);
              const team = proc.assignedTeam ? getTeamById(proc.assignedTeam) : null;
              // A Sub Child Part order's Fabrication runs per unit, with its
              // own team + manual Start (unlike a machine order, where the
              // stage has neither). Everything gated on Fabrication below
              // keys off this.
              const scpFabrication = isSubChildPartOrder && proc.step === 'Fabrication';
              return (
                <Card key={proc.step} className={`border-2 shadow-sm transition-all ${stepColor[proc.status]} ${!unlocked && proc.status === 'Pending' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Step Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900">{proc.step}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${typeColor[proc.type]}`}>{proc.type}</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${stepBadge[proc.status]}`}>
                              {stepIcon[proc.status]} {proc.status}
                            </span>
                            {!unlocked && proc.status === 'Pending' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                <Lock className="h-3 w-3" /> Locked
                              </span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-slate-500">
                            {proc.startDate && <span>Started: <strong>{proc.startDate}</strong></span>}
                            {proc.endDate && <span>Completed: <strong>{proc.endDate}</strong></span>}
                            {proc.qcDate && <span>QC: <strong>{proc.qcDate}</strong> by {proc.qcBy}</span>}
                          </div>

                          {/* Team Assignment — hidden for a MACHINE order's
                              Fabrication (work begins per Sub Child Part
                              there, each with its own team). A Sub Child Part
                              order's Fabrication is per-unit and does take a
                              team, so it's shown. Also hidden for an
                              Out Source step (Phase 2) — Purchase handles it,
                              not a Production team. */}
                          {(proc.step !== 'Fabrication' || scpFabrication) && proc.type !== 'Outsourcing' && (
                            <div className="mt-2 flex items-center gap-2">
                              {team ? (
                                <span className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                  <Users className="h-3.5 w-3.5 text-blue-500" />
                                  {team.name} — Supervisor: {team.supervisor}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">No team assigned</span>
                              )}
                              {proc.status !== 'Completed' && (
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600 px-2" onClick={() => { setAssignDialog({ step: proc.step }); setSelectedTeam(String(proc.assignedTeam?._id || proc.assignedTeam || '')); }}>
                                  {team ? 'Change Team' : '+ Assign Team'}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Notes & Reworks */}
                          {proc.reworks.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                              <strong>Reworks ({proc.reworks.length}):</strong> {proc.reworks.map(r => r.reason).join('; ')}
                            </div>
                          )}
                          {proc.notes && (
                            <p className="mt-1.5 text-xs text-slate-500 italic">Notes: {proc.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {/* Phase 2 — a dynamic Out Source step (see
                            processStepBuilderService.js) has none of the old
                            hardcoded actions below; Purchase handles it via
                            outsourceWorkController.js, Production only ever
                            triggers the hand-off. Kept as a fully separate
                            branch rather than threading proc.type checks
                            through every old condition below, so every
                            existing In-House step keeps its exact current
                            behavior untouched. */}
                        {proc.type === 'Outsourcing' ? (
                          proc.status === 'Completed' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Received
                            </span>
                          ) : proc.status === 'QC Pending' ? (
                            <span className="text-xs text-purple-600 italic px-2 py-1">Received — awaiting QC</span>
                          ) : proc.outsourceStatus === 'NotStarted' ? (
                            unlocked && canEdit ? (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" disabled={outsourceBusy}
                                onClick={() => handleSendForOutsourcing(idx)}>
                                <Send className="h-3.5 w-3.5 mr-1" /> Send for Outsourcing
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 italic px-2 py-1">Not ready yet — complete the step(s) before this first.</span>
                            )
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold px-2 py-1 bg-purple-50 border border-purple-200 rounded-full">
                              <Clock className="h-3.5 w-3.5" /> Waiting on Outsource ({proc.outsourceStatus})
                            </span>
                          )
                        ) : (<>
                        {/* A MACHINE order's Fabrication has no manual Start —
                            it auto-advances once Job Work completes and work
                            begins per Sub Child Part. A SUB CHILD PART order's
                            Fabrication IS started manually, per unit, and only
                            once enough material for this unit is on the floor
                            (backend re-checks; the button is disabled with a
                            reason until then). */}
                        {proc.status === 'Pending' && unlocked && canEdit && (proc.step !== 'Fabrication' || scpFabrication) && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-40"
                            disabled={isSubChildPartOrder && proc.step === 'Painting' && cpUnitStatus !== 'Approved'}
                            title={
                              (isSubChildPartOrder && proc.step === 'Painting' && cpUnitStatus !== 'Approved') ? "This unit's QC checklist must be Approved first — see the checklist under Assembly."
                              : undefined
                            }
                            onClick={() => startProcess(selectedOrderId, proc.step, activeUnit)}
                          >
                            <Play className="h-3.5 w-3.5 mr-1" /> Start{scpFabrication ? ` Unit ${activeUnit}` : ''}
                          </Button>
                        )}
                        {proc.status === 'In Progress' && canEdit && (
                          <>
                            {!(isSubChildPartOrder && (proc.step === 'Painting' || proc.step === 'Assembly')) && proc.step !== 'Final Testing'
                              && idx !== checkpointIdx && idx !== trueLastStepAfterCheckpoint && (
                              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => markProcessComplete(selectedOrderId, proc.step, activeUnit)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                              </Button>
                            )}
                            {proc.step === 'Final Testing' && (
                              <span className="text-xs text-slate-400 italic">Submitting the checklist below completes Final Testing and sends it to QC</span>
                            )}
                            {isSubChildPartOrder && proc.step === 'Assembly' && (
                              <span className="text-xs text-slate-400 italic">Submitting the Process checklist below completes Assembly</span>
                            )}
                            {isSubChildPartOrder && proc.step === 'Painting' && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" onClick={() => setPaintDialog(true)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete Painting — Unit {activeUnit}
                              </Button>
                            )}
                            {/* Stage 3b — the dynamic checkpoint step
                                (whatever it's named) completes the same way
                                Final Testing already does: submitting the
                                checklist panel below, not this button. */}
                            {idx === checkpointIdx && (
                              <span className="text-xs text-slate-400 italic">Submitting the QC checklist below completes this step and sends it to QC</span>
                            )}
                            {/* The true last step, reached after an earlier
                                checkpoint already passed — no further QC,
                                Production alone finishes it and reports cost. */}
                            {idx === trueLastStepAfterCheckpoint && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" onClick={() => setFinalStepDialog({ stepIndex: idx, step: proc.step })}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete {proc.step}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setNotesDialog({ step: proc.step }); setNotesValue(proc.notes); }}>
                              Notes
                            </Button>
                          </>
                        )}
                        {/* Final Testing / the dynamic QC checkpoint have no
                            self-certify Approve/Reject here — the real
                            decision is QC's own review on /qc/jobs, gated
                            on the checklist submitted above; "QC Pending"
                            for either just means "waiting on QC." */}
                        {proc.status === 'QC Pending' && canEdit && proc.step !== 'Final Testing' && idx !== checkpointIdx && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'approve' })}>
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve QC
                            </Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'reject' })}>
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject QC
                            </Button>
                          </>
                        )}
                        {proc.status === 'QC Pending' && (proc.step === 'Final Testing' || idx === checkpointIdx) && (
                          <span className="text-xs text-slate-400 italic">Sent to QC — awaiting their decision</span>
                        )}

                        {proc.status === 'Completed' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1">
                            <CheckCircle className="h-3.5 w-3.5" /> QC Approved
                          </span>
                        )}
                        </>)}
                      </div>
                    </div>

                    {/* MACHINE order — Sub Child Part QC: each of the machine's
                        own sub child parts is worked + QC'd individually here,
                        independent of the stage's Start button (confirmed
                        2026-09-01). Renders nothing for a non-manufactured
                        product (see SubChildPartQCPanel's own comment).
                        Gated on proc.status !== 'Pending' — same "shown once
                        the step is actually reached" rule Final Testing's own
                        panel already uses — since this panel's query has a
                        real side effect (ensureQCJobForOrder creates a real
                        QCJob record the first time it's called); mounting it
                        the instant a fresh order is opened created a
                        permanent, empty "Pending" QCJob before Production had
                        done anything at all (confirmed 2026-09-17). */}
                    {proc.step === 'Fabrication' && !isSubChildPartOrder && proc.status !== 'Pending' && (
                      <div className="w-full mt-4 pt-4 border-t border-slate-100">
                        <SubChildPartQCPanel orderId={selectedOrderId} canEdit={canEdit} teams={teams} />
                      </div>
                    )}

                    {/* CHILD PART order — this unit's own QC checklist
                        (module:'childPart', staged Initial/Process), shown
                        once this unit's own Assembly is Started (redesigned
                        2026-09-19 — filling and submitting this checklist IS
                        what completes Assembly now, so the panel can't wait
                        for 'Completed' the way it used to; proc.status!==
                        'Pending' keeps it visible through 'In Progress' and
                        after submission, including a reject cycle which
                        reopens Assembly back to 'In Progress'). One QCJob
                        per order, but this unit's own nested entry —
                        independent of every sibling unit (confirmed with the
                        user 2026-09-16, does NOT wait for the whole order the
                        way Machine's Final Testing does). Attached to the
                        Assembly card since that's the step it drives; it's
                        what gates Painting's own Start above. */}
                    {isSubChildPartOrder && proc.step === 'Assembly' && proc.status !== 'Pending' && (
                      <div className="w-full mt-4 pt-4 border-t border-slate-100">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                              Unit {activeUnit} QC Checklist
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              cpUnitStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700'
                              : cpUnitStatus === 'Rejected' ? 'bg-red-100 text-red-700'
                              : cpUnitStatus === 'QC Pending' ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                            }`}>
                              {cpUnitStatus}
                            </span>
                          </div>
                          <div className="flex gap-2 px-3 pt-2">
                            <button
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${cpStage === 'initial' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                              onClick={() => setCpStage('initial')}
                            >
                              Initial
                            </button>
                            <button
                              className={`px-3 py-1 rounded-full text-xs font-semibold border disabled:opacity-40 ${cpStage === 'process' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                              disabled={!cpInitialSaved}
                              title={!cpInitialSaved ? 'Save the Initial checklist first' : undefined}
                              onClick={() => setCpStage('process')}
                            >
                              Process
                            </button>
                          </div>
                          <div className="p-3 space-y-2">
                            {(cpStage === 'initial' ? cpInitialLoading : cpProcessLoading) ? (
                              <p className="text-sm text-slate-400">Loading checklist…</p>
                            ) : (cpStage === 'initial' ? cpInitialDraft : cpProcessDraft).length === 0 ? (
                              <p className="text-sm text-slate-400">
                                No {cpStage === 'initial' ? 'Initial' : 'Process'} QC checklist configured yet for this Child Part — ask R&D to set one up at R&D → Inventory QC → Child Part.
                              </p>
                            ) : (
                              <>
                                {(cpStage === 'initial' ? cpInitialDraft : cpProcessDraft).map(row => (
                                  <div key={row.parameter} className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-slate-800">{row.parameter}</span>
                                      <div className="flex gap-1.5">
                                        <Button
                                          size="sm" className={`h-7 text-xs ${row.status === 'Pass' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                          variant={row.status === 'Pass' ? 'default' : 'outline'}
                                          disabled={!canEdit || !cpUnitEditable}
                                          onClick={() => updateCpRow(cpStage, row.parameter, { status: 'Pass' })}
                                        >
                                          Pass
                                        </Button>
                                        <Button
                                          size="sm" className={`h-7 text-xs ${row.status === 'Fail' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                                          variant={row.status === 'Fail' ? 'default' : 'outline'}
                                          disabled={!canEdit || !cpUnitEditable}
                                          onClick={() => updateCpRow(cpStage, row.parameter, { status: 'Fail' })}
                                        >
                                          Fail
                                        </Button>
                                      </div>
                                    </div>
                                    {row.type === 'value' && (
                                      <Input
                                        placeholder={`Expected: ${row.standardValue}`} value={row.actualValue || ''}
                                        onChange={e => updateCpRow(cpStage, row.parameter, { actualValue: e.target.value })}
                                        className="h-8 text-sm" disabled={!canEdit || !cpUnitEditable}
                                      />
                                    )}
                                    {row.qcStatus && row.qcStatus !== 'Pending' && (
                                      <p className={`text-xs font-medium ${row.qcStatus === 'Pass' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        QC verdict: {row.qcStatus}{row.qcRemarks ? ` — ${row.qcRemarks}` : ''}
                                      </p>
                                    )}
                                  </div>
                                ))}
                                {canEdit && cpUnitEditable && (
                                  <Button
                                    size="sm" variant="outline"
                                    disabled={cpBusy || (cpStage === 'initial' ? cpInitialDraft : cpProcessDraft).some(r => !r.status || r.status === 'Pending')}
                                    onClick={() => handleSaveCpChecklist(cpStage)}
                                  >
                                    Save {cpStage === 'initial' ? 'Initial' : 'Process'} Checklist{cpStage === 'process' ? ' — Send to QC' : ''}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Final Testing checklist — every order, not just
                        manufactured ones (see FinalChecklistPanel's own
                        comment). Shown once the step is actually reached,
                        same gate the old Sub Entries section below already
                        used. */}
                    {proc.step === 'Final Testing' && proc.status !== 'Pending' && (
                      <FinalChecklistPanel orderId={selectedOrderId} canEdit={canEdit} procStatus={proc.status} unitNumber={activeUnit} />
                    )}

                    {/* Stage 3b — the dynamic QC checkpoint's own self-check
                        + submit panel, generalizing FinalChecklistPanel/
                        the Child Part Initial-Process UI above into one
                        component driven by position (see its own comment).
                        Same "shown once reached" gate as Final Testing's. */}
                    {idx === checkpointIdx && proc.status !== 'Pending' && (
                      <QcCheckpointPanel orderId={selectedOrderId} canEdit={canEdit} procStatus={proc.status} unitNumber={activeUnit} orderKind={selectedOrder.orderKind} />
                    )}

                    {/* Stage 3d — shown regardless of this step's own status
                        (Locked included): Production wants to see ahead of
                        time whether the NEXT unit will have enough, not
                        just once a step is actionable. */}
                    {proc.materialRefs?.length > 0 && (
                      <StepMaterialStatus orderId={selectedOrderId} unitNumber={activeUnit} stepIndex={idx} />
                    )}

                  </CardContent>
                </Card>
              );
                })}
              </div>
            ))}
          </div>

          {/* Completed Banner */}
          {selectedOrder.status === 'Completed' && (
            <Card className="border-2 border-emerald-300 bg-emerald-50 shadow-sm">
              <CardContent className="p-5 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-emerald-800 text-lg">All Processes Completed!</h3>
                <p className="text-emerald-700 text-sm mt-1">
                  {isSubChildPartOrder
                    ? `${unitCount} unit${unitCount > 1 ? 's' : ''} of ${selectedOrder.machineName} added to Child Part Inventory.`
                    : `${selectedOrder.machineName} is ready to be forwarded to Quality / Dispatch.`}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* QC Dialog */}
      <Dialog open={!!qcDialog} onOpenChange={() => { setQcDialog(null); setProductionCost(''); setProductionExpense(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={qcDialog?.action === 'approve' ? 'text-emerald-700' : 'text-red-700'}>
              {qcDialog?.action === 'approve' ? <ThumbsUp className="inline h-4 w-4 mr-2" /> : <ThumbsDown className="inline h-4 w-4 mr-2" />}
              {qcDialog?.action === 'approve' ? 'Approve QC' : 'Reject QC'} — {qcDialog?.step}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Supervisor Name *</label>
              <Input placeholder="Enter your name" value={qcBy} onChange={e => setQcBy(e.target.value)} />
            </div>
            {isFinalStepApproval && (
              <div className="space-y-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-emerald-800">This unit is now built — enter what it actually cost, so its BOM/pricing stays accurate.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost *</label>
                    <Input type="number" min="0" placeholder="0" value={productionCost} onChange={e => setProductionCost(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense *</label>
                    <Input type="number" min="0" placeholder="0" value={productionExpense} onChange={e => setProductionExpense(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
            {qcDialog?.action === 'reject' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Rejection Reason *</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the issue requiring rework..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQcDialog(null); setProductionCost(''); setProductionExpense(''); }}>Cancel</Button>
            <Button
              onClick={handleQCSubmit}
              disabled={!qcBy.trim() || (qcDialog?.action === 'reject' && !rejectReason.trim()) || (isFinalStepApproval && (productionCost === '' || productionExpense === '' || Number(productionCost) < 0 || Number(productionExpense) < 0))}
              className={qcDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {qcDialog?.action === 'approve' ? 'Approve' : 'Reject & Send for Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Team — {assignDialog?.step}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {teams.map(t => {
              const tid = String(t._id || t.id);
              return (
              <button
                key={tid}
                onClick={() => setSelectedTeam(tid)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedTeam === tid ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
              >
                <div className="font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Supervisor: {t.supervisor} · {t.members.length} members</div>
                <div className="text-xs text-slate-400 mt-0.5">Skills: {t.skills.join(', ')}</div>
                <div className="text-xs text-blue-600 mt-0.5 font-semibold">Efficiency: {t.efficiency}%</div>
              </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignTeam} disabled={!selectedTeam} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Notes — {notesDialog?.step}</DialogTitle></DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Add notes about this process step..."
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveNotes} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Painting Dialog — Child Part per-unit cost capture. Painting
          is Child Part's own final step, but doesn't go through the generic
          markProcessComplete/approveQC loop (backend refuses it there) — this
          is its own dedicated completion action, mirroring Machine's own
          per-unit "later unit wins" cost capture at its final step. */}
      <Dialog open={paintDialog} onOpenChange={(open) => { if (!open) { setPaintDialog(false); setPaintCost(''); setPaintExpense(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-purple-700">Complete Painting — Unit {activeUnit}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">This unit is now built — enter what it actually cost, so its BOM/pricing stays accurate.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost *</label>
                <Input type="number" min="0" placeholder="0" value={paintCost} onChange={e => setPaintCost(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense *</label>
                <Input type="number" min="0" placeholder="0" value={paintExpense} onChange={e => setPaintExpense(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaintDialog(false); setPaintCost(''); setPaintExpense(''); }}>Cancel</Button>
            <Button
              onClick={handleCompletePainting}
              disabled={cpBusy || paintCost === '' || paintExpense === '' || Number(paintCost) < 0 || Number(paintExpense) < 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Complete Painting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Final Step (Stage 3b) — Child Part/Machine's true last
          step when the QC checkpoint sat earlier in the sequence, generic
          twin of the Painting dialog above. */}
      <Dialog open={!!finalStepDialog} onOpenChange={(open) => { if (!open) { setFinalStepDialog(null); setFinalStepCost(''); setFinalStepExpense(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-purple-700">Complete {finalStepDialog?.step}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">This is the last step — enter what it actually cost, so its BOM/pricing stays accurate.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost *</label>
                <Input type="number" min="0" placeholder="0" value={finalStepCost} onChange={e => setFinalStepCost(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense *</label>
                <Input type="number" min="0" placeholder="0" value={finalStepExpense} onChange={e => setFinalStepExpense(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFinalStepDialog(null); setFinalStepCost(''); setFinalStepExpense(''); }}>Cancel</Button>
            <Button
              onClick={handleCompleteFinalStep}
              disabled={finalStepBusy || finalStepCost === '' || finalStepExpense === '' || Number(finalStepCost) < 0 || Number(finalStepExpense) < 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Complete {finalStepDialog?.step}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-unit outsource handoff batching (2026-09-25) — Production
          picks which OTHER units currently sitting at this exact step to
          bundle into the same hand-off as the unit they clicked Send from.
          The unit set is fixed once sent — no adding units to it later. */}
      <Dialog open={!!outsourceUnitPicker} onOpenChange={(open) => { if (!open) setOutsourceUnitPicker(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-purple-700">Send for Outsourcing</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">
              Other units are also ready for this step. Include them in the same hand-off, or send Unit {activeUnit} alone.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Checkbox checked disabled />
                Unit {activeUnit} <span className="text-xs text-slate-400 font-normal">(this unit)</span>
              </div>
              {outsourceUnitPicker?.eligibleUnits.map(u => (
                <label key={u} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={outsourceUnitPicker.selectedUnits.has(u)}
                    onCheckedChange={(checked) => {
                      setOutsourceUnitPicker(prev => {
                        const next = new Set(prev.selectedUnits);
                        if (checked) next.add(u); else next.delete(u);
                        return { ...prev, selectedUnits: next };
                      });
                    }}
                  />
                  Unit {u}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutsourceUnitPicker(null)}>Cancel</Button>
            <Button
              onClick={handleConfirmSendForOutsourcing}
              disabled={outsourceBusy}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {(() => {
                const n = 1 + (outsourceUnitPicker?.selectedUnits.size || 0);
                return `Send ${n} Unit${n > 1 ? 's' : ''}`;
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Design File Picker — a machine can have several design files (BOM
          Part uploads + general R&D uploads), categorized the same way
          Design Approval shows/approves them (purple "BOM Part" badge vs a
          plain version tag). Picking one opens the shared preview below. */}
      <Dialog open={designPickerOpen} onOpenChange={setDesignPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Design Files — {selectedOrder?.machineName}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {(bomDesign?.designFiles || []).map(file => (
              <div key={file._id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                  {file.source === 'BOM Part' ? (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">BOM Part</span>
                  ) : file.version && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{file.version}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => { setPreviewFile(file); setDesignPickerOpen(false); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <a href={file.fileUrl} download target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
            {(!bomDesign?.designFiles || bomDesign.designFiles.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">No design files found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub Child Part BOM — the plain per-piece material list (what one
          unit of the part is made of, straight off whichever machine's BOM
          it's linked to). No PDF, no order scaling — the Material List
          section on the page has the order-level numbers. */}
      <Dialog open={bomViewOpen} onOpenChange={setBomViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>BOM — {selectedOrder?.machineName}</DialogTitle>
            <p className="text-xs text-slate-400">Materials per one piece</p>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Material</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Unit</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const materials = bomDesign?.materials || [];
                  // lineKind only exists for a Child Part order's own BOM
                  // (see childPartReorderService.js's findSubChildPartMaterialLines) —
                  // a Machine order's plain RDBOM materials have no such tag,
                  // so they fall back to one flat, unlabeled group exactly
                  // like this modal always rendered before.
                  const hasKinds = materials.some(m => m.lineKind);
                  const groups = hasKinds
                    ? [
                        { label: 'Sub Child Part', rows: materials.filter(m => m.lineKind === 'SubChildPart') },
                        { label: 'Materials', rows: materials.filter(m => m.lineKind !== 'SubChildPart') },
                      ].filter(g => g.rows.length)
                    : [{ label: null, rows: materials }];

                  return groups.map(group => (
                    <React.Fragment key={group.label || 'flat'}>
                      {group.label && (
                        <tr>
                          <td colSpan={4} className="px-2 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase">
                            {group.label}
                          </td>
                        </tr>
                      )}
                      {group.rows.map(m => {
                        const isFab = !!m.fabricationCategory;
                        return (
                          <tr key={m._id || m.code} className="border-b border-slate-50 last:border-0 align-top">
                            <td className="px-2 py-2 max-w-[220px]">
                              <span className="block text-slate-700 line-clamp-2" title={m.item}>{m.item}</span>
                              <span className="block font-mono text-[11px] text-blue-600 truncate" title={m.code}>{m.code}</span>
                            </td>
                            <td className="px-2 py-2 text-right text-slate-700">{m.amountValue != null ? m.amountValue : '—'}</td>
                            <td className="px-2 py-2 text-right text-slate-700">
                              {isFab && <span className="text-[10px] text-slate-400 mr-1">Pieces</span>}
                              {m.quantity}
                            </td>
                            <td className="px-2 py-2 text-slate-500">{m.unit}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
            {(!bomDesign?.materials || bomDesign.materials.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">No materials defined yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue — Production requests (or tops up) one Material List row.
          Capped at the whole order's need minus what's already requested. */}
      <Dialog open={!!issueRow} onOpenChange={(o) => !o && setIssueRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Issue — {issueRow?.name}</DialogTitle>
            {issueRow?.category === 'Length Fabrication' && issueRow?.amount && (
              <p className="text-xs text-slate-400">Each piece = {issueRow.amount.value} {issueRow.amount.unit}</p>
            )}
          </DialogHeader>
          {issueRow && (() => {
            const remaining = (issueRow.issueTotal || 0) - (issueRow.requestedQty || 0);
            const n = Number(issueQty);
            const derived = issueRow.category === 'Length Fabrication' && issueRow.amount && n > 0
              ? ` = ${n * issueRow.amount.value} ${issueRow.amount.unit}` : '';
            return (
              <div className="space-y-3 py-1">
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>Whole order needs</span><span className="font-semibold text-slate-700">{issueRow.issueTotal} {issueRow.issueUnit}</span></div>
                  <div className="flex justify-between"><span>Already requested</span><span>{issueRow.requestedQty || 0} {issueRow.issueUnit}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold">Can request now</span><span className="font-bold text-emerald-700">{remaining} {issueRow.issueUnit}</span></div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    {issueRow.category === 'Sheet Metal' ? 'Sheets to request' : issueRow.category === 'Length Fabrication' ? 'Pieces to request' : `Quantity to request (${issueRow.issueUnit})`}
                  </label>
                  <Input type="number" min="0" max={remaining} className="mt-1" value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)} />
                  {derived && <span className="text-[11px] text-slate-500">{n} pieces{derived}</span>}
                  {n > remaining && <span className="block text-[11px] text-red-500">Cannot exceed {remaining}</span>}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueRow(null)}>Cancel</Button>
            <Button disabled={issueMut.isPending || !(Number(issueQty) > 0) || Number(issueQty) > ((issueRow?.issueTotal || 0) - (issueRow?.requestedQty || 0))}
              onClick={() => issueMut.mutate({ demandKey: issueRow.demandKey, requestQuantity: Number(issueQty) })}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return — Excess or Defect back to Store (existing returnMaterialToStore
          / confirmReturn; Defect → DefectiveInventory, Excess → stock, and
          issuedQuantity self-corrects). Sheet metal needs a measured leftover. */}
      <Dialog open={!!returnRow} onOpenChange={(o) => !o && setReturnRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Return — {returnRow?.name}</DialogTitle></DialogHeader>
          {returnRow && (() => {
            const maxRet = (returnRow.issuedQty || 0) - (returnRow.returnPendingQty || 0);
            const isSheet = returnRow.category === 'Sheet Metal';
            return (
              <div className="space-y-3 py-1">
                <div className="flex justify-between text-xs text-slate-500 border-b border-slate-200 pb-1">
                  <span className="font-semibold">On the floor (returnable)</span>
                  <span className="font-bold text-amber-700">{maxRet} {returnRow.issueUnit}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Quantity</label>
                    <Input type="number" min="0" max={maxRet} className="mt-1" value={returnForm.qty}
                      onChange={(e) => setReturnForm(f => ({ ...f, qty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Type</label>
                    <select className="mt-1 w-full border border-slate-200 rounded-md px-2 py-2 text-sm"
                      value={returnForm.type} onChange={(e) => setReturnForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="Excess">Excess</option>
                      <option value="Defect">Defect</option>
                    </select>
                  </div>
                </div>
                {isSheet && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Leftover length (mm)</label>
                      <Input type="number" min="0" className="mt-1" value={returnForm.lenValue}
                        onChange={(e) => setReturnForm(f => ({ ...f, lenValue: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Leftover width (mm)</label>
                      <Input type="number" min="0" className="mt-1" value={returnForm.widValue}
                        onChange={(e) => setReturnForm(f => ({ ...f, widValue: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500">Reason</label>
                  <Input className="mt-1" value={returnForm.reason}
                    onChange={(e) => setReturnForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnRow(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={returnMut.isPending || !(Number(returnForm.qty) > 0)
                || Number(returnForm.qty) > ((returnRow?.issuedQty || 0) - (returnRow?.returnPendingQty || 0))
                || (returnRow?.category === 'Sheet Metal' && !(Number(returnForm.lenValue) > 0 && Number(returnForm.widValue) > 0))}
              onClick={submitReturn}>
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared inline preview — image, PDF (either a static design file or a
          blob: URL for the BOM PDF), or an "Open File" fallback link. Mirrors
          Design Approval's own preview exactly. */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{previewFile?.name}</DialogTitle></DialogHeader>
          {previewFile && (
            <div className="flex items-center justify-center bg-slate-50 rounded-lg p-2">
              {IMAGE_EXTS.includes(fileExt(previewFile.fileUrl)) ? (
                <img src={previewFile.fileUrl} alt={previewFile.name} className="max-w-full max-h-[65vh] object-contain" />
              ) : fileExt(previewFile.fileUrl) === 'pdf' || previewFile.fileUrl.startsWith('blob:') ? (
                <iframe src={previewFile.fileUrl} title={previewFile.name} className="w-full h-[65vh] border-0" />
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500 mb-3">Preview isn't available for this file type.</p>
                  <a href={previewFile.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    Open File
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
