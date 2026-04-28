/** @format */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { toast } from "../Alert/Toast";
import { Eye, EyeOff, Upload, Download, X, FileText, AlertCircle, CheckCircle2, Camera, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL;


export default function AddUser() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem("token");


  // HRMS-specific roles - static list
  const HRMS_ROLES = [
    'Manager',
    'Employee',
    'Finance Manager',
    'Auditor',
    'Admin',
    'IT Admin',
  ];

  const [showPassword, setShowPassword] = useState(false);

  /* ================= PROFILE PICTURE ================= */
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);

  /* ================= BULK IMPORT ================= */
  const [showBulkModal, setShowBulkModal] = useState(false);

  /* ================= BASIC INFORMATION ================= */
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    gender: "",
    dob: "",
    joiningDate: "",
    password: "",
    role: "",
  });

  /* ================= COMPANY & JOB ================= */
  const [job, setJob] = useState({
    managerId: "",
    employmentType: "",
  });

  /* ================= DROPDOWNS ================= */
  const [managers, setManagers] = useState<any[]>([]);
  const [employeeIdPreview, setEmployeeIdPreview] = useState<string>("");

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/users?role=manager`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setManagers(res.data?.data?.users || res.data?.users || []))
      .catch(() => setManagers([]));
  }, []);


  /* ================= FETCH EMPLOYEE ID PREVIEW ================= */
  useEffect(() => {
    // We can fetch preview based on current user's company context if available
    const userJson = localStorage.getItem("user");
    const currentUser = userJson ? JSON.parse(userJson) : null;
    const companyId = currentUser?.companyId;

    if (companyId) {
      axios
        .get(`${API_BASE}/users/generate-employee-id?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setEmployeeIdPreview(res.data.employeeId))
        .catch(() => setEmployeeIdPreview(""));
    } else {
      setEmployeeIdPreview("");
    }
  }, []);

  /* ================= PROFILE PICTURE HANDLER ================= */
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Invalid File", description: "Only image files are allowed." });
        return;
      }
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    const e: any = {};

    Object.entries(formData).forEach(([k, v]) => {
      if (!v && k !== "mobile" && k !== "dob" && k !== "joiningDate") e[k] = "Required";
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      // Use FormData to support profile picture upload
      const data = new FormData();

      // BASIC
      data.append("fullName", formData.name);   // controller reads fullName
      data.append("email", formData.email);
      data.append("mobile", formData.mobile);
      data.append("gender", formData.gender);
      data.append("dob", formData.dob);
      data.append("joiningDate", formData.joiningDate);
      data.append("password", formData.password);
      data.append("role", formData.role);

      // JOB
      if (job.managerId) data.append("managerId", job.managerId);
      if (job.employmentType) data.append("employmentType", job.employmentType);

      // PROFILE PICTURE
      if (profilePicFile) {
        data.append("profilePicture", profilePicFile);
      }

      const res = await axios.post(
        `${API_BASE}/users`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      toast({
        title: "User Created",
        description: res.data?.message || "User has been created successfully.",
      });

      // ✅ RESET FORM
      setFormData({
        name: "",
        email: "",
        mobile: "",
        gender: "",
        dob: "",
        joiningDate: "",
        password: "",
        role: "",
      });

      setJob({
        managerId: "",
        employmentType: "",
      });

      setProfilePicFile(null);
      setProfilePicPreview(null);
      setErrors({});

      // Navigate back to employee list
      setTimeout(() => {
        navigate("/hrms/SuperAdmin/employees");
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "User Creation Failed",
        description:
          error?.response?.data?.message ||
          "Unable to create user. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };


  const formatRole = (role: string) => {
    if (!role) return "";
    return role
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };



  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Add User</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => setShowBulkModal(true)}
        >
          <Upload size={18} />
          Bulk Import
        </Button>
      </div>
      {/* ================= BASIC INFORMATION ================= */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Basic Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* ===== PROFILE PICTURE ===== */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b">
            <div
              className="relative w-28 h-28 rounded-full border-4 border-orange-200 cursor-pointer group overflow-hidden bg-gray-100 flex items-center justify-center"
              onClick={() => profilePicRef.current?.click()}
            >
              {profilePicPreview ? (
                <img
                  src={profilePicPreview}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} className="text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={22} className="text-white" />
              </div>
            </div>
            <input
              ref={profilePicRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              className="hidden"
            />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Profile Picture</p>
              <p className="text-xs text-gray-400">Click to upload (JPG, PNG, max 5MB)</p>
              {profilePicFile && (
                <button
                  type="button"
                  onClick={() => { setProfilePicFile(null); setProfilePicPreview(null); }}
                  className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1 mx-auto"
                >
                  <X size={12} /> Remove
                </button>
              )}
            </div>
          </div>

          {/* GRID FIELDS */}
          <div className="grid grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <Label>
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label>
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <Label>
                Mobile <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
                className={errors.mobile ? "border-red-500" : ""}
              />
              {errors.mobile && (
                <p className="text-sm text-red-500">{errors.mobile}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <Label>
                Gender <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className={`w-full h-10 border rounded-md px-3 ${errors.gender ? "border-red-500" : ""
                  }`}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {errors.gender && (
                <p className="text-sm text-red-500">{errors.gender}</p>
              )}
            </div>

            {/* DOB */}
            <div>
              <Label>
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                className={errors.dob ? "border-red-500" : ""}
              />
              {errors.dob && <p className="text-sm text-red-500">{errors.dob}</p>}
            </div>

            {/* Joining Date */}
            <div>
              <Label>
                Joining Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.joiningDate}
                onChange={(e) =>
                  setFormData({ ...formData, joiningDate: e.target.value })
                }
                className={errors.joiningDate ? "border-red-500" : ""}
              />
              {errors.joiningDate && (
                <p className="text-sm text-red-500">{errors.joiningDate}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label>
                Password <span className="text-red-500">*</span>
              </Label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />

                {/* Eye Icon */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= COMPANY & JOB ================= */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Company &amp; Job Details
          </CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Next Employee ID Preview */}
          {employeeIdPreview && (
            <div className="col-span-2 p-2 bg-orange-50 border border-orange-200 rounded-md flex items-center gap-2">
              <AlertCircle size={14} className="text-orange-500" />
              <p className="text-xs font-medium text-orange-700">
                Next Employee ID: <span className="font-bold">{employeeIdPreview}</span>
              </p>
            </div>
          )}

          {/* Role */}
          <div>
            <Label>
              Role <span className="text-red-500">*</span>
            </Label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.role ? "border-red-500" : ""
                }`}
            >
              <option value="">Select Role</option>
              {HRMS_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Reporting Manager */}
          <div>
            <Label>Reporting Manager</Label>
            <select
              value={job.managerId}
              onChange={(e) => setJob({ ...job, managerId: e.target.value })}
              className="w-full h-10 border rounded-md px-3"
            >
              <option value="">Select Manager (Optional)</option>
              {managers?.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullName || m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Type */}
          <div>
            <Label>Employee Type</Label>
            <select
              value={job.employmentType}
              onChange={(e) =>
                setJob({ ...job, employmentType: e.target.value })
              }
              className="w-full h-10 border rounded-md px-3"
            >
              <option value="">Select Type (Optional)</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Intern">Intern</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tumhara existing Upload Documents section exactly yahin rahega */}
      <div className="flex justify-center pt-6">
        <Button onClick={handleSubmit} disabled={loading}>
          Add User
        </Button>
      </div>

      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            // Optional: refresh list if needed
          }}
        />
      )}
    </div>
  );
}

/* ======================================================
   📦 BULK IMPORT MODAL COMPONENT
   ====================================================== */
function BulkImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const token = localStorage.getItem("token");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview/Result

  const downloadTemplate = () => {
    const headers = [
      "Employee ID", "Name", "Email", "Mobile", "Gender", "DOB",
      "Joining Date", "Role", "Company", "Branch", "Department",
      "Designation", "Cost Center", "Reporting Manager", "Employment Type"
    ];
    const sampleData = [
      "EMP-TEC-0001", "John Doe", "john@example.com", "9876543210", "Male", "1990-05-15",
      "2026-02-01", "superadmin", "Techize Builder", "Main Branch", "IT",
      "Software Engineer", "", "", "Full-Time"
    ];

    const csvContent = [headers.join(","), sampleData.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Employee_Bulk_Import_Template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/bulk-upload/employees/parse`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setParsedData(res.data.data);
      setStep(2);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || "Parsing failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/bulk-upload/employees/save`, { employees: parsedData }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Import Completed",
        message: `${res.data.results.success} users imported successfully.`,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Employee Import</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload CSV/Excel to add multiple employees</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <div className="text-sm text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-1">How to import:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Download the sample template below.</li>
                    <li>Fill in employee details exactly as per headers.</li>
                    <li>Ensure <strong>Company, Branch, Department, Cost Center</strong> etc. match exactly.</li>
                    <li><strong>Reporting Manager</strong> column accepts manager's email address.</li>
                    <li>Save as CSV/Excel and upload here.</li>
                  </ul>
                </div>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer group text-center relative">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  {file ? (
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <FileText size={18} className="text-orange-500" />
                      {file.name}
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 font-medium">Click or drag file here</p>
                      <p className="text-sm text-gray-500 mt-1">Accepts CSV, XLSX up to 10MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
                    <AlertCircle size={16} />
                    Validation Failed ({validationErrors.length} errors)
                  </div>
                  {validationErrors.map((msg, i) => (
                    <p key={i} className="text-xs text-red-600 flex gap-2">
                      <span className="font-bold shrink-0">•</span> {msg}
                    </p>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex gap-2 items-center">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-gray-200 hover:bg-gray-100 h-11"
                  onClick={downloadTemplate}
                >
                  <Download size={18} />
                  Download Template
                </Button>
                <Button
                  className="flex-1 bg-gray-900 hover:bg-black h-11"
                  onClick={handleParse}
                  disabled={!file || loading}
                >
                  {loading ? "Validating..." : "Validate & Preview"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Ready to Import</h3>
                <p className="text-gray-500">Validated {parsedData.length} records successfully</p>
              </div>

              <div className="bg-gray-50 rounded-xl border p-4 max-h-60 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500 border-b">
                    <tr>
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Emp ID</th>
                      <th className="pb-2 font-medium">Cost Center</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-700 font-medium">{row.name}</td>
                        <td className="py-2 text-gray-500">{row.email}</td>
                        <td className="py-2 text-gray-500">{row.employeeId}</td>
                        <td className="py-2 text-gray-500">{row.costCenterName || "—"}</td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={4} className="pt-2 text-center text-gray-400 italic">
                          + {parsedData.length - 10} more records
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex gap-2 items-center">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 h-11" onClick={handleImport} disabled={loading}>
                  {loading ? "Importing..." : `Final Import (${parsedData.length} users)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


