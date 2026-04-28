/** @format */
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "@/pages/Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

const AddTravelRequestModal = ({ open, onClose, data, onSuccess }: any) => {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    purpose: "",
    destination: "",
    fromDate: "",
    toDate: "",
    budget: "",
    remarks: "",
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (data) {
      setForm({
        purpose: data.purpose || "",
        destination: data.destination || "",
        fromDate: data.fromDate
          ? new Date(data.fromDate).toISOString().split("T")[0]
          : "",
        toDate: data.toDate
          ? new Date(data.toDate).toISOString().split("T")[0]
          : "",
        budget: data.budget || "",
        remarks: data.remarks || "",
      });
    }
  }, [data]);

  const validate = () => {
    const newErrors: any = {};

    if (!form.purpose.trim()) newErrors.purpose = "Purpose is required";
    if (!form.destination.trim())
      newErrors.destination = "Destination is required";
    if (!form.fromDate) newErrors.fromDate = "From date is required";
    if (!form.toDate) newErrors.toDate = "To date is required";
    if (!form.budget) newErrors.budget = "Budget is required";
    if (Number(form.budget) <= 0)
      newErrors.budget = "Budget must be greater than 0";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const submit = async () => {
  if (!validate()) return;

  const payload = {
    ...form,
    budget: Number(form.budget),
  };

  try {
    if (data) {
      const res = await axios.put(
        `${API_BASE}/travel-requests/${data._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast({
        type: "success",
        title: "Travel Request Updated",
        message: res?.data?.message || "Travel request updated successfully",
      });
    } else {
      const res = await axios.post(
        `${API_BASE}/travel-requests`,
        { ...payload, status: "PENDING" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({
        type: "success",
        title: "Travel Request Submitted",
        message: res?.data?.message || "Travel request submitted successfully",
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
        "Something went wrong. Please try again.",
    });
    console.error("Travel request submit failed", error);
  }
};


  if (!open) return null;

  const inputClass = (error?: string) =>
    `w-full border rounded p-2 text-sm ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-5">
          {data ? "View / Edit Travel Request" : "Add Travel Request"}
        </h3>

        <div className="space-y-4">
          {/* PURPOSE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Purpose of Travel <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass(errors.purpose)}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
            {errors.purpose && (
              <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>
            )}
          </div>

          {/* DESTINATION */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass(errors.destination)}
              value={form.destination}
              onChange={(e) =>
                setForm({ ...form, destination: e.target.value })
              }
            />
            {errors.destination && (
              <p className="text-xs text-red-500 mt-1">{errors.destination}</p>
            )}
          </div>

          {/* FROM DATE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              From Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputClass(errors.fromDate)}
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
            />
            {errors.fromDate && (
              <p className="text-xs text-red-500 mt-1">{errors.fromDate}</p>
            )}
          </div>

          {/* TO DATE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              To Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputClass(errors.toDate)}
              value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            />
            {errors.toDate && (
              <p className="text-xs text-red-500 mt-1">{errors.toDate}</p>
            )}
          </div>

          {/* BUDGET */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Budget (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={inputClass(errors.budget)}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
            {errors.budget && (
              <p className="text-xs text-red-500 mt-1">{errors.budget}</p>
            )}
          </div>

          {/* REMARKS */}
          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-primary text-white rounded text-sm"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTravelRequestModal;
