/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import Loader from "./Loader";
import { toast } from "@/pages/Alert/Toast";

const API = import.meta.env.VITE_API_URL;
const BASE_URL = API?.replace("/api", "") || "";

/* ================= TYPES ================= */

interface DocTypeConfig {
  _id: string;
  key: string;
  label: string;
  description: string;
}

interface DocRecord {
  _id: string;
  userId: { _id: string } | string;
  type: string;
  fileUrl: string;
  status: "UPLOADED" | "VERIFIED" | "REJECTED";
  remarks?: string;
  createdAt: string;
}

interface EmployeeRow {
  _id: string;
  fullName?: string;
  name?: string;
  username?: string;
  employeeId?: string;
  email?: string;
  role?: string;
}

/* ================= COMPONENT ================= */

export default function DocumentVerification() {
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [docTypes, setDocTypes] = useState<DocTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRow | null>(null);
  const [actingDocId, setActingDocId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [usersRes, docsRes, typesRes] = await Promise.all([
        axios.get(`${API}/users?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/documents/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/admin-settings/hrms-document-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userList =
        usersRes.data?.data?.users || usersRes.data?.users || usersRes.data?.data || [];
      setEmployees(Array.isArray(userList) ? userList : []);
      setDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      const types = typesRes.data?.data;
      setDocTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error("Failed to load document verification data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Returns one document per type for this employee — the most recently
  // uploaded one — so stale duplicate rows never cause the counts or the
  // review modal to reference the wrong record.
  const docsForUser = (userId: string) => {
    const all = docs.filter(
      (d) => (typeof d.userId === "string" ? d.userId : d.userId?._id) === userId
    );
    const latestByType = new Map<string, DocRecord>();
    for (const doc of all) {
      const existing = latestByType.get(doc.type);
      if (!existing || new Date(doc.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        latestByType.set(doc.type, doc);
      }
    }
    return Array.from(latestByType.values());
  };

  const filteredEmployees = employees.filter((e) => {
    const name = (e.fullName || e.name || e.username || "").toLowerCase();
    const q = search.trim().toLowerCase();
    return (
      !q ||
      name.includes(q) ||
      (e.employeeId || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  const handleSetStatus = async (docId: string, status: "VERIFIED" | "REJECTED", remarks?: string) => {
    try {
      setActingDocId(docId);
      await axios.patch(
        `${API}/documents/${docId}/status`,
        status === "REJECTED" ? { status, remarks } : { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        type: "success",
        title: status === "VERIFIED" ? "Document Verified" : "Document Rejected",
        message: `Document has been marked as ${status.toLowerCase()}`,
      });
      await fetchAll();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Action Failed",
        message: error?.response?.data?.message || "Could not update document status",
      });
    } finally {
      setActingDocId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and verify KYC documents uploaded by every employee in your company
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, email..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-600">Employee</th>
              <th className="text-left p-3 font-semibold text-gray-600">Role</th>
              <th className="text-center p-3 font-semibold text-gray-600">Uploaded</th>
              <th className="text-center p-3 font-semibold text-gray-600">Verified</th>
              <th className="text-center p-3 font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEmployees.map((emp) => {
              const empDocs = docsForUser(emp._id);
              const uploadedCount = empDocs.length;
              const verifiedCount = empDocs.filter((d) => d.status === "VERIFIED").length;
              const total = docTypes.length || uploadedCount;
              return (
                <tr key={emp._id} className="hover:bg-gray-50/50">
                  <td className="p-3">
                    <div className="font-semibold text-gray-800">
                      {emp.fullName || emp.name || emp.username || "—"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {emp.employeeId || "—"}
                      {emp.email ? ` • ${emp.email}` : ""}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{emp.role || "—"}</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {uploadedCount}/{total}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        total > 0 && verifiedCount === total
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {verifiedCount}/{total}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedEmp(emp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-gray-50 text-indigo-600 border-indigo-200 transition-colors"
                    >
                      <FileText size={13} /> View Documents
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEmp && (
        <DocumentReviewModal
          employee={selectedEmp}
          docs={docsForUser(selectedEmp._id)}
          docTypes={docTypes}
          actingDocId={actingDocId}
          onClose={() => setSelectedEmp(null)}
          onSetStatus={handleSetStatus}
        />
      )}
    </div>
  );
}

/* ================= REVIEW MODAL ================= */

function DocumentReviewModal({
  employee,
  docs,
  docTypes,
  actingDocId,
  onClose,
  onSetStatus,
}: {
  employee: EmployeeRow;
  docs: DocRecord[];
  docTypes: DocTypeConfig[];
  actingDocId: string | null;
  onClose: () => void;
  onSetStatus: (docId: string, status: "VERIFIED" | "REJECTED", remarks?: string) => void;
}) {
  const getDoc = (key: string) => docs.find((d) => d.type === key);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const startReject = (docId: string) => {
    setRejectingDocId(docId);
    setRejectReason("");
  };

  const cancelReject = () => {
    setRejectingDocId(null);
    setRejectReason("");
  };

  const confirmReject = (docId: string) => {
    if (!rejectReason.trim()) return;
    onSetStatus(docId, "REJECTED", rejectReason.trim());
    setRejectingDocId(null);
    setRejectReason("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {employee.fullName || employee.name || employee.username}
            </h2>
            <p className="text-xs text-gray-500">
              {employee.employeeId || "—"} • {employee.role || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {docTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No document types configured yet. Set them up under Admin Settings &gt; HRMS
              Setting &gt; Upload Document Setting.
            </p>
          ) : (
            docTypes.map((dt) => {
              const doc = getDoc(dt.key);
              const isActing = !!doc && actingDocId === doc._id;
              return (
                <div key={dt.key} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{dt.label}</p>
                      <p className="text-xs text-gray-400">{dt.description}</p>
                    </div>
                    {doc ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          doc.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : doc.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {doc.status === "VERIFIED" ? (
                          <ShieldCheck size={12} />
                        ) : doc.status === "REJECTED" ? (
                          <XCircle size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {doc.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        Not Uploaded
                      </span>
                    )}
                  </div>

                  {doc?.status === "REJECTED" && doc.remarks && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2 py-1">
                      Rejection reason: {doc.remarks}
                    </p>
                  )}

                  {doc && (
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <a
                        href={
                          doc.fileUrl.startsWith("http")
                            ? doc.fileUrl
                            : `${BASE_URL}/${doc.fileUrl.replace(/\\/g, "/")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-gray-50 text-gray-700"
                      >
                        <Eye size={13} /> View Document
                      </a>

                      {doc.status === "VERIFIED" ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <ShieldCheck size={13} /> Locked — employee cannot re-upload
                        </span>
                      ) : rejectingDocId === doc._id ? null : (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isActing}
                            onClick={() => startReject(doc._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => onSetStatus(doc._id, "VERIFIED")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 size={13} /> {isActing ? "Saving..." : "Verify"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {doc && rejectingDocId === doc._id && (
                    <div className="pt-2 space-y-2 border-t mt-2">
                      <label className="text-xs font-semibold text-gray-600">
                        Reason for rejection <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        autoFocus
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Tell the employee why this document is being rejected..."
                        rows={2}
                        className="w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelReject}
                          className="px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isActing || !rejectReason.trim()}
                          onClick={() => confirmReject(doc._id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                        >
                          <XCircle size={13} /> {isActing ? "Rejecting..." : "Confirm Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
