/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";

const API = import.meta.env.VITE_API_URL;

/* ⭐ Star Component */
const Stars = ({ value }: { value: number }) => {
  const full = Math.round(value || 0);
  return (
    <div className="flex items-center gap-1 text-yellow-400 text-sm">
      {"★".repeat(full)}
      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
      <span className="ml-2 text-gray-600">({value}/5)</span>
    </div>
  );
};

export default function MyFeedback() {
  const token = localStorage.getItem("token");
  const [list, setList] = useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  const fetchFeedback = async () => {
    const res = await axios.get(`${API}/feedback/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setList(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);
  if(loading)return<Loader/>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">My Appraisal Feedback</h1>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((item) => {
          const manager = item.managerFeedback;

          return (
            <div
              key={item.selfAppraisalId}
              className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {item.appraisal.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Manager: {manager?.reviewer?.name}
                  </p>
                </div>

                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
                  {item.status}
                </span>
              </div>

              {/* OVERALL */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
                <Stars value={manager?.overallRating} />
              </div>

              {/* MANAGER RATINGS */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Goals Achievement</span>
                  <Stars value={manager?.managerRatings?.goals} />
                </div>

                <div className="flex justify-between">
                  <span>Skills</span>
                  <Stars value={manager?.managerRatings?.skills} />
                </div>

                <div className="flex justify-between">
                  <span>Behaviour</span>
                  <Stars value={manager?.managerRatings?.behaviour} />
                </div>
              </div>

              {/* SELF RATINGS */}
              <div className="mt-4 border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Your Self Ratings
                </p>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Technical</span>
                    <Stars value={item.selfRatings.skillsRating.technical} />
                  </div>

                  <div className="flex justify-between">
                    <span>Communication</span>
                    <Stars
                      value={item.selfRatings.skillsRating.communication}
                    />
                  </div>

                  <div className="flex justify-between">
                    <span>Teamwork</span>
                    <Stars value={item.selfRatings.skillsRating.teamwork} />
                  </div>

                  <div className="flex justify-between">
                    <span>Problem Solving</span>
                    <Stars
                      value={item.selfRatings.skillsRating.problemSolving}
                    />
                  </div>
                </div>
              </div>

              {/* FEEDBACK */}
              <div className="mt-4 border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Manager Feedback
                </p>
                <p className="text-sm text-gray-600">
                  {manager?.feedback || "—"}
                </p>
              </div>

              {/* DATE */}
              <p className="text-xs text-gray-400 mt-3">
                Reviewed on{" "}
                {manager?.reviewedAt
                  ? new Date(manager.reviewedAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          No feedback available yet
        </div>
      )}
    </div>
  );
}
