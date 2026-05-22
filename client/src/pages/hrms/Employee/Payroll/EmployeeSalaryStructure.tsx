/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

const EmployeeSalaryStructure = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [structure, setStructure] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    /* ================= FETCH STRUCTURE ================= */
    const fetchStructure = async () => {
        try {
            if (!user.id) return;

            const res = await axios.get(`${API_BASE}/salary-structures/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // ✅ API returns array
            setStructure(res.data?.[0] || null);
        } catch (err) {
            console.error("Failed to fetch salary structure");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStructure();
    }, []);

    if (loading) {
        return <Loader />;
    }

    if (!structure) {
        return (
            <p className="p-6 text-gray-500">Salary structure not assigned yet.</p>
        );
    }

    /* ================= CALCULATIONS ================= */
    const earnings = [
        { name: "Basic Salary", amount: structure.basic },
        { name: "HRA", amount: structure.hra },
        { name: "Other Allowance", amount: structure.otherAllowance },
    ];

    const deductions = [
        { name: "PF", amount: structure.pf },
        { name: "Professional Tax", amount: structure.professionalTax },
        { name: "TDS", amount: structure.tds },
        { name: "Advance", amount: structure.advance },
        { name: "Others", amount: structure.others },
    ];

    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalDeductions = deductions.reduce(
        (sum, d) => sum + (d.amount || 0),
        0
    );

    const netSalary = totalEarnings - totalDeductions;
    /* ================= UI ================= */
    return (
        <div className="p-4 max-w-4xl">
            {/* HEADER */}
            <div className="mb-5">
                <h2 className="text-2xl font-semibold">Salary Structure</h2>
                <p className="text-sm text-gray-500">
                    HRMS / Payroll / Salary Structure
                </p>
            </div>

            {/* CARD */}
            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
                {/* TOP */}
                <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-semibold">Monthly Salary Breakdown</h3>
                    <p className="text-sm text-gray-500">
                        Applicable for current payroll cycle
                    </p>
                </div>

                {/* BODY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    {/* EARNINGS */}
                    <div>
                        <h4 className="font-semibold text-green-600 mb-3">Earnings</h4>
                        <div className="space-y-2">
                            {earnings.map((e, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between text-sm border-b pb-1"
                                >
                                    <span>{e.name}</span>
                                    <span className="font-medium">₹{e.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DEDUCTIONS */}
                    <div>
                        <h4 className="font-semibold text-red-600 mb-3">Deductions</h4>
                        <div className="space-y-2">
                            {deductions.map((d, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between text-sm border-b pb-1"
                                >
                                    <span>{d.name}</span>
                                    <span className="font-medium">₹{d.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="bg-gray-50 px-6 py-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500">Total Earnings</p>
                        <p className="font-semibold text-green-700">₹{totalEarnings}</p>
                    </div>

                    <div>
                        <p className="text-gray-500">Total Deductions</p>
                        <p className="font-semibold text-red-600">₹{totalDeductions}</p>
                    </div>

                    <div>
                        <p className="text-gray-500">Net Monthly Salary</p>
                        <p className="text-xl font-bold text-primary">₹{netSalary}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSalaryStructure;
