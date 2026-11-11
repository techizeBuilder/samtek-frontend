import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Settings2 } from 'lucide-react';

// Low-stock for machines (2026-11-06, docs/client-features-2026-11). The same
// Material Flow / Min Stock / Order Quantity as the part tabs, on the same item
// record. Two differences: Build Days, and picking a Flow doesn't fill in Min
// Stock, because 20, 10 or 5 machines is too many. Flow is the switch: without
// it a Min Stock typed long ago on Product Master starts nothing.
const flowBadgeColor = {
  'High Flow': 'bg-red-100 text-red-700 border-red-200',
  'Medium Flow': 'bg-amber-100 text-amber-700 border-amber-200',
  'Low Flow': 'bg-slate-100 text-slate-600 border-slate-200',
};
const ROUTE = {
  built: { label: 'Built', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  bought: { label: 'Bought', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  none: { label: 'Neither', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const OFF = 'off'; // the Select can't hold an empty value

// One line in Manage Stock: what these settings will do.
function whatHappens(machine, form) {
  const route = machine.stockInfo?.route;
  if (route === 'none') return 'Forward to Next Phase and Purchasable are both off on Product Master, so nothing can be raised for this machine.';
  if (form.materialFlow === OFF) return 'Off: nothing is raised automatically.';
  const min = Number(form.minStock) || 0;
  if (min <= 0) return 'Set Min Stock above 0 to start.';
  const qty = Number(form.reorderQty) || 1;
  const raise = route === 'built'
    ? `a build order for ${qty} is raised automatically, one at a time`
    : `a purchase request for ${qty} is raised automatically`;
  const sentence = `When stock is ${min} or less, ${raise}.`;
  return machine.releaseStatus === 'Released' ? sentence : `Waits until this machine is Released. ${sentence}`;
}

export default function MachineInventoryTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [manageItem, setManageItem] = useState(null);
  const [form, setForm] = useState({ materialFlow: OFF, minStock: 0, reorderQty: 0, buildDays: 0 });

  useEffect(() => { setPage(1); }, [search, lowOnly]);

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['machine-inventory', { page, search, lowOnly }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', discontinued: 'false', stockInfo: 'true' });
      if (search) params.set('search', search);
      if (lowOnly) params.set('lowStock', 'true');
      return apiRequest('GET', `/api/rd/machines?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const machines = listResponse?.data || [];
  const pagination = listResponse?.pagination || { page: 1, pages: 1, total: 0 };

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/items/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machine-inventory'] });
      qc.invalidateQueries({ queryKey: ['store-rd-machines'] });
      toast({ title: 'Updated' });
      setManageItem(null);
    },
    onError: (e) => toast({ title: 'Failed to update', description: e?.message, variant: 'destructive' }),
  });

  const openManage = (m) => {
    setManageItem(m);
    setForm({ materialFlow: m.materialFlow || OFF, minStock: m.minStock || 0, reorderQty: m.reorderQty || 0, buildDays: m.buildDays || 0 });
  };

  const save = () => {
    const whole = ['minStock', 'reorderQty', 'buildDays'].every(k => Number.isInteger(Number(form[k])) && Number(form[k]) >= 0);
    if (!whole) {
      toast({ title: 'Whole numbers only', description: 'Min Stock, Order Quantity and Build Days must be whole numbers, 0 or more.', variant: 'destructive' });
      return;
    }
    const data = {
      materialFlow: form.materialFlow === OFF ? '' : form.materialFlow,
      minStock: Number(form.minStock),
      reorderQty: Number(form.reorderQty),
    };
    if (manageItem.stockInfo?.route === 'built') data.buildDays = Number(form.buildDays);
    saveMutation.mutate({ id: manageItem._id, data });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name or code..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button
              onClick={() => setLowOnly(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${lowOnly ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}
            >
              Low stock only
            </button>
            <span className="text-xs text-slate-400 ml-auto max-w-md">
              Set a Material Flow and Min Stock to have a build order (or, for a bought machine, a purchase request) raised automatically when stock runs low.
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
                <TableHead>Route</TableHead>
                <TableHead>Release</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Material Flow</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Order Qty</TableHead>
                <TableHead>Build Days</TableHead>
                <TableHead>Build open</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : machines.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-400">{lowOnly ? 'No machines are low on stock.' : 'No machines found.'}</TableCell></TableRow>
              ) : machines.map(m => {
                const info = m.stockInfo || {};
                const route = ROUTE[info.route] || ROUTE.none;
                return (
                  <TableRow key={m._id}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{m.name}</p>
                      <p className="text-xs font-mono text-slate-400">{m.code}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={route.cls}>{route.label}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-600">{m.releaseStatus}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span>{m.qty ?? 0} {m.unit || ''}</span>
                        {info.low && <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Low stock</Badge>}
                      </div>
                      {info.waitingForSticker > 0 && <p className="text-[11px] text-amber-700">{info.waitingForSticker} waiting for sticker</p>}
                    </TableCell>
                    <TableCell>
                      {m.materialFlow
                        ? <Badge variant="outline" className={flowBadgeColor[m.materialFlow]}>{m.materialFlow}</Badge>
                        : <span className="text-xs text-slate-400">Off</span>}
                    </TableCell>
                    <TableCell>{m.minStock ?? 0}</TableCell>
                    <TableCell>{m.reorderQty ?? 0}</TableCell>
                    <TableCell>{info.route === 'built' ? (m.buildDays ?? 0) : <span className="text-xs text-slate-300">—</span>}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {(info.openBuilds || []).length
                        ? info.openBuilds.map(o => <div key={o.orderId}>{o.orderId} ({o.qty})</div>)
                        : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openManage(m)}>
                        <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!manageItem} onOpenChange={(open) => !open && setManageItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Stock — {manageItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-500">Material Flow</label>
              <Select value={form.materialFlow} onValueChange={(v) => setForm(f => ({ ...f, materialFlow: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFF}>Off</SelectItem>
                  <SelectItem value="High Flow">High Flow</SelectItem>
                  <SelectItem value="Medium Flow">Medium Flow</SelectItem>
                  <SelectItem value="Low Flow">Low Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Min Stock</label>
                <Input type="number" min="0" step="1" className="mt-1" value={form.minStock}
                  onChange={(e) => setForm(f => ({ ...f, minStock: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Order Quantity</label>
                <Input type="number" min="0" step="1" className="mt-1" value={form.reorderQty}
                  onChange={(e) => setForm(f => ({ ...f, reorderQty: e.target.value }))} />
              </div>
              {manageItem?.stockInfo?.route === 'built' && (
                <div>
                  <label className="text-xs text-slate-500">Build Days</label>
                  <Input type="number" min="0" step="1" className="mt-1" value={form.buildDays}
                    onChange={(e) => setForm(f => ({ ...f, buildDays: e.target.value }))} />
                  <p className="text-[11px] text-slate-400 mt-1">The order's delivery date is today plus this.</p>
                </div>
              )}
            </div>
            {manageItem && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5">{whatHappens(manageItem, form)}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageItem(null)}>Cancel</Button>
            <Button disabled={saveMutation.isPending} onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
