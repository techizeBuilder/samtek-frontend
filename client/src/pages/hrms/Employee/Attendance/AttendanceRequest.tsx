/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import AttendanceRequestModal from "./AttendanceRequestModel";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";
const API = import.meta.env.VITE_API_URL;

export default function AttendanceRequest() {
  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  const [requests, setRequests] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ADD" | "EDIT" | "VIEW" | "DELETE">("ADD");
  const [form, setForm] = useState<any>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [loading,setLoading]=useState(true);

  /* ---------- fetch ---------- */
  const fetchRequests = async (pageNum: number = page) => {
    const res = await api.get(`/attendance-requests/me?page=${pageNum}&limit=15`);
    setRequests(res.data?.data || []);
    setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests(page);
  }, [page]);

  /* ---------- open modal ---------- */
  const openModal = (type: any, data?: any) => {
    setMode(type);
    setSelectedId(data?._id || null);
    setForm(data || {});
    setOpen(true);
  };

  /* ---------- submit ---------- */
const submit = async () => {
  try {
    if (mode === "ADD") {
      const res = await api.post("/attendance-requests", form);
      toast({
        type: "success",
        title: "Success",
        message: res.data?.message || "Attendance request added successfully",
      });
    }

    if (mode === "EDIT") {
      const res = await api.put(`/attendance-requests/${selectedId}`, form);
      toast({
        type: "success",
        title: "Success",
        message: res.data?.message || "Attendance request updated successfully",
      });
    }

    if (mode === "DELETE") {
      const res = await api.delete(`/attendance-requests/${selectedId}`);
      toast({
        type: "success",
        title: "Success",
        message: res.data?.message || "Attendance request deleted successfully",
      });
    }

    setOpen(false);
    setSelectedId(null);
    setForm({});
    fetchRequests();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Action Failed",
      message:
        error?.response?.data?.message ||
        "Something went wrong, please try again",
    });
    console.error("Attendance request action failed", error);
  }
};

  if(loading)return<Loader/>;
  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Attendance Requests</h1>

        <button
          onClick={() => openModal("ADD")}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg flex gap-2 items-center"
        >
          <Plus size={16} /> Add Request
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Request Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-gray-500">
                  No attendance requests found
                </td>
              </tr>
            )}

            {requests.map((r, i) => (
              <tr key={r._id} className="border-t">
                <td className="px-4 py-3">{i + 1}</td>

                <td className="px-4 py-3">
                  {new Date(r.date).toLocaleDateString()}
                </td>

                <td className="px-4 py-3 font-medium">{r.type}</td>

                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      r.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : r.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>

                {/* ACTION */}
                <td className="px-4 py-3 relative">
                  <span
                    className="cursor-pointer inline-block"
                    onClick={() =>
                      setOpenMenu(openMenu === r._id ? null : r._id)
                    }
                  >
                    <MoreVertical size={18} />
                  </span>

                  {openMenu === r._id && (
                    <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50 text-left">
                      <button
                        className="w-full px-4 py-2 hover:bg-gray-100 flex gap-2 items-center"
                        onClick={() => {
                          openModal("VIEW", r);
                          setOpenMenu(null);
                        }}
                      >
                        <Eye size={14} /> View
                      </button>

                      {r.status === "PENDING" && (
                        <>
                          <button
                            className="w-full px-4 py-2 hover:bg-gray-100 flex gap-2 items-center"
                            onClick={() => {
                              openModal("EDIT", r);
                              setOpenMenu(null);
                            }}
                          >
                            <Edit size={14} /> Edit
                          </button>

                          <button
                            className="w-full px-4 py-2 text-red-500 hover:bg-red-50 flex gap-2 items-center"
                            onClick={() => {
                              openModal("DELETE", r);
                              setOpenMenu(null);
                            }}
                          >
                            <Trash2 size={14} /> Delete
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

      {/* MODAL */}
      <AttendanceRequestModal
        open={open}
        mode={mode}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
    </div>
  );
}
