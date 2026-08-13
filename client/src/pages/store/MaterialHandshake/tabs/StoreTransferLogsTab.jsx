import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Truck, User, Search, Hash, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function StoreTransferLogsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 10;

  // Debounce effect: Delays backend query execution until user stops typing for 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Drop back to page 1 whenever search stabilizes
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Snappy input state updating
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // React Query bound strictly to the debounced state value
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/inventory/store-transfer-logs', page, debouncedSearch],
    queryFn: async () => {
      return await apiRequest(
        'GET',
        `/api/inventory/store-transfer-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`
      );
    }
  });

  const orderGroups = data?.data || [];
  const pagination = data?.pagination || { totalPages: 1, page: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Store Transfer Logs</h3>
          <p className="text-sm text-slate-500">History of raw materials moved out of inventory storage into production channels.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-white text-slate-600 border-slate-200 shadow-sm self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Panel
        </Button>
      </div>

      {/* Filter Control Layer */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by Production Order ID..."
          value={search}
          onChange={handleSearchChange}
          className="pl-9 bg-white border-slate-200 shadow-sm"
        />
      </div>

      {/* Primary Data Section */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center shadow-sm">
          Failed to process query requests. Please attempt verification or refresh logs view.
        </div>
      ) : orderGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Truck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-700">No transfer matches observed</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'No historical transfers match that specified Order ID.' : 'Store transfer logs data empty at present.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderGroups.map((group) => (
            <Card key={group._id} className="border-slate-200 shadow-sm overflow-hidden bg-white">
              {/* Header Container grouping wrapper identifiers */}
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                      <Hash className="h-4 w-4 text-blue-500" />
                      Production Order: <span className="font-bold tracking-tight text-slate-900">{group.orderId || 'N/A'}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md">
                        {group.machineCode || group.order?.machineCode || 'Unknown Machine'}
                      </span>
                      {group.order?.machineName && (
                        <span className="text-slate-500 font-medium">— {group.order.machineName}</span>
                      )}
                    </div>
                  </div>
                  {group.lastTransferDate && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm self-start sm:self-auto">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600">Last Activity:</span>
                      {format(new Date(group.lastTransferDate), 'MMM dd, yyyy h:mm a')}
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Nested Table listing sub-transfer logs */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Material Component</th>
                        <th className="px-6 py-3.5">Quantity Transferred</th>
                        <th className="px-6 py-3.5">Dispatched By</th>
                        <th className="px-6 py-3.5 text-right">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{log.materialName}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{log.sourceItemCode || log.materialCode}</div>
                            {log.toDimensions && Object.keys(log.toDimensions).length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Cut: {Object.entries(log.toDimensions).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ')}
                                {log.leftoverDimensions && Object.keys(log.leftoverDimensions).length > 0 && (
                                  <span className="text-amber-600"> · Leftover recorded</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {log.quantityTransferred} <span className="text-xs font-sans text-slate-500 font-normal">{log.unit}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="bg-slate-100 p-1 rounded-full">
                                <User className="h-3.5 w-3.5 text-slate-500" />
                              </div>
                              <span className="text-slate-600 font-medium text-xs">
                                {log.transferredByName || 'System'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 text-xs font-medium whitespace-nowrap">
                            {format(new Date(log.createdAt), 'MMM dd, yyyy • h:mm a')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <span className="text-xs font-medium text-slate-500">
                Displaying page <span className="text-slate-800 font-bold">{pagination.page}</span> of {pagination.totalPages} ({pagination.total} records total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 border-slate-200 shadow-sm text-slate-600"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="h-8 border-slate-200 shadow-sm text-slate-600"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}