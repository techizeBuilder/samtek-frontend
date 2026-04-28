/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface Props {
  isOpen: boolean;
  mode: "add" | "view" | "edit";
  department: any;
  onClose: () => void;
}

export default function DepartmentModal({
  isOpen,
  mode,
  department,
  onClose,
}: Props) {
  const token = localStorage.getItem("token");
  const disabled = mode === "view";

  const [companies, setCompanies] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const initialForm = {
    companyId: "",
    branchId: "",
    name: "",
    headEmployeeId: "",
    status: "Active",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<any>({});

  /* =========================
     INITIAL API CALLS
  ==========================*/
  useEffect(() => {
    axios
      .get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setCompanies(r.data));

    axios
      .get(`${API_BASE}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setAllBranches(r.data));

    axios
      .get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        const onlyManagers = r.data.filter(
          (user: any) => user.role === "manager"
        );
        setManagers(onlyManagers);
      });
  }, []);

  /* =========================
     RESET ON ADD / CLOSE
  ==========================*/
  useEffect(() => {
    if (mode === "add" && isOpen) {
      setForm(initialForm);
      setErrors({});
    }
  }, [mode, isOpen]);

  /* =========================
     FILTER BRANCHES
  ==========================*/
  useEffect(() => {
    if (!form.companyId) {
      setBranches([]);
      setForm((prev) => ({ ...prev, branchId: "" }));
      return;
    }

    const filtered = allBranches.filter(
      (b) =>
        b.companyId === form.companyId || b.companyId?._id === form.companyId
    );

    setBranches(filtered);
  }, [form.companyId, allBranches]);

  /* =========================
     EDIT / VIEW DATA SET
  ==========================*/
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && department) {
      setForm({
        companyId: department.companyId?._id || department.companyId,
        branchId: department.branchId?._id || department.branchId,
        name: department.name || "",
        headEmployeeId: department.headEmployeeId?._id || "",
        status: department.status || "Active",
      });
      setErrors({});
    }
  }, [mode, department]);

  /* =========================
     VALIDATION
  ==========================*/
  const validate = () => {
    const newErrors: any = {};

    if (!form.companyId) newErrors.companyId = "Company is required";
    if (!form.branchId) newErrors.branchId = "Branch is required";
    if (!form.name.trim()) newErrors.name = "Department name is required";
    // if (!form.headEmployeeId)
    //   newErrors.headEmployeeId = "Department head is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* =========================
     SAVE
  ==========================*/
const save = async () => {
  if (!validate()) return;
const payload = {
  ...form,
  headEmployeeId: form.headEmployeeId || null,
};
  try {
    if (mode === "add") {
     const res = await axios.post(`${API_BASE}/departments`, payload, {
  headers: { Authorization: `Bearer ${token}` },
});

      toast({
        
        title: "Department Created",
        description: res.data?.message || "Department created successfully.",
      });
    }

    if (mode === "edit" && department) {
      const res = await axios.put(
  `${API_BASE}/departments/${department._id}`,
  payload,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

      toast({
        
        title: "Department Updated",
        description: res.data?.message || "Department updated successfully.",
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
          ? "Unable to create department. Please try again."
          : "Unable to update department. Please try again."),
    });
  }
};


  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white p-6 rounded-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 capitalize">
          {mode} Department
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
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
                  branchId: "",
                })
              }
              className={`w-full border px-3 py-2 rounded ${
                errors.companyId ? "border-red-500" : ""
              }`}
            >
              <option value="">Select</option>
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

          {/* Branch */}
          <div>
            <label className="block mb-1">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              disabled={disabled || !form.companyId}
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className={`w-full border px-3 py-2 rounded ${
                errors.branchId ? "border-red-500" : ""
              }`}
            >
              <option value="">Select</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <p className="text-red-500 text-xs mt-1">{errors.branchId}</p>
            )}
          </div>

          {/* Department Name */}
          <div className="col-span-2">
            <label className="block mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              disabled={disabled}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full border px-3 py-2 rounded ${
                errors.name ? "border-red-500" : ""
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Department Head */}
          <div className="col-span-2">
            <label className="block mb-1">
              Department Head 
            </label>
            <select
              disabled={disabled}
              value={form.headEmployeeId}
              onChange={(e) =>
                setForm({ ...form, headEmployeeId: e.target.value })
              }
              className={`w-full border px-3 py-2 rounded ${
                errors.headEmployeeId ? "border-red-500" : ""
              }`}
            >
              <option value="">Select Manager</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.headEmployeeId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.headEmployeeId}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block mb-1">Status</label>
            <select
              disabled={disabled}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border px-3 py-2 rounded"
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

