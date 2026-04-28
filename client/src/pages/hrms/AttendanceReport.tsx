/** @format */

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import Loader from "@/pages/hrms/Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface User {
  _id: string;
  name: string;
  role: string;
}

interface Holiday {
  date: string;
  title: string;
}

interface AttendanceRecord {
  user: User;
  date: string;
  punchIn?: string;
}

const AttendanceReport = () => {
  const today = new Date();
  const [location, setLocation] = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Manual search params parsing since we're using wouter
  const getSearchParam = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  };

  const searchParam = getSearchParam();

  const [searchInput, setSearchInput] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);

  const [loading, setLoading] = useState(false);

  /* ================= DEBOUNCE ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ================= URL PARAM SYNC ================= */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (debouncedSearch) {
      url.searchParams.set("search", debouncedSearch);
    } else {
      url.searchParams.delete("search");
    }
    // Update URL without triggering a full page reload or router conflict
    window.history.replaceState({}, "", url.pathname + url.search);
    setPage(1);
  }, [debouncedSearch]);

  /* ================= FETCH ATTENDANCE ================= */
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${API_BASE}/attendance/all`, {
          params: {
            month,
            year,
            page,
            search: debouncedSearch,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const { users, attendance, totalPages } = res.data;

        setUsers(users || []);
        setAttendance(attendance || []);
        setTotalPages(totalPages || 1);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [month, year, page, debouncedSearch]);

  /* ================= FETCH HOLIDAYS ================= */
  useEffect(() => {
    axios
      .get(`${API_BASE}/holidays`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setHolidays(res.data || []));
  }, []);

  /* ================= DAYS ================= */
  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [month, year],
  );

  const datesArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isSunday = (day: number) => new Date(year, month, day).getDay() === 0;

  const isFutureDate = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day > today.getDate();

  const getHoliday = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    return holidays.find(
      (h) => new Date(h.date).toISOString().split("T")[0] === dateStr,
    );
  };

  /* ================= ATTENDANCE MAP ================= */
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();

    attendance.forEach((a) => {
      map.set(`${a.user._id}_${a.date}`, a);
    });

    return map;
  }, [attendance]);

  const isPresent = (userId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    return !!attendanceMap.get(`${userId}_${dateStr}`)?.punchIn;
  };

  /* ================= MONTH CHANGE ================= */
  const handlePrevMonth = () => {
    setPage(1);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    setPage(1);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  /* ================= LOADER ================= */
  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Report</h1>
            <p className="text-sm text-gray-500">
              Monthly employee attendance overview
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ChevronLeft onClick={handlePrevMonth} className="cursor-pointer" />
            <span className="font-medium">
              {new Date(year, month).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </span>
            <ChevronRight
              onClick={handleNextMonth}
              className="cursor-pointer"
            />
          </div>
        </CardHeader>

        {/* ================= SEARCH ================= */}
        <div className="px-6 pb-4">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search employee..."
            className="w-full md:w-72 h-10 px-3 border rounded-md focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* ================= TABLE ================= */}
        <CardContent className="hidden md:block overflow-x-auto">
          <table className="min-w-max border-collapse border text-sm">
            <thead>
              <tr>
                <th className="border px-3 py-2 sticky left-0 bg-white">
                  Employee
                </th>
                <th className="border px-3 py-2 sticky left-[140px] bg-white">
                  Role
                </th>

                {datesArray.map((day) => {
                  const holiday = getHoliday(day);
                  const sunday = isSunday(day);

                  return (
                    <th
                      key={day}
                      className={`border px-2 py-2 text-xs text-center
                        ${sunday ? "bg-orange-100 text-orange-700" : ""}
                        ${holiday ? "bg-blue-100 text-blue-700" : ""}`}
                    >
                      {holiday ? holiday.title : sunday ? "Off" : day}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="border px-3 py-2 sticky left-0 bg-white font-medium">
                    {user.name}
                  </td>
                  <td className="border px-3 py-2 sticky left-[140px] bg-white">
                    {user.role}
                  </td>

                  {datesArray.map((day) => {
                    if (isFutureDate(day) || isSunday(day) || getHoliday(day)) {
                      return (
                        <td
                          key={day}
                          className="border text-center text-gray-300"
                        >
                          —
                        </td>
                      );
                    }

                    return (
                      <td key={day} className="border text-center">
                        {isPresent(user._id, day) ? (
                          <CheckCircle
                            className="text-green-600 mx-auto"
                            size={18}
                          />
                        ) : (
                          <XCircle className="text-red-500 mx-auto" size={18} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>

        {/* ================= PAGINATION (UNCHANGED) ================= */}
        <div className="flex justify-center gap-2 py-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-md border ${page === i + 1 ? "bg-orange-500 text-white" : "bg-white"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AttendanceReport;

