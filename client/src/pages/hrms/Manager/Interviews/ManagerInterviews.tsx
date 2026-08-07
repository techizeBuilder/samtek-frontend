/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { User, Briefcase, Calendar, MessageSquare, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import InterviewFeedbackModal from "./InterviewFeedbackModal";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface Candidate {
  _id: string;
  name: string;
  email: string;
  jobTitle: string;
  mobile: string;
  status: string;
  applied: boolean;
  shortlisted: boolean;
  hrRound: boolean;
  techRound: boolean;
  offer: boolean;
  hired: boolean;
  feedback?: string;
  createdAt: string;
}

const ManagerInterviews = () => {
  const token = localStorage.getItem("token");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see candidateController.js getCandidatesForManager).
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const limit = 12;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/candidates/manager/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined },
      });
      setCandidates(res.data?.data || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } catch (error) {
      console.error("Failed to fetch candidates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const openFeedbackModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => { if (!loading) setInitialLoad(false); }, [loading]);

  if (loading && initialLoad) return <Loader />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Interview Feedback</h1>
          <p className="text-sm text-gray-500">Manage candidate interviews and provide feedback</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, job..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <div
            key={candidate._id}
            className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b bg-gray-50/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{candidate.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Briefcase size={12} />
                      <span>{candidate.jobTitle}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${candidate.status === "Hired"
                      ? "bg-green-100 text-green-700"
                      : candidate.status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                >
                  {candidate.status}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-grow space-y-4">
              {/* Progress Tracker */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pipeline Progress</p>
                <div className="flex items-center justify-between">
                  <RoundIndicator label="Shortlisted" active={candidate.shortlisted} />
                  <div className="h-px bg-gray-200 flex-grow mx-1" />
                  <RoundIndicator label="HR Round" active={candidate.hrRound} />
                  <div className="h-px bg-gray-200 flex-grow mx-1" />
                  <RoundIndicator label="Tech Round" active={candidate.techRound} />
                </div>
              </div>

              {/* Feedback Summary */}
              {candidate.feedback && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase mb-1">
                    <MessageSquare size={12} />
                    <span>Feedback</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 italic">"{candidate.feedback}"</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Applied {new Date(candidate.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="p-4 bg-gray-50/50 border-t">
              <button
                onClick={() => openFeedbackModal(candidate)}
                className="w-full h-10 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Clock size={16} />
                Manage Interview
              </button>
            </div>
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
            <User size={32} />
          </div>
          <p className="text-gray-500 font-medium">No candidates assigned for interview</p>
          <p className="text-xs text-gray-400 mt-1">Candidates added to your job openings will appear here.</p>
        </div>
      )}

      {pagination.total > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} candidates)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.current <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total, p + 1))}
              disabled={pagination.current >= pagination.total}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <InterviewFeedbackModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
          onSuccess={fetchCandidates}
        />
      )}
    </div>
  );
};

const RoundIndicator = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex flex-col items-center gap-1.5 group">
    {active ? (
      <CheckCircle size={18} className="text-green-500" />
    ) : (
      <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-200" />
    )}
    <span className={`text-[9px] font-bold tracking-tight ${active ? "text-gray-900" : "text-gray-400"}`}>
      {label}
    </span>
  </div>
);

export default ManagerInterviews;
