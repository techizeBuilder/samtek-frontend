import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { RotateCcw, AlertCircle, Search } from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';

const EXCHANGE_STATUSES = [
  'all', 'Pending Vendor Response', 'Needs Manual Vendor Selection',
  'Accepted', 'Declined', 'Expired', 'Fulfilled', 'Cancelled',
];

const statusVariant = {
  'Pending Vendor Response': 'secondary',
  'Needs Manual Vendor Selection': 'destructive',
  'Accepted': 'default',
  'Declined': 'destructive',
  'Expired': 'destructive',
  'Fulfilled': 'default',
  'Cancelled': 'secondary',
};

export default function PurchaseExchanges() {
  const queryClient = useQueryClient();
  const [pendingVendorPick, setPendingVendorPick] = useState({}); // exchangeId -> vendorId
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const changeStatusFilter = (value) => { setStatusFilter(value); setPage(1); };
  const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

  const { data, isLoading } = useQuery({
    queryKey: ['/api/purchase-exchange', page, statusFilter, searchTerm],
    queryFn: () => apiRequest('GET', `/api/purchase-exchange?page=${page}&limit=20&status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`),
    keepPreviousData: true,
  });
  const exchanges = data?.data || [];
  const pagination = data?.pagination || {};

  const { data: vendorsData } = useQuery({
    queryKey: ['/api/accounts/purchases/vendors'],
    queryFn: () => apiRequest('GET', '/api/accounts/purchases/vendors'),
  });
  const vendors = vendorsData?.data || [];

  const assignVendorMutation = useMutation({
    mutationFn: ({ id, vendorId }) => apiRequest('PUT', `/api/purchase-exchange/${id}/assign-vendor`, { vendorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-exchange'] });
      showSmartToast({ success: true, message: 'Vendor assigned — exchange request emailed' });
    },
    onError: (err) => showSmartToast({ success: false, message: err.message || 'Failed to assign vendor' }),
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" /> Purchase Exchange
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Replacement requests auto-created when QC rejects purchased goods — sent to the original vendor for a like-for-like exchange.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => changeSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={changeStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCHANGE_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 text-muted-foreground text-sm">Loading...</div>
          ) : exchanges.length === 0 ? (
            <div className="p-6 text-muted-foreground text-sm">No purchase exchanges yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Rejected Qty</TableHead>
                  <TableHead>Exchange Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map(ex => (
                  <TableRow key={ex._id}>
                    <TableCell className="font-medium">{ex.itemName}</TableCell>
                    <TableCell>{ex.vendor?.supplierName || '—'}</TableCell>
                    <TableCell>{ex.rejectedQtyBaseUnit} {ex.baseUnit}</TableCell>
                    <TableCell>{ex.exchangeQtyPurchaseUnit} {ex.purchaseUnit}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">{ex.reason || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[ex.status] || 'secondary'}>{ex.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ex.status === 'Needs Manual Vendor Selection' ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Select
                            value={pendingVendorPick[ex._id] || ''}
                            onValueChange={(v) => setPendingVendorPick(p => ({ ...p, [ex._id]: v }))}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map(v => (
                                <SelectItem key={v._id} value={v._id}>{v.supplierName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!pendingVendorPick[ex._id] || assignVendorMutation.isPending}
                            onClick={() => assignVendorMutation.mutate({ id: ex._id, vendorId: pendingVendorPick[ex._id] })}
                          >
                            Send
                          </Button>
                        </div>
                      ) : ex.status === 'Pending Vendor Response' ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <AlertCircle className="h-3.5 w-3.5" /> Awaiting vendor
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} exchanges)</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
