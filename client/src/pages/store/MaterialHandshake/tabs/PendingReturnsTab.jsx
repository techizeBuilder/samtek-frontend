import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hash, Calendar, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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

export default function ReturnedMaterialsTab() {
    const { toast } = useToast();
    // Holds context data for confirmation actions: { logId, materialName, orderId, action }
    const [confirmationAction, setConfirmationAction] = useState(null);

    // 1. Fetch grouped pending returns data pipeline
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['/api/inventory/pending-returns'],
        queryFn: async () => {
            return await apiRequest('GET', '/api/inventory/pending-returns');
        }
    });

    // 2. Settlement Resolution mutation
    const confirmReturnMutation = useMutation({
        mutationFn: async ({ logId, action }) => {
            return await apiRequest('POST', '/api/inventory/confirm-return', { logId, action });
        },
        onSuccess: (_, variables) => {
            toast({
                title: `Return ${variables.action}ed`,
                description: `Successfully processed the material return authorization request.`,
            });
            setConfirmationAction(null);
            queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-returns'] });
            // Also invalidate the outbound pending requests so replenishment requirements dynamically reflect changes
            queryClient.invalidateQueries({ queryKey: ['/api/inventory/pending-requests'] });
        },
        onError: (error) => {
            toast({
                title: "Action Failed",
                description: error.message || "Failed to update return inventory log balances.",
                variant: "destructive"
            });
        }
    });

    const handleActionClick = (logId, materialName, orderId, action) => {
        setConfirmationAction({ logId, materialName, orderId, action });
    };

    const handleConfirmResolution = () => {
        if (!confirmationAction) return;
        confirmReturnMutation.mutate({
            logId: confirmationAction.logId,
            action: confirmationAction.action
        });
    };

    const ordersWithReturns = data?.data || [];

    return (
        <div className="space-y-6">
            {/* Tab Header Context Layer */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Pending Inbound Returns</h2>
                    <p className="text-sm text-slate-500">Review and verify materials sent back from the production floor.</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} className="bg-white">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Conditional Layout Rendering Engine */}
            {isLoading ? (
                <div className="flex justify-center py-12 text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center">
                    Failed to load pending return requests.
                </div>
            ) : ordersWithReturns.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                    <p className="text-lg font-medium text-slate-700">Inbound Vault Clean!</p>
                    <p className="text-sm">There are no material returns awaiting confirmation right now.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {ordersWithReturns.map(order => (
                        <Card key={order._id} className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                                            <Hash className="h-5 w-5 text-slate-500" />
                                            Production Order: {order.orderId || "N/A"}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="font-medium text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md">
                                                {order.machineCode} - {order.machineName}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        Returned: {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'Recent'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white border-b border-slate-100 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Material Details</th>
                                            <th className="px-6 py-3 font-semibold">Classification</th>
                                            <th className="px-6 py-3 font-semibold">Return Qty</th>
                                            <th className="px-6 py-3 font-semibold">Floor Justification / Reason</th>
                                            <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {order.pendingMaterials.map(mat => (
                                            <tr key={mat.logId} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-800">{mat.materialName}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{mat.sourceItemCode || mat.materialCode}</div>
                                                    {mat.bomDimensions && Object.keys(mat.bomDimensions).length > 0 && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            Cut: {Object.entries(mat.bomDimensions).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {mat.returnType === 'Defect' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                            <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                                                            Defect / Scrap
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                            Excess Material
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-slate-800">{mat.quantityReturned} {mat.unit}</span>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate text-slate-600" title={mat.reason}>
                                                    {mat.reason}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    {/* Reject Option */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => handleActionClick(mat.logId, mat.materialName, order.orderId, 'Reject')}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                    {/* Accept Option */}
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handleActionClick(mat.logId, mat.materialName, order.orderId, 'Accept')}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        Accept
                                                    </Button>
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

            {/* Confirmation Modal Layer */}
            <Dialog open={!!confirmationAction} onOpenChange={(open) => !open && setConfirmationAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {confirmationAction?.action === 'Accept' ? (
                                <span className="text-emerald-600">Confirm Material Acceptance</span>
                            ) : (
                                <span className="text-red-600">Reject Return Request</span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="space-y-2 mt-2">
                            <p>
                                Are you sure you want to <span className="font-bold uppercase">{confirmationAction?.action}</span> the return request for{" "}
                                <span className="font-semibold text-slate-900">{confirmationAction?.materialName}</span> under order{" "}
                                <span className="font-mono text-slate-900">{confirmationAction?.orderId}</span>?
                            </p>
                            {confirmationAction?.action === 'Accept' ? (
                                <p className="text-xs bg-slate-50 border border-slate-200 text-slate-600 p-2.5 rounded-lg">
                                    💡 <strong>Inventory Impact:</strong> Accepting this transaction returns stock balance quantities back to the primary store warehouse pool and decreases the physical quantities issued to the production floor.
                                </p>
                            ) : (
                                <p className="text-xs bg-slate-50 border border-slate-200 text-slate-600 p-2.5 rounded-lg">
                                    ⚠️ <strong>Floor Impact:</strong> Rejecting returns items back to production floor custody, making them available again to machine operators.
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setConfirmationAction(null)}>Cancel</Button>
                        <Button
                            className={confirmationAction?.action === 'Accept' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                            onClick={handleConfirmResolution}
                            disabled={confirmReturnMutation.isPending}
                        >
                            {confirmReturnMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm & Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}