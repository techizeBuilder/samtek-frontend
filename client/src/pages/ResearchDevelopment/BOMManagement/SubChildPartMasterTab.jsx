import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Search, Plus, Package2, Ban, RefreshCw, FileText, X, IndianRupee, Weight, Settings2 } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { getUnitTypeForUnit } from '@/utils/unitTypes';
import FabricationVariantAmountFields from '@/components/inventory/FabricationVariantAmountFields';
import UnitAmountField, { rowNeedsAmount as sharedRowNeedsAmount } from '@/components/inventory/UnitAmountField';
import ProcessDefinitionEditor, { summarizeProcessDefinition } from '@/components/inventory/ProcessDefinitionEditor';
import ProcessTemplateManagerDialog from '@/components/inventory/ProcessTemplateManagerDialog';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);
const isPdfUrl = (url) => !!url && /\.pdf(\?|$)/i.test(url);
const fmtMoney = (n) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
// Weight can genuinely be unknown (no weight rate set on the source item) —
// "—" matches the same dash-for-unknown convention bomFieldFormat.js
// already uses everywhere else weight is shown, rather than guessing 0.
const fmtWeightOrDash = (n) => (n == null ? '—' : `${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`);

// Same field catalog / display rule BOM Format & Modification already
// drives for the Machine BOM material table — "code"/"name"/"unit" are
// already shown elsewhere on this page, so only the rest are worth an
// "Additional Details" row. "dimensions" is a BOM-line-specific concept (a
// material's own consumed cut), not a plain Item field, so it's skipped
// rather than shown blank.
const EXCLUDED_CATALOG_KEYS = ['code', 'name', 'unit', 'dimensions'];
const formatSourceFieldValue = (key, item) => {
  const v = item?.[key];
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return v || '—';
};

// Same "does this need an Amount field instead of a bare Quantity" rule the
// BOM material picker uses — a non-fabrication row whose Used Unit is
// Length/Area/Volume needs "Area Used (cm²)" etc., not a meaningless bare
// number (confirmed 2026-09-13: this form was missing that entirely).
const rowNeedsAmount = (row) => sharedRowNeedsAmount(row, getUnitTypeForUnit);

// Sub Child Part Master — the new, standalone leaf node of the corrected BOM
// hierarchy (Raw Material -> Sub Child Part -> Child Part -> Machine; see
// server/docs/bom-hierarchy-redesign-2026-09.md). Not machine-scoped, not
// Child-Part-scoped: created once here, referenced by code wherever a Child
// Part uses it (that reference wiring is a later build pass). Always exactly
// one source raw material — confirmed with the client 2026-09-11/12 — so
// this form is a single-material definition, not a BOM.

// Same searchable, selection-only pattern BOMCreationTab's own
// MaterialCodePicker uses for raw-material lines — kept local since that one
// isn't exported, and this picker's candidate list (plain Inventory items)
// is the same shape.
function SourceMaterialPicker({ value, displayName, items, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const candidates = (items || []).filter(m => !m.isDiscontinued);
  const q = query.trim().toLowerCase();
  const matches = (q
    ? candidates.filter(m => (m.code || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q))
    : candidates
  ).slice(0, 50);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="w-full h-10 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search Inventory code or name..."
          value={open ? query : (value ? `${value}${displayName ? ` — ${displayName}` : ''}` : '')}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {matches.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-3">No matching Inventory items</p>
          ) : matches.map(m => (
            <button
              type="button"
              key={m._id}
              onClick={() => { onSelect(m); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-50 last:border-0"
            >
              <span className="font-mono font-semibold text-blue-700">{m.code}</span>
              <span className="text-slate-600"> — {m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  name: '', code: '', specification: '', image: '',
  sourceItemId: '', sourceItemCode: '', sourceItemName: '',
  // Auto-fetched + locked from the matched source item, exactly like the BOM
  // material picker (never manually retyped — a real Item's Used Unit is a
  // fixed property of it).
  unitType: '', unit: '', purchaseCostPerUnit: 0,
  // Fabrication Master source material only.
  fabricationRef: null, fabricationCategory: '', weightUnitPrice: 0,
  dimensionVariants: [], dimensionVariantId: '',
  // The actual "how much of the source material one Sub Child Part unit
  // consumes" — for a Length/Area/Volume Used Unit (or a fabrication item)
  // this is entered via UnitAmountField/FabricationVariantAmountFields
  // ("Area Used (cm²)" etc.); for a Mass/Count Used Unit it's a bare qty.
  quantity: '', amountValue: '', amountUnit: '', unitPrice: 0,
  processDefinition: [],
};

export default function SubChildPartMasterTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogItem, setDialogItem] = useState(null); // existing item being edited, or {} for new
  const [form, setForm] = useState(emptyForm);
  // Which row is expanded — an accordion now, not a dropdown (confirmed
  // 2026-09-13: with no selection the dropdown just showed the same full
  // list anyway, so the list itself is the primary UI; clicking a row
  // expands it in place to the same summary + Cost card the dropdown used
  // to drill into). Controlled (not left to Radix's own internal state) so
  // the Job Work Cost draft below can be reset whenever the open row changes.
  const [openItemId, setOpenItemId] = useState('');
  // A dedicated View button next to Edit/Discontinue (2026-09-13) — opens a
  // modal with every detail (core facts + the "Additional Details" BOM
  // Format panel), rather than that panel sitting inline in the expanded row.
  const [viewItem, setViewItem] = useState(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search]);

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['sub-child-part-master', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ includeDiscontinued: 'true', page: String(page), limit: '20' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/rd/sub-child-parts?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const items = listResponse?.data || [];
  const pagination = listResponse?.pagination || { page: 1, pages: 1, total: 0 };

  // Same raw-material pool BOM Creation's own Add Raw Material draws from —
  // a Sub Child Part's source material is always a plain Inventory item.
  const { data: inventoryResponse } = useQuery({
    queryKey: ['bom-inventory-items'],
    queryFn: () => apiRequest('GET', '/api/items?productKind=none&limit=1000'),
  });
  const rawInventoryItems = inventoryResponse?.items || [];

  // Same catalog FabricationVariantAmountFields needs (calcType, per
  // category) — identical query BOMCreationTab.jsx already runs.
  const { data: fabricationCategoriesResponse } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = fabricationCategoriesResponse?.data || [];

  // Same shared config BOM Format & Modification (main page header) edits —
  // read here only. Feeds both the create/edit form's "Additional Details"
  // preview for the picked source material AND the View dialog's own
  // "Additional Details" panel for any row — same filter either way, no
  // dependency on which item is currently open.
  const { data: bomFieldConfigResponse } = useQuery({
    queryKey: ['rd-bom-field-config'],
    queryFn: () => apiRequest('GET', '/api/rd/bom-field-config'),
  });
  const enabledSourceFields = (bomFieldConfigResponse?.data?.catalog || [])
    .filter(f => (bomFieldConfigResponse?.data?.enabledFields || []).includes(f.key) && !EXCLUDED_CATALOG_KEYS.includes(f.key));

  const [imageUploading, setImageUploading] = useState(false);
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showSmartToast(new Error('Please select a file under 10MB'), 'File too large'); return; }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Not actually Child-Part-specific server-side — just stores whatever
      // file and hands back a URL, so it's fine to reuse here rather than
      // add a second identical endpoint.
      const res = await apiRequest('POST', '/api/rd/child-parts/upload-file', fd);
      if (res.success && res.url) setForm(f => ({ ...f, image: res.url }));
    } catch (err) {
      showSmartToast(err, 'File upload failed');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const openCreate = async () => {
    setForm(emptyForm);
    setDialogItem({});
    try {
      const res = await apiRequest('GET', '/api/rd/sub-child-parts/generate-code');
      setForm(f => ({ ...f, code: res.code || '' }));
    } catch { /* code stays blank, user can type one */ }
  };

  const openEdit = (item) => {
    setDialogItem(item);
    const d = item.subChildPartDetails || {};
    const src = d.sourceItem || {};
    // rowNeedsAmount is the non-fabrication check only — a fabrication-
    // sourced part always needs the amount field too, or its saved qty loads
    // into the wrong form field (found 2026-09-13 against a real Fan Blade
    // record: sourceQty was correctly saved, but re-opening Edit put it in
    // `quantity` instead of `amountValue`, which FabricationVariantAmountFields
    // actually reads — same class of bug already fixed in resolvedSourceQty/
    // materialsCost below).
    const needsAmount = !!src.fabricationRef || rowNeedsAmount({ unitType: src.unitType, unit: d.sourceUnit, fabricationRef: src.fabricationRef });
    setForm({
      name: item.name, code: item.code, specification: item.specification || '', image: item.image || '',
      sourceItemId: src._id || d.sourceItem || '', sourceItemCode: src.code || '', sourceItemName: src.name || '',
      unitType: src.unitType || '', unit: d.sourceUnit || '', purchaseCostPerUnit: src.purchaseCost || 0,
      fabricationRef: src.fabricationRef || null, fabricationCategory: (src.dimensionVariants || [])[0]?.category || '',
      weightUnitPrice: src.weightUnitPrice || 0,
      dimensionVariants: (src.dimensionVariants || []).filter(v => !v.isLeftover),
      dimensionVariantId: d.sourceDimensionVariantId || '',
      quantity: !needsAmount ? (d.sourceQty ?? '') : '',
      amountValue: needsAmount ? (d.sourceQty ?? '') : '', amountUnit: d.sourceUnit || '',
      unitPrice: 0,
      processDefinition: d.processDefinition || [],
    });
  };

  // Re-derives every unit-type/fabrication-dependent field from a freshly
  // matched source item — always OVERWRITES rather than keeping whatever was
  // there before (fixes the bug where reselecting mid-form, without closing
  // the dialog, left the previous item's unit/amount fields stuck).
  const applySourceMatch = (match) => {
    const variants = (match.dimensionVariants || []).filter(v => !v.isLeftover);
    setForm(f => ({
      ...f,
      sourceItemId: match._id, sourceItemCode: match.code, sourceItemName: match.name,
      unitType: match.unitType || getUnitTypeForUnit(match.unit) || '',
      unit: match.unit || '',
      purchaseCostPerUnit: match.purchaseCost || 0,
      fabricationRef: match.fabricationRef || null,
      fabricationCategory: match.fabricationRef ? (variants[0]?.category || '') : '',
      weightUnitPrice: match.weightUnitPrice || 0,
      dimensionVariants: variants,
      dimensionVariantId: match.fabricationRef && variants.length === 1 ? variants[0]._id : '',
      quantity: '', amountValue: '', amountUnit: '', unitPrice: 0,
    }));
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sub-child-part-master'] });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/sub-child-parts', data),
    onSuccess: () => { invalidate(); showSuccessToast('Created', 'Sub Child Part added.'); setDialogItem(null); },
    onError: (e) => showSmartToast(e, 'Failed to create Sub Child Part'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/rd/sub-child-parts/${id}`, data),
    onSuccess: () => { invalidate(); showSuccessToast('Saved', 'Sub Child Part updated.'); setDialogItem(null); },
    onError: (e) => showSmartToast(e, 'Failed to update Sub Child Part'),
  });
  const toggleDiscontinued = (item) => {
    apiRequest('PUT', `/api/items/${item._id}`, { isDiscontinued: !item.isDiscontinued })
      .then(() => { invalidate(); showSuccessToast('Updated', item.isDiscontinued ? 'Reactivated.' : 'Discontinued.'); })
      .catch((e) => showSmartToast(e, 'Failed to update'));
  };

  const amountNeeded = rowNeedsAmount(form);
  // The amount/quantity is always entered in the source item's own locked
  // Used Unit (row.unit === row.amountUnit, enforced by UnitAmountField /
  // FabricationVariantAmountFields) — so it doubles directly as sourceQty/
  // sourceUnit, no separate pieces multiplier the way a BOM line has (a Sub
  // Child Part IS one atomic unit; there's nothing else to multiply by).
  // rowNeedsAmount deliberately excludes fabrication rows (it's the
  // non-fabrication check), so a Fabrication Master source material has to
  // be checked separately here too.
  const resolvedSourceQty = (form.fabricationRef || amountNeeded) ? form.amountValue : form.quantity;
  // Same "Price (auto)" math Add Raw Material already shows — a fabrication
  // or amount-needed row's unitPrice is kept current by
  // FabricationVariantAmountFields/UnitAmountField's own effects; a plain
  // Mass/Count row has no such effect wiring it up, so it's computed here
  // directly (purchaseCostPerUnit is ₹ per stocking unit either way). This
  // live value is only for the create/edit form's own real-time preview —
  // the authoritative, stored Materials Cost (used everywhere else: the
  // drill-down card, the table, the View dialog) is computed server-side on
  // save, see subChildPartMasterController.js's computeMaterialsCost.
  const materialsCost = (form.fabricationRef || amountNeeded)
    ? (form.unitPrice || 0)
    : (Number(form.quantity || 0) * (form.purchaseCostPerUnit || 0));

  const handleSave = () => {
    const payload = {
      name: form.name.trim(), code: form.code.trim(), specification: form.specification.trim(), image: form.image,
      sourceItemId: form.sourceItemId, sourceQty: Number(resolvedSourceQty), sourceUnit: form.unit,
      sourceDimensionVariantId: form.dimensionVariantId || null,
      processDefinition: form.processDefinition,
    };
    if (dialogItem?._id) updateMutation.mutate({ id: dialogItem._id, data: payload });
    else createMutation.mutate(payload);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const needsVariantPick = form.fabricationRef && form.dimensionVariants.length > 1 && !form.dimensionVariantId;
  // The real on-screen heading for whichever amount/quantity field is
  // actually showing — mirrors FabricationVariantAmountFields'/
  // UnitAmountField's own label logic exactly, so "still needed" names the
  // same thing the form itself calls it ("Area Used (Centimeter Square)"),
  // not a generic "Amount" that doesn't match what's on screen.
  const AMOUNT_UNIT_LABEL = { 'Length Unit': 'Length', 'Area Unit': 'Area', 'Volume Unit': 'Volume' };
  const amountFieldLabel = () => {
    if (form.fabricationRef) {
      const isSheet = fabricationCategories.find(c => c.key === form.fabricationCategory)?.calcType === 'sheet';
      return `${isSheet ? 'Area' : 'Length'} Used${form.unit ? ` (${form.unit})` : ''}`;
    }
    if (amountNeeded) return `${AMOUNT_UNIT_LABEL[form.unitType] || 'Amount'} Used${form.unit ? ` (${form.unit})` : ''}`;
    return `Qty per unit${form.unit ? ` (${form.unit})` : ''}`;
  };
  // Named list, not just a disabled button — a silently-disabled Create
  // with no indication of what's still missing is a real dead end.
  const missingReasons = [];
  if (!form.name.trim()) missingReasons.push('Name');
  if (!form.code.trim()) missingReasons.push('Code');
  if (!form.image) missingReasons.push('Design File');
  if (!form.sourceItemId) missingReasons.push('Source Raw Material');
  else if (needsVariantPick) missingReasons.push('Dimension Size');
  else if (!(Number(resolvedSourceQty) > 0)) missingReasons.push(amountFieldLabel());
  if (!form.processDefinition.some(c => (c.internalProcesses || []).length > 0)) missingReasons.push('Process Definition');
  const canSave = missingReasons.length === 0;

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name or code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400">
            One source raw material, built through a Process Definition of In-House and Out Source steps.
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setTemplateManagerOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" /> Process Templates
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Sub Child Part
          </Button>
        </CardContent>
      </Card>

      {/* List — an accordion now, not a dropdown+table (confirmed 2026-09-13:
          with nothing picked, the dropdown just showed this same full list
          anyway). Each collapsed row is a plain summary with no action
          buttons at all; clicking it expands in place to the same content
          the dropdown used to drill into (summary + Edit/Discontinue + Cost
          card), plus the "Additional Details" panel appended at the bottom —
          folding in what used to be a separate View dialog. */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-slate-400 text-center py-10">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No Sub Child Parts yet — click "New Sub Child Part" to add one.</p>
          ) : (
            <Accordion type="single" collapsible value={openItemId} onValueChange={setOpenItemId}>
              {items.map(it => {
                const d = it.subChildPartDetails || {};
                const src = d.sourceItem || {};
                const rowMaterialsCost = d.materialsCost || 0;
                const rowJobWorkCost = d.jobWorkCost || 0;
                // Only a sheet-metal-sourced Sub Child Part ever has a
                // nonzero scrapCost (server-set only via a saved Sheet Metal
                // Plan — see subChildPartSheetPlanController.js) — gating the
                // tile on the source material itself (not just scrapCost > 0)
                // keeps the grid stable once a plan exists but hasn't been
                // resaved yet.
                const rowIsSheetMetal = !!src.fabricationRef;
                const rowScrapCost = d.scrapCost || 0;
                const rowTotalCost = rowMaterialsCost + rowJobWorkCost + rowScrapCost;
                return (
                  <AccordionItem key={it._id} value={it._id} className={`border-b border-slate-100 last:border-0 px-4 ${it.isDiscontinued ? 'opacity-60' : ''}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 flex-wrap text-sm text-left flex-1 pr-2">
                        <span className="font-mono text-blue-700 w-16 flex-shrink-0">{it.code}</span>
                        <span className="text-slate-800 font-medium min-w-[100px]">{it.name}</span>
                        <span className="text-slate-500 text-xs">
                          {src.name || '—'} <span className="text-slate-400">({d.sourceQty} {d.sourceUnit})</span>
                        </span>
                        <Badge variant="outline" className={summarizeProcessDefinition(d.processDefinition) === 'Not defined' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                          {summarizeProcessDefinition(d.processDefinition)}
                        </Badge>
                        <span className="text-slate-500 text-xs">{it.qty ?? 0} {it.unit}</span>
                        {it.isDiscontinued
                          ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Discontinued</Badge>
                          : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            {it.image ? (
                              isPdfUrl(it.image) ? (
                                <div className="h-10 w-10 rounded border bg-red-50 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-red-500" /></div>
                              ) : (
                                <img src={resolveMediaUrl(it.image)} alt="" className="h-10 w-10 rounded object-cover border flex-shrink-0" />
                              )
                            ) : (
                              <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0"><Package2 className="h-5 w-5 text-slate-400" /></div>
                            )}
                            <p className="font-semibold text-slate-900">
                              {it.name} <span className="font-mono text-xs text-blue-600 font-normal">{it.code}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setViewItem(it)}>View</Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => toggleDiscontinued(it)}>
                              {it.isDiscontinued ? <><RefreshCw className="h-3.5 w-3.5 mr-1" />Reactivate</> : <><Ban className="h-3.5 w-3.5 mr-1" />Discontinue</>}
                            </Button>
                          </div>
                        </div>

                        {/* Cost — mirrors Machine BOM's own Production Cost
                            card layout. Job Work Cost is now display-only
                            here (Phase 1 — its old manual-edit endpoint is
                            gone); it stays meaningful since the cost rollup
                            still writes it once a real build/outsource run
                            completes, that wiring is Phase 2. */}
                        <div className="border-t border-slate-100 pt-4">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                            <IndianRupee className="h-4 w-4 text-slate-500" /> Cost
                          </p>
                          <div className={`grid gap-3 max-w-lg ${rowIsSheetMetal ? 'grid-cols-4' : 'grid-cols-3'}`}>
                            <div className="p-2.5 rounded-lg bg-slate-50">
                              <p className="text-[10px] text-slate-500">Materials Cost</p>
                              <p className="text-sm font-semibold text-slate-800">{fmtMoney(rowMaterialsCost)}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50">
                              <p className="text-[10px] text-slate-500">Job Work Cost</p>
                              <p className="text-sm font-semibold text-slate-800">{fmtMoney(rowJobWorkCost)}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{d.jobWorkCostSource === 'Actual' ? 'From a completed run' : 'R&D Estimate'}</p>
                            </div>
                            {rowIsSheetMetal && (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                                <p className="text-[10px] text-amber-600">Scrap Cost <span className="opacity-70">(Sheet Metal)</span></p>
                                <p className="text-sm font-semibold text-amber-800">{fmtMoney(rowScrapCost)}</p>
                              </div>
                            )}
                            <div className="p-2.5 rounded-lg bg-blue-50">
                              <p className="text-[10px] text-blue-600">Total Cost</p>
                              <p className="text-sm font-semibold text-blue-800">{fmtMoney(rowTotalCost)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} Sub Child Parts)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* View — every detail of one Sub Child Part: the core facts plus the
          "Additional Details (from BOM Format & Modification)" panel,
          reached via the View button next to Edit/Discontinue in the
          expanded row (2026-09-13 — pulled back out of sitting inline). */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{viewItem?.code}</span>
              <span>{viewItem?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (() => {
            const vd = viewItem.subChildPartDetails || {};
            const vsrc = vd.sourceItem || {};
            const vIsSheetMetal = !!vsrc.fabricationRef;
            const vScrapCost = vd.scrapCost || 0;
            const vTotal = (vd.materialsCost || 0) + (vd.jobWorkCost || 0) + vScrapCost;
            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Source Material</p><p className="text-sm text-slate-800">{vsrc.name || '—'}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Amount / Qty</p><p className="text-sm text-slate-800">{vd.sourceQty} {vd.sourceUnit}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Process</p><p className="text-sm text-slate-800">{summarizeProcessDefinition(vd.processDefinition)}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Stock</p><p className="text-sm text-slate-800">{viewItem.qty ?? 0} {viewItem.unit}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Specification</p><p className="text-sm text-slate-800">{viewItem.specification || '—'}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Status</p><p className="text-sm text-slate-800">{viewItem.isDiscontinued ? 'Discontinued' : 'Active'}</p></div>
                  <div className="bg-teal-50 rounded-lg p-2.5 border border-teal-100"><p className="text-[11px] text-teal-600 flex items-center gap-1"><Weight className="h-3 w-3" /> Unit Weight</p><p className="text-sm font-semibold text-teal-800">{fmtWeightOrDash(vd.unitWeightKg)}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Materials Cost</p><p className="text-sm text-slate-800">{fmtMoney(vd.materialsCost)}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2.5"><p className="text-[11px] text-slate-400">Job Work Cost</p><p className="text-sm text-slate-800">{fmtMoney(vd.jobWorkCost)}</p></div>
                  {vIsSheetMetal && (
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100"><p className="text-[11px] text-amber-600">Scrap Cost <span className="opacity-70">(Sheet Metal)</span></p><p className="text-sm font-semibold text-amber-800">{fmtMoney(vScrapCost)}</p></div>
                  )}
                  <div className="bg-blue-50 rounded-lg p-2.5 col-span-2"><p className="text-[11px] text-blue-600">Total Cost</p><p className="text-sm font-semibold text-blue-800">{fmtMoney(vTotal)}</p></div>
                </div>

                {enabledSourceFields.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">Additional Details <span className="text-[10px] text-slate-400 font-normal">(from BOM Format & Modification)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      {enabledSourceFields.map(f => {
                        const value = formatSourceFieldValue(f.key, vsrc);
                        if (value === '—') return null;
                        return <div key={f.key}><p className="text-[11px] text-slate-400">{f.label}</p><p className="text-sm text-slate-800 break-words">{value}</p></div>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogItem} onOpenChange={(o) => !o && setDialogItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialogItem?._id ? 'Edit' : 'New'} Sub Child Part</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Laser-Cut Bracket" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Code</label>
                <Input className="mt-1 font-mono" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!dialogItem?._id} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Specification</label>
                <Input className="mt-1" value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} placeholder="e.g. size 6x12" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Design File <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2 mt-1">
                  {form.image ? (
                    isPdfUrl(form.image) ? (
                      <div className="h-9 w-9 rounded border bg-red-50 flex items-center justify-center flex-shrink-0"><FileText className="h-4 w-4 text-red-500" /></div>
                    ) : (
                      <img src={resolveMediaUrl(form.image)} alt="" className="h-9 w-9 rounded object-cover border flex-shrink-0" />
                    )
                  ) : (
                    <div className="h-9 w-9 rounded border bg-slate-50 flex items-center justify-center flex-shrink-0"><FileText className="h-4 w-4 text-slate-300" /></div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-xs text-blue-600 hover:underline">{imageUploading ? 'Uploading...' : form.image ? 'Replace' : 'Upload'}</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                  </label>
                  {form.image && (
                    <button type="button" title="Remove" onClick={() => setForm(f => ({ ...f, image: '' }))} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Image or PDF, up to 10MB</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Source Raw Material — one material only</label>
              <SourceMaterialPicker
                value={form.sourceItemCode}
                displayName={form.sourceItemName}
                items={rawInventoryItems}
                onSelect={applySourceMatch}
              />

              {form.sourceItemId && (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-xs text-slate-500">Unit Type</label>
                      {/* Auto-fetched from the matched item and locked — same
                          as the BOM material picker (a real Item's Used Unit
                          isn't something a line should override). */}
                      <Input className="mt-1 bg-slate-50 text-slate-500" value={form.unitType} disabled />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Unit</label>
                      <Input className="mt-1 bg-slate-50 text-slate-500" value={form.unit} disabled />
                    </div>
                  </div>

                  {/* Fabrication Master source material — pick which catalog
                      dimension size this Sub Child Part is cut from, then an
                      Area/Length Used amount (same component the BOM
                      material picker uses). */}
                  {form.fabricationRef && (
                    <div className="mt-2">
                      <FabricationVariantAmountFields
                        row={form}
                        categories={fabricationCategories}
                        onUpdate={(patch) => setForm(f => ({ ...f, ...patch }))}
                      />
                    </div>
                  )}
                  {/* Non-fabrication material whose Used Unit is Length/Area/
                      Volume — same "Area Used (cm²)" style field, not a bare
                      meaningless number. */}
                  {!form.fabricationRef && amountNeeded && (
                    <div className="mt-2">
                      <UnitAmountField row={form} onUpdate={(patch) => setForm(f => ({ ...f, ...patch }))} />
                    </div>
                  )}
                  {/* Mass/Count Used Unit — a bare quantity already means
                      "5 kg"/"3 pieces" with nothing to split. */}
                  {!form.fabricationRef && !amountNeeded && (
                    <div className="mt-2">
                      <label className="text-xs text-slate-500">Qty per unit ({form.unit || '—'})</label>
                      <Input type="number" min="0" className="mt-1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                  )}

                  {/* Same "Price (auto)" preview Add Raw Material already
                      shows — live feedback only; the stored Materials Cost
                      shown everywhere else is computed server-side on save. */}
                  {resolvedSourceQty > 0 && (
                    <div className="mt-2 h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                      <IndianRupee className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {materialsCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span className="text-[10px] text-slate-400 ml-1.5">(auto — Price)</span>
                    </div>
                  )}

                  {/* BOM Format & Modification's own picked fields, read live
                      off the matched source material — restored here per
                      2026-09-13 (shown in Create, Edit, and the expanded row
                      view — not view-only). */}
                  {enabledSourceFields.length > 0 && (
                    <div className="mt-3 p-3 border border-slate-100 rounded-lg bg-slate-50/60">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Additional Details <span className="normal-case text-slate-400">(from BOM Format & Modification)</span></p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {enabledSourceFields.map(f => (
                          <div key={f.key} className="flex justify-between gap-2">
                            <span className="text-slate-500">{f.label}</span>
                            <span className="text-slate-700 text-right">{formatSourceFieldValue(f.key, rawInventoryItems.find(i => i._id === form.sourceItemId))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                Process Definition <span className="text-xs text-slate-400 font-normal">— category, then which internal processes are In-House vs. Out Source. The numbers show build order — reorder with the ↑↓ arrows.</span>
              </label>
              <ProcessDefinitionEditor
                bomLevel="SubChildPart"
                value={form.processDefinition}
                onChange={(pd) => setForm(f => ({ ...f, processDefinition: pd }))}
              />
            </div>
          </div>
          {missingReasons.length > 0 && (
            <p className="text-xs text-amber-600 text-right -mb-1">Still needed: {missingReasons.join(', ')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogItem(null)}>Cancel</Button>
            <Button disabled={!canSave || saving} onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {dialogItem?._id ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessTemplateManagerDialog
        bomLevel="SubChildPart"
        open={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
      />
    </div>
  );
}
