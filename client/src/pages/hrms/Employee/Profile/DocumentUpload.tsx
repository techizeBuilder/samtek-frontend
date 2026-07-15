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
  Lock,
} from "lucide-react";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";

const API = import.meta.env.VITE_API_URL;
const ViewAPI = API.replace("/api", "");

/* ================= TYPES ================= */

// Document "type" is now a free-form key sourced from
// AdminSettings.hrmsDocumentTypes (admin-configurable), not a fixed union.
type DocumentType = string;
type DocStatus = "UPLOADED" | "VERIFIED" | "REJECTED";

interface UserDocument {
  _id: string;
  type: DocumentType;
  fileUrl: string;
  status: DocStatus;
  createdAt: string;
  remarks?: string;
}

interface DocumentTypeConfig {
  _id: string;
  key: string;
  label: string;
  description: string;
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

// Fallback used only until the admin-settings request resolves (or if the
// company has never opened Admin Settings > HRMS Setting > Upload Document
// Setting yet, in which case the backend seeds these same defaults anyway).
const REQUIRED_DOCUMENTS_FALLBACK: DocumentTypeConfig[] = [
  { _id: "AADHAAR", key: "AADHAAR", label: "Aadhaar Card", description: "Upload your Aadhaar Card (front & back)" },
  { _id: "PAN", key: "PAN", label: "PAN Card", description: "Upload your PAN Card" },
  { _id: "MARKSHEET_12", key: "MARKSHEET_12", label: "12th Marksheet", description: "Upload 10th/12th/Graduation Marksheet" },
  { _id: "PASSBOOK", key: "PASSBOOK", label: "Bank Passbook", description: "Upload first page of Bank Passbook" },
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
  const [docTypes, setDocTypes] = useState<DocumentTypeConfig[]>(REQUIRED_DOCUMENTS_FALLBACK);
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

  /* ================= FETCH DOCUMENT TYPE SETTINGS ================= */

  const fetchDocTypes = async () => {
    try {
      const res = await axios.get(`${API}/admin-settings/hrms-document-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.data;
      if (Array.isArray(list) && list.length > 0) {
        setDocTypes(list);
      }
    } catch (error) {
      console.error("Failed to fetch document type settings, using defaults", error);
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
    Promise.all([fetchUser(), fetchDocTypes(), fetchDocuments()]).finally(() =>
      setLoading(false)
    );
  }, []);

  // Picks the most recently uploaded document of a given type — guards
  // against stale duplicate rows left over from before re-upload was fixed
  // to update in place instead of ever inserting a second copy.
  const getDocument = (type: DocumentType) =>
    documents
      .filter((d) => d.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  /* ================= UPLOAD HANDLER ================= */

  const handleUpload = async (
    file: File,
    type: DocumentType
  ) => {
    try {
      setUploading(type);

      const existingDoc = getDocument(type);

      if (existingDoc?.status === "VERIFIED") {
        toast({
          type: "error",
          title: "Locked",
          message: "This document is already verified and cannot be re-uploaded",
        });
        return;
      }

      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", type);

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
      const inputRef = fileInputRefs.current[type];
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

  const uploadedCount = docTypes.filter((d) =>
    getDocument(d.key)
  ).length;
  const progress = docTypes.length > 0 ? Math.round((uploadedCount / docTypes.length) * 100) : 0;

  // Some documents may have been uploaded under a type that isn't (or is no
  // longer) in the admin-configured list — e.g. uploaded before this type was
  // renamed/removed in Admin Settings. Show those too so an employee never
  // loses visibility of something they already uploaded.
  const configuredKeys = new Set(docTypes.map((d) => d.key));
  const orphanedTypes = Array.from(
    new Set(documents.filter((d) => !configuredKeys.has(d.type)).map((d) => d.type))
  );
  const orphanedTypeConfigs: DocumentTypeConfig[] = orphanedTypes.map((t) => ({
    _id: t,
    key: t,
    label: t.replace(/_/g, " "),
    description: "Previously uploaded document",
  }));
  const renderList: DocumentTypeConfig[] = [...docTypes, ...orphanedTypeConfigs];

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
                  {uploadedCount}/{docTypes.length}
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
          {renderList.map((doc) => {
            const uploadedDoc = getDocument(doc.key);
            const isUploaded = !!uploadedDoc;
            const isVerified = uploadedDoc?.status === "VERIFIED";
            const isUploading = uploading === doc.key;

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
                      <FileText size={20} className={isUploaded ? "text-indigo-500" : "text-gray-400"} />
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

                      {uploadedDoc?.status === "REJECTED" && uploadedDoc.remarks && (
                        <p className="text-xs text-rose-600">
                          Rejected: {uploadedDoc.remarks}
                        </p>
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

                    {/* UPLOAD / RE-UPLOAD / LOCKED */}
                    {isVerified ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed"
                        title="Verified documents cannot be re-uploaded"
                      >
                        <Lock size={14} />
                        Verified
                      </span>
                    ) : (
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
                          ref={(el) => (fileInputRefs.current[doc.key] = el)}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          hidden
                          disabled={isUploading}
                          onChange={(e) =>
                            e.target.files &&
                            handleUpload(e.target.files[0], doc.key)
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ================= COMPLETION BANNER ================= */}
          {docTypes.length > 0 && uploadedCount === docTypes.length && (
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
