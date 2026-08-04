/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  candidate: any;
  mode: "add" | "view" | "edit";
}

interface Job {
  _id: string;
  jobTitle: string;
  recruitingManager: any;
}

const ViewEditCandidateModal = ({ isOpen, onClose, onSuccess, candidate, mode }: Props) => {
  const token = localStorage.getItem("token");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    jobId: "",
    jobTitle: "",
    recruitingManager: "",
    hiringDate: "",
    joiningDate: "",
    resume: null as File | null,
  });

  const [errors, setErrors] = useState<any>({});

  const disabled = mode === "view";

  /* ================= FETCH JOBS ================= */
  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/job-openings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // In Edit/View mode, we might need to show the job even if it's closed, 
      // but for simplicity we show all or open ones.
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch jobs");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchJobs();
    }
  }, [isOpen]);

  /* ================= PREFILL ================= */
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && candidate) {
      setForm({
        name: candidate.name || "",
        email: candidate.email || "",
        mobile: candidate.mobile || "",
        jobId: candidate.jobId?._id || candidate.jobId || "",
        jobTitle: candidate.jobTitle || "",
        recruitingManager: candidate.recruitingManager || "",
        hiringDate: candidate.hiringDate ? new Date(candidate.hiringDate).toISOString().split('T')[0] : "",
        joiningDate: candidate.joiningDate ? new Date(candidate.joiningDate).toISOString().split('T')[0] : "",
        resume: null,
      });
    } else if (mode === "add" && isOpen) {
      setForm({
        name: "",
        email: "",
        mobile: "",
        jobId: "",
        jobTitle: "",
        recruitingManager: "",
        hiringDate: "",
        joiningDate: "",
        resume: null,
      });
    }
    setErrors({});
  }, [candidate, mode, isOpen]);

  /* ================= HANDLE JOB CHANGE ================= */
  const handleJobChange = (jobId: string) => {
    const selectedJob = jobs.find((j) => j._id === jobId);
    if (selectedJob) {
      const managerId = selectedJob.recruitingManager?._id || selectedJob.recruitingManager;
      setForm({
        ...form,
        jobId: selectedJob._id,
        jobTitle: selectedJob.jobTitle,
        recruitingManager: managerId || "",
      });
    } else {
      setForm({
        ...form,
        jobId: "",
        jobTitle: "",
        recruitingManager: "",
      });
    }
  };

  if (!isOpen) return null;

  /* ================= VALIDATION ================= */
  const validate = () => {
    let e: any = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.mobile.trim()) e.mobile = "Mobile number is required";
    if (!form.jobId) e.jobId = "Please select a job";
    if (mode === "add" && !form.resume) e.resume = "Resume is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("mobile", form.mobile);
      formData.append("jobId", form.jobId);
      formData.append("jobTitle", form.jobTitle);
      formData.append("recruitingManager", form.recruitingManager);
      if (form.hiringDate) formData.append("hiringDate", form.hiringDate);
      if (form.joiningDate) formData.append("joiningDate", form.joiningDate);
      if (form.resume) formData.append("resume", form.resume);

      let res;
      if (mode === "add") {
        res = await axios.post(`${API_BASE}/candidates`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        res = await axios.put(`${API_BASE}/candidates/${candidate._id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast({
        
        title: mode === "add" ? "Candidate Added" : "Candidate Updated",
        description: res.data?.message || "Operation successful.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* MODAL */}
      <div
        className="relative z-10 bg-white w-[460px] rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5">
          {mode === "add" && "Add New Candidate"}
          {mode === "view" && "View Candidate Details"}
          {mode === "edit" && "Edit Candidate Details"}
        </h2>

        {/* Name & Email */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Candidate Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full border px-3 py-2 rounded mt-1 text-sm ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              disabled={disabled}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`w-full border px-3 py-2 rounded mt-1 text-sm ${
                errors.email ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Mobile Number */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className={`w-full border px-3 py-2 rounded mt-1 text-sm ${
              errors.mobile ? "border-red-500" : "border-gray-200"
            }`}
          />
          {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
        </div>

        {/* Job Selection */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Select Job <span className="text-red-500">*</span>
          </label>
          <select
            disabled={disabled}
            value={form.jobId}
            onChange={(e) => handleJobChange(e.target.value)}
            className={`w-full border px-3 py-2 rounded mt-1 text-sm ${
              errors.jobId ? "border-red-500" : "border-gray-200"
            }`}
          >
            <option value="">Choose a job...</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.jobTitle}
              </option>
            ))}
          </select>
          {errors.jobId && <p className="text-xs text-red-500 mt-1">{errors.jobId}</p>}
        </div>

        {/* Recruiting Manager (Auto-fill) */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Recruiting Manager
          </label>
          <input
            type="text"
            readOnly
            value={
              jobs.find(j => j._id === form.jobId)?.recruitingManager?.fullName ||
              jobs.find(j => j._id === form.jobId)?.recruitingManager?.name ||
              (candidate?.jobId?._id === form.jobId ? (candidate?.jobId?.recruitingManager?.fullName || candidate?.jobId?.recruitingManager?.name) : "") ||
              (typeof form.recruitingManager === 'object' ? ((form.recruitingManager as any).fullName || (form.recruitingManager as any).name) : "") ||
              ""
            }
            className="w-full border px-3 py-2 rounded mt-1 text-sm bg-gray-50 text-gray-500 border-gray-100"
            placeholder="Automatically filled from job"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Hiring Date</label>
            <input
              type="date"
              disabled={disabled}
              value={form.hiringDate}
              onChange={(e) => setForm({ ...form, hiringDate: e.target.value })}
              className="w-full border border-gray-200 px-3 py-2 rounded mt-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Joining Date</label>
            <input
              type="date"
              disabled={disabled}
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              className="w-full border border-gray-200 px-3 py-2 rounded mt-1 text-sm"
            />
          </div>
        </div>

        {/* Resume Upload */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Resume / CV {mode === "add" && <span className="text-red-500">*</span>}
          </label>
          {!disabled ? (
            <input
              type="file"
              onChange={(e) => setForm({ ...form, resume: e.target.files?.[0] || null })}
              className="w-full border border-gray-200 px-3 py-1.5 rounded mt-1 text-xs file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              accept=".pdf,.docx"
            />
          ) : (
            <div className="mt-1">
              {candidate?.resumeUrl ? (
                <a 
                  href={`${API_BASE.replace("/api", "")}${candidate.resumeUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-orange-500 hover:underline text-sm font-medium"
                >
                  View current CV
                </a>
              ) : (
                <span className="text-gray-400 text-sm">No resume uploaded</span>
              )}
            </div>
          )}
          {errors.resume && <p className="text-xs text-red-500 mt-1">{errors.resume}</p>}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm">
            {disabled ? "Close" : "Cancel"}
          </button>
          {!disabled && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 shadow-md shadow-orange-100 disabled:opacity-50"
            >
              {loading ? "Processing..." : mode === "add" ? "Save" : "Update"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewEditCandidateModal;

