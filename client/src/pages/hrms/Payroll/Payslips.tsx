/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Download, Loader2, Search } from "lucide-react";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";
interface PayslipRow {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  month: string;
  basic: number;
  hra: number;
  allowance: number;
  deduction: number;
  netSalary: number;
  status: "Generated" | "Sent";
}

const API_BASE = import.meta.env.VITE_API_URL;

const Payslips = () => {
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  /* ================= CURRENT MONTH ================= */
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Search + pagination — backend now supports month/search/page/limit
  // (opt-in via `page`, see payslipController.js getAllPayslips).
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, month]);

  /* ================= FETCH PAYSLIPS ================= */
  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/payslips`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month, page, limit, search: search || undefined },
      });

      setPayslips(res.data?.data || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } catch (err) {
      console.error("Failed to fetch payslips");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, page, search]);

  /* ================= GENERATE PAYSLIPS (FROM PAYROLL) ================= */
  const generatePayslip = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API_BASE}/payslips/generate-from-payroll`,
        { month },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchPayslips();
      toast({
        
        title: "Payslips Generated",
        description: res.data?.message || "Payslips Generated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Payslips Not Generated",
        description: "Failed to Generate Payslips.",
      });
    } finally {
      setGenerating(false);
    }
  };

  /* ================= DOWNLOAD ================= */
  const downloadPayslip = async (id: string, employeeName: string, monthStr: string) => {
    const res = await axios.get(`${API_BASE}/payslips/${id}/download`, {
      responseType: "blob",
      headers: { Authorization: `Bearer ${token}` },
    });

    const date = new Date(monthStr);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const fileName = `${employeeName}_${monthName}_${year}.pdf`;

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  };

   if (loading && initialLoad) {
      return (
        <div className="relative min-h-[300px]">
          <Loader />
        </div>
      );
    }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Payslips</h1>
          <p className="text-sm text-gray-500">
            Dashboard / Payroll / Payslips
          </p>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border px-3 py-2 rounded-md"
          />

          <button
            onClick={generatePayslip}
            disabled={generating}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Payslips"
            )}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto min-h-[calc(100vh-200px)]">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr className="text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Basic</th>
              <th className="px-4 py-3">HRA</th>
              <th className="px-4 py-3">Allowance</th>
              <th className="px-4 py-3">Deduction</th>
              <th className="px-4 py-3">Net Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {payslips.map((p, i) => (
              <tr key={p._id} className="border-t text-sm">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3">{p.user.name}</td>
                <td className="px-4 py-3">{p.month}</td>
                <td className="px-4 py-3">₹{p.basic}</td>
                <td className="px-4 py-3">₹{p.hra}</td>
                <td className="px-4 py-3">₹{p.allowance}</td>
                <td className="px-4 py-3 text-red-500">₹{p.deduction}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ₹{p.netSalary}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      p.status === "Sent"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-center relative">
                  <MoreVertical
                    className="cursor-pointer"
                    size={18}
                    onClick={() =>
                      setOpenMenu(openMenu === p._id ? null : p._id)
                    }
                  />

                  {openMenu === p._id && (
                    <div className="absolute right-6 mt-2 w-44 bg-white border rounded shadow">
                      <button
                        onClick={() => downloadPayslip(p._id, p.user.name, p.month)}
                        className="flex gap-2 px-4 py-2 w-full text-sm hover:bg-gray-100"
                      >
                        <Download size={14} /> Download PDF
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {payslips.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-500">
                  No payslips found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.total > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} payslips)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.current <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total, p + 1))}
              disabled={pagination.current >= pagination.total}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payslips;



