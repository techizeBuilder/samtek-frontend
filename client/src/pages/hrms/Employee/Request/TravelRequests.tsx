/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import AddTravelRequestModal from "./AddTravelRequestModal";
import UploadReceiptModal from "./UploadReciptModal";
import { toast } from "@/pages/Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

const TravelRequests = () => {
  const token = localStorage.getItem("token");

  const [requests, setRequests] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [receiptModal, setReceiptModal] = useState<any>(null);


  /* ================= FETCH ================= */
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/travel-requests/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data || []);
    } catch (err) {
      console.error("Failed to fetch travel requests");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ================= DELETE ================= */
const confirmDelete = async () => {
  try {
    const res = await axios.delete(
      `${API_BASE}/travel-requests/${deleteItem._id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    toast({
      type: "success",
      title: "Travel Request Deleted",
      message: res?.data?.message || "Travel request deleted successfully",
    });

    setDeleteItem(null);
    fetchRequests();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Delete Failed",
      message:
        error?.response?.data?.message ||
        "Unable to delete travel request. Please try again.",
    });
    console.error("Delete failed", error);
  }
};


  /* ================= UI HELPERS ================= */
  const statusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    if (status === "APPROVED") return `${base} bg-green-100 text-green-700`;
    if (status === "REJECTED") return `${base} bg-red-100 text-red-700`;
    return `${base} bg-yellow-100 text-yellow-700`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB");

  /* ================= UI ================= */
  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Travel Requests</h2>
          <p className="text-sm text-gray-500">HRMS / Travel / Requests</p>
        </div>

        <button
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm"
        >
          + Add Request
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="min-w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Purpose</th>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="p-3">{r.purpose}</td>
                <td className="p-3">{formatDate(r.fromDate)}</td>
                <td className="p-3">{formatDate(r.toDate)}</td>
                <td className="p-3">{r.destination}</td>
                <td className="p-3">
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </td>
                <td className="p-3 relative">
                  <div className="group inline-block">
                    <button className="px-2 text-xl">⋮</button>
                    <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow z-10 w-28">
                      <button
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => {
                          setSelected(r);
                          setOpen(true);
                        }}
                      >
                        View / Edit
                      </button>
                      {r.status === "APPROVED" && (
                        <button
                          className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                          onClick={() => setReceiptModal(r)}
                        >
                          {r.receiptUrl
                            ? "View Receipt"
                            : "Upload Receipt"}
                        </button>
                      )}
                      <button
                        className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-gray-50"
                        onClick={() => setDeleteItem(r)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}

            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No travel requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {open && (
        <AddTravelRequestModal
          open={open}
          data={selected}
          onClose={() => setOpen(false)}
          onSuccess={fetchRequests}
        />
      )}

      {receiptModal && (
        <UploadReceiptModal
          open={true}
          travel={receiptModal}
          onClose={() => setReceiptModal(null)}
          onSuccess={fetchRequests}
        />
      )}

      {/* DELETE MODAL */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-2">Delete Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this travel request?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm"
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

export default TravelRequests;
