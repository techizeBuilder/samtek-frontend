import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Building2, Wallet, DollarSign, MoreVertical, Download, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function Accounts() {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const [viewModalData, setViewModalData] = useState(null);
  const [statusModalData, setStatusModalData] = useState(null);
  const [pdfToast, setPdfToast] = useState(false);

  // Dummy Financial Data
  const summaryData = {
    totalIncome: 125400,
    totalExpenses: 78350,
    customerPending: 32400,
    vendorPending: 18900,
    cashBalance: 47050,
    profitLoss: 47050,
  };

  const incomeData = [
    { id: 1, date: '2025-01-20', source: 'Sales', amount: 12500, paymentMode: 'UPI', location: 'Mumbai' },
    { id: 2, date: '2025-01-19', source: 'Customer Payment', amount: 8900, paymentMode: 'Bank Transfer', location: 'Pune' },
    { id: 3, date: '2025-01-18', source: 'Sales', amount: 15600, paymentMode: 'Cash', location: 'Bangalore' },
    { id: 4, date: '2025-01-17', source: 'Other', amount: 5200, paymentMode: 'Cheque', location: 'Mumbai' },
    { id: 5, date: '2025-01-16', source: 'Sales', amount: 18900, paymentMode: 'UPI', location: 'Pune' },
  ];
  const expenseData = [
    { id: 1, date: '2025-01-20', type: 'Raw Material', amount: 22400, paymentMode: 'Bank Transfer', location: 'Mumbai' },
    { id: 2, date: '2025-01-19', type: 'Salary', amount: 15000, paymentMode: 'Bank Transfer', location: 'Pune' },
    { id: 3, date: '2025-01-18', type: 'Rent', amount: 12000, paymentMode: 'Cheque', location: 'Bangalore' },
    { id: 4, date: '2025-01-17', type: 'Electricity', amount: 4350, paymentMode: 'Online', location: 'Mumbai' },
    { id: 5, date: '2025-01-16', type: 'Transport', amount: 8600, paymentMode: 'Cash', location: 'Pune' },
  ];
  const customerDues = [
    { id: 1, name: 'Bombay Sweets & Co.', invoiceAmount: 18500, paid: 8500, pending: 10000 },
    { id: 2, name: 'Delhi Bakery House', invoiceAmount: 12300, paid: 12300, pending: 0 },
    { id: 3, name: 'Mumbai Confectionery', invoiceAmount: 15600, paid: 9600, pending: 6000 },
    { id: 4, name: 'Pune Pastry Shop', invoiceAmount: 9200, paid: 0, pending: 9200 },
    { id: 5, name: 'Bangalore Bread Co.', invoiceAmount: 11400, paid: 6400, pending: 5000 },
  ];
  const vendorDues = [
    { id: 1, name: 'Premium Flour Mills', billAmount: 8900, paid: 8900, pending: 0 },
    { id: 2, name: 'Spice Master Ltd.', billAmount: 5600, paid: 2600, pending: 3000 },
    { id: 3, name: 'Dairy Fresh Suppliers', billAmount: 12400, paid: 6400, pending: 6000 },
    { id: 4, name: 'Sugar House Inc.', billAmount: 6200, paid: 0, pending: 6200 },
    { id: 5, name: 'Packaging Solutions', billAmount: 4800, paid: 3800, pending: 1000 },
  ];

  // Card for summary, styled like DeliveryChallan
  const SummaryCard = ({ title, amount, icon: Icon, color }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 shadow-sm">
      <div className={`rounded-full p-3 bg-gray-100 flex items-center justify-center`}>
        <Icon className="h-6 w-6 text-blue-700" />
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">₹{amount.toLocaleString('en-IN')}</div>
      </div>
    </div>
  );

  // Dummy transaction data for table
  const transactionRows = [{
    id: 1, date: '2025-01-20', type: 'Income', source: 'Bombay Sweets & Co.', amount: 12500, status: 'Paid', invoice: 'INV-001', paymentMode: 'UPI', location: 'Mumbai', remarks: 'Full payment received',
  }, {
    id: 2, date: '2025-01-19', type: 'Expense', source: 'Premium Flour Mills', amount: 8900, status: 'Pending', invoice: 'BILL-002', paymentMode: 'Bank Transfer', location: 'Pune', remarks: 'Awaiting confirmation',
  }, {
    id: 3, date: '2025-01-18', type: 'Income', source: 'Delhi Bakery House', amount: 15600, status: 'Paid', invoice: 'INV-003', paymentMode: 'Cash', location: 'Bangalore', remarks: 'Cash payment',
  }, {
    id: 4, date: '2025-01-17', type: 'Expense', source: 'Dairy Fresh Suppliers', amount: 12400, status: 'Paid', invoice: 'BILL-004', paymentMode: 'Cheque', location: 'Mumbai', remarks: 'Cheque cleared',
  }, {
    id: 5, date: '2025-01-16', type: 'Income', source: 'Pune Pastry Shop', amount: 18900, status: 'Pending', invoice: 'INV-005', paymentMode: 'UPI', location: 'Pune', remarks: 'UPI pending',
  }];

  // Dummy PDF download
  const handleInvoiceDownload = (row) => {
    // Simulate PDF download
    setPdfToast(true);
    setTimeout(() => setPdfToast(false), 2000);
    // Optionally, trigger a real download with a dummy blob
    const blob = new Blob([
      `Invoice: ${row.invoice}\nDate: ${row.date}\nType: ${row.type}\nSource: ${row.source}\nAmount: ₹${row.amount.toLocaleString('en-IN')}`
    ], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${row.invoice}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-8xl mx-auto space-y-4 md:space-y-6 bg-gray-50 min-h-screen">
      {/* Dummy Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Dummy Filter</h2>
            <p className="text-gray-600 mb-4">This is a dummy filter modal. Add filter fields here.</p>
            <Button className="w-full" onClick={() => setShowFilterModal(false)}>Close</Button>
          </div>
        </div>
      )}
      {/* Dummy Export Toast */}
      {showExportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
          Dummy export triggered!
        </div>
      )}
      {/* Dummy PDF Toast */}
      {pdfToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
          Dummy PDF downloaded!
        </div>
      )}
      {/* View Modal */}
      {viewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Transaction Details</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Date:</span> {viewModalData.date}</div>
              <div><span className="font-semibold">Type:</span> {viewModalData.type}</div>
              <div><span className="font-semibold">Source / Party:</span> {viewModalData.source}</div>
              <div><span className="font-semibold">Amount:</span> ₹{viewModalData.amount.toLocaleString('en-IN')}</div>
              <div><span className="font-semibold">Status:</span> {viewModalData.status}</div>
              <div><span className="font-semibold">Invoice:</span> {viewModalData.invoice}</div>
              <div><span className="font-semibold">Payment Mode:</span> {viewModalData.paymentMode}</div>
              <div><span className="font-semibold">Location:</span> {viewModalData.location}</div>
              <div><span className="font-semibold">Remarks:</span> {viewModalData.remarks}</div>
            </div>
            <Button className="w-full mt-6" onClick={() => setViewModalData(null)}>Close</Button>
          </div>
        </div>
      )}
      {/* Status Update Modal */}
      {statusModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Update Status</h2>
            <div className="mb-4">Invoice: <span className="font-semibold">{statusModalData.invoice}</span></div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => { setStatusModalData(null); }}>Mark as Paid</Button>
              <Button variant="outline" onClick={() => { setStatusModalData(null); }}>Mark as Pending</Button>
              <Button variant="outline" onClick={() => { setStatusModalData(null); }}>Mark as Cancelled</Button>
            </div>
            <Button className="w-full mt-6" onClick={() => setStatusModalData(null)}>Close</Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Accounts Summary</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Sunrize Bakery ERP &mdash; Multi-Location Financial Overview</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <Button variant="outline" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => setShowFilterModal(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm flex-1 sm:flex-none" onClick={() => {setShowExportToast(true); setTimeout(()=>setShowExportToast(false), 2000);}}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <SummaryCard title="Total Income" amount={summaryData.totalIncome} icon={TrendingUp} color="white" />
        <SummaryCard title="Total Expenses" amount={summaryData.totalExpenses} icon={TrendingDown} color="white" />
        <SummaryCard title="Cash Balance" amount={summaryData.cashBalance} icon={Wallet} color="white" />
        <SummaryCard title="Customer Pending" amount={summaryData.customerPending} icon={Users} color="white" />
        <SummaryCard title="Vendor Pending" amount={summaryData.vendorPending} icon={Building2} color="white" />
        <SummaryCard title="Profit / Loss" amount={summaryData.profitLoss} icon={DollarSign} color="white" />
      </div>

      {/* Main Content Section full section */}
      <div className="mt-6">
        <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
          <CardHeader className="bg-white border-b border-gray-100 rounded-t-2xl px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-gray-900 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-blue-700" />
              All Transactions (Dummy Listing)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <div className="flex flex-wrap gap-2 mb-6 items-center">
              <Input placeholder="Search by customer, vendor, invoice..." className="w-64 rounded-md border-gray-200" />
              <Button variant="outline" className="flex items-center gap-2 rounded-md border-gray-200" onClick={() => setShowFilterModal(true)}>
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white rounded-md shadow" onClick={() => {setShowExportToast(true); setTimeout(()=>setShowExportToast(false), 2000);}}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="text-sm min-w-[1200px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100 bg-gray-50">
                    <TableHead className="text-gray-700 font-semibold py-3">Date</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Type</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Source / Party</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Amount</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Status</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Invoice</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Payment Mode</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Location</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Remarks</TableHead>
                    <TableHead className="text-gray-700 font-semibold py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-gray-50">
                      <TableCell className="py-3">{row.date}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className={row.type === 'Income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">{row.source}</TableCell>
                      <TableCell className={row.type === 'Income' ? 'text-green-700 font-semibold py-3' : 'text-red-700 font-semibold py-3'}>
                        ₹{row.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={row.status === 'Paid' ? 'outline' : 'destructive'} className={row.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {row.invoice}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">{row.paymentMode}</TableCell>
                      <TableCell className="py-3">{row.location}</TableCell>
                      <TableCell className="py-3">{row.remarks}</TableCell>
                      <TableCell className="flex gap-2 py-3">
                        <Button size="sm" variant="outline" className="text-xs rounded-md" onClick={() => setViewModalData(row)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs rounded-md" onClick={() => setStatusModalData(row)}>
                          Update Status
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md" onClick={() => handleInvoiceDownload(row)}>
                          Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* End Main Content Section */}

      {/* Dues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Customer Dues */}
        <Card className="border border-gray-200 rounded-lg bg-white">
          <CardHeader className="bg-white border-b border-gray-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-blue-700" />
              Customer Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="text-gray-900 font-semibold">Customer</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Invoice</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Paid</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerDues.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-700">{item.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{item.invoiceAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-medium">
                        ₹{item.paid.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={item.pending > 0 ? "destructive" : "outline"}
                          className={item.pending > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
                        >
                          ₹{item.pending.toLocaleString('en-IN')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Dues */}
        <Card className="border border-gray-200 rounded-lg bg-white">
          <CardHeader className="bg-white border-b border-gray-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Building2 className="h-5 w-5 text-blue-700" />
              Vendor Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="text-gray-900 font-semibold">Vendor</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Bill</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Paid</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorDues.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-700">{item.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{item.billAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-medium">
                        ₹{item.paid.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={item.pending > 0 ? "destructive" : "outline"}
                          className={item.pending > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
                        >
                          ₹{item.pending.toLocaleString('en-IN')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-gray-500 text-sm mb-1">Total Income</div>
            <div className="text-3xl font-bold text-gray-900">₹{summaryData.totalIncome.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">Total Expenses</div>
            <div className="text-3xl font-bold text-gray-900">₹{summaryData.totalExpenses.toLocaleString('en-IN')}</div>
          </div>
          <div className="md:border-l md:border-gray-200 md:pl-8">
            <div className="text-gray-500 text-sm mb-1">Net Profit</div>
            <div className="text-3xl font-bold text-green-700">
              ₹{(summaryData.totalIncome - summaryData.totalExpenses).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
