/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Eye } from "lucide-react";
import ViewEditCandidateModal from "./ViewEditCandidateModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

const API_BASE = import.meta.env.VITE_API_URL;

interface Candidate {
  _id: string;
  name: string;
  email: string;
  jobTitle: string;
  recruitingManager?: string;
  mobile: string;
  resumeUrl: string;
  status: string;
  hiringDate?: string;
  joiningDate?: string;
  createdAt: string;
}

const Candidates = () => {
  const token = localStorage.getItem("token");
  const [list, setList] = useState<Candidate[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");

  const [deleteModal, setDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await axios.patch(
      `${API_BASE}/candidates/${id}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchCandidates();
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;
    try {
      setDeleting(true);
      await axios.delete(`${API_BASE}/candidates/${candidateToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCandidates();
      setDeleteModal(false);
      setCandidateToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Candidates</h1>
          <p className="text-sm text-gray-500">Recruitment / Candidates</p>
        </div>

        <button
          onClick={() => {
            setMode("add");
            setSelectedCandidate(null);
            setOpenModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
        >
          + Add Candidate
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="px-4 py-3 text-center">No.</th>
              <th className="px-4 py-3 text-center">Candidate</th>
              <th className="px-4 py-3 text-center">Contact No.</th>
              <th className="px-4 py-3 text-center">Email</th>
              <th className="px-4 py-3 text-center">Job Title</th>
              <th className="px-4 py-3 text-center">Recruiting Manager</th>
              <th className="px-4 py-3 text-center">Resume</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Hiring Date</th>
              <th className="px-4 py-3 text-center">Joining Date</th>
              <th className="px-4 py-3 text-center">Applied On</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              list.map((c, i) => (
                <tr key={c._id} className="border-t text-sm">
                  <td className="px-4 py-3 text-center">{i + 1}</td>
                  <td className="px-4 py-3 text-center font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{c.mobile || "-"}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-center text-orange-500 font-medium">{c.jobTitle}</td>
                  <td className="px-4 py-3 text-center">
                    {(c as any).jobId?.recruitingManager?.fullName || (c as any).jobId?.recruitingManager?.name || c.recruitingManager || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <a
                      href={`${API_BASE.replace("/api", "")}${c.resumeUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-500 hover:text-orange-700 flex items-center justify-center"
                      title="View Resume"
                    >
                      <Eye size={16} />
                    </a>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c._id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs outline-none"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                  </td>

                  <td className="px-4 py-3 text-center">{formatDate(c.hiringDate)}</td>
                  <td className="px-4 py-3 text-center">{formatDate(c.joiningDate)}</td>
                  <td className="px-4 py-3 text-center">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-center relative">
                    <span
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenMenu(openMenu === c._id ? null : c._id)
                      }
                    >
                      <MoreVertical size={18} />
                    </span>

                    {openMenu === c._id && (
                      <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                        <button 
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("view");
                            setSelectedCandidate(c);
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
                            setSelectedCandidate(c);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50 border-t"
                          onClick={() => {
                            setCandidateToDelete(c._id);
                            setDeleteModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ViewEditCandidateModal
        isOpen={openModal}
        mode={mode}
        candidate={selectedCandidate}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchCandidates}
      />

      <DeleteConfirmationModal
        isOpen={deleteModal}
        loading={deleting}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default Candidates;
