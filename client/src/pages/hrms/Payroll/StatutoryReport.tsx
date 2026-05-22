/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

const StatutoryReport = () => {
    const token = localStorage.getItem("token");
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/statutory-reports`, {
                params: { month },
                headers: { Authorization: `Bearer ${token}` },
            });
            setReports(res.data);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Fetch Failed",
                description: "Unable to load statutory reports.",
            });
        } finally {
            setLoading(false);
        }
    };

    const generateReports = async () => {
        setLoading(true);
        try {
            const res = await axios.post(
                `${API_BASE}/statutory-reports/generate`,
                { month },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast({
                
                title: "Reports Generated",
                description: res.data.message,
            });
            fetchReports();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error.response?.data?.message || "Failed to generate reports.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [month]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Statutory Report</h1>
                <div className="flex gap-4">
                    <input
                        type="month"
                        className="border px-3 py-2 rounded"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                    <button
                        onClick={generateReports}
                        disabled={loading}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                        {loading ? "Generating..." : "Generate Report"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-sm">Employee</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right">Gross</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right text-blue-600">PF</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right text-green-600">ESI</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right text-purple-600">PT</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right text-red-600">TDS</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right font-bold">Total Ded.</th>
                            <th className="px-4 py-3 font-semibold text-sm text-right text-green-700 font-bold">Net Salary</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    No reports found for this month. Click "Generate Report" to create them.
                                </td>
                            </tr>
                        ) : (
                            reports.map((r) => (
                                <tr key={r._id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">
                                        <div className="font-medium">{r.employee?.name}</div>
                                        <div className="text-xs text-gray-500">{r.employee?.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">₹{r.grossSalary.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-blue-600">₹{r.pf.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-green-600">₹{r.esi.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-purple-600">₹{r.pt.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-red-600">₹{r.tds.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right font-bold text-red-700">₹{r.totalDeduction.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right font-bold text-green-700">₹{r.netSalary.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StatutoryReport;

