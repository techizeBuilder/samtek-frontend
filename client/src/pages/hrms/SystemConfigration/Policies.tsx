/** @format */
import {
  Calendar,
  Clock,
  Briefcase,
  Umbrella,
  UserMinus,
  ShieldCheck,
  ArrowUpRight,
  Timer,
  LogIn,
  LogOut,
  Infinity,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Download,
  Trash2,
  Building2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;
const BASE_URL = API_BASE?.replace("/api", "") || "";
const token = () => localStorage.getItem("token");

type Tab = "leave" | "attendance" | "company";

interface HrPolicy {
  _id: string;
  no: number;
  name: string;
  requirements: string[];
  legalReference: string;
  documentUrl?: string;
  documentName?: string;
}

export default function Policies() {
  const [activeTab, setActiveTab] = useState<Tab>("leave");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hrPolicies, setHrPolicies] = useState<HrPolicy[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await axios.get(`${API_BASE}/leave-types`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        setLeaves(res.data || []);
      } catch (error) {
        console.error("Failed to fetch leave types:", error);
      }
    };
    fetchLeaves();
  }, []);

  useEffect(() => {
    if (activeTab === "company") fetchHrPolicies();
  }, [activeTab]);

  const fetchHrPolicies = async () => {
    try {
      const res = await axios.get(`${API_BASE}/hr-policies`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setHrPolicies(res.data || []);
    } catch (err) {
      console.error("Failed to fetch HR policies", err);
    }
  };

  const handleUpload = async (policyId: string, file: File) => {
    setUploadingId(policyId);
    const formData = new FormData();
    formData.append("document", file);
    try {
      const res = await axios.post(
        `${API_BASE}/hr-policies/${policyId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token()}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast({ title: "Uploaded", description: "Document uploaded successfully" });
      setHrPolicies((prev) =>
        prev.map((p) => (p._id === policyId ? res.data.policy : p))
      );
    } catch (err) {
      toast({ title: "Upload Failed", description: "Could not upload document", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveDocument = async (policyId: string) => {
    try {
      const res = await axios.delete(
        `${API_BASE}/hr-policies/${policyId}/document`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      toast({ title: "Removed", description: "Document removed" });
      setHrPolicies((prev) =>
        prev.map((p) => (p._id === policyId ? res.data.policy : p))
      );
    } catch (err) {
      toast({ title: "Error", description: "Could not remove document", variant: "destructive" });
    }
  };

  const getDocumentHref = (url: string) =>
    url.startsWith("http") ? url : `${BASE_URL}/${url.replace(/\\/g, "/")}`;

  /* ================= ATTENDANCE POLICY ================= */
  const [attendance] = useState({
    graceTime: 10,
    lateAfter: 15,
    lateCountHalfDay: 3,
    earlyExitMinutes: 30,
    overtimeEnabled: true,
    overtimeAfter: 8,
    overtimeType: "Paid",
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="relative">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-30 -z-10"></div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">HR Policies</h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          System Configuration <ArrowUpRight size={14} className="text-gray-400" /> HR Policies
        </p>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex p-1 bg-gray-100 items-center rounded-xl w-fit gap-1">
        {(
          [
            { key: "leave", icon: <Calendar size={16} />, label: "Leave Policies" },
            { key: "attendance", icon: <Clock size={16} />, label: "Attendance Policies" },
            { key: "company", icon: <Building2 size={16} />, label: "Company HR Policies" },
          ] as { key: Tab; icon: React.ReactNode; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm ${
              activeTab === tab.key
                ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= LEAVE POLICIES ================= */}
      {activeTab === "leave" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800">Leave Entitlements</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Standardized leave allocations and carry-forward rules designed to ensure
              work-life balance and operational consistency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="group relative border border-gray-100 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-10 -mt-10 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                    {leave.name.includes("Casual") && <Umbrella size={24} />}
                    {leave.name.includes("Sick") && <ShieldCheck size={24} />}
                    {leave.name.includes("Earned") && <Briefcase size={24} />}
                    {leave.name.includes("Unpaid") && <UserMinus size={24} />}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{leave.name}</h3>
                  <p className="text-orange-600 font-semibold text-2xl mb-4">
                    {leave.maxDays} <span className="text-sm font-normal text-gray-400">Days / Year</span>
                  </p>
                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Accrual Mode</span>
                      <span className="font-medium px-2 py-0.5 bg-gray-50 rounded text-gray-700">Yearly</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Carry Forward</span>
                      <span className={`flex items-center gap-1 font-medium ${leave.carryForward ? "text-green-600" : "text-gray-400"}`}>
                        {leave.carryForward ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {leave.carryForward ? "Allowed" : "Not Allowed"}
                      </span>
                    </div>
                    {leave.carryForward && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 pl-4">Max Cap</span>
                        <span className="font-medium text-gray-700">{leave.maxDays} Days</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Compensation</span>
                      <span className={`font-medium ${leave.paid ? "text-blue-600" : "text-red-500"}`}>
                        {leave.paid ? "Paid Full" : "Unpaid"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE POLICIES ================= */}
      {activeTab === "attendance" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800">Time & Attendance Rules</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Guidelines for punctuality, grace periods, and overtime calculations to
              maintain organizational discipline and fair compensation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-100 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Timer size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Grace Period</h3>
              <p className="text-sm text-gray-500 mb-4">Allowance for late arrivals before being marked as late.</p>
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-700">{attendance.graceTime} <span className="text-sm font-normal">Mins</span></p>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                <LogIn size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Late Threshold</h3>
              <p className="text-sm text-gray-500 mb-4">Strict check-in time and penalty rules for consistent lateness.</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-500">Late After</span>
                  <span className="font-semibold">{attendance.lateAfter} Mins</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-gray-500">Penalty Rule</span>
                  <span className="font-semibold text-orange-600">{attendance.lateCountHalfDay} Lates = 0.5 Day</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <LogOut size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Early Exit</h3>
              <p className="text-sm text-gray-500 mb-4">Rules for departing before the official shift end time.</p>
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-700">{attendance.earlyExitMinutes} <span className="text-sm font-normal">Mins</span></p>
              </div>
            </div>

            <div className="border border-orange-100 lg:col-span-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 p-8 shadow-lg text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <Clock size={160} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Infinity size={20} />
                    </div>
                    <h3 className="text-2xl font-bold">Overtime Policy</h3>
                  </div>
                  <p className="text-orange-50 max-w-md text-sm">
                    Additional hours beyond the standard shift are compensated according to the specified rule set.
                  </p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="text-center px-6 py-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                    <p className="text-xs text-orange-50 uppercase tracking-widest mb-1">Threshold</p>
                    <p className="text-2xl font-bold">{attendance.overtimeAfter}+ <span className="text-sm font-normal opacity-75">Hrs</span></p>
                  </div>
                  <div className="text-center px-6 py-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                    <p className="text-xs text-orange-50 uppercase tracking-widest mb-1">Benefit Type</p>
                    <p className="text-2xl font-bold">{attendance.overtimeType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPANY HR POLICIES ================= */}
      {activeTab === "company" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800">Company HR Policies</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Statutory and best-practice HR policies as per Indian Labour Laws. Upload the official policy document for each policy to make it accessible to your team.
            </p>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-10">No.</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">HR Policy</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden lg:table-cell">Top 5 Requirements</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">Key Legal Reference</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-44">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hrPolicies.map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-center">
                      <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center mx-auto">
                        {policy.no}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800 text-[13px]">{policy.name}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-500">
                        {policy.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ol>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-500 italic">{policy.legalReference}</span>
                    </td>
                    <td className="px-4 py-4">
                      {policy.documentUrl ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <a
                            href={getDocumentHref(policy.documentUrl)}
                            download={policy.documentName}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors w-full justify-center"
                          >
                            <Download size={13} />
                            Download
                          </a>
                          <p className="text-[10px] text-gray-400 truncate max-w-[130px] text-center" title={policy.documentName}>
                            {policy.documentName}
                          </p>
                          <button
                            onClick={() => handleRemoveDocument(policy._id)}
                            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer w-full justify-center">
                            {uploadingId === policy._id ? (
                              <span className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload size={13} />
                            )}
                            {uploadingId === policy._id ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              ref={(el) => { fileInputRefs.current[policy._id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(policy._id, file);
                              }}
                            />
                          </label>
                          <p className="text-[10px] text-gray-400">PDF / Word / Image</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {hrPolicies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400 italic">
                      <FileText size={32} className="mx-auto mb-3 opacity-30" />
                      Loading HR Policies...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 items-center text-xs text-gray-500 pt-2">
            <span className="flex items-center gap-1.5">
              <Download size={13} className="text-blue-500" />
              Download uploaded policy document
            </span>
            <span className="flex items-center gap-1.5">
              <Upload size={13} className="text-orange-500" />
              Upload policy document (PDF / Word / Image)
            </span>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <div className="pt-8 border-t border-gray-100 flex items-start gap-4">
        <div className="bg-gray-100 p-2 rounded-lg text-gray-400">
          <ShieldCheck size={20} />
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
          <span className="font-semibold text-gray-600 block mb-1 uppercase text-[10px] tracking-wider">Access Control Policy</span>
          Only authorized HR personnel and System Administrators retain permissions to modify these core organizational thresholds.
          Any approved adjustments integrate synchronously across performance and payroll modules.
        </p>
      </div>
    </div>
  );
}
