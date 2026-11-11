/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

export interface RoleDepartment {
  name: string;
  roles: string[];
  exists: boolean;
}

interface Props {
  isOpen: boolean;
  /** Departments this company doesn't have yet. */
  missing: RoleDepartment[];
  onClose: () => void;
  onAdded: () => void;
}

// Departments from roles (2026-11-06): for a company that already had
// departments, so it was left alone by the automatic seed. All ticked; the admin
// unticks any they don't want, such as one they already have under another name.
export default function DepartmentsFromRolesModal({ isOpen, missing, onClose, onAdded }: Props) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setTicked(new Set(missing.map((d) => d.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (name: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const add = async () => {
    try {
      setSaving(true);
      const res = await axios.post(
        `${API_BASE}/departments/from-roles`,
        { names: [...ticked] },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      const count = res.data?.added?.length || 0;
      toast({
        type: "success",
        title: "Departments Added",
        message: `${count} department${count === 1 ? "" : "s"} added.`,
      });
      onAdded();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Failed",
        message: error?.response?.data?.message || "Unable to add departments. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Add Departments from Roles</h2>
        <p className="text-sm text-gray-500 mb-4">
          These match your roles and aren't in your list yet. Untick any you don't want.
        </p>

        <div className="max-h-80 overflow-y-auto border rounded divide-y">
          {missing.map((d) => (
            <label key={d.name} className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                className="mt-1"
                checked={ticked.has(d.name)}
                onChange={() => toggle(d.name)}
              />
              <span>
                <span className="block text-sm font-medium">{d.name}</span>
                <span className="block text-xs text-gray-500">{d.roles.join(", ")}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Close
          </button>
          <button
            onClick={add}
            disabled={saving || ticked.size === 0}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Adding..." : `Add ${ticked.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
