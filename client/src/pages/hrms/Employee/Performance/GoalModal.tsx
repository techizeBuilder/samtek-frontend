/** @format */
import axios from "axios";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;

const GoalModal = ({ open, onClose, data, onSuccess }: any) => {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    description: "",
    progress: 0,
    dueDate: "",
  });
  const formatDateForInput = (date: string) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };
  /* ================= PREFILL DATA ================= */
  useEffect(() => {
    if (data) {
      setForm({
        title: data.title || "",
        description: data.description || "",
        progress: data.progress || 0,
        dueDate: formatDateForInput(data.deadline),
      });
    }
  }, [data, open]);

  /* ================= UPDATE ONLY ================= */
  const submit = async () => {
    try {
      await axios.put(
        `${API_BASE}/goals/${data._id}`,
        {
          title: form.title,
          description: form.description,
          progress: form.progress,
          // 👇 backend ko ISO date milegi
          deadline: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update goal", err);
    }
  };

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">View / Update Goal</h3>

        <div className="space-y-4">
          {/* TITLE */}
          <div>
            <label className="text-sm font-medium">Goal Title</label>
            <input
              className="w-full border rounded-md p-2 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* PROGRESS */}
          <div>
            <label className="text-sm font-medium">Progress (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border rounded-md p-2 text-sm"
              value={form.progress}
              onChange={(e) =>
                setForm({
                  ...form,
                  progress: Number(e.target.value),
                })
              }
            />
          </div>

          {/* DUE DATE */}
          <div>
            <label className="text-sm font-medium">Due Date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2 text-sm"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Close
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm"
          >
            Update Goal
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
