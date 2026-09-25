import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronUp, ChevronDown, ShieldCheck } from 'lucide-react';

// Shared Category -> Internal Process picker for all three BOM Management
// tabs (Sub Child Part / Child Part / Machine) — see
// server/docs/process-inhouse-outsource-redesign-discussion-2026-09.md.
// Pure controlled component, same pattern as FabricationVariantAmountFields/
// UnitAmountField: the page owns the value and its own save mutation, this
// only ever calls onChange with the next full array.
//
// This is a PICKER only — it selects from the master Category/Internal
// Process catalog, it never creates new catalog entries itself. Catalog
// management (add/rename/delete categories and steps) lives in its own
// screen, ProcessTemplateManagerDialog.jsx, reached via a "Process
// Templates" button on each tab — confirmed with the user 2026-09-22: BOM
// creation should only ever be selecting from an already-built template, not
// growing the template inline.
//
// value shape: [{ label, internalProcesses: [{ name, type: 'InHouse'|
// 'OutSource', materialSource: 'ExplicitMaterials'|'AssembledPart',
// materialRefs: [id], materialQuantities: [{ref, qty}], qcRequired: boolean
// }] }]. Ordering is array position — no explicit sequence field, matching
// this codebase's one existing convention (ProductionOrder.js's hardcoded
// step arrays).
//
// qcRequired: exactly one internal process across the WHOLE definition (not
// per-category) is the QC checkpoint — confirmed with the user 2026-09-22:
// one checklist, one point, not "mandatory final gate plus optional extras".
// Never shown for Sub Child Part — its QC point is always implicitly the
// last step, a fixed rule, not a per-BOM R&D choice.
//
// materialLines/assemblyLines (Child Part / Machine only — both omitted for
// Sub Child Part, which has no lines of its own, its one sourceItem is the
// implicit material regardless of step) are this BOM's own already-built
// rows — materialLines = raw Materials/Tools, assemblyLines = the
// sub-assembly references (a Child Part's subChildParts[], a Machine's
// childParts[]). materialRefs only ever references these by _id, never
// re-derives a quantity.
//
// The picker applies to EVERY internal process now (2026-09-23, generalized
// off Out-Source-only — see ProcessDefinitionSchema.js's own comment for the
// full reasoning: an In-House step had no material association at all,
// which is what let Production start work without ever issuing material).
// The very first internal process overall (first category, first process)
// has nothing built before it, so it always shows the picker with no
// "includes the assembled part" choice at all (forced ExplicitMaterials,
// enforced server-side too) — every OTHER step gets that choice, and picking
// materials/sub-assemblies is independently available regardless of it
// (2026-09-23 — the two used to be mutually exclusive, no longer are: a step
// can genuinely need both the assembled sub-build and something extra on
// top of it). A sub-assembly reference (assemblyLines only, never a plain
// material line) can only ever be picked by ONE step across the whole
// definition — chips already claimed by an earlier step render disabled
// here, computed live by walking the definition in its current order, so
// reordering/deleting steps during editing can't leave anything stale.
// Confirmed with the user 2026-09-22/23 — categories aren't guaranteed to be
// one continuous chain (two categories can build separate things that only
// meet at a later one), so this is deliberately NOT a "once assembled,
// nothing later can pick materials" rule, which would wrongly block that.
export function summarizeProcessDefinition(processDefinition) {
  const all = (processDefinition || []).flatMap(c => c.internalProcesses || []);
  if (all.length === 0) return 'Not defined';
  const hasOut = all.some(p => p.type === 'OutSource');
  const hasIn = all.some(p => p.type === 'InHouse');
  if (hasOut && hasIn) return 'Hybrid';
  return hasOut ? 'Outsourced' : 'In-House';
}

export default function ProcessDefinitionEditor({ bomLevel, value, onChange, materialLines = [], assemblyLines = [], disabled = false }) {
  const categories = value || [];

  const { data: catalogResponse } = useQuery({
    queryKey: ['process-category-options', bomLevel],
    queryFn: () => apiRequest('GET', `/api/rd/process-category-options?bomLevel=${bomLevel}`),
    enabled: !!bomLevel,
  });
  const catalog = catalogResponse?.data || [];

  const setCategories = (next) => onChange(next);

  const addCategory = (label) => {
    if (categories.some(c => c.label === label)) return;
    setCategories([...categories, { label, internalProcesses: [] }]);
  };
  const removeCategory = (label) => setCategories(categories.filter(c => c.label !== label));
  const moveCategory = (index, dir) => {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
  };

  const updateCategory = (label, patch) => {
    setCategories(categories.map(c => (c.label === label ? { ...c, ...patch } : c)));
  };

  const addInternalProcess = (categoryLabel, name) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat || cat.internalProcesses.some(p => p.name === name)) return;
    updateCategory(categoryLabel, { internalProcesses: [...cat.internalProcesses, { name, type: 'InHouse', materialSource: 'ExplicitMaterials', materialRefs: [], materialQuantities: [], qcRequired: false }] });
  };
  const removeInternalProcess = (categoryLabel, name) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    updateCategory(categoryLabel, { internalProcesses: cat.internalProcesses.filter(p => p.name !== name) });
  };
  const moveInternalProcess = (categoryLabel, index, dir) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    const next = [...cat.internalProcesses];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateCategory(categoryLabel, { internalProcesses: next });
  };
  const setProcessType = (categoryLabel, name, type) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    updateCategory(categoryLabel, { internalProcesses: cat.internalProcesses.map(p => (p.name === name ? { ...p, type } : p)) });
  };
  // No longer clears materialRefs on switching to 'AssembledPart' (corrected
  // 2026-09-23 — the two aren't mutually exclusive anymore, see this file's
  // own header comment: a step can genuinely need both the assembled
  // sub-build and something extra on top of it).
  const setMaterialSource = (categoryLabel, name, materialSource) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    updateCategory(categoryLabel, {
      internalProcesses: cat.internalProcesses.map(p => (p.name === name ? { ...p, materialSource } : p)),
    });
  };
  // Exactly one internal process across the WHOLE process definition can be
  // the QC checkpoint (confirmed with the user 2026-09-22 — one checklist,
  // one point, not per-category) — so this touches every category, not just
  // the one the clicked step belongs to. Clicking the already-flagged step
  // clears it back to none; clicking a different step moves the flag there.
  const setQcCheckpoint = (categoryLabel, name) => {
    setCategories(categories.map(c => ({
      ...c,
      internalProcesses: c.internalProcesses.map(p => {
        const isTarget = c.label === categoryLabel && p.name === name;
        return { ...p, qcRequired: isTarget ? !p.qcRequired : false };
      }),
    })));
  };
  const toggleProcessMaterial = (categoryLabel, name, materialId) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    updateCategory(categoryLabel, {
      internalProcesses: cat.internalProcesses.map(p => {
        if (p.name !== name) return p;
        const has = (p.materialRefs || []).includes(materialId);
        return {
          ...p,
          materialRefs: has ? p.materialRefs.filter(id => id !== materialId) : [...(p.materialRefs || []), materialId],
          // Drop this ref's quantity split (if any) the moment it's
          // unpicked — nothing left to allocate a quantity against.
          materialQuantities: has ? (p.materialQuantities || []).filter(q => q.ref !== materialId) : (p.materialQuantities || []),
        };
      }),
    });
  };
  // Only meaningful once a material/tool line (never a sub-assembly — those
  // use the "total qty" pool rule, not a split) is picked by more than one
  // step (2026-09-23, worked example: a BOM line of 4 nut-bolts, 2 + 2
  // across two steps) — see this file's render logic for where that's
  // detected. An empty/non-numeric value clears the entry, falling back to
  // "no explicit split recorded for this step" (server rejects a save where
  // that's still required — see processDefinitionValidation.js).
  const setProcessMaterialQuantity = (categoryLabel, name, materialId, rawQty) => {
    const cat = categories.find(c => c.label === categoryLabel);
    if (!cat) return;
    const qty = rawQty === '' ? undefined : Number(rawQty);
    updateCategory(categoryLabel, {
      internalProcesses: cat.internalProcesses.map(p => {
        if (p.name !== name) return p;
        const rest = (p.materialQuantities || []).filter(q => q.ref !== materialId);
        const next = (qty !== undefined && Number.isFinite(qty)) ? [...rest, { ref: materialId, qty }] : rest;
        return { ...p, materialQuantities: next };
      }),
    });
  };

  const availableCategoryOptions = catalog.filter(o => !categories.some(c => c.label === o.label));

  const totalProcesses = categories.reduce((sum, c) => sum + c.internalProcesses.length, 0);
  const qcCheckpointCount = categories.reduce((sum, c) => sum + c.internalProcesses.filter(p => p.qcRequired).length, 0);

  // Live pool-depletion for assembly-reference chips (2026-09-23) — each
  // reference can only ever be claimed by one step across the whole
  // definition; walking in current array order (the same order execution
  // runs in) tells each step's own card which chips are already gone,
  // with no new stored state — correct automatically through reordering or
  // deleting a step mid-edit. See this file's own header comment.
  const assemblyIdSet = new Set(assemblyLines.map(a => a._id));
  const consumedBeforeStep = new Map(); // "catIndex:procIndex" -> Set(ids already consumed by an earlier step)
  const consumedSoFar = new Set();
  categories.forEach((cat, ci) => {
    cat.internalProcesses.forEach((proc, pi) => {
      consumedBeforeStep.set(`${ci}:${pi}`, new Set(consumedSoFar));
      for (const refId of (proc.materialRefs || [])) {
        if (assemblyIdSet.has(refId)) consumedSoFar.add(refId);
      }
    });
  });

  // A material/tool line only needs a quantity input once it's actually
  // referenced by more than one step (2026-09-23) — a single-step pick
  // stays exactly as simple as it's always been, implicit full quantity.
  const materialRefCounts = new Map(); // material id -> how many steps reference it
  categories.forEach(cat => {
    cat.internalProcesses.forEach(proc => {
      for (const refId of (proc.materialRefs || [])) {
        if (!assemblyIdSet.has(refId)) materialRefCounts.set(refId, (materialRefCounts.get(refId) || 0) + 1);
      }
    });
  });

  return (
    <div className="space-y-3">
      {bomLevel !== 'SubChildPart' && totalProcesses > 0 && (
        <p className={`text-[11px] ${qcCheckpointCount === 1 ? 'text-slate-400' : 'text-amber-600 font-medium'}`}>
          {qcCheckpointCount === 1
            ? 'One step is flagged as the QC Checkpoint — the only QC review this build gets, wherever it sits.'
            : 'Flag exactly one step as the QC Checkpoint before saving.'}
        </p>
      )}
      {categories.length === 0 && catalog.length > 0 && (
        <p className="text-xs text-slate-400 italic">No process categories picked yet — add one below.</p>
      )}
      {categories.map((cat, catIndex) => {
        const catalogOption = catalog.find(o => o.label === cat.label);
        const availableProcessOptions = (catalogOption?.internalProcesses || []).filter(
          n => !cat.internalProcesses.some(p => p.name === n)
        );
        return (
          <div key={cat.label} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white text-[11px] font-semibold flex-shrink-0">{catIndex + 1}</span>
                {cat.label}
              </p>
              {!disabled && (
                <div className="flex items-center gap-1">
                  <button type="button" disabled={catIndex === 0} onClick={() => moveCategory(catIndex, -1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" disabled={catIndex === categories.length - 1} onClick={() => moveCategory(catIndex, 1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeCategory(cat.label)} className="text-slate-400 hover:text-red-500 ml-1"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-2">
              {cat.internalProcesses.map((proc, procIndex) => (
                <div key={proc.name} className="rounded-md border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold flex-shrink-0">{procIndex + 1}</span>
                      {proc.name}
                    </span>
                    <div className="flex items-center gap-3">
                      {bomLevel !== 'SubChildPart' && (
                        <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${proc.qcRequired ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                          <Checkbox
                            disabled={disabled}
                            checked={!!proc.qcRequired}
                            onCheckedChange={() => setQcCheckpoint(cat.label, proc.name)}
                          />
                          <ShieldCheck className="h-3.5 w-3.5" /> QC Checkpoint
                        </label>
                      )}
                      <RadioGroup
                        disabled={disabled}
                        value={proc.type}
                        onValueChange={(v) => setProcessType(cat.label, proc.name, v)}
                        className="flex items-center gap-3"
                      >
                        <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${proc.type === 'InHouse' ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                          <RadioGroupItem value="InHouse" />
                          In-House
                        </label>
                        <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${proc.type === 'OutSource' ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                          <RadioGroupItem value="OutSource" />
                          Out Source
                        </label>
                      </RadioGroup>
                      {!disabled && (
                        <div className="flex items-center gap-1">
                          <button type="button" disabled={procIndex === 0} onClick={() => moveInternalProcess(cat.label, procIndex, -1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                          <button type="button" disabled={procIndex === cat.internalProcesses.length - 1} onClick={() => moveInternalProcess(cat.label, procIndex, 1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => removeInternalProcess(cat.label, proc.name)} className="text-slate-400 hover:text-red-500 ml-1"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {bomLevel === 'SubChildPart' && (
                    <p className="text-[10px] text-slate-400 mt-1.5">Ships/consumes this Sub Child Part's own source material — implicit, not per-step.</p>
                  )}
                  {bomLevel !== 'SubChildPart' && (() => {
                    const isFirstStepOverall = catIndex === 0 && procIndex === 0;
                    const materialSource = proc.materialSource || 'ExplicitMaterials';
                    const includesAssembled = materialSource === 'AssembledPart';
                    const hasAnyLines = materialLines.length > 0 || assemblyLines.length > 0;
                    const consumedByEarlier = consumedBeforeStep.get(`${catIndex}:${procIndex}`) || new Set();
                    return (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        {!isFirstStepOverall && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-600 mb-2">
                            <Checkbox
                              disabled={disabled}
                              checked={includesAssembled}
                              onCheckedChange={() => setMaterialSource(cat.label, proc.name, includesAssembled ? 'ExplicitMaterials' : 'AssembledPart')}
                            />
                            Includes the assembled part built so far
                          </label>
                        )}
                        {!hasAnyLines ? (
                          <p className="text-[10px] text-slate-400">No materials or sub-assemblies on this BOM yet to pick from.</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
                              {includesAssembled ? 'Additional materials for this step (optional)' : 'Materials for this step'}
                            </p>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {assemblyLines.map(a => {
                                const active = (proc.materialRefs || []).includes(a._id);
                                if (!active && consumedByEarlier.has(a._id)) {
                                  return (
                                    <span key={a._id} title="Already consumed by an earlier step"
                                      className="text-xs px-2 py-0.5 rounded-full border border-slate-100 text-slate-300 bg-slate-50 line-through cursor-not-allowed">
                                      {a.code} — {a.name}
                                    </span>
                                  );
                                }
                                return (
                                  <button type="button" key={a._id} disabled={disabled}
                                    onClick={() => toggleProcessMaterial(cat.label, proc.name, a._id)}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                                    {a.code} — {a.name}
                                  </button>
                                );
                              })}
                              {materialLines.map(m => {
                                const active = (proc.materialRefs || []).includes(m._id);
                                const shared = (materialRefCounts.get(m._id) || 0) > 1;
                                const qtyEntry = (proc.materialQuantities || []).find(q => q.ref === m._id);
                                return (
                                  <span key={m._id} className="inline-flex items-center gap-1">
                                    <button type="button" disabled={disabled}
                                      onClick={() => toggleProcessMaterial(cat.label, proc.name, m._id)}
                                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${active ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                                      {m.code} — {m.item}
                                    </button>
                                    {active && shared && (
                                      <input
                                        type="number" min="0" disabled={disabled}
                                        placeholder="qty"
                                        value={qtyEntry?.qty ?? ''}
                                        onChange={e => setProcessMaterialQuantity(cat.label, proc.name, m._id, e.target.value)}
                                        title={`Shared across ${materialRefCounts.get(m._id)} steps — this BOM's own quantity is ${m.quantity} ${m.unit}, split across them.`}
                                        className="w-14 h-5 text-[11px] border border-amber-300 rounded px-1"
                                      />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {!disabled && availableProcessOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {availableProcessOptions.map(name => (
                  <button type="button" key={name} onClick={() => addInternalProcess(cat.label, name)}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-blue-300 hover:text-blue-600">
                    + {name}
                  </button>
                ))}
              </div>
            )}
            {!disabled && (catalogOption?.internalProcesses || []).length === 0 && (
              <p className="text-[11px] text-slate-400 italic mt-2">No steps defined for this category yet — use "Process Templates" above to add some.</p>
            )}
          </div>
        );
      })}

      {!disabled && availableCategoryOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {availableCategoryOptions.map(o => (
            <button type="button" key={o.label} onClick={() => addCategory(o.label)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600">
              + {o.label}
            </button>
          ))}
        </div>
      )}
      {!disabled && catalog.length === 0 && (
        <p className="text-xs text-slate-400 italic">No process categories defined yet — use the "Process Templates" button above to create some first.</p>
      )}
    </div>
  );
}
