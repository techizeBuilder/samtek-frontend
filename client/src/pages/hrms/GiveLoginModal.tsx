/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "@/pages/Alert/Toast";
import { getDefaultModulesForRole } from "@/lib/roleModulesConfig";
import {
  HRMS_ROLES,
  DEPARTMENT_HEAD_ROLES,
  roleValue,
  roleLabel,
  usesModulePermissionsGrid,
} from "./loginRoles";

const API = import.meta.env.VITE_API_URL;

interface Props {
  isOpen: boolean;
  userId: string;
  name: string;
  currentEmail?: string;
  onClose: () => void;
  onDone: () => void;
}

// A worker promoted to staff (2026-11-06). The same record, so department,
// documents, attendance and history stay with them. Permissions start from the
// role's defaults, as on Add Employee, and can be adjusted on Roles & Permissions.
export default function GiveLoginModal({ isOpen, userId, name, currentEmail, onClose, onDone }: Props) {
  const token = localStorage.getItem("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [customRoles, setCustomRoles] = useState<{ _id: string; name: string; isBuiltIn: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setEmail(currentEmail || "");
    setPassword("");
    setRole("");
    setError("");
    axios
      .get(`${API}/admin-settings/roles`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCustomRoles((res.data?.data || []).filter((r: any) => !r.isBuiltIn)))
      .catch(() => setCustomRoles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const save = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!role) return setError("Pick a role.");
    try {
      setSaving(true);
      setError("");
      await axios.post(
        `${API}/users/${userId}/give-login`,
        {
          email: email.trim(),
          password,
          role,
          ...(usesModulePermissionsGrid(role)
            ? { permissions: { role, canAccessAllUnits: false, modules: getDefaultModulesForRole(role) } }
            : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ type: "success", title: "Login Given", message: `${name} can now sign in with this email.` });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not give this person a login.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Give Login: {name}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Their department, documents, attendance and history stay as they are.
        </p>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Role <span className="text-red-500">*</span></label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border px-3 py-2 rounded">
              <option value="">Select Role</option>
              <optgroup label="Employee Roles">
                {HRMS_ROLES.map((r) => (
                  <option key={roleValue(r)} value={roleValue(r)}>{roleLabel(r)}</option>
                ))}
              </optgroup>
              <optgroup label="Department Heads">
                {DEPARTMENT_HEAD_ROLES.map((r) => (
                  <option key={roleValue(r)} value={roleValue(r)}>{roleLabel(r)}</option>
                ))}
              </optgroup>
              {customRoles.length > 0 && (
                <optgroup label="Custom Roles">
                  {customRoles.map((r) => (
                    <option key={r._id} value={r.name}>{r.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2 rounded">Close</button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Give Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
