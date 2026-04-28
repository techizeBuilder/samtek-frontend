/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface ShiftRow {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  shift: "MORNING" | "EVENING" | "NIGHT";
  createdAt: string;
}

export default function ShiftSchedule() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchMyShifts();
  }, []);

  const fetchMyShifts = async () => {
    try {
      /**
       * Employee apni hi shifts dekhe
       * Backend week API use kar rahe hain
       * Current week ke liye
       */
      const monday = getCurrentWeekMonday();

      const res = await axios.get(`${API_BASE}/shifts/week?start=${monday}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // sirf logged-in employee ki shifts
      const myShifts = res.data.filter(
        (item: ShiftRow) => item.userId === user._id
      );

      setShifts(myShifts);
    } catch (error) {
      console.error("Failed to load shifts", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeekMonday = () => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const shiftBadge = (shift: string) => {
    switch (shift) {
      case "MORNING":
        return <Badge className="bg-green-600">Morning</Badge>;
      case "EVENING":
        return <Badge className="bg-orange-500">Evening</Badge>;
      case "NIGHT":
        return <Badge className="bg-indigo-600">Night</Badge>;
      default:
        return <Badge>NA</Badge>;
    }
  };
  if(loading)return<Loader/>;
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Card className="shadow-xl rounded-2xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            My Shift Schedule
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-semibold">{user.name}</span>
          </p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center py-6 text-muted-foreground">
              Loading shifts...
            </p>
          ) : shifts.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              No shifts assigned yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3 text-sm font-semibold">Sr. No</th>
                    <th className="p-3 text-sm font-semibold">Shift Date</th>
                    <th className="p-3 text-sm font-semibold">Shift</th>
                    <th className="p-3 text-sm font-semibold">Assigned On</th>
                  </tr>
                </thead>

                <tbody>
                  {shifts.map((row, index) => (
                    <tr
                      key={row._id}
                      className="border-b hover:bg-muted/50 transition"
                    >
                      <td className="p-3">{index + 1}</td>

                      <td className="p-3">
                        {new Date(row.date).toLocaleDateString()}
                      </td>

                      <td className="p-3">{shiftBadge(row.shift)}</td>

                      <td className="p-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
