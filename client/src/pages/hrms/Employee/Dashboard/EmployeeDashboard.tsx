/** @format */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  CalendarCheck,
  Wallet,
  Clock,
  IndianRupee,
  Receipt,
  Target,
  Calendar,
  Users,
  TrendingUp,
  History,
  ArrowRight,
  ChevronRight,
  LogOut,
  LogIn,
  AlertCircle,
  Sparkles,
  Bell,
  Search,
  Coffee,
  Play,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loader from "../../Loader";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

interface Activity {
  id: string;
  type: string;
  title: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
}

interface EmployeeDashboardStats {
  attendance: {
    present: number;
    total: number;
    percentage: number;
    history: { day: string; hours: number }[];
  };
  leaves: {
    used: number;
    balance: number;
    pending: number;
  };
  payroll: {
    lastSalary: number;
    month: string;
  };
  expenses: {
    submitted: number;
    pending: number;
  };
  goals: {
    total: number;
    completed: number;
  };
  activities: Activity[];
}

/* ================= HELPERS ================= */

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map(v => v.toString().padStart(2, "0")).join(":");
};

/* ================= MAIN COMPONENT ================= */

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const { toast } = useToast();

  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Persistence States
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isPunchedOut, setIsPunchedOut] = useState(false);
  const [totalWorkTime, setTotalWorkTime] = useState("00:00:00");
  const [currentBreakTime, setCurrentBreakTime] = useState("00:00:00");

  const token = localStorage.getItem("token");

  // Live clock and Timer calculation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Calculate Running Work Timer
      if (punchInTime && !isPunchedOut) {
        const diff = Math.floor((now.getTime() - punchInTime.getTime()) / 1000);
        setTotalWorkTime(formatDuration(diff > 0 ? diff : 0));
      }

      // Calculate Running Break Timer
      if (breakStartTime) {
        const diff = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
        setCurrentBreakTime(formatDuration(diff > 0 ? diff : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [punchInTime, isPunchedOut, breakStartTime]);

  const loadDashboard = useCallback(async () => {
    try {
      if (!token) return;
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const fetchWithFallback = async (url: string, fallback: any = []) => {
        try {
          const res = await axios.get(url, { headers });
          return res.data;
        } catch (err) {
          return fallback;
        }
      };

      const [attendanceRes, leaveRes, employeeLeavesRes, expenseRes, payslipRes, goalsRes] = await Promise.all([
        fetchWithFallback(`${API_BASE}/attendance/me`),
        fetchWithFallback(`${API_BASE}/leave-balance-adjustments/my-balances`),
        fetchWithFallback(`${API_BASE}/leaves/me`),
        fetchWithFallback(`${API_BASE}/expense-requests/me`),
        fetchWithFallback(`${API_BASE}/payslips/me/my-payslips`),
        fetchWithFallback(`${API_BASE}/goals/my-assigned`),
      ]);

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Handle Current Attendance Status & Timers
      const allAttendance = Array.isArray(attendanceRes) ? attendanceRes : [];
      const todayRecord = allAttendance.find((a: any) => a.date === todayStr);

      if (todayRecord) {
        setIsPunchedIn(!!todayRecord.punchIn);
        setIsPunchedOut(!!todayRecord.punchOut);

        if (todayRecord.punchIn) {
          setPunchInTime(new Date(todayRecord.punchIn));
        }

        // Check for active break
        const activeBreak = todayRecord.breaks?.find((b: any) => !b.end);
        if (activeBreak) {
          setBreakStartTime(new Date(activeBreak.start));
        } else {
          setBreakStartTime(null);
          setCurrentBreakTime("00:00:00");
        }
      } else {
        setIsPunchedIn(false);
        setIsPunchedOut(false);
        setPunchInTime(null);
        setBreakStartTime(null);
      }

      // Process Stats (similar to before)
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyAttendance = allAttendance.filter((a: any) => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const presentCount = monthlyAttendance.filter((a: any) => a.status === "PRESENT").length;

      setStats({
        attendance: {
          present: presentCount,
          total: new Date(currentYear, currentMonth + 1, 0).getDate(),
          percentage: Math.round((presentCount / 30) * 100) || 0,
          history: Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const ds = d.toISOString().split("T")[0];
            const dr = allAttendance.find((a: any) => a.date === ds);
            return {
              day: d.toLocaleDateString("en-US", { weekday: "short" }),
              hours: dr?.totalWorkSeconds ? Math.round(dr.totalWorkSeconds / 3600 * 10) / 10 : 0,
            };
          }),
        },
        leaves: {
          used: Array.isArray(leaveRes) ? leaveRes.reduce((s, i) => s + (i.used || 0), 0) : 0,
          balance: Array.isArray(leaveRes) ? leaveRes.reduce((s, i) => s + (i.balance || 0), 0) : 0,
          pending: Array.isArray(employeeLeavesRes) ? employeeLeavesRes.filter((l: any) => l.status === "PENDING").length : 0,
        },
        payroll: {
          lastSalary: Array.isArray(payslipRes) ? (payslipRes[0]?.netSalary || 0) : 0,
          month: Array.isArray(payslipRes) ? (payslipRes[0]?.month || "-") : "-",
        },
        expenses: {
          submitted: Array.isArray(expenseRes) ? expenseRes.length : 0,
          pending: Array.isArray(expenseRes) ? expenseRes.filter((e: any) => e.status === "PENDING").length : 0,
        },
        goals: {
          total: Array.isArray(goalsRes) ? goalsRes.length : 0,
          completed: Array.isArray(goalsRes) ? goalsRes.filter((g: any) => g.completed).length : 0,
        },
        activities: [], // Simplified for this update
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePunchAction = async (type: "punch-in" | "punch-out" | "break-start" | "break-end") => {
    try {
      setActionLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let endpoint = `/attendance/${type}`;
      if (type.startsWith("break")) {
        endpoint = `/attendance/break/${type.split("-")[1]}`;
      }

      await axios.post(`${API_BASE}${endpoint}`, {}, { headers });

      toast({
        title: "Success",
        description: `${type.replace("-", " ").toUpperCase()} recorded successfully.`,
      });

      await loadDashboard();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to perform action.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12 overflow-x-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-indigo-50 to-[#F8FAFC] -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* ================= HEADER & TIMERS ================= */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Hello, {user?.fullName?.split(" ")[0] || "Employee"}!
            </h1>
            <p className="text-slate-500 font-medium">
              Today is {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Live Work Timer */}
            {isPunchedIn && (
              <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Work Time</span>
                  <span className="text-xl font-black font-mono text-indigo-600">{totalWorkTime}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 animate-pulse">
                  <Clock size={20} />
                </div>
              </div>
            )}

            {/* Live Break Timer */}
            {breakStartTime && (
              <div className="flex items-center gap-4 bg-amber-50 px-6 py-3 rounded-2xl shadow-sm border border-amber-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">On Break</span>
                  <span className="text-xl font-black font-mono text-amber-600">{currentBreakTime}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 animate-bounce">
                  <Coffee size={20} />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              {!isPunchedIn ? (
                <Button
                  onClick={() => handlePunchAction("punch-in")}
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6"
                >
                  <Play className="w-4 h-4 mr-2" /> Punch In
                </Button>
              ) : !isPunchedOut ? (
                <>
                  {breakStartTime ? (
                    <Button
                      onClick={() => handlePunchAction("break-end")}
                      disabled={actionLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-11 px-6"
                    >
                      <Square className="w-4 h-4 mr-2" /> End Break
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePunchAction("break-start")}
                      disabled={actionLoading}
                      variant="outline"
                      className="border-slate-200 text-slate-600 font-bold rounded-xl h-11 px-6 hover:bg-slate-50"
                    >
                      <Coffee className="w-4 h-4 mr-2" /> Start Break
                    </Button>
                  )}
                  <Button
                    onClick={() => handlePunchAction("punch-out")}
                    disabled={actionLoading || !!breakStartTime}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-11 px-6"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Punch Out
                  </Button>
                </>
              ) : (
                <div className="px-6 py-2 text-emerald-600 font-bold flex items-center gap-2">
                  <CalendarCheck size={20} /> Shift Completed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= STATS CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Attendance" value={`${stats?.attendance.percentage}%`} subtitle="This Month" icon={CalendarCheck} color="indigo" />
          <StatCard title="Leaves" value={stats?.leaves.balance} subtitle={`${stats?.leaves.used} Used`} icon={Wallet} color="emerald" />
          <StatCard title="Last Salary" value={`₹${stats?.payroll.lastSalary.toLocaleString()}`} subtitle={stats?.payroll.month} icon={IndianRupee} color="blue" />
          <StatCard title="Expenses" value={stats?.expenses.pending} subtitle="Pending Claims" icon={Receipt} color="rose" />
        </div>

        {/* ================= ANALYTICS & TOOLS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-bold">Attendance Analytics</CardTitle>
                <CardDescription>Working hours over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.attendance.history || []}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickAction label="Apply Leave" icon={Calendar} color="indigo" onClick={() => navigate("/hrms/Employee/leave/apply")} />
              <QuickAction label="My Payslips" icon={IndianRupee} color="blue" onClick={() => navigate("/hrms/Employee/payroll/payslips")} />
              <QuickAction label="Policies" icon={Users} color="emerald" onClick={() => navigate("/hrms/Employee/profile/policies")} />
              <QuickAction label="Profile" icon={Target} color="rose" onClick={() => navigate("/hrms/Employee/profile")} />
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col h-full min-h-[400px]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" /> Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <AlertCircle size={48} />
                  <p className="mt-4 font-bold text-sm italic">No recent logs today</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="border-0 shadow-sm rounded-3xl bg-white p-6 group hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-900">{value ?? "0"}</h3>
          <p className="text-[10px] font-bold text-slate-400">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function QuickAction({ label, icon: Icon, color, onClick }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
  };
  return (
    <motion.button
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white shadow-sm border border-slate-100 transition-all hover:shadow-lg"
    >
      <div className={`p-3 rounded-2xl mb-3 transition-all ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{label}</span>
    </motion.button>
  );
}
