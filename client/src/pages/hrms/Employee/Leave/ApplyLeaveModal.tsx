/** @format */
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "@/pages/Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

interface LeaveType {
  _id: string;
  name: string;
  maxDays: number;
}

const ApplyLeaveModal = ({ open, onClose, data, onSuccess }: any) => {
  const token = localStorage.getItem("token");

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [remainingLeaves, setRemainingLeaves] = useState(0);
  const [requestedDays, setRequestedDays] = useState(0);

  const formatDateForInput = (date: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const [form, setForm] = useState({
    leaveType: data?.leaveType || "",
    fromDate: data?.fromDate ? formatDateForInput(data.fromDate) : "",
    toDate: data?.toDate ? formatDateForInput(data.toDate) : "",
    reason: data?.reason || "",
  });

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (open) {
      fetchLeaveTypes();
      fetchBalances();
    }
  }, [open]);

  const fetchLeaveTypes = async () => {
    const res = await axios.get(`${API_BASE}/leave-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLeaveTypes(res.data || []);
  };

  const fetchBalances = async () => {
    const res = await axios.get(`${API_BASE}/leave-balance-adjustments/my-balances`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLeaveBalances(res.data || []);
  };

  /* ================= CALCULATIONS ================= */

  // update remaining leaves based on selection
  useEffect(() => {
    if (!form.leaveType) {
      setRemainingLeaves(0);
      return;
    }

    const currentType = leaveBalances.find((lb) => lb.leaveType === form.leaveType);
    setRemainingLeaves(currentType ? currentType.balance : 0);
  }, [form.leaveType, leaveBalances]);

  // calculate requested days
  useEffect(() => {
    if (!form.fromDate || !form.toDate) {
      setRequestedDays(0);
      return;
    }

    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);

    const diff =
      Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    setRequestedDays(diff > 0 ? diff : 0);
  }, [form.fromDate, form.toDate]);

  /* ================= SUBMIT ================= */

  const submit = async () => {
    try {
      if (data) {
        const res = await axios.put(
          `${API_BASE}/leaves/${data._id}`,
          form,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        toast({
          type: "success",
          title: "Leave Updated",
          message: res.data?.message || "Leave request updated successfully",
        });
      } else {
        const res = await axios.post(
          `${API_BASE}/leaves`,
          {
            ...form,
            status: "PENDING",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        toast({
          type: "success",
          title: "Leave Applied",
          message: res.data?.message || "Leave request submitted successfully",
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Action Failed",
        message:
          error?.response?.data?.message ||
          "Unable to submit leave request. Please try again.",
      });
      console.error("Leave submit failed", error);
    }
  };


  if (!open) return null;

  const isInvalid = requestedDays === 0 || requestedDays > remainingLeaves;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-5">
          {data ? "View / Edit Leave Request" : "Apply Leave"}
        </h3>

        <div className="space-y-4">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt.name}>
                  {lt.name} ({lt.maxDays} days)
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2 text-sm"
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2 text-sm"
              value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            />
          </div>

          {/* Remaining */}
          <div className="flex justify-between text-sm">
            <span>
              Remaining: <strong>{remainingLeaves}</strong> day(s)
            </span>
            <span>
              Requested: <strong>{requestedDays}</strong> day(s)
            </span>
          </div>

          {isInvalid && form.leaveType && (
            <p className="text-xs text-red-600">
              Requested leave exceeds remaining balance
            </p>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md"
          >
            Cancel
          </button>

          <button
            disabled={isInvalid}
            onClick={submit}
            className={`px-4 py-2 rounded-md text-sm text-white ${isInvalid ? "bg-gray-400 cursor-not-allowed" : "bg-primary"
              }`}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
