import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, Plus, Eye, Send, Check, Mail, Clock, ShieldCheck, 
  MapPin, Notebook, Info, FileText, ChevronRight, Edit2, RotateCw,
  Upload, PackageCheck, AlertCircle
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
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('Main Warehouse, Samtek Factory');
  const [terms, setTerms] = useState('Delivery within 7 days. Payment within 30 days of receipt.');
  const [notes, setNotes] = useState('');

  // Local Action Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── Receive Modal state ─────────────────────────────────────────────────────
  const [isReceiveModalOpen, setIsReceiveModalOpen]   = useState(false);
  const [receiveRequest, setReceiveRequest]           = useState(null);
  const [receiveSerialNo, setReceiveSerialNo]         = useState('');
  const [receiveWarrantyMonths, setReceiveWarrantyMonths] = useState('');
  const [receiveWarrantyCard, setReceiveWarrantyCard] = useState(null);   // File object
  const [isMarkingReceived, setIsMarkingReceived]     = useState(false);
  const warrantyFileRef = useRef(null);
  // ───────────────────────────────────────────────────────────────────────────

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

  // ── Open the Receive modal ───────────────────────────────────────────────
  const handleOpenReceiveModal = (request) => {
    setReceiveRequest(request);
    setReceiveSerialNo('');
    setReceiveWarrantyMonths('');
    setReceiveWarrantyCard(null);
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
    if (!receiveWarrantyMonths || Number(receiveWarrantyMonths) <= 0) {
      toast({ title: "Required", description: "Please enter a valid Warranty Period in months.", variant: "destructive" });
      return;
    }
    if (!receiveWarrantyCard) {
      toast({ title: "Required", description: "Please upload the Warranty Card (image or PDF).", variant: "destructive" });
      return;
    }

    setIsMarkingReceived(true);
    try {
      const formData = new FormData();
      formData.append('status', 'Received');
      formData.append('serialNumber', receiveSerialNo.trim());
      formData.append('warrantyPeriod', receiveWarrantyMonths);
      formData.append('warrantyCard', receiveWarrantyCard);

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
      setGstPercent(po.taxAmount && po.totalAmount ? Math.round((po.taxAmount / po.totalAmount) * 100) : 18);
      
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

    setIsSubmitting(true);
    try {
      const itemsPayload = [{
        item: itemId,
        quantity: selectedRequest.quantity,
        unitPrice: parseFloat(unitPrice)
      }];

      const totalAmt = parseFloat(unitPrice) * selectedRequest.quantity;
      const taxAmt = totalAmt * (parseFloat(gstPercent) / 100);

      const payload = {
        supplier: supplierId,
        items: itemsPayload,
        taxAmount: taxAmt,
        expectedDeliveryDate,
        deliveryAddress,
        terms,
        notes,
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

  // Send PO to Supplier by Email
  const handleSendPOToVendor = async (request) => {
    const poId = request.purchaseOrder?._id;
    if (!poId) return;

    setIsSendingEmail(true);
    try {
      const response = await apiRequest('POST', `/api/accounts/purchases/orders/${poId}/send-email`);
      if (response.success) {
        toast({
          title: "Email Dispatched",
          description: `Purchase Order sent successfully to ${request.purchaseOrder.supplier?.supplierName || 'Vendor'}`,
        });
        
        // Refresh requests to show updated status
        fetchPurchaseRequests();
      } else {
        throw new Error(response.message || 'Failed to dispatch email');
      }
    } catch (error) {
      console.error("Failed to send PO:", error);
      toast({
        title: "Dispatch Failed",
        description: error.message || "Could not email Purchase Order. Verify SMTP & Supplier email.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Approved': return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Ordered': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Received': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
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
                      const isDraft = request.purchaseOrder?.status === 'Draft';
                      
                      return (
                        <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors border-b">
                          <TableCell className="font-bold text-slate-900 pl-6">{request.requestId}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{request.productName}</TableCell>
                          <TableCell className="font-extrabold text-slate-900 text-center">{request.quantity}</TableCell>
                          <TableCell className="font-medium text-slate-600">{request.requestFromDepartment}</TableCell>
                          <TableCell className="text-slate-500 font-medium">
                            {request.requestDate ? format(new Date(request.requestDate), 'dd MMM yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`font-bold px-2 py-0.5 rounded ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`font-black px-2.5 py-1 rounded-lg border ${getStatusColor(request.status)}`}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <div className="flex items-center justify-center gap-2">
                              {isStoreUser ? (
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
                              ) : (
                                <>
                                  {/* Workflow trigger buttons */}
                                  {!hasPO ? (
                                    <Button
                                      onClick={() => handleOpenCreatePO(request)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 text-xs rounded-md shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-1" /> Create PO
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => handleOpenViewPO(request)}
                                        variant="outline"
                                        className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold h-8 text-xs rounded-md"
                                      >
                                        <Eye className="w-3.5 h-3.5 mr-1" /> View PO
                                      </Button>
                                      {isDraft ? (
                                        <Button
                                          onClick={() => handleSendPOToVendor(request)}
                                          disabled={isSendingEmail}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-8 text-xs rounded-md shadow-sm"
                                        >
                                          {isSendingEmail ? (
                                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                          ) : (
                                            <Send className="w-3.5 h-3.5 mr-1" />
                                          )}
                                          Send Email
                                        </Button>
                                      ) : (
                                        <Badge variant="success" className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold h-8 text-xs px-2.5 rounded-lg flex items-center gap-1 border-0">
                                          <Check className="w-3.5 h-3.5" /> Sent to Vendor
                                        </Badge>
                                      )}
                                    </>
                                  )}

                                  {/* Simple manual override selector */}
                                  <Select
                                    value={request.status}
                                    onValueChange={(val) => handleStatusChange(request._id, val)}
                                  >
                                    <SelectTrigger className="w-[100px] h-8 text-xs font-semibold">
                                      <SelectValue placeholder="Override" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Pending">Pending</SelectItem>
                                      <SelectItem value="Approved">Approved</SelectItem>
                                      <SelectItem value="Ordered">Ordered</SelectItem>
                                      <SelectItem value="Received">Received</SelectItem>
                                    </SelectContent>
                                  </Select>
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
        <DialogContent className="sm:max-w-[480px] rounded-xl border shadow-lg p-0 overflow-hidden">
          <form onSubmit={handleConfirmReceive}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50">
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Mark Item as Received
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-1">
                Fill in all 3 details before confirming receipt. These will be saved to the inventory record.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-4 bg-white">
              {/* Info banner */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  All three fields are mandatory. Item will not be marked as Received until Serial Number, Warranty Period and Warranty Card are provided.
                </p>
              </div>

              {receiveRequest && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Item</p>
                  <p className="font-semibold text-slate-800 text-sm">{receiveRequest.productName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Req ID: {receiveRequest.requestId} · Qty: {receiveRequest.quantity}</p>
                </div>
              )}

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

              {/* Warranty Card Upload */}
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
            </div>

            <div className="px-6 pt-4 pb-6 border-t bg-slate-50 flex justify-end gap-3">
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
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Product to Purchase</label>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRequest.productName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Order Quantity</label>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedRequest.quantity} Unit(s)</p>
                  </div>
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

                    <div className="grid grid-cols-3 gap-4 border-y py-4 my-2">
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
                          ₹{(parseFloat(unitPrice) * selectedRequest.quantity * (1 + parseFloat(gstPercent)/100)).toLocaleString(undefined, {maximumFractionDigits: 2})}
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

                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {/* Price negotiated */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Unit Price (₹)*</label>
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
                          ₹{(unitPrice * selectedRequest.quantity * (1 + gstPercent/100)).toLocaleString(undefined, {maximumFractionDigits: 2})}
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
    </div>
  );
}
