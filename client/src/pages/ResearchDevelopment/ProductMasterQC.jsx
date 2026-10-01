import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronDown, ClipboardList, Factory, AlertTriangle } from 'lucide-react';
import MasterChecklistPanel from '@/components/qc/MasterChecklistPanel';
import ChecklistPickerDialog from '@/components/qc/ChecklistPickerDialog';
import StepChecklistCards, { useItemQcSteps, ChecklistRowSummary } from '@/components/qc/StepChecklistCards';

const MODULE = 'productMaster';
const FEATURE = 'qcProductMaster';
// Same eligibility gate BOM Management itself uses (rdController.js's
// createBOM / rdChildPartController.js's MANUFACTURING_SOURCE_TYPES) — only
// a manufactured product has a BOM, and therefore QC steps. Everything else
// (Purchase Machine, Job Work*, or unset) gets the Final checklist only —
// deliberately NOT the separate purchase/internalManufacturing radio on the
// Add/Edit form, which isn't kept in sync with this (confirmed 2026-08-31,
// see qc-module-restructure-client-request.md's follow-on).
//
// QC multi-checkpoint redesign (2026-09-25): two master lists now, Process +
// Final (Initial removed). A manufactured machine's Final checklist stays
// item-level and is checked at the one Final QC step R&D picks on its
// Machine BOM; every other QC-flagged BOM step gets its own checklist from
// the Process master (StepChecklistCards). The old legacy-RDBOM per-part
// Initial/Process accordion is gone — per-step QC needs a Machine BOM.
const MANUFACTURING_SOURCE_TYPES = ['In House Manufacturing', 'Out Source Manufactured'];

// Same cascade Product Master's own list filter uses (categoryOptionsFor/
// pSourceOptionsFor there) — mirrored here so this page's product picker can
// be narrowed by Category/Sub Category/Product Source Type too (confirmed
// 2026-09-02). Note the field-name quirk carried over from toMachineResponse:
// a machine's own `pType` is the UI's "Category", `category` is "Sub
// Category".
const categoryOptionsFor = (pTypeVal, masterOptions) =>
  (masterOptions.Category || []).filter(o => o.parentValue === pTypeVal);
const pSourceOptionsFor = (categoryVal, masterOptions) =>
  (masterOptions.PSourceType || []).filter(o => o.parentValue === categoryVal);

export default function ProductMasterQC() {
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', FEATURE, 'add');
  const canEdit = hasFeatureAccess('rnd', FEATURE, 'edit');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [masterTab, setMasterTab] = useState('process');
  const [finalPickerOpen, setFinalPickerOpen] = useState(false);
  const [filterPType, setFilterPType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPSourceType, setFilterPSourceType] = useState('');

  const { data: masterOptionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const masterOptions = masterOptionsResponse?.data || {};

  // No page/limit params -> full unfiltered list, same convention the old
  // QualityParameters.jsx page relied on for its Product Master group.
  const { data: productsResponse } = useQuery({
    queryKey: ['qc-product-master-items'],
    queryFn: () => apiRequest('GET', '/api/rd/machines'),
  });
  const products = (productsResponse?.data || []).filter(p => !p.isDiscontinued);
  const visibleProducts = products.filter(p =>
    (!filterPType || p.pType === filterPType) &&
    (!filterCategory || p.category === filterCategory) &&
    (!filterPSourceType || p.pSourceType === filterPSourceType)
  );
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

  // Which Machine BOM step the Final checklist is checked at (shared query
  // with StepChecklistCards below — one request).
  const hasMachineBOM = !!partsData?.hasMachineBOM;
  const { data: qcStepsResponse } = useItemQcSteps(MODULE, hasMachineBOM ? selectedProductId : null);
  const finalStep = qcStepsResponse?.data?.finalStep;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" /> Product Master QC
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Purchase/Job Work products get a Final checklist only; manufactured products also get a checklist for every QC step flagged on their Machine BOM</p>
        </div>
        <Button variant="outline" onClick={() => setMasterDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Master Checklists
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-2 pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex-shrink-0">Filter by:</span>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterPType}
              onChange={e => { setFilterPType(e.target.value); setFilterCategory(''); setFilterPSourceType(''); setSelectedProductId(''); }}
            >
              <option value="">All Categories</option>
              {(masterOptions.PType || []).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              value={filterCategory}
              disabled={!filterPType}
              onChange={e => { setFilterCategory(e.target.value); setFilterPSourceType(''); setSelectedProductId(''); }}
            >
              <option value="">{filterPType ? 'All Sub Categories' : 'Select Category first'}</option>
              {categoryOptionsFor(filterPType, masterOptions).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              value={filterPSourceType}
              disabled={!filterCategory}
              onChange={e => { setFilterPSourceType(e.target.value); setSelectedProductId(''); }}
            >
              <option value="">{filterCategory ? 'All Product Source Types' : 'Select Sub Category first'}</option>
              {pSourceOptionsFor(filterCategory, masterOptions).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            {(filterPType || filterCategory || filterPSourceType) && (
              <button
                onClick={() => { setFilterPType(''); setFilterCategory(''); setFilterPSourceType(''); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          <label className="text-sm font-semibold text-slate-700 mb-2 mt-3 block">Select Product</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              <option value="">-- Select a product --</option>
              {visibleProducts.map(p => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
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
                {hasMachineBOM && (
                  finalStep ? (
                    <p className="text-xs text-purple-700 mt-1">
                      Checked at the Final QC step: <span className="font-medium">{finalStep.category} › {finalStep.step}</span>
                      {finalStep.alsoProcessQc && <span className="text-slate-500"> (also has its own step checklist below)</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> No Final QC step picked on this machine's BOM yet — set one in BOM Management.
                    </p>
                  )
                )}
              </div>
              {(canAdd || canEdit) && (
                <Button size="sm" onClick={() => setFinalPickerOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
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

          {/* QC step checklists — manufactured products with a Machine BOM */}
          {isManufactured && (
            hasMachineBOM ? (
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">QC Step Checklists</h2>
                  <p className="text-xs text-slate-500 mt-0.5">One checklist per step flagged QC on this machine's BOM, picked from the Process master list.</p>
                </div>
                <StepChecklistCards
                  module={MODULE} itemId={selectedProductId} itemCode={selectedProduct?.code}
                  canManage={canAdd || canEdit}
                  onManageMaster={() => { setMasterTab('process'); setMasterDialogOpen(true); }}
                />
              </div>
            ) : (
              <Card className="border-none shadow-sm">
                <CardContent className="py-8 text-center text-slate-400 text-sm max-w-md mx-auto">
                  {partsData?.hasBOM
                    ? 'This machine still uses the legacy BOM. Per-step QC checklists need a Machine BOM — build one under BOM Management → Machine BOM.'
                    : 'No BOM created yet for this product — build its Machine BOM in BOM Management first.'}
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {/* Manage Master Checklists — Process (every QC step's checklist is
          picked from it) + Final (the whole product). Initial removed. */}
      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Master Checklists — Product Master QC</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">Two shared lists — Process feeds every QC step's own checklist; Final applies to the whole product (and is the only one Purchase/Job Work products use).</p>
          <Tabs value={masterTab} onValueChange={setMasterTab}>
            <TabsList>
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="final">Final</TabsTrigger>
            </TabsList>
            <TabsContent value="process"><MasterChecklistPanel module={MODULE} stage="process" featureKey={FEATURE} /></TabsContent>
            <TabsContent value="final"><MasterChecklistPanel module={MODULE} stage="final" featureKey={FEATURE} /></TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final checklist picker (product-level) — step checklists have their
          own picker inside StepChecklistCards */}
      <ChecklistPickerDialog
        open={finalPickerOpen}
        onOpenChange={setFinalPickerOpen}
        module={MODULE}
        stage="final"
        targetPath={finalTargetPath}
        title={`Final Checklist — ${selectedProduct?.code || ''}`}
        emptyMasterHint="No check items defined yet for the Final Checklist."
        onManageMaster={() => { setMasterTab('final'); setMasterDialogOpen(true); }}
      />
    </div>
  );
}
