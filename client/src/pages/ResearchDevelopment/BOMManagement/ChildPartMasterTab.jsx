import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Search, Plus, Package2, Ban, RefreshCw, FileText, X, IndianRupee,
  Trash2, Edit2, ChevronDown, Layers, Boxes, Wrench, Factory, Save, Weight, Settings2,
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { getUnitTypeForUnit } from '@/utils/unitTypes';
import FabricationVariantAmountFields from '@/components/inventory/FabricationVariantAmountFields';
import UnitAmountField, { AMOUNT_UNIT_TYPES, rowNeedsAmount as sharedRowNeedsAmount } from '@/components/inventory/UnitAmountField';
import ProcessDefinitionEditor from '@/components/inventory/ProcessDefinitionEditor';
import ProcessTemplateManagerDialog from '@/components/inventory/ProcessTemplateManagerDialog';

// Child Part Master — the new, standalone Child Part catalog (see
// server/docs/bom-hierarchy-redesign-2026-09.md §4, §9). A Child Part owns
// its own material list — Sub Child Parts it's assembled from, plus other
// materials (raw material/tool) it consumes directly — mirroring the
// Machine BOM's own material-line CRUD (BOMCreationTab.jsx) for the
// Material/Tool half, and Sub Child Part Master's own "one form, Item
// auto-created" pattern for the Child Part's own core fields. Deliberately
// separate from the OLD per-machine Child Part flow (ChildPartCreationTab.jsx)
// — that one stays untouched, purely as reference, per the user's own
// instruction; only Child Parts created here ever show up in this tab.

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);
const isPdfUrl = (url) => !!url && /\.pdf(\?|$)/i.test(url);
const fmtMoney = (n) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtWeight = (n) => `${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
// Per-row weight can genuinely be unknown (no weight rate set on the source
// item) — "—" matches the same dash-for-unknown convention bomFieldFormat.js
// already uses everywhere else weight is shown, rather than guessing 0.
const fmtWeightOrDash = (n) => (n == null ? '—' : fmtWeight(n));

const rowNeedsAmount = (row) => sharedRowNeedsAmount(row, getUnitTypeForUnit);

// A non-fabrication row whose matched Item's Used Unit is Length/Area/Volume
// carries the same amountValue/amountUnit split as fabrication (see
// UnitAmountField) — the "Quantity" typed is a PIECE count, but the saved
// quantity must be the TOTAL amount (Amount x Pieces), same rule
// BOMCreationTab.jsx's own resolveSubmitQuantity already established.
const resolveSubmitQuantity = (row) => rowNeedsAmount(row)
  ? Number(row.quantity) * Number(row.amountValue)
  : Number(row.quantity);

const emptyFabricationFields = {
  fabricationRef: null, fabricationCategory: '', fabricationDensity: null,
  weightUnitPrice: 0, dimensionVariants: [], dimensionVariantId: '', amountValue: '', amountUnit: '',
};
const emptyMaterialRow = {
  code: '', item: '', itemType: '', quantity: '', unitType: '', unit: '', unitPrice: 0,
  purchaseCostPerUnit: 0,
  ...emptyFabricationFields,
};

// Same search-as-you-type Inventory picker BOMCreationTab.jsx's own
// MaterialCodePicker / SubChildPartMasterTab.jsx's own SourceMaterialPicker
// already use — mirrored here since neither is exported for reuse.
function InventoryItemPicker({ value, displayName, items, onSelect }) {
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
              type="button" key={m._id}
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

// Genuinely new pattern (no existing precedent in the codebase) — a
// card-grid, multi-select picker for Sub Child Parts, confirmed with the
// user: shows design/image + name, click-to-toggle selection, a Confirm step
// that moves to a quantity-entry table (quantity is entered AFTERWARD, not
// inside the card grid itself), then hands the finished rows back to the
// caller. Never calls an API itself — the caller decides whether to stage
// the rows locally (creation dialog) or persist them immediately (drill-down).
function SubChildPartPickerModal({ open, onClose, items, excludeIds, onConfirm }) {
  const [step, setStep] = useState('pick');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState({});
  const [qtyDraft, setQtyDraft] = useState({});

  useEffect(() => {
    if (open) { setStep('pick'); setQuery(''); setSelected({}); setQtyDraft({}); }
  }, [open]);

  const candidates = (items || []).filter(i => !i.isDiscontinued && !excludeIds.includes(i._id));
  const q = query.trim().toLowerCase();
  const matches = q
    ? candidates.filter(i => (i.code || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q))
    : candidates;

  const toggle = (item) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item._id]) delete next[item._id];
      else next[item._id] = { code: item.code, name: item.name, image: item.image, unit: item.unit || 'Pieces' };
      return next;
    });
  };

  const selectedIds = Object.keys(selected);
  const canConfirm = selectedIds.length > 0 && selectedIds.every(id => Number(qtyDraft[id]) > 0);

  const handleConfirm = () => {
    onConfirm(selectedIds.map(id => ({ subChildPartId: id, ...selected[id], quantity: Number(qtyDraft[id]) })));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Sub Child Part{step === 'qty' ? ' — Quantity' : ''}</DialogTitle></DialogHeader>
        {step === 'pick' ? (
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                className="w-full h-10 rounded-md border border-slate-200 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search Sub Child Part code or name..."
                value={query} onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="col-span-full text-center text-xs text-slate-400 py-8">No Sub Child Parts found.</p>
              ) : matches.map(i => {
                const isSelected = !!selected[i._id];
                return (
                  <button
                    type="button" key={i._id} onClick={() => toggle(i)}
                    className={`border rounded-lg p-3 text-left transition-colors ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="h-16 w-full rounded bg-slate-100 flex items-center justify-center overflow-hidden mb-2">
                      {i.image ? (
                        isPdfUrl(i.image)
                          ? <FileText className="h-6 w-6 text-red-400" />
                          : <img src={resolveMediaUrl(i.image)} alt="" className="h-full w-full object-cover" />
                      ) : <Package2 className="h-6 w-6 text-slate-300" />}
                    </div>
                    <p className="text-xs font-mono text-blue-700">{i.code}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{i.name}</p>
                    {isSelected && <p className="text-[10px] text-blue-600 mt-1 font-semibold">✓ Selected</p>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 py-2">
            {selectedIds.map(id => (
              <div key={id} className="flex items-center gap-3 border border-slate-200 rounded-lg p-2.5">
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selected[id].image ? <img src={resolveMediaUrl(selected[id].image)} alt="" className="h-full w-full object-cover" /> : <Package2 className="h-4 w-4 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-blue-700">{selected[id].code}</p>
                  <p className="text-sm text-slate-800 truncate">{selected[id].name}</p>
                </div>
                <div className="w-28">
                  <Input type="number" min="1" placeholder="Qty" value={qtyDraft[id] || ''} onChange={e => setQtyDraft(prev => ({ ...prev, [id]: e.target.value }))} />
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          {step === 'pick' ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={selectedIds.length === 0} onClick={() => setStep('qty')} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                Next — {selectedIds.length} selected
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('pick')}>Back</Button>
              <Button disabled={!canConfirm} onClick={handleConfirm} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                Add {selectedIds.length} Sub Child Part{selectedIds.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Shared Add Material / Add Tool dialog — one repeatable list of rows (same
// "Add Another Material" staging pattern BOMCreationTab.jsx's own Add
// dialog uses), submitted together via onSubmit. The caller decides what
// "submit" means: append to local staged state (creation dialog) or POST
// each row live and refetch (drill-down) — this component only ever
// produces the finished row list, never calls an API itself.
function MaterialRowsDialog({ open, onClose, mode, inventoryItems, fabricationCategories, onSubmit, submitLabel }) {
  const [rows, setRows] = useState([{ ...emptyMaterialRow }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setRows([{ ...emptyMaterialRow }]); }, [open]);

  const matchFabricationFields = (match) => {
    if (!match.fabricationRef) return { ...emptyFabricationFields };
    const variants = (match.dimensionVariants || []).filter(v => !v.isLeftover);
    const dv = variants[0];
    return {
      fabricationRef: match.fabricationRef,
      fabricationCategory: dv?.category || '',
      fabricationDensity: dv ? { value: dv.densityValue, unit: dv.densityUnit } : null,
      weightUnitPrice: match.weightUnitPrice || 0,
      dimensionVariants: variants,
      dimensionVariantId: variants.length === 1 ? variants[0]._id : '',
      amountValue: '', amountUnit: '',
    };
  };

  const applyMatchToRow = (rowIndex, match) => {
    setRows(prev => {
      const next = [...prev];
      const row = next[rowIndex];
      next[rowIndex] = {
        ...row,
        code: match.code || '', item: match.name || row.item, itemType: match.itemType || '',
        unitType: match.unitType || getUnitTypeForUnit(match.unit) || row.unitType,
        unit: match.unit || row.unit,
        purchaseCostPerUnit: match.purchaseCost || 0,
        unitPrice: (match.fabricationRef || AMOUNT_UNIT_TYPES.includes(match.unitType || getUnitTypeForUnit(match.unit)))
          ? 0 : (match.purchaseCost || 0),
        ...matchFabricationFields(match),
      };
      return next;
    });
  };
  const updateRow = (rowIndex, patch) => setRows(prev => {
    const next = [...prev];
    next[rowIndex] = { ...next[rowIndex], ...patch };
    return next;
  });
  const addRow = () => setRows(prev => [...prev, { ...emptyMaterialRow }]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const fabricationDimsFilled = (row) => {
    if (row.fabricationRef) return !!row.dimensionVariantId && !!row.amountUnit && Number(row.amountValue) > 0;
    if (rowNeedsAmount(row)) return !!row.amountUnit && Number(row.amountValue) > 0;
    return true;
  };
  const rowsValid = rows.length > 0 && rows.every(r => r.code && r.item && r.quantity && r.unit && fabricationDimsFilled(r));
  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (r.unitPrice || 0), 0);

  const handleSubmit = async () => {
    if (!rowsValid) return;
    setSubmitting(true);
    try {
      await onSubmit(rows.map(row => ({ ...row, quantity: resolveSubmitQuantity(row) })));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{mode === 'tool' ? 'Add Consumables' : 'Add Assembly Materials'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">{mode === 'tool' ? 'Consumables' : 'Assembly Materials'}</label>
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
              <Plus className="h-3 w-3 mr-1" /> Add Another
            </Button>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase pt-2">{mode === 'tool' ? 'Consumable' : 'Assembly Material'} {idx + 1}</span>
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Inventory Item *</label>
                <InventoryItemPicker value={row.code} displayName={row.item} items={inventoryItems} onSelect={(m) => applyMatchToRow(idx, m)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type</label>
                  <Input value={row.unitType} disabled className="bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <Input value={row.unit} disabled className="bg-slate-50 text-slate-500" />
                </div>
              </div>

              {row.fabricationRef && (
                <FabricationVariantAmountFields row={row} categories={fabricationCategories} onUpdate={(patch) => updateRow(idx, patch)} />
              )}
              {!row.fabricationRef && rowNeedsAmount(row) && (
                <UnitAmountField row={row} onUpdate={(patch) => updateRow(idx, patch)} />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
                  <Input type="number" placeholder="0" min="0" value={row.quantity} onChange={e => updateRow(idx, { quantity: e.target.value })} className="bg-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Price <span className="text-[10px] text-slate-400 font-normal">(auto)</span></label>
                  <div className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
                    ₹{((Number(row.quantity) || 0) * (row.unitPrice || 0)).toLocaleString()}
                    <span className="text-[10px] text-slate-400 ml-1.5">(₹{row.unitPrice || 0}/unit)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {rows.length > 1 && (
            <div className="flex justify-between items-center px-1 text-sm">
              <span className="text-slate-500">Total ({rows.length})</span>
              <span className="font-semibold text-slate-800">₹{total.toLocaleString()}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!rowsValid || submitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            {submitting ? 'Saving...' : (submitLabel || `Add ${rows.length > 1 ? rows.length : ''}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const emptyCreateForm = { name: '', code: '', specification: '', image: '' };

export default function ChildPartMasterTab() {
  const qc = useQueryClient();
  const [selectedChildPartId, setSelectedChildPartId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);

  // Staged (not-yet-persisted) picks for the New Child Part dialog — flushed
  // sequentially through the live endpoints right after the Item/BOM shell
  // is created (mirrors BOMCreationTab.jsx's own "Add Material" staging).
  const [stagedSubChildParts, setStagedSubChildParts] = useState([]);
  const [stagedMaterials, setStagedMaterials] = useState([]);
  const [stagedTools, setStagedTools] = useState([]);
  const [stagedProcessDefinition, setStagedProcessDefinition] = useState([]);
  const [creating, setCreating] = useState(false);

  // Shared pickers — `pickerTarget` says where a confirmed pick goes:
  // 'stage' (still inside the New Child Part dialog) or 'live' (drill-down,
  // persists immediately).
  const [scpPickerOpen, setScpPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('stage');
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [matDialogMode, setMatDialogMode] = useState('raw'); // 'raw' | 'tool'

  const [editScpLine, setEditScpLine] = useState(null); // { _id, name, quantity }
  const [editScpQty, setEditScpQty] = useState('');
  const [editMatLine, setEditMatLine] = useState(null); // { _id, materialKind }
  const [editMatQty, setEditMatQty] = useState('');

  const [prodCostDraft, setProdCostDraft] = useState('');
  const [prodExpenseDraft, setProdExpenseDraft] = useState('');
  const [savingProdCost, setSavingProdCost] = useState(false);

  const [liveProcessDefinition, setLiveProcessDefinition] = useState([]);
  const [savingProcessDef, setSavingProcessDef] = useState(false);

  // Only Child Parts created through THIS tab ever appear here (see
  // childPartBOMController.js — gated on a ChildPartBOM document existing).
  const { data: listResponse } = useQuery({
    queryKey: ['child-part-masters'],
    queryFn: () => apiRequest('GET', '/api/rd/child-part-master'),
  });
  const childPartOptions = listResponse?.data || [];

  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['child-part-master', selectedChildPartId],
    queryFn: () => apiRequest('GET', `/api/rd/child-part-master/${selectedChildPartId}`),
    enabled: !!selectedChildPartId,
  });
  const selectedItem = detailResponse?.data?.item;
  const selectedBom = detailResponse?.data?.bom;
  const selectedCost = detailResponse?.data?.cost;
  const selectedWeight = detailResponse?.data?.weight;

  useEffect(() => {
    setProdCostDraft(selectedBom?.productionCost != null ? String(selectedBom.productionCost) : '');
    setProdExpenseDraft(selectedBom?.productionExpense != null ? String(selectedBom.productionExpense) : '');
  }, [selectedBom?._id, selectedBom?.productionCost, selectedBom?.productionExpense]);

  useEffect(() => {
    setLiveProcessDefinition(selectedBom?.processDefinition || []);
  }, [selectedBom?._id, selectedBom?.processDefinition]);

  // Same raw-material pool BOM Creation's own Add Raw Material draws from,
  // shared query key so it's not re-fetched per tab.
  const { data: inventoryResponse } = useQuery({
    queryKey: ['bom-inventory-items'],
    queryFn: () => apiRequest('GET', '/api/items?productKind=none&limit=1000'),
  });
  const inventoryItems = inventoryResponse?.items || [];
  const toolInventoryItems = inventoryItems.filter(m => /tool/i.test(m.itemType || ''));
  const rawInventoryItems = inventoryItems.filter(m => !/tool/i.test(m.itemType || ''));

  const { data: fabricationCategoriesResponse } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = fabricationCategoriesResponse?.data || [];

  // Every existing Sub Child Part, for the Add Sub Child picker's card grid.
  const { data: subChildPartsResponse } = useQuery({
    queryKey: ['sub-child-part-master', '', 1, 'picker'],
    queryFn: () => apiRequest('GET', '/api/rd/sub-child-parts'),
  });
  const subChildPartOptions = subChildPartsResponse?.data || [];

  const invalidateDetail = () => qc.invalidateQueries({ queryKey: ['child-part-master', selectedChildPartId] });

  const [imageUploadingCreate, setImageUploadingCreate] = useState(false);
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showSmartToast(new Error('Please select a file under 10MB'), 'File too large'); return; }
    setImageUploadingCreate(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest('POST', '/api/rd/child-parts/upload-file', fd);
      if (res.success && res.url) setForm(f => ({ ...f, image: res.url }));
    } catch (err) {
      showSmartToast(err, 'File upload failed');
    } finally {
      setImageUploadingCreate(false);
      e.target.value = '';
    }
  };

  const openCreate = async () => {
    setForm(emptyCreateForm);
    setStagedSubChildParts([]); setStagedMaterials([]); setStagedTools([]); setStagedProcessDefinition([]);
    setCreateOpen(true);
    try {
      const res = await apiRequest('GET', '/api/rd/child-part-master/generate-code');
      setForm(f => ({ ...f, code: res.code || '' }));
    } catch { /* code stays blank, user can type one */ }
  };

  const missingCreateReasons = [];
  if (!form.name.trim()) missingCreateReasons.push('Name');
  if (!form.code.trim()) missingCreateReasons.push('Code');
  if (!form.image) missingCreateReasons.push('Design File');
  const canCreate = missingCreateReasons.length === 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const res = await apiRequest('POST', '/api/rd/child-part-master', {
        name: form.name.trim(), code: form.code.trim(), image: form.image, specification: form.specification.trim(),
      });
      const newItemId = res.data.item._id;

      for (const line of stagedSubChildParts) {
        await apiRequest('POST', `/api/rd/child-part-master/${newItemId}/sub-child-parts`, {
          subChildPartId: line.subChildPartId, quantity: line.quantity,
        });
      }
      for (const row of stagedMaterials) {
        await apiRequest('POST', `/api/rd/child-part-master/${newItemId}/materials`, {
          code: row.code, item: row.item, itemType: row.itemType, quantity: row.quantity, unit: row.unit,
          dimensionVariantId: row.dimensionVariantId || null, amountValue: row.amountValue || null, amountUnit: row.amountUnit || null,
        });
      }
      for (const row of stagedTools) {
        await apiRequest('POST', `/api/rd/child-part-master/${newItemId}/materials`, {
          code: row.code, item: row.item, itemType: row.itemType, quantity: row.quantity, unit: row.unit,
          dimensionVariantId: row.dimensionVariantId || null, amountValue: row.amountValue || null, amountUnit: row.amountUnit || null,
        });
      }
      if (stagedProcessDefinition.length) {
        await apiRequest('PUT', `/api/rd/child-part-master/${newItemId}/process-definition`, { processDefinition: stagedProcessDefinition });
      }

      await qc.invalidateQueries({ queryKey: ['child-part-masters'] });
      setCreateOpen(false);
      setSelectedChildPartId(newItemId);
      showSuccessToast('Created', 'Child Part added.');
    } catch (err) {
      showSmartToast(err, 'Failed to create Child Part');
    } finally {
      setCreating(false);
    }
  };

  // Add Sub Child confirm — routes to local staging (create dialog) or a
  // live sequential POST (drill-down), same "one flow shape, two modes"
  // pattern as the Material/Tool dialogs below.
  const handleScpConfirm = async (rows) => {
    if (pickerTarget === 'stage') {
      setStagedSubChildParts(prev => [...prev, ...rows]);
      return;
    }
    try {
      for (const row of rows) {
        await apiRequest('POST', `/api/rd/child-part-master/${selectedChildPartId}/sub-child-parts`, {
          subChildPartId: row.subChildPartId, quantity: row.quantity,
        });
      }
      invalidateDetail();
      showSuccessToast('Added', 'Sub Child Part(s) added.');
    } catch (err) {
      showSmartToast(err, 'Failed to add Sub Child Part');
    }
  };

  const handleMaterialSubmit = async (rows) => {
    if (pickerTarget === 'stage') {
      if (matDialogMode === 'tool') setStagedTools(prev => [...prev, ...rows]);
      else setStagedMaterials(prev => [...prev, ...rows]);
      return;
    }
    try {
      for (const row of rows) {
        await apiRequest('POST', `/api/rd/child-part-master/${selectedChildPartId}/materials`, {
          code: row.code, item: row.item, itemType: row.itemType, quantity: row.quantity, unit: row.unit,
          dimensionVariantId: row.dimensionVariantId || null, amountValue: row.amountValue || null, amountUnit: row.amountUnit || null,
        });
      }
      invalidateDetail();
      showSuccessToast('Added', `${matDialogMode === 'tool' ? 'Consumable' : 'Assembly Material'}(s) added.`);
    } catch (err) {
      showSmartToast(err, `Failed to add ${matDialogMode === 'tool' ? 'Consumable' : 'Assembly Material'}`);
    }
  };

  const openScpPicker = (target) => { setPickerTarget(target); setScpPickerOpen(true); };
  const openMatDialog = (mode, target) => { setMatDialogMode(mode); setPickerTarget(target); setMatDialogOpen(true); };

  const removeStagedScp = (idx) => setStagedSubChildParts(prev => prev.filter((_, i) => i !== idx));
  const removeStagedMaterial = (idx) => setStagedMaterials(prev => prev.filter((_, i) => i !== idx));
  const removeStagedTool = (idx) => setStagedTools(prev => prev.filter((_, i) => i !== idx));

  const handleUpdateScpQty = async () => {
    if (!editScpLine || !(Number(editScpQty) > 0)) return;
    try {
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/sub-child-parts/${editScpLine._id}`, { quantity: Number(editScpQty) });
      invalidateDetail();
      setEditScpLine(null);
    } catch (err) {
      showSmartToast(err, 'Failed to update quantity');
    }
  };
  const handleDeleteScp = async (line) => {
    try {
      await apiRequest('DELETE', `/api/rd/child-part-master/${selectedChildPartId}/sub-child-parts/${line._id}`);
      invalidateDetail();
    } catch (err) { showSmartToast(err, 'Failed to remove'); }
  };
  const handleToggleScpDiscontinue = async (line) => {
    try {
      const action = line.isDiscontinued ? 'reactivate' : 'discontinue';
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/sub-child-parts/${line._id}/${action}`);
      invalidateDetail();
    } catch (err) { showSmartToast(err, 'Failed to update status'); }
  };

  const handleUpdateMatQty = async () => {
    if (!editMatLine || !(Number(editMatQty) > 0)) return;
    try {
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/materials/${editMatLine._id}`, { quantity: Number(editMatQty), code: editMatLine.code });
      invalidateDetail();
      setEditMatLine(null);
    } catch (err) {
      showSmartToast(err, 'Failed to update quantity');
    }
  };
  const handleDeleteMaterial = async (mat) => {
    try {
      await apiRequest('DELETE', `/api/rd/child-part-master/${selectedChildPartId}/materials/${mat._id}`);
      invalidateDetail();
    } catch (err) { showSmartToast(err, 'Failed to remove'); }
  };
  const handleToggleMatDiscontinue = async (mat) => {
    try {
      const action = mat.isDiscontinued ? 'reactivate' : 'discontinue';
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/materials/${mat._id}/${action}`);
      invalidateDetail();
    } catch (err) { showSmartToast(err, 'Failed to update status'); }
  };

  const handleSaveProductionCost = async () => {
    if (!selectedChildPartId) return;
    setSavingProdCost(true);
    try {
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/production-cost`, {
        productionCost: prodCostDraft === '' ? 0 : Number(prodCostDraft),
        productionExpense: prodExpenseDraft === '' ? 0 : Number(prodExpenseDraft),
      });
      invalidateDetail();
      showSuccessToast('Saved', 'Production Cost updated.');
    } catch (err) {
      showSmartToast(err, 'Failed to save Production Cost');
    } finally {
      setSavingProdCost(false);
    }
  };

  const handleSaveProcessDefinition = async () => {
    if (!selectedChildPartId) return;
    setSavingProcessDef(true);
    try {
      await apiRequest('PUT', `/api/rd/child-part-master/${selectedChildPartId}/process-definition`, { processDefinition: liveProcessDefinition });
      invalidateDetail();
      showSuccessToast('Saved', 'Process Definition updated.');
    } catch (err) {
      showSmartToast(err, 'Failed to save Process Definition');
    } finally {
      setSavingProcessDef(false);
    }
  };

  const rawMaterialLines = (selectedBom?.materials || []).filter(m => m.materialKind !== 'tool');
  const toolLines = (selectedBom?.materials || []).filter(m => m.materialKind === 'tool');

  const renderLineTable = (columns, rows, emptyMessage, renderRow) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {columns.map(c => <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-8 text-slate-400 text-sm">{emptyMessage}</td></tr>
          ) : rows.map(renderRow)}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-400 flex-1">
            A Child Part is assembled from Sub Child Parts plus its own assembly materials and consumables — reused across every Machine that references it.
          </span>
          <Button size="sm" variant="outline" onClick={() => setTemplateManagerOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" /> Process Templates
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Child Part
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Child Part</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedChildPartId}
              onChange={e => setSelectedChildPartId(e.target.value)}
            >
              <option value="">-- Select a Child Part --</option>
              {childPartOptions.map(cp => <option key={cp._id} value={cp._id}>{cp.code} — {cp.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedChildPartId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a Child Part to manage its Sub Child Parts, Assembly Materials, and Consumables — or create a new one.</p>
          </CardContent>
        </Card>
      ) : detailLoading ? (
        <p className="text-sm text-slate-400 text-center py-10">Loading…</p>
      ) : (
        <>
          <Card className="border-none shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              {selectedItem?.image ? (
                isPdfUrl(selectedItem.image)
                  ? <div className="h-10 w-10 rounded border bg-red-50 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-red-500" /></div>
                  : <img src={resolveMediaUrl(selectedItem.image)} alt="" className="h-10 w-10 rounded object-cover border flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0"><Package2 className="h-5 w-5 text-slate-400" /></div>
              )}
              <p className="font-semibold text-slate-900">
                {selectedItem?.name} <span className="font-mono text-xs text-blue-600 font-normal">{selectedItem?.code}</span>
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Total Cost</p>
              <p className="text-lg font-bold text-blue-800 mt-0.5">{fmtMoney(selectedCost?.totalCost)}</p>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
              <p className="text-xs text-teal-600 flex items-center gap-1"><Weight className="h-3.5 w-3.5" /> Total Weight</p>
              <p className="text-lg font-bold text-teal-800 mt-0.5">{fmtWeight(selectedWeight?.totalWeightKg)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Factory className="h-3.5 w-3.5" /> Production Cost</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{fmtMoney((selectedBom?.productionCost || 0) + (selectedBom?.productionExpense || 0))}</p>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Factory className="h-4 w-4 text-slate-500" /> Production Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Cost <span className="text-[10px] text-slate-400 font-normal">(assembly labor)</span></label>
                    <Input type="number" min="0" placeholder="0" value={prodCostDraft} onChange={e => setProdCostDraft(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Expense <span className="text-[10px] text-slate-400 font-normal">(other one-off costs)</span></label>
                    <Input type="number" min="0" placeholder="0" value={prodExpenseDraft} onChange={e => setProdExpenseDraft(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleSaveProductionCost} disabled={savingProdCost} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <Save className="h-4 w-4 mr-1.5" /> {savingProdCost ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <div className="mt-3">
                {selectedBom?.productionCostSource === 'Actual' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Actual — auto-filled from the last completed production run
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    R&D Estimate — will be overwritten once Production completes a build
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-500" /> Process Definition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-[11px] text-slate-400 -mt-1 mb-3">The numbers show build order — reorder with the ↑↓ arrows.</p>
              <ProcessDefinitionEditor
                bomLevel="ChildPart"
                value={liveProcessDefinition}
                onChange={setLiveProcessDefinition}
                materialLines={selectedBom?.materials || []}
                assemblyLines={selectedBom?.subChildParts || []}
              />
              <div className="mt-3">
                <Button onClick={handleSaveProcessDefinition} disabled={savingProcessDef} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <Save className="h-4 w-4 mr-1.5" /> {savingProcessDef ? 'Saving...' : 'Save Process Definition'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sub Child Part list */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-teal-600" /> Sub Child Parts
              </CardTitle>
              <Button size="sm" onClick={() => openScpPicker('live')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Sub Child</Button>
            </CardHeader>
            <CardContent className="p-0">
              {renderLineTable(
                ['Code', 'Name', 'Qty', 'Unit Cost', 'Total Cost', 'Unit Weight', 'Total Weight', 'Status', 'Actions'],
                selectedBom?.subChildParts || [],
                'No Sub Child Parts yet — click "Add Sub Child" to add one.',
                (line) => (
                  <tr key={line._id} className={`border-b border-slate-50 ${line.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{line.code}</span></td>
                    <td className="px-4 py-3 text-slate-800">{line.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{line.quantity} {line.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(line.unitCost)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{fmtMoney(line.totalPrice)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtWeightOrDash(line.unitWeightKg)}</td>
                    <td className="px-4 py-3 font-semibold text-teal-700">{fmtWeightOrDash(line.totalWeightKg)}</td>
                    <td className="px-4 py-3">
                      {line.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!line.isDiscontinued && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => { setEditScpLine(line); setEditScpQty(String(line.quantity)); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDeleteScp(line)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" title="Discontinue" onClick={() => handleToggleScpDiscontinue(line)}><Ban className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {line.isDiscontinued && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" title="Reactivate" onClick={() => handleToggleScpDiscontinue(line)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </CardContent>
          </Card>

          {/* Material list */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Package2 className="h-4 w-4 text-blue-600" /> Assembly Materials
              </CardTitle>
              <Button size="sm" onClick={() => openMatDialog('raw', 'live')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Assembly Material</Button>
            </CardHeader>
            <CardContent className="p-0">
              {renderLineTable(
                ['Code', 'Name', 'Qty', 'Unit', 'Price', 'Weight', 'Status', 'Actions'],
                rawMaterialLines,
                'No assembly materials added yet — click "Add Assembly Material" to add one.',
                (mat) => (
                  <tr key={mat._id} className={`border-b border-slate-50 ${mat.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{mat.code}</span></td>
                    <td className="px-4 py-3 text-slate-800">{mat.item}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{mat.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{mat.unit}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtMoney(mat.totalPrice)} <span className="text-[10px] text-slate-400">({fmtMoney(mat.unitPrice)}/unit)</span></td>
                    <td className="px-4 py-3 text-teal-700 font-semibold">{fmtWeightOrDash(mat.weightKg)}</td>
                    <td className="px-4 py-3">
                      {mat.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!mat.isDiscontinued && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => { setEditMatLine(mat); setEditMatQty(String(mat.quantity)); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDeleteMaterial(mat)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" title="Discontinue" onClick={() => handleToggleMatDiscontinue(mat)}><Ban className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {mat.isDiscontinued && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" title="Reactivate" onClick={() => handleToggleMatDiscontinue(mat)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </CardContent>
          </Card>

          {/* Tool list */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-600" /> Consumables
              </CardTitle>
              <Button size="sm" onClick={() => openMatDialog('tool', 'live')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Consumable</Button>
            </CardHeader>
            <CardContent className="p-0">
              {renderLineTable(
                ['Code', 'Name', 'Qty', 'Unit', 'Price', 'Weight', 'Status', 'Actions'],
                toolLines,
                'No consumables added yet — click "Add Consumable" to add one.',
                (mat) => (
                  <tr key={mat._id} className={`border-b border-slate-50 ${mat.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{mat.code}</span></td>
                    <td className="px-4 py-3 text-slate-800">{mat.item}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{mat.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{mat.unit}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtMoney(mat.totalPrice)} <span className="text-[10px] text-slate-400">({fmtMoney(mat.unitPrice)}/unit)</span></td>
                    <td className="px-4 py-3 text-teal-700 font-semibold">{fmtWeightOrDash(mat.weightKg)}</td>
                    <td className="px-4 py-3">
                      {mat.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!mat.isDiscontinued && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => { setEditMatLine(mat); setEditMatQty(String(mat.quantity)); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDeleteMaterial(mat)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" title="Discontinue" onClick={() => handleToggleMatDiscontinue(mat)}><Ban className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {mat.isDiscontinued && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" title="Reactivate" onClick={() => handleToggleMatDiscontinue(mat)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* New Child Part dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Child Part</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Body Assembly" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Code</label>
                <Input className="mt-1 font-mono" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Specification</label>
                <Input className="mt-1" value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} placeholder="optional" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Design File <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2 mt-1">
                  {form.image ? (
                    isPdfUrl(form.image)
                      ? <div className="h-9 w-9 rounded border bg-red-50 flex items-center justify-center flex-shrink-0"><FileText className="h-4 w-4 text-red-500" /></div>
                      : <img src={resolveMediaUrl(form.image)} alt="" className="h-9 w-9 rounded object-cover border flex-shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded border bg-slate-50 flex items-center justify-center flex-shrink-0"><FileText className="h-4 w-4 text-slate-300" /></div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-xs text-blue-600 hover:underline">{imageUploadingCreate ? 'Uploading...' : form.image ? 'Replace' : 'Upload'}</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageUpload} disabled={imageUploadingCreate} />
                  </label>
                  {form.image && (
                    <button type="button" title="Remove" onClick={() => setForm(f => ({ ...f, image: '' }))} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Boxes className="h-4 w-4 text-teal-600" /> Sub Child Parts</label>
                <Button type="button" size="sm" variant="outline" onClick={() => openScpPicker('stage')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Sub Child</Button>
              </div>
              {stagedSubChildParts.length === 0 ? (
                <p className="text-xs text-slate-400">None added yet.</p>
              ) : stagedSubChildParts.map((line, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span><span className="font-mono text-blue-700">{line.code}</span> — {line.name} × {line.quantity}</span>
                  <button type="button" onClick={() => removeStagedScp(idx)} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Package2 className="h-4 w-4 text-blue-600" /> Assembly Materials</label>
                <Button type="button" size="sm" variant="outline" onClick={() => openMatDialog('raw', 'stage')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Assembly Material</Button>
              </div>
              {stagedMaterials.length === 0 ? (
                <p className="text-xs text-slate-400">None added yet.</p>
              ) : stagedMaterials.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span><span className="font-mono text-blue-700">{row.code}</span> — {row.item} × {row.quantity} {row.unit}</span>
                  <button type="button" onClick={() => removeStagedMaterial(idx)} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Wrench className="h-4 w-4 text-purple-600" /> Consumables</label>
                <Button type="button" size="sm" variant="outline" onClick={() => openMatDialog('tool', 'stage')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Consumable</Button>
              </div>
              {stagedTools.length === 0 ? (
                <p className="text-xs text-slate-400">None added yet.</p>
              ) : stagedTools.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                  <span><span className="font-mono text-blue-700">{row.code}</span> — {row.item} × {row.quantity} {row.unit}</span>
                  <button type="button" onClick={() => removeStagedTool(idx)} className="text-slate-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Layers className="h-4 w-4 text-slate-500" /> Process Definition</label>
              <p className="text-[11px] text-slate-400">The numbers show build order — reorder with the ↑↓ arrows. Materials/Sub Child Parts become pickable for an Out Source step after this Child Part is saved.</p>
              <ProcessDefinitionEditor
                bomLevel="ChildPart"
                value={stagedProcessDefinition}
                onChange={setStagedProcessDefinition}
                materialLines={[]}
                assemblyLines={[]}
              />
            </div>
          </div>
          {missingCreateReasons.length > 0 && (
            <p className="text-xs text-amber-600 text-right -mb-1">Still needed: {missingCreateReasons.join(', ')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate || creating} onClick={handleCreate} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {creating ? 'Creating...' : 'Create Child Part'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubChildPartPickerModal
        open={scpPickerOpen}
        onClose={() => setScpPickerOpen(false)}
        items={subChildPartOptions}
        excludeIds={pickerTarget === 'stage'
          ? stagedSubChildParts.map(l => l.subChildPartId)
          : (selectedBom?.subChildParts || []).filter(l => !l.isDiscontinued).map(l => String(l.subChildPart))}
        onConfirm={handleScpConfirm}
      />

      <MaterialRowsDialog
        open={matDialogOpen}
        onClose={() => setMatDialogOpen(false)}
        mode={matDialogMode}
        inventoryItems={matDialogMode === 'tool' ? toolInventoryItems : rawInventoryItems}
        fabricationCategories={fabricationCategories}
        onSubmit={handleMaterialSubmit}
        submitLabel={`Add ${matDialogMode === 'tool' ? 'Consumable(s)' : 'Assembly Material(s)'}`}
      />

      {/* Edit Sub Child Part quantity */}
      <Dialog open={!!editScpLine} onOpenChange={(o) => !o && setEditScpLine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Quantity — {editScpLine?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-xs text-slate-500">Quantity</label>
            <Input type="number" min="1" className="mt-1" value={editScpQty} onChange={e => setEditScpQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScpLine(null)}>Cancel</Button>
            <Button onClick={handleUpdateScpQty} disabled={!(Number(editScpQty) > 0)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material/Tool quantity — a fabrication line's quantity is
          always a piece count; a non-fabrication Length/Area/Volume line's
          quantity is the TOTAL amount (Amount × Pieces, see
          resolveSubmitQuantity) — labeled explicitly so editing it here
          doesn't get mistaken for a piece count. */}
      <Dialog open={!!editMatLine} onOpenChange={(o) => !o && setEditMatLine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Quantity — {editMatLine?.item}</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-xs text-slate-500">
              {editMatLine?.fabricationCategory
                ? 'Quantity (pieces)'
                : editMatLine?.amountValue != null
                  ? `Quantity — total amount (${editMatLine.amountUnit || editMatLine.unit || ''})`
                  : 'Quantity'}
            </label>
            <Input type="number" min="1" className="mt-1" value={editMatQty} onChange={e => setEditMatQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMatLine(null)}>Cancel</Button>
            <Button onClick={handleUpdateMatQty} disabled={!(Number(editMatQty) > 0)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessTemplateManagerDialog
        bomLevel="ChildPart"
        open={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
      />
    </div>
  );
}
