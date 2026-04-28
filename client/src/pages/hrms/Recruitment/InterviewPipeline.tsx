/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import Loader from "@/pages/hrms/Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface Candidate {
  _id: string;
  name: string;
  applied: boolean;
  shortlisted: boolean;
  hrRound: boolean;
  techRound: boolean;
  offer: boolean;
  hired: boolean;
  status: string;
  feedback?: string;
}

const StatusIcon = ({ value, status }: { value: boolean; status: string }) => {
  if (status === "Rejected" && !value) return <XCircle className="text-red-400 mx-auto" size={20} />;
  return value ? (
    <CheckCircle className="text-green-500 mx-auto" size={20} />
  ) : (
    <div className="w-5 h-5 rounded-full border-2 border-gray-200 mx-auto" />
  );
};

const InterviewPipeline = () => {
  const token = localStorage.getItem("token");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(res.data || []);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Interview Pipeline</h1>
        <p className="text-sm text-gray-500">
          Recruitment &gt; Interview Pipeline
        </p>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-4 text-left">Candidate</th>
              <th className="px-4 py-4">Applied</th>
              <th className="px-4 py-4">Shortlisted</th>
              <th className="px-4 py-4">HR Round</th>
              <th className="px-4 py-4">Tech Round</th>
              <th className="px-4 py-4">Offer</th>
              <th className="px-4 py-4">Hired</th>
              <th className="px-4 py-4 text-left">Manager Feedback</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {candidates.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-left font-semibold text-gray-900">
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                      c.status === "Rejected" ? "text-red-500" : "text-gray-400"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.applied} status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.shortlisted} status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.hrRound} status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.techRound} status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.offer} status={c.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusIcon value={c.hired} status={c.status} />
                </td>
                <td className="px-4 py-4 text-left">
                  {c.feedback ? (
                    <p className="text-[11px] text-gray-500 italic max-w-[200px] line-clamp-2" title={c.feedback}>
                      "{c.feedback}"
                    </p>
                  ) : (
                    <span className="text-[11px] text-gray-300">No feedback yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Clock size={40} className="mb-2 opacity-20" />
            <p>No candidates found in pipeline</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPipeline;


