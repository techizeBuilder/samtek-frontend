/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText,
  ShieldCheck,
  Calendar,
  Clock,
  Building2,
  Download,
  CheckCircle2,
  XCircle,
  Timer,
  LogIn,
  LogOut,
  Infinity,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import Loader from "../../Loader";

const API = import.meta.env.VITE_API_URL;
const BASE_URL = API?.replace("/api", "") || "";
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

export default function EmployeePolicies() {
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = loggedInUser?.id;

  const [user, setUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hrPolicies, setHrPolicies] = useState<HrPolicy[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("leave");
  const [loading, setLoading] = useState(true);

  const [attendance, setAttendance] = useState({
    graceTime: 10,
    lateAfter: 15,
    lateCountHalfDay: 3,
    earlyExitMinutes: 30,
    overtimeAfter: 8,
    overtimeType: "Paid",
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [userRes, leaveRes] = await Promise.all([
          axios.get(`${API}/users/${userId}`, { headers: { Authorization: `Bearer ${token()}` } }),
          axios.get(`${API}/leave-types`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);
        setUser(userRes.data);
        setLeaves(leaveRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === "company") {
      axios
        .get(`${API}/hr-policies`, { headers: { Authorization: `Bearer ${token()}` } })
        .then((res) => setHrPolicies(res.data || []))
        .catch(console.error);
    }
    if (activeTab === "attendance") {
      axios
        .get(`${API}/attendance-policy`, { headers: { Authorization: `Bearer ${token()}` } })
        .then((res) => setAttendance(res.data))
        .catch(console.error);
    }
  }, [activeTab]);

  const getDocUrl = (url: string) =>
    url.startsWith("http") ? url : `${BASE_URL}/${url.replace(/\\/g, "/")}`;

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Company Policies</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <Building2 size={15} />
          <span>{user?.companyId?.name || "Your Company"}</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex p-1 bg-gray-100 items-center rounded-xl w-fit gap-1 flex-wrap">
        {(
          [
            { key: "leave", icon: <Calendar size={15} />, label: "Leave Policies" },
            { key: "attendance", icon: <Clock size={15} />, label: "Attendance Policies" },
            { key: "company", icon: <BookOpen size={15} />, label: "HR Policies" },
          ] as { key: Tab; icon: React.ReactNode; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm ${activeTab === tab.key
                ? "bg-white text-[#49A7F5] shadow-md border border-[#49A7F5]/20 scale-[1.02]"
                : "text-gray-600 hover:text-[#49A7F5] hover:bg-[#49A7F5]/5"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====== LEAVE POLICIES ====== */}
      {activeTab === "leave" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {leaves.map((leave) => (
            <div key={leave._id} className="bg-white border rounded-xl shadow-sm p-5 space-y-3 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#49A7F5]/10 text-[#49A7F5] flex items-center justify-center group-hover:bg-[#49A7F5] group-hover:text-white transition-all duration-300">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{leave.name}</h3>
                  <p className="text-xs text-gray-400">{leave.paid ? "Paid" : "Unpaid"} Leave</p>
                </div>
              </div>

              <div className="text-3xl font-bold text-[#49A7F5]">
                {leave.maxDays}
                <span className="text-xs font-normal text-gray-400 ml-1">Days / Year</span>
              </div>

              <div className="space-y-2 pt-3 border-t text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Accrual Mode</span>
                  <span className="font-medium text-gray-700">Yearly</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Carry Forward</span>
                  <span className={`flex items-center gap-1 font-medium ${leave.carryForward ? "text-green-600" : "text-gray-400"}`}>
                    {leave.carryForward ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {leave.carryForward ? "Allowed" : "Not Allowed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Compensation</span>
                  <span className={`font-medium ${leave.paid ? "text-blue-600" : "text-red-500"}`}>
                    {leave.paid ? "Paid Full" : "Unpaid"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {leaves.length === 0 && (
            <p className="text-sm text-gray-400 col-span-3 text-center py-10">No leave types configured yet.</p>
          )}
        </div>
      )}

      {/* ====== ATTENDANCE POLICIES ====== */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Grace Period */}
          <div className="bg-white border rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Timer size={20} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Grace Period</h3>
            <p className="text-xs text-gray-500 mb-3">Allowance before being marked late.</p>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-700">{attendance.graceTime} <span className="text-xs font-normal">Mins</span></p>
            </div>
          </div>

          {/* Late Threshold */}
          <div className="bg-white border rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#49A7F5]/10 text-[#49A7F5] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <LogIn size={20} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Late Threshold</h3>
            <p className="text-xs text-gray-500 mb-3">Penalty rules for consistent lateness.</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Late After</span>
                <span className="font-semibold">{attendance.lateAfter} Mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Penalty Rule</span>
                <span className="font-semibold text-[#49A7F5]">{attendance.lateCountHalfDay} Lates = 0.5 Day</span>
              </div>
            </div>
          </div>

          {/* Early Exit */}
          <div className="bg-white border rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <LogOut size={20} />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Early Exit Rule</h3>
            <p className="text-xs text-gray-500 mb-3">Rules for leaving before shift end time.</p>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-700">{attendance.earlyExitMinutes} <span className="text-xs font-normal">Mins</span></p>
            </div>
          </div>

          {/* Overtime */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-[#49A7F5] via-[#2D8BD8] to-[#1A73C0] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Infinity size={20} />
                  <h3 className="text-xl font-bold">Overtime Policy</h3>
                </div>
                <p className="text-white/80 text-sm">Additional hours beyond the standard shift are compensated.</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-5 py-3 text-center">
                  <p className="text-[10px] text-white/70 uppercase tracking-widest mb-1 font-bold">Threshold</p>
                  <p className="text-xl font-bold">{attendance.overtimeAfter}+ <span className="text-xs opacity-75">Hrs</span></p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-5 py-3 text-center">
                  <p className="text-[10px] text-white/70 uppercase tracking-widest mb-1 font-bold">Type</p>
                  <p className="text-xl font-bold">{attendance.overtimeType}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== COMPANY HR POLICIES ====== */}
      {activeTab === "company" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            These are the statutory HR policies of your organization. You can view details and download the official policy documents below.
          </p>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-10">No.</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Policy Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden lg:table-cell">Top 5 Requirements</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">Legal Reference</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-36">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hrPolicies.map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <span className="w-8 h-8 rounded-full bg-[#49A7F5]/10 text-[#49A7F5] text-xs font-bold flex items-center justify-center mx-auto group-hover:bg-[#49A7F5] group-hover:text-white transition-colors">
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
                            href={getDocUrl(policy.documentUrl)}
                            download={policy.documentName}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors w-full justify-center"
                          >
                            <Download size={12} />
                            Download
                          </a>
                          <a
                            href={getDocUrl(policy.documentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <ExternalLink size={10} /> View Online
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 italic">
                            <FileText size={11} />
                            Not uploaded
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {hrPolicies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400 italic">
                      <FileText size={28} className="mx-auto mb-2 opacity-30" />
                      Loading HR Policies...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 items-center text-xs text-gray-500 pb-2" >
            <span className="flex items-center gap-1.5">
              <Download size={13} className="text-blue-500" />
              Download to save the policy document
            </span>
            <span className="flex items-center gap-1.5">
              <ExternalLink size={13} className="text-gray-400" />
              View online in browser
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-green-500" />
              Policies as per Indian Labour Laws
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
