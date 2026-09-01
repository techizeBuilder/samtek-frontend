import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProduction, useProductionOrdersList, computeOrderProgress } from '@/contexts/ProductionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { UNIT_TYPES, getUnitsForType } from '@/utils/unitTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
  ClipboardList, Plus, CheckCircle, AlertTriangle, Clock, Package,
  ChevronRight, FileCheck, Wrench, Send, Search, Filter, FileText, ExternalLink, ShoppingCart, ArrowDownToLine, Eye, Layers, Pencil, CalendarClock
} from 'lucide-react';
import { useProduction as useProd } from '@/contexts/ProductionContext';
import { apiRequest } from '@/lib/queryClient';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { config } from '@/config/environment';
import { formatCatalogFieldValue, formatBomDimensions } from '@/utils/bomFieldFormat';
import FabricationVariantAmountFields from '@/components/inventory/FabricationVariantAmountFields';
import UnitAmountField, { rowNeedsAmount as sharedRowNeedsAmount } from '@/components/inventory/UnitAmountField';
import { useAuth } from '@/hooks/useAuth';
import { LENGTH_UNITS } from '@/lib/fabricationDims';

// Department-Head-only gate for Issue Material + Receive — mirrors
// ProductionExpenses.jsx's own HEAD_ROLES/canManage pattern exactly.
const HEAD_ROLES = ['Production Head', 'Superadmin', 'Super Admin'];

const statusColor = {
  'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'BOM Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-red-100 text-red-700 border-red-200',
};

const priorityColor = {
  'Urgent': 'bg-red-100 text-red-700 border-red-200',
  'Normal': 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcon = {
  'Pending': <Clock className="h-3.5 w-3.5" />,
  'BOM Pending': <AlertTriangle className="h-3.5 w-3.5" />,
  'In Progress': <ChevronRight className="h-3.5 w-3.5" />,
  'Completed': <CheckCircle className="h-3.5 w-3.5" />,
};

// Material List's "Availability" column — live per-row check computed
// server-side (productionMfgController.js's computeLiveMaterialAvailability),
// only present for a row currently sitting on an outstanding quantity (never
// issued, or freshly re-Requested after an Adjust Qty approval — see that
// function's own comment for exactly which demand states qualify). A row
// with no availability entry (already In Transit/Issued/Pending R&D/etc.)
// renders nothing here — the question is moot once Store's already acted.
function AvailabilityCell({ availability }) {
  if (!availability) return <span className="text-slate-300">—</span>;
  const { state, availableQty } = availability;

  if (state === 'available') {
    return (
      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
        <CheckCircle className="h-3 w-3" /> In Stock ({availableQty})
      </span>
    );
  }
  if (state === 'short_eta') {
    const eta = availability.expectedDeliveryDate ? new Date(availability.expectedDeliveryDate) : null;
    return (
      <span className="flex items-center gap-1 text-blue-700 font-semibold" title={availability.purchaseRequestId ? `Purchase Request: ${availability.purchaseRequestId}` : ''}>
        <CalendarClock className="h-3 w-3 flex-shrink-0" />
        {eta ? <>Available by {eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {eta.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</> : 'Vendor selected, ETA pending'}
      </span>
    );
  }
  if (state === 'short_pr_pending') {
    return (
      <span className="flex items-center gap-1 text-amber-700 font-semibold" title={availability.purchaseRequestId ? `Purchase Request: ${availability.purchaseRequestId}` : ''}>
        <Clock className="h-3 w-3" /> Purchase in progress ({availableQty} in stock)
      </span>
    );
  }
  if (state === 'short_no_pr') {
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold">
        <AlertTriangle className="h-3 w-3" /> Short ({availableQty} in stock)
      </span>
    );
  }
  return <span className="text-slate-300">—</span>;
}

const emptyOrder = { machineCode: '', machineName: '', priority: 'Normal', deliveryDate: '', source: 'Stock' };
// Fabrication Master materials only (fabricationRef set) — same shape as
// BOMCreationTab.jsx's emptyFabricationFields, since FabricationVariantAmountFields
// is shared between the two. targetDemandCode: when set, this dialog is
// adjusting ONE EXACT existing demand line's quantity (opened via that row's
// own "Adjust Qty" action) rather than creating/matching a new one — see
// productionMfgController.js's addMaterialDemand.
const emptyDemand = {
  materialCode: '', materialName: '', quantity: '', unitType: '', unit: '',
  fabricationRef: null, fabricationCategory: '', fabricationDensity: null, weightUnitPrice: 0,
  dimensionVariants: [], dimensionVariantId: '', amountValue: '', amountUnit: '',
  targetDemandCode: null,
};

export default function OrderManagement() {
  const {
    addOrder, verifyBOM, verifyDesign, raiseRDRequest,
    decideRework, decideRepair,
    addMaterialDemand, updateMaterialStatus, markMaterialIssued,
  } = useProduction();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('production', 'orders', 'add');
  const canEdit = hasFeatureAccess('production', 'orders', 'edit');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [page, setPage] = useState(1);

  // Any filter change jumps back to page 1, same as SuperAdminOrders.jsx.
  const changeSearch = (value) => { setSearch(value); setPage(1); };
  const changeStatus = (value) => { setFilterStatus(value); setPage(1); };
  const changeSource = (value) => { setFilterSource(value); setPage(1); };

  const { data: ordersListData, isLoading: ordersLoading } = useProductionOrdersList({
    page,
    limit: 20,
    search,
    status: filterStatus === 'All' ? 'all' : filterStatus,
    source: filterSource === 'Store Orders' ? 'Store' : filterSource === 'Rejected Items' ? 'QC_Rejected' : 'all',
  });

  const orders = ordersListData?.data?.orders || [];
  const pagination = ordersListData?.data?.pagination || {};
  const summary = ordersListData?.data?.summary || {};

  const [addOpen, setAddOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [demandOpen, setDemandOpen] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [demandForm, setDemandForm] = useState(emptyDemand);
  const [foundItem, setFoundItem] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueRow, setIssueRow] = useState(null);
  const [issueQty, setIssueQty] = useState('');

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnRow, setReturnRow] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('Excess');
  // Sheet Metal plan-driven returns only (returnRow.sheetMetalPlanId set) —
  // the actual measured leftover area after cutting, entered by Production
  // itself rather than guessed by Store beforehand. See
  // productionMfgController.js's returnMaterialToStore.
  const [returnLeftoverLengthValue, setReturnLeftoverLengthValue] = useState('');
  const [returnLeftoverLengthUnit, setReturnLeftoverLengthUnit] = useState('Millimeter');
  const [returnLeftoverWidthValue, setReturnLeftoverWidthValue] = useState('');
  const [returnLeftoverWidthUnit, setReturnLeftoverWidthUnit] = useState('Millimeter');

  // R&D BOM lookup (by machine code) — powers the "View" eye button on each material
  // demand row, so Production can see the full BOM entry (hierarchy, material type,
  // Product Master snapshot, specs, custom fields) without leaving this page.
  const [bomView, setBomView] = useState({ loading: false, bom: null, forCode: null });
  const [viewMat, setViewMat] = useState(null);

  const { user } = useAuth();
  const isDeptHead = HEAD_ROLES.includes(user?.role);

  // Material List — computed live from the locked BOM, no R&D request
  // needed for standard materials (see productionMfgController.js's
  // getMaterialList/issueMaterialToStore). Refetched whenever the order
  // detail dialog opens/changes, same pattern as bomView above.
  const [materialList, setMaterialList] = useState({ loading: false, rows: [], forOrderId: null });
  const [issuingKey, setIssuingKey] = useState(null);
  const refetchMaterialList = (orderId) => {
    if (!orderId) return;
    setMaterialList(v => ({ ...v, loading: true }));
    apiRequest('GET', `/api/production-mfg/orders/${orderId}/material-list`)
      .then(res => setMaterialList({ loading: false, rows: res?.data || [], forOrderId: orderId }))
      .catch(() => setMaterialList({ loading: false, rows: [], forOrderId: orderId }));
  };
  useEffect(() => {
    if (!detailOrder) { setMaterialList({ loading: false, rows: [], forOrderId: null }); return; }
    refetchMaterialList(detailOrder._id || detailOrder.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOrder]);

  // Sends a fresh materialDemands entry straight to Store — distinct from
  // the pre-existing (confusingly named) handleIssueMaterial below, which is
  // actually the Receive-from-Store confirm handler.
  const handleIssueToStore = async (row) => {
    const orderId = detailOrderLive?._id || detailOrderLive?.id;
    setIssuingKey(row.key);
    try {
      await apiRequest('POST', `/api/production-mfg/orders/${orderId}/materials/issue`, { groupKey: row.key });
      showSuccessToast('Material Issued', `${row.name} sent to Store's Pending Transfers.`);
      refetchMaterialList(orderId);
      queryClient.invalidateQueries({ queryKey: ['production-mfg-orders'] });
    } catch (error) {
      showSmartToast(error, 'Issue Material Failed');
    } finally {
      setIssuingKey(null);
    }
  };

  // Dynamic unit types (same source BOM Management/Product Master/Inventory use) for the
  // Add Material Demand form's Unit Type/Unit pair.
  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });
  const unitTypesList = React.useMemo(() => {
    if (unitTypesData?.unitTypes) return unitTypesData.unitTypes.map(ut => ut.name);
    return UNIT_TYPES;
  }, [unitTypesData]);

  // Fabrication Master's category field definitions — same source
  // BOMCreationTab.jsx uses, reused as-is for out-of-BOM material demands
  // of a fabrication-linked item (see FabricationVariantAmountFields).
  const { data: fabricationCategoriesResponse } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = fabricationCategoriesResponse?.data || [];

  // BOM Format & Modification (R&D-configured) — drives both the "Bill of
  // Materials by Part" section's extra columns and the View Material dialog,
  // same as BOM Management, so Production always sees the same fields R&D
  // chose to surface.
  const { data: bomFieldConfigResponse } = useQuery({
    queryKey: ['rd-bom-field-config'],
    queryFn: () => apiRequest('GET', '/api/rd/bom-field-config'),
  });
  const enabledBOMFields = bomFieldConfigResponse?.data?.enabledFields || [];
  const bomFieldCatalog = bomFieldConfigResponse?.data?.catalog || [];
  const extraViewFields = bomFieldCatalog.filter(f => enabledBOMFields.includes(f.key) && !['code', 'name', 'unit'].includes(f.key));
  const getUnitsForTypeDynamic = (unitTypeName, currentUnit) => {
    if (!unitTypeName) return [];
    if (unitTypesData?.unitTypes) {
      const found = unitTypesData.unitTypes.find(ut => ut.name === unitTypeName);
      if (found) {
        const units = found.units || [];
        return currentUnit && !units.includes(currentUnit) ? [currentUnit, ...units] : units;
      }
    }
    return getUnitsForType(unitTypeName, currentUnit);
  };
  const getUnitTypeForUnitDynamic = (unitName) => {
    if (!unitName) return '';
    if (unitTypesData?.unitTypes) {
      const found = unitTypesData.unitTypes.find(ut => ut.units?.includes(unitName));
      if (found) return found.name;
    }
    return '';
  };

  // ── NEW HANDLER ──
  const handleIssueMaterial = async () => {
    if (!issueRow || !issueQty || Number(issueQty) <= 0 || Number(issueQty) > issueRow.remainingQty) return;
    try {
      const orderId = detailOrderLive?._id || detailOrderLive?.id;
      // Hitting the updated specific API route
      await apiRequest('PUT', `/api/production-mfg/orders/${orderId}/mark-material-issued`, {
        materialCode: issueRow.materialCode,
        receivedQuantity: Number(issueQty)
      });

      queryClient.invalidateQueries({ queryKey: ['production-mfg-orders'] });
      refetchMaterialList(orderId);
      showSuccessToast('Material Received', `Successfully received ${issueQty} ${issueRow.unit}.`);
      setIssueModalOpen(false);
      setIssueRow(null);
      setIssueQty('');
    } catch (error) {
      showSmartToast(error, 'Receive Material Failed');
    }
  };

  // A "flat piece" demand (fabricationCategory set, no specific per-cut
  // bomDimensions — Store shipped whole catalog pieces, Production does the
  // actual cutting on the floor) is the only kind that needs a measured
  // leftover on return; a demand with a specific bomDimensions cut was
  // already cut to size by Store, so any unused whole pieces returned are
  // already exactly that size — nothing to measure. Same "flat pieces"
  // signature this session already uses for routing elsewhere.
  const returnDemandCategoryInfo = (row) => {
    const isFlatPieceDemand = !!row?.fabricationCategory && (!row.bomDimensions || Object.keys(row.bomDimensions).length === 0);
    const isSheet = fabricationCategories.find(c => c.key === row?.fabricationCategory)?.calcType === 'sheet';
    return { isFlatPieceDemand, isSheet };
  };

  const handleReturnMaterial = async () => {
    if (!returnRow || !returnQty || Number(returnQty) <= 0 || Number(returnQty) > returnRow.issuedQuantity) return;
    const { isFlatPieceDemand, isSheet } = returnDemandCategoryInfo(returnRow);
    if (isFlatPieceDemand && !(Number(returnLeftoverLengthValue) > 0 && (!isSheet || Number(returnLeftoverWidthValue) > 0))) return;
    try {
      const orderId = detailOrderLive?._id || detailOrderLive?.id;
      await apiRequest('POST', `/api/production-mfg/orders/${orderId}/materials/return`, {
        materialCode: returnRow.materialCode,
        returnQuantity: Number(returnQty),
        reason: returnReason,
        returnType,
        ...(isFlatPieceDemand ? {
          leftoverLengthValue: Number(returnLeftoverLengthValue),
          leftoverLengthUnit: returnLeftoverLengthUnit,
          ...(isSheet ? {
            leftoverWidthValue: Number(returnLeftoverWidthValue),
            leftoverWidthUnit: returnLeftoverWidthUnit,
          } : {}),
        } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ['production-mfg-orders'] });
      refetchMaterialList(orderId);
      showSuccessToast('Return Requested', `Return request for ${returnQty} ${returnRow.unit} submitted.`);
      setReturnModalOpen(false);
      setReturnRow(null);
      setReturnQty('');
      setReturnReason('');
      setReturnType('Excess');
      setReturnLeftoverLengthValue('');
      setReturnLeftoverLengthUnit('Millimeter');
      setReturnLeftoverWidthValue('');
      setReturnLeftoverWidthUnit('Millimeter');
    } catch (error) {
      showSmartToast(error, 'Return Material Failed');
    }
  };

  const handleDownloadPDF = async () => {
    const orderId = detailOrderLive?._id || detailOrderLive?.id;
    if (!orderId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/production-mfg/production-orders/${orderId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MaterialList-${detailOrderLive?.orderId || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showSmartToast(error, 'Download Failed');
    }
  };

  const statuses = ['All', 'Pending', 'BOM Pending', 'In Progress', 'On Hold', 'Completed'];
  const sources = ['All', 'Store Orders', 'Rejected Items'];

  // Real sales-order id (ORD-xxx) that this production belongs to:
  //  - orderCode        → set server-side from the linked Order at creation
  //                       (Store-triggered and QC_Rejected rebuilds both resolve it)
  //  - older records without orderCode fall back to the legacy fields so
  //    nothing already in the DB goes blank
  //  - Stock production → no sales order (company stock)
  const getRealOrderId = (o) => {
    if (o.orderCode) return o.orderCode;
    if (o.source === 'QC_Rejected') return o.rejectionDetails?.originalOrderId || o.machineCode || null;
    if (!o.source || o.source === 'Store') return o.machineCode || null;
    return null; // 'Stock'
  };

  // Search/status/source filtering and the stat counts below now happen
  // server-side (see useProductionOrdersList) — `orders` is already the
  // current page of the filtered result set.
  const filtered = orders;
  const stats = summary;

  const handleAddOrder = () => {
    if (!form.machineCode || !form.machineName || !form.deliveryDate) return;
    addOrder(form);
    setForm(emptyOrder);
    setAddOpen(false);
  };

  const handleCodeChange = async (codeVal) => {
    setDemandForm(prev => ({ ...prev, materialCode: codeVal }));

    if (!codeVal.trim()) {
      setFoundItem(null);
      return;
    }

    try {
      const res = await apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(codeVal.trim())}`);
      if (res.success && res.data) {
        setFoundItem(res.data);
        // Deliberately the item's stock/storage unit ("unit"/"unitType"), not its
        // Purchase Unit ("purchaseUnit"/"purchaseUnitType") — Production draws from
        // stock, so the demand quantity must be expressed in the stock unit.
        // Fabrication Master materials (res.data.fabricationRef set) also need
        // their category/density/variants carried onto the form for the
        // variant picker + amount inputs + live preview — see
        // FabricationVariantAmountFields.
        const variants = (res.data.dimensionVariants || []).filter(v => !v.isLeftover);
        const dv = variants[0];
        setDemandForm(prev => ({
          ...prev,
          materialName: res.data.name,
          unitType: res.data.unitType || getUnitTypeForUnitDynamic(res.data.unit) || prev.unitType,
          unit: res.data.unit || prev.unit,
          fabricationRef: res.data.fabricationRef || null,
          fabricationCategory: dv?.category || '',
          fabricationDensity: dv ? { value: dv.densityValue, unit: dv.densityUnit } : null,
          weightUnitPrice: res.data.weightUnitPrice || 0,
          dimensionVariants: variants,
          dimensionVariantId: variants.length === 1 ? variants[0]._id : '',
          amountValue: '',
          amountUnit: '',
        }));
      } else {
        setFoundItem(null);
      }
    } catch (err) {
      setFoundItem(null);
    }
  };

  // A non-fabrication material whose matched Item's Used Unit is Length/
  // Area/Volume needs the same amountValue split as fabrication (see
  // UnitAmountField) — a flat quantity can't say "2 pieces of 1m each".
  const rowNeedsAmount = (row) => sharedRowNeedsAmount(row, getUnitTypeForUnitDynamic);

  // The "Quantity" the user types for one of these rows is a PIECE count
  // ("2 pieces of 1m each"), but the demand's saved `quantity` must be the
  // TOTAL amount in the item's own stocking unit — Store/Production only
  // ever transact in that total (see UnitAmountField.jsx and
  // inventoryController.js's transferMaterialToProduction). No-op in adjust
  // mode (demandForm.fabricationRef is the 'existing' placeholder there, so
  // rowNeedsAmount is already false) — an adjustment's quantity is entered
  // directly as the new total, not re-split into pieces.
  const resolveSubmitQuantity = (row) => rowNeedsAmount(row)
    ? Number(row.quantity) * Number(row.amountValue)
    : Number(row.quantity);

  // Fabrication materials must have a chosen dimension size and a valid
  // consumed amount+unit before submitting — otherwise the weight (and
  // price) is unresolved server-side too. Non-fabrication Length/Area/Volume
  // materials need just the amount (no dimension size to pick). No-op for
  // adjust-mode or a plain Count/Mass material.
  const fabricationDimsFilled = () => {
    if (demandForm.targetDemandCode) return true;
    if (demandForm.fabricationRef) {
      return !!demandForm.dimensionVariantId && !!demandForm.amountUnit && Number(demandForm.amountValue) > 0;
    }
    if (rowNeedsAmount(demandForm)) {
      return !!demandForm.amountUnit && Number(demandForm.amountValue) > 0;
    }
    return true;
  };

  const handleAddDemand = async () => {
    if (!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity || !demandForm.unit || !fabricationDimsFilled()) return;
    try {
      await addMaterialDemand(detailOrder._id || detailOrder.id, {
        ...demandForm,
        quantity: resolveSubmitQuantity(demandForm)
      });
      refetchMaterialList(detailOrder._id || detailOrder.id);
      showSuccessToast('Sent to R&D', `Extra material demand for "${demandForm.materialName}" is pending R&D approval.`);
      setDemandForm(emptyDemand);
      setFoundItem(null);
      setDemandOpen(false);
    } catch (error) {
      console.error('Failed to add material demand:', error);
      showSmartToast(error, 'Add Material Demand');
    }
  };

  // Opens the same Add Demand dialog, pre-filled and locked to ONE EXACT
  // existing fabrication demand line — only Quantity is editable. Avoids
  // asking Production to re-type dimensions to "match" an existing cut
  // (a single typo there would silently create a duplicate line instead of
  // adjusting the right one — see productionMfgController.js's
  // addMaterialDemand comment on targetDemandCode).
  const openAdjustDemand = (m) => {
    setFoundItem(null);
    setDemandForm({
      materialCode: m.sourceItemCode || m.materialCode,
      materialName: m.materialName,
      quantity: String(m.quantity),
      unitType: getUnitTypeForUnitDynamic(m.unit) || '',
      unit: m.unit,
      fabricationRef: 'existing', // truthy placeholder — real ref not needed in adjust mode, only used to show the dimensions block
      fabricationCategory: m.fabricationCategory || '',
      fabricationDensity: null,
      weightUnitPrice: 0,
      bomDimensions: m.bomDimensions || {},
      targetDemandCode: m.materialCode,
    });
    setDemandOpen(true);
  };

  // Keep detailOrder in sync with updated orders state
  const detailOrderLive = detailOrder ? orders.find(o => String(o._id || o.id) === String(detailOrder._id || detailOrder.id)) : null;

  // Fetch the R&D BOM for this order's machine every time the detail dialog is
  // opened, so the "View" eye button and the "Bill of Materials by Part" section
  // reflect the machine's current BOM. Keyed on `detailOrder` (the object set by
  // clicking a row) rather than just the machine code — using the code alone used
  // to cache the result forever for that machine, so once you'd opened any order
  // for a machine, reopening the SAME or a different order for that machine later
  // (e.g. right after R&D approved a new/changed BOM) kept showing the old
  // snapshot — including a permanent "No BOM found" if the BOM hadn't been
  // created yet the first time it was fetched.
  useEffect(() => {
    if (!detailOrder) { setBomView({ loading: false, bom: null, forCode: null }); return; }
    const code = detailOrder.machineCode;
    if (!code) return;
    setBomView({ loading: true, bom: null, forCode: code });
    apiRequest('GET', `/api/rd/boms/by-code/${encodeURIComponent(code)}`)
      .then(res => setBomView({ loading: false, bom: res?.data?.bom || null, forCode: code }))
      .catch(() => setBomView({ loading: false, bom: null, forCode: code }));
  }, [detailOrder]);

  // Deterministic signature for a dimensions object, matching the backend's
  // dimensionSignature() (services/fabricationDemandService.js) so cuts can
  // be compared regardless of key order.
  const dimensionSignature = (dims) => Object.entries(dims || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');

  // A fabrication BOM can reuse the same raw Item code across multiple
  // distinct cuts (different bomDimensions) — matching by code alone would
  // always resolve to the first cut in the array, showing the wrong entry
  // for every other cut of that same material. Disambiguate by dimension
  // signature whenever the demand row is a fabrication one.
  const openMaterialView = (demand) => {
    const code = demand.sourceItemCode || demand.materialCode;
    const candidates = (bomView.bom?.materials || []).filter(mm => (mm.code || '').toLowerCase() === (code || '').toLowerCase());
    let bomMat = candidates[0];
    if (demand.fabricationCategory && candidates.length > 1) {
      const wantedSig = dimensionSignature(demand.bomDimensions);
      bomMat = candidates.find(mm => dimensionSignature(mm.bomDimensions) === wantedSig) || candidates[0];
    }
    setViewMat(bomMat ? { found: true, ...bomMat } : { found: false, code });
  };

  // Groups the BOM's materials by Child Part -> Sub Child Part, straight from
  // R&D's BOM (independent of the flat Material Demand transaction list) —
  // shows Production what's actually needed to build each part, not just
  // what's been requested/issued so far.
  const bomMaterialGroups = React.useMemo(() => {
    const materials = bomView.bom?.materials || [];
    const groups = new Map();
    for (const mat of materials) {
      const cpKey = mat.childPartCode || mat.childPart || '__none__';
      if (!groups.has(cpKey)) {
        groups.set(cpKey, { childPart: mat.childPart || 'Uncategorized', childPartCode: mat.childPartCode || '', subGroups: new Map() });
      }
      const cpGroup = groups.get(cpKey);
      const scKey = mat.subChildPartCode || mat.subChildPart || '__none__';
      if (!cpGroup.subGroups.has(scKey)) {
        cpGroup.subGroups.set(scKey, { subChildPart: mat.subChildPart || 'Uncategorized', subChildPartCode: mat.subChildPartCode || '', materials: [] });
      }
      cpGroup.subGroups.get(scKey).materials.push(mat);
    }
    return Array.from(groups.values()).map(g => ({ ...g, subGroups: Array.from(g.subGroups.values()) }));
  }, [bomView.bom]);

  const handleRaiseRDRequest = async (id) => {
    try {
      await raiseRDRequest(id);
      showSuccessToast('R&D Request Raised', 'The request has been sent to the R&D team.');
    } catch (error) {
      showSmartToast(error, 'Failed to raise R&D request');
    }
  };

  const handleVerifyBOM = async (id) => {
    try {
      await verifyBOM(id);
      showSuccessToast('BOM Verified', 'The Bill of Materials has been verified.');
    } catch (error) {
      showSmartToast(error, 'Failed to verify BOM');
    }
  };

  const handleVerifyDesign = async (id) => {
    try {
      await verifyDesign(id);
      showSuccessToast('Design Verified', 'The machine design has been verified.');
    } catch (error) {
      showSmartToast(error, 'Failed to verify design');
    }
  };

  const handleDecideRework = async (id) => {
    try {
      await decideRework(id);
      showSuccessToast('Sent for Rework', 'This item will be rebuilt from scratch, same as a new production order.');
    } catch (error) {
      showSmartToast(error, 'Failed to send for rework');
    }
  };

  const handleDecideRepair = async (id) => {
    try {
      await decideRepair(id);
      showSuccessToast('Sent for Repair', 'Track this item in the Repair Production module.');
    } catch (error) {
      showSmartToast(error, 'Failed to send for repair');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> Order Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Machine manufacturing orders — triggered by Store notification</p>
        </div>
        {canAdd && (
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> New Order
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
          { label: 'Store Orders', value: stats.storeOrders, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rejected Orders', value: stats.rejectedOrders, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending', value: stats.pending, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'BOM Pending', value: stats.bomPending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'On Hold', value: stats.onHold, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={`border-none shadow-sm ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by Order ID or Machine..." className="pl-9" value={search} onChange={e => changeSearch(e.target.value)} />
          </div>

          {/* Source Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center">Source:</span>
              {sources.map(s => (
                <button
                  key={s}
                  onClick={() => changeSource(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterSource === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                >{s}</button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center">Status:</span>
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BOM / Design</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading orders...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No orders found.</td></tr>
                ) : filtered.map(order => {
                  const oid = order._id || order.id;
                  const progress = computeOrderProgress(order);
                  const isOverdue = order.deliveryDate && order.status !== 'Completed' && new Date(order.deliveryDate) < new Date();
                  const isRejected = order.source === 'QC_Rejected';

                  return (
                    <tr key={oid} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isRejected ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {(() => {
                          const realOrderId = getRealOrderId(order);
                          return realOrderId ? (
                            <>
                              {/* Real sales order id — batata hai kis order ka item ban raha hai */}
                              <span className="font-bold text-blue-700">{realOrderId}</span>
                              {/* Production id — chhota, sirf reference ke liye */}
                              <span className="block text-[10px] text-slate-400 mt-0.5">{order.orderId || order.id}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-blue-700">{order.orderId || order.id}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Stock Production</span>
                            </>
                          );
                        })()}
                        {isRejected && <span className="block text-red-600 text-xs">REJECTED</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${isRejected
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                          {isRejected ? 'QC Rejected' : 'Store Order'}
                        </span>
                        {/* Purpose badge */}
                        <span className={`mt-1 flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border w-fit ${order.source === 'Stock'
                            ? 'bg-violet-100 text-violet-700 border-violet-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                          {order.source === 'Stock' ? '🏭 Stock' : '📦 Order'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          {order.machineName}
                          {(order.orderQuantity || 1) > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">×{order.orderQuantity}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{order.machineCode}</div>
                        {isRejected && order.rejectionDetails?.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">Reason: {order.rejectionDetails.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[order.priority]}`}>
                          {order.priority === 'Urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[order.status]}`}>
                          {statusIcon[order.status]} {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${order.bomVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            BOM {order.bomVerified ? '✓' : '✗'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${order.designVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            Design {order.designVerified ? '✓' : '✗'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 font-semibold">{progress}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {order.deliveryDate}
                        {isOverdue && <span className="block text-red-500">Overdue</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDetailOrder(order)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrderLive} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailOrderLive && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  {getRealOrderId(detailOrderLive) || detailOrderLive.orderId || detailOrderLive.id} — {detailOrderLive.machineName}
                  {getRealOrderId(detailOrderLive) && (
                    <span className="text-xs font-normal text-slate-400 font-mono">({detailOrderLive.orderId || detailOrderLive.id})</span>
                  )}
                  {detailOrderLive.source === 'QC_Rejected' && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                      QC REJECTED
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Rejection Details (if applicable) */}
                {detailOrderLive.source === 'QC_Rejected' && detailOrderLive.rejectionDetails && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> QC Rejection Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-red-600 mb-1">Original Order ID</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.originalOrderId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 mb-1">Rejected Date</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.rejectedDate || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.rejectionReason || 'No reason provided'}</p>
                      </div>
                      {detailOrderLive.rejectionDetails.qcJobId && (
                        <div className="col-span-2">
                          <p className="text-xs text-red-600 mb-1">QC Job ID</p>
                          <p className="font-mono text-red-800 text-xs">{detailOrderLive.rejectionDetails.qcJobId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Info */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-blue-500 mb-1">Quantity</p>
                    <p className="font-bold text-blue-800 text-base">{detailOrderLive.orderQuantity || 1} unit{(detailOrderLive.orderQuantity || 1) > 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Priority</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[detailOrderLive.priority]}`}>{detailOrderLive.priority}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Received</p>
                    <p className="font-semibold text-slate-800">{detailOrderLive.receivedDate}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Delivery Date</p>
                    <p className="font-semibold text-slate-800">{detailOrderLive.deliveryDate}</p>
                  </div>
                </div>

                {/* BOM & Design Verification — hidden for a QC-rejected order
                    until "Rework" is chosen below (Repair skips this pipeline
                    entirely, so it never needs BOM/Design verification). */}
                {(detailOrderLive.source !== 'QC_Rejected' || detailOrderLive.reworkDecision === 'Rework') && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileCheck className="h-4 w-4" /> Design & BOM Verification</h3>
                    <div className="flex gap-3 flex-wrap">
                      <div className={`flex-1 p-3 rounded-lg border text-sm ${detailOrderLive.bomVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{detailOrderLive.bomVerified ? '✓ BOM Verified' : '✗ BOM Not Verified'}</span>
                        </div>
                      </div>
                      <div className={`flex-1 p-3 rounded-lg border text-sm ${detailOrderLive.designVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{detailOrderLive.designVerified ? '✓ Design Verified' : '✗ Design Not Verified'}</span>
                        </div>
                      </div>
                    </div>
                    {(!detailOrderLive.bomVerified || !detailOrderLive.designVerified) && !detailOrderLive.rdRequestRaised && (
                      <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs" onClick={() => handleRaiseRDRequest(detailOrderLive._id || detailOrderLive.id)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Raise R&D Request
                      </Button>
                    )}
                    {detailOrderLive.rdRequestRaised && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> R&D request raised — awaiting design & BOM from R&D team</p>
                    )}
                  </div>
                )}

                {/* Rework / Repair decision — only for a QC-rejected order still awaiting a choice */}
                {detailOrderLive.source === 'QC_Rejected' && detailOrderLive.reworkDecision === 'Pending' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5"><Wrench className="h-4 w-4" /> Rework or Repair?</h3>
                    <p className="text-xs text-slate-500 mb-3">Choose how to handle this rejected item before it proceeds.</p>
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleDecideRework(detailOrderLive._id || detailOrderLive.id)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Rework (rebuild from scratch)
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => handleDecideRepair(detailOrderLive._id || detailOrderLive.id)}>
                        <Wrench className="h-3.5 w-3.5 mr-1" /> Repair
                      </Button>
                    </div>
                  </div>
                )}
                {detailOrderLive.source === 'QC_Rejected' && detailOrderLive.reworkDecision === 'Repair' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700 flex items-center gap-1.5">
                    <Wrench className="h-4 w-4" /> Sent to Repair — status: {detailOrderLive.repair?.status || 'Pending'}. Track it in the Repair Production module.
                  </div>
                )}

                {/* Design Documents */}
                {detailOrderLive.designDocuments && detailOrderLive.designDocuments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Design Documents</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detailOrderLive.designDocuments.map(doc => {
                        // Support relative paths from backend using environment config
                        const url = doc.fileUrl.startsWith('http') ? doc.fileUrl : `${config.baseURL}${doc.fileUrl}`;
                        return (
                          <a key={doc._id || doc.id} href={url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3 group-hover:bg-blue-200 transition-colors">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                              <p className="text-[10px] text-slate-500">Version: {doc.version || 'v1.0'}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors ml-2 flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Material List — computed live from the locked BOM, no R&D
                    request needed for standard materials (see
                    productionMfgController.js's getMaterialList). A row
                    without a real demand yet shows "Not Issued" + Issue
                    Material; once issued it shows the real demand exactly
                    as before. */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Package className="h-4 w-4" /> Material List</h3>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-6 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200" variant="outline" onClick={handleDownloadPDF} title="Download Material Ledger PDF">
                        <ArrowDownToLine className="h-3 w-3 mr-1" /> Download PDF
                      </Button>
                      {canAdd && (
                        <Button size="sm" className="h-6 text-xs" variant="outline" onClick={() => {
                          setDemandForm(emptyDemand);
                          setFoundItem(null);
                          setDemandOpen(true);
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Demand
                        </Button>
                      )}
                    </div>
                  </div>
                  {materialList.loading ? (
                    <p className="text-xs text-slate-400 py-3 text-center">Loading material list…</p>
                  ) : materialList.rows.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No materials in this machine's BOM.</p>
                  ) : (
                    <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Code</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Material</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Qty</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Availability</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialList.rows.map(row => {
                          const m = row.demand;
                          // Radix HoverCard, not the hand-rolled group/group-hover CSS
                          // popover this used before — that version was clipped by this
                          // table's own overflow wrapper and had no viewport collision
                          // detection, so it could render mostly off-screen (showing as
                          // a bare sliver) depending on where the row fell on the page.
                          // Same fix as Store Orders' Available/Needs Purchase badges.
                          const childPartsHover = row.childParts?.length > 0 && (
                            <HoverCard openDelay={100} closeDelay={150}>
                              <HoverCardTrigger asChild>
                                <span className="text-[9px] text-blue-500 underline decoration-dotted cursor-pointer ml-1">({row.childParts.length} part{row.childParts.length > 1 ? 's' : ''})</span>
                              </HoverCardTrigger>
                              <HoverCardContent
                                side="bottom"
                                align="start"
                                collisionPadding={12}
                                className="w-64 whitespace-normal break-words bg-slate-900 text-slate-100 text-xs p-3 rounded-lg shadow-xl border border-slate-800"
                              >
                                <div className="font-semibold text-slate-400 mb-1.5">Covers ({row.childParts.length}):</div>
                                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 dark-popover-scrollbar">
                                  {row.childParts.map((cp, idx) => (
                                    <div key={idx} className="leading-normal">
                                      <div className="font-medium text-slate-100">{cp.childPart}</div>
                                      {cp.subChildPart && <div className="text-slate-400 text-[10px]">{cp.subChildPart}</div>}
                                    </div>
                                  ))}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );

                          if (!m) {
                            // Not yet issued — lightweight row, live BOM data only.
                            return (
                              <tr key={row.key} className="border-t border-slate-50">
                                <td className="px-3 py-2 font-mono text-blue-700">{row.itemCode}</td>
                                <td className="px-3 py-2 font-medium text-slate-800">{row.name}{childPartsHover}</td>
                                <td className="px-3 py-2 text-slate-800 font-semibold">{row.neededQty} {row.unit}</td>
                                <td className="px-3 py-2">
                                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">Not Issued</span>
                                </td>
                                <td className="px-3 py-2"><AvailabilityCell availability={row.availability} /></td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openMaterialView({ sourceItemCode: row.itemCode, materialCode: row.itemCode })}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                      title="View full BOM entry from R&D"
                                    >
                                      <Eye className="h-3 w-3" /> View
                                    </button>
                                    {isDeptHead && (
                                      <button
                                        onClick={() => handleIssueToStore(row)}
                                        disabled={issuingKey === row.key}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
                                        title="Send request to Store to transfer this material"
                                      >
                                        <Send className="h-3 w-3" /> {issuingKey === row.key ? 'Issuing…' : 'Issue Material'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const issued = m.issuedQuantity || 0;
                          const remaining = m.quantity - issued;

                          return (
                            <tr key={m._id || m.id} className="border-t border-slate-50">
                              <td className="px-3 py-2 font-mono text-blue-700">{m.sourceItemCode || m.materialCode}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {m.materialName}{childPartsHover}
                                {(m.fabricationCategory || m.amountValue != null) && (
                                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                                    {m.amountValue != null && m.amountUnit
                                      ? m.fabricationCategory
                                        ? <>{m.amountValue} {m.amountUnit} × {m.quantity}</>
                                        // Non-fabrication: m.quantity is already the resolved
                                        // TOTAL (see UnitAmountField.jsx), not a piece count —
                                        // the piece count only exists as this derived display.
                                        : <>{m.amountValue} {m.amountUnit} × {Math.round((m.quantity / m.amountValue) * 1000) / 1000} pcs</>
                                      : <>Cut: {Object.entries(m.bomDimensions || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ') || '—'}</>}
                                    {m.computedWeightPerPieceKg != null && <> · {m.computedWeightPerPieceKg.toFixed(2)} kg/pc</>}
                                  </div>
                                )}
                                {m.issuedToName && <div className="text-[10px] font-normal text-slate-400 mt-0.5">Issued to: {m.issuedToName}</div>}
                              </td>

                              <td className="px-3 py-2">
                                {m.bomQuantity !== null && m.bomQuantity !== undefined ? (
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                                      Req: {m.quantity} {m.fabricationCategory ? 'pcs' : m.unit}
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">BOM</span>
                                    </span>
                                    <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                      Issued: {issued} / {m.quantity}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-purple-700 font-bold flex items-center gap-1.5">
                                      Req: {m.quantity} {m.fabricationCategory ? 'pcs' : m.unit}
                                      <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase font-bold border border-purple-200">Out of BOM</span>
                                    </span>
                                    <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                      Issued: {issued} / {m.quantity}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${m.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                                    m.status === 'Pending Purchase' ? 'bg-amber-100 text-amber-700' :
                                      m.status === 'Pending R&D' ? 'bg-orange-100 text-orange-700' :
                                        m.status === 'R&D Rejected' ? 'bg-red-100 text-red-700' :
                                          'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                              </td>

                              <td className="px-3 py-2"><AvailabilityCell availability={row.availability} /></td>

                              <td className="px-3 py-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openMaterialView(m)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    title="View full BOM entry from R&D"
                                  >
                                    <Eye className="h-3 w-3" /> View
                                  </button>
                                  {/* Only once fully Received — while a demand is still
                                      Requested/In Transit, Store already has (or is acting
                                      on) a transfer for the CURRENT quantity, so changing it
                                      here could silently mismatch what's physically been
                                      picked/moved against what the record now says. */}
                                  {m.fabricationCategory && m.status === 'Issued' && (
                                    <button
                                      onClick={() => openAdjustDemand(m)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                                      title="Request more or less of this exact cut"
                                    >
                                      <Pencil className="h-3 w-3" /> Adjust Qty
                                    </button>
                                  )}
                                  {isDeptHead && (m.status === 'Requested' || m.status === 'In Transit') && remaining > 0 && (
                                    <button
                                      onClick={() => {
                                        const inTransitQty = (m.transferredQuantity || 0) - (m.issuedQuantity || 0);
                                        setIssueRow({ materialCode: m.materialCode, sourceItemCode: m.sourceItemCode, bomDimensions: m.bomDimensions, materialName: m.materialName, remainingQty: inTransitQty > 0 ? inTransitQty : remaining, unit: m.unit, issuedToName: m.issuedToName });
                                        setIssueQty(inTransitQty > 0 ? inTransitQty : remaining); // Default to exactly what they need
                                        setIssueModalOpen(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                      title="Receive items internally from the Store shelf"
                                    >
                                      <ArrowDownToLine className="h-3 w-3" /> Receive
                                    </button>
                                  )}
                                  {m.status === 'Issued' && (
                                    <button
                                      onClick={() => {
                                        setReturnRow({ materialCode: m.materialCode, sourceItemCode: m.sourceItemCode, bomDimensions: m.bomDimensions, materialName: m.materialName, issuedQuantity: m.issuedQuantity, unit: m.unit, sheetMetalPlanId: m.sheetMetalPlanId || null, fabricationCategory: m.fabricationCategory || '', dimensionVariantId: m.dimensionVariantId || null });
                                        setReturnQty('');
                                        setReturnLeftoverAmount('');
                                        setReturnLeftoverUnit('');
                                        setReturnModalOpen(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                                      title="Return items to the Store"
                                    >
                                      <Package className="h-3 w-3" /> Return
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Bill of Materials by Part — read-only breakdown of which Child
                    Part / Sub Child Part each BOM material builds, straight from
                    R&D's BOM (already fetched above for the View button).
                    Independent of Material Demand: this shows what's needed to
                    build the machine, not what's been requested/issued so far. */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Layers className="h-4 w-4" /> Bill of Materials by Part</h3>
                  {bomView.loading ? (
                    <p className="text-xs text-slate-400 py-3 text-center">Loading BOM…</p>
                  ) : bomMaterialGroups.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No BOM found for this machine.</p>
                  ) : (
                    <div className="space-y-3">
                      {bomMaterialGroups.map((cp, cpIdx) => (
                        <div key={cpIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-50 px-3 py-2 flex items-center gap-2">
                            {cp.childPartCode && <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{cp.childPartCode}</span>}
                            <span className="text-xs font-bold text-slate-700">{cp.childPart}</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {cp.subGroups.map((sc, scIdx) => (
                              <div key={scIdx} className="px-3 py-2">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {sc.subChildPartCode && <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">{sc.subChildPartCode}</span>}
                                  <span className="text-xs font-semibold text-slate-600">{sc.subChildPart}</span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-t border-slate-50">
                                      <th className="py-1.5 pr-2 text-left text-slate-400 font-semibold w-20">Code</th>
                                      <th className="py-1.5 pr-2 text-left text-slate-400 font-semibold">Material</th>
                                      <th className="py-1.5 pr-2 text-left text-slate-400 font-semibold">Qty</th>
                                      <th className="py-1.5 text-right text-slate-400 font-semibold">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sc.materials.map(mat => (
                                      <tr key={mat._id} className="border-t border-slate-50">
                                        <td className="py-1.5 pr-2 font-mono text-blue-700 w-20">{mat.code}</td>
                                        <td className="py-1.5 pr-2 text-slate-800">
                                          {mat.item}
                                          {(mat.fabricationCategory || mat.amountValue != null) && (
                                            <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                                              {formatBomDimensions(mat)}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 pr-2 text-slate-500 whitespace-nowrap">
                                          {/* mat.quantity is a piece count for fabrication
                                              (matches its piece-based stock), or already the
                                              resolved TOTAL amount for a non-fabrication
                                              Amount x Pieces material (see UnitAmountField.jsx)
                                              — mat.unit is only the correct label for the
                                              latter and every flat Mass/Count material. */}
                                          {mat.quantity * (detailOrderLive.orderQuantity || 1)} {mat.fabricationCategory ? 'pcs' : mat.unit}
                                          {(detailOrderLive.orderQuantity || 1) > 1 && <span className="text-slate-400"> ({mat.quantity}/unit)</span>}
                                        </td>
                                        <td className="py-1.5 text-right">
                                          <button
                                            onClick={() => openMaterialView({ ...mat, sourceItemCode: mat.code })}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors ml-auto"
                                          >
                                            <Eye className="h-3 w-3" /> View
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Process Summary */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Wrench className="h-4 w-4" /> Process Status</h3>
                  <div className="space-y-1.5">
                    {detailOrderLive.processes.map((p, i) => (
                      <div key={p.step} className="flex items-center gap-3 text-xs">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                        <span className="w-32 font-medium text-slate-800">{p.step}</span>
                        <span className="text-slate-400 text-xs">{p.type}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                              p.status === 'QC Pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Code *</label>
                <Input placeholder="e.g. MCH-006" value={form.machineCode} onChange={e => setForm(f => ({ ...f, machineCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Priority</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Type *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              >
                <option value="Stock">Stock — Company ka apna stock badhana</option>
                <option value="Store">Store Order — Customer order ke liye</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {form.source === 'Stock'
                  ? '🏭 QC pass hone ke baad item inventory mein add ho jaayega'
                  : '📦 QC pass hone ke baad item dispatch/packing queue mein jaayega'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Name *</label>
              <Input placeholder="e.g. SPM Drilling Machine" value={form.machineName} onChange={e => setForm(f => ({ ...f, machineName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Delivery Date *</label>
              <Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrder} disabled={!form.machineCode || !form.machineName || !form.deliveryDate} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Demand Dialog — also reused, locked to one existing
          line, for the per-row "Adjust Qty" action (demandForm.targetDemandCode set). */}
      <Dialog open={demandOpen} onOpenChange={setDemandOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{demandForm.targetDemandCode ? 'Adjust Demand Quantity' : 'Add Material Demand'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Code *</label>
              <Input placeholder="e.g. STL-010" value={demandForm.materialCode} disabled={!!demandForm.targetDemandCode} onChange={e => handleCodeChange(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type</label>
                {/* Locked once matched to a real Inventory item — its Used
                    Unit is a fixed property of it, not something a demand
                    should override (see UnitAmountField, which depends on
                    this being reliable). Stays editable only for a plain
                    unmatched/manually-named material. */}
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" value={demandForm.unitType} disabled={!!demandForm.targetDemandCode || !!foundItem} onChange={e => setDemandForm(f => ({ ...f, unitType: e.target.value, unit: '' }))}>
                  <option value="">Select</option>
                  {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" value={demandForm.unit} disabled={!demandForm.unitType || !!demandForm.targetDemandCode || !!foundItem} onChange={e => setDemandForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="">{demandForm.unitType ? 'Select' : 'Select Unit Type first'}</option>
                  {getUnitsForTypeDynamic(demandForm.unitType, demandForm.unit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
              <Input placeholder="e.g. MS Plate 12mm" value={demandForm.materialName} disabled={!!demandForm.targetDemandCode} onChange={e => setDemandForm(f => ({ ...f, materialName: e.target.value }))} />
              {demandForm.targetDemandCode ? null : foundItem ? (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  ✓ Found: {foundItem.name} ({foundItem.itemType || '—'})
                </p>
              ) : demandForm.materialCode.trim() ? (
                <p className="text-xs text-amber-500 font-medium mt-1">
                  ⚠ Code not matched. Enter name manually.
                </p>
              ) : null}
            </div>

            {demandForm.fabricationRef && (
              demandForm.targetDemandCode ? (
                <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/40">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Cut Dimensions <span className="text-[10px] text-slate-400 font-normal">(fixed — this is adjusting quantity for this exact cut only)</span></p>
                  <p className="text-xs text-slate-600">
                    {Object.entries(demandForm.bomDimensions || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ') || '—'}
                  </p>
                </div>
              ) : (
                <FabricationVariantAmountFields
                  row={demandForm}
                  categories={fabricationCategories}
                  onUpdate={(patch) => setDemandForm(f => ({ ...f, ...patch }))}
                />
              )
            )}
            {!demandForm.targetDemandCode && rowNeedsAmount(demandForm) && (
              <UnitAmountField row={demandForm} onUpdate={(patch) => setDemandForm(f => ({ ...f, ...patch }))} />
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
              <Input type="number" min="0" placeholder="0" value={demandForm.quantity} onChange={e => setDemandForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>

            {/* R&D Gating Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold block mb-0.5">R&D Authorization Required</span>
                This demand will be locked as <strong>Pending R&D</strong> and an R&D ticket will be auto-generated. This material will only become available for receiving after R&D approves the request.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDemand} disabled={!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity || !demandForm.unit || !fabricationDimsFilled()} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{demandForm.targetDemandCode ? 'Save Quantity Change' : 'Add Demand'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RETURN MATERIAL MODAL ─── */}
      <Dialog open={returnModalOpen} onOpenChange={(o) => { setReturnModalOpen(o); if (!o) { setReturnRow(null); setReturnQty(''); setReturnReason(''); setReturnType('Excess'); setReturnLeftoverLengthValue(''); setReturnLeftoverLengthUnit('Millimeter'); setReturnLeftoverWidthValue(''); setReturnLeftoverWidthUnit('Millimeter'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Package className="h-5 w-5" /> Return Material
            </DialogTitle>
          </DialogHeader>
          {returnRow && (() => {
            const { isFlatPieceDemand, isSheet } = returnDemandCategoryInfo(returnRow);
            return (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Return excess or defective materials back to the store.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{returnRow.sourceItemCode || returnRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{returnRow.materialName}</span></div>
                {returnRow.bomDimensions && Object.keys(returnRow.bomDimensions).length > 0 && (
                  <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Cut Size</span><span className="text-slate-600 text-[11px] font-medium truncate ml-2">{Object.entries(returnRow.bomDimensions).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ')}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Max Returnable</span><span className="text-amber-700 text-xs font-bold">{returnRow.issuedQuantity} {returnRow.unit}</span></div>
              </div>
              {isFlatPieceDemand && (
                <div className="p-3 border border-purple-200 rounded-lg bg-purple-50/50 space-y-2">
                  <label className="text-xs font-semibold text-purple-800 block">
                    Measured Leftover {isSheet ? 'Size' : 'Length'} * <span className="text-[10px] text-slate-500 font-normal">(what's actually left after cutting — Store will get this exact size back, not a guess)</span>
                  </label>
                  <div className={isSheet ? 'grid grid-cols-2 gap-2' : ''}>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase">Length</label>
                      <div className="flex gap-1.5 mt-0.5">
                        <Input
                          type="number" min="0" placeholder="0" className="flex-1 bg-white h-9"
                          value={returnLeftoverLengthValue}
                          onChange={e => setReturnLeftoverLengthValue(e.target.value)}
                        />
                        <select className="w-28 border border-slate-200 rounded-lg text-xs bg-white px-1.5" value={returnLeftoverLengthUnit} onChange={e => setReturnLeftoverLengthUnit(e.target.value)}>
                          {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    {isSheet && (
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase">Width</label>
                        <div className="flex gap-1.5 mt-0.5">
                          <Input
                            type="number" min="0" placeholder="0" className="flex-1 bg-white h-9"
                            value={returnLeftoverWidthValue}
                            onChange={e => setReturnLeftoverWidthValue(e.target.value)}
                          />
                          <select className="w-28 border border-slate-200 rounded-lg text-xs bg-white px-1.5" value={returnLeftoverWidthUnit} onChange={e => setReturnLeftoverWidthUnit(e.target.value)}>
                            {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isSheet ? 'Thickness' : 'Cross-section and other dimensions'} carried over from the original stock automatically — no need to re-enter.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    {isFlatPieceDemand ? 'How Many Leftover Pieces? *' : 'Quantity to Return *'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={returnRow.issuedQuantity}
                    value={returnQty}
                    onChange={e => setReturnQty(e.target.value)}
                    className={Number(returnQty) > returnRow.issuedQuantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(returnQty) > returnRow.issuedQuantity && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {returnRow.issuedQuantity}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={returnRow.unit}>
                    <option>{returnRow.unit}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Return Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="returnType" value="Excess" checked={returnType === 'Excess'} onChange={e => setReturnType(e.target.value)} className="accent-amber-600" />
                    <span className="text-slate-700">Excess Material</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="returnType" value="Defect" checked={returnType === 'Defect'} onChange={e => setReturnType(e.target.value)} className="accent-red-600" />
                    <span className="text-slate-700">Defect / Scrap</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason for Return</label>
                <Input
                  type="text"
                  placeholder="e.g. Excess material, Defective"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnModalOpen(false); setReturnRow(null); setReturnQty(''); setReturnReason(''); setReturnType('Excess'); setReturnLeftoverLengthValue(''); setReturnLeftoverLengthUnit('Millimeter'); setReturnLeftoverWidthValue(''); setReturnLeftoverWidthUnit('Millimeter'); }}>Cancel</Button>
            <Button
              onClick={handleReturnMaterial}
              disabled={(() => {
                if (!returnQty || Number(returnQty) <= 0 || Number(returnQty) > (returnRow?.issuedQuantity || 0)) return true;
                const { isFlatPieceDemand, isSheet } = returnDemandCategoryInfo(returnRow);
                return isFlatPieceDemand && !(Number(returnLeftoverLengthValue) > 0 && (!isSheet || Number(returnLeftoverWidthValue) > 0));
              })()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STRICT MATERIAL RECEIVE MODAL ─── */}
      <Dialog open={issueModalOpen} onOpenChange={(o) => { setIssueModalOpen(o); if (!o) { setIssueRow(null); setIssueQty(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowDownToLine className="h-5 w-5" /> Receive Material
            </DialogTitle>
          </DialogHeader>
          {issueRow && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirm exactly how much material you are taking from the store shelf. This will automatically deduct from master inventory.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{issueRow.sourceItemCode || issueRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{issueRow.materialName}</span></div>
                {issueRow.bomDimensions && Object.keys(issueRow.bomDimensions).length > 0 && (
                  <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Cut Size</span><span className="text-slate-600 text-[11px] font-medium truncate ml-2">{Object.entries(issueRow.bomDimensions).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ')}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Remaining Required</span><span className="text-emerald-700 text-xs font-bold">{issueRow.remainingQty} {issueRow.unit}</span></div>
                {issueRow.issuedToName && (
                  <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Issued To</span><span className="text-slate-800 text-xs font-medium">{issueRow.issuedToName}</span></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity Received *</label>
                  <Input
                    type="number"
                    min="0"
                    max={issueRow.remainingQty}
                    value={issueQty}
                    onChange={e => setIssueQty(e.target.value)}
                    className={Number(issueQty) > issueRow.remainingQty ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(issueQty) > issueRow.remainingQty && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {issueRow.remainingQty}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={issueRow.unit}>
                    <option>{issueRow.unit}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIssueModalOpen(false); setIssueRow(null); setIssueQty(''); }}>Cancel</Button>
            <Button
              onClick={handleIssueMaterial}
              disabled={!issueQty || Number(issueQty) <= 0 || Number(issueQty) > (issueRow?.remainingQty || 0)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View BOM Entry Dialog (from R&D BOM Management) */}
      <Dialog open={!!viewMat} onOpenChange={() => setViewMat(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{viewMat?.code}</span>
              {viewMat?.found && <span>{viewMat.item}</span>}
            </DialogTitle>
          </DialogHeader>

          {bomView.loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading BOM data from R&D…</p>
          ) : viewMat && !viewMat.found ? (
            <p className="text-sm text-slate-500 py-4 leading-relaxed">
              No matching entry found in R&D's Bill of Materials for code <strong>{viewMat.code}</strong>.
              This was likely added as an out-of-BOM material demand rather than sourced from the Master BOM.
            </p>
          ) : viewMat && (
            <div className="space-y-4 py-2">
              {/* Core — same fields captured on the Add Material form in BOM
                  Management, always shown regardless of BOM Format & Modification. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">BOM Quantity</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.quantity} {viewMat.fabricationCategory ? 'pcs' : viewMat.unit}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Hierarchy</p>
                  <p className="text-sm font-medium text-slate-800">{[viewMat.childPart, viewMat.subChildPart].filter(Boolean).join(' > ') || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Price</p>
                  <p className="text-sm font-medium text-slate-800">₹{(viewMat.totalPrice || 0).toLocaleString()} <span className="text-xs text-slate-400">(₹{viewMat.unitPrice || 0}/unit)</span></p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${viewMat.isDiscontinued ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                    {viewMat.isDiscontinued ? 'Discontinued' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Everything below is exactly whatever R&D's BOM Format &
                  Modification has enabled — same fields shown in BOM
                  Management's table/view, kept in sync via bomFieldFormat.js. */}
              {extraViewFields.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Additional Details <span className="text-[10px] text-slate-400 font-normal">(from BOM Format & Modification)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {extraViewFields.map(f => {
                      if (f.key === 'itemCategories') return null;
                      const value = formatCatalogFieldValue(f.key, viewMat);
                      if (value === '—') return null;
                      return <div key={f.key}><p className="text-[11px] text-slate-400">{f.label}</p><p className="text-sm text-slate-800 break-words">{value}</p></div>;
                    })}
                  </div>

                  {enabledBOMFields.includes('itemCategories') && Array.isArray(viewMat.itemCategories) && viewMat.itemCategories.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">Item Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewMat.itemCategories.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMat(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
