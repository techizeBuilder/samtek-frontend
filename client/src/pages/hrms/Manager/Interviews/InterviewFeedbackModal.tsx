/** @format */

import { useState } from "react";
import axios from "axios";
import { X, CheckCircle, MessageSquare, Save, Trash2, User, Briefcase } from "lucide-react";
import { toast } from "@/pages/Alert/Toast";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL;

interface Candidate {
  _id: string;
  name: string;
  jobTitle: string;
  status: string;
  applied: boolean;
  shortlisted: boolean;
  hrRound: boolean;
  techRound: boolean;
  offer: boolean;
  hired: boolean;
  feedback?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onSuccess: () => void;
}

const InterviewFeedbackModal = ({ isOpen, onClose, candidate, onSuccess }: Props) => {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    status: candidate.status,
    applied: candidate.applied,
    shortlisted: candidate.shortlisted,
    hrRound: candidate.hrRound,
    techRound: candidate.techRound,
    offer: candidate.offer,
    hired: candidate.hired,
    feedback: candidate.feedback || "",
  });

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    setForm({ ...form, [key]: !((form as any)[key]) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.patch(
        `${API_BASE}/candidates/${candidate._id}/feedback`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        type: "success",
        title: "Feedback Saved",
        message: "Candidate interview status has been updated successfully.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Error",
        message: error.response?.data?.message || "Failed to save feedback",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{candidate.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Briefcase size={12} />
                <span>{candidate.jobTitle}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form id="interview-feedback-form" onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Rounds Tracker */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Interview Rounds</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatusToggle
                    label="Shortlisted"
                    active={form.shortlisted}
                    onClick={() => handleToggle("shortlisted")}
                  />
                  <StatusToggle
                    label="HR Round"
                    active={form.hrRound}
                    onClick={() => handleToggle("hrRound")}
                  />
                  <StatusToggle
                    label="Tech Round"
                    active={form.techRound}
                    onClick={() => handleToggle("techRound")}
                  />
                  <StatusToggle
                    label="Offer Extended"
                    active={form.offer}
                    onClick={() => handleToggle("offer")}
                  />
                </div>
              </div>

              {/* Final Status */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Final Decision</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: "Hired", hired: true })}
                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${form.status === "Hired"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                      }`}
                  >
                    <CheckCircle size={18} />
                    Hire
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: "Rejected", hired: false })}
                    className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${form.status === "Rejected"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                      }`}
                  >
                    <Trash2 size={18} />
                    Reject
                  </button>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Manager Feedback</h3>
                  <MessageSquare size={14} className="text-gray-300" />
                </div>
                <textarea
                  value={form.feedback}
                  onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                  placeholder="Share your technical evaluation and overall impression..."
                  className="w-full h-32 p-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 focus:border-orange-500 focus:ring-0 transition-all text-sm outline-none resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 bg-gray-50 border-t flex gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold border-2"
          >
            Cancel
          </Button>
          <Button
            form="interview-feedback-form"
            type="submit"
            disabled={loading}
            className="flex-2 h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 px-8"
          >
            {loading ? "Saving..." : (
              <>
                <Save size={18} />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatusToggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${active
        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
      }`}
  >
    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${active ? "border-orange-500 bg-orange-500 text-white" : "border-gray-200"}`}>
      {active && <CheckCircle size={12} strokeWidth={3} />}
    </div>
    <span className="text-xs font-bold">{label}</span>
  </button>
);

export default InterviewFeedbackModal;
