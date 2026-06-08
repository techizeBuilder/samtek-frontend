/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";

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
  const [managers, setManagers] = useState<any[]>([]);
  // Derived from selected company — no separate API call needed
  const [selectedCompanyUnit, setSelectedCompanyUnit] = useState<string>("");

  const initialForm = {
    companyId: "",
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
      .then((r) => {
        const comps = r.data?.companies || [];
        setCompanies(comps);
      })
      .catch(() => setCompanies([]));

    axios
      .get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        const users = Array.isArray(r.data?.users) ? r.data.users : [];
        const onlyManagers = users.filter(
          (user: any) => user.role?.toLowerCase() === "manager"
        );
        setManagers(onlyManagers);
      })
      .catch(() => setManagers([]));
  }, []);

  /* =========================
     UPDATE UNIT WHEN COMPANY CHANGES
  ==========================*/
  useEffect(() => {
    if (!form.companyId) {
      setSelectedCompanyUnit("");
      return;
    }
    const selected = companies.find((c) => c._id === form.companyId);
    setSelectedCompanyUnit(selected?.unitName || selected?.name || "");
  }, [form.companyId, companies]);

  /* =========================
     RESET ON ADD
  ==========================*/
  useEffect(() => {
    if (mode === "add" && isOpen) {
      setForm(initialForm);
      setSelectedCompanyUnit("");
      setErrors({});
    }
  }, [mode, isOpen]);

  /* =========================
     POPULATE FORM ON EDIT / VIEW
  ==========================*/
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && department) {
      const companyId =
        department.companyId?._id || department.companyId || "";

      setForm({
        companyId,
        name: department.name || "",
        headEmployeeId: department.headEmployeeId?._id || "",
        status: department.status || "Active",
      });
      setErrors({});

      // Set unit label from populated companyId or find in list
      const unitName =
        department.companyId?.unitName ||
        department.companyId?.name ||
        companies.find((c) => c._id === companyId)?.unitName ||
        "";
      setSelectedCompanyUnit(unitName);
    }
  }, [mode, department, companies]);

  /* =========================
     VALIDATION
  ==========================*/
  const validate = () => {
    const newErrors: any = {};
    if (!form.companyId) newErrors.companyId = "Company is required";
    if (!form.name.trim()) newErrors.name = "Department name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* =========================
     SAVE
  ==========================*/
  const save = async () => {
    if (!validate()) return;

    const payload = {
      companyId: form.companyId,
      name: form.name,
      headEmployeeId: form.headEmployeeId || null,
      status: form.status,
      // branchId not required — backend handles it as optional
    };

    try {
      if (mode === "add") {
        const res = await axios.post(`${API_BASE}/departments`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast({
          type: "success",
          title: "Department Created",
          message: res.data?.message || "Department created successfully.",
        });
      }

      if (mode === "edit" && department) {
        const res = await axios.put(
          `${API_BASE}/departments/${department._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({
          type: "success",
          title: "Department Updated",
          message: res.data?.message || "Department updated successfully.",
        });
      }

      handleClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Operation Failed",
        message:
          error?.response?.data?.message ||
          (mode === "add"
            ? "Unable to create department. Please try again."
            : "Unable to update department. Please try again."),
      });
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setSelectedCompanyUnit("");
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
                setForm({ ...form, companyId: e.target.value })
              }
              className={`w-full border px-3 py-2 rounded ${
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
              <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>
            )}
          </div>

          {/* Unit — auto-derived from Company, display only */}
          <div>
            <label className="block mb-1">Unit</label>
            <input
              readOnly
              value={selectedCompanyUnit || (form.companyId ? "—" : "")}
              placeholder="Select a company first"
              className="w-full border px-3 py-2 rounded bg-gray-50 text-gray-600 cursor-default"
            />
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
            <label className="block mb-1">Department Head</label>
            <select
              disabled={disabled}
              value={form.headEmployeeId}
              onChange={(e) =>
                setForm({ ...form, headEmployeeId: e.target.value })
              }
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select Manager</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullName || m.name || m.username}
                </option>
              ))}
            </select>
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
