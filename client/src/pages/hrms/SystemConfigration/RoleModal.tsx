/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface Role {
  _id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
}

interface Props {
  isOpen: boolean;
  mode: "add" | "view" | "edit";
  role: Role | null;
  onClose: () => void;
}

export default function RoleModal({ isOpen, mode, role, onClose }: Props) {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "Active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "add") {
      setForm({ name: "", description: "", status: "Active" });
      setErrors({});
    }

    if ((mode === "edit" || mode === "view") && role) {
      setForm({
        name: role.name,
        description: role.description || "",
        status: role.status,
      });
      setErrors({});
    }
  }, [isOpen, mode, role]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Role name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (mode === "view") return;
    if (!validate()) return;

    try {
      if (mode === "add") {
        await axios.post(`${API_BASE}/roles`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast({
          type: "success",
          title: "Role Created",
          message: "Role created successfully",
        });
      }

      if (mode === "edit" && role) {
        await axios.put(`${API_BASE}/roles/${role._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast({
          type: "success",
          title: "Role Updated",
          message: "Role updated successfully",
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Operation Failed",
        message: "Something went wrong. Try again.",
      });
    }
  };

  if (!isOpen) return null;
  const disabled = mode === "view";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-lg shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold capitalize">{mode} Role</h2>
        </div>

        {/* BODY */}
        <div className="p-6 grid gap-4 text-sm">
          <div>
            <label className="block mb-1 font-medium">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              disabled={disabled}
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className={`w-full border rounded px-3 py-2 ${
                errors.name ? "border-red-500" : ""
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium">Description</label>
            <textarea
              disabled={disabled}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Status</label>
            <select
              disabled={disabled}
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as any })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
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
