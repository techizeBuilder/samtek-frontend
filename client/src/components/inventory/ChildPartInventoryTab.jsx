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
import { Search, Package2, Settings2, Layers, Ban, RefreshCw, IndianRupee } from 'lucide-react';

// Rebuilt from scratch (2026-09) — the old file (SubChildPartInventoryTab.jsx)
// carried a stale name from before the BOM hierarchy rename and was never
// actually rewritten, just relabeled on screen. Its underlying fields were
// confirmed correct and kept unchanged (Stock/Material Flow/Manage Stock all
// still feed the same live reorder cron they always have — untouched, out
// of scope for this pass); what's genuinely new here is telling apart the
// two flows a Child Part can now come from (see bom-hierarchy-redesign-
// 2026-09.md §4, §9): the OLD per-machine flow (RDChildPart) and the NEW
// standalone Child Part Master catalog (ChildPartBOM) — both write
// Item.productKind:'ChildPart', so both still show up here side by side,
// but each gets its own "Used In" vs "Composition" view.
const FLOW_MIN_STOCK_DEFAULTS = { 'High Flow': 20, 'Medium Flow': 10, 'Low Flow': 5 };
const flowBadgeColor = {
  'High Flow': 'bg-red-100 text-red-700 border-red-200',
  'Medium Flow': 'bg-amber-100 text-amber-700 border-amber-200',
  'Low Flow': 'bg-slate-100 text-slate-600 border-slate-200',
};
const fmtMoney = (n) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// `readOnly` (Store's own tab — see store/Inventory/tabs/ChildPartTab.jsx)
// hides Manage Stock and the Discontinue toggle; everything else (search,
// stock/flow columns, Used In/Composition) stays the same view R&D gets.
export default function ChildPartInventoryTab({ readOnly = false }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [manageItem, setManageItem] = useState(null);
  const [manageForm, setManageForm] = useState({ materialFlow: '', minStock: 0, reorderQty: 0 });
  const [compositionItem, setCompositionItem] = useState(null); // new-flow "Composition"

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ['child-part-inventory', search],
    queryFn: () => apiRequest('GET', `/api/rd/sub-child-part-inventory?includeDiscontinued=true${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  const items = itemsResponse?.data || [];

  // Which of these Child Parts came from the NEW Child Part Master catalog —
  // reuses that tab's own dropdown-list endpoint (a Child Part only ever
  // appears there once it has a ChildPartBOM document), so telling the two
  // flows apart here stays entirely frontend-only, no backend change needed.
  const { data: mastersResponse } = useQuery({
    queryKey: ['child-part-masters'],
    queryFn: () => apiRequest('GET', '/api/rd/child-part-master?includeDiscontinued=true'),
  });
  const masterIds = new Set((mastersResponse?.data || []).map(m => m._id));

  // Lazily fetched only once the Composition dialog is actually opened —
  // avoids an N+1 fetch across every row on initial render.
  const { data: compositionResponse, isLoading: compositionLoading } = useQuery({
    queryKey: ['child-part-master', compositionItem?._id],
    queryFn: () => apiRequest('GET', `/api/rd/child-part-master/${compositionItem._id}`),
    enabled: !!compositionItem,
  });
  const compositionBom = compositionResponse?.data?.bom;
  const compositionCost = compositionResponse?.data?.cost;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['child-part-inventory'] });
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
              Built by Production, stocked by Store. "Master" Child Parts (built in the new BOM Management tab) show a Composition
              summary; "Old" ones (the per-machine flow) show which machines reference them, unchanged.
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
                <TableHead>Source</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Material Flow</TableHead>
                <TableHead>Used In / Composition</TableHead>
                <TableHead>Status</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={readOnly ? 6 : 7} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={readOnly ? 6 : 7} className="text-center py-10 text-slate-400">No Child Parts yet.</TableCell></TableRow>
              ) : items.map(item => {
                const isMaster = masterIds.has(item._id);
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
                    <TableCell>
                      <Badge variant="outline" className={isMaster ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                        {isMaster ? 'Master' : 'Old'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.qty ?? 0} {item.unit}</TableCell>
                    <TableCell>
                      {item.materialFlow ? (
                        <Badge variant="outline" className={flowBadgeColor[item.materialFlow]}>{item.materialFlow}</Badge>
                      ) : <span className="text-xs text-slate-400">Not set</span>}
                    </TableCell>
                    <TableCell>
                      {isMaster ? (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setCompositionItem(item)}>
                          <Layers className="h-3.5 w-3.5" /> Composition
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
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

      {/* Manage Stock — Material Flow / Min Stock / Order Qty, unchanged:
          same 3-field shape, same PUT /api/items/:id save, same live reorder
          cron underneath it (subChildPartReorderService.js) — not touched by
          this rebuild. */}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageItem(null)}>Cancel</Button>
            <Button disabled={updateMutation.isPending} onClick={handleSaveManage}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Composition — NEW-flow Child Parts only: a quick summary of its own
          ChildPartBOM (see BOMManagement/ChildPartMasterTab.jsx), so you
          don't have to leave Inventory just to see what it's built from. */}
      <Dialog open={!!compositionItem} onOpenChange={(open) => !open && setCompositionItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Composition — {compositionItem?.name}</DialogTitle></DialogHeader>
          {compositionLoading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-slate-500">Sub Child Parts</p>
                  <p className="text-sm font-semibold text-slate-800">{(compositionBom?.subChildParts || []).filter(l => !l.isDiscontinued).length}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-slate-500">Materials</p>
                  <p className="text-sm font-semibold text-slate-800">{(compositionBom?.materials || []).filter(m => !m.isDiscontinued && m.materialKind !== 'tool').length}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-slate-500">Tools</p>
                  <p className="text-sm font-semibold text-slate-800">{(compositionBom?.materials || []).filter(m => !m.isDiscontinued && m.materialKind === 'tool').length}</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-blue-600 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Total Cost</span>
                <span className="text-sm font-bold text-blue-800">{fmtMoney(compositionCost?.totalCost)}</span>
              </div>
              <a href="/r&d/bom-management" className="text-xs text-blue-600 hover:underline block text-center">
                Manage in BOM Management → Child Part Master
              </a>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompositionItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
