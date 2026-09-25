import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Package2, Settings2, Ban, RefreshCw, Scissors } from 'lucide-react';
import SubChildPartSheetPlanModal from '@/pages/ResearchDevelopment/BOMManagement/SubChildPartSheetPlanModal';
import { summarizeProcessDefinition } from '@/components/inventory/ProcessDefinitionEditor';

// Inventory-side view of the new Sub Child Part Master (see
// SubChildPartMasterTab.jsx in BOM Management, where these are actually
// created/defined). Same 3-tier Material Flow / Min Stock / Order Qty
// "Flow Management" pattern Child Part Inventory already uses — stock
// management stays generic-Item-shaped regardless of what kind of part it
// is. Sheet Metal Plan (for a sheet-metal-sourced Sub Child Part) attaches
// here too, per the client's own placement (see
// SubChildPartSheetPlanModal.jsx) — gated on the source material being a
// Fabrication Master (sheet metal) item.
const FLOW_MIN_STOCK_DEFAULTS = { 'High Flow': 20, 'Medium Flow': 10, 'Low Flow': 5 };
const flowBadgeColor = {
  'High Flow': 'bg-red-100 text-red-700 border-red-200',
  'Medium Flow': 'bg-amber-100 text-amber-700 border-amber-200',
  'Low Flow': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function SubChildPartMasterInventoryTab({ readOnly = false }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [manageItem, setManageItem] = useState(null);
  const [manageForm, setManageForm] = useState({ materialFlow: '', minStock: 0, reorderQty: 0 });
  const [sheetPlanItem, setSheetPlanItem] = useState(null);

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ['sub-child-part-master-inventory', search],
    queryFn: () => apiRequest('GET', `/api/rd/sub-child-parts?includeDiscontinued=true${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  const items = itemsResponse?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-child-part-master-inventory'] });
      toast({ title: 'Updated' });
      setManageItem(null);
    },
    onError: (e) => toast({ title: 'Failed to update', description: e?.message, variant: 'destructive' }),
  });

  const openManage = (item) => {
    setManageItem(item);
    setManageForm({
      materialFlow: item.materialFlow || '',
      minStock: item.minStock || 0,
      reorderQty: item.reorderQty || 0,
    });
  };

  // Re-resolves against the latest fetched list so the Sheet Metal Plan
  // summary (scrapCost) reflects a just-saved plan without closing/reopening
  // this dialog — `manageItem` itself is a point-in-time snapshot taken when
  // the dialog opened.
  const liveManageItem = (manageItem && items.find(i => i._id === manageItem._id)) || manageItem;

  const handleFlowChange = (value) => {
    setManageForm(prev => ({ ...prev, materialFlow: value, minStock: value ? FLOW_MIN_STOCK_DEFAULTS[value] : prev.minStock }));
  };

  const handleSaveManage = () => {
    updateMutation.mutate({
      id: manageItem._id,
      data: {
        materialFlow: manageForm.materialFlow,
        minStock: Number(manageForm.minStock) || 0,
        reorderQty: Number(manageForm.reorderQty) || 0,
      },
    });
  };

  const toggleDiscontinued = (item) => {
    updateMutation.mutate({ id: item._id, data: { isDiscontinued: !item.isDiscontinued } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name or code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <span className="text-xs text-slate-400 ml-auto">
              Defined in BOM Management — one source material each, outsourced or built in-house.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Code</TableHead>
                <TableHead>Source Material</TableHead>
                <TableHead>Job Work</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Material Flow</TableHead>
                <TableHead>Status</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={readOnly ? 6 : 7} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={readOnly ? 6 : 7} className="text-center py-10 text-slate-400">No Sub Child Parts yet — create one from BOM Management.</TableCell></TableRow>
              ) : items.map(item => {
                const d = item.subChildPartDetails || {};
                return (
                  <TableRow key={item._id} className={item.isDiscontinued ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.image ? (
                          <img src={item.image.startsWith('http') ? item.image : `${config.baseURL}${item.image}`} alt="" className="h-8 w-8 rounded object-cover border border-slate-200" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center"><Package2 className="h-4 w-4 text-slate-400" /></div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs font-mono text-slate-400">{item.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {d.sourceItem?.name || '—'}{d.sourceQty ? ` (${d.sourceQty} ${d.sourceUnit})` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={summarizeProcessDefinition(d.processDefinition) === 'Not defined' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                        {summarizeProcessDefinition(d.processDefinition)}
                      </Badge>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(d.processDefinition || []).flatMap(c => c.internalProcesses || []).map(p => (
                          <span key={p.name} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{p.name}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{item.qty ?? 0} {item.unit}</TableCell>
                    <TableCell>
                      {item.materialFlow ? (
                        <Badge variant="outline" className={flowBadgeColor[item.materialFlow]}>{item.materialFlow}</Badge>
                      ) : <span className="text-xs text-slate-400">Not set</span>}
                    </TableCell>
                    <TableCell>
                      {item.isDiscontinued
                        ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Discontinued</Badge>
                        : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openManage(item)}>
                            <Settings2 className="h-3.5 w-3.5 mr-1" /> Flow
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleDiscontinued(item)}>
                            {item.isDiscontinued ? <RefreshCw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manage Stock — Material Flow / Min Stock / Order Qty, identical
          shape to Child Part Inventory's own modal, plus a Sheet Metal Plan
          section for a sheet-metal-sourced Sub Child Part (see
          SubChildPartSheetPlanModal.jsx). */}
      <Dialog open={!!manageItem} onOpenChange={(open) => !open && setManageItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Stock — {manageItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-500">Material Flow</label>
              <Select value={manageForm.materialFlow} onValueChange={handleFlowChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Flow" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High Flow">High Flow</SelectItem>
                  <SelectItem value="Medium Flow">Medium Flow</SelectItem>
                  <SelectItem value="Low Flow">Low Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Min Stock</label>
                <Input type="number" min="0" className="mt-1" value={manageForm.minStock}
                  onChange={(e) => setManageForm(prev => ({ ...prev, minStock: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Order Quantity</label>
                <Input type="number" min="0" className="mt-1" value={manageForm.reorderQty}
                  onChange={(e) => setManageForm(prev => ({ ...prev, reorderQty: e.target.value }))} />
              </div>
            </div>

            {liveManageItem?.subChildPartDetails?.sourceItem?.fabricationRef && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5" /> Sheet Metal Plan
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSheetPlanItem(liveManageItem)}>
                    {liveManageItem.subChildPartDetails.scrapCost > 0 ? 'Edit Plan' : 'Plan Usage'}
                  </Button>
                </div>
                {liveManageItem.subChildPartDetails.scrapCost > 0 ? (
                  <p className="text-xs text-slate-500">
                    Avg scrap cost per piece: <strong className="text-slate-700">₹{liveManageItem.subChildPartDetails.scrapCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">No cutting plan saved yet for this sheet-metal source material.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageItem(null)}>Cancel</Button>
            <Button disabled={updateMutation.isPending} onClick={handleSaveManage}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sheetPlanItem && (
        <SubChildPartSheetPlanModal
          open={!!sheetPlanItem}
          onClose={() => setSheetPlanItem(null)}
          subChildPartId={sheetPlanItem._id}
          subChildPartName={sheetPlanItem.name}
          sourceItem={sheetPlanItem.subChildPartDetails?.sourceItem}
          sourceDimensionVariantId={sheetPlanItem.subChildPartDetails?.sourceDimensionVariantId}
        />
      )}
    </div>
  );
}
