import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Eye,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useSettings } from '@/hooks/useSettings';

const NocRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');

  // State for Gate Pass Modal
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // State for View Gate Pass
  const [viewGatePassOpen, setViewGatePassOpen] = useState(false);
  const [gatePassData, setGatePassData] = useState(null);

  const { data: nocRequests, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/noc-requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/noc-requests');
      return response.data;
    }
  });

  const filteredRequests = (nocRequests || []).filter(item => {
    return (
      (item.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.machineName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Mutation for Approving NOC
  const approveNOCMutation = useMutation({
    mutationFn: async (saleId) => {
      const response = await apiRequest('POST', `/api/orders/approve-noc/${saleId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NOC approved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/noc-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve NOC",
        variant: "destructive"
      });
    }
  });

  // Mutation for generating Gate Pass
  const generateGatePassMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiRequest('POST', `/api/orders/gate-pass/${payload.saleId}`, payload.data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Gate Pass generated successfully!",
      });
      setGatePassModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders/noc-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate Gate Pass",
        variant: "destructive"
      });
    }
  });

  const handleApproveNOC = (saleId) => {
    approveNOCMutation.mutate(saleId);
  };

  const handleGenerateGatePassClick = (saleId) => {
    setSelectedSaleId(saleId);
    setGatePassModalOpen(true);
  };

  const handleGenerateGatePass = () => {
    if (!vehicleNumber || !driverName) {
      toast({
        title: "Validation Error",
        description: "Please enter vehicle number and driver name",
        variant: "destructive"
      });
      return;
    }

    generateGatePassMutation.mutate({
      saleId: selectedSaleId,
      data: {
        vehicleNumber,
        driverName,
        contactNumber
      }
    });
  };

  const handleViewGatePass = (item) => {
    setGatePassData(item);
    setViewGatePassOpen(true);
  };

  const downloadGatePassPDF = (data) => {
    const doc = new jsPDF();
    const company = settings?.company || {};

    const addBorder = (x, y, w, h) => {
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, w, h);
    };

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(company.name || 'SAMTEK MACHINERY', 20, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(company.address || 'Industrial Area, Phase-1', 20, 25);
    doc.text(`GST : ${company.gstNumber || '27ABCDE1234F1Z5'}`, 20, 29);
    doc.text(`Phone : ${company.phone || '+91 98765 43210'}`, 20, 33);
    doc.text(`Email : ${company.email || 'info@samtek.com'}`, 20, 37);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Gate Pass No. : GP-${data.orderCode}`, 190, 25, { align: 'right' }); // Usually from gatePassData
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${new Date().toLocaleDateString()}`, 190, 30, { align: 'right' });
    doc.text(`Ref. : ${data.orderCode}`, 190, 35, { align: 'right' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GATE PASS', 105, 50, { align: 'center' });

    addBorder(20, 60, 85, 45); 
    addBorder(105, 60, 85, 45);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Consignee Details', 22, 65);
    doc.text('Logistics & Vehicle Details', 107, 65);

    doc.setDrawColor(230, 230, 230);
    doc.line(22, 67, 102, 67); 
    doc.line(107, 67, 187, 67);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(data.customerName, 22, 73);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mobile: ${data.customerMobile}`, 22, 78);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Vehicle No: ${vehicleNumber}`, 107, 73);
    doc.setFont('helvetica', 'normal');
    doc.text(`Driver Name: ${driverName}`, 107, 78);
    doc.text(`Contact: ${contactNumber}`, 107, 83);
    doc.text(`Status: Verified for Dispatch`, 107, 88);

    doc.autoTable({
      startY: 115,
      head: [['Sr.', 'Description of Goods', 'Qty', 'Unit', 'Status']],
      body: [
        ['1', `${data.machineName} (${data.machineCode})`, '1', 'Lot', 'Dispatched'],
        ['', 'SN:', '', '', data.serialNumber],
        ['', 'Invoiced Value', '', '', `INR ${data.totalAmount?.toLocaleString()}`],
        ['', 'Payment Status', '', '', data.paymentStatus]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { halign: 'center', width: 10 },
        2: { halign: 'center', width: 15 },
        3: { halign: 'center', width: 15 },
        4: { halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 30;

    addBorder(20, finalY - 5, 170, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`For, ${company.name || 'SAMTEK MACHINERY'}`, 185, finalY + 5, { align: 'right' });
    doc.text('Authorised Signatory', 185, finalY + 20, { align: 'right' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated gate pass and does not require physical signature. E. & O. E.', 105, 285, { align: 'center' });

    doc.save(`GatePass_${data.orderCode}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            NOC Requests & Gate Pass
          </h1>
          <p className="text-slate-500">Approve NOC and generate gate pass for packed orders</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh List
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-white border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search orders, customers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
              Total: {filteredRequests.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[160px]">Order</TableHead>
                <TableHead>Customer Details</TableHead>
                <TableHead>Machine Details</TableHead>
                <TableHead className="text-right">Financials</TableHead>
                <TableHead className="text-center w-[180px]">Status & Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-slate-500 text-sm">Loading requests...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No pending NOC requests found
                  </TableCell>
                </TableRow>
              ) : filteredRequests.map((item) => (
                <TableRow key={item.saleId} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.orderCode}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.customerName}</div>
                    <div className="text-xs text-slate-500">{item.customerMobile}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.machineName}</div>
                    <div className="text-xs text-slate-500">SN: {item.serialNumber}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-slate-900">₹{item.totalAmount?.toLocaleString()}</div>
                    {item.advancedPaymentAmount > 0 && (
                      <div className="text-[10px] text-emerald-600 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                        <CreditCard className="w-2.5 h-2.5" />
                        Advance: ₹{item.advancedPaymentAmount?.toLocaleString()}
                      </div>
                    )}
                    <div className={`text-[10px] font-medium ${item.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.paymentStatus} (Paid: ₹{item.paidAmount?.toLocaleString()})
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2 items-center">
                      {item.nocStatus === 'Approved' ? (
                        <>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            NOC Approved
                          </Badge>
                          {item.gatePassStatus === 'Generated' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-full gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              onClick={() => handleViewGatePass(item)}
                            >
                              <FileText className="w-3.5 h-3.5" /> Gate Pass
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 w-full bg-slate-800 hover:bg-slate-900 text-xs"
                              onClick={() => handleGenerateGatePassClick(item.saleId)}
                            >
                              Generate Gate Pass
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 w-full bg-blue-600 hover:bg-blue-700 text-xs"
                          onClick={() => handleApproveNOC(item.saleId)}
                          disabled={approveNOCMutation.isPending}
                        >
                          {approveNOCMutation.isPending ? "Approving..." : "Approve NOC"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gate Pass Generation Modal */}
      <Dialog open={gatePassModalOpen} onOpenChange={setGatePassModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Gate Pass</DialogTitle>
            <DialogDescription>
              Enter vehicle and driver details to generate dispatch gate pass.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="vehicle">Vehicle Number</Label>
              <Input
                id="vehicle"
                placeholder="e.g. HR-55-XY-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="driver">Driver Full Name</Label>
              <Input
                id="driver"
                placeholder="Enter driver name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Driver Contact Number</Label>
              <Input
                id="contact"
                placeholder="10 digit mobile number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGatePassModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleGenerateGatePass}
              disabled={generateGatePassMutation.isPending}
            >
              {generateGatePassMutation.isPending ? "Generating..." : "Generate Gate Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Gate Pass Modal */}
      <Dialog open={viewGatePassOpen} onOpenChange={setViewGatePassOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white p-0 overflow-hidden rounded-[1.5rem] shadow-2xl border-none max-h-[90vh] flex flex-col">
          <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar" id="gate-pass-content">
            <div className="flex justify-between items-start border-b border-slate-100 pb-10">
              <div className="flex gap-4 items-center">
                <img src="/logo Semtek.webp" alt="Logo" className="w-16 h-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter text-slate-900">SUNRISE</h2>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">Dispatch Gate Pass</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">GP-{gatePassData?.orderCode}</div>
                <div className="text-xs text-slate-400">{new Date().toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Consignee Details</Label>
                <div className="font-semibold text-slate-900">{gatePassData?.customerName}</div>
                <div className="text-sm text-slate-500">{gatePassData?.customerMobile}</div>
              </div>
              <div className="space-y-1 text-right">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Order Details</Label>
                <div className="font-semibold text-slate-900">ID: {gatePassData?.orderCode}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Vehicle Number</Label>
                <div className="text-sm font-semibold">{vehicleNumber || 'N/A'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Driver Name</Label>
                <div className="text-sm font-semibold">{driverName || 'N/A'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Contact No.</Label>
                <div className="text-sm font-semibold">{contactNumber || 'N/A'}</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-600">Description</th>
                    <th className="text-right p-3 font-semibold text-slate-600">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3">Order Total Amount</td>
                    <td className="p-3 text-right">₹{gatePassData?.totalAmount?.toLocaleString()}</td>
                  </tr>
                  {gatePassData?.advancedPaymentAmount > 0 && (
                    <tr className="bg-emerald-50">
                      <td className="p-3 text-emerald-700 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Advanced Paid (Lead)
                      </td>
                      <td className="p-3 text-right text-emerald-700 font-semibold">
                        - ₹{gatePassData.advancedPaymentAmount?.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-3">Payment Status</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {gatePassData?.paymentStatus}
                      </span>
                    </td>
                  </tr>
                  {gatePassData?.advancedPaymentAmount > 0 && (
                    <tr className="bg-blue-50">
                      <td className="p-3 font-bold text-blue-700">Net Balance Due</td>
                      <td className="p-3 text-right font-bold text-blue-700">
                        ₹{gatePassData?.balanceAmount?.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-12 flex justify-between">
              <div className="text-center">
                <div className="w-32 border-b border-slate-300 mb-2"></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Authorized Signatory</div>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-300 mb-2"></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Receiver's Signature</div>
              </div>
            </div>

            <div className="text-center pt-6">
              <p className="text-[10px] text-slate-400 italic">This is a computer generated document and does not require physical signature.</p>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t flex justify-end items-center gap-6">
            <Button variant="ghost" onClick={() => setViewGatePassOpen(false)} className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl h-12 px-8 font-bold shadow-lg shadow-emerald-500/20"
              onClick={() => downloadGatePassPDF(gatePassData)}
            >
              <FileText className="w-4 h-4" /> DOWNLOAD PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NocRequest;
