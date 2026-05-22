import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Calendar, User, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import api from '@/services/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function HRAdminLeaveRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // For HR-Admin we use /leaves/all which should return leaves for their company
      const response = await api.get('/leaves/all');
      setRequests(Array.isArray(response) ? response : (response?.data || []));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leave requests",
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
      // Reusing the same status update endpoint as manager
      await api.patch(`/leaves/manager/leaves/${id}/status`, { status, remark: "Processed by HR Admin" });
      toast({
        title: "Success",
        description: `Leave request ${status.toLowerCase()} successfully`,
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
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Leave Requests</h1>
          <p className="text-slate-500 mt-1">Review and manage company-wide leave applications.</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" className="gap-2 border-[#49A7F5] text-black hover:bg-[#49A7F5]/10">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold text-black">Employee</TableHead>
                <TableHead className="font-semibold text-black">Leave Type</TableHead>
                <TableHead className="font-semibold text-black">Duration</TableHead>
                <TableHead className="font-semibold text-black">Reason</TableHead>
                <TableHead className="font-semibold text-black">Status</TableHead>
                <TableHead className="text-right font-semibold text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-black" />
                    <p className="mt-2 text-slate-500 font-medium">Loading requests...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No leave requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#49A7F5]/10 flex items-center justify-center text-black font-bold text-xs">
                          {request.employee?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.employee?.name}</p>
                          <p className="text-xs text-slate-500">{request.employee?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium bg-[#49A7F5]/10 text-black hover:bg-[#49A7F5]/20 border-none px-2.5 py-0.5 uppercase text-[10px]">
                        {request.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm font-medium text-slate-700">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 text-black" />
                          {format(new Date(request.fromDate), 'dd MMM')} - {format(new Date(request.toDate), 'dd MMM yyyy')}
                        </div>
                        <p className="text-xs text-slate-500 ml-5">{request.totalDays} Day(s)</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-slate-600 line-clamp-1 italic" title={request.reason}>
                        "{request.reason}"
                      </p>
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
