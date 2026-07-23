import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, Plus, Eye, Check, Mail, Clock, ShieldCheck,
  MapPin, Notebook, Info, FileText, ChevronRight, Edit2, RotateCw,
  Upload, PackageCheck, AlertCircle, X, Search, Package, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PurchaseRequest() {
  const { user } = useAuth();
  const isStoreUser = user?.role === 'Store Head' || user?.role === 'Store Employee';
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Core Master data
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);

  // PO Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [poModalMode, setPoModalMode] = useState('create'); // 'create' | 'view' | 'edit'
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  // Form Fields for PO
  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);
  // Quantity actually multiplied against Unit Price for the Grand Total.
  // When the item has a Purchase Unit different from its storage unit (e.g.
  // bought by the kg, stocked by the piece), this is the kg quantity the
  // vendor is quoting for — NOT the base-unit request quantity — so it must
  // be entered separately (mirrors the RFQ flow's "Order Quantity" input).
  const [poQuantity, setPoQuantity] = useState(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('Main Warehouse, Samtek Factory');
  const [terms, setTerms] = useState('Delivery within 7 days. Payment within 30 days of receipt.');
  const [notes, setNotes] = useState('');

  // Local Action Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Receive Modal state ─────────────────────────────────────────────────────
  const [isReceiveModalOpen, setIsReceiveModalOpen]   = useState(false);
  const [receiveRequest, setReceiveRequest]           = useState(null);
  const [receiveSerialNo, setReceiveSerialNo]         = useState('');
  const [receiveWarrantyMonths, setReceiveWarrantyMonths] = useState('');
  const [receiveWarrantyCard, setReceiveWarrantyCard] = useState(null);   // File object
  const [receiveQtyReceived, setReceiveQtyReceived]   = useState('');     // qty received in purchase unit
  const [receiveFactor, setReceiveFactor]             = useState('');     // purchase units per 1 storage unit
  const [isMarkingReceived, setIsMarkingReceived]     = useState(false);
  const warrantyFileRef = useRef(null);
  // ───────────────────────────────────────────────────────────────────────────

  // ── Reject Modal state ──────────────────────────────────────────────────────
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectRequest, setRejectRequest]         = useState(null);
  const [rejectReason, setRejectReason]           = useState('');
  const [isRejecting, setIsRejecting]             = useState(false);
  // ───────────────────────────────────────────────────────────────────────────

  // ── Check Inventory Modal state ─────────────────────────────────────────────
  const [isInvCheckOpen, setIsInvCheckOpen]       = useState(false);
  const [invCheckRequest, setInvCheckRequest]     = useState(null);
  const [invCheckResult, setInvCheckResult]       = useState(null);
  const [isCheckingInv, setIsCheckingInv]         = useState(false);
  // ─────────────────────────────────────────────────────────────────────────────

  // The currently mapped inventory item's Purchase Unit (e.g. "kg"), if it
  // has one defined — works for both Create (itemId just auto-matched) and
  // View/Edit (itemId is the PO's saved item reference) since both paths
  // set `itemId` before this derives. Falls back to the PurchaseRequest's
  // own persisted purchaseUnit (set at PO-save time) so it still shows up
  // even if the inventory item can't be re-matched for some reason.
  const itemPurchaseUnit = useMemo(() => {
    const matched = inventoryItems.find(i => i._id === itemId);
    return matched?.purchaseUnit || selectedRequest?.purchaseUnit || null;
  }, [itemId, inventoryItems, selectedRequest]);

  useEffect(() => {
    fetchPurchaseRequests();
    fetchVendors();
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (user?.companyId) {
      fetchCompanyAddress();
    }
  }, [user?.companyId]);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', '/api/purchase-requests');
      setRequests(data.data || []);
    } catch (error) {
      console.error("Failed to fetch purchase requests:", error);
      toast({
        title: "Error",
        description: "Failed to load purchase requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await apiRequest('GET', '/api/accounts/purchases/vendors');
      setVendors(data.data || []);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const data = await apiRequest('GET', '/api/accounts/purchases/items');
      setInventoryItems(data.data?.items || []);
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
    }
  };

  const fetchCompanyAddress = async () => {
    try {
      const response = await apiRequest('GET', `/api/companies/${user.companyId}`);
      if (response && response.company) {
        const comp = response.company;
        setCompanyProfile(comp);
        
        // Formulate the full company address
        const fullAddr = `${comp.address || ''}, ${comp.city || ''}, ${comp.state || ''} - ${comp.locationPin || ''}`
          .trim()
          .replace(/^,\s*/, '')
          .replace(/,\s*,/g, ',');
        
        setDeliveryAddress(fullAddr || 'Main Warehouse, Samtek Factory');
      }
    } catch (error) {
      console.error("Failed to fetch company address:", error);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const data = await apiRequest('PATCH', `/api/purchase-requests/${requestId}/status`, { status: newStatus });
      if (data.success) {
        toast({ title: "Success", description: "Status updated successfully" });
        fetchPurchaseRequests();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleStoreApprove = async (id) => {
    try {
      const data = await apiRequest('PATCH', `/api/purchase-requests/${id}/store-approve`);
      if (data.success) {
        toast({
          title: "Approved",
          description: "Purchase request approved and forwarded to Purchase department successfully."
        });
        fetchPurchaseRequests();
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleOpenRejectModal = (request) => {
    setRejectRequest(request);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectRequest) return;
    setIsRejecting(true);
    try {
      const data = await apiRequest('PATCH', `/api/purchase-requests/${rejectRequest._id}/store-reject`, {
        reason: rejectReason.trim() || 'Rejected by Store'
      });
      if (data.success) {
        toast({
          title: "Rejected",
          description: "Purchase request has been rejected."
        });
        setIsRejectModalOpen(false);
        fetchPurchaseRequests();
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // ── Check Inventory handler ─────────────────────────────────────────────
  const handleCheckInventory = async (request) => {
    setInvCheckRequest(request);
    setInvCheckResult(null);
    setIsInvCheckOpen(true);
    setIsCheckingInv(true);
    try {
      const data = await apiRequest('GET', `/api/purchase-requests/${request._id}/check-inventory`);
      setInvCheckResult(data);
    } catch (error) {
      setInvCheckResult({ success: false, found: false, message: error.message || 'Failed to check inventory' });
    } finally {
      setIsCheckingInv(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Open the Receive modal ───────────────────────────────────────────────
  const handleOpenReceiveModal = (request) => {
    setReceiveRequest(request);
    setReceiveSerialNo('');
    setReceiveWarrantyMonths('');
    setReceiveWarrantyCard(null);
    setReceiveQtyReceived(request.purchaseQuantity ? String(request.purchaseQuantity) : '');
    setReceiveFactor('');
    if (warrantyFileRef.current) warrantyFileRef.current.value = '';
    setIsReceiveModalOpen(true);
  };

  // ── Submit the Receive form (multipart) ─────────────────────────────────
  const handleConfirmReceive = async (e) => {
    e.preventDefault();

    if (!receiveSerialNo.trim()) {
      toast({ title: "Required", description: "Please enter the Serial Number.", variant: "destructive" });
      return;
    }
    // 0 is a valid warranty (no warranty) — only empty/negative is invalid
    if (receiveWarrantyMonths === '' || Number(receiveWarrantyMonths) < 0) {
      toast({ title: "Required", description: "Please enter the Warranty Period in months (0 if no warranty).", variant: "destructive" });
      return;
    }
    // Warranty Card is required only when there IS a warranty
    if (Number(receiveWarrantyMonths) > 0 && !receiveWarrantyCard) {
      toast({ title: "Required", description: "Please upload the Warranty Card (image or PDF).", variant: "destructive" });
      return;
    }

    // Unit conversion required when the order was placed in a purchase unit
    const needsConversion = !!(receiveRequest?.purchaseUnit && receiveRequest?.purchaseQuantity);
    if (needsConversion) {
      if (!(Number(receiveQtyReceived) > 0)) {
        toast({ title: "Required", description: `Please enter the received quantity in ${receiveRequest.purchaseUnit}.`, variant: "destructive" });
        return;
      }
      if (!(Number(receiveFactor) > 0)) {
        toast({ title: "Required", description: `Please enter how many ${receiveRequest.purchaseUnit} equal 1 storage unit.`, variant: "destructive" });
        return;
      }
    }

    setIsMarkingReceived(true);
    try {
      const formData = new FormData();
      formData.append('status', 'Received');
      formData.append('serialNumber', receiveSerialNo.trim());
      formData.append('warrantyPeriod', receiveWarrantyMonths);
      if (receiveWarrantyCard) formData.append('warrantyCard', receiveWarrantyCard);
      if (needsConversion) {
        formData.append('receivedQuantity', receiveQtyReceived);
        formData.append('conversionFactor', receiveFactor);
      }

      const data = await apiRequest('PATCH', `/api/purchase-requests/${receiveRequest._id}/status`, formData);

      toast({
        title: "Item Received",
        description: "Item marked as received. Serial number, warranty and card saved to inventory.",
      });
      setIsReceiveModalOpen(false);
      fetchPurchaseRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark item as received",
        variant: "destructive"
      });
    } finally {
      setIsMarkingReceived(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // Open Create PO Modal
  const handleOpenCreatePO = (request) => {
    setSelectedRequest(request);
    
    // Auto-map matching inventory item behind the scenes by name
    const matchedItem = inventoryItems.find(item => 
      item.name.toLowerCase().trim() === request.productName.toLowerCase().trim()
    );

    // If exact match not found, default to first item in inventory to ensure validity in DB
    const finalItemId = matchedItem?._id || (inventoryItems[0]?._id || '');
    setItemId(finalItemId);

    setUnitPrice(matchedItem?.purchaseCost || 0);
    setGstPercent(matchedItem?.gst || 18);
    setSupplierId('');

    // If this item is bought in a different unit than it's stocked in (e.g.
    // ordered by the kg, stored by the piece), the accounts person must type
    // how many purchase-units they're actually placing the order for —
    // that quantity, not the base request quantity, is what the vendor
    // quotes against. Otherwise (no distinct purchase unit) fall back to the
    // exact old behavior: multiply by the requested base quantity.
    setPoQuantity(matchedItem?.purchaseUnit ? '' : request.quantity);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setExpectedDeliveryDate(nextWeek.toISOString().split('T')[0]);

    // Pre-fill delivery location from logged in user's company profile
    let resolvedAddress = 'Main Warehouse, Samtek Factory';
    if (companyProfile) {
      resolvedAddress = `${companyProfile.address || ''}, ${companyProfile.city || ''}, ${companyProfile.state || ''} - ${companyProfile.locationPin || ''}`
        .trim()
        .replace(/^,\s*/, '')
        .replace(/,\s*,/g, ',');
    }
    setDeliveryAddress(resolvedAddress);
    
    setTerms('Delivery within 7 days. Payment within 30 days of receipt.');
    setNotes(`Purchase Order automatically generated for Purchase Request: ${request.requestId}`);
    
    setPoModalMode('create');
    setIsPOModalOpen(true);
  };

  // Open View PO Modal
  const handleOpenViewPO = (request) => {
    setSelectedRequest(request);
    const po = request.purchaseOrder;
    if (po) {
      setSupplierId(po.supplier?._id || po.supplier || '');
      const poItem = po.items?.[0];
      setItemId(poItem?.item || '');
      setUnitPrice(poItem?.unitPrice || 0);
      // The quantity actually saved on the PO — authoritative regardless of
      // whether it was a purchase-unit or base-unit order.
      setPoQuantity(poItem?.quantity ?? request.quantity);
      // Vendor-bid POs carry no GST (taxAmount is legitimately 0) — only fall
      // back to a guessed rate when totalAmount itself is missing.
      setGstPercent(po.totalAmount ? Math.round(((po.taxAmount || 0) / po.totalAmount) * 100) : 0);
      
      const dateStr = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : '';
      setExpectedDeliveryDate(dateStr);
      
      setDeliveryAddress(po.deliveryAddress || '');
      setTerms(po.terms || '');
      setNotes(po.notes || '');
    }
    
    setPoModalMode('view');
    setIsPOModalOpen(true);
  };

  // Submit new PO or Update PO
  const handleSavePO = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      toast({ title: "Validation Error", description: "Please select a Supplier/Vendor", variant: "destructive" });
      return;
    }
    if (!itemId) {
      toast({ title: "Validation Error", description: "Could not find a valid matching inventory item reference", variant: "destructive" });
      return;
    }
    if (unitPrice <= 0) {
      toast({ title: "Validation Error", description: "Unit price must be greater than zero", variant: "destructive" });
      return;
    }
    // The quantity that gets multiplied by Unit Price for the Grand Total:
    // the purchase-unit quantity when this item has one defined, otherwise
    // the requested base quantity (unchanged old behavior).
    const effectiveQty = itemPurchaseUnit ? Number(poQuantity) : selectedRequest.quantity;
    if (itemPurchaseUnit && !(effectiveQty > 0)) {
      toast({ title: "Validation Error", description: `Please enter the Purchase Quantity in ${itemPurchaseUnit}`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = [{
        item: itemId,
        quantity: effectiveQty,
        unitPrice: parseFloat(unitPrice)
      }];

      const totalAmt = parseFloat(unitPrice) * effectiveQty;
      const taxAmt = totalAmt * (parseFloat(gstPercent) / 100);

      const payload = {
        supplier: supplierId,
        items: itemsPayload,
        taxAmount: taxAmt,
        expectedDeliveryDate,
        deliveryAddress,
        terms,
        notes,
        // Lets the backend sync "Ordered: X kg" back onto the Purchase
        // Request for the Receive screen — see createPurchase/updatePurchase.
        ...(itemPurchaseUnit ? { purchaseQuantity: effectiveQty, purchaseUnit: itemPurchaseUnit } : {}),
      };

      let response;
      if (poModalMode === 'create') {
        payload.purchaseRequest = selectedRequest._id;
        response = await apiRequest('POST', '/api/accounts/purchases/orders', payload);
        toast({ title: "Success", description: "Purchase Order created successfully" });
      } else {
        response = await apiRequest('PUT', `/api/accounts/purchases/orders/${selectedRequest.purchaseOrder._id}`, payload);
        toast({ title: "Success", description: "Purchase Order updated successfully" });
      }

      setIsPOModalOpen(false);
      fetchPurchaseRequests();
    } catch (error) {
      console.error("Failed to save PO:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Purchase Order",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Approved': return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Ordered': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Received': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Requests & POs</h1>
          <p className="text-slate-500 mt-2">Manage purchase indents, draft orders, negotiate pricing, and notify suppliers.</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50 py-4">
          <CardTitle className="text-lg font-bold text-slate-800">All Requisitions</CardTitle>
          <CardDescription>Review item details, convert requests into Purchase Orders, and coordinate vendor delivery.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700 h-12 pl-6">Req ID</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12">Product Required</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12 text-center">Quantity</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12">Dept</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12">Date</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12 text-center">Priority</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12 text-center">Request Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-12 text-center">Action Workflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-slate-400 font-medium text-lg">
                        No purchase requests found at the moment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => {
                      const hasPO = !!request.purchaseOrder;

                      return (
                        <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors border-b">
                          <TableCell className="font-bold text-slate-900 pl-6">{request.requestId}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{request.productName}</TableCell>
                          <TableCell className="font-extrabold text-slate-900 text-center">
                            {request.quantity}
                            {(request.item?.unit || request.unit) && (
                              <span className="ml-1 font-medium text-slate-500 text-xs">{request.item?.unit || request.unit}</span>
                            )}
                            {request.purchaseQuantity && request.purchaseUnit && (
                              <div className="text-[10px] font-semibold text-violet-600 mt-0.5">
                                Ordered: {request.purchaseQuantity} {request.purchaseUnit}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-600">
                            {request.requestFromDepartment}
                            {request.source && request.source !== 'Store' && (
                              <Badge variant="secondary" className="ml-1 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-150">
                                {request.source}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 font-medium">
                            {request.requestDate ? format(new Date(request.requestDate), 'dd MMM yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`font-bold px-2 py-0.5 rounded ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {request.status === 'Rejected' ? (
                              <Badge variant="outline" className="font-black px-2.5 py-1 rounded-lg border bg-red-50 text-red-700 border-red-300">
                                Rejected
                              </Badge>
                            ) : request.source && request.source !== 'Store' && !request.storeApproved ? (
                              <Badge variant="outline" className="font-black px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
                                Pending Store Approval
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`font-black px-2.5 py-1 rounded-lg border ${getStatusColor(request.status)}`}>
                                {request.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <div className="flex items-center justify-center gap-2">
                              {isStoreUser ? (
                                <>
                                  {request.source && request.source !== 'Store' && !request.storeApproved && request.status !== 'Rejected' ? (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => handleCheckInventory(request)}
                                        variant="outline"
                                        className="border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold h-8 text-xs rounded-md"
                                      >
                                        <Search className="w-3.5 h-3.5 mr-1" /> Check Inventory
                                      </Button>
                                      <Button
                                        onClick={() => handleStoreApprove(request._id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs rounded-md shadow-sm"
                                      >
                                        <Check className="w-3.5 h-3.5 mr-1" /> Approve & Forward
                                      </Button>
                                      <Button
                                        onClick={() => handleOpenRejectModal(request)}
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50 font-semibold h-8 text-xs rounded-md"
                                      >
                                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                                      </Button>
                                    </div>
                                  ) : request.status === 'Rejected' ? (
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="font-bold px-2.5 py-1 rounded-lg border bg-red-50 text-red-700 border-red-200">
                                        <X className="w-3 h-3 mr-1" /> Rejected
                                      </Badge>
                                    </div>
                                  ) : (
                                    <>
                                      {hasPO ? (
                                        <Button
                                          onClick={() => handleOpenViewPO(request)}
                                          variant="outline"
                                          className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold h-8 text-xs rounded-md"
                                        >
                                          <Eye className="w-3.5 h-3.5 mr-1" /> View PO
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-slate-400 font-medium">Awaiting PO</span>
                                      )}
                                      
                                      {request.status === 'Ordered' && (
                                        <Button
                                          onClick={() => handleOpenReceiveModal(request)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs rounded-md shadow-sm"
                                        >
                                          <PackageCheck className="w-3.5 h-3.5 mr-1" /> Mark Received
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Accounts User: View PO (no manual Create PO — PO auto-generates via RFQ/Vendor Bidding) */}
                                  {hasPO ? (
                                    <Button
                                      onClick={() => handleOpenViewPO(request)}
                                      variant="outline"
                                      className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold h-8 text-xs rounded-md"
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" /> View PO
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium italic">
                                      Use RFQ Module →
                                    </span>
                                  )}

                                  {/* Status badge showing current state */}
                                  <Badge variant="outline" className={`font-black px-2 py-1 rounded-lg border text-xs ${
                                    request.status === 'Ordered' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {request.status}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Receive Item Modal ───────────────────────────────────────────────── */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-xl border shadow-lg p-0 overflow-hidden max-h-[90vh]">
          <form onSubmit={handleConfirmReceive} className="flex flex-col max-h-[90vh]">
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Mark Item as Received
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-1">
                Fill in the details before confirming receipt. These will be saved to the inventory record.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-4 bg-white flex-1 overflow-y-auto">
              {/* Info banner */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  Serial Number and Warranty Period are mandatory. Warranty Card is required only when the warranty is more than 0 months.
                </p>
              </div>

              {receiveRequest && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Item</p>
                  <p className="font-semibold text-slate-800 text-sm">{receiveRequest.productName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Req ID: {receiveRequest.requestId} · Requested: {receiveRequest.quantity} {receiveRequest.item?.unit || receiveRequest.unit || ''}
                    {receiveRequest.purchaseQuantity && receiveRequest.purchaseUnit && (
                      <span className="text-violet-600 font-semibold"> · Ordered: {receiveRequest.purchaseQuantity} {receiveRequest.purchaseUnit}</span>
                    )}
                  </p>
                </div>
              )}

              {/* ── Unit Conversion (order placed in a Purchase Unit) ─────────── */}
              {receiveRequest?.purchaseUnit && receiveRequest?.purchaseQuantity ? (() => {
                const baseUnit = receiveRequest.item?.unit || receiveRequest.unit || 'unit';
                const converted = Number(receiveQtyReceived) > 0 && Number(receiveFactor) > 0
                  ? Math.round((Number(receiveQtyReceived) / Number(receiveFactor)) * 1000) / 1000
                  : null;
                return (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-bold text-violet-800 uppercase">Unit Conversion</p>
                    <p className="text-xs text-violet-700">
                      Purchase ordered <strong>{receiveRequest.purchaseQuantity} {receiveRequest.purchaseUnit}</strong>, but this item is stored in <strong>{baseUnit}</strong>. Convert the received quantity to {baseUnit} — the converted quantity goes to QC and, after approval, into inventory.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="recv-qty" className="text-xs font-semibold text-slate-700 uppercase">
                          Received Qty ({receiveRequest.purchaseUnit}) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="recv-qty"
                          type="number"
                          min="0"
                          step="any"
                          placeholder={`e.g. ${receiveRequest.purchaseQuantity}`}
                          value={receiveQtyReceived}
                          onChange={(e) => setReceiveQtyReceived(e.target.value)}
                          className="border-slate-300 font-medium bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="recv-factor" className="text-xs font-semibold text-slate-700 uppercase">
                          1 {baseUnit} = ? {receiveRequest.purchaseUnit} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="recv-factor"
                          type="number"
                          min="0"
                          step="any"
                          placeholder={`e.g. 1 (${receiveRequest.purchaseUnit} per ${baseUnit})`}
                          value={receiveFactor}
                          onChange={(e) => setReceiveFactor(e.target.value)}
                          className="border-slate-300 font-medium bg-white"
                        />
                      </div>
                    </div>

                    {converted !== null && (
                      <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                        <p className="text-sm font-bold text-violet-800">
                          {receiveQtyReceived} {receiveRequest.purchaseUnit} = {converted} {baseUnit} → will be sent to QC
                        </p>
                      </div>
                    )}
                  </div>
                );
              })() : null}

              {/* Serial Number */}
              <div className="space-y-1.5">
                <Label htmlFor="recv-serial" className="text-xs font-semibold text-slate-700 uppercase">
                  Serial Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="recv-serial"
                  placeholder="e.g. SN-2024-XXXXXX"
                  value={receiveSerialNo}
                  onChange={(e) => setReceiveSerialNo(e.target.value)}
                  className="border-slate-300 font-medium"
                />
              </div>

              {/* Warranty Period */}
              <div className="space-y-1.5">
                <Label htmlFor="recv-warranty" className="text-xs font-semibold text-slate-700 uppercase">
                  Warranty Period (Months) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="recv-warranty"
                  type="number"
                  min="0"
                  placeholder="e.g. 12"
                  value={receiveWarrantyMonths}
                  onChange={(e) => setReceiveWarrantyMonths(e.target.value)}
                  className="border-slate-300 font-medium"
                />
              </div>

              {/* Warranty Card Upload — only needed when there IS a warranty (> 0 months) */}
              {receiveWarrantyMonths !== '' && Number(receiveWarrantyMonths) === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  No warranty (0 months) — Warranty Card is not required.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Warranty Card <span className="text-rose-500">*</span>
                    <span className="ml-1 font-normal text-slate-400 normal-case">(JPG, PNG or PDF, max 10 MB)</span>
                  </Label>
                  <div
                    className={`flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                      receiveWarrantyCard
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                    }`}
                    onClick={() => warrantyFileRef.current?.click()}
                  >
                    <Upload className={`w-5 h-5 shrink-0 ${receiveWarrantyCard ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {receiveWarrantyCard
                        ? receiveWarrantyCard.name
                        : 'Click to upload warranty card'}
                    </span>
                    {receiveWarrantyCard && (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
                    )}
                  </div>
                  <input
                    ref={warrantyFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceiveWarrantyCard(e.target.files?.[0] || null)}
                  />
                </div>
              )}
            </div>

            <div className="px-6 pt-4 pb-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiveModalOpen(false)}
                disabled={isMarkingReceived}
                className="font-semibold rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMarkingReceived}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm"
              >
                {isMarkingReceived ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><PackageCheck className="w-4 h-4 mr-2" /> Confirm Receipt</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* ──────────────────────────────────────────────────────────────────────── */}

      {/* PO Dialog (Create / Edit / View) */}
      <Dialog open={isPOModalOpen} onOpenChange={setIsPOModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-lg p-0 border shadow-lg">
          {selectedRequest && (
            <form onSubmit={handleSavePO} className="flex flex-col h-full">
              {/* Modal Header */}
              <DialogHeader className="p-6 border-b shrink-0 bg-slate-50">
                <div className="flex justify-between items-center">
                  <div className="space-y-1 text-left">
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-500" />
                      {poModalMode === 'create' && "Draft Purchase Order"}
                      {poModalMode === 'edit' && "Modify Purchase Order"}
                      {poModalMode === 'view' && `Purchase Order Details`}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                      Originating from request: <span className="font-semibold">{selectedRequest.requestId}</span>
                    </DialogDescription>
                  </div>
                  {poModalMode === 'view' && selectedRequest.purchaseOrder && (
                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 text-slate-700 border-slate-300 bg-slate-100">
                      PO: {selectedRequest.purchaseOrder.purchaseOrderNumber}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                
                {/* Information Card */}
                <div className={`bg-slate-50 rounded-lg p-4 border border-slate-200 grid gap-4 ${itemPurchaseUnit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Product to Purchase</label>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRequest.productName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Requested Quantity</label>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRequest.quantity} Unit(s)</p>
                  </div>
                  {itemPurchaseUnit && (
                    <div>
                      <label className="text-[10px] font-semibold text-violet-500 uppercase">Purchased In</label>
                      <p className="font-bold text-violet-700 text-sm mt-0.5">{itemPurchaseUnit} (vendor's unit)</p>
                    </div>
                  )}
                </div>

                {poModalMode === 'view' ? (
                  // Read Only View Mode
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Supplier/Vendor
                        </label>
                        <p className="font-semibold text-slate-800 text-sm mt-1">
                          {vendors.find(v => v._id === supplierId)?.supplierName || 'Not selected'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 border-y py-4 my-2">
                      <div className="text-center border-r">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Purchased Qty</label>
                        <p className="text-lg font-semibold text-slate-800 mt-1">
                          {poQuantity} {itemPurchaseUnit || 'Unit(s)'}
                        </p>
                      </div>
                      <div className="text-center border-r">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Negotiated Price</label>
                        <p className="text-lg font-semibold text-slate-800 mt-1">₹{parseFloat(unitPrice).toLocaleString()}</p>
                      </div>
                      <div className="text-center border-r">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">GST Rate</label>
                        <p className="text-lg font-semibold text-slate-800 mt-1">{gstPercent}%</p>
                      </div>
                      <div className="text-center">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Grand Total</label>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          ₹{(parseFloat(unitPrice) * (Number(poQuantity) || 0) * (1 + parseFloat(gstPercent)/100)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Expected Delivery
                        </label>
                        <p className="font-semibold text-slate-700 text-sm mt-1">
                          {expectedDeliveryDate ? format(new Date(expectedDeliveryDate), 'dd MMMM yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Location
                        </label>
                        <p className="font-semibold text-slate-700 text-sm mt-1">{deliveryAddress}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <Notebook className="w-3.5 h-3.5 text-slate-400" /> Terms & Conditions
                      </label>
                      <p className="font-medium text-slate-600 text-sm mt-1 italic">"{terms}"</p>
                    </div>

                    {notes && (
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-slate-400" /> Internal Notes
                        </label>
                        <p className="font-medium text-slate-600 text-sm mt-1">{notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Editable Mode (Create or Edit)
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Supplier dropdown */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Select Vendor/Supplier*</label>
                        <select
                          className="w-full border rounded-md p-2.5 bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          required
                        >
                          <option value="">-- Choose Vendor --</option>
                          {vendors.map(vendor => (
                            <option key={vendor._id} value={vendor._id}>
                              {vendor.supplierName} ({vendor.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {itemPurchaseUnit && (
                      <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-violet-700">
                          This item is purchased in <strong>{itemPurchaseUnit}</strong>, not {selectedRequest.unit || 'the storage unit'}.
                          Enter the Unit Price per {itemPurchaseUnit} and how many {itemPurchaseUnit} you're ordering — the Grand Total
                          uses this quantity, not the {selectedRequest.quantity} Unit(s) originally requested.
                        </p>
                      </div>
                    )}

                    <div className={`grid gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 ${itemPurchaseUnit ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      {/* Purchase quantity — only shown when the item has a distinct Purchase Unit */}
                      {itemPurchaseUnit && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase">Purchase Qty ({itemPurchaseUnit})*</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={poQuantity}
                            onChange={(e) => setPoQuantity(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                            placeholder={`e.g. 2 (${itemPurchaseUnit})`}
                            required
                            className="font-semibold border-violet-200 focus:ring-violet-500"
                          />
                        </div>
                      )}

                      {/* Price negotiated */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">
                          Unit Price (₹{itemPurchaseUnit ? ` / ${itemPurchaseUnit}` : ''})*
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                          required
                          className="font-semibold border-slate-200"
                        />
                      </div>

                      {/* GST rate */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Tax / GST (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={gstPercent}
                          onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                          required
                          className="font-semibold border-slate-200"
                        />
                      </div>

                      {/* Live Totals summary */}
                      <div className="space-y-1 text-right flex flex-col justify-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Calculated Grand Total</span>
                        <span className="text-xl font-bold text-slate-900">
                          ₹{(unitPrice * (Number(poQuantity) || 0) * (1 + gstPercent/100)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expected date */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Expected Delivery Date*</label>
                        <Input
                          type="date"
                          value={expectedDeliveryDate}
                          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                          required
                          className="border-slate-200 font-semibold"
                        />
                      </div>

                      {/* Delivery Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Delivery Location*</label>
                        <Input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          required
                          className="border-slate-200 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Terms & Conditions</label>
                      <textarea
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full border rounded-md p-2.5 bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                        placeholder="E.g., Payment terms, inspection specifications"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Internal Remarks/Notes</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border rounded-md p-2.5 bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                        placeholder="Any comments for internal tracking"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t shrink-0 flex justify-end gap-3 bg-slate-50/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPOModalOpen(false)}
                  className="rounded-md font-semibold"
                >
                  Close
                </Button>
                
                {poModalMode === 'view' && selectedRequest.purchaseOrder?.status === 'Draft' && !isStoreUser && (
                  <Button
                    type="button"
                    onClick={() => setPoModalMode('edit')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Modify PO
                  </Button>
                )}

                {poModalMode !== 'view' && !isStoreUser && (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Save Purchase Order
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Check Inventory Modal ────────────────────────────────────────────── */}
      <Dialog open={isInvCheckOpen} onOpenChange={setIsInvCheckOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border shadow-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-violet-50">
            <DialogTitle className="flex items-center gap-2 text-violet-900 font-bold text-lg">
              <Search className="w-5 h-5 text-violet-600" />
              Inventory Check
            </DialogTitle>
            <DialogDescription className="text-violet-700 text-sm mt-1">
              {invCheckRequest && (
                <span>
                  Checking stock for: <strong>{invCheckRequest.productName}</strong>
                  {invCheckRequest.materialCode && (
                    <span className="ml-1 font-mono text-xs bg-violet-100 px-1.5 py-0.5 rounded">
                      Code: {invCheckRequest.materialCode}
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 bg-white min-h-[180px]">
            {isCheckingInv ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm font-medium">Searching inventory...</p>
              </div>
            ) : invCheckResult ? (
              <>
                {/* Overall status banner */}
                {invCheckResult.found ? (
                  <div className={`flex items-start gap-3 rounded-lg p-3 border ${
                    invCheckResult.canFulfill
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    {invCheckResult.canFulfill ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <p className={`text-sm font-semibold ${
                      invCheckResult.canFulfill ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {invCheckResult.message}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg p-3 border bg-red-50 border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-red-800">{invCheckResult.message}</p>
                  </div>
                )}

                {/* Item details table */}
                {invCheckResult.items && invCheckResult.items.length > 0 && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Item</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Code</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600">In Stock</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Required</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invCheckResult.items.map((item) => (
                          <tr key={item._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="px-3 py-2.5 font-medium text-slate-800">{item.name}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-500">{item.code || '—'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`font-bold ${
                                item.currentQty === 0 ? 'text-red-600' :
                                item.currentQty < item.requestedQty ? 'text-amber-600' :
                                'text-emerald-600'
                              }`}>
                                {item.currentQty} {item.unit}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium text-slate-700">
                              {item.requestedQty} {item.unit}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.status === 'sufficient'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.status === 'low'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {item.status === 'sufficient' && <CheckCircle2 className="w-3 h-3" />}
                                {item.status === 'low' && <AlertTriangle className="w-3 h-3" />}
                                {item.status === 'out_of_stock' && <AlertCircle className="w-3 h-3" />}
                                {item.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsInvCheckOpen(false)}
              className="font-semibold rounded-md"
            >
              Close
            </Button>
            {invCheckResult && !isCheckingInv && (
              <Button
                variant="outline"
                onClick={() => handleCheckInventory(invCheckRequest)}
                className="border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold rounded-md"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" /> Re-check
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ── Reject Request Modal ─────────────────────────────────────────────── */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-xl border shadow-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-red-50">
            <DialogTitle className="flex items-center gap-2 text-red-900 font-bold text-lg">
              <X className="w-5 h-5 text-red-600" />
              Reject Purchase Request
            </DialogTitle>
            <DialogDescription className="text-red-700 text-sm mt-1">
              {rejectRequest && (
                <span>
                  <strong>{rejectRequest.requestId}</strong> — {rejectRequest.productName} (Qty: {rejectRequest.quantity})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 bg-white">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Yeh request reject ho jaayegi aur Production department ko visible rahegi rejected status ke saath.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase">
                Rejection Reason <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </Label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Item already available in stock, duplicate request..."
                className="w-full border rounded-md p-2.5 bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 font-medium text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isRejecting}
              className="font-semibold rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-sm"
            >
              {isRejecting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rejecting...</>
              ) : (
                <><X className="w-3.5 h-3.5 mr-1.5" /> Confirm Reject</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─────────────────────────────────────────────────────────────────────── */}
    </div>
  );
}
