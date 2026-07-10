import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hash, Calendar, RefreshCw, Send, CheckCircle2, ShoppingCart } from 'lucide-react';
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

export default function PendingRequestsTab() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [transferQty, setTransferQty] = useState('');
  const [purchaseRequest, setPurchaseRequest] = useState(null); // { order, material }
  const [purchaseQty, setPurchaseQty] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/inventory/pending-requests'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/inventory/pending-requests');
    }
  });

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

  const handleTransferClick = (order, material) => {
    const remainingToTransfer = (material.quantity || 0) - (material.transferredQuantity || 0);
    setTransferQty(remainingToTransfer > 0 ? remainingToTransfer.toString() : '');
    setSelectedRequest({ order, material });
  };

  const purchaseMutation = useMutation({
    mutationFn: async ({ productName, materialCode, quantity, unit }) => {
      return await apiRequest('POST', '/api/purchase-requests', {
        productName,
        materialCode,
        quantity: Number(quantity),
        unit,
        requestFromDepartment: 'Store',
        source: 'Store',
        priority: 'Medium',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Purchase Request Raised',
        description: 'The purchase request has been submitted successfully.',
      });
      setPurchaseRequest(null);
      setPurchaseQty('');
    },
    onError: (error) => {
      toast({
        title: 'Purchase Request Failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const handlePurchaseClick = (order, material) => {
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
      orderId: selectedRequest.order._id, // Keep raw _id for database query parameter
      materialCode: selectedRequest.material.materialCode,
      quantityToTransfer: transferQty
    });
  };

  const orders = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Pending Material Transfers</h2>
          <p className="text-sm text-slate-500">Fulfill material requests from production orders.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="bg-white">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
                      {/* FIX: Now shows the human-friendly orderId fallback to _id */}
                      Production Order: {order.orderId || order._id}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-medium text-blue-700 bg-blue-100/50 px-2 rounded-md">
                        {order.machineCode} - {order.machineName}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Requested: {format(new Date(order.createdAt), 'MMM dd, yyyy')}
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
                          <div className="font-medium text-slate-800">{mat.materialName}</div>
                          <div className="text-xs text-slate-500 font-mono">{mat.materialCode}</div>
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

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Material to Production</DialogTitle>
            <DialogDescription>
              {/* FIX: Displays the human-friendly orderId in descriptive subtext */}
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
    </div>
  );
}