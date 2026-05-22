/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import SelfAppraisalModal from "./SelfAppraisalModal";
import Loader from "../../Loader";

const API_BASE = import.meta.env.VITE_API_URL;

interface Appraisal {
  _id: string;
  title: string;
  type: "MID_YEAR" | "ANNUAL";
  status: "ACTIVE" | "CLOSED";
  startDate: string;
  endDate: string;

  // 👇 backend se aa raha hai
  isSubmitted: boolean;
  submittedAt: string | null;
  selfAppraisalId: string | null;
}

export default function MyAppraisals() {
  const token = localStorage.getItem("token");

  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(
    null
  );
  const [loading,setLoading]=useState(true);

  /* ================= FETCH ================= */
  const fetchMyAppraisals = async () => {
    try {
      const res = await axios.get(`${API_BASE}/self-appraisals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppraisals(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch appraisals");
    }
  };

  useEffect(() => {
    fetchMyAppraisals();
  }, []);
  if(loading)return<Loader/>;
  /* ================= UI ================= */
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-semibold">My Appraisals</h1>

      {appraisals.map((a) => (
        <div
          key={a._id}
          className="bg-white p-5 rounded-xl shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {/* LEFT */}
          <div>
            <h3 className="font-semibold text-lg">{a.title}</h3>

            <p className="text-sm text-gray-500">
              {a.type === "MID_YEAR" ? "Mid Year" : "Annual"} Appraisal
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Duration: {new Date(a.startDate).toLocaleDateString("en-GB")} –{" "}
              {new Date(a.endDate).toLocaleDateString("en-GB")}
            </p>

            {a.isSubmitted && a.submittedAt && (
              <p className="text-xs text-green-600 mt-1">
                Submitted on{" "}
                {new Date(a.submittedAt).toLocaleDateString("en-GB")}
              </p>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* STATUS BADGE */}
            {a.isSubmitted ? (
              <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                SUBMITTED
              </span>
            ) : (
              <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                PENDING
              </span>
            )}

            {/* ACTION */}
            <button
              onClick={() => setSelectedAppraisal(a)}
              className={`px-4 py-2 rounded-md text-sm text-white ${
                a.isSubmitted ? "bg-gray-600" : "bg-primary"
              }`}
            >
              {a.isSubmitted ? "View Self Appraisal" : "Start Self Appraisal"}
            </button>
          </div>
        </div>
      ))}

      {/* EMPTY */}
      {appraisals.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          No active appraisals available
        </div>
      )}

      {/* MODAL */}
      {selectedAppraisal && (
        <SelfAppraisalModal
          open={true}
          onClose={() => setSelectedAppraisal(null)}
          appraisalId={selectedAppraisal._id}
          selfAppraisalId={selectedAppraisal.selfAppraisalId}
          readOnly={selectedAppraisal.isSubmitted} // 🔒 important
        />
      )}
    </div>
  );
}
