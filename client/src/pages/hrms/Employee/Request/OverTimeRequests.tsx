/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";
import {
  MoreVertical,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Clock,
  X,
} from "lucide-react";

/* ================= TYPES ================= */

interface Overtime {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  hours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/* ================= COMPONENT ================= */

export default function EmployeeOvertimeRequest() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overtime[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [viewItem, setViewItem] = useState<Overtime | null>(null);
  const [editItem, setEditItem] = useState<Overtime | null>(null);
  const [deleteItem, setDeleteItem] = useState<Overtime | null>(null);

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [errors, setErrors] = useState<any>({});

  /* ================= FETCH ================= */

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const API = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${API}/overtime/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = res.data;
      setData(Array.isArray(raw) ? raw : raw?.data ?? raw?.overtimes ?? []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= VALIDATION ================= */

  const validate = () => {
    const newErrors: any = {};

    if (!form.date) newErrors.date = "Date is required";
    if (!form.startTime) newErrors.startTime = "Start time is required";
    if (!form.endTime) newErrors.endTime = "End time is required";
    if (!form.reason.trim()) newErrors.reason = "Reason is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      let res;

      const token = localStorage.getItem("token");
      const API = import.meta.env.VITE_API_URL;

      if (editItem) {
        res = await axios.patch(`${API}/overtime/${editItem._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${API}/overtime`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast({
        type: "success",
        title: editItem ? "Overtime Updated" : "Overtime Added",
        message:
          res?.data?.message ||
          (editItem
            ? "Overtime updated successfully."
            : "Overtime added successfully."),
      });

      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Action Failed",
        message:
          err?.response?.data?.message ||
          "Unable to save overtime. Please try again.",
      });
      console.error(err);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const token = localStorage.getItem("token");
      const API = import.meta.env.VITE_API_URL;
      const res = await axios.delete(`${API}/overtime/${deleteItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Overtime Deleted",
        message: res?.data?.message || "Overtime deleted successfully.",
      });

      setDeleteOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message:
          err?.response?.data?.message ||
          "Unable to delete overtime. Please try again.",
      });
      console.error(err);
    }
  };

  /* ================= UI ================= */

  if (loading) return <Loader />;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock size={20} /> Overtime Requests
        </h2>

        <button
          onClick={() => {
            setForm({ date: "", startTime: "", endTime: "", reason: "" });
            setErrors({});
            setEditItem(null);
            setViewItem(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Add Overtime Request
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Time</th>
              <th className="p-4 text-left">Hours</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) && data.map((item) => (
              <tr key={item._id} className="border-t text-sm">
                <td className="p-4">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {item.startTime} - {item.endTime}
                </td>
                <td className="p-4">{item.hours} hrs</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : item.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                  >
                    {item.status}
                  </span>
                </td>

                {/* ACTION */}
                <td className="p-4 text-right">
                  <div className="relative inline-block">
                    <MoreVertical
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenMenuId(openMenuId === item._id ? null : item._id)
                      }
                    />

                    {openMenuId === item._id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-20">
                        <button
                          onClick={() => {
                            setViewItem(item);
                            setEditItem(null);
                            setForm({
                              date: item.date.split("T")[0],
                              startTime: item.startTime,
                              endTime: item.endTime,
                              reason: item.reason,
                            });
                            setOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          <Eye size={14} /> View
                        </button>

                        <button
                          onClick={() => {
                            setEditItem(item);
                            setViewItem(null);
                            setForm({
                              date: item.date.split("T")[0],
                              startTime: item.startTime,
                              endTime: item.endTime,
                              reason: item.reason,
                            });
                            setOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          <Pencil size={14} /> Edit
                        </button>

                        <button
                          onClick={() => {
                            setDeleteItem(item);
                            setDeleteOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT / VIEW MODAL */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-[500px] rounded-xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <X
              className="absolute right-4 top-4 cursor-pointer"
              onClick={() => setOpen(false)}
            />

            <h3 className="text-xl font-bold mb-4">
              {viewItem
                ? "View Overtime Request"
                : editItem
                  ? "Edit Overtime Request"
                  : "Add Overtime Request"}
            </h3>

            {/* DATE */}
            <label className="text-sm font-medium">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              disabled={!!viewItem}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`w-full border p-2 rounded mt-1 ${errors.date ? "border-red-500" : ""
                }`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs">{errors.date}</p>
            )}

            {/* TIME */}
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm font-medium">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  disabled={!!viewItem}
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className={`w-full border p-2 rounded mt-1 ${errors.startTime ? "border-red-500" : ""
                    }`}
                />
                {errors.startTime && (
                  <p className="text-red-500 text-xs">{errors.startTime}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  disabled={!!viewItem}
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className={`w-full border p-2 rounded mt-1 ${errors.endTime ? "border-red-500" : ""
                    }`}
                />
                {errors.endTime && (
                  <p className="text-red-500 text-xs">{errors.endTime}</p>
                )}
              </div>
            </div>

            {/* REASON */}
            <label className="text-sm font-medium mt-3 block">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              disabled={!!viewItem}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={`w-full border p-2 rounded mt-1 ${errors.reason ? "border-red-500" : ""
                }`}
            />
            {errors.reason && (
              <p className="text-red-500 text-xs">{errors.reason}</p>
            )}

            {!viewItem && (
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setOpen(false)}
                  className="border px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-primary text-white px-4 py-2 rounded"
                >
                  {editItem ? "Update" : "Submit"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px]">
            <h3 className="text-lg font-bold mb-4">Delete Overtime Request?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
