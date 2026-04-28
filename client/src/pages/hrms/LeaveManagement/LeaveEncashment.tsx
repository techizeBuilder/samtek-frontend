/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface LeaveEncashment {
  _id: string;
  employee: {
    _id: string;
    name: string;
    employeeId: string;
  };
  leaveType: string;
  requestedDays: number;
  perDayRate: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestDate: string;
}

const LeaveEncashment = () => {
  const [data, setData] = useState<LeaveEncashment[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/leave-encashment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch requests");
      toast({
        type: "error",
        title: "Fetch Failed",
        message: "Unable to load leave encashment requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ===== STATUS CHANGE ===== */
  const handleStatusChange = async (
    id: string,
    newStatus: "APPROVED" | "REJECTED"
  ) => {
    try {
      await axios.put(
        `${API_BASE}/leave-encashment/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        type: "success",
        title: "Status Updated",
        message: `Request has been ${newStatus.toLowerCase()}.`,
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Update Failed",
        message: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  return (
    <div className="p-6">
      {/* PAGE HEADING */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Leave Encashment Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve employee leave encashment requests
        </p>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto min-h-[400px]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr className="text-left text-sm font-semibold text-gray-700">
              <th className="px-4 py-3 text-center">No.</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Leave Type</th>
              <th className="px-4 py-3">Requested Days</th>
              <th className="px-4 py-3">Rate (₹)</th>
              <th className="px-4 py-3">Amount (₹)</th>
              <th className="px-4 py-3">Request Date</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20">
                  <Loader />
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, index) => (
                <tr key={item._id} className="border-t text-sm hover:bg-gray-50">
                  <td className="px-4 py-3 text-center font-medium text-gray-500">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-orange-500">
                        {item.employee?.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.employee?.employeeId}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">{item.leaveType}</td>

                  <td className="px-4 py-3 text-center">
                    {item.requestedDays} days
                  </td>

                  <td className="px-4 py-3">₹{item.perDayRate}</td>

                  <td className="px-4 py-3 font-semibold text-gray-800">
                    ₹{item.totalAmount}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(item.requestDate).toLocaleDateString("en-GB")}
                  </td>

                  {/* STATUS DROPDOWN */}
                  <td className="px-4 py-3 text-center">
                    {item.status === "PENDING" ? (
                      <select
                        className="border rounded px-2 py-1 text-xs cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
                        defaultValue="PENDING"
                        onChange={(e) =>
                          handleStatusChange(
                            item._id,
                            e.target.value as "APPROVED" | "REJECTED"
                          )
                        }
                      >
                        <option value="PENDING" disabled>
                          Pending
                        </option>
                        <option value="APPROVED">Approve</option>
                        <option value="REJECTED">Reject</option>
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-20 text-center text-gray-500">
                  No leave encashment requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveEncashment;
