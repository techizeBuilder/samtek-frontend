import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Calendar, User, UserCog, AlertCircle, Loader2, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import api from '@/services/api';

export default function ProfileRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see profileUpdateController.js getTeamProfileUpdateRequests).
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
      const response = await api.get(`/profile-updates/manager?${params.toString()}`);
      setRequests(response?.data || []);
      setPagination(response?.pagination || { current: 1, total: 1, count: 0 });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profile update requests",
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
      await api.patch(`/profile-updates/${id}/status`, { status });
      toast({
        title: "Success",
        description: `Profile update ${status.toLowerCase()} successfully`,
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

  const formatUpdateType = (type) => {
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Profile Updates</h1>
          <p className="text-slate-500 mt-1">Approve or reject personal information changes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employee..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button onClick={fetchRequests} variant="outline" className="gap-2">
            <Clock className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Update Type</TableHead>
                <TableHead className="font-semibold">New Value</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2 text-slate-500 font-medium">Loading requests...</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <UserCog className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No profile update requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request._id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                          {request.employee?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{request.employee?.name}</p>
                          <p className="text-xs text-slate-500">{request.employee?.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-white text-slate-600 border-slate-200 px-2 py-0.5 text-[10px]">
                        {formatUpdateType(request.updateType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded text-sm" title={request.newValue}>
                        {request.newValue}
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
