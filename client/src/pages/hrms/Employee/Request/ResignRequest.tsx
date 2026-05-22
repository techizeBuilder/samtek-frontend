/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, MoreVertical, Eye, Pencil, Trash2, X } from "lucide-react";
import { toast } from "@/pages/Alert/Toast";
const API = import.meta.env.VITE_API_URL;

/* ---------------- TYPES ---------------- */
interface Resignation {
  _id: string;
  resignationType: string;
  reasonCategory: string;
  reasonText: string;
  expectedLastWorkingDay: string;
  documents?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/* ---------------- COMPONENT ---------------- */
export default function ResignationRequest() {
  const [data, setData] = useState<Resignation[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const [viewItem, setViewItem] = useState<Resignation | null>(null);
  const [editItem, setEditItem] = useState<Resignation | null>(null);
  const [deleteItem, setDeleteItem] = useState<Resignation | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [form, setForm] = useState({
    resignationType: "",
    reasonCategory: "",
    reasonText: "",
    expectedLastWorkingDay: "",
    documents: "",
  });

  /* ---------------- FETCH ---------------- */
  const fetchRequests = async () => {
    const res = await axios.get(`${API}/resignation`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    setData(res.data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

const validate = () => {
  let newErrors: any = {};

  if (!form.resignationType)
    newErrors.resignationType = "Resignation type is required";

  if (!form.reasonCategory)
    newErrors.reasonCategory = "Reason category is required";

  if (!form.reasonText) newErrors.reasonText = "Reason is required";

  if (!form.expectedLastWorkingDay)
    newErrors.expectedLastWorkingDay = "Expected last working day is required";

  setErrors(newErrors);

  return Object.keys(newErrors).length === 0;
};


  /* ---------------- SAVE / UPDATE ---------------- */
const handleSubmit = async () => {
  if (!validate()) return;
  try {
    let res;

    if (editItem) {
      res = await axios.patch(`${API}/resignation/${editItem._id}`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } else {
      res = await axios.post(`${API}/resignation`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    }

    toast({
      type: "success",
      title: editItem ? "Resignation Updated" : "Resignation Submitted",
      message:
        res?.data?.message ||
        (editItem
          ? "Resignation updated successfully."
          : "Resignation submitted successfully."),
    });

    setOpen(false);
    resetState();
    fetchRequests();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Action Failed",
      message:
        error?.response?.data?.message ||
        "Unable to submit resignation. Please try again.",
    });
  }
};

/* ---------------- DELETE ---------------- */
const handleDelete = async () => {
  if (!deleteItem) return;

  try {
    const res = await axios.delete(`${API}/resignation/${deleteItem._id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast({
      type: "success",
      title: "Resignation Deleted",
      message: res?.data?.message || "Resignation deleted successfully.",
    });

    setDeleteOpen(false);
    setDeleteItem(null);
    fetchRequests();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Delete Failed",
      message:
        error?.response?.data?.message ||
        "Unable to delete resignation. Please try again.",
    });
  }
};


  const resetState = () => {
    setForm({
      resignationType: "",
      reasonCategory: "",
      reasonText: "",
      expectedLastWorkingDay: "",
      documents: "",
    });
    setViewItem(null);
    setEditItem(null);
  };
  // const closeModal = () => {
  //   setOpen(false);
  //   setViewItem(null);
  //   setEditItem(null);
  //   setForm({
  //     resignationType: "",
  //     reasonCategory: "",
  //     reasonText: "",
  //     expectedLastWorkingDay: "",
  //     documents: "",
  //   });
  // };


  /* ---------------- UI ---------------- */
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resignation Requests</h1>

        <button
          onClick={() => {
            resetState();
            setOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} />
          Add Request
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="p-4 text-left">Sr</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Reason</th>
              <th className="p-4 text-left">Last Working Day</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, i) => (
              <tr key={item._id} className="border-t text-sm">
                <td className="p-4">{i + 1}</td>
                <td className="p-4">{item.resignationType}</td>
                <td className="p-4">{item.reasonCategory}</td>
                <td className="p-4">
                  {new Date(item.expectedLastWorkingDay).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "PENDING"
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
                <td className="p-4">
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
                              resignationType: item.resignationType,
                              reasonCategory: item.reasonCategory,
                              reasonText: item.reasonText,
                              expectedLastWorkingDay:
                                item.expectedLastWorkingDay.split("T")[0],
                              documents: item.documents || "",
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
                              resignationType: item.resignationType,
                              reasonCategory: item.reasonCategory,
                              reasonText: item.reasonText,
                              expectedLastWorkingDay:
                                item.expectedLastWorkingDay.split("T")[0],
                              documents: item.documents || "",
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

      {/* ADD / VIEW / EDIT MODAL */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4"
            >
              <X />
            </button>

            <h2 className="text-xl font-bold mb-6">
              {viewItem
                ? "View Resignation"
                : editItem
                  ? "Edit Resignation"
                  : "Add Resignation"}
            </h2>

            {/* ================= FORM ================= */}
            <div className="grid grid-cols-1 gap-4">
              {/* Resignation Type */}
              <div>
                <label className="text-sm font-medium">
                  Resignation Type <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!!viewItem}
                  value={form.resignationType}
                  onChange={(e) =>
                    setForm({ ...form, resignationType: e.target.value })
                  }
                  className={`w-full border p-2 rounded ${
                    errors.resignationType ? "border-red-500" : ""
                  }`}
                >
                  <option value="">Select</option>
                  <option value="Voluntary">Voluntary</option>
                  <option value="Medical">Medical</option>
                  <option value="Personal">Personal</option>
                  <option value="Career">Career Growth</option>
                </select>
                {errors.resignationType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.resignationType}
                  </p>
                )}
              </div>

              {/* Reason Category */}
              <div>
                <label className="text-sm font-medium">
                  Reason Category <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!!viewItem}
                  value={form.reasonCategory}
                  onChange={(e) =>
                    setForm({ ...form, reasonCategory: e.target.value })
                  }
                  className={`w-full border p-2 rounded ${
                    errors.reasonCategory ? "border-red-500" : ""
                  }`}
                >
                  <option value="">Select</option>
                  <option value="Salary">Salary</option>
                  <option value="Health">Health</option>
                  <option value="Environment">Work Environment</option>
                  <option value="Other">Other</option>
                </select>
                {errors.reasonCategory && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.reasonCategory}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  disabled={!!viewItem}
                  value={form.reasonText}
                  onChange={(e) =>
                    setForm({ ...form, reasonText: e.target.value })
                  }
                  className={`w-full border p-2 rounded ${
                    errors.reasonText ? "border-red-500" : ""
                  }`}
                />
                {errors.reasonText && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.reasonText}
                  </p>
                )}
              </div>

              {/* Expected Last Working Day */}
              <div>
                <label className="text-sm font-medium">
                  Expected Last Working Day{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={!!viewItem}
                  value={form.expectedLastWorkingDay}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expectedLastWorkingDay: e.target.value,
                    })
                  }
                  className={`w-full border p-2 rounded ${
                    errors.expectedLastWorkingDay ? "border-red-500" : ""
                  }`}
                />
                {errors.expectedLastWorkingDay && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.expectedLastWorkingDay}
                  </p>
                )}
              </div>
            </div>

            {/* ================= ACTION BUTTONS ================= */}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">
              Delete Resignation Request?
            </h3>
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
                className="bg-red-600 text-white px-4 py-2 rounded"
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
