/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

export interface Company {
  _id: string;
  name: string;
}

export interface Branch {
  _id: string;
  companyId: string | { _id: string; name: string };
  companyName?: string;
  name: string;
  code?: string;
  city: string;
  state: string;
  country: string;
  address?: string;
  pincode?: string;
  status: "Active" | "Inactive";
  createdAt: string;
}


interface Props {
  isOpen: boolean;
  mode: "add" | "view" | "edit";
  branch: Branch | null;
  onClose: () => void;
}

export default function BranchModal({ isOpen, mode, branch, onClose }: Props) {
  const token = localStorage.getItem("token");

  const [companies, setCompanies] = useState<Company[]>([]);

  const [form, setForm] = useState({
    companyId: "",
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    pincode: "",
    status: "Active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ================= FETCH COMPANIES ================= */
  const fetchCompanies = async () => {
    const res = await axios.get(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCompanies(res.data?.companies || []);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  /* ================= RESET / FILL FORM ================= */
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "add") {
      setForm({
        companyId: "",
        name: "",
        code: "",
        city: "",
        state: "",
        country: "India",
        address: "",
        pincode: "",
        status: "Active",
      });
      setErrors({});
    }

    if ((mode === "edit" || mode === "view") && branch) {
      setForm({
        companyId:
  typeof branch.companyId === "string"
    ? branch.companyId
    : branch.companyId?._id || "",
        name: branch.name,
        code: branch.code || "",
        city: branch.city,
        state: branch.state,
        country: branch.country,
        address: branch.address || "",
        pincode: branch.pincode || "",
        status: branch.status,
      });
      setErrors({});
    }
  }, [isOpen, mode, branch,companies]);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.companyId) newErrors.companyId = "Company is required";

    if (!form.name.trim()) newErrors.name = "Branch name is required";

    if (!form.code.trim()) newErrors.code = "Branch code is required";

    if (!form.city.trim()) newErrors.city = "City is required";

    if (!form.state.trim()) newErrors.state = "State is required";

    if (!form.country.trim()) newErrors.country = "Country is required";

    if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";

    if (!form.address.trim()) newErrors.address = "Address is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async () => {
  if (mode === "view") return;
  if (!validateForm()) return;

  try {
    if (mode === "add") {
      const res = await axios.post(`${API_BASE}/branches`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Branch Created",
        message: res.data?.message || "Branch created successfully",
      });
    }

    if (mode === "edit" && branch) {
      const res = await axios.put(`${API_BASE}/branches/${branch._id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Branch Updated",
        message: res.data?.message || "Branch updated successfully",
      });
    }

    onClose();
  } catch (error: any) {
    toast({
      type: "error",
      title: "Operation Failed",
      message:
        error?.response?.data?.message ||
        (mode === "add"
          ? "Unable to create branch. Please try again."
          : "Unable to update branch. Please try again."),
    });
  }
};


  if (!isOpen) return null;

  const disabled = mode === "view";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold capitalize">{mode} Branch</h2>
        </div>

        {/* BODY */}
        <div className="p-6 grid grid-cols-2 gap-4 text-sm overflow-y-auto">
          {/* COMPANY */}
          <div className="col-span-2">
            <label className="block mb-1 font-medium">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={form.companyId}
              onChange={(e) => {
                setForm({ ...form, companyId: e.target.value });
                setErrors({ ...errors, companyId: "" });
              }}
              className={`w-full border rounded px-3 py-2 ${
                errors.companyId ? "border-red-500" : ""
              }`}
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>
            )}
          </div>

          {[
            ["Branch Name", "name"],
            ["Branch Code", "code"],
            ["City", "city"],
            ["State", "state"],
            ["Country", "country"],
            ["Pincode", "pincode"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block mb-1 font-medium">
                {label} <span className="text-red-500">*</span>
              </label>
              <input
                disabled={disabled}
                value={(form as any)[key]}
                onChange={(e) => {
                  setForm({ ...form, [key]: e.target.value });
                  setErrors({ ...errors, [key]: "" });
                }}
                className={`w-full border rounded px-3 py-2 ${
                  errors[key] ? "border-red-500" : ""
                }`}
              />
              {errors[key] && (
                <p className="text-xs text-red-500 mt-1">{errors[key]}</p>
              )}
            </div>
          ))}

          <div className="col-span-2">
            <label className="block mb-1 font-medium">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              disabled={disabled}
              value={form.address}
              onChange={(e) => {
                setForm({ ...form, address: e.target.value });
                setErrors({ ...errors, address: "" });
              }}
              className={`w-full border rounded px-3 py-2 ${
                errors.address ? "border-red-500" : ""
              }`}
              rows={3}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium">Status</label>
            <select
              disabled={disabled}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Close
          </button>

          {mode !== "view" && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-orange-500 text-white rounded"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
