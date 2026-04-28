/** @format */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
    Search,
    Filter,
    Trash2,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    Calendar,
    User as UserIcon,
    Activity,
    ChevronDown,
    RefreshCcw
} from "lucide-react";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";
import ClearLogsConfirmationModal from "./ClearLogsConfirmationModal";

const API_BASE = import.meta.env.VITE_API_URL;

interface AuditLog {
    _id: string;
    userName: string;
    userEmail: string;
    userRole: string;
    action: string;
    resourceType: string;
    description: string;
    ipAddress: string;
    statusCode: number;
    isSuccess: boolean;
    createdAt: string;
}

export default function AuditLogs() {
    const token = localStorage.getItem("token");
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

    // UI States
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [role, setRole] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    // Meta data for filters
    const [filterOptions, setFilterOptions] = useState<any>({ actions: [], roles: [] });

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/activity-logs`, {
                params: {
                    page,
                    limit: 20,
                    search,
                    action,
                    role,
                    startDate,
                    endDate,
                    sortOrder
                },
                headers: { Authorization: `Bearer ${token}` },
            });

            setLogs(res.data.data.activityLogs);
            setPagination(res.data.data.pagination);
            setFilterOptions({
                actions: res.data.data.filters.actions,
                roles: Object.keys(res.data.data.filters.categorizedUsers || {})
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Fetch Failed",
                description: "Unable to load audit logs.",
            });
        } finally {
            setLoading(false);
        }
    }, [token, search, action, role, startDate, endDate, sortOrder]);

    // Live filtering with debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs(1);
        }, 400); // Debounce search
        return () => clearTimeout(timer);
    }, [search]);

    // Immediate fetch for other filters
    useEffect(() => {
        fetchLogs(1);
    }, [action, role, startDate, endDate, sortOrder]);

    const clearFilters = () => {
        setSearch("");
        setAction("");
        setRole("");
        setStartDate("");
        setEndDate("");
        setSortOrder("desc");
    };

    const handleClearAllClick = () => {
        setIsConfirmModalOpen(true);
    };

    const confirmClearAllLogs = async () => {
        setIsDeleting(true);
        try {
            await axios.delete(`${API_BASE}/activity-logs/clear-all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast({
                
                title: "Logs Cleared",
                description: "All audit logs have been successfully deleted.",
            });
            setIsConfirmModalOpen(false);
            fetchLogs(1);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Action Failed",
                description: error.response?.data?.message || "Could not clear logs.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusColor = (code: number) => {
        if (code < 300) return "text-green-600 bg-green-50 border-green-100";
        if (code < 400) return "text-blue-600 bg-blue-50 border-blue-100";
        return "text-red-600 bg-red-50 border-red-100";
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        System Configuration / Audit Logs
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all shadow-sm font-medium ${showFilters
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        <Filter size={18} />
                        {showFilters ? "Hide Filters" : "Show Filters"}
                    </button>

                    <button
                        onClick={handleClearAllClick}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all shadow-sm font-medium disabled:opacity-50"
                    >
                        <Trash2 size={18} />
                        {isDeleting ? "Clearing..." : "Clear All Logs"}
                    </button>
                </div>
            </div>

            {/* Collapsible Filter Panel */}
            {showFilters && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Filter size={16} className="text-orange-500" />
                            Advanced Filters
                        </h3>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1.5 font-medium transition-colors"
                        >
                            <RefreshCcw size={14} />
                            Reset All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Search</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="User, email, or description..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activity Action</label>
                            <div className="relative">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={action}
                                    onChange={(e) => setAction(e.target.value)}
                                >
                                    <option value="">All Actions</option>
                                    {filterOptions.actions.map((act: string) => (
                                        <option key={act} value={act}>{act.replace(/_/g, " ")}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Role</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="">All Roles</option>
                                    {filterOptions.roles.map((r: string) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="space-y-2 lg:col-span-1 border-t lg:border-t-0 pt-4 lg:pt-0">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Range</label>
                            <div className="flex flex-col 2xl:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm transition-all"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm transition-all"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sorting Tabs */}
            <div className="flex justify-end">
                <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setSortOrder("desc")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === "desc"
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                            : "text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        <ArrowDownWideNarrow size={16} />
                        Newest First
                    </button>
                    <button
                        onClick={() => setSortOrder("asc")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${sortOrder === "asc"
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                            : "text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        <ArrowUpNarrowWide size={16} />
                        Oldest First
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse">
                    <Loader />
                    <p className="mt-4 text-gray-400 font-medium">Updating logs...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Time & Origin</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">User Details</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Action Performed</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center max-w-xs mx-auto text-gray-400">
                                                <Activity size={48} className="mb-4 text-gray-200" />
                                                <p className="text-lg font-semibold text-gray-600">No logs found</p>
                                                <p className="text-sm mt-1">Try adjusting your filters or checking back later.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50/80 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                    {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-2 font-mono flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <RefreshCcw size={10} />
                                                    {log.ipAddress}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                                                        {log.userName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{log.userName}</div>
                                                        <div className="text-xs text-gray-500">{log.userEmail}</div>
                                                        <div className="text-[9px] mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full inline-block uppercase font-bold tracking-tighter">
                                                            {log.userRole}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm inline-block">
                                                    {log.action}
                                                </span>
                                                <div className="text-[10px] text-gray-400 mt-1.5 font-medium pl-1">
                                                    {log.resourceType}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm text-gray-700 font-medium max-w-xs leading-relaxed" title={log.description}>
                                                    {log.description}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-sm ${getStatusColor(log.statusCode)}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${log.isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    {log.statusCode} • {log.isSuccess ? "Success" : "Error"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-6 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                            <span className="text-sm text-gray-500 font-medium">
                                Showing page <span className="text-gray-900 font-bold">{pagination.currentPage}</span> of <span className="text-gray-900 font-bold">{pagination.totalPages}</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagination.currentPage === 1}
                                    onClick={() => fetchLogs(pagination.currentPage - 1)}
                                    className="px-5 py-2 border border-gray-200 rounded-xl bg-white text-gray-600 font-bold text-sm hover:border-orange-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all shadow-sm active:scale-95"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                                        const pageNum = idx + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => fetchLogs(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${pagination.currentPage === pageNum
                                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                                    : "text-gray-500 hover:bg-white hover:border hover:border-gray-200"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    onClick={() => fetchLogs(pagination.currentPage + 1)}
                                    className="px-5 py-2 border border-gray-200 rounded-xl bg-white text-gray-600 font-bold text-sm hover:border-orange-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all shadow-sm active:scale-95"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ClearLogsConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmClearAllLogs}
                isLoading={isDeleting}
            />
        </div>
    );
}



