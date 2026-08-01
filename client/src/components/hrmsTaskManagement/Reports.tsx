import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import {
    Search, Building2, User, ChevronLeft, ChevronRight, ChevronDown,
    FileSpreadsheet, FileText, TrendingUp, Clock, CheckCircle, AlertTriangle, Activity, Calendar
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

    // Accordion State for Productivity Tab
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Filters
    const [department, setDepartment] = useState(defaultDepartment);
    const [assignedTo, setAssignedTo] = useState("");
    // Default to the last 30 days instead of "All Time" so the initial report load stays fast.
    const [period, setPeriod] = useState("month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Reset page and close accordions when filters change
    useEffect(() => {
        setPage(1);
        setExpandedRows({});
    }, [department, assignedTo, activeReport, period, startDate, endDate]);

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
            } catch (err) { console.error("Failed to load employees:", err); }
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
            setReportsData([]);

            const token = localStorage.getItem("token");

            let endpoint = '';
            if (activeReport === 'employee') endpoint = '/hrms/tasks/reports/employee-wise';
            if (activeReport === 'overdue') endpoint = '/hrms/tasks/reports/overdue';
            if (activeReport === 'efficiency') endpoint = '/hrms/tasks/reports/task-efficiency';
            if (activeReport === 'productivity') endpoint = '/hrms/tasks/reports/productivity';

            const response = await axios.get(`${API_BASE}${endpoint}`, {
                params: {
                    department,
                    assignedTo,
                    search: debouncedSearch,
                    period,
                    startDate: period === 'custom' ? startDate : undefined,
                    endDate: period === 'custom' ? endDate : undefined,
                    page,
                    limit
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setReportsData(Array.isArray(response.data.data) ? response.data.data : []);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.totalRecords || response.data.total || response.data.data?.length || 0);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            setReportsData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [department, assignedTo, debouncedSearch, page, activeReport, period, startDate, endDate]);

    // --- EXPORT ---
    const handleExport = async (format: "excel" | "pdf") => {
        try {
            setExporting(format);
            const token = localStorage.getItem("token");

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
                params: {
                    department,
                    assignedTo,
                    search: debouncedSearch,
                    period,
                    startDate: period === 'custom' ? startDate : undefined,
                    endDate: period === 'custom' ? endDate : undefined
                },
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
            alert(`Error exporting file. Please check your connection.`);
        } finally {
            setExporting(null);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
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
                    <Activity size={16} /> Productivity Trends
                </button>
            </div>

            {/* --- TOP FILTERS --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1 w-full">

                    <div className="flex min-w-[200px] items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm w-full" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                    </div>

                    {isTopAdmin ? (
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[130px]" value={department} onChange={(e) => setDepartment(e.target.value)}>
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
                        <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[130px]" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                            <option value="">All Employees</option>
                            {filteredEmployees.map(emp => <option key={emp._id} value={emp._id}>{emp.username}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[110px]" value={period} onChange={(e) => setPeriod(e.target.value)}>
                            <option value="">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {period === 'custom' && (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                            <input type="date" className="text-sm bg-transparent border-none focus:outline-none text-gray-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-gray-400 text-xs">to</span>
                            <input type="date" className="text-sm bg-transparent border-none focus:outline-none text-gray-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-none border-gray-100 pt-3 lg:pt-0">
                    <button onClick={() => handleExport('excel')} disabled={exporting !== null} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition disabled:opacity-50 whitespace-nowrap">
                        <FileSpreadsheet size={16} /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                    </button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting !== null} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50 whitespace-nowrap">
                        <FileText size={16} /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                    </button>
                </div>
            </div>

            {/* --- DYNAMIC DATA TABLES --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-gray-400 font-medium animate-pulse flex flex-col items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-indigo-300 animate-bounce" /> Loading Analytics...
                    </div>
                ) : !reportsData || reportsData.length === 0 ? (
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
                                        {reportsData?.map((row, idx) => (
                                            <tr key={row?._id || idx} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {row?.employeeName?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    {row?.employeeName || 'Unknown'}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{row?.department || 'General'}</td>
                                                <td className="p-4 text-center text-sm">{row?.totalAssigned || 0}</td>
                                                <td className="p-4 text-center text-sm font-semibold text-emerald-600">{row?.completed || 0}</td>
                                                <td className="p-4 text-center text-sm font-semibold text-red-500">{row?.overdue || 0}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm font-bold text-indigo-700">{row?.completionRate || 0}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${(row?.completionRate || 0) >= 80 ? 'bg-emerald-500' : (row?.completionRate || 0) >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${row?.completionRate || 0}%` }} />
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
                                        {reportsData?.map((row, idx) => (
                                            <tr key={row?._id || idx} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-semibold text-gray-800 text-sm">{row?.title || 'Unknown Task'}</td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {(row?.assignedUsers || []).map((u: any) => u?.username).join(', ')}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">{row?.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="p-4 text-sm font-bold text-red-600">{row?.daysOverdue || 0} Days</td>
                                                <td className="p-4 text-xs font-bold text-gray-500 uppercase">{row?.taskType || '-'}</td>
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
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase">Employee</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase">Department</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase">Efficiency Breakdown</th>
                                            <th className="p-4 text-xs font-bold text-emerald-700 uppercase text-center">Overall</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData?.map((emp, idx) => (
                                            <tr key={emp?._id || idx} className="hover:bg-gray-50/50 align-top">
                                                <td className="p-4 font-semibold text-gray-800 text-sm">{emp?.employeeName || 'Unknown'}</td>
                                                <td className="p-4 text-sm text-gray-600">{emp?.department || 'General'}</td>
                                                <td className="p-4">
                                                    <div className="space-y-2">
                                                        {(emp?.taskTypes || []).map((tt: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between text-xs bg-emerald-50/50 p-2 rounded border border-emerald-100">
                                                                <span className="font-bold text-emerald-800">{tt?.taskType || 'Task'}</span>
                                                                <span className="text-emerald-600 font-medium">{tt?.completed || 0} / {tt?.total || 0} ({tt?.efficiencyRate || 0}%)</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold shadow-sm">
                                                        {emp?.overallEfficiency || 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* === PRODUCTIVITY VIEW (EXPANDABLE) === */}
                            {activeReport === 'productivity' && (
                                <>
                                    <thead>
                                        <tr className="bg-blue-50 border-b border-blue-100">
                                            <th className="p-4 w-10"></th>
                                            <th className="p-4 text-xs font-bold text-blue-700 uppercase">Period / Date</th>
                                            <th className="p-4 text-xs font-bold text-blue-700 uppercase text-right">Total Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportsData?.map((row, index) => {
                                            const periodLabel = typeof row?._id === 'object'
                                                ? `Week ${row?._id?.week}, ${row?._id?.year}`
                                                : row?._id || 'Unknown';

                                            // Make sure we capture the correct total field from the backend
                                            const grandTotal = row?.totalCompleted || row?.tasksCompleted || 0;
                                            const isExpanded = !!expandedRows[periodLabel];

                                            return (
                                                <React.Fragment key={index}>
                                                    {/* The Master Row */}
                                                    <tr
                                                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                                        onClick={() => toggleRow(periodLabel)}
                                                    >
                                                        <td className="p-4 text-blue-400">
                                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        </td>
                                                        <td className="p-4 font-semibold text-gray-800 text-sm">
                                                            {periodLabel}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className="inline-flex px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-bold shadow-sm">
                                                                {grandTotal} Tasks
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {/* The Expanded Details Row */}
                                                    {isExpanded && (
                                                        <tr className="bg-gray-50/80 border-b-2 border-gray-100">
                                                            <td colSpan={3} className="p-4 lg:px-8 pb-6">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                                                    {/* Map through the nested departments */}
                                                                    {(row?.departments || []).map((dept: any, dIdx: number) => (
                                                                        <div key={dIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                                                                            {/* Only show the visual Department Header if they are a Top Admin */}
                                                                            {isTopAdmin && (
                                                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                                                                    <span className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                                                                        <Building2 size={14} className="text-blue-500" />
                                                                                        {dept.department}
                                                                                    </span>
                                                                                    <span className="text-blue-700 font-bold text-xs bg-white px-2 py-0.5 rounded shadow-sm">
                                                                                        {dept.deptTotal}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            <div className="p-3 space-y-2">
                                                                                {(dept.employees || []).map((emp: any, eIdx: number) => (
                                                                                    <div key={eIdx} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                                                                                {emp?.employeeName?.charAt(0)?.toUpperCase()}
                                                                                            </div>
                                                                                            <span className="text-gray-700 font-medium">{emp.employeeName}</span>
                                                                                        </div>
                                                                                        <span className="text-gray-900 font-bold bg-gray-100 px-2 py-1 rounded">
                                                                                            {emp.tasksCompleted}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {/* Fallback if backend hasn't been fully updated yet */}
                                                                    {(!row.departments || row.departments.length === 0) && (
                                                                        <div className="col-span-full text-center text-gray-500 text-sm py-4 italic">
                                                                            Detailed breakdown is only available for new tasks processed after the hierarchy update.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                )}

                {/* --- PAGINATION --- */}
                {!loading && activeReport !== 'productivity' && totalPages > 1 && (
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