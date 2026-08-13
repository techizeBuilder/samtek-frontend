import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    Calendar,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function ReturnedMaterialsLogsTab() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const limit = 10;

    // ── 1. DEBOUNCE SEARCH FIELD FILTER ──
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Auto reset to page 1 on search change
        }, 400);

        return () => clearTimeout(handler);
    }, [search]);

    // ── 2. QUERY FOR AGGREGATED RETURN LOG GROUPS ──
    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['/api/inventory/returned-materials', page, debouncedSearch],
        queryFn: async () => {
            return await apiRequest(
                'GET',
                `/api/inventory/returned-materials?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`
            );
        },
        keepPreviousData: true
    });

    const groups = data?.data || [];
    const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

    // Resolution State Status Badge Generator
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Accepted':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                        Accepted
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3 h-3 mr-1 text-red-500" />
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 mr-1 text-amber-500" />
                        Pending Store
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Layer Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Material Return Ledger</h2>
                    <p className="text-sm text-slate-500">Historical archive of all materials returned from production floor assets.</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} className="bg-white border-slate-200 shadow-sm" disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Debounced Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    type="text"
                    placeholder="Search by Production Order ID (e.g. PROD-2026)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border-slate-200 focus-visible:ring-blue-500"
                />
            </div>

            {/* Core Display Panel Workspace */}
            {isLoading ? (
                <div className="flex justify-center py-12 text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center text-sm font-medium">
                    Failed to retrieve historical transaction records.
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                    <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-700">No Records Found</p>
                    <p className="text-sm">No return activities found matching your search parameter.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* ── PRODUCTION ORDER CARD WRAPPER LOOP ── */}
                    {groups.map((orderGroup) => (
                        <div
                            key={orderGroup._id || orderGroup.orderId}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                            {/* Card Header Profile Block */}
                            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                                        <span className="text-blue-600 font-bold font-mono">#</span>
                                        Production Order: {orderGroup.orderId || 'N/A'}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                            Machine: {orderGroup.machineCode || 'N/A'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">Product:</span>
                                        <span className="text-xs text-slate-600 font-medium">{orderGroup.machineName || 'Unknown Product'}</span>
                                    </div>
                                </div>

                                {/* Right Side Context Clock Timestamp Pill */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium self-start sm:self-auto shadow-sm">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Last Activity:</span>
                                    <span className="text-slate-700 font-semibold">
                                        {orderGroup.lastReturnDate ? format(new Date(orderGroup.lastReturnDate), 'MMM dd, yyyy h:mm a') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Table Sub-Content Frame */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left table-auto">
                                    <thead className="bg-slate-50/40 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">Material Details</th>
                                            <th className="px-6 py-3">Classification</th>
                                            <th className="px-6 py-3 text-center">Return Qty</th>
                                            <th className="px-6 py-3 max-w-[240px]">Floor Justification / Reason</th>
                                            <th className="px-6 py-3">Resolution State</th>
                                            <th className="px-6 py-3 text-right">Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orderGroup.logs?.map((log) => (
                                            <tr key={log._id} className="hover:bg-slate-50/30 transition-colors">
                                                {/* Material Specs */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">{log.materialName}</div>
                                                    <div className="text-xs font-mono text-slate-400 mt-0.5">{log.sourceItemCode || log.materialCode}</div>
                                                    {log.bomDimensions && Object.keys(log.bomDimensions).length > 0 && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            Cut: {Object.entries(log.bomDimensions).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ')}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Return Condition Flag Classification */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.returnType === 'Defect' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                            <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                                                            Defect
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                            Excess Material
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Quantitative Values */}
                                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 text-center">
                                                    {log.quantityReturned} {log.unit}
                                                </td>

                                                {/* ── FLOATING HOVER CARD PREVIEW PRESERVING ROW LAYOUT HEIGHT ── */}
                                                <td className="px-6 py-4 max-w-[240px] relative group cursor-pointer">
                                                    <div className="truncate text-slate-700 font-normal leading-relaxed">
                                                        {log.reason || <span className="text-slate-400 italic">No note added</span>}
                                                    </div>

                                                    {log.reason && (
                                                        <div className="absolute left-6 bottom-full mb-1 translate-y-1 opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-150 z-50 bg-slate-900 text-slate-100 text-xs p-3 rounded-lg shadow-xl w-64 whitespace-normal break-words border border-slate-800">
                                                            <div className="font-semibold text-slate-400 mb-1">Full Reason:</div>
                                                            <div className="leading-normal">{log.reason}</div>
                                                        </div>
                                                    )}

                                                    {log.returnedByName && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                                                            By: {log.returnedByName}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Store Ledger Resolution Processing Status */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(log.status)}
                                                </td>

                                                {/* Fine-grain Action Log Event Timestamp */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-500 font-medium font-mono">
                                                    {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, hh:mm a') : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Unified Bottom Master Micro-Pagination Toolbar */}
                    <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
                        <div className="text-xs text-slate-500 font-medium">
                            Showing production groups <span className="text-slate-800 font-semibold">{pagination.total === 0 ? 0 : ((pagination.page - 1) * limit) + 1}</span> to{' '}
                            <span className="text-slate-800 font-semibold">
                                {Math.min(pagination.page * limit, pagination.total)}
                            </span>{' '}
                            of <span className="text-slate-800 font-semibold">{pagination.total}</span> total groups
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white border-slate-200 px-2.5 text-slate-600 hover:text-slate-800"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={pagination.page === 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>

                            <div className="text-xs font-semibold text-slate-700 px-2">
                                Page {pagination.page} of {pagination.totalPages || 1}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white border-slate-200 px-2.5 text-slate-600 hover:text-slate-800"
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}