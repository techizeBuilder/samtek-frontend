import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ClipboardList, Settings2, CheckSquare, Hash, Package } from 'lucide-react';
import MasterChecklistPanel from './MasterChecklistPanel';
import ChecklistPickerDialog from './ChecklistPickerDialog';

// One shared implementation for every "select which checks apply to this
// item, off one module-wide master checklist" QC page — Inventory QC /
// Motor Master QC are both just this component pointed at a different item
// universe (module='inventory'/'motorMaster', always stage='default' — see
// qcChecklistController.js's QC_MODULE_STAGES). Product Master QC's staged
// (initial/process/final) + per-Sub-Child-Part flow is different enough to
// be its own page (ProductMasterQC.jsx), but it reuses the same
// MasterChecklistPanel/ChecklistPickerDialog primitives this component is
// built from, so a fix to either helps every module at once.
export default function QCChecklistModule({ module, featureKey, title, description, icon: Icon = Package, itemsEndpoint }) {
  const stage = 'default';
  const API = `/api/rd/qc-checklist/${module}/${stage}`;
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', featureKey, 'add');
  const canEdit = hasFeatureAccess('rnd', featureKey, 'edit');

  const [selectedItemId, setSelectedItemId] = useState('');
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);

  const { data: itemsResponse } = useQuery({
    queryKey: ['qc-module-items', module],
    queryFn: () => apiRequest('GET', itemsEndpoint),
  });
  const items = (itemsResponse?.items || itemsResponse?.data || []).filter(i => !i.isDiscontinued);
  const selectedItem = items.find(i => String(i._id) === selectedItemId);
  const targetPath = selectedItemId ? `item/${selectedItemId}` : null;

  const { data: itemChecklistResponse, isLoading: itemChecklistLoading } = useQuery({
    queryKey: ['qc-target-checklist', module, stage, targetPath],
    queryFn: () => apiRequest('GET', `${API}/${targetPath}`),
    enabled: !!targetPath,
  });
  const selectedRows = itemChecklistResponse?.data?.selected || [];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Icon className="h-6 w-6 text-blue-600" /> {title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{description}</p>
        </div>
        <Button variant="outline" onClick={() => setMasterDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-1.5" /> Manage Master Checklist
        </Button>
      </div>

      {/* Item Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Item</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
            >
              <option value="">-- Select an item --</option>
              {items.map(i => <option key={i._id} value={i._id}>{i.code} — {i.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedItemId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select an item to view or configure its QC checklist</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedItem?.code}</span>
              <span className="font-semibold text-slate-800">{selectedItem?.name}</span>
            </div>
            {(canAdd || canEdit) && (
              <Button size="sm" onClick={() => setItemDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <Settings2 className="h-4 w-4 mr-1.5" /> Manage Checklist
              </Button>
            )}
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Assigned Checklist</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Checks selected for this item from the {title} master checklist</p>
            </CardHeader>
            <CardContent className="p-5">
              {itemChecklistLoading ? (
                <div className="text-center py-10 text-slate-400">Loading…</div>
              ) : selectedRows.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No checks selected yet. Click "Manage Checklist" to choose which checks apply to this item.</div>
              ) : (
                <div className="space-y-2">
                  {selectedRows.map(row => (
                    <div key={String(row.masterItemId)} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Manage Master Checklist Dialog */}
      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Master Checklist — {title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2">One shared list of possible checks — editing one here updates it everywhere it's already been selected.</p>
          <MasterChecklistPanel module={module} stage={stage} featureKey={featureKey} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Item Checklist Dialog */}
      <ChecklistPickerDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        module={module}
        stage={stage}
        targetPath={targetPath}
        title={`Manage Checklist — ${selectedItem?.code || ''}`}
        emptyMasterHint={`No check items defined yet for ${title}.`}
        onManageMaster={() => setMasterDialogOpen(true)}
      />
    </div>
  );
}
