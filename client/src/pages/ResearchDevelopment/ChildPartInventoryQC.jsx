import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { config } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronDown, ClipboardList, Settings2, CheckSquare, Hash, Layers, FileText, Wrench } from 'lucide-react';
import MasterChecklistPanel from '@/components/qc/MasterChecklistPanel';
import ChecklistPickerDialog from '@/components/qc/ChecklistPickerDialog';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

// Compact "quick look" line — same format Product Master QC's old per-part
// panel used: name · Grade X · Brand Y · qty unit.
function MaterialLine({ item, materialGrade, brand, quantity, unit }) {
  return (
    <p className="text-xs text-slate-500">
      {item}{materialGrade ? ` · Grade ${materialGrade}` : ''}{brand ? ` · ${brand}` : ''} · {quantity} {unit}
    </p>
  );
}

// Read-only "what this Child Part is made of" — Sub Child Parts (with each
// one's own design file, matching the old per-part panel exactly) + Materials
// & Tools — live off ChildPartBOM, never stored by this QC feature.
function CompositionCard({ selectedItemId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['qc-child-part-reference', selectedItemId],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/child-part/${selectedItemId}/reference`),
    enabled: !!selectedItemId,
  });
  const subChildParts = data?.data?.subChildParts || [];
  const materials = data?.data?.materials || [];

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">Composition</CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">What this Child Part is built from — read live off BOM Management</p>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
        ) : subChildParts.length === 0 && materials.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No BOM defined yet for this Child Part.</div>
        ) : (
          <>
            {subChildParts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Sub Child Parts</p>
                <div className="space-y-2">
                  {subChildParts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.code} — {s.name}</p>
                        <p className="text-xs text-slate-500">{s.quantity} {s.unit}</p>
                      </div>
                      {s.image && (
                        <a href={resolveMediaUrl(s.image)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 flex-shrink-0">
                          <FileText className="h-3.5 w-3.5" /> Design File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {materials.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Materials &amp; Tools</p>
                <div className="space-y-1">
                  {materials.map((m, i) => <MaterialLine key={i} {...m} />)}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// A Child Part's Initial/Process QC checklist is ONE canonical entry keyed to
// its own Inventory Item (productKind 'ChildPart'), part ids null — this is
// its own genuinely independent module ('childPart'), NOT shared with
// Product Master QC's own module the way the old "Sub Child Part Inventory
// QC" tab used to be (renamed/rescoped 2026-09-14 — see
// server/docs/qc-module-restructure-client-request.md's follow-on). Product
// Master QC's own Child Part/Sub Child Part accordion is untouched and still
// reads the legacy RDChildPart/RDBOM tree separately — this module doesn't
// feed it and isn't fed by it.
//
// UI deliberately mirrors QCChecklistModule.jsx's own dropdown-select
// pattern (the "Sub Child Part" tab right next to this one) instead of a
// scrollable list — pick one Child Part, see/manage its checklist — just
// duplicated across two cards (Initial + Process) since this module is
// staged, unlike Sub Child Part QC's flat single checklist.
const MODULE = 'childPart';
const STAGE_LABELS = { initial: 'Initial Checklist', process: 'Process Checklist' };

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

function StageChecklistCard({ stage, selectedItemId, canManage, onManage }) {
  const targetPath = selectedItemId ? `item/${selectedItemId}` : null;
  const { data, isLoading } = useQuery({
    queryKey: ['qc-target-checklist', MODULE, stage, targetPath],
    queryFn: () => apiRequest('GET', `/api/rd/qc-checklist/${MODULE}/${stage}/${targetPath}`),
    enabled: !!targetPath,
  });
  const selected = data?.data?.selected || [];

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">{STAGE_LABELS[stage]}</CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={onManage}>
            <Settings2 className="h-4 w-4 mr-1.5" /> Manage Checklist
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
        ) : selected.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No checks selected yet.</div>
        ) : (
          <div className="space-y-2">
            {selected.map(row => <ChecklistRowSummary key={String(row.masterItemId)} row={row} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChildPartInventoryQC() {
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', 'qcChildPart', 'add');
  const canEdit = hasFeatureAccess('rnd', 'qcChildPart', 'edit');
  const canManage = canAdd || canEdit;

  const [selectedItemId, setSelectedItemId] = useState('');
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [masterTab, setMasterTab] = useState('initial');
  const [picker, setPicker] = useState(null); // { stage, title }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['child-part-qc-list'],
    queryFn: () => apiRequest('GET', '/api/rd/qc-checklist/child-part-list'),
  });
  const items = (data?.data || []).filter(i => !i.isDiscontinued);
  const selectedItem = items.find(i => String(i._id) === selectedItemId);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setMasterDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Master Checklist
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Child Part</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
            >
              <option value="">-- Select a Child Part --</option>
              {items.map(i => <option key={i._id} value={i._id}>{i.code} — {i.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-red-500">
            {error?.message || 'Failed to load Child Parts.'}
          </CardContent>
        </Card>
      ) : !selectedItemId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{isLoading ? 'Loading…' : 'Select a Child Part to view or configure its QC checklist'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedItem?.code}</span>
              <span className="font-semibold text-slate-800">{selectedItem?.name}</span>
            </div>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> {selectedItem?.machineCount ?? 0} machine{(selectedItem?.machineCount ?? 0) === 1 ? '' : 's'} using it
            </span>
          </div>

          <CompositionCard selectedItemId={selectedItemId} />

          <StageChecklistCard
            stage="initial" selectedItemId={selectedItemId} canManage={canManage}
            onManage={() => setPicker({ stage: 'initial', title: `Initial Checklist — ${selectedItem?.code}` })}
          />
          <StageChecklistCard
            stage="process" selectedItemId={selectedItemId} canManage={canManage}
            onManage={() => setPicker({ stage: 'process', title: `Process Checklist — ${selectedItem?.code}` })}
          />
        </>
      )}

      {picker && (
        <ChecklistPickerDialog
          open={!!picker}
          onOpenChange={(o) => !o && setPicker(null)}
          module={MODULE}
          stage={picker.stage}
          targetPath={`item/${selectedItemId}`}
          title={picker.title}
          emptyMasterHint={`No ${STAGE_LABELS[picker.stage]} checks defined yet.`}
          onManageMaster={() => { setMasterTab(picker.stage); setMasterDialogOpen(true); }}
        />
      )}

      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Master Checklist — Child Part QC</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">One shared list of possible checks — editing one here updates it everywhere it's already been selected.</p>
          <Tabs value={masterTab} onValueChange={setMasterTab}>
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="initial">Initial</TabsTrigger>
              <TabsTrigger value="process">Process</TabsTrigger>
            </TabsList>
            <TabsContent value="initial" className="mt-3">
              <MasterChecklistPanel module={MODULE} stage="initial" featureKey="qcChildPart" />
            </TabsContent>
            <TabsContent value="process" className="mt-3">
              <MasterChecklistPanel module={MODULE} stage="process" featureKey="qcChildPart" />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
