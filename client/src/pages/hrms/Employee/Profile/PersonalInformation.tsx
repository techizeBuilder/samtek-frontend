/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Mail,
  Phone,
  User,
  Calendar,
  Briefcase,
  Building2,
  Eye,
  Key,
  ShieldCheck,
  FileText,
  Users,
  Pencil,
  X,
  LogOut,
  MapPin,
} from "lucide-react";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";
import ChangePasswordModal from "@/pages/ChangePasswordModal";

const API = import.meta.env.VITE_API_URL;
const BASE_URL = API?.replace("/api", "") || "";

interface UserDoc {
  _id: string;
  type: string;
  fileUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  fileName?: string;
}

interface UserType {
  _id: string;
  employeeId?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  mobile?: string;
  address?: string;
  gender?: string;
  dob?: string;
  joiningDate?: string;
  role: string;
  status?: string;
  isActive?: boolean;
  employmentType?: string;
  employeeType?: string;
  employmentStatus?: string;
  probationEndDate?: string;
  probationJustification?: string;
  confirmationDate?: string;
  isResigned?: boolean;
  isTerminated?: boolean;
  terminationDate?: string;
  terminationReason?: string;
  companyId?: { name: string; unitName?: string };
  branchId?: { name: string };
  departmentId?: { name: string };
  designationId?: { name: string };
  managerId?: { name: string };
  reportingManager?: { name: string; fullName?: string };
  documents?: UserDoc[];
}

const DOC_LABEL_MAP: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  MARKSHEET_10: "10th Marksheet",
  MARKSHEET_12: "12th Marksheet",
  DEGREE_CERTIFICATE: "Degree Certificate",
  PASSBOOK: "Bank Passbook",
};

export default function PersonalInformation() {
  const token = localStorage.getItem("token");
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = loggedInUser?.id;

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const [openPersonal, setOpenPersonal] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]);

  const [form, setForm] = useState({
    name: "",
    gender: "",
    dob: "",
    email: "",
    mobile: "",
    address: "",
  });

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = res.data.user || res.data;
      setUser(userData);
      setForm({
        name: userData.fullName || userData.name || userData.username || "",
        gender: userData.gender || "",
        dob: userData.dob ? userData.dob.slice(0, 10) : "",
        email: userData.email || "",
        mobile: userData.mobile || "",
        address: userData.address || "",
      });
    } catch (err) {
      console.error("Failed to fetch user", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocs = async () => {
    try {
      const res = await axios.get(`${API}/documents/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = res.data;
      setUserDocs(Array.isArray(raw) ? raw : raw?.data ?? raw?.documents ?? []);
    } catch (err) {
      console.error("Failed to fetch user documents", err);
      setUserDocs([]);
    }
  };

  const updateUser = async (payload: Partial<UserType>) => {
    try {
      const res = await axios.patch(`${API}/users/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Profile Updated",
        message: res.data?.message || "User updated successfully",
      });

      fetchUser();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Update Failed",
        message:
          error?.response?.data?.message ||
          "Failed to update user, please try again",
      });
      console.error("Update user failed", error);
    }
  };


  useEffect(() => {
    fetchUser();
    fetchUserDocs();
  }, []);

  if (loading)
    return <Loader />
  if (!user) return <div className="p-6 text-red-500">User not found</div>;

  const initials = (user.name || user.fullName || user.username || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Personal Information</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ================= LEFT PROFILE CARD ================= */}
        <div className="lg:col-span-1 space-y-6 sticky top-6 h-fit">
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-semibold">
              {initials}
            </div>

            <h2 className="mt-4 text-lg font-semibold">{user.fullName || user.name || user.username || "—"}</h2>
            {/* <p className="text-sm text-gray-500">{user.employeeId || "—"}</p> */}

            <div className="mt-2 text-sm">
              {/* <p className="font-medium">{user.designationId?.name || "—"}</p> */}
              <p className="text-gray-500">{user.departmentId?.name || "—"}</p>
            </div>

            {/* ACTIVE / INACTIVE BADGE */}
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${user.isActive || user.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-rose-100 text-rose-700 border border-rose-200"
                }`}
            >
              {user.isActive || user.status === "ACTIVE" ? "Active Employee" : "Inactive Employee"}
            </span>

            <span
              className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${user.employmentStatus === "CONFIRMED"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
                }`}
            >
              {user.employmentStatus || "PROBATION"}
            </span>

            <div className="mt-4 text-xs text-gray-500">
              Joined on{" "}
              <span className="font-medium text-gray-700">
                {user.joiningDate && !isNaN(new Date(user.joiningDate).getTime())
                  ? new Date(user.joiningDate).toLocaleDateString()
                  : "—"}
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

          {/* Uploaded Documents Section */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden mt-6">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest leading-none">Uploaded Documents</h3>
              <FileText size={14} className="text-gray-400" />
            </div>
            <div className="p-4 space-y-4">
              {userDocs && userDocs.length > 0 ? (
                userDocs.map((doc) => (
                  <div key={doc._id} className="p-3 border rounded-lg bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-600 truncate mr-2" title={DOC_LABEL_MAP[doc.type] || doc.type}>
                        {DOC_LABEL_MAP[doc.type] || doc.type}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${doc.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 mb-2 truncate">
                      {doc.fileName || doc.fileUrl.split('/').pop()}
                    </div>
                    <a
                      href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${BASE_URL}/${doc.fileUrl.replace(/\\/g, '/')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={12} /> View Document
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-4 italic">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT DETAILS ================= */}
        <div className="lg:col-span-3 space-y-6">
          {/* -------- Personal Details -------- */}
          <Section
            title="Personal Details"
            onEdit={() => setOpenPersonal(true)}
          >
            <Info label="Full Name" value={user.fullName || user.name || user.username} icon={<User />} />
            <Info label="Gender" value={user.gender} />
            <Info
              label="Date of Birth"
              value={user.dob && !isNaN(new Date(user.dob).getTime()) ? new Date(user.dob).toLocaleDateString() : "—"}
              icon={<Calendar />}
            />
          </Section>

          {/* -------- Contact Information -------- */}
          <Section
            title="Contact Information"
            onEdit={() => setOpenContact(true)}
          >
            <Info label="Email" value={user.email} icon={<Mail />} />
            <Info label="Mobile" value={user.mobile} icon={<Phone />} />
            <Info label="Address" value={user.address} icon={<MapPin />} />
          </Section>

          {/* -------- Job Information -------- */}
          <Section title="Job Information">
            <Info
              label="Company"
              value={user.companyId?.name}
              icon={<Building2 />}
            />
            <Info label="Unit" value={user?.companyId?.unitName || "—"} />
            <Info label="Department" value={user.departmentId?.name || "—"} />
            <Info
              label="Designation"
              value={user.designationId?.name || "—"}
              icon={<Briefcase />}
            />
            <Info
              label="Reporting Manager"
              value={user.reportingManager?.fullName || user.reportingManager?.name || user.managerId?.name}
              icon={<Users />}
            />
            <Info label="Employment Type" value={user.employeeType || user.employmentType} />
            <Info
              label="Probation Ends"
              value={user.probationEndDate && !isNaN(new Date(user.probationEndDate).getTime()) ? new Date(user.probationEndDate).toLocaleDateString() : "—"}
            />
          </Section>

          {/* -------- Probation / Confirmation Details -------- */}
          <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <ShieldCheck className="text-orange-500" size={20} />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Probation & Confirmation Status</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase">Current Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.employmentStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {user.employmentStatus}
                </span>
              </div>

              {user.confirmationDate && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Confirmation Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(user.confirmationDate).toDateString()}</p>
                </div>
              )}
            </div>

            {user.probationJustification && (
              <div className="pt-2 space-y-1.5 border-t">
                <p className="text-xs font-bold text-gray-500 uppercase leading-none">Evaluation / Justification</p>
                <div className="bg-gray-50/50 rounded-xl p-4 text-sm text-gray-600 border italic">
                  "{user.probationJustification}"
                </div>
              </div>
            )}
          </div>

          {/* -------- Resignation / Termination (If applicable) -------- */}
          {(user.isResigned || user.isTerminated) && (
            <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <LogOut className="text-red-500" size={20} />
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  {user.isResigned ? "Resignation Details" : "Termination Details"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Effective Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {user.terminationDate ? new Date(user.terminationDate).toDateString() : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Exit Status</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    {user.isResigned ? "RESIGNED" : "TERMINATED"}
                  </span>
                </div>
              </div>

              {user.terminationReason && (
                <div className="pt-2 space-y-1.5 border-t">
                  <p className="text-xs font-bold text-gray-500 uppercase leading-none">Reason for Exit</p>
                  <div className="bg-red-50/30 rounded-xl p-4 text-sm text-gray-600 border border-red-100 italic">
                    "{user.terminationReason}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= CHANGE PASSWORD MODAL ================= */}
      <ChangePasswordModal
        isOpen={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
        userId={user._id}
      />

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
                fullName: form.name,
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
          <div>
            <label className="text-xs text-gray-500">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Your residential address"
            />
          </div>
          <ModalActions
            onSave={() => {
              updateUser({ email: form.email, mobile: form.mobile, address: form.address });
              setOpenContact(false);
            }}
            onCancel={() => setOpenContact(false)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Section = ({ title, children, onEdit }: any) => (
  <div className="bg-white border rounded-xl shadow-sm p-5 relative">
    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">
      {title}
    </h3>
    {onEdit && (
      <button
        onClick={onEdit}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
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
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
    </div>
  </div>
);

const Modal = ({ title, children, onClose }: any) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    onClick={onClose} // 👈 outside click
  >
    <div
      className="bg-white w-full max-w-md rounded-xl p-6 relative"
      onClick={(e) => e.stopPropagation()} // 👈 inside click stop
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  </div>
);


const Input = ({ label, ...props }: any) => (
  <div>
    <label className="text-xs text-gray-500">{label}</label>
    <input
      {...props}
      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
    />
  </div>
);

const ModalActions = ({ onSave, onCancel }: any) => (
  <div className="flex justify-end gap-2 pt-4">
    <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-md">
      Cancel
    </button>
    <button
      onClick={onSave}
      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md"
    >
      Save
    </button>
  </div>
);
