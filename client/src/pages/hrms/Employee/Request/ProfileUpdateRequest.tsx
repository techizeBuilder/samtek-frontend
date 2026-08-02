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
  UserCog,
  X,
} from "lucide-react";

/* ================= TYPES ================= */

interface ProfileUpdate {
  _id: string;
  updateType: string;
  newValue: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/* ================= COMPONENT ================= */

export default function ProfileUpdateRequest() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileUpdate[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [viewItem, setViewItem] = useState<ProfileUpdate | null>(null);
  const [editItem, setEditItem] = useState<ProfileUpdate | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProfileUpdate | null>(null);

  const [form, setForm] = useState({
    updateType: "",
    newValue: "",
    reason: "",
  });

  const [errors, setErrors] = useState<any>({});

  /* ================= FETCH ================= */

  const fetchData = async (pageNum: number = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const API = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${API}/profile-updates/me?page=${pageNum}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = res.data;
      setData(Array.isArray(raw) ? raw : raw?.data ?? raw?.profileUpdates ?? []);
      setPagination(raw?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  /* ================= VALIDATION ================= */

  const validate = () => {
    const newErrors: any = {};

    if (!form.updateType) newErrors.updateType = "Update type is required";
    if (!form.newValue.trim()) newErrors.newValue = "New value is required";
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
        res = await axios.patch(`${API}/profile-updates/${editItem._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${API}/profile-updates`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast({
        type: "success",
        title: editItem
          ? "Profile Update Requested"
          : "Profile Update Submitted",
        message:
          res?.data?.message ||
          (editItem
            ? "Profile update request updated successfully."
            : "Profile update request submitted successfully."),
      });

      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Action Failed",
        message:
          err?.response?.data?.message ||
          "Unable to submit profile update. Please try again.",
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
      const res = await axios.delete(`${API}/profile-updates/${deleteItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Request Deleted",
        message:
          res?.data?.message || "Profile update request deleted successfully.",
      });

      setDeleteOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message:
          err?.response?.data?.message ||
          "Unable to delete request. Please try again.",
      });
      console.error(err);
    }
  };

  if (loading) return <Loader />;

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <UserCog size={20} /> Profile Update Requests
        </h2>

        <button
          onClick={() => {
            setForm({ updateType: "", newValue: "", reason: "" });
            setErrors({});
            setEditItem(null);
            setViewItem(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded"
        >
          <Plus size={16} /> Add Profile Update
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">New Value</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {Array.isArray(data) && data.map((item) => (
              <tr key={item._id} className="border-t">
                <td className="p-4">{item.updateType}</td>
                <td className="p-4 truncate max-w-xs">{item.newValue}</td>
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
                              updateType: item.updateType,
                              newValue: item.newValue,
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
                              updateType: item.updateType,
                              newValue: item.newValue,
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

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* ADD / EDIT / VIEW MODAL */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-[500px] rounded p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <X
              className="absolute right-4 top-4 cursor-pointer"
              onClick={() => setOpen(false)}
            />

            <h3 className="text-lg font-semibold mb-4">
              {viewItem
                ? "View Profile Update"
                : editItem
                  ? "Edit Profile Update"
                  : "Add Profile Update"}
            </h3>

            {/* TYPE */}
            <label className="text-sm">
              Update Type <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!!viewItem}
              value={form.updateType}
              onChange={(e) => setForm({ ...form, updateType: e.target.value })}
              className={`w-full border p-2 rounded mt-1 ${errors.updateType ? "border-red-500" : ""
                }`}
            >
              <option value="">Select</option>
              <option value="Address">Address</option>
              <option value="Phone">Phone</option>
              <option value="Bank">Bank Details</option>
              <option value="Emergency">Emergency Contact</option>
              <option value="Other">Other</option>
            </select>
            {errors.updateType && (
              <p className="text-red-500 text-xs">{errors.updateType}</p>
            )}
            {/* NEW VALUE */}
            <label className="text-sm mt-3 block">
              New Value <span className="text-red-500">*</span>
            </label>
            <textarea
              disabled={!!viewItem}
              value={form.newValue}
              onChange={(e) => setForm({ ...form, newValue: e.target.value })}
              className={`w-full border p-2 rounded mt-1 ${errors.newValue ? "border-red-500" : ""
                }`}
            />
            {errors.newValue && (
              <p className="text-red-500 text-xs">{errors.newValue}</p>
            )}

            {/* REASON */}
            <label className="text-sm mt-3 block">
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
              <button
                onClick={handleSubmit}
                className="w-full bg-black text-white py-2 rounded mt-4"
              >
                {editItem ? "Update" : "Submit"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">
              Delete Profile Update Request?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded"
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
