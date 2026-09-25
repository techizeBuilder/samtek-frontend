import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { config } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ClipboardList, Settings2, CheckSquare, Hash, Boxes, FileText } from 'lucide-react';
import MasterChecklistPanel from '@/components/qc/MasterChecklistPanel';
import ChecklistPickerDialog from '@/components/qc/ChecklistPickerDialog';

// Sub Child Part's own QC checklist — a genuinely independent module
// ('subChildPart'), flat single checklist (its own order flow is a single
// order-level Assign/Start/Complete cycle, no stages — see
// subChildPartOrderService.js). NOT the generic QCChecklistModule.jsx (the
// "Inventory" tab's own component) — this needs its own Composition
// reference panel (the one raw material it's built from), which a fully
// generic shared component shouldn't carry.
const MODULE = 'subChildPart';
const FEATURE = 'qcSubChildPart';
const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

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

// Read-only "what this Sub Child Part is made of" — the one raw material it's
// built from (grade/brand/qty) plus this part's own design file — same
// compact format Product Master QC's old per-part panel used, live off
// Item.subChildPartDetails, never stored by this QC feature.
function CompositionCard({ selectedItemId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['qc-sub-child-part-reference', selectedItemId],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/sub-child-part/${selectedItemId}/reference`),
    enabled: !!selectedItemId,
  });
  const material = data?.data?.material || null;
  const image = data?.data?.image || null;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">Composition</CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">What this Sub Child Part is built from — read live off BOM Management</p>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
        ) : !material ? (
          <div className="text-center py-6 text-slate-400 text-sm">No source material defined yet for this Sub Child Part.</div>
        ) : (
          <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
            <p className="text-sm text-slate-700">
              {material.name}
              {material.code && <span className="text-xs text-slate-400 font-mono ml-1.5">({material.code})</span>}
              {material.materialGrade ? ` · Grade ${material.materialGrade}` : ''}
              {material.brand ? ` · ${material.brand}` : ''}
              {` · ${material.quantity} ${material.unit}`}
            </p>
            {image && (
              <a href={resolveMediaUrl(image)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 flex-shrink-0">
                <FileText className="h-3.5 w-3.5" /> Design File
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SubChildPartInventoryQC() {
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', FEATURE, 'add');
  const canEdit = hasFeatureAccess('rnd', FEATURE, 'edit');
  const canManage = canAdd || canEdit;

  const [selectedItemId, setSelectedItemId] = useState('');
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['qc-module-items', MODULE],
    queryFn: () => apiRequest('GET', '/api/items?productKind=SubChildPart&limit=1000'),
  });
  const items = (data?.items || data?.data || []).filter(i => !i.isDiscontinued);
  const selectedItem = items.find(i => String(i._id) === selectedItemId);
  const targetPath = selectedItemId ? `item/${selectedItemId}` : null;

  const { data: checklistResp, isLoading: checklistLoading } = useQuery({
    queryKey: ['qc-target-checklist', MODULE, 'default', targetPath],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${MODULE}/default/${targetPath}`),
    enabled: !!targetPath,
  });
  const selectedRows = checklistResp?.data?.selected || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setMasterDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Master Checklist
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Sub Child Part</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
            >
              <option value="">-- Select a Sub Child Part --</option>
              {items.map(i => <option key={i._id} value={i._id}>{i.code} — {i.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-red-500">
            {error?.message || 'Failed to load Sub Child Parts.'}
          </CardContent>
        </Card>
      ) : !selectedItemId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{isLoading ? 'Loading…' : 'Select a Sub Child Part to view or configure its QC checklist'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedItem?.code}</span>
              <span className="font-semibold text-slate-800">{selectedItem?.name}</span>
            </div>
          </div>

          <CompositionCard selectedItemId={selectedItemId} />

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Assigned Checklist</CardTitle>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                  <Settings2 className="h-4 w-4 mr-1.5" /> Manage Checklist
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {checklistLoading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
              ) : selectedRows.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">No checks selected yet.</div>
              ) : (
                <div className="space-y-2">
                  {selectedRows.map(row => <ChecklistRowSummary key={String(row.masterItemId)} row={row} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ChecklistPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        module={MODULE}
        stage="default"
        targetPath={targetPath}
        title={`Manage Checklist — ${selectedItem?.code || ''}`}
        emptyMasterHint="No check items defined yet for Sub Child Part QC."
        onManageMaster={() => setMasterDialogOpen(true)}
      />

      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Master Checklist — Sub Child Part QC</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">One shared list of possible checks — editing one here updates it everywhere it's already been selected.</p>
          <MasterChecklistPanel module={MODULE} stage="default" featureKey={FEATURE} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
