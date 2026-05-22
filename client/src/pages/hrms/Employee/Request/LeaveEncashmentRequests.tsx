/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import AddLeaveEncashmentModal from "./AddLeaveEncashmentModal";
import { toast } from "@/pages/Alert/Toast";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

const LeaveEncashmentRequests = () => {
    const token = localStorage.getItem("token");

    const [requests, setRequests] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    /* ================= FETCH ================= */
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/leave-encashment/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(res.data || []);
        } catch (err) {
            console.error("Failed to fetch leave encashment requests");
            toast({
                type: "error",
                title: "Fetch Failed",
                message: "Unable to load your requests.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    /* ================= UI HELPERS ================= */
    const statusBadge = (status: string) => {
        const base = "px-3 py-1 rounded-full text-xs font-semibold";
        if (status === "APPROVED") return `${base} bg-green-100 text-green-700`;
        if (status === "REJECTED") return `${base} bg-red-100 text-red-700`;
        return `${base} bg-yellow-100 text-yellow-700`;
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("en-GB");

    /* ================= UI ================= */
    return (
        <div className="p-4 sm:p-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Leave Encashment Requests
                    </h2>
                    <p className="text-sm text-gray-500">
                        HRMS / Request / Leave Encashment
                    </p>
                </div>

                <button
                    onClick={() => setOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg shadow-sm text-sm font-medium transition-all"
                >
                    + Request Encashment
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Leave Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Days
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Rate (₹)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Total (₹)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Request Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Payroll Month
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10">
                                        <Loader />
                                    </td>
                                </tr>
                            ) : requests.length > 0 ? (
                                requests.map((r) => (
                                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {r.leaveType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {r.requestedDays}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            ₹{r.perDayRate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                                            ₹{r.totalAmount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatDate(r.requestDate)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium tracking-wide">
                                            {r.payrollMonth ? (
                                                <span className="bg-blue-50 px-2 py-1 rounded">
                                                    {new Date(r.payrollMonth + "-01").toLocaleDateString(
                                                        "en-GB",
                                                        { month: "long", year: "numeric" }
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">TBD</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={statusBadge(r.status)}>{r.status}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-12 text-center text-gray-400"
                                    >
                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl mb-2">📄</span>
                                            <p>No leave encashment requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MODAL */}
            <AddLeaveEncashmentModal
                open={open}
                onClose={() => setOpen(false)}
                onSuccess={fetchRequests}
            />
        </div>
    );
};

export default LeaveEncashmentRequests;
