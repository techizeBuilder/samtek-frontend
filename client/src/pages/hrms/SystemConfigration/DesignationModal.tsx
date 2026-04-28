/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";
const API_BASE = import.meta.env.VITE_API_URL;

export default function DesignationModal({
  isOpen,
  mode,
  designation,
  onClose,
}: any) {
  const token = localStorage.getItem("token");
  const disabled = mode === "view";

  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const initialForm = {
    companyId: "",
    departmentId: "",
    name: "",
    status: "Active",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<any>({});

  /* =========================
     COMPANIES
  ==========================*/
  useEffect(() => {
    axios
      .get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setCompanies(r.data));
  }, []);

  /* =========================
     DEPARTMENTS ON COMPANY CHANGE
  ==========================*/
  useEffect(() => {
    if (!form.companyId) {
      setDepartments([]);
      setForm((prev) => ({ ...prev, departmentId: "" }));
      return;
    }

    axios
      .get(`${API_BASE}/departments?companyId=${form.companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setDepartments(r.data));
  }, [form.companyId]);

  /* =========================
     RESET ON ADD / OPEN
  ==========================*/
  useEffect(() => {
    if (mode === "add" && isOpen) {
      setForm(initialForm);
      setErrors({});
      setDepartments([]);
    }
  }, [mode, isOpen]);

  /* =========================
     EDIT / VIEW DATA SET
  ==========================*/
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && designation) {
      setForm({
        companyId: designation.companyId?._id || "",
        departmentId: designation.departmentId?._id || "",
        name: designation.name || "",
        status: designation.status || "Active",
      });
      setErrors({});
    }
  }, [mode, designation]);

  /* =========================
     VALIDATION
  ==========================*/
  const validate = () => {
    const newErrors: any = {};

    if (!form.companyId) newErrors.companyId = "Company is required";
    if (!form.name.trim()) newErrors.name = "Designation name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* =========================
     SAVE
  ==========================*/
  const save = async () => {
    if (!validate()) return;

    try {
      if (mode === "add") {
        const res = await axios.post(`${API_BASE}/designations`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast({
          
          title: "Designation Created",
          description: res.data?.message || "Designation created successfully.",
        });
      }

      if (mode === "edit" && designation) {
        const res = await axios.put(
          `${API_BASE}/designations/${designation._id}`,
          form,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        toast({
          
          title: "Designation Updated",
          description: res.data?.message || "Designation updated successfully.",
        });
      }

      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description:
          error?.response?.data?.message ||
          (mode === "add"
            ? "Unable to create designation. Please try again."
            : "Unable to update designation. Please try again."),
      });
    }
  };


  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    setDepartments([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white p-6 rounded w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold mb-4 capitalize">{mode} Designation</h2>

        <div className="grid gap-4 text-sm">
          {/* Company */}
          <div>
            <label className="block mb-1">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={form.companyId}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyId: e.target.value,
                  departmentId: "",
                })
              }
              className={`border px-3 py-2 rounded w-full ${errors.companyId ? "border-red-500" : ""
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
              <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block mb-1">
              Department
            </label>
            <select
              disabled={disabled || !form.companyId}
              value={form.departmentId}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
              className={`border px-3 py-2 rounded w-full ${errors.departmentId ? "border-red-500" : ""
                }`}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <p className="text-red-500 text-xs mt-1">{errors.departmentId}</p>
            )}
          </div>

          {/* Designation Name */}
          <div>
            <label className="block mb-1">
              Designation Name <span className="text-red-500">*</span>
            </label>
            <input
              disabled={disabled}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`border px-3 py-2 rounded w-full ${errors.name ? "border-red-500" : ""
                }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block mb-1">Status</label>
            <select
              disabled={disabled}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border px-3 py-2 rounded w-full"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClose} className="border px-4 py-2 rounded">
            Close
          </button>
          {mode !== "view" && (
            <button
              onClick={save}
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

