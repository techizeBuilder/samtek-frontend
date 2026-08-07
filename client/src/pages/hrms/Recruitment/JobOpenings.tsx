/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Eye, Search } from "lucide-react";
import ViewEditJobModal from "./ViewEditJobModal";
import Loader from "@/pages/hrms/Loader";

interface JobOpening {
  _id: string;
  jobTitle: string;
  department: string;
  location: string;
  openings: number;
  recruitingManager?: {
    _id: string;
    name?: string;
    fullName?: string;
  };
  jobDocument?: string;
  status: "Open" | "Closed";
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

const JobOpening = () => {
  const token = localStorage.getItem("token");

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("add");
  const [initialLoad, setInitialLoad] = useState(true);

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see jobOpeningController.js getAllJobOpenings).
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/job-openings`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined },
      });
      setJobs(res.data?.data || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const closeJob = async (id: string) => {
    await axios.patch(
      `${API_BASE}/job-openings/${id}/close`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchJobs();
  };
   if (loading && initialLoad) {
     return (
       <div className="relative min-h-[300px]">
         <Loader />
       </div>
     );
   }
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Job Openings</h1>
          <p className="text-sm text-gray-500">Recruitment / Job Openings</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search job title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={() => {
              setMode("add");
              setSelectedJob(null);
              setOpenModal(true);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
          >
            + Add Job Opening
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="px-4 py-3 text-center">No.</th>
              <th className="px-4 py-3 text-center">Job Title</th>
              <th className="px-4 py-3 text-center">Department</th>
              <th className="px-4 py-3 text-center">Recruiting Manager</th>
              <th className="px-4 py-3 text-center">JD</th>
              <th className="px-4 py-3 text-center">Location</th>
              <th className="px-4 py-3 text-center">Openings</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Posted On</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              jobs.map((job, i) => (
                <tr key={job._id} className="border-t text-sm">
                  <td className="px-4 py-3 text-center">{i + 1}</td>

                  <td className="px-4 py-3 text-center font-medium text-orange-500">
                    {job.jobTitle}
                  </td>

                  <td className="px-4 py-3 text-center">{job.department}</td>
                  <td className="px-4 py-3 text-center">{job.recruitingManager?.fullName || job.recruitingManager?.name || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {job.jobDocument ? (
                      <a 
                        href={`${API_BASE.replace("/api", "")}/${job.jobDocument}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-orange-500 hover:text-orange-700 flex items-center justify-center"
                        title="View JD"
                      >
                        <Eye size={16} />
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">{job.location}</td>
                  <td className="px-4 py-3 text-center">{job.openings}</td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        job.status === "Open"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-center relative">
                    <span
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenMenu(openMenu === job._id ? null : job._id)
                      }
                    >
                      <MoreVertical size={18} />
                    </span>

                    {openMenu === job._id && (
                      <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("view");
                            setSelectedJob(job);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          View
                        </button>

                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("edit");
                            setSelectedJob(job);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Edit
                        </button>

                        {job.status === "Open" && (
                          <button
                            className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                            onClick={() => closeJob(job._id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination.total > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} job openings)
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

      <ViewEditJobModal
        isOpen={openModal}
        mode={mode}
        job={selectedJob}
        onClose={() => {
          setOpenModal(false);
          fetchJobs();
        }}
      />
    </div>
  );
};

export default JobOpening;


