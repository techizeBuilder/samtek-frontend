import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import {
    Download, Search, Building2, User, ChevronLeft, ChevronRight,
    FileSpreadsheet, FileText, TrendingUp, Clock, CheckCircle, AlertTriangle, Activity
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOP_LEVEL_ADMINS = ['HR-Admin', 'MIS Admin', 'Company Admin', 'Super Admin', 'Admin'];
const DEPT_HEADS = [
    'Production Head', 'Packing Head', 'Dispatch Head',
    'Accounts Head', 'Sales Head', 'Manager', 'Finance Manager',
    'Unit Head', 'Unit Manager',
    'Research & Development Head', 'Store Head', 'QC Head'
];
const DEPARTMENTS = ["Production", "Packing", "Dispatch", "Accounts", "Sales", "R&D", "Store", "QC", "General"];

const getDepartmentFromRole = (role: string) => {
    if (!role) return "General";
    if (role.includes('Production')) return 'Production';
    if (role.includes('Packing')) return 'Packing';
    if (role.includes('Dispatch')) return 'Dispatch';
    if (role.includes('Account') || role.includes('Finance')) return 'Accounts';
    if (role.includes('Sales')) return 'Sales';
    if (role.includes('Research') || role.includes('R&D')) return 'R&D';
    if (role.includes('Store')) return 'Store';
    if (role.includes('QC')) return 'QC';
    return role.replace(/(Head|Manager|Employee)/gi, '').trim() || "General";
};

type ReportType = 'employee' | 'overdue' | 'efficiency' | 'productivity';

export default function TaskReportsView() {
    const { user } = useAuth() as { user: any };

    const isTopAdmin = TOP_LEVEL_ADMINS.includes(user?.role);
    const isDeptHead = DEPT_HEADS.includes(user?.role);
    const defaultDepartment = isTopAdmin ? "" : getDepartmentFromRole(user?.role);

    // --- STATE ---
    const [activeReport, setActiveReport] = useState<ReportType>('employee');
    const [reportsData, setReportsData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);

    // Filters
    const [department, setDepartment] = useState(defaultDepartment);
    const [assignedTo, setAssignedTo] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;

    // --- DEBOUNCE EFFECT ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => { setPage(1); }, [department, assignedTo, activeReport]);

    // --- FETCH EMPLOYEES ---
    useEffect(() => {
        const fetchAllEmployees = async () => {
            try {
                const token = localStorage.getItem("token");
                let allUsers: any[] = [];
                let currentPage = 1;
                let fetchedTotalPages = 1;

                do {
                    const response = await axios.get(`${API_BASE}/users`, {
                        params: { page: currentPage, limit: 50 },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const responseData = response.data;
                    let usersChunk: any[] = [];

                    if (responseData && Array.isArray(responseData.users)) usersChunk = responseData.users;
                    else if (responseData?.data && Array.isArray(responseData.data.users)) usersChunk = responseData.data.users;

                    if (usersChunk.length > 0) allUsers = [...allUsers, ...usersChunk];
                    else break;

                    fetchedTotalPages = responseData.pagination?.pages || responseData.data?.pagination?.pages || 1;
                    currentPage++;
                } while (currentPage <= fetchedTotalPages && currentPage <= 10);

                setEmployees(allUsers);
            } catch (err) { console.error("Failed to load employees for filter:", err); }
        };
        fetchAllEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        if (department && getDepartmentFromRole(emp.role) !== department) return false;
        return true;
    });

    useEffect(() => { setAssignedTo(""); }, [department]);

    // --- FETCH DYNAMIC REPORT DATA ---
    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            let endpoint = '';
            if (activeReport === 'employee') endpoint = '/hrms/tasks/reports/employee-wise';
            if (activeReport === 'overdue') endpoint = '/hrms/tasks/reports/overdue';
            if (activeReport === 'efficiency') endpoint = '/hrms/tasks/reports/task-efficiency';
            if (activeReport === 'productivity') endpoint = '/hrms/tasks/reports/productivity';

            const response = await axios.get(`${API_BASE}${endpoint}`, {
                params: { department, assignedTo, search: debouncedSearch, page, limit },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setReportsData(response.data.data);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.totalRecords || response.data.total || response.data.data.length);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            setReportsData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [department, assignedTo, debouncedSearch, page, activeReport]);


    // --- 🚀 FULLY DYNAMIC SECURE FILE EXPORT ---
    const handleExport = async (format: "excel" | "pdf") => {
        try {
            setExporting(format);
            const token = localStorage.getItem("token");

            // Dynamically determine the endpoint and filename based on the active tab
            let endpoint = '';
            let filename = '';

            switch (activeReport) {
                case 'employee':
                    endpoint = `/hrms/tasks/reports/export/employee-wise/${format}`;
                    filename = `Employee_Performance_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                    break;
                case 'overdue':
                    endpoint = `/hrms/tasks/reports/export/overdue/${format}`;
                    filename = `Overdue_Tasks_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                    break;
                case 'efficiency':
                    endpoint = `/hrms/tasks/reports/export/task-efficiency/${format}`;
                    filename = `Task_Efficiency_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                    break;
                case 'productivity':
                    endpoint = `/hrms/tasks/reports/export/productivity/${format}`;
                    filename = `Daily_Productivity_Report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                    break;
            }

            const response = await axios.get(`${API_BASE}${endpoint}`, {
                params: { department, assignedTo, search: debouncedSearch }, // Passes current UI filters
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Failed to export ${format}:`, error);
            alert(`Error exporting ${format.toUpperCase()} file. Ensure the backend endpoint exists for this report.`);
        } finally {
            setExporting(null);
        }
    };


    return (
        <div className="space-y-6">
            {/* --- REPORT SUB-TABS --- */}
            <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveReport('employee')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeReport === 'employee' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <User size={16} /> Employee Performance
                </button>
                <button onClick={() => setActiveReport('overdue')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeReport === 'overdue' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <AlertTriangle size={16} /> Overdue Tasks
                </button>
                <button onClick={() => setActiveReport('efficiency')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeReport === 'efficiency' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <CheckCircle size={16} /> Task Efficiency
                </button>
                <button onClick={() => setActiveReport('productivity')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeReport === 'productivity' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Activity size={16} /> Daily Productivity
                </button>
            </div>

            {/* --- TOP FILTERS & ACTIONS --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center flex-1">
                    {/* Filters only show on Employee & Overdue views (Efficiency/Productivity are company-wide aggregates) */}
                    {(activeReport === 'employee' || activeReport === 'overdue') && (
                        <>
                            <div className="flex flex-1 min-w-[200px] max-w-md items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm w-full" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                            </div>

                            {isTopAdmin ? (
                                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[140px]" value={department} onChange={(e) => setDepartment(e.target.value)}>
                                        <option value="">All Departments</option>
                                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 border border-indigo-100 bg-indigo-50 rounded-lg px-3 py-2">
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    <span className="text-sm font-semibold text-indigo-700">{department} (Locked)</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
                                <User className="w-4 h-4 text-gray-400" />
                                <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[140px]" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                                    <option value="">All Employees</option>
                                    {filteredEmployees.map(emp => <option key={emp._id} value={emp._id}>{emp.username}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Dynamic Export Buttons (Now active for all tabs) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={exporting !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                        <FileSpreadsheet size={16} />
                        {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={exporting !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                    >
                        <FileText size={16} />
                        {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                    </button>
                </div>
            </div>

            {/* --- DYNAMIC DATA TABLES --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-medium animate-pulse flex flex-col items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-indigo-300 animate-bounce" /> Loading Analytics...
                    </div>
                ) : reportsData.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">No data found for the current filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">

                            {/* === EMPLOYEE PERFORMANCE VIEW === */}
                            {activeReport === 'employee' && (
                                <>
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Employee Name</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Department</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Assigned</th>
                                            <th className="p-4 text-xs font-bold text-emerald-600 uppercase text-center">Completed</th>
                                            <th className="p-4 text-xs font-bold text-red-500 uppercase text-center">Overdue</th>
                                            <th className="p-4 text-xs font-bold text-indigo-600 uppercase text-center">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData.map((row) => (
                                            <tr key={row._id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {row.employeeName.charAt(0).toUpperCase()}
                                                    </div>
                                                    {row.employeeName}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{row.department || getDepartmentFromRole(row.role)}</td>
                                                <td className="p-4 text-center text-sm">{row.totalAssigned}</td>
                                                <td className="p-4 text-center text-sm font-semibold text-emerald-600">{row.completed}</td>
                                                <td className="p-4 text-center text-sm font-semibold text-red-500">{row.overdue}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm font-bold text-indigo-700">{row.completionRate}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${row.completionRate >= 80 ? 'bg-emerald-500' : row.completionRate >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${row.completionRate}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* === OVERDUE TASKS VIEW === */}
                            {activeReport === 'overdue' && (
                                <>
                                    <thead>
                                        <tr className="bg-red-50 border-b border-red-100">
                                            <th className="p-4 text-xs font-bold text-red-700 uppercase">Task Title</th>
                                            <th className="p-4 text-xs font-bold text-red-700 uppercase">Assigned To</th>
                                            <th className="p-4 text-xs font-bold text-red-700 uppercase">Due Date</th>
                                            <th className="p-4 text-xs font-bold text-red-700 uppercase">Days Overdue</th>
                                            <th className="p-4 text-xs font-bold text-red-700 uppercase">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData.map((row) => (
                                            <tr key={row._id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm">{row.title}</td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {row.assignedUsers?.map((u: any) => u.username).join(', ')}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{new Date(row.dueDate).toLocaleDateString()}</td>
                                                <td className="p-4 text-sm font-bold text-red-600">{row.daysOverdue} Days</td>
                                                <td className="p-4 text-xs font-bold text-gray-500 uppercase">{row.taskType}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* === EFFICIENCY VIEW === */}
                            {activeReport === 'efficiency' && (
                                <>
                                    <thead>
                                        <tr className="bg-emerald-50 border-b border-emerald-100">
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase">Task Type</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase text-center">Total Tasks</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase text-center">Completed</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase text-center">Efficiency Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData.map((row) => (
                                            <tr key={row.taskType} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm">{row.taskType}</td>
                                                <td className="p-4 text-center text-sm">{row.totalTasks}</td>
                                                <td className="p-4 text-center text-sm font-semibold text-emerald-600">{row.completedTasks}</td>
                                                <td className="p-4 text-center text-sm font-bold text-emerald-700">{row.efficiencyRate}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* === PRODUCTIVITY VIEW === */}
                            {activeReport === 'productivity' && (
                                <>
                                    <thead>
                                        <tr className="bg-blue-50 border-b border-blue-100">
                                            <th className="p-4 text-xs font-bold text-blue-700 uppercase">Date</th>
                                            <th className="p-4 text-xs font-bold text-blue-700 uppercase text-center">Tasks Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData.map((row) => (
                                            <tr key={row._id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm">{row._id}</td>
                                                <td className="p-4 text-center text-sm font-bold text-blue-600">{row.tasksCompleted}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                )}

                {/* --- PAGINATION --- */}
                {!loading && (activeReport === 'employee' || activeReport === 'overdue') && totalPages > 1 && (
                    <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-white">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing <span className="font-bold text-gray-900">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-gray-900">{Math.min(page * limit, totalRecords)}</span> of <span className="font-bold text-gray-900">{totalRecords}</span> entries
                        </p>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                                <ChevronLeft size={16} />
                            </button>
                            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}