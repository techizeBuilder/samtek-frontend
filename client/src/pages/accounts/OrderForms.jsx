import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderFormApi } from '@/api/orderFormApi';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Eye, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import OrderFormModal from '@/components/sales/OrderFormModal';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Returned', label: 'Returned' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function OrderForms() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState(null);

  const changeSearch = (value) => { setSearch(value); setPage(1); };
  const changeStatus = (value) => { setStatus(value); setPage(1); };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order-forms', status, search, page],
    queryFn: () => orderFormApi.list({ status, search, page, limit: 20 }),
    keepPreviousData: true,
  });

  const forms = data?.orderForms || [];
  const pagination = data?.pagination || {};

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Order Forms</h1>
        <p className="text-slate-500 text-sm mt-0.5">Sales Order Forms submitted by the sales team after Deal Verification</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by customer, company, quotation no..."
            value={search}
            onChange={e => changeSearch(e.target.value)}
            className="bg-white pl-9"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => changeStatus(t.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                status === t.key
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center text-slate-500 py-16">Loading...</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No Order Forms found</p>
              <p className="text-slate-400 text-sm mt-1">Submitted forms will appear here once Sales fills them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Code</TableHead>
                  <TableHead>Order Code</TableHead>
                  <TableHead>Customer / Company</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map(f => (
                  <TableRow key={f._id}>
                    <TableCell className="font-mono text-xs">{f.leadId?.leadCode || '—'}</TableCell>
                    <TableCell className="font-medium text-blue-600">{f.orderId?.orderCode || '—'}</TableCell>
                    <TableCell>
                      <div>{f.customerName || '—'}</div>
                      <div className="text-xs text-slate-400">{f.companyName}</div>
                    </TableCell>
                    <TableCell>{f.filledBy?.fullName || f.filledBy?.username || '—'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs',
                        f.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      )}>
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{fmtDate(f.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewingId(f._id)}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View Order Form
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.currentPage <= 1}>Previous</Button>
              <span className="text-sm text-slate-500">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalOrders} forms)</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {viewingId && (
        <OrderFormModal
          open={!!viewingId}
          onOpenChange={(v) => { if (!v) setViewingId(null); }}
          formId={viewingId}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}
