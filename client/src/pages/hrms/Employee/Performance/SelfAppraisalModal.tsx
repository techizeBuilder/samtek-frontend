/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import StarRating from "./StarRating";

const API = import.meta.env.VITE_API_URL;

interface Props {
  open: boolean;
  onClose: () => void;
  appraisalId: string;
  readOnly?: boolean;
  selfAppraisalId: string | null;
}

export default function SelfAppraisalModal({
  open,
  onClose,
  appraisalId,
  readOnly = false,
}: Props) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    goalsAchievement: "",
    goalsRating: 0,
    skillsRating: {
      technical: 0,
      communication: 0,
      teamwork: 0,
      problemSolving: 0,
    },
    contributions: "",
    challenges: "",
    learning: "",
    summary: "",
  });

  /* ================= FETCH (VIEW MODE) ================= */
  useEffect(() => {
    if (open && readOnly) {
      fetchSelfAppraisal();
    }
  }, [open]);

  const fetchSelfAppraisal = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/self-appraisals/${appraisalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) {
        setForm({
          goalsAchievement: res.data.goalsAchievement || "",
          goalsRating: res.data.goalsRating || 0,
          skillsRating: res.data.skillsRating || {
            technical: 0,
            communication: 0,
            teamwork: 0,
            problemSolving: 0,
          },
          contributions: res.data.contributions || "",
          challenges: res.data.challenges || "",
          learning: res.data.learning || "",
          summary: res.data.summary || "",
        });
      }
    } catch (err) {
      console.error("Failed to load appraisal");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API}/self-appraisals`,
        { appraisalId, ...form },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
    } catch (err) {
      console.error("Submit failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  /* ================= UI ================= */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* MODAL */}
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {readOnly ? "View Self Appraisal" : "Self Appraisal Form"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="text-center text-gray-500">Loading...</div>
          )}

          {/* GOALS */}
          <section>
            <label className="font-medium">Goals Achievement</label>
            <textarea
              value={form.goalsAchievement}
              disabled={readOnly}
              onChange={(e) =>
                setForm({ ...form, goalsAchievement: e.target.value })
              }
              className="w-full border rounded-lg p-3 mt-1"
            />
            <StarRating
              value={form.goalsRating}
              readOnly={readOnly}
              onChange={(v) =>
                !readOnly && setForm({ ...form, goalsRating: v })
              }
            />
          </section>

          {/* SKILLS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(
              [
                "technical",
                "communication",
                "teamwork",
                "problemSolving",
              ] as const
            ).map((s) => (
              <div key={s}>
                <p className="capitalize font-medium">{s}</p>
                <StarRating
                  value={form.skillsRating[s]}
                  readOnly={readOnly}
                  onChange={(v) =>
                    !readOnly &&
                    setForm({
                      ...form,
                      skillsRating: {
                        ...form.skillsRating,
                        [s]: v,
                      },
                    })
                  }
                />
              </div>
            ))}
          </section>

          {/* TEXT AREAS */}
          {(
            ["contributions", "challenges", "learning", "summary"] as const
          ).map((f) => (
            <div key={f}>
              <label className="capitalize font-medium">{f}</label>
              <textarea
                value={form[f]}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                className="w-full border rounded-lg p-3 mt-1"
              />
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Close
          </button>

          {!readOnly && (
            <button
              onClick={submit}
              className="px-5 py-2 rounded-lg bg-primary text-white"
            >
              Submit Appraisal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
