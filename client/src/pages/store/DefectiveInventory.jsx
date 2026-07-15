import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Wrench,
  Trash2,
  Search,
  RefreshCw,
  Package,
  ChevronLeft,
  ChevronRight,
  Box,
  AlertCircle,
} from 'lucide-react';

const LIMIT = 10;

export default function DefectiveInventory() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [actionQty, setActionQty] = useState('');

  // ── DEBOUNCE EFFECT FOR SEARCH FILTER ──
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(search);
      setPage(1); // Reset back to page 1 on active search changes
    }, 400); // 400ms delay window

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['/api/inventory/defective', searchQuery, page],
    queryFn: () =>
      apiRequest(
        'GET',
        `/api/inventory/defective?search=${encodeURIComponent(searchQuery)}&page=${page}&limit=${LIMIT}`
      ),
    keepPreviousData: true,
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {};

  const repairMutation = useMutation({
    mutationFn: ({ id, quantityToRepair }) =>
      apiRequest('POST', `/api/inventory/defective/repair/${id}`, { quantityToRepair }),
    onSuccess: (res) => {
      toast({ title: 'Repaired', description: res?.message || 'Items returned to main stock.' });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/defective'] });
      closeModal();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err?.message || 'Repair failed.', variant: 'destructive' });
    },
  });

  const scrapMutation = useMutation({
    mutationFn: ({ id, quantityToScrap }) =>
      apiRequest('POST', `/api/inventory/defective/scrap/${id}`, { quantityToScrap }),
    onSuccess: (res) => {
      toast({ title: 'Scrapped', description: res?.message || 'Items written off successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/defective'] });
      closeModal();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err?.message || 'Scrap failed.', variant: 'destructive' });
    },
  });

  const openModal = (type, item) => {
    setModal({ type, item });
    setActionQty('');
  };

  const closeModal = () => {
    setModal(null);
    setActionQty('');
  };

  // ── STRICT INPUT CONSTRAINT HANDLER ──
  const handleQtyInputChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setActionQty('');
      return;
    }

    const numVal = Number(val);
    const maxLimit = modal?.item?.quantity || 0;

    // Hard ceiling boundary logic: If type-in exceeds inventory, clamp it to the max limit
    if (numVal > maxLimit) {
      setActionQty(String(maxLimit));
    } else {
      setActionQty(val);
    }
  };

  const handleSubmitAction = () => {
    const qty = Number(actionQty);
    if (!qty || qty <= 0) {
      toast({ title: 'Invalid quantity', description: 'Please enter a valid quantity.', variant: 'destructive' });
      return;
    }
    if (qty > modal.item.quantity) {
      toast({ title: 'Exceeds stock', description: `Max available: ${modal.item.quantity}`, variant: 'destructive' });
      return;
    }

    if (modal.type === 'repair') {
      repairMutation.mutate({ id: modal.item._id, quantityToRepair: qty });
    } else {
      scrapMutation.mutate({ id: modal.item._id, quantityToScrap: qty });
    }
  };

  const isActionLoading = repairMutation.isPending || scrapMutation.isPending;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            Defective Inventory
          </h1>
          <p className="text-slate-500 mt-1">
            View and manage defective materials. Repair back to stock or scrap off.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* SEARCH BAR W/ DEBOUNCE LOGIC INDICATOR */}
      <div className="flex gap-2 max-w-lg items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            className="pl-9 bg-white"
            placeholder="Type to search material name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isFetching && search && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 animate-spin" />
          )}
        </div>
        {search && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-slate-500 gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading defective inventory...
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Box className="h-12 w-12" />
            <p className="text-lg font-medium">No defective items found</p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search term.' : 'All clear - no defective materials in stock.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600 w-10">#</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Material</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Code</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Defective Qty</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id} className="border-b border-slate-100 hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(page - 1) * LIMIT + idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="font-medium text-slate-800">{item.materialName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs text-slate-600">
                          {item.materialCode || '-'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-0.5 text-sm font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.unit || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => openModal('repair', item)}>
                            <Wrench className="h-3.5 w-3.5" /> Repair
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => openModal('scrap', item)}>
                            <Trash2 className="h-3.5 w-3.5" /> Scrap
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                Showing {(page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, pagination.totalRecords)} of {pagination.totalRecords} items
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">Page {page} / {pagination.totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modal?.type === 'repair' ? (
                <><Wrench className="h-5 w-5 text-green-600" /> Repair Items</>
              ) : (
                <><Trash2 className="h-5 w-5 text-red-500" /> Scrap Items</>
              )}
            </DialogTitle>
            <DialogDescription>
              {modal?.type === 'repair'
                ? 'Repaired items will be moved back to the main inventory stock.'
                : 'Scrapped items will be permanently written off.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Material</span>
                <span className="font-medium text-slate-800">{modal?.item?.materialName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Code</span>
                <span className="font-mono text-slate-600">{modal?.item?.materialCode || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Defective Stock</span>
                <span className="font-semibold text-red-600">{modal?.item?.quantity} {modal?.item?.unit}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Quantity to {modal?.type === 'repair' ? 'Repair' : 'Scrap'}
              </label>
              <Input
                type="number"
                min={1}
                max={modal?.item?.quantity}
                value={actionQty}
                onChange={handleQtyInputChange} // Updated constraint listener
                placeholder={`Enter qty (max ${modal?.item?.quantity || 0})`}
                className="bg-white"
                onKeyDown={(e) => e.key === 'Enter' && actionQty && handleSubmitAction()}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={isActionLoading}>Cancel</Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isActionLoading || !actionQty}
              className={modal?.type === 'repair' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {isActionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : modal?.type === 'repair' ? (
                <Wrench className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {modal?.type === 'repair' ? 'Confirm Repair' : 'Confirm Scrap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}