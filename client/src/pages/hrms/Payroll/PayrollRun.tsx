/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import ViewPayrollModal from "./ViewPayrollModal";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
const API_BASE = import.meta.env.VITE_API_URL;

type PayrollStatus = "Draft" | "Processed" | "Paid" | "Rejected";

interface PayrollRow {
  payrollId?: string;
  userId: string;
  name: string;
  gross: number;
  deduction: number;
  net: number;
  payDays: number;
  lopDays: number;
  unearnedSalary?: number;
  status: PayrollStatus;
  rejectReason?: string;
  rejectedAt?: string;
}


const PayrollRun = () => {
  const { user: authUser } = useAuth();
  const companyId = authUser?.companyId;
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isPayrollRun, setIsPayrollRun] = useState(false);
  const [openPayslip, setOpenPayslip] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const token = localStorage.getItem("token");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [rejectViewModal, setRejectViewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rejectDetails, setRejectDetails] = useState<{
    reason: string;
    rejectedAt: string;
  } | null>(null);




  /* ================= FETCH & CALCULATE PAYROLL ================= */
  const generatePayroll = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [year, monthStr] = month.split("-");
      const monthNumber = Number(monthStr);

      // Build company filter query param
      const companyParam = companyId ? `?companyId=${companyId}` : "";

      const [
        usersRes,
        salaryRes,
        leaveTypeRes,
        leaveRes,
        attendanceRes,
      ] = await Promise.all([
        axios.get(`${API_BASE}/users${companyParam}`, { headers }),
        axios.get(`${API_BASE}/salary-structures${companyParam}`, { headers }),
        axios.get(`${API_BASE}/leave-types`, { headers }),
        axios.get(`${API_BASE}/leaves/all`, { headers }),
        axios.get(
          `${API_BASE}/attendance/all?month=${monthNumber - 1}&year=${year}`,
          { headers }
        ),
      ]);

      const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []);
      const salaries = Array.isArray(salaryRes.data) ? salaryRes.data : (salaryRes.data.salaryList || []);
      const leaveTypes = Array.isArray(leaveTypeRes.data) ? leaveTypeRes.data : [];
      const leaves = Array.isArray(leaveRes.data) ? leaveRes.data : [];
      const attendance = attendanceRes.data?.attendance || [];


      /* ================= CALCULATION ================= */
      const numYear = Number(year);
      const numMonth = Number(monthStr);
      const daysInMonth = new Date(numYear, numMonth, 0).getDate();
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === numYear && (now.getMonth() + 1) === numMonth;
      const currentDay = now.getDate();

      const rows: PayrollRow[] = users.map((user: any) => {
        const salary = salaries.find((s: any) => s.employee._id === user._id);
        if (!salary) return null;

        // Robust ID helper
        const getUserId = (obj: any) => (typeof obj === "object" ? obj?._id || obj : obj);

        const userLeaves = leaves.filter((l: any) => getUserId(l.employee) === user._id && l.status === "APPROVED");
        const userAttendance = attendance.filter((a: any) => getUserId(a.user) === user._id);

        /* ===== ATTENDANCE & PAYABLE DAYS ===== */
        let presentDays = 0;
        let paidLeaveDays = 0;
        let lopDays = 0;
        let isPresentToday = false;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;

          const att = userAttendance.find((a: any) => a.date === dateStr);
          const isPresent = att && (att.punchIn || att.punchOut || att.totalWorkSeconds > 0);

          const leave = userLeaves.find((l: any) => dateStr >= l.fromDate && dateStr <= l.toDate);

          if (isPresent) {
            presentDays++;
            if (isCurrentMonth && d === currentDay) isPresentToday = true;
          } else if (leave) {
            const lt = leaveTypes.find((t: any) => t.name === leave.leaveType);
            if (lt?.paid) {
              paidLeaveDays++;
            } else {
              lopDays++;
            }
          } else {
            // No attendance and no leave
            // If it's a past day, it's LOP
            if (!isCurrentMonth || d < currentDay) {
              lopDays++;
            }
          }
        }

        const payDays = presentDays + paidLeaveDays;
        const fullMonthlyGross = (salary.basic || 0) + (salary.hra || 0) + (salary.otherAllowance || 0);
        const perDaySalary = fullMonthlyGross / daysInMonth;

        // Future days: days strictly after today
        const futureDaysCount = isCurrentMonth ? Math.max(0, daysInMonth - currentDay) : 0;
        const unearnedSalary = Math.round(perDaySalary * futureDaysCount);

        // Today's status: if not present and no leave, it's pending/not-earned yet
        const todayPendingDeduction = (isCurrentMonth && !isPresentToday && !userLeaves.find((l: any) => {
          const todayStr = `${year}-${monthStr}-${String(currentDay).padStart(2, '0')}`;
          return todayStr >= l.fromDate && todayStr <= l.toDate;
        })) ? Math.round(perDaySalary) : 0;

        const lopDeduction = Math.round(perDaySalary * lopDays);

        /* ===== LEAVE ENCASHMENT BONUS REMOVED ===== */
        const encashmentBonus = 0;

        const totalGross = fullMonthlyGross + encashmentBonus;
        const fixedDeduction = (salary.pf || 0) + (salary.professionalTax || 0) + (salary.tds || 0) + (salary.advance || 0) + (salary.others || 0);

        // Total Deduction = Fixed + LOP + Future + Today (if not present)
        const totalDeduction = fixedDeduction + lopDeduction + unearnedSalary + todayPendingDeduction;

        // Net Salary calculation (Gross - Deduction, capped at 0)
        const netSalry = Math.max(0, totalGross - totalDeduction);

        return {
          userId: user._id,
          name: user.fullName,
          gross: totalGross,
          deduction: totalDeduction,
          net: netSalry,
          payDays: payDays,
          lopDays: lopDays,
          unearnedSalary: unearnedSalary + todayPendingDeduction,
          status: "Draft",
        };
      });

      setPayroll(rows.filter(Boolean));
      toast({

        title: "Payroll Generated",
        description: "Payroll has been generated successfully.",
      });
      setLoading(false);
      setIsPayrollRun(false);
    } catch (error) {
      console.error("Payroll generation failed", error);
      setLoading(false);
      setIsPayrollRun(false);
      toast({
        variant: "destructive",
        title: "Payroll Failed",
        description:
          "Failed to generate payroll. Please try again.",
      });
    }
  };

  const fetchPayrollFromServer = async () => {
    try {
      const res = await axios.get(`${API_BASE}/payroll?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.length > 0) {
        const mapped = res.data.map((p: any) => ({
          payrollId: p._id,
          userId: p.employee._id,
          name: p.employee.name,
          gross: p.gross,
          deduction: p.deduction,
          net: p.net,
          payDays: p.payDays,
          lopDays: p.lopDays,
          status: p.status,
          rejectReason: p.rejectReason,
          rejectedAt: p.rejectedAt,
        }));


        setPayroll(mapped);
        setLoading(false);
        setIsPayrollRun(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      const exists = await fetchPayrollFromServer();
      if (!exists) {
        generatePayroll(); // only calculate if payroll not run
      }
    })();
  }, [month]);



  /* ================= RUN PAYROLL ================= */
  const runPayroll = async () => {
    console.log("isParyrollRun", isPayrollRun);
    if (isPayrollRun) return;

    try {
      await axios.post(
        `${API_BASE}/payroll/run`,
        {
          month,
          payroll: payroll.map((p) => ({
            userId: p.userId,
            gross: p.gross,
            deduction: p.deduction,
            net: p.net,
            payDays: p.payDays,
            lopDays: p.lopDays,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Payroll processed for ${month}`);
      fetchPayrollFromServer();
    } catch (error) {
      console.error(error);
      alert("Payroll run failed");
    }
  };

  const recalculatePayroll = async (row: PayrollRow) => {
    try {
      await axios.post(
        `${API_BASE}/payroll/recalculate`,
        {
          payrollId: row.payrollId,
          gross: row.gross,
          deduction: row.deduction,
          net: row.net,
          payDays: row.payDays,
          lopDays: row.lopDays,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Payroll recalculated successfully");
      fetchPayrollFromServer(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Recalculation failed");
    }
  };

  const resetPayroll = async () => {
    if (!window.confirm(`Are you sure you want to reset payroll for ${month}? This will delete processed data.`)) return;

    try {
      await axios.delete(`${API_BASE}/payroll/reset?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({

        title: "Payroll Reset",
        description: "Payroll has been reset. You can now re-run it.",
      });
      setIsPayrollRun(false);
      generatePayroll();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.response?.data?.message || "Failed to reset payroll",
      });
    }
  };

  const downloadPayslip = async (id: string, monthStr: string) => {
    try {
      const res = await axios.get(`${API_BASE}/payslips/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payslip-${monthStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to download payslip. Ensure it is processed/paid.");
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-[300px]">
        <Loader />
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Run</h1>
          <p className="text-sm text-gray-500">Dashboard / Payroll / Run</p>
        </div>

        <div className="flex gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border px-3 py-2 rounded-md"
          />

          <button
            onClick={runPayroll}
            disabled={isPayrollRun}
            className={`px-4 py-2 rounded-md text-white ${isPayrollRun ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"
              }`}
          >
            {isPayrollRun ? "Processed" : "Run Payroll"}
          </button>

          {isPayrollRun && (
            <button
              onClick={resetPayroll}
              className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Sr.No</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Gross</th>
              <th className="p-3">Deduction</th>
              <th className="p-3">Net</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {payroll.map((row, i) => (
              <tr key={row.userId} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{row.name}</td>
                <td className="p-3">₹{row.gross}</td>
                <td className="p-3 text-red-500">₹{row.deduction}</td>
                <td className="p-3 font-semibold text-green-600">₹{row.net}</td>
                <td className="p-3 font-semibold">{row.status}</td>

                <td className="p-3 text-center relative overflow-visible">
                  <span
                    className="inline-block cursor-pointer"
                    onClick={() =>
                      setOpenMenu(openMenu === row.userId ? null : row.userId)
                    }
                  >
                    <MoreVertical size={18} />
                  </span>

                  {openMenu === row.userId && (
                    <div className="absolute right-6 mt-2 w-44 bg-white border rounded-md shadow-lg z-50">
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => {
                          setOpenMenu(null);
                          setSelectedPayslip({
                            payrollId: row.payrollId,
                            name: row.name,
                            month,
                            gross: row.gross,
                            deduction: row.deduction,
                            net: row.net,
                            payDays: row.payDays,
                            lopDays: row.lopDays,
                            unearnedSalary: row.unearnedSalary,
                          });
                          setOpenPayslip(true);
                        }}
                      >
                        View Payslip
                      </button>

                      {row.status === "Rejected" && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100"
                          onClick={() => recalculatePayroll(row)}
                        >
                          Recalculate Payroll
                        </button>
                      )}

                      {/* 👇 ONLY IF REJECTED */}
                      {row.status === "Rejected" && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          onClick={() => {
                            setOpenMenu(null);
                            setRejectDetails({
                              reason: row.rejectReason!,
                              rejectedAt: row.rejectedAt!,
                            });
                            setRejectViewModal(true);
                          }}
                        >
                          View Reject Reason
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ViewPayrollModal
        isOpen={openPayslip}
        onClose={() => setOpenPayslip(false)}
        data={selectedPayslip}
        onDownload={downloadPayslip}
      />
      {rejectViewModal && rejectDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-3 text-red-600">
              Payroll Rejected
            </h2>

            <div className="mb-3">
              <p className="text-sm text-gray-500">Rejection Reason</p>
              <p className="border rounded-md p-2 mt-1 bg-gray-50">
                {rejectDetails.reason}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">Rejected On</p>
              <p className="mt-1 font-medium">
                {new Date(rejectDetails.rejectedAt).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <button
                className="px-4 py-2 border rounded-md"
                onClick={() => setRejectViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollRun;



