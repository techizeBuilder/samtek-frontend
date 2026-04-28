/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  editData: any | null;
}

const API_BASE = import.meta.env.VITE_API_URL;

const AddLeaveTypeModal = ({ isOpen, onClose, editData }: Props) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [maxDays, setMaxDays] = useState<number>(0);
  const [paid, setPaid] = useState(false);
  const [carryForward, setCarryForward] = useState(false);

  const token = localStorage.getItem("token");

  /* ===== PREFILL ON EDIT ===== */
  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setCode(editData.code);
      setMaxDays(editData.maxDays);
      setPaid(editData.paid);
      setCarryForward(editData.carryForward);
    } else {
      setName("");
      setCode("");
      setMaxDays(0);
      setPaid(false);
      setCarryForward(false);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  /* ===== SUBMIT ===== */
const handleSubmit = async () => {
  try {
    let res;

    if (editData) {
      res = await axios.put(
        `${API_BASE}/leave-types/${editData._id}`,
        { name, code, maxDays, paid, carryForward },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({
        type: "success",
        title: "Leave Type Updated",
        message:
          res.data?.message || "Leave type has been updated successfully.",
      });
    } else {
      res = await axios.post(
        `${API_BASE}/leave-types`,
        { name, code, maxDays, paid, carryForward },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({
        type: "success",
        title: "Leave Type Created",
        message:
          res.data?.message || "Leave type has been created successfully.",
      });
    }

    onClose();
  } catch (err: any) {
    toast({
      type: "error",
      title: "Operation Failed",
      message:
        err?.response?.data?.message ||
        "Unable to save leave type. Please try again.",
    });
  }
};


return (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* BACKDROP */}
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />

    {/* MODAL */}
    <div
      className="relative z-10 bg-white w-full max-w-md rounded-lg p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-semibold mb-6">
        {editData ? "Edit Leave Type" : "Add Leave Type"}
      </h2>

      <div className="space-y-4">
        {/* Leave Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Name
          </label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Code
          </label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        {/* Max Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Days Per Year
          </label>
          <input
            type="number"
            className="w-full border px-3 py-2 rounded"
            value={maxDays}
            onChange={(e) => setMaxDays(Number(e.target.value))}
          />
        </div>

        {/* Paid */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          <label className="text-sm text-gray-700">Paid Leave</label>
        </div>

        {/* Carry Forward */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={carryForward}
            onChange={(e) => setCarryForward(e.target.checked)}
          />
          <label className="text-sm text-gray-700">Allow Carry Forward</label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 border rounded">
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-500 text-white rounded"
        >
          {editData ? "Update" : "Save"}
        </button>
      </div>
    </div>
  </div>
);
};

export default AddLeaveTypeModal;
