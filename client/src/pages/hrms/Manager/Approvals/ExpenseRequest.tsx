import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Calendar, User, IndianRupee, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import api from '@/services/api';
import { format } from 'date-fns';

export default function ExpenseRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/expense-requests/manager');
      setRequests(Array.isArray(response) ? response : (response?.data || []));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expense requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/expense-requests/${id}/status`, { status });
      toast({
        title: "Success",
        description: `Expense request ${status.toLowerCase()} successfully`,
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update status`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pending</Badge>;
      case 'APPROVED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'REJECTED': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'PAID': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Expense Requests</h1>
          <p className="text-slate-500 mt-1">Review and approve employee reimbursements.</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" className="gap-2">
          <Clock className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Expense Type</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Receipt</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-slate-500 font-medium">Loading requests...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <IndianRupee className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No expense requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {request.employee?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.employee?.name}</p>
                          <p className="text-xs text-slate-500">{request.employee?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700">{request.expenseType}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{request.subCategory}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        {format(new Date(request.date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center font-bold text-slate-900">
                        <IndianRupee className="h-3.5 w-3.5 mr-0.5 text-slate-500" />
                        {request.amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.receipt ? (
                        <a 
                          href={`${api.baseURL}${request.receipt}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No receipt</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 h-8 px-3"
                            onClick={() => handleStatusUpdate(request._id, 'APPROVED')}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 h-8 px-3"
                            onClick={() => handleStatusUpdate(request._id, 'REJECTED')}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
