/** @format */

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  FileText,
  Upload,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Clock,
  XCircle,
} from "lucide-react";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";

const API = import.meta.env.VITE_API_URL;
const ViewAPI = API.replace("/api", "");

/* ================= TYPES ================= */

type DocumentType = "AADHAAR" | "PAN" | "MARKSHEET_12" | "PASSBOOK";
type DocStatus = "UPLOADED" | "VERIFIED" | "REJECTED";

interface UserDocument {
  _id: string;
  type: DocumentType;
  fileUrl: string;
  status: DocStatus;
  createdAt: string;
}

interface UserType {
  _id: string;
  name: string;
  fullName?: string;
  username?: string;
  employeeId?: string;
  designationId?: { name: string };
  departmentId?: { name: string };
}

/* ================= REQUIRED DOCUMENTS CONFIG ================= */

const REQUIRED_DOCUMENTS: {
  key: DocumentType;
  label: string;
  field: string;
  description: string;
  icon: string;
}[] = [
  {
    key: "AADHAAR",
    label: "Aadhaar Card",
    field: "aadhaar",
    description: "Upload your Aadhaar Card (front & back)",
    icon: "🪪",
  },
  {
    key: "PAN",
    label: "PAN Card",
    field: "pan",
    description: "Upload your PAN Card",
    icon: "🗂️",
  },
  {
    key: "MARKSHEET_12",
    label: "12th Marksheet",
    field: "marksheet10",
    description: "Upload 10th/12th/Graduation Marksheet",
    icon: "🎓",
  },
  {
    key: "PASSBOOK",
    label: "Bank Passbook",
    field: "passbook",
    description: "Upload first page of Bank Passbook",
    icon: "🏦",
  },
];

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }: { status?: DocStatus }) => {
  if (!status) return null;
  const map: Record<
    DocStatus,
    { icon: React.ReactNode; text: string; cls: string }
  > = {
    UPLOADED: {
      icon: <Clock size={13} />,
      text: "Pending Review",
      cls: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    VERIFIED: {
      icon: <ShieldCheck size={13} />,
      text: "Verified",
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    REJECTED: {
      icon: <XCircle size={13} />,
      text: "Rejected",
      cls: "bg-rose-50 text-rose-700 border border-rose-200",
    },
  };
  const { icon, text, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {icon}
      {text}
    </span>
  );
};

/* ================= COMPONENT ================= */

export default function DocumentUpload() {
  const token = localStorage.getItem("token");
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = loggedInUser?.id;

  const [user, setUser] = useState<UserType | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  // Refs to reset file input after each upload
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* ================= FETCH USER ================= */

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user || res.data);
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  };

  /* ================= FETCH DOCUMENTS ================= */

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchUser(), fetchDocuments()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const getDocument = (type: DocumentType) =>
    documents.find((d) => d.type === type);

  /* ================= UPLOAD HANDLER ================= */

  const handleUpload = async (
    file: File,
    field: string,
    type: DocumentType
  ) => {
    try {
      setUploading(field);

      const formData = new FormData();
      formData.append(field, file);

      const existingDoc = getDocument(type);

      if (existingDoc) {
        // UPDATE existing document
        await axios.put(
          `${API}/documents/update/${existingDoc._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast({
          type: "success",
          title: "Document Updated",
          message: "Document has been updated successfully",
        });
      } else {
        // FIRST TIME UPLOAD
        await axios.post(
          `${API}/documents/upload/${userId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast({
          type: "success",
          title: "Document Uploaded",
          message: "Document has been uploaded successfully",
        });
      }

      // Reset file input
      const inputRef = fileInputRefs.current[field];
      if (inputRef) inputRef.value = "";

      await fetchDocuments();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Upload Failed",
        message:
          error?.response?.data?.message ||
          "Document upload failed, please try again",
      });
      console.error("Upload failed", error);
    } finally {
      setUploading(null);
    }
  };

  /* ================= UI STATES ================= */

  if (loading) return <Loader />;
  if (!user) return <div className="p-6 text-red-500">User not found</div>;

  const nameToUse = user.fullName || user.name || user.username || "User";
  const initials = nameToUse
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const uploadedCount = REQUIRED_DOCUMENTS.filter((d) =>
    getDocument(d.key)
  ).length;
  const progress = Math.round((uploadedCount / REQUIRED_DOCUMENTS.length) * 100);

  /* ================= UI ================= */

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Document Upload
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload all mandatory documents for KYC verification
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ================= USER INFO SIDEBAR ================= */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center sticky top-6 space-y-4">
            {/* Avatar */}
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initials}
            </div>

            <div>
              <h2 className="text-base font-bold text-gray-900">{nameToUse}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {user.employeeId || "—"}
              </p>
              {user.designationId?.name && (
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  {user.designationId.name}
                </p>
              )}
              {user.departmentId?.name && (
                <p className="text-xs text-gray-400">
                  {user.departmentId.name}
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="font-medium">Documents</span>
                <span className="font-bold text-indigo-600">
                  {uploadedCount}/{REQUIRED_DOCUMENTS.length}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress === 100
                        ? "linear-gradient(90deg, #10b981, #059669)"
                        : "linear-gradient(90deg, #6366f1, #3b82f6)",
                  }}
                />
              </div>
              <p className="text-xs text-center mt-1.5 font-semibold text-gray-600">
                {progress}% complete
              </p>
            </div>
          </div>
        </div>

        {/* ================= DOCUMENT LIST ================= */}
        <div className="lg:col-span-3 space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const uploadedDoc = getDocument(doc.key);
            const isUploaded = !!uploadedDoc;
            const isUploading = uploading === doc.field;

            return (
              <div
                key={doc.key}
                className={`bg-white border rounded-xl shadow-sm p-5 transition-all duration-200 ${
                  isUploaded
                    ? "border-l-4 border-l-indigo-400"
                    : "border-l-4 border-l-amber-300"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* LEFT — Doc info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        isUploaded ? "bg-indigo-50" : "bg-gray-100"
                      }`}
                    >
                      {doc.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {doc.label}
                        </h3>
                        {isUploaded ? (
                          <StatusBadge status={uploadedDoc.status} />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={12} />
                            Pending
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">{doc.description}</p>

                      {isUploaded && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={12} />
                          <span>
                            Uploaded on{" "}
                            {new Date(
                              uploadedDoc.createdAt
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT — Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* VIEW */}
                    {isUploaded && (
                      <a
                        href={`${ViewAPI}/${uploadedDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-700 transition-colors font-medium"
                      >
                        <Eye size={14} />
                        View
                      </a>
                    )}

                    {/* UPLOAD / RE-UPLOAD */}
                    <label
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg cursor-pointer font-semibold transition-all shadow-sm active:scale-95 ${
                        isUploading
                          ? "bg-indigo-400 text-white cursor-not-allowed"
                          : isUploaded
                          ? "bg-gray-800 text-white hover:bg-gray-900"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          {isUploaded ? (
                            <RefreshCw size={14} />
                          ) : (
                            <Upload size={14} />
                          )}
                          {isUploaded ? "Re-Upload" : "Upload"}
                        </>
                      )}
                      <input
                        ref={(el) => (fileInputRefs.current[doc.field] = el)}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        hidden
                        disabled={isUploading}
                        onChange={(e) =>
                          e.target.files &&
                          handleUpload(e.target.files[0], doc.field, doc.key)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ================= COMPLETION BANNER ================= */}
          {uploadedCount === REQUIRED_DOCUMENTS.length && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              <CheckCircle size={20} className="shrink-0" />
              <div>
                <p className="text-sm font-bold">All documents uploaded!</p>
                <p className="text-xs text-emerald-600">
                  Your documents are pending review by the HR team.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
