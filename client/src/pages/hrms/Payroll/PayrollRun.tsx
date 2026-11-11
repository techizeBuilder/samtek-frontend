/** @format */
// Payroll Run (rewritten 2026-11-11). The server works out everyone's pay from
// attendance, leave and holidays (GET /payroll/month); this page only shows it and
// asks for a run. Paged and searched on the server.
import { useEffect, useState } from "react";
import { MoreVertical, Search, X } from "lucide-react";
import api from "@/services/api";
import ViewPayrollModal from "./ViewPayrollModal";
import PayExplainer, { DAY_LABELS } from "./PayExplainer";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";

type Status = "Not run" | "Draft" | "Processed" | "Paid" | "Rejected";

interface Row {
  payrollId?: string;
  userId: string;
  name: string;
  employeeId?: string;
  onDevice?: boolean;
  workingDays?: number;
  payDays: number;
  lopDays: number;
  gross: number;
  deduction: number;
  net: number;
  earned?: number;
  workedOnOff?: number;
  days?: Record<string, number>;
  status: Status;
  rejectReason?: string;
  rejectedAt?: string;
}

interface MonthData {
  month: string;
  finished: boolean;
  rows: Row[];
  pagination: { page: number; pages: number; total: number };
  totals: { gross: number; deduction: number; net: number };
  notRun: number;
  people: number;
  noSalary: { userId: string; name: string; employeeId?: string }[];
  noSalaryCount: number;
}

const API_BASE = import.meta.env.VITE_API_URL;
const rupees = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const daysText = (n?: number) => (n === undefined || n === null ? "–" : String(n));
const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthName = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const statusClass: Record<string, string> = {
  "Not run": "text-gray-500",
  Paid: "text-green-600",
  Rejected: "text-red-600",
};

const PayrollRun = () => {
  const [month, setMonth] = useState(lastMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<any>(null);
  const [daysOf, setDaysOf] = useState<{ row: Row; detail: any | null } | null>(null);
  const [rejectView, setRejectView] = useState<Row | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => { setPage(1); }, [search, month]);

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month, page: String(page), limit: "15" });
      if (search) params.set("search", search);
      setData(await api.get(`/payroll/month?${params.toString()}`));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't load payroll", description: e?.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month, page, search]);

  const runPayroll = async () => {
    if (!window.confirm(`Run payroll for ${monthName(month)}? Everyone not run yet is paid as shown.`)) return;
    try {
      setRunning(true);
      const res: any = await api.post("/payroll/run", { month });
      toast({ title: "Payroll run", description: res?.message });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Payroll run failed", description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  const resetPayroll = async () => {
    if (!window.confirm(`Reset payroll for ${monthName(month)}? This deletes what was run.`)) return;
    try {
      await api.delete(`/payroll/reset?month=${month}`);
      toast({ title: "Payroll reset" });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reset failed", description: e?.message });
    }
  };

  const recalculate = async (row: Row) => {
    try {
      await api.post("/payroll/recalculate", { payrollId: row.payrollId });
      toast({ title: "Recalculated", description: `${row.name}'s pay was worked out again.` });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Recalculation failed", description: e?.message });
    }
  };

  const openDays = async (row: Row) => {
    setOpenMenu(null);
    setDaysOf({ row, detail: null });
    try {
      const detail = await api.get(`/payroll/days?month=${month}&userId=${row.userId}`);
      setDaysOf({ row, detail });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't load the days", description: e?.message });
      setDaysOf(null);
    }
  };

  const downloadPayslip = async (payrollId: string, m: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/payslips/${payrollId}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const url = window.URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payslip-${m}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to download payslip. Generate payslips for this month first.");
    }
  };

  const finished = !!data?.finished;
  const anySaved = !!data?.rows.some((r) => r.payrollId) || (data ? data.notRun < data.people : false);
  const canRun = finished && (data?.notRun || 0) > 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Run</h1>
          <p className="text-sm text-gray-500">Dashboard / Payroll / Run</p>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search employee..."
              className="border pl-9 pr-3 py-2 rounded-md w-56"
            />
          </div>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="border px-3 py-2 rounded-md" />
          <button
            onClick={runPayroll}
            disabled={!canRun || running}
            title={!finished ? "Can be run after the month ends" : canRun ? "" : "Everyone has been run"}
            className={`px-4 py-2 rounded-md text-white ${canRun && !running ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {running ? "Running..." : !finished ? "Run after month ends" : canRun ? `Run Payroll (${data?.notRun})` : "Processed"}
          </button>
          {anySaved && (
            <button onClick={resetPayroll} className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600">
              Reset
            </button>
          )}
        </div>
      </div>

      {data && !finished && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {monthName(month)} isn't over yet, so this is pay <b>so far</b>. Days still to come aren't counted. Run Payroll opens after the month ends.
        </div>
      )}

      <PayExplainer />

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border bg-white p-3"><p className="text-xs text-gray-500">People paid</p><p className="text-lg font-semibold">{data.people}</p></div>
          <div className="rounded-lg border bg-white p-3"><p className="text-xs text-gray-500">Not run yet</p><p className="text-lg font-semibold">{data.notRun}</p></div>
          <div className="rounded-lg border bg-white p-3"><p className="text-xs text-gray-500">Total gross</p><p className="text-lg font-semibold">{rupees(data.totals.gross)}</p></div>
          <div className="rounded-lg border bg-white p-3"><p className="text-xs text-gray-500">Total net</p><p className="text-lg font-semibold text-green-700">{rupees(data.totals.net)}</p></div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="relative min-h-[300px]"><Loader /></div>
        ) : (
          <table className="w-full text-center text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3" title="Days in the month minus weekly offs">Working days</th>
                <th className="p-3">Pay days</th>
                <th className="p-3">Loss of pay</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Deduction</th>
                <th className="p-3">Net</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length === 0 && (
                <tr><td colSpan={9} className="p-10 text-gray-500">No one with a salary for this month{search ? " matches the search" : ""}.</td></tr>
              )}
              {data?.rows.map((row) => (
                <tr key={row.userId} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openDays(row)}>
                  <td className="p-3 text-left">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.employeeId}{row.onDevice ? " · device" : ""}{row.workedOnOff ? ` · worked ${row.workedOnOff} off day(s)` : ""}</div>
                  </td>
                  <td className="p-3">{daysText(row.workingDays)}</td>
                  <td className="p-3">{daysText(row.payDays)}</td>
                  <td className="p-3 text-red-500">{daysText(row.lopDays)}</td>
                  <td className="p-3">{rupees(row.gross)}</td>
                  <td className="p-3 text-red-500">{rupees(row.deduction)}</td>
                  <td className="p-3 font-semibold text-green-600">{rupees(row.net)}</td>
                  <td className={`p-3 font-semibold ${statusClass[row.status] || ""}`}>{row.status}</td>
                  <td className="p-3 relative" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-block cursor-pointer" onClick={() => setOpenMenu(openMenu === row.userId ? null : row.userId)}>
                      <MoreVertical size={18} />
                    </span>
                    {openMenu === row.userId && (
                      <div className="absolute right-6 mt-2 w-48 bg-white border rounded-md shadow-lg z-50 text-left">
                        <button className="w-full px-4 py-2 text-sm hover:bg-gray-100 text-left" onClick={() => openDays(row)}>View days</button>
                        <button
                          className="w-full px-4 py-2 text-sm hover:bg-gray-100 text-left"
                          onClick={() => { setOpenMenu(null); setPayslip({ ...row, month }); }}
                        >
                          View payslip
                        </button>
                        {row.status === "Rejected" && (
                          <>
                            <button className="w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-100 text-left" onClick={() => { setOpenMenu(null); recalculate(row); }}>
                              Recalculate Payroll
                            </button>
                            <button className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left" onClick={() => { setOpenMenu(null); setRejectView(row); }}>
                              View Reject Reason
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
          <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} people)</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="px-3 py-1 border rounded disabled:opacity-40" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {data && data.noSalaryCount > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="font-semibold text-gray-700">Not paid: no salary entered ({data.noSalaryCount})</p>
          <p className="text-gray-600 mt-1">
            {data.noSalary.map((p) => p.name + (p.employeeId ? ` (${p.employeeId})` : "")).join(", ")}
            {data.noSalaryCount > data.noSalary.length ? ` and ${data.noSalaryCount - data.noSalary.length} more` : ""}
          </p>
          <p className="text-xs text-gray-500 mt-1">Add a Salary Structure for them to be paid.</p>
        </div>
      )}

      <ViewPayrollModal isOpen={!!payslip} onClose={() => setPayslip(null)} data={payslip} onDownload={downloadPayslip} />

      {daysOf && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDaysOf(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">{daysOf.row.name}: {monthName(month)}</h2>
                <p className="text-xs text-gray-500">
                  {daysOf.row.payrollId ? "Saved when payroll was run. The days below are worked out from today's attendance." : "Worked out from today's attendance, leave and holidays."}
                </p>
              </div>
              <button onClick={() => setDaysOf(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {!daysOf.detail ? (
              <div className="relative min-h-[120px]"><Loader /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-sm">
                  <div className="border rounded p-2"><p className="text-xs text-gray-500">Working days</p><p className="font-semibold">{daysOf.detail.pay.workingDays}</p></div>
                  <div className="border rounded p-2"><p className="text-xs text-gray-500">Pay days</p><p className="font-semibold">{daysOf.detail.pay.payDays}</p></div>
                  <div className="border rounded p-2"><p className="text-xs text-gray-500">Loss of pay</p><p className="font-semibold text-red-500">{daysOf.detail.pay.lopDays}</p></div>
                  <div className="border rounded p-2"><p className="text-xs text-gray-500">Net</p><p className="font-semibold text-green-600">{rupees(daysOf.detail.pay.net)}</p></div>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.keys(DAY_LABELS).filter((k) => daysOf.detail.pay.days[k] > 0).map((k) => (
                      <tr key={k} className="border-t align-top">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{DAY_LABELS[k]}</td>
                        <td className="py-2 pr-3 text-right">{daysOf.detail.pay.days[k]}</td>
                        <td className="py-2 text-xs text-gray-500">
                          {daysOf.detail.days.filter((d: any) => d.kind === k).map((d: any) => Number(d.date.slice(8)) + (d.worked && (k === "weeklyOff" || k.endsWith("Holiday")) ? "*" : "")).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {daysOf.detail.pay.workedOnOff > 0 && (
                  <p className="text-xs text-gray-500 mt-2">* Worked on a weekly off or holiday. No extra pay for now.</p>
                )}
                {!daysOf.detail.hasSalary && <p className="text-sm text-red-600 mt-3">No salary structure: not paid.</p>}
              </>
            )}
          </div>
        </div>
      )}

      {rejectView && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-3 text-red-600">Payroll Rejected</h2>
            <p className="text-sm text-gray-500">Rejection Reason</p>
            <p className="border rounded-md p-2 mt-1 bg-gray-50 mb-3">{rejectView.rejectReason}</p>
            <p className="text-sm text-gray-500">Rejected On</p>
            <p className="mt-1 font-medium mb-4">{rejectView.rejectedAt ? new Date(rejectView.rejectedAt).toLocaleString() : "–"}</p>
            <div className="text-right"><button className="px-4 py-2 border rounded-md" onClick={() => setRejectView(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollRun;
