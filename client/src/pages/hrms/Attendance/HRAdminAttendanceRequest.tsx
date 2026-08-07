import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Calendar, User, FileEdit, AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import api from '@/services/api';
import { format } from 'date-fns';

export default function HRAdminAttendanceRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see attendanceRequestController.js getAllAttendanceRequests).
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const response = await api.get(`/attendance-requests/all?${params.toString()}`);
      setRequests(response?.data || []);
      setPagination(response?.pagination || { current: 1, total: 1, count: 0 });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance correction requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/attendance-requests/${id}/status`, { status, adminRemark: "Processed by HR Admin" });
      toast({
        title: "Success",
        description: `Correction request ${status.toLowerCase()} successfully`,
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
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Attendance Requests</h1>
          <p className="text-slate-500 mt-1">Review and approve company-wide attendance adjustment requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employee or type..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button onClick={fetchRequests} variant="outline" className="gap-2 border-[#49A7F5] text-black hover:bg-[#49A7F5]/10">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold text-black">Employee</TableHead>
                <TableHead className="font-semibold text-black">Date</TableHead>
                <TableHead className="font-semibold text-black">Type</TableHead>
                <TableHead className="font-semibold text-black">Corrected Times</TableHead>
                <TableHead className="font-semibold text-black">Reason</TableHead>
                <TableHead className="font-semibold text-black">Status</TableHead>
                <TableHead className="text-right font-semibold text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-black" />
                    <p className="mt-2 text-slate-500 font-medium">Loading requests...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <FileEdit className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No correction requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#49A7F5]/10 flex items-center justify-center text-black font-bold text-xs">
                          {request.user?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.user?.name}</p>
                          <p className="text-xs text-slate-500">{request.user?.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-black" />
                        {request.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium bg-[#49A7F5]/10 text-black border-none px-2.5 py-0.5 text-[10px]">
                        {request.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs space-y-1">
                        {request.punchIn && (
                          <div className="flex items-center text-slate-600">
                            <span className="w-12 font-semibold">IN:</span>
                            <span className="bg-green-50 text-green-700 px-1.5 rounded">{request.punchIn}</span>
                          </div>
                        )}
                        {request.punchOut && (
                          <div className="flex items-center text-slate-600">
                            <span className="w-12 font-semibold">OUT:</span>
                            <span className="bg-red-50 text-red-700 px-1.5 rounded">{request.punchOut}</span>
                          </div>
                        )}
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

      {pagination.total > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} requests)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.current <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.min(pagination.total, p + 1))}
              disabled={pagination.current >= pagination.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
