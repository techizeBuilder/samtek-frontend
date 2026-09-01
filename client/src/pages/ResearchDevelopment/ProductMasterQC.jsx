import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { config } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ChevronDown, ClipboardList, Factory, CheckSquare, Hash, FileText } from 'lucide-react';
import MasterChecklistPanel from '@/components/qc/MasterChecklistPanel';
import ChecklistPickerDialog from '@/components/qc/ChecklistPickerDialog';

const MODULE = 'productMaster';
const FEATURE = 'qcProductMaster';
// Same eligibility gate BOM Management itself uses (rdController.js's
// createBOM / rdChildPartController.js's MANUFACTURING_SOURCE_TYPES) — a
// product only has real Child Part/Sub Child Part data, and therefore only
// gets Initial/Process stages, when its P-Source Type is one of these two.
// Everything else (Purchase Machine, Job Work*, or unset) gets Final only —
// deliberately NOT the separate purchase/internalManufacturing radio on the
// Add/Edit form, which isn't kept in sync with this (confirmed 2026-08-31,
// see qc-module-restructure-client-request.md's follow-on).
const MANUFACTURING_SOURCE_TYPES = ['In House Manufacturing', 'Out Source Manufactured'];

const STAGE_LABELS = { initial: 'Initial Checklist', process: 'Process Checklist', final: 'Final Checklist' };

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

export default function ProductMasterQC() {
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', FEATURE, 'add');
  const canEdit = hasFeatureAccess('rnd', FEATURE, 'edit');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [masterTab, setMasterTab] = useState('initial');
  const [picker, setPicker] = useState(null); // { stage, targetPath, title }

  // No page/limit params -> full unfiltered list, same convention the old
  // QualityParameters.jsx page relied on for its Product Master group.
  const { data: productsResponse } = useQuery({
    queryKey: ['qc-product-master-items'],
    queryFn: () => apiRequest('GET', '/api/rd/machines'),
  });
  const products = (productsResponse?.data || []).filter(p => !p.isDiscontinued);
  const selectedProduct = products.find(p => String(p._id) === selectedProductId);

  const { data: partsResponse, isLoading: partsLoading } = useQuery({
    queryKey: ['qc-product-parts', selectedProductId],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${MODULE}/parts/${selectedProductId}`),
    enabled: !!selectedProductId,
  });
  const partsData = partsResponse?.data;
  const isManufactured = !!partsData && MANUFACTURING_SOURCE_TYPES.includes(partsData.productSourceType);

  const finalTargetPath = selectedProductId ? `item/${selectedProductId}` : null;
  const { data: finalChecklistResponse, isLoading: finalLoading } = useQuery({
    queryKey: ['qc-target-checklist', MODULE, 'final', finalTargetPath],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${MODULE}/final/${finalTargetPath}`),
    enabled: !!finalTargetPath,
  });
  const finalSelected = finalChecklistResponse?.data?.selected || [];

  const openFinalPicker = () => setPicker({
    stage: 'final', targetPath: finalTargetPath,
    title: `Final Checklist — ${selectedProduct?.code}`,
  });
  // The picker is opened directly off an already-rendered Sub Child Part
  // row's own button — no separate Child Part/Sub Child Part selector
  // anywhere, the target is already fixed by which row's button was clicked
  // (confirmed 2026-08-31 — same convention BOM Management's own Add
  // Material form deliberately isn't reused here).
  const openPartPicker = (stage, cp, scp) => setPicker({
    stage, targetPath: `item/${selectedProductId}/part/${cp._id}/${scp._id}`,
    title: `${STAGE_LABELS[stage]} — ${scp.name}`,
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" /> Product Master QC
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Purchase/Job Work products get a Final checklist only; in-house/outsource manufactured products also get Initial and Process checklists per Sub Child Part</p>
        </div>
        <Button variant="outline" onClick={() => setMasterDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Master Checklists
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Product</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              <option value="">-- Select a product --</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedProductId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Factory className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a product to view or configure its QC checklist</p>
          </CardContent>
        </Card>
      ) : partsLoading ? (
        <div className="text-center py-10 text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedProduct?.code}</span>
              <span className="font-semibold text-slate-800">{selectedProduct?.name}</span>
              <Badge variant="outline" className="text-xs">{partsData?.productSourceType || 'P-Source Type not set'}</Badge>
            </div>
          </div>

          {/* Final Checklist — every product gets this, purchase or manufactured */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">Final Checklist</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Whole assembled/purchased product — machine vibration, electric load, quality, quantity...</p>
              </div>
              {(canAdd || canEdit) && (
                <Button size="sm" onClick={openFinalPicker} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Checklist
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {finalLoading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
              ) : finalSelected.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">No checks selected yet.</div>
              ) : (
                <div className="space-y-2">
                  {finalSelected.map(row => <ChecklistRowSummary key={String(row.masterItemId)} row={row} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Initial + Process — manufactured products only */}
          {isManufactured && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-slate-50 pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Child Parts</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Initial and Process checks, configured per Sub Child Part — material/grade/brand/qty/design file read live from this product's BOM</p>
              </CardHeader>
              <CardContent className="p-5">
                {!partsData.hasBOM ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No BOM created yet for this product — build one in BOM Management first.</div>
                ) : partsData.childParts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No Child Parts yet — add them in BOM Management first.</div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {partsData.childParts.map(cp => (
                      <AccordionItem key={cp._id} value={cp._id} className="border border-slate-100 rounded-lg px-3">
                        <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:no-underline">
                          {cp.code} — {cp.name}
                          {cp.isDiscontinued && <Badge variant="outline" className="ml-2 text-xs">Discontinued</Badge>}
                        </AccordionTrigger>
                        <AccordionContent>
                          {cp.subChildParts.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No sub child parts yet — add one in BOM Management to configure its checklist.</p>
                          ) : (
                            <div className="space-y-2 pb-2">
                              {cp.subChildParts.map(scp => (
                                <div key={scp._id} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {scp.code} — {scp.name}
                                        {scp.isDiscontinued && <Badge variant="outline" className="ml-2 text-xs">Discontinued</Badge>}
                                      </p>
                                      {scp.materials.length > 0 ? (
                                        <div className="mt-1 space-y-0.5">
                                          {scp.materials.map((m, i) => (
                                            <p key={i} className="text-xs text-slate-500">
                                              {m.item}{m.materialGrade ? ` · Grade ${m.materialGrade}` : ''}{m.brand ? ` · ${m.brand}` : ''} · {m.quantity} {m.unit}
                                            </p>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-400 mt-1">No BOM material lines under this part yet</p>
                                      )}
                                    </div>
                                    {scp.image && (
                                      <a href={resolveMediaUrl(scp.image)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 flex-shrink-0">
                                        <FileText className="h-3.5 w-3.5" /> Design File
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2.5">
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPartPicker('initial', cp, scp)}>
                                      Initial Checklist {scp.initialCount > 0 && <Badge className="ml-1.5 h-4 px-1 text-[10px]">{scp.initialCount}</Badge>}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPartPicker('process', cp, scp)}>
                                      Process Checklist {scp.processCount > 0 && <Badge className="ml-1.5 h-4 px-1 text-[10px]">{scp.processCount}</Badge>}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Manage Master Checklists — 3 tabs, one master list per stage */}
      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Master Checklists — Product Master QC</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">Three shared lists — Initial and Process apply per Sub Child Part, Final applies to the whole product (and is the only one Purchase/Job Work products use).</p>
          <Tabs value={masterTab} onValueChange={setMasterTab}>
            <TabsList>
              <TabsTrigger value="initial">Initial</TabsTrigger>
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="final">Final</TabsTrigger>
            </TabsList>
            <TabsContent value="initial"><MasterChecklistPanel module={MODULE} stage="initial" featureKey={FEATURE} /></TabsContent>
            <TabsContent value="process"><MasterChecklistPanel module={MODULE} stage="process" featureKey={FEATURE} /></TabsContent>
            <TabsContent value="final"><MasterChecklistPanel module={MODULE} stage="final" featureKey={FEATURE} /></TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Picker — reused for Final (product-level) and Initial/Process (part-level) */}
      {picker && (
        <ChecklistPickerDialog
          open={!!picker}
          onOpenChange={(v) => !v && setPicker(null)}
          module={MODULE}
          stage={picker.stage}
          targetPath={picker.targetPath}
          title={picker.title}
          emptyMasterHint={`No check items defined yet for ${STAGE_LABELS[picker.stage]}.`}
          onManageMaster={() => { setMasterTab(picker.stage); setMasterDialogOpen(true); }}
          // ChecklistPickerDialog only invalidates its own target + master
          // queries — it has no idea this page also shows Initial/Process
          // counts as badges on the Child Parts accordion (a separate query,
          // qc-product-parts), so that badge went stale until a hard refresh
          // without this.
          onSaved={() => qc.invalidateQueries({ queryKey: ['qc-product-parts', selectedProductId] })}
        />
      )}
    </div>
  );
}

function ChecklistRowSummary({ row }) {
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
