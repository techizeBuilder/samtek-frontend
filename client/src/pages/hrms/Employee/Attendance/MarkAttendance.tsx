/** @format */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  Play, 
  LogIn, 
  LogOut, 
  Coffee, 
  Clock, 
  Calendar, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Square,
  Timer
} from "lucide-react";
import Loader from "../../Loader";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL;

/* ================= TYPES ================= */

interface AttendanceLog {
  _id: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  totalBreakSeconds: number;
  totalWorkSeconds: number;
  breaks: { start: string; end?: string; duration: number }[];
  status: string;
}

/* ================= HELPERS ================= */

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const WORK_GOAL_SECONDS = 9 * 3600; // 9 Hours

export default function MarkAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("token");

  /* ================= STATE ================= */

  const [history, setHistory] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Active Record Tracking
  const [todayRecord, setTodayRecord] = useState<AttendanceLog | null>(null);
  const [activeWorkTimer, setActiveWorkTimer] = useState("00:00:00");
  const [activeBreakTimer, setActiveBreakTimer] = useState("00:00:00");
  const [workProgress, setWorkProgress] = useState(0);

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  /* ================= FETCH DATA ================= */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/me");
      const data = Array.isArray(res.data) ? res.data : [];
      setHistory(data);

      const today = new Date().toISOString().split("T")[0];
      const todayRec = data.find((a: any) => a.date === today);
      setTodayRecord(todayRec || null);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ================= TIMER LOGIC ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (todayRecord && todayRecord.punchIn) {
        const startTime = new Date(todayRecord.punchIn).getTime();
        const nowTime = now.getTime();
        
        // Sum all completed breaks duration
        const completedBreakSeconds = todayRecord.breaks?.reduce((acc, b) => {
          if (b.end) return acc + (b.duration || 0);
          return acc;
        }, 0) || 0;

        const runningBreak = todayRecord.breaks?.find(b => !b.end);
        let netWorkSeconds = 0;

        if (runningBreak) {
          // ⏸️ ON BREAK: Work timer STOPS at break start
          const breakStart = new Date(runningBreak.start).getTime();
          netWorkSeconds = Math.floor((breakStart - startTime) / 1000) - completedBreakSeconds;
          
          // Break timer runs
          const breakDiff = Math.floor((nowTime - breakStart) / 1000);
          setActiveBreakTimer(formatDuration(breakDiff > 0 ? breakDiff : 0));
        } else if (!todayRecord.punchOut) {
          // ▶️ WORKING: Work timer runs
          netWorkSeconds = Math.floor((nowTime - startTime) / 1000) - completedBreakSeconds;
          setActiveBreakTimer("00:00:00");
        } else {
          // ⏹️ PUNCHED OUT: Use final work seconds from record
          netWorkSeconds = todayRecord.totalWorkSeconds;
          setActiveBreakTimer("00:00:00");
        }

        const safeWorkSeconds = netWorkSeconds > 0 ? netWorkSeconds : 0;
        setActiveWorkTimer(formatDuration(safeWorkSeconds));
        
        // Calculate Progress (628 is the circumference for r=100)
        const progress = Math.min((safeWorkSeconds / WORK_GOAL_SECONDS) * 100, 100);
        setWorkProgress(progress);

      } else {
        setActiveWorkTimer("00:00:00");
        setActiveBreakTimer("00:00:00");
        setWorkProgress(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [todayRecord]);

  /* ================= ACTIONS ================= */

  const handleAction = async (type: string) => {
    try {
      setActionLoading(true);
      await api.post(`/attendance/${type}`);
      toast({
        title: "Success",
        description: `${type.replace(/[\/-]/g, " ").toUpperCase()} recorded.`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.response?.data?.message || "Error performing action.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader />;

  const isPunchedIn = !!todayRecord?.punchIn;
  const isPunchedOut = !!todayRecord?.punchOut;
  const isOnBreak = !!todayRecord?.breaks?.find(b => !b.end);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Attendance</h1>
            <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
             <Clock className="text-indigo-600" size={20} />
             <span className="text-2xl font-black font-mono tracking-tighter">
               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ================= LEFT PANEL: TIMESHEET ================= */}
          <div className="space-y-8">
            <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-6 pb-0 text-center">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timesheet</CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center">
                
                {/* Timer Circle */}
                <div className="relative w-56 h-56 flex items-center justify-center">
                   <svg className="w-full h-full -rotate-90">
                      <circle 
                        cx="112" cy="112" r="100" 
                        fill="transparent" 
                        stroke="#F1F5F9" 
                        strokeWidth="10" 
                      />
                      <motion.circle 
                        cx="112" cy="112" r="100" 
                        fill="transparent" 
                        stroke="#4F46E5" 
                        strokeWidth="10" 
                        strokeDasharray="628"
                        initial={{ strokeDashoffset: 628 }}
                        animate={{ strokeDashoffset: 628 - (628 * workProgress) / 100 }}
                        strokeLinecap="round"
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                      <span className={`text-4xl font-black font-mono tracking-tighter ${isOnBreak ? 'text-slate-400' : 'text-slate-800'}`}>
                        {activeWorkTimer}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Work Hours</span>
                      <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                        {Math.round(workProgress)}% Goal
                      </span>
                   </div>
                </div>

                {/* Status Badge */}
                <div className="mt-8 mb-6">
                  {isPunchedOut ? (
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100">
                      <CheckCircle2 size={12} /> Shift Completed
                    </div>
                  ) : isOnBreak ? (
                    <div className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-amber-100">
                      <Coffee size={12} className="animate-bounce" /> On Break
                    </div>
                  ) : isPunchedIn ? (
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-100 animate-pulse">
                      <Timer size={12} /> Session Active
                    </div>
                  ) : (
                    <div className="bg-slate-50 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-100">
                      <AlertCircle size={12} /> Not Started
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="w-full space-y-3">
                   {!isPunchedIn ? (
                     <Button 
                       onClick={() => handleAction("punch-in")}
                       disabled={actionLoading}
                       className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold h-14 rounded-2xl shadow-lg shadow-indigo-100"
                     >
                       <LogIn className="mr-2" size={18} /> Punch In
                     </Button>
                   ) : !isPunchedOut ? (
                     <div className="grid grid-cols-2 gap-2">
                        {isOnBreak ? (
                          <Button 
                            onClick={() => handleAction("break/end")}
                            disabled={actionLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black h-14 rounded-2xl shadow-md text-[11px] px-1"
                          >
                             <Play className="mr-1 shrink-0" size={14} /> End Break
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleAction("break/start")}
                            disabled={actionLoading}
                            className="bg-amber-400 hover:bg-amber-500 text-white font-black h-14 rounded-2xl shadow-md text-[11px] px-1"
                          >
                             <Coffee className="mr-1 shrink-0" size={14} /> Break
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleAction("punch-out")}
                          disabled={actionLoading || isOnBreak}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black h-14 rounded-2xl shadow-md text-[11px] px-1"
                        >
                           <LogOut className="mr-1 shrink-0" size={14} /> Punch Out
                        </Button>
                     </div>
                   ) : (
                     <Button disabled className="w-full bg-slate-100 text-slate-400 font-extrabold h-14 rounded-2xl">
                        Done for Today
                     </Button>
                   )}
                </div>

                {/* Break Timer Display */}
                {isOnBreak && (
                   <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-1">Active Break Duration</p>
                      <p className="text-2xl font-black font-mono text-amber-600">{activeBreakTimer}</p>
                   </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Stats Card */}
            <Card className="border-0 shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden p-6 relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                     <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Break Time</span>
                     <span className="font-mono font-black text-amber-400">{todayRecord ? formatDuration(todayRecord.totalBreakSeconds) : "00:00:00"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Punch In Time</span>
                     <span className="font-mono font-black">{todayRecord?.punchIn ? new Date(todayRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                  </div>
               </div>
            </Card>
          </div>

          {/* ================= RIGHT PANEL: HISTORY ================= */}
          <div className="lg:col-span-2 space-y-6">
             <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                   <CardTitle className="text-lg font-bold">Attendance History</CardTitle>
                   <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50">View More</Button>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-center">In</th>
                            <th className="p-4 text-center">Out</th>
                            <th className="p-4 text-center">Break</th>
                            <th className="p-4 text-center">Work</th>
                            <th className="p-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {history.length > 0 ? history.map((log) => (
                            <tr key={log._id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-4 font-bold text-slate-700">{log.date}</td>
                              <td className="p-4 text-center font-medium text-slate-600">
                                {log.punchIn ? new Date(log.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                              </td>
                              <td className="p-4 text-center font-medium text-slate-600">
                                {log.punchOut ? new Date(log.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                              </td>
                              <td className="p-4 text-center font-bold text-amber-500">{formatDuration(log.totalBreakSeconds)}</td>
                              <td className="p-4 text-center font-black text-indigo-600 font-mono tracking-tighter">{formatDuration(log.totalWorkSeconds)}</td>
                              <td className="p-4 text-center">
                                 <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                   log.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                 }`}>
                                   {log.status}
                                 </span>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic">
                                No records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
