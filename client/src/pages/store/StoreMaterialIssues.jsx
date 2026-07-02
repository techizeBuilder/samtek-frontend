import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  History, 
  Package, 
  User, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

const StoreMaterialIssues = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/inventory/material-issues', page, debouncedSearch],
    queryFn: async () => {
      const response = await apiRequest(
        'GET', 
        `/api/inventory/material-issues?page=${page}&limit=${limit}&search=${debouncedSearch}`
      );
      return response;
    }
  });

  const logsData = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="h-8 w-8 text-blue-600" />
            Material Issue Logs
          </h1>
          <p className="text-slate-500 mt-1">Track materials issued to production orders.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Machine, Material Code or Name..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} className="shrink-0 bg-white">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mb-4 text-blue-500" />
          <p>Loading material issue logs...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center">
          <p className="font-semibold">Failed to load data.</p>
          <Button variant="outline" className="mt-4 bg-white" onClick={() => refetch()}>Try Again</Button>
        </div>
      ) : logsData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-700">No material issues found</p>
          <p className="text-sm">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {logsData.map((group, index) => (
            <Card key={group._id || index} className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                      <Hash className="h-5 w-5 text-indigo-500" />
                      Production Order: {group.order?.orderId || 'N/A'}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Machine: {group.machineCode || 'N/A'}
                      </span>
                      {group.order?.machineName && (
                        <span className="hidden sm:inline-block">Product: {group.order.machineName}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Last Issue: {format(new Date(group.lastIssueDate), 'MMM dd, yyyy h:mm a')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Material</th>
                        <th className="px-6 py-3 font-semibold">Quantity Issued</th>
                        <th className="px-6 py-3 font-semibold">Issued To</th>
                        <th className="px-6 py-3 font-semibold text-right">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{log.materialName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{log.materialCode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                              {log.quantityIssued} {log.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                                {(log.issuedToName || 'U')[0].toUpperCase()}
                              </div>
                              <span className="text-slate-700 font-medium">{log.issuedToName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-500 whitespace-nowrap">
                            {format(new Date(log.createdAt), 'MMM dd, h:mm a')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
              <div className="text-sm text-slate-500">
                Showing page <span className="font-medium text-slate-800">{pagination.page}</span> of{' '}
                <span className="font-medium text-slate-800">{pagination.totalPages}</span>
                <span className="ml-2 hidden sm:inline-block">({pagination.total} total records)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreMaterialIssues;
