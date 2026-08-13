import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hash, Calendar, RefreshCw, Send, CheckCircle2, ShoppingCart, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { dimensionSignature, formatDims } from '@/lib/fabricationDims';

// Fabrication Master materials only — Store picks which stock cut to
// transfer from (Item.dimensionVariants[]), and may optionally record what's
// left after cutting. Only `length` (+ `width` for sheet_plate) is ever
// editable on the leftover — everything else is a fixed property of the
// stock, shown locked and pre-filled from the picked variant (see
// inventoryController.js's transferFabricationMaterialToProduction, which
// enforces this same rule server-side regardless of what's submitted here).
function FabricationTransferDialog({ request, onClose, categories }) {
  const { toast } = useToast();
  const [sourceVariantId, setSourceVariantId] = useState('');
  const [qty, setQty] = useState('');
  const [leftoverValues, setLeftoverValues] = useState({});

  const sourceItemCode = request?.material?.sourceItemCode || request?.material?.materialCode;
  const { data: itemRes, isLoading } = useQuery({
    queryKey: ['item-by-code-for-transfer', sourceItemCode],
    queryFn: () => apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(sourceItemCode)}`),
    enabled: !!request,
  });
  const variants = itemRes?.data?.dimensionVariants || [];
  const chosenVariant = variants.find(v => v._id === sourceVariantId);
  const category = categories.find(c => c.key === request?.material?.fabricationCategory);
  const isExactMatch = chosenVariant && dimensionSignature(chosenVariant.values) === dimensionSignature(request?.material?.bomDimensions);
  const editableKeys = category
    ? category.fields.filter(f => f.key === 'length' || (category.calcType === 'sheet' && f.key === 'width')).map(f => f.key)
    : [];

  const transferMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/inventory/transfer-fabrication-material/${request.order._id}`, {
      materialCode: request.material.materialCode,
      sourceVariantId,
      quantity: Number(qty),
      leftoverDimensions: Object.values(leftoverValues).some(v => v !== undefined && v !== '') ? leftoverValues : undefined,
    }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Material transferred to production successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
      onClose();
    },
    onError: (error) => toast({ title: 'Transfer Failed', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!request) return null;
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Fabrication Material</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{request.material.materialName}</span> — needed size: <span className="font-mono">{formatDims(request.material.bomDimensions)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Cut from which stock size?</label>
            {isLoading ? (
              <p className="text-xs text-slate-400 italic">Loading stock sizes…</p>
            ) : variants.length === 0 ? (
              <p className="text-xs text-amber-600">No stock sizes found for this item.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {variants.map(v => (
                  <label key={v._id} className={`flex items-center justify-between gap-2 p-2 rounded-md border text-xs cursor-pointer ${sourceVariantId === v._id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="sourceVariant" checked={sourceVariantId === v._id} onChange={() => { setSourceVariantId(v._id); setLeftoverValues({}); }} />
                      <span className="font-mono">{formatDims(v.values)}</span>
                      {v.isLeftover && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Leftover</span>}
                      {dimensionSignature(v.values) === dimensionSignature(request.material.bomDimensions) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Exact Match</span>
                      )}
                    </span>
                    <span className="text-slate-500">Stock: {v.subStock || 0}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Quantity to Transfer</label>
            <Input type="number" min="1" max={chosenVariant?.subStock || undefined} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Enter quantity" />
            {chosenVariant && Number(qty) > (chosenVariant.subStock || 0) && (
              <p className="text-red-500 text-xs mt-1">Cannot exceed available stock ({chosenVariant.subStock || 0}).</p>
            )}
          </div>

          {chosenVariant && !isExactMatch && category && (
            <div className="p-3 border border-amber-200 rounded-lg bg-amber-50/50 space-y-2">
              <label className="text-xs font-semibold text-amber-800 block">Leftover After Cutting <span className="text-[10px] text-slate-500 font-normal">(optional — leave blank if nothing usable remains)</span></label>
              <div className="grid grid-cols-2 gap-3">
                {category.fields.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] text-slate-500 uppercase">{f.label} ({f.unit})</label>
                    <Input
                      type="number" min="0" className="mt-1 bg-white h-9"
                      disabled={!editableKeys.includes(f.key)}
                      placeholder={editableKeys.includes(f.key) ? '0' : undefined}
                      value={editableKeys.includes(f.key) ? (leftoverValues[f.key] ?? '') : (chosenVariant.values?.[f.key] ?? '')}
                      onChange={(e) => setLeftoverValues(v => ({ ...v, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => transferMutation.mutate()}
            disabled={transferMutation.isPending || !sourceVariantId || !qty || Number(qty) <= 0 || (chosenVariant && Number(qty) > (chosenVariant.subStock || 0))}
          >
            {transferMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Confirm Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fabrication Master materials only — Purchase only ever reorders the
// item's original catalog sizes, never a leftover Store cut themselves (see
// Item.dimensionVariants[].isLeftover) — those aren't a real, repeatable
// vendor SKU.
// Store can check off several catalog sizes at once (e.g. two different
// sheet cuts of the same raw material) and raise ONE consolidated Purchase
// Request covering all of them — the vendor is ultimately paid by weight
// (or whatever Purchase Unit the item uses), not per distinct cut size, so
// this always submits a single request with a dimensionLines[] breakdown,
// never one request per checked size. Purchase can still add/remove/adjust
// lines later from the same "Send RFQ" form (RFQManagement.jsx) before it's
// actually sent — see server/controllers/purchaseRequestController.js's
// resolveFabricationLines, which both this dialog's preview and the final
// submit share.
function FabricationPurchaseDialog({ request, onClose }) {
  const { toast } = useToast();
  const [selectedVariants, setSelectedVariants] = useState({}); // { [variantId]: qtyString }

  const sourceItemCode = request?.material?.sourceItemCode || request?.material?.materialCode;
  const { data: itemRes, isLoading } = useQuery({
    queryKey: ['item-by-code-for-purchase', sourceItemCode],
    queryFn: () => apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(sourceItemCode)}`),
    enabled: !!request,
  });
  const catalogVariants = (itemRes?.data?.dimensionVariants || []).filter(v => !v.isLeftover);

  const toggleVariant = (variantId) => {
    setSelectedVariants(prev => {
      const next = { ...prev };
      if (variantId in next) delete next[variantId];
      else next[variantId] = '1';
      return next;
    });
  };

  const linesPayload = Object.entries(selectedVariants)
    .map(([variantId, qty]) => {
      const variant = catalogVariants.find(v => v._id === variantId);
      return variant ? { values: variant.values, quantity: Number(qty) } : null;
    })
    .filter(Boolean);
  const allQtyValid = linesPayload.length > 0 && linesPayload.every(l => l.quantity > 0);

  const { data: previewRes, isFetching: isPreviewing } = useQuery({
    queryKey: ['preview-fabrication-total', sourceItemCode, JSON.stringify(linesPayload)],
    queryFn: () => apiRequest('POST', '/api/purchase-requests/preview-fabrication-total', {
      materialCode: sourceItemCode,
      lines: linesPayload,
    }),
    enabled: allQtyValid,
  });
  const preview = previewRes?.data;

  const purchaseMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/purchase-requests', {
      productName: request.material.materialName,
      materialCode: sourceItemCode,
      itemId: sourceItemCode,
      requestFromDepartment: 'Store',
      source: 'Store',
      priority: 'Medium',
      storeOrderId: request.order._id,
      fabricationDimensionLines: linesPayload,
    }),
    onSuccess: () => {
      toast({ title: 'Purchase Request Raised', description: 'The purchase request has been submitted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
      onClose();
    },
    onError: (error) => toast({ title: 'Purchase Request Failed', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!request) return null;
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-emerald-600" /> Raise Purchase Request</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{request.material.materialName}</span> (<span className="font-mono">{sourceItemCode}</span>) — check every catalog size you need reordered, with a quantity each.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Sizes to Reorder</label>
            {isLoading ? (
              <p className="text-xs text-slate-400 italic">Loading catalog sizes…</p>
            ) : catalogVariants.length === 0 ? (
              <p className="text-xs text-amber-600">No catalog sizes found for this item.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {catalogVariants.map(v => {
                  const checked = v._id in selectedVariants;
                  return (
                    <div key={v._id} className={`flex items-center gap-2 p-2 rounded-md border text-xs ${checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggleVariant(v._id)} />
                        <span className="font-mono">{formatDims(v.values)}</span>
                      </label>
                      {checked && (
                        <Input
                          type="number" min="1" placeholder="Qty"
                          className="w-20 h-7 text-xs"
                          value={selectedVariants[v._id]}
                          onChange={(e) => setSelectedVariants(prev => ({ ...prev, [v._id]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {Object.keys(selectedVariants).length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              {isPreviewing ? (
                <p className="text-slate-400 italic">Calculating total…</p>
              ) : !allQtyValid ? (
                <p className="text-amber-600">Enter a quantity for every checked size.</p>
              ) : preview ? (
                <>
                  {preview.lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span className="font-mono">{formatDims(l.values)} × {l.quantity}</span>
                      <span>{l.lineWeightKg != null ? `${l.lineWeightKg} kg` : '—'}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                    <span>{preview.isMassUnit ? 'Predicted Total' : 'Total (pieces, review with Purchase)'}</span>
                    <span>
                      {preview.isMassUnit
                        ? `${preview.resolvedQuantity} ${preview.resolvedUnit}`
                        : `${preview.lines.reduce((s, l) => s + l.quantity, 0)} pcs`}
                    </span>
                  </div>
                  {!preview.isMassUnit && (
                    <p className="text-slate-400 italic">
                      This item's Purchase Unit isn't weight-based — Purchase will set the final order amount when sending the RFQ.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending || !allQtyValid}
          >
            {purchaseMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PendingRequestsTab() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [transferQty, setTransferQty] = useState('');
  const [purchaseRequest, setPurchaseRequest] = useState(null); // { order, material }
  const [purchaseQty, setPurchaseQty] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Fabrication Master materials only — separate dialogs (dimension-variant
  // picker instead of a flat quantity), see FabricationTransferDialog/
  // FabricationPurchaseDialog above.
  const [fabTransferRequest, setFabTransferRequest] = useState(null); // { order, material }
  const [fabPurchaseRequest, setFabPurchaseRequest] = useState(null); // { order, material }

  const { data: fabricationCategoriesResponse } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = fabricationCategoriesResponse?.data || [];

  // ── LIVE DATABASE-BACKED STAGING QUEUE QUERY ──
  const { data: stagedRes, refetch: refetchStaged } = useQuery({
    queryKey: ['/api/purchase-requests/staged'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/purchase-requests/staged');
    }
  });

  const stagedDatabaseRows = stagedRes?.data || [];

  // Local work-state cloned when modal is opened so edits don't trigger thrashing refetches
  const [editableStagedItems, setEditableStagedItems] = useState([]);

  useEffect(() => {
    if (isCartOpen) {
      setEditableStagedItems(stagedDatabaseRows);
    }
  }, [isCartOpen, stagedDatabaseRows]);

  // ── LIVE REAL-TIME CALCULATION/CONSOLIDATION ENGINE ──
  const consolidatedMap = editableStagedItems.reduce((acc, currentItem) => {
    const code = currentItem.materialCode || 'UNKNOWN';
    if (!acc[code]) {
      acc[code] = {
        productName: currentItem.productName,
        materialCode: code,
        quantity: 0,
        unit: currentItem.unit,
        itemId: currentItem.itemId,
        priority: currentItem.priority || 'Medium',
        source: 'Store'
      };
    }
    acc[code].quantity += Number(currentItem.quantity || 0);
    return acc;
  }, {});

  const consolidatedListForAccounts = Object.values(consolidatedMap);
  const totalStagedIdsToPurge = editableStagedItems.map(item => item._id);

  const updateStagedItemQty = (id, val) => {
    setEditableStagedItems(prev =>
      prev.map(item => item._id === id ? { ...item, quantity: val } : item)
    );
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/inventory/pending-requests'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/inventory/pending-requests');
    }
  });

  // Individual item transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ orderId, materialCode, quantityToTransfer }) => {
      return await apiRequest('POST', `/api/inventory/transfer-material/${orderId}`, {
        materialCode,
        quantityToTransfer: Number(quantityToTransfer)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material transferred to production successfully.",
      });
      setSelectedRequest(null);
      setTransferQty('');
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  // ── UPDATED BULK TRANSFER MUTATION (SYNCED WITH DB STAGING) ──
  const bulkTransferMutation = useMutation({
    mutationFn: async (orderDbId) => {
      return await apiRequest('POST', `/api/inventory/bulk-transfer/${orderDbId}`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/staged'] });

      if (response.shortfallsCount > 0) {
        toast({
          title: "Bulk Transfer Handled",
          description: `${response.shortfallsCount} item shortfalls sync'd to your global database queue.`,
        });
      } else {
        toast({
          title: "Bulk Transfer Success",
          description: "All requested materials for this order have been fully transferred.",
        });
      }

      if (response.skippedFabricationCount > 0) {
        toast({
          title: "Fabrication Materials Need Manual Transfer",
          description: `${response.skippedFabricationCount} fabrication material(s) need Store to pick a stock size — use the Transfer button on those rows individually.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Bulk Transfer Failed",
        description: error.message || "Failed to process bulk transfer.",
        variant: "destructive"
      });
    }
  });

  // Individual purchase request mutation
  const purchaseMutation = useMutation({
    mutationFn: async ({ productName, materialCode, quantity, unit, storeOrderId, itemId }) => {
      return await apiRequest('POST', '/api/purchase-requests', {
        productName,
        materialCode,
        quantity: Number(quantity),
        unit,
        requestFromDepartment: 'Store',
        source: 'Store',
        priority: 'Medium',
        storeOrderId,
        itemId
      });
    },
    onSuccess: () => {
      toast({
        title: 'Purchase Request Raised',
        description: 'The purchase request has been submitted successfully.',
      });
      setPurchaseRequest(null);
      setPurchaseQty('');
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Purchase Request Failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  // ── UPDATED BULK PURCHASE MUTATION (CONSOLIDATED PAYLOAD DETACHMENT) ──
  const bulkPurchaseMutation = useMutation({
    mutationFn: async ({ finalItems, stagedIds }) => {
      return await apiRequest('POST', '/api/purchase-requests/bulk-purchase', {
        items: finalItems,
        stagedIds: stagedIds
      });
    },
    onSuccess: () => {
      toast({
        title: "Bulk Purchases Submitted",
        description: "All consolidated procurement requests have been successfully sent to Accounts.",
      });
      setIsCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/staged'] });
    },
    onError: (error) => {
      toast({
        title: "Bulk Purchase Failed",
        description: error.message || "Something went wrong submitting requests.",
        variant: "destructive"
      });
    }
  });

  const handleTransferClick = (order, material) => {
    if (material.fabricationCategory) {
      setFabTransferRequest({ order, material });
      return;
    }
    const remainingToTransfer = (material.quantity || 0) - (material.transferredQuantity || 0);
    setTransferQty(remainingToTransfer > 0 ? remainingToTransfer.toString() : '');
    setSelectedRequest({ order, material });
  };

  const handlePurchaseClick = (order, material) => {
    if (material.fabricationCategory) {
      setFabPurchaseRequest({ order, material });
      return;
    }
    const remaining = (material.quantity || 0) - (material.transferredQuantity || 0);
    setPurchaseQty(remaining > 0 ? remaining.toString() : '');
    setPurchaseRequest({ order, material });
  };

  const handleConfirmPurchase = () => {
    if (!purchaseRequest || !purchaseQty || isNaN(purchaseQty) || Number(purchaseQty) <= 0) return;
    purchaseMutation.mutate({
      productName: purchaseRequest.material.materialName,
      materialCode: purchaseRequest.material.materialCode,
      quantity: purchaseQty,
      unit: purchaseRequest.material.unit,
      storeOrderId: purchaseRequest.order._id,
      itemId: purchaseRequest.material.materialCode
    });
  };

  const handleConfirmTransfer = () => {
    if (!selectedRequest || !transferQty || isNaN(transferQty) || Number(transferQty) <= 0) return;

    const remainingToTransfer = (selectedRequest.material.quantity || 0) - (selectedRequest.material.transferredQuantity || 0);
    if (Number(transferQty) > remainingToTransfer) {
      toast({
        title: "Validation Error",
        description: "Cannot transfer more than the requested amount.",
        variant: "destructive"
      });
      return;
    }

    transferMutation.mutate({
      orderId: selectedRequest.order._id,
      materialCode: selectedRequest.material.materialCode,
      quantityToTransfer: transferQty
    });
  };

  const orders = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Pending Material Transfers</h2>
          <p className="text-sm text-slate-500">Fulfill material requests from production orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsCartOpen(true)}
            className="relative border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100/80 transition-all font-medium"
          >
            <ShoppingCart className="h-4 w-4 mr-2 text-amber-600" />
            Bulk Purchase Queue
            {stagedDatabaseRows.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                {stagedDatabaseRows.length}
              </span>
            )}
          </Button>

          <Button variant="outline" onClick={() => refetch()} className="bg-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center">
          Failed to load pending requests.
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
          <p className="text-lg font-medium text-slate-700">All Caught Up!</p>
          <p className="text-sm">There are no pending material requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <Card key={order._id} className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-blue-50/50 border-b border-slate-100 pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                      <Hash className="h-5 w-5 text-blue-500" />
                      Production Order: {order.orderId || order._id}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-medium text-blue-700 bg-blue-100/50 px-2 rounded-md">
                        {order.machineCode} - {order.machineName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                      disabled={bulkTransferMutation.isPending}
                      onClick={() => bulkTransferMutation.mutate(order._id)}
                    >
                      <ListChecks className="w-4 h-4 mr-1.5" />
                      Bulk Transfer Card
                    </Button>

                    <div className="text-sm text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Requested: {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Material</th>
                      <th className="px-6 py-3 font-semibold">Requested Qty</th>
                      <th className="px-6 py-3 font-semibold">Transferred So Far</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {order.pendingMaterials.map(mat => (
                      <tr key={mat._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            {mat.materialName}
                            {mat.fabricationCategory && (
                              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">Fabrication</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{mat.sourceItemCode || mat.materialCode}</div>
                          {mat.fabricationCategory && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Cut: {formatDims(mat.bomDimensions)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700">{mat.quantity} {mat.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {mat.transferredQuantity || 0} {mat.unit}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleTransferClick(order, mat)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handlePurchaseClick(order, mat)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Purchase
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL BOX OVERLAY DIALOG FOR BULK PROCUREMENT CONFIRMATION ── */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Review Bulk Procurement Staging List
            </DialogTitle>
            <DialogDescription>
              Review shortfalls generated from stock deficits. Adjust quantities in the granular queue below. They will automatically consolidate at the bottom before dispatch.
            </DialogDescription>
          </DialogHeader>

          {/* SECTION A: SCROLLABLE TOP LIST - INDIVIDUAL DEFICIT BREAKDOWNS */}
          <div className="flex-1 overflow-y-auto max-h-[35vh] border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-2 space-y-1 my-2 shadow-inner">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1">Originating Staging Queue Lines</div>
            {editableStagedItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">
                No shortfalls currently staged in the bulk queue list.
              </div>
            ) : (
              editableStagedItems.map((item) => (
                <div key={item._id} className="p-3 bg-white rounded-lg border border-slate-100 flex items-center justify-between shadow-sm transition-all">
                  <div className="space-y-0.5 pr-4">
                    <p className="font-semibold text-xs text-slate-800">{item.productName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Code: {item.materialCode}</span>
                      {item.productionOrderId && (
                        <span className="bg-blue-50 px-1 rounded text-[10px] text-blue-600">
                          Order: {item.productionOrderId}
                        </span>
                      )}
                      {item.storeOrderId && (
                        <span className="bg-slate-100 px-1 rounded text-[10px] text-slate-500">
                          Staged By: {item.stagedBy}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      className="w-24 h-8 text-right text-xs bg-white border-slate-300"
                      value={item.quantity}
                      min="0"
                      onChange={(e) => updateStagedItemQty(item._id, e.target.value)}
                    />
                    <span className="text-xs font-medium text-slate-400 w-10 text-left">{item.unit}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SECTION B: DYNAMIC LIVE AGGREGATED SUMMARY BAR AT BOTTOM */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-amber-600" />
              Consolidated Accounts Dispatch Summary
            </div>
            <div className="max-h-[18vh] overflow-y-auto space-y-1.5 pr-1">
              {consolidatedListForAccounts.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">No combined rows to process.</p>
              ) : (
                consolidatedListForAccounts.map((combinedItem) => (
                  <div key={combinedItem.materialCode} className="flex justify-between items-center bg-white border border-amber-100/70 p-2.5 rounded-lg shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-slate-700">{combinedItem.productName}</span>
                      <span className="text-[10px] font-mono text-slate-400 ml-2">({combinedItem.materialCode})</span>
                    </div>
                    <div className="text-xs font-semibold text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-md">
                      Combined Total: {combinedItem.quantity} {combinedItem.unit}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCartOpen(false)}>Keep Staged</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-medium text-xs h-9"
              disabled={consolidatedListForAccounts.length === 0 || bulkPurchaseMutation.isPending}
              onClick={() => bulkPurchaseMutation.mutate({
                finalItems: consolidatedListForAccounts,
                stagedIds: totalStagedIdsToPurge
              })}
            >
              {bulkPurchaseMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Dispatch Clean Requests ({consolidatedListForAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Transfer Modal View */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Material to Production</DialogTitle>
            <DialogDescription>
              Transferring <span className="font-semibold text-slate-800">{selectedRequest?.material.materialName}</span> for order <span className="font-mono text-slate-800">{selectedRequest?.order.orderId || selectedRequest?.order._id}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Quantity to Transfer ({selectedRequest?.material.unit})
            </label>
            <Input
              type="number"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              placeholder="Enter quantity"
              autoFocus
              min="1"
              max={selectedRequest ? (selectedRequest.material.quantity || 0) - (selectedRequest.material.transferredQuantity || 0) : undefined}
            />
            {selectedRequest && Number(transferQty) > ((selectedRequest.material.quantity || 0) - (selectedRequest.material.transferredQuantity || 0)) && (
              <p className="text-red-500 text-xs mt-1">Cannot exceed remaining requested quantity.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConfirmTransfer}
              disabled={
                transferMutation.isPending ||
                !transferQty ||
                Number(transferQty) <= 0 ||
                (selectedRequest && Number(transferQty) > ((selectedRequest.material.quantity || 0) - (selectedRequest.material.transferredQuantity || 0)))
              }
            >
              {transferMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Purchase Modal View */}
      <Dialog open={!!purchaseRequest} onOpenChange={(open) => !open && setPurchaseRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Raise Purchase Request
            </DialogTitle>
            <DialogDescription>
              Requesting purchase of <span className="font-semibold text-slate-800">{purchaseRequest?.material.materialName}</span>{' '}
              (<span className="font-mono text-slate-700">{purchaseRequest?.material.materialCode}</span>).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Quantity to Purchase ({purchaseRequest?.material.unit})
            </label>
            <Input
              type="number"
              value={purchaseQty}
              onChange={(e) => setPurchaseQty(e.target.value)}
              placeholder="Enter quantity"
              autoFocus
              min="1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseRequest(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmPurchase}
              disabled={
                purchaseMutation.isPending ||
                !purchaseQty ||
                Number(purchaseQty) <= 0
              }
            >
              {purchaseMutation.isPending
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <ShoppingCart className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FabricationTransferDialog
        request={fabTransferRequest}
        categories={fabricationCategories}
        onClose={() => setFabTransferRequest(null)}
      />
      <FabricationPurchaseDialog
        request={fabPurchaseRequest}
        onClose={() => setFabPurchaseRequest(null)}
      />
    </div>
  );
}