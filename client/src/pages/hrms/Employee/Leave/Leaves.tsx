/** @format */
import { useEffect, useState } from "react";
import ApplyLeaveModal from "./ApplyLeaveModal";
import axios from "axios";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";
const Leave = () => {
  const API_BASE = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [leaves, setLeaves] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLeave, setDeleteLeave] = useState<any>(null);
  const [loading,setLoading]=useState(true);

  /* ================= FETCH LEAVES ================= */

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API_BASE}/leaves`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLeaves(res.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
      setLeaves([]);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  /* ================= HELPERS ================= */

  const statusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    if (status === "APPROVED") return `${base} bg-green-100 text-green-700`;
    if (status === "REJECTED") return `${base} bg-red-100 text-red-700`;
    return `${base} bg-yellow-100 text-yellow-700`;
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  /* ================= DELETE ================= */

const confirmDelete = async () => {
  try {
    const res = await axios.delete(
      `${API_BASE}/leaves/${deleteLeave._id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    toast({
      type: "success",
      title: "Leave Deleted",
      message: res.data?.message || "Leave request deleted successfully",
    });

    setDeleteModal(false);
    setDeleteLeave(null);
    fetchLeaves();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Delete Failed",
      message:
        error?.response?.data?.message ||
        "Failed to delete leave request. Please try again.",
    });
    console.error("Failed to delete leave", error);
  }
};

  if(loading)return<Loader/>;
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Leave Requests</h2>
        <button
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm"
        >
          Apply Leave
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 ">Type</th>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Days</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l._id} className="border-t">
                <td className="p-3">{l.leaveType}</td>
                <td className="p-3">{formatDate(l.fromDate)}</td>
                <td className="p-3">{formatDate(l.toDate)}</td>
                <td className="p-3">{l.totalDays}</td>
                <td className="p-3">
                  <span className={statusBadge(l.status)}>{l.status}</span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => {
                      setSelected(l);
                      setOpen(true);
                    }}
                    className="text-primary text-xs"
                  >
                    View / Edit
                  </button>

                  <button
                    onClick={() => {
                      setDeleteLeave(l);
                      setDeleteModal(true);
                    }}
                    className="text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {leaves.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No leave requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= APPLY / EDIT MODAL ================= */}
      {open && (
        <ApplyLeaveModal
          open={open}
          onClose={() => setOpen(false)}
          data={selected}
          onSuccess={fetchLeaves}
        />
      )}

      {/* ================= DELETE MODAL ================= */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Delete Leave Request</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete this leave request?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm border rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;
