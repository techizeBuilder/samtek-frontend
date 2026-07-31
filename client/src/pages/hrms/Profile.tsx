/** @format */

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams } from "wouter";
import {
  Mail,
  Phone,
  User,
  Calendar,
  Building2,
  Users,
  Eye,
  Key,
  Pencil,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Clock,
  XCircle,
} from "lucide-react";
import ChangePasswordModal from "@/pages/ChangePasswordModal";
import Loader from "@/pages/hrms/Loader";
import { Camera } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const BASE_URL = API?.replace("/api", "") || "";

interface UserType {
  _id: string;
  employeeId: string;
  name: string;
  fullName?: string;
  email: string;
  mobile: string;
  gender: string;
  dob: string;
  joiningDate: string;
  role: string;
  status: string;
  employmentType: string;
  employmentStatus: "PROBATION" | "CONFIRMED";
  probationEndDate: string;
  profilePicture?: string;
  isActive: boolean;
  companyId?: { _id: string; name: string };
  branchId?: { _id: string; name: string };
  departmentId?: { _id: string; name: string };
  designationId?: { _id: string; name: string };
  managerId?: { _id: string; name: string; fullName?: string };
  costCenterId?: { _id: string; name: string; code?: string };
  // New fields
  probationJustification?: string;
  isResigned?: boolean;
  isTerminated?: boolean;
  terminationDate?: string;
  terminationReason?: string;
  confirmationDate?: string;
  permissions?: any;
}

const ROLE_MODULES_CONFIG: Record<string, { moduleName: string; features: { key: string; label: string }[] }> = {
  "Sales Employee": {
    moduleName: "sales",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "orders", label: "My Orders" },
      { key: "myCustomers", label: "My Customers" },
      { key: "myDeliveries", label: "My Dispatches" },
      { key: "myInvoices", label: "My Payments" },
      { key: "returns", label: "Returns" },
      { key: "damages", label: "Damages" }
    ]
  },
  "Dispatch Employee": {
    moduleName: "dispatches",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "deliveryChallan", label: "Delivery Challan" },
      { key: "dispatchHistory", label: "History" }
    ]
  },
  "Production Employee": {
    moduleName: "production",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "productionSheet", label: "Production Sheet" },
      { key: "productionReports", label: "Production Reports" }
    ]
  },
  "Packing Employee": {
    moduleName: "packing",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "packingSheet", label: "Packing Sheet" },
      { key: "packingHistory", label: "Packing History" }
    ]
  },
  "Account Employee": {
    moduleName: "accounts",
    features: [
      { key: "dashboard", label: "Dashboard" },
      { key: "sales", label: "Sales" },
      { key: "purchases", label: "Purchases" },
      { key: "gstAndTds", label: "GST & TDS" },
      { key: "expenses", label: "Expenses" },
      { key: "salesmanSettlement", label: "Salesman Settlement" },
      { key: "bankAndCash", label: "Bank & Cash" },
      { key: "reports", label: "Reports" },
      { key: "settings", label: "Settings" }
    ]
  }
};

type DocStatus = "UPLOADED" | "VERIFIED" | "REJECTED";
type DocumentType = "AADHAAR" | "PAN" | "MARKSHEET_12" | "PASSBOOK";

interface UserDocumentType {
  _id: string;
  type: DocumentType;
  fileUrl: string;
  status: DocStatus;
  createdAt: string;
}

const DOC_LABELS: Record<DocumentType, { label: string; icon: string }> = {
  AADHAAR: { label: "Aadhaar Card", icon: "🪪" },
  PAN: { label: "PAN Card", icon: "🗂️" },
  MARKSHEET_12: { label: "12th Marksheet", icon: "🎓" },
  PASSBOOK: { label: "Bank Passbook", icon: "🏦" },
};

export default function Profile() {
  const token = localStorage.getItem("token");
  const { id: userId } = useParams<{ id: string }>();

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<UserDocumentType[]>([]);

  const [openPersonal, setOpenPersonal] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openJobInfo, setOpenJobInfo] = useState(false);
  const [openPermissions, setOpenPermissions] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: "",
    gender: "",
    dob: "",
    email: "",
    mobile: "",
  });

  const [jobForm, setJobForm] = useState({
    managerId: "",
    employmentType: "",
    employmentStatus: "",
    probationEndDate: "",
    departmentId: "",
    designationId: "",
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  // Flow State
  const [flowState, setFlowState] = useState({
    isConfirmed: false,
    confirmationDate: "",
    probationJustification: "",
    isResigned: false,
    isTerminated: false,
    terminationDate: "",
    terminationReason: "",
  });

  // Profile picture upload
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data.user || res.data;
      setUser(userData);

      if (userData) {
        setForm({
          name: userData.fullName || userData.name || "",
          gender: userData.gender || "",
          dob: userData.dob?.slice(0, 10) || "",
          email: userData.email || "",
          mobile: userData.mobile || "",
        });

        setJobForm({
          managerId: userData.reportingManager || "",
          employmentType: userData.employeeType || "",
          employmentStatus: userData.employmentStatus || "",
          probationEndDate: userData.probationEndDate?.slice(0, 10) || "",
          departmentId: userData.departmentId?._id || "",
          designationId: userData.designationId?._id || "",
        });

        setFlowState({
          isConfirmed: userData.employmentStatus === "CONFIRMED",
          confirmationDate: userData.confirmationDate?.slice(0, 10) || "",
          probationJustification: userData.probationJustification || "",
          isResigned: !!userData.isResigned,
          isTerminated: !!userData.isTerminated,
          terminationDate: userData.terminationDate?.slice(0, 10) || "",
          terminationReason: userData.terminationReason || "",
        });

        if (userData.permissions && userData.permissions.modules && userData.permissions.modules.length > 0) {
          const mod = userData.permissions.modules[0];
          const initialFeatures: Record<string, boolean> = {};
          if (mod.dashboard) initialFeatures["dashboard"] = true;
          if (mod.features) {
            mod.features.forEach((f: any) => {
              if (f.view) initialFeatures[f.key] = true;
            });
          }
          setSelectedFeatures(initialFeatures);
        } else if (ROLE_MODULES_CONFIG[userData.role]) {
           const initialFeatures: Record<string, boolean> = {};
           ROLE_MODULES_CONFIG[userData.role].features.forEach(f => initialFeatures[f.key] = true);
           setSelectedFeatures(initialFeatures);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch user", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/documents/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const updateUser = async (payload: Partial<UserType>) => {
    try {
      await axios.patch(`${API}/users/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUser();
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allUsers = res.data.users || res.data.data?.users || res.data || [];
      const managerUsers = allUsers.filter((u: any) => u.role?.toLowerCase() === "manager");
      setManagers(managerUsers);
    } catch (err) {
      console.error("Failed to fetch managers", err);
      setManagers([]);
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicPreview(reader.result as string);
    reader.readAsDataURL(file);
    // Auto-upload
    try {
      setUploadingPic(true);
      const fd = new FormData();
      fd.append("profilePicture", file);
      await axios.patch(`${API}/users/${userId}/profile-picture`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      fetchUser();
    } catch (err) {
      console.error("Profile pic upload failed", err);
    } finally {
      setUploadingPic(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchDocuments();
    }
  }, [userId]);

  useEffect(() => {
    fetchManagers();
  }, []);

  // Departments linked to this employee's Company
  useEffect(() => {
    const companyId = user?.companyId?._id;
    if (!companyId) {
      setDepartments([]);
      return;
    }
    axios
      .get(`${API}/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDepartments(res.data || []))
      .catch(() => setDepartments([]));
  }, [user?.companyId?._id]);

  // Designations linked to the selected Department
  useEffect(() => {
    const companyId = user?.companyId?._id;
    if (!companyId || !jobForm.departmentId) {
      setDesignations([]);
      return;
    }
    axios
      .get(`${API}/designations?companyId=${companyId}&departmentId=${jobForm.departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDesignations(res.data || []))
      .catch(() => setDesignations([]));
  }, [user?.companyId?._id, jobForm.departmentId]);


  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  if (!user) return <div className="p-6 text-red-500">User not found</div>;

  const nameToUse = user.fullName || user.name || "";
  const initials = nameToUse
    ? nameToUse
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "??";

  const profilePicUrl = profilePicPreview ||
    (user.profilePicture
      ? (user.profilePicture.startsWith("http") ? user.profilePicture : `${BASE_URL}${user.profilePicture}`)
      : null);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-800">Personal Information</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Card */}
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center">
            {/* Avatar with upload button */}
            <div className="relative w-24 h-24 mx-auto mb-1">
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={nameToUse}
                  className="w-24 h-24 rounded-full object-cover border-4 border-orange-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-semibold">
                  {initials}
                </div>
              )}
              {/* Camera overlay */}
              <button
                type="button"
                onClick={() => picRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white shadow hover:bg-orange-600 transition-colors"
                title="Change profile picture"
              >
                {uploadingPic ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
              </button>
              <input
                ref={picRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePicChange}
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900">{nameToUse}</h2>
            <p className="text-sm text-gray-500">{user.employeeId}</p>

            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${user.isActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}
            >
              {user.isActive ? "Active Employee" : "Inactive Employee"}
            </span>

            <div className="mt-3 text-sm text-gray-500">
              <p className="font-medium text-gray-700">{user.role}</p>
            </div>

            <span
              className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.employmentStatus === "CONFIRMED"
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
                }`}
            >
              {user.employmentStatus}
            </span>

            <div className="mt-4 text-xs text-gray-500">
              Joined on{" "}
              <span className="font-medium text-gray-700">
                {new Date(user.joiningDate).toDateString()}
              </span>
            </div>

            <button
              onClick={() => setOpenChangePassword(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg active:scale-95"
            >
              <Key size={16} />
              Change Password
            </button>
          </div>

          {/* ================= DOCUMENTS SECTION (SEPARATE CARD) ================= */}
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              Documents
            </h3>

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-gray-400 gap-1">
                <p className="text-xs">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const meta = DOC_LABELS[doc.type] || { label: doc.type, icon: "📄" };
                  return (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between gap-2 p-2.5 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{meta.icon}</span>
                        <p className="text-xs font-semibold text-gray-800 truncate">{meta.label}</p>
                      </div>
                      <a
                        href={`${BASE_URL}/${doc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 p-1.5 bg-white border shadow-sm text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


        {/* ================= RIGHT DETAILS ================= */}
        <div className="lg:col-span-3 space-y-6">
          <Section
            title="Personal Details"
            onEdit={() => setOpenPersonal(true)}
          >
            <Info label="Full Name" value={user.fullName || user.name} icon={<User />} />
            <Info label="Gender" value={user.gender} />
            <Info
              label="Date of Birth"
              value={new Date(user.dob).toDateString()}
              icon={<Calendar />}
            />
          </Section>

          <Section
            title="Contact Information"
            onEdit={() => setOpenContact(true)}
          >
            <Info label="Email" value={user.email} icon={<Mail />} />
            <Info label="Mobile" value={user.mobile} icon={<Phone />} />
          </Section>

          <Section title="Job Information" onEdit={() => setOpenJobInfo(true)}>
            <Info
              label="Company"
              value={user.companyId?.name}
              icon={<Building2 />}
            />
            <Info
              label="Department"
              value={user.departmentId?.name}
              icon={<Building2 />}
            />
            <Info
              label="Designation"
              value={user.designationId?.name}
              icon={<Users />}
            />
            <Info
              label="Reporting Manager"
              value={user.reportingManager?.fullName || user.reportingManager?.name || "—"}
              icon={<Users />}
            />
            <Info label="Employment Type" value={user.employmentType} />
            <Info
              label="Probation Ends"
              value={user.probationEndDate ? new Date(user.probationEndDate).toDateString() : "—"}
            />
          </Section>

          {/* ================= MODULE PERMISSIONS ================= */}
          {ROLE_MODULES_CONFIG[user.role] && (
            <Section title={`Module Permissions (${ROLE_MODULES_CONFIG[user.role].moduleName})`} onEdit={() => setOpenPermissions(true)}>
              <div className="col-span-1 md:col-span-2 flex flex-wrap gap-2">
                {ROLE_MODULES_CONFIG[user.role].features.map(f => {
                  if (selectedFeatures[f.key]) {
                    return (
                      <span key={f.key} className="px-3 py-1 bg-[#49A7F5]/10 text-[#49A7F5] border border-[#49A7F5]/20 rounded-full text-xs font-semibold">
                        {f.label}
                      </span>
                    );
                  }
                  return null;
                })}
                {Object.keys(selectedFeatures).filter(k => selectedFeatures[k]).length === 0 && (
                  <span className="text-gray-400 text-xs italic">No permissions assigned</span>
                )}
              </div>
            </Section>
          )}


          {/* ================= PROBATION CONFIRMATION SECTION ================= */}
          <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-bold text-gray-700 uppercase">Probation Confirmation:</span>
                  <input
                    type="checkbox"
                    checked={flowState.isConfirmed}
                    onChange={(e) => setFlowState({ ...flowState, isConfirmed: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[#49A7F5] focus:ring-[#49A7F5]"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Date:</span>
                  <input
                    type="date"
                    value={flowState.confirmationDate}
                    onChange={(e) => setFlowState({ ...flowState, confirmationDate: e.target.value })}
                    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  updateUser({
                    employmentStatus: flowState.isConfirmed ? "CONFIRMED" : "PROBATION",
                    confirmationDate: flowState.confirmationDate,
                    probationJustification: flowState.probationJustification,
                  });
                }}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
              >
                Save Confirmation
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Free Text (Evaluation Criteria / Justification)</label>
              <textarea
                value={flowState.probationJustification}
                onChange={(e) => setFlowState({ ...flowState, probationJustification: e.target.value })}
                placeholder="Enter evaluation criteria based on which resource is moved from probation to confirmation..."
                className="w-full border rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50/30"
              />
            </div>
          </div>

          {/* ================= RESIGNATION / TERMINATION SECTION ================= */}
          <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-8 border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-bold text-gray-700 uppercase">Resigned:</span>
                <input
                  type="checkbox"
                  checked={flowState.isResigned}
                  onChange={(e) => setFlowState({ ...flowState, isResigned: e.target.checked, isTerminated: false })}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-bold text-gray-700 uppercase">Terminated:</span>
                <input
                  type="checkbox"
                  checked={flowState.isTerminated}
                  onChange={(e) => setFlowState({ ...flowState, isTerminated: e.target.checked, isResigned: false })}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase">Date:</span>
                <input
                  type="date"
                  value={flowState.terminationDate}
                  onChange={(e) => setFlowState({ ...flowState, terminationDate: e.target.value })}
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#49A7F5]"
                />
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    updateUser({
                      isResigned: flowState.isResigned,
                      isTerminated: flowState.isTerminated,
                      terminationDate: flowState.terminationDate,
                      terminationReason: flowState.terminationReason,
                      status: (flowState.isResigned || flowState.isTerminated) ? "INACTIVE" : "ACTIVE",
                    });
                  }}
                  className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm"
                >
                  Save Status Changes
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Reason (Free Text)</label>
              <textarea
                value={flowState.terminationReason}
                onChange={(e) => setFlowState({ ...flowState, terminationReason: e.target.value })}
                placeholder="Manager enter the reasons based on which a resource has resigned or is terminated..."
                className="w-full border rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-[#49A7F5] bg-gray-50/30 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= PERSONAL MODAL ================= */}
      {openPersonal && (
        <Modal
          title="Edit Personal Details"
          onClose={() => setOpenPersonal(false)}
        >
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e: any) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Gender"
            value={form.gender}
            onChange={(e: any) => setForm({ ...form, gender: e.target.value })}
          />
          <Input
            type="date"
            label="Date of Birth"
            value={form.dob}
            onChange={(e: any) => setForm({ ...form, dob: e.target.value })}
          />
          <ModalActions
            onSave={() => {
              updateUser({
                name: form.name,
                gender: form.gender,
                dob: form.dob,
              });
              setOpenPersonal(false);
            }}
            onCancel={() => setOpenPersonal(false)}
          />
        </Modal>
      )}

      {/* ================= CONTACT MODAL ================= */}
      {openContact && (
        <Modal
          title="Edit Contact Information"
          onClose={() => setOpenContact(false)}
        >
          <Input
            label="Email"
            value={form.email}
            onChange={(e: any) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Mobile"
            value={form.mobile}
            onChange={(e: any) => setForm({ ...form, mobile: e.target.value })}
          />
          <ModalActions
            onSave={() => {
              updateUser({ email: form.email, mobile: form.mobile });
              setOpenContact(false);
            }}
            onCancel={() => setOpenContact(false)}
          />
        </Modal>
      )}

      {/* ================= JOB INFO MODAL ================= */}
      {openJobInfo && (
        <Modal
          title="Edit Job Information"
          onClose={() => setOpenJobInfo(false)}
        >
          <Select
            label="Department"
            value={jobForm.departmentId}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, departmentId: e.target.value, designationId: "" })
            }
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Select
            label="Designation"
            value={jobForm.designationId}
            disabled={!jobForm.departmentId}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, designationId: e.target.value })
            }
          >
            <option value="">Select Designation</option>
            {designations.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Select
            label="Reporting Manager"
            value={jobForm.managerId}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, managerId: e.target.value })
            }
          >
            <option value="">Select Manager</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.fullName || m.name}
              </option>
            ))}
          </Select>

          <Select
            label="Employment Type"
            value={jobForm.employmentType}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, employmentType: e.target.value })
            }
          >
            <option value="">Select Employment Type</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Intern">Intern</option>
            <option value="Contract">Contract</option>
          </Select>

          <Select
            label="Employment Status"
            value={jobForm.employmentStatus}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, employmentStatus: e.target.value })
            }
          >
            <option value="">Select Status</option>
            <option value="PROBATION">PROBATION</option>
            <option value="CONFIRMED">CONFIRMED</option>
          </Select>

          <Input
            type="date"
            label="Probation End Date"
            value={jobForm.probationEndDate}
            onChange={(e: any) =>
              setJobForm({ ...jobForm, probationEndDate: e.target.value })
            }
          />

          <ModalActions
            onSave={() => {
              updateUser({
                managerId: jobForm.managerId as any,
                employmentType: jobForm.employmentType,
                employmentStatus: jobForm.employmentStatus as any,
                probationEndDate: jobForm.probationEndDate,
                departmentId: jobForm.departmentId as any,
                designationId: jobForm.designationId as any,
              });
              setOpenJobInfo(false);
            }}
            onCancel={() => setOpenJobInfo(false)}
          />
        </Modal>
      )}

      {/* ================= PERMISSIONS MODAL ================= */}
      {openPermissions && ROLE_MODULES_CONFIG[user.role] && (
        <Modal
          title="Edit Module Permissions"
          onClose={() => setOpenPermissions(false)}
        >
          <div className="space-y-3">
            {ROLE_MODULES_CONFIG[user.role].features.map((feature) => (
              <label key={feature.key} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:border-[#49A7F5]/30 hover:bg-[#49A7F5]/5 transition-colors cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedFeatures[feature.key] || false}
                  onChange={(e) => setSelectedFeatures(prev => ({ ...prev, [feature.key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-[#49A7F5] focus:ring-[#49A7F5]"
                />
                <span className="text-sm font-medium text-gray-700">{feature.label}</span>
              </label>
            ))}
          </div>

          <ModalActions
            onSave={() => {
              const config = ROLE_MODULES_CONFIG[user.role];
              const hasDashboard = selectedFeatures["dashboard"] || false;
              const featuresArray = config.features
                .filter(f => f.key !== "dashboard" && selectedFeatures[f.key])
                .map(f => ({
                  key: f.key,
                  view: true,
                  add: true,
                  edit: true,
                  delete: false,
                  alter: false
                }));

              const newPermissions = {
                role: user.role,
                canAccessAllUnits: false,
                modules: [
                  {
                    name: config.moduleName,
                    dashboard: hasDashboard,
                    features: featuresArray
                  }
                ]
              };

              updateUser({ permissions: newPermissions });
              setOpenPermissions(false);
            }}
            onCancel={() => setOpenPermissions(false)}
          />
        </Modal>
      )}
      {/* ================= CHANGE PASSWORD MODAL ================= */}
      <ChangePasswordModal
        isOpen={openChangePassword}
        userId={userId || ""}
        isAdminView={true}
        onClose={() => setOpenChangePassword(false)}
      />
    </div>
  );
}

/* ================= SHARED COMPONENTS ================= */

const Section = ({ title, children, onEdit }: any) => (
  <div className="bg-white border rounded-xl shadow-sm p-5 relative">
    <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">
      {title}
    </h3>
    {onEdit && (
      <button
        onClick={onEdit}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
      >
        <Pencil size={16} />
      </button>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Info = ({ label, value, icon }: any) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-1 text-gray-400">{icon}</div>}
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
    </div>
  </div>
);

const Modal = ({ title, children, onClose }: any) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-white w-full max-w-md rounded-xl relative flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 rounded-lg p-1 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="px-6 py-5 overflow-y-auto flex-1">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  </div>
);


const Input = ({ label, ...props }: any) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#49A7F5]/50 focus:border-transparent transition-all"
    />
  </div>
);

const ModalActions = ({ onSave, onCancel }: any) => (
  <div className="flex justify-end gap-3 pt-6 border-t mt-4">
    <button onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors">
      Cancel
    </button>
    <button
      onClick={onSave}
      className="px-5 py-2 text-sm font-semibold bg-[#49A7F5] text-white rounded-lg hover:bg-[#3D96E1] transition-colors shadow-md active:scale-95"
    >
      Save Changes
    </button>
  </div>
);

const Select = ({ label, children, ...props }: any) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
    <select
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#49A7F5]/50 transition-all cursor-pointer"
    >
      {children}
    </select>
  </div>
);

