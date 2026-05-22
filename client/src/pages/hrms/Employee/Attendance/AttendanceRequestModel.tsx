/** @format */

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  mode: "ADD" | "EDIT" | "VIEW" | "DELETE";
  form: any;
  setForm: any;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AttendanceRequestModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
}: Props) {
  if (!open) return null;

  const disabled = mode === "VIEW" || mode === "DELETE";
  const modalRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<any>({});

  /* ---------- outside click close ---------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  /* ---------- validation ---------- */
  const validate = () => {
    const err: any = {};
    if (!form.date) err.date = "Date is required";
    if (!form.type) err.type = "Request type is required";
    if (!form.punchIn) err.punchIn = "Punch In is required";
    if (!form.punchOut) err.punchOut = "Punch Out is required";
    if (!form.reason) err.reason = "Reason is required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (mode !== "DELETE" && !validate()) return;
    onSubmit();
  };

  const border = (f: string) =>
    errors[f] ? "border-red-500" : "border-gray-300";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500"
        >
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {mode === "ADD" && "Add Attendance Request"}
          {mode === "EDIT" && "Edit Attendance Request"}
          {mode === "VIEW" && "View Attendance Request"}
          {mode === "DELETE" && "Delete Attendance Request"}
        </h2>

        {mode !== "DELETE" && (
          <div className="space-y-4">
            <div>
              <label>
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                disabled={disabled}
                className={`w-full p-2 border rounded ${border("date")}`}
                value={form.date || ""}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date}</p>
              )}
            </div>

            <div>
              <label>
                Request Type <span className="text-red-500">*</span>
              </label>
              <select
                disabled={disabled}
                className={`w-full p-2 border rounded ${border("type")}`}
                value={form.type || ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="">Select</option>
                <option>Missing Punch In</option>
                <option>Missing Punch Out</option>
                <option>Mark Present</option>
                <option>Half Day</option>
              </select>
              {errors.type && (
                <p className="text-xs text-red-500">{errors.type}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>
                  Punch In <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  disabled={disabled}
                  className={`w-full p-2 border rounded ${border("punchIn")}`}
                  value={form.punchIn || ""}
                  onChange={(e) =>
                    setForm({ ...form, punchIn: e.target.value })
                  }
                />
                {errors.punchIn && (
                  <p className="text-xs text-red-500">{errors.punchIn}</p>
                )}
              </div>

              <div>
                <label>
                  Punch Out <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  disabled={disabled}
                  className={`w-full p-2 border rounded ${border("punchOut")}`}
                  value={form.punchOut || ""}
                  onChange={(e) =>
                    setForm({ ...form, punchOut: e.target.value })
                  }
                />
                {errors.punchOut && (
                  <p className="text-xs text-red-500">{errors.punchOut}</p>
                )}
              </div>
            </div>

            <div>
              <label>
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                disabled={disabled}
                className={`w-full p-2 border rounded ${border("reason")}`}
                value={form.reason || ""}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              {errors.reason && (
                <p className="text-xs text-red-500">{errors.reason}</p>
              )}
            </div>
          </div>
        )}

        {mode === "DELETE" && (
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this request?
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Cancel
          </button>

          {mode !== "VIEW" && (
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded text-white ${
                mode === "DELETE" ? "bg-red-500" : "bg-orange-500"
              }`}
            >
              {mode === "DELETE"
                ? "Delete"
                : mode === "EDIT"
                  ? "Update"
                  : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
