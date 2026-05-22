/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface Leave {
  _id: string;
  leaveType: string;
  totalDays: number;
  status: string;
  fromDate: string;
  toDate: string;
}

const LeaveBalance = () => {
  const token = localStorage.getItem("token");

  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, leaveRes] = await Promise.all([
          axios.get(`${API_BASE}/leave-balance-adjustments/my-balances`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/employee/leaves`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setLeaveBalances(balanceRes.data || []);
        setLeaves(leaveRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ================= HELPERS ================= */

  const recentLeaves = leaves
    .filter((l) => l.status !== "REJECTED")
    .slice(0, 5);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB");

  /* ================= UI ================= */
  if (loading) return <Loader />;
  return (
    <div className="p-5 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Leave Balance Summary</h2>
        <p className="text-sm text-gray-500">View your current eligibility and adjustment history</p>
      </div>

      {/* ================= CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {leaveBalances.map((lb) => {
          const totalEligible = lb.maxDays + lb.adjustments;
          const usagePercent = totalEligible > 0 ? (lb.used / totalEligible) * 100 : 0;

          return (
            <div
              key={lb.leaveType}
              className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform" />

              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{lb.leaveType}</h4>
                {lb.adjustments !== 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lb.adjustments > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {lb.adjustments > 0 ? '+' : ''}{lb.adjustments} Adj
                  </span>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black text-gray-900">{lb.balance}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Remaining Days</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">{lb.used}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Used</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(usagePercent, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                  <span>Usage: {Math.round(usagePercent)}%</span>
                  <span>Quota: {totalEligible}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= RECENT SUMMARY ================= */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Recent Leave Summary</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-center">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 ">Type</th>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Days</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeaves.map((l) => (
                <tr key={l._id} className="border-t">
                  <td className="p-3">{l.leaveType}</td>
                  <td className="p-3">{formatDate(l.fromDate)}</td>
                  <td className="p-3">{formatDate(l.toDate)}</td>
                  <td className="p-3">{l.totalDays}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${l.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}

              {recentLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    No leave records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalance;
