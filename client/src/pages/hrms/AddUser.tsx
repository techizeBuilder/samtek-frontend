/** @format */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { toast } from "../Alert/Toast";
import { Eye, EyeOff, Upload, Download, X, FileText, AlertCircle, CheckCircle2, Camera, User, Shield, Wrench } from "lucide-react";
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
    'Sales Employee',
    'Production Employee',
    'Packing Employee',
    'Dispatch Employee',
    'Account Employee',
    // 'Auditor',
    'Research Development Employee',
    'Complaint Management Employee',
    'Store Employee',
    'QC Employee',
    'MIS Admin',
    'Marketing Employee',
  ];

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
    },
    "Research Development Employee": {
      moduleName: "dashboard",
      features: [
        { key: "dashboard", label: "Dashboard" }
      ]
    },
    "Complaint Management Employee": {
      moduleName: "dashboard",
      features: [
        { key: "dashboard", label: "Complaints" }
      ]
    },
    "Store Employee": {
      moduleName: "store",
      features: [
        { key: "dashboard", label: "Dashboard" },
        { key: "orders", label: "Orders" }
      ]
    },
    "QC Employee": {
      moduleName: "quality-control",
      features: [
        { key: "dashboard", label: "Dashboard" },
        { key: "qcJobs", label: "QC Jobs" },
        { key: "qcInspection", label: "QC Inspection" },
        { key: "qcInward", label: "QC Inward" }
      ]
    },
    "Marketing Employee": {
      moduleName: "marketing",
      features: [
        { key: "expenses", label: "Marketing Expenses" }
      ]
    }
  };

  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
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
    ivrNumber: "",
    address: "",
    gender: "",
    dob: "",
    joiningDate: "",
    password: "",
    role: "",
    companyId: "",
    branchId: "",
    designationId: "",
    isTrainee: false,
    serviceZone: "",
    technicianSkills: [] as string[],
  });

  /* ================= COMPANY & JOB ================= */
  const [job, setJob] = useState({
    managerId: "",
    employmentType: "",
  });

  /* ================= DROPDOWNS ================= */
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [employeeIdPreview, setEmployeeIdPreview] = useState<string>("");

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Managers
    axios
      .get(`${API_BASE}/users?role=Manager`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setManagers(res.data?.data?.users || res.data?.users || []))
      .catch(() => setManagers([]));

    // Companies
    axios
      .get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const comps = res.data?.companies || [];
        setCompanies(comps);
      })
      .catch(() => setCompanies([]));
  }, []);

  /* ================= CASCADING FETCHES ================= */
  // Fetch Units from selected Company
  useEffect(() => {
    if (formData.companyId) {
      const selectedComp = companies.find(c => c._id === formData.companyId);
      if (selectedComp) {
        setBranches([{ _id: selectedComp._id, name: selectedComp.unitName || "Unnamed Unit" }]);
        setFormData(prev => ({ ...prev, branchId: selectedComp._id }));
      }

      // Also fetch employee ID preview
      axios
        .get(`${API_BASE}/users/generate-employee-id?companyId=${formData.companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setEmployeeIdPreview(res.data.employeeId))
        .catch(() => setEmployeeIdPreview(""));
    } else {
      setBranches([]);
      setEmployeeIdPreview("");
    }
    // Reset lower levels
    setFormData(prev => ({ ...prev, branchId: "", designationId: "" }));
  }, [formData.companyId, companies]);

  // Fetch Designations when Unit/Company changes
  useEffect(() => {
    if (formData.companyId) {
      axios
        .get(`${API_BASE}/designations?companyId=${formData.companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setDesignations(res.data || []))
        .catch(() => setDesignations([]));
    } else {
      setDesignations([]);
    }
    // Reset lower levels
    setFormData(prev => ({ ...prev, designationId: "" }));
  }, [formData.companyId]);

  useEffect(() => {
    if (ROLE_MODULES_CONFIG[formData.role]) {
      const initial: Record<string, boolean> = {};
      ROLE_MODULES_CONFIG[formData.role].features.forEach(f => {
        initial[f.key] = true;
      });
      setSelectedFeatures(initial);
    } else {
      setSelectedFeatures({});
    }
  }, [formData.role]);

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

    // Required text fields
    if (!formData.name.trim()) e.name = "Required";
    if (!formData.gender) e.gender = "Required";
    if (!formData.password) e.password = "Required";
    if (!formData.role) e.role = "Required";
    if (!formData.companyId) e.companyId = "Required";
    if (!formData.branchId) e.branchId = "Required";
    if (!formData.designationId) e.designationId = "Required";

    // Email — must be valid format
    if (!formData.email.trim()) {
      e.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      e.email = "Enter a valid email address (e.g. name@domain.com)";
    }

    // Mobile — exactly 10 digits
    if (!formData.mobile.trim()) {
      e.mobile = "Required";
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      e.mobile = "Mobile must be exactly 10 digits";
    }

    // IVR Extension — required for Sales Employee, digits only if provided
    if (formData.role === "Sales Employee") {
      if (!formData.ivrNumber.trim()) {
        e.ivrNumber = "IVR Extension is required for Sales Employee";
      } else if (!/^\d+$/.test(formData.ivrNumber.trim())) {
        e.ivrNumber = "IVR Extension must contain only digits";
      }
    } else if (formData.ivrNumber && !/^\d+$/.test(formData.ivrNumber.trim())) {
      e.ivrNumber = "IVR Extension must contain only digits";
    }

    // DOB — required
    if (!formData.dob) e.dob = "Required";

    // Joining Date — required
    if (!formData.joiningDate) e.joiningDate = "Required";

    // Reporting Manager — required for all roles except Manager
    if (formData.role !== "Manager" && !job.managerId) {
      e.managerId = "Required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const data = new FormData();

      // BASIC
      data.append("fullName", formData.name);
      data.append("email", formData.email);
      data.append("mobile", formData.mobile);
      if (formData.ivrNumber) data.append("ivrNumber", formData.ivrNumber);
      if (formData.address) data.append("address", formData.address);
      data.append("gender", formData.gender);
      data.append("dob", formData.dob);
      data.append("joiningDate", formData.joiningDate);
      data.append("password", formData.password);
      data.append("role", formData.role);
      data.append("isTrainee", String(formData.isTrainee));

      // HIERARCHY
      if (formData.companyId) data.append("companyId", formData.companyId);
      if (formData.branchId) data.append("branchId", formData.branchId);
      if (formData.designationId) data.append("designationId", formData.designationId);

      // JOB
      if (job.managerId) data.append("managerId", job.managerId);
      if (job.employmentType) data.append("employmentType", job.employmentType);

      // TECHNICIAN BLOCK
      if (formData.role === 'Complaint Management Employee') {
        data.append("serviceZone", formData.serviceZone);
        data.append("technicianSkills", JSON.stringify(formData.technicianSkills));
      }

      // PERMISSIONS
      if (ROLE_MODULES_CONFIG[formData.role]) {
        const config = ROLE_MODULES_CONFIG[formData.role];
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

        const permissions = {
          role: formData.role,
          canAccessAllUnits: false,
          modules: [
            {
              name: config.moduleName,
              dashboard: hasDashboard,
              features: featuresArray
            }
          ]
        };
        data.append("permissions", JSON.stringify(permissions));
      }

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
        ivrNumber: "",
        address: "",
        gender: "",
        dob: "",
        joiningDate: "",
        password: "",
        role: "",
        companyId: "",
        branchId: "",
        designationId: "",
        isTrainee: false,
        serviceZone: "",
        technicianSkills: [] as string[],
      });

      setJob({
        managerId: "",
        employmentType: "",
      });

      setProfilePicFile(null);
      setProfilePicPreview(null);
      setErrors({});

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Add User</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-[#49A7F5] text-[#49A7F5] hover:bg-[#49A7F5]/5 transition-all shadow-sm active:scale-95"
          onClick={() => setShowBulkModal(true)}
        >
          <Upload size={18} />
          Bulk Import
        </Button>
      </div>

      {/* ================= BASIC INFORMATION ================= */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col items-center gap-3 pb-4 border-b">
            <div
              className="relative w-28 h-28 rounded-full border-4 border-[#49A7F5]/30 cursor-pointer group overflow-hidden bg-gray-100 flex items-center justify-center shadow-inner"
              onClick={() => profilePicRef.current?.click()}
            >
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Profile Preview" className="w-full h-full object-cover" />
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

          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@domain.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div>
              <Label>Mobile <span className="text-red-500">*</span></Label>
              <Input
                value={formData.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                className={errors.mobile ? "border-red-500" : ""}
              />
              {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
            </div>

            <div>
              <Label className="flex items-center gap-1">
                Acefone IVR Extension
                {formData.role === "Sales Employee"
                  ? <span className="text-red-500"> *</span>
                  : <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                }
              </Label>
              <Input
                placeholder="e.g. 0602105320010"
                value={formData.ivrNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 15);
                  setFormData({ ...formData, ivrNumber: val });
                }}
                inputMode="numeric"
                maxLength={15}
                className={errors.ivrNumber ? "border-red-500" : ""}
              />
              {errors.ivrNumber && <p className="text-sm text-red-500">{errors.ivrNumber}</p>}
              <p className="text-xs text-gray-400 mt-0.5">PHP system ka ivr_number field — Acefone agent extension.</p>
            </div>
            <div>
              <Label>Gender <span className="text-red-500">*</span></Label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={`w-full h-10 border rounded-md px-3 ${errors.gender ? "border-red-500" : ""}`}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {errors.gender && <p className="text-sm text-red-500">{errors.gender}</p>}
            </div>

            <div>
              <Label>Date of Birth <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className={errors.dob ? "border-red-500" : ""}
              />
              {errors.dob && <p className="text-sm text-red-500">{errors.dob}</p>}
            </div>

            <div>
              <Label>Joining Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className={errors.joiningDate ? "border-red-500" : ""}
              />
              {errors.joiningDate && <p className="text-sm text-red-500">{errors.joiningDate}</p>}
            </div>

            <div>
              <Label>Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="col-span-2">
              <Label>Address</Label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Employee's residential address"
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#49A7F5]/40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= COMPANY & JOB ================= */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Company &amp; Job Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {employeeIdPreview && (
            <div className="col-span-2 p-3 bg-[#49A7F5]/5 border border-[#49A7F5]/20 rounded-xl flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-[#49A7F5]" />
              <p className="text-xs font-medium text-[#49A7F5]">
                Next Employee ID: <span className="font-bold">{employeeIdPreview}</span>
              </p>
            </div>
          )}

          <div>
            <Label>Company <span className="text-red-500">*</span></Label>
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.companyId ? "border-red-500" : ""}`}
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Unit <span className="text-red-500">*</span></Label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.branchId ? "border-red-500" : ""}`}
              disabled={!formData.companyId}
            >
              <option value="">Select Unit</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Designation <span className="text-red-500">*</span></Label>
            <select
              value={formData.designationId}
              onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.designationId ? "border-red-500" : ""}`}
              disabled={!formData.companyId}
            >
              <option value="">Select Designation</option>
              {designations.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Role <span className="text-red-500">*</span></Label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.role ? "border-red-500" : ""}`}
            >
              <option value="">Select Role</option>
              {HRMS_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          <div>
            <Label>
              Reporting Manager
              {formData.role !== "Manager" && <span className="text-red-500"> *</span>}
              {formData.role === "Manager" && <span className="text-gray-400 text-xs font-normal"> (Optional)</span>}
            </Label>
            <select
              value={job.managerId}
              onChange={(e) => setJob({ ...job, managerId: e.target.value })}
              className={`w-full h-10 border rounded-md px-3 ${errors.managerId ? "border-red-500" : ""}`}
            >
              <option value="">
                {formData.role === "Manager" ? "Select Manager (Optional)" : "Select Manager"}
              </option>
              {managers?.map((m) => (
                <option key={m._id} value={m._id}>{m.fullName || m.name}</option>
              ))}
            </select>
            {errors.managerId && <p className="text-sm text-red-500">{errors.managerId}</p>}
          </div>

          <div>
            <Label>Employee Type</Label>
            <select
              value={job.employmentType}
              onChange={(e) => setJob({ ...job, employmentType: e.target.value })}
              className="w-full h-10 border rounded-md px-3"
            >
              <option value="">Select Type (Optional)</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Intern">Intern</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <input
              type="checkbox"
              id="isTrainee"
              checked={formData.isTrainee}
              onChange={(e) => setFormData({ ...formData, isTrainee: e.target.checked })}
              className="w-4 h-4 text-[#49A7F5] border-gray-300 rounded focus:ring-[#49A7F5] cursor-pointer"
            />
            <Label htmlFor="isTrainee" className="cursor-pointer">Is Trainee</Label>
          </div>
        </CardContent>
      </Card>

      {/* ================= IVR / CALLING SETTINGS (SALES EMPLOYEE ONLY) ================= */}
      {(formData.role === 'Sales Employee' || formData.role === 'Sales Head' || formData.role === 'Sales') && (
        <Card className="max-w-4xl border border-emerald-200 bg-emerald-50/10">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-lg font-medium text-emerald-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                📞
              </span>
              IVR / Calling Settings
            </CardTitle>
            <p className="text-xs text-emerald-700 mt-1">
              Acefone IVR extension number — yeh field Sales Employee ke click-to-call ke liye zaroori hai.
              Super Admin ne API Key aur Caller ID pehle se set ki hogi.
            </p>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-emerald-900 flex items-center gap-1">
                IVR Extension Number
                <span className="text-red-500 text-xs ml-1">(Required for calling)</span>
              </Label>
              <Input
                placeholder="e.g. 0602105320010"
                value={formData.ivrNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 15);
                  setFormData({ ...formData, ivrNumber: val });
                }}
                inputMode="numeric"
                maxLength={15}
                className="mt-1 border-emerald-300 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Acefone dashboard se milta hai. Is number pe Sales Employee ka phone ring hoga jab click-to-call kare.
              </p>
            </div>
            <div>
              <Label className="text-emerald-900">Personal Mobile</Label>
              <Input
                placeholder="Employee ka personal mobile number"
                value={formData.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
                inputMode="numeric"
                maxLength={10}
                className="mt-1 border-emerald-300 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Personal number — IVR alag hota hai. Customer ko Caller ID (company number) dikhti hai.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= TECHNICIAN SETTINGS (CONDITIONAL) ================= */}
      {formData.role === 'Complaint Management Employee' && (
        <Card className="max-w-4xl border border-indigo-200 bg-indigo-50/10">
          <CardHeader className="pb-3 border-b border-indigo-100">
            <CardTitle className="text-lg font-medium text-indigo-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Wrench size={16} />
              </span>
              Service & Technician Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-indigo-900">Service Zone / Region</Label>
              <Input
                placeholder="e.g., North Zone, Alpha Unit, All"
                value={formData.serviceZone}
                onChange={(e) => setFormData({ ...formData, serviceZone: e.target.value })}
                className="mt-1 border-indigo-200 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to default to their assigned Unit.</p>
            </div>
            <div>
              <Label className="text-indigo-900 mb-2 block">Specialized Skills</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Breakdown', 'Performance Issue', 'Installation', 'Training'].map(skill => {
                  const isSelected = formData.technicianSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          technicianSkills: isSelected
                            ? prev.technicianSkills.filter(s => s !== skill)
                            : [...prev.technicianSkills, skill]
                        }));
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                        }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= MODULE PERMISSIONS (CONDITIONAL) ================= */}
      {ROLE_MODULES_CONFIG[formData.role] && (
        <Card className="max-w-4xl border border-[#49A7F5]/30">
          <CardHeader className="bg-[#49A7F5]/5 border-b border-[#49A7F5]/10 rounded-t-xl">
            <CardTitle className="text-lg font-medium text-[#49A7F5] flex items-center gap-2">
              <Shield size={18} />
              Module Permissions ({ROLE_MODULES_CONFIG[formData.role].moduleName})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ROLE_MODULES_CONFIG[formData.role].features.map((feature) => (
                <div key={feature.key} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:border-[#49A7F5]/30 hover:bg-[#49A7F5]/5 transition-colors cursor-pointer" onClick={() => setSelectedFeatures(prev => ({ ...prev, [feature.key]: !prev[feature.key] }))}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedFeatures[feature.key] ? 'bg-[#49A7F5] border-[#49A7F5]' : 'border-gray-300 bg-white'}`}>
                    {selectedFeatures[feature.key] && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-6">
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#49A7F5] hover:bg-[#3D96E1] text-white px-10 py-6 text-lg font-bold shadow-lg transition-all active:scale-95">
          Add User
        </Button>
      </div>

      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => { setShowBulkModal(false); }}
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
  const [step, setStep] = useState(1);

  const downloadTemplate = () => {
    const headers = [
      "Employee ID", "Name", "Email", "Mobile", "Gender", "DOB",
      "Joining Date", "Role", "Company", "Unit", "Department",
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
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <div className="text-sm text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-1">How to import:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Download the sample template below.</li>
                    <li>Fill in employee details exactly as per headers.</li>
                    <li>Ensure <strong>Company, Unit, Department, Cost Center</strong> etc. match exactly.</li>
                    <li><strong>Reporting Manager</strong> column accepts manager's email address.</li>
                    <li>Save as CSV/Excel and upload here.</li>
                  </ul>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-[#49A7F5] hover:bg-[#49A7F5]/5 transition-all cursor-pointer group text-center relative">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-[#49A7F5]/10 rounded-full flex items-center justify-center text-[#49A7F5] mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  {file ? (
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <FileText size={18} className="text-[#49A7F5]" />
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