/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import GoalModal from "./GoalModal";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

const EmployeeGoals = () => {
  const token = localStorage.getItem("token");

  const [goals, setGoals] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loading,setLoading]=useState(true);

  /* ================= FETCH GOALS ================= */
  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API_BASE}/goals/my-assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoals(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch goals");
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  /* ================= HELPERS ================= */
  const statusColor = (status: string) => {
    if (status === "COMPLETED") return "bg-green-100 text-green-700";
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-700";
    if (status === "OVERDUE") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const priorityColor = (p: string) => {
    if (p === "HIGH") return "text-red-600";
    if (p === "MEDIUM") return "text-yellow-600";
    return "text-green-600";
  };
  if(loading)return<Loader/>;
  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">My Goals</h2>
          <p className="text-sm text-gray-500">HRMS / Performance / My Goals</p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Goals", value: goals.length },
          {
            label: "Completed",
            value: goals.filter((g) => g.status === "COMPLETED").length,
          },
          {
            label: "In Progress",
            value: goals.filter((g) => g.status === "IN_PROGRESS").length,
          },
          {
            label: "Overdue",
            value: goals.filter((g) => g.status === "OVERDUE").length,
          },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-semibold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* GOALS GRID */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => (
          <div
            key={g._id}
            className="bg-white rounded-2xl shadow border p-5 flex flex-col"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{g.title}</h3>
              <span
                className={`text-xs font-semibold ${priorityColor(g.priority)}`}
              >
                {g.priority}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {g.description}
            </p>

            <div className="text-xs text-gray-500 mb-3">
              Category: <span className="font-medium">{g.category}</span>
            </div>

            {/* PROGRESS */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{g.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${g.progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-auto">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(
                  g.status
                )}`}
              >
                {g.status}
              </span>

              <button
                onClick={() => {
                  setSelected(g);
                  setOpen(true);
                }}
                className="text-primary text-xs"
              >
                View / Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {goals.length === 0 && (
        <p className="text-center text-gray-500 mt-10">No goals assigned yet</p>
      )}

      {/* MODAL */}
      {open && (
        <GoalModal
          open={open}
          data={selected}
          onClose={() => setOpen(false)}
          onSuccess={fetchGoals}
        />
      )}
    </div>
  );
};

export default EmployeeGoals;
