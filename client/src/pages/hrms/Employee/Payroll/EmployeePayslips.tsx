/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";
import { Download, Eye, Building2 } from "lucide-react";
import ViewPayslipModal from "./ViewPayslipModal";

const API_BASE = import.meta.env.VITE_API_URL;

const EmployeePayslips = () => {
    const token = localStorage.getItem("token");
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = loggedInUser?.id;
    const [filtered, setFiltered] = useState<any[]>([]);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [selected, setSelected] = useState<any>(null);
    const [company, setCompany] = useState("");
    const [loading, setLoading] = useState(true);

    /* ================= FETCH ================= */
    const fetchPayslips = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (month) params.set("month", month);
        if (year) params.set("year", year);
        const qs = params.toString();
        const res = await axios.get(`${API_BASE}/payslips/me/my-payslips${qs ? `?${qs}` : ""}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setFiltered(res.data || []);
        setLoading(false);
    };

    const fetchCompany = async () => {
        const res = await axios.get(`${API_BASE}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setCompany(res.data?.companyId?.name || "Your Company");
    };

    useEffect(() => {
        fetchPayslips();
    }, [month, year]);

    useEffect(() => {
        fetchCompany();
    }, []);

    /* ================= HELPERS ================= */
    const formatMonth = (date: string) =>
        new Date(date).toLocaleString("default", {
            month: "long",
            year: "numeric",
        });

    const downloadPayslip = async (id: string, monthStr: string) => {
        const res = await axios.get(`${API_BASE}/payslips/${id}/download`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
        });

        const date = new Date(monthStr);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const employeeName = loggedInUser?.name || "Employee";
        const fileName = `${employeeName}_${monthName}_${year}.pdf`;

        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
    if (loading) return <Loader />;
    /* ================= UI ================= */
    return (
        <div className="p-6">
            {/* HEADER */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">My Payslips</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        View and download your monthly salary slips
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl border border-orange-100 shadow-sm">
                    <Building2 size={18} />
                    <span className="font-semibold text-sm">{company}</span>
                </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter By:</span>
                </div>

                <select
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-orange-500 outline-none transition-all min-w-[140px]"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i + 1}>
                            {new Date(0, i).toLocaleString("default", {
                                month: "long",
                            })}
                        </option>
                    ))}
                </select>

                <select
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-orange-500 outline-none transition-all min-w-[120px]"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                >
                    <option value="">All Years</option>
                    {[2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>

                {(month || year) && (
                    <button
                        onClick={() => { setMonth(""); setYear(""); }}
                        className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase px-2"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* PAYSLIP GRID */}
            {filtered.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((p) => (
                        <div
                            key={p._id}
                            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all p-6 overflow-hidden relative"
                        >
                            {/* ACCENT STRIP */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500 opacity-80" />

                            {/* CARD HEADER */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-orange-50 p-3 rounded-2xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${p.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {p.status}
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase">Salary Slip</p>
                                </div>
                            </div>

                            {/* MONTH & YEAR */}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {formatMonth(p.month).split(' ')[0]}
                                </h3>
                                <p className="text-sm font-medium text-gray-400">{formatMonth(p.month).split(' ')[1]}</p>
                            </div>

                            {/* AMOUNT */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-6 group-hover:bg-orange-50 transition-colors">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Take Home</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">₹</span>
                                    <span className="text-3xl font-black text-gray-900 group-hover:text-orange-700 transition-colors">
                                        {p.netSalary?.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelected(p)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                                >
                                    <Eye size={16} /> View
                                </button>

                                <button
                                    onClick={() => downloadPayslip(p._id, p.month)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:-translate-y-0.5 transition-all"
                                >
                                    <Download size={16} /> Get PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="bg-gray-50 p-6 rounded-full text-gray-300 mb-4">
                        <Building2 size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">No Payslips Found</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">
                        We couldn't find any payslips matching your current filters.
                    </p>
                    {(month || year) && (
                        <button
                            onClick={() => { setMonth(""); setYear(""); }}
                            className="mt-6 text-orange-500 font-bold text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* VIEW MODAL */}
            {selected && (
                <ViewPayslipModal
                    data={selected}
                    onClose={() => setSelected(null)}
                    onDownload={() => downloadPayslip(selected._id, selected.month)}
                />
            )}
        </div>
    );
};

export default EmployeePayslips;
