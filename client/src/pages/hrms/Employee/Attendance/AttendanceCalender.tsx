/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import Loader from "../../Loader";

const API = import.meta.env.VITE_API_URL;

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "LEAVE"
  | "HOLIDAY"
  | "WEEKEND";

interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  punchIn?: string;
  punchOut?: string;
}

interface Holiday {
  date: string;
  name: string;
  isActive:string;
}

export default function AttendanceCalendar() {
  const token = localStorage.getItem("token");

  /* ================= STATE ================= */

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= AXIOS ================= */

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    setLoading(true);

    const month = currentMonth.toISOString().slice(0, 7); // YYYY-MM

    const [attendanceRes, holidayRes] = await Promise.all([
      api.get(`/attendance/me?month=${month}`),
      api.get(`/holidays?month=${month}`),
    ]);

    setAttendance(attendanceRes.data || []);
    setHolidays(holidayRes.data || []);
    setLoading(false);
  };

  /* ================= DATE HELPERS ================= */

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();



  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startWeekDay = firstDay.getDay(); // 0 = Sunday

  const getAttendanceByDate = (date: string) =>
    attendance.find((a) => a.date === date);

  const normalizeDate = (date: string | Date) =>
    new Date(date).toISOString().split("T")[0];
  
  const today = normalizeDate(new Date());


  const isHoliday = (date: string) =>
    holidays.find((h) => normalizeDate(h.date) === date && h.isActive);



  /* ================= STATUS LOGIC ================= */

const getDayStatus = (date: string): AttendanceStatus | null => {
  const d = new Date(date);

  // 👉 FUTURE DATE → kuch bhi mat dikhao
  if (date > today) return null;

  // Sunday
  if (d.getDay() === 0) return "WEEKEND";

  // Holiday
  if (isHoliday(date)) return "HOLIDAY";

  // Attendance
  const record = getAttendanceByDate(date);
  if (!record) return "ABSENT";

  return record.status || "PRESENT";
};



  const statusColor: Record<AttendanceStatus, string> = {
    PRESENT: "bg-green-100 text-green-700",
    ABSENT: "bg-red-100 text-red-700",
    HALF_DAY: "bg-yellow-100 text-yellow-700",
    LEAVE: "bg-blue-100 text-blue-700",
    HOLIDAY: "bg-purple-100 text-purple-700",
    WEEKEND: "bg-gray-100 text-gray-500",
  };

  /* ================= MONTH CHANGE ================= */

  const changeMonth = (step: number) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + step);
    setCurrentMonth(d);
  };

  /* ================= UI ================= */
if(loading) return <Loader/>;
{
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <CalendarDays size={22} /> Attendance Calendar
      </h1>

      {/* ================= MONTH HEADER ================= */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft />
        </button>

        <h2 className="text-lg font-medium">
          {currentMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight />
        </button>
      </div>

      {/* ================= CALENDAR GRID ================= */}
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells */}
          {Array.from({ length: startWeekDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = `${year}-${String(month + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;

            const status = getDayStatus(date);
            const safeStatus = status ?? "WEEKEND";
            const record = getAttendanceByDate(date);

            return (
              <div
                key={date}
                className={`rounded-lg p-2 min-h-[90px] border ${
                  status ? statusColor[safeStatus] : "bg-gray-50 text-gray-400"
                }`}
              >
                <div className="text-sm font-semibold">{day}</div>

                <div className="mt-1 text-xs capitalize">
                  {status ? status.replace("_", " ") : ""}
                </div>

                {record && (
                  <div className="mt-2 text-[11px] space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />{" "}
                      {Math.floor(record.totalWorkSeconds / 3600)}h{" "}
                      {Math.floor((record.totalWorkSeconds % 3600) / 60)}m
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= LEGEND ================= */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle size={14} /> Present
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <XCircle size={14} /> Absent
        </span>
        <span className="text-yellow-600">Half Day</span>
        <span className="text-blue-600">Leave</span>
        <span className="text-purple-600">Holiday</span>
        <span className="text-gray-500">Weekend</span>
      </div>
    </div>
  );
}
}
