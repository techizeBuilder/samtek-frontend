/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  MoreVertical,
  LayoutGrid,
  List,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  SlidersHorizontal,
  X,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation, useSearch } from "wouter";
import Loader from "@/pages/hrms/Loader";

import config from "@/config/environment";
const API_BASE = config.apiURL || "http://localhost:5000/api";

interface Employee {
  _id: string;
  name: string;
  role: string;
  status: string;
  avatar?: string;
  profilePicture?: string;
  // Extended fields for List View
  employeeId?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  companyId?: { _id: string; name: string; unitName?: string };
  branchId?: { _id: string; name: string };
  unit?: string;
  departmentId?: { _id: string; name: string };
  designationId?: { _id: string; name: string };
  managerId?: { _id: string; name: string };
  costCenterId?: { _id: string; name: string; code: string };
  joiningDate?: string;
  probationEndDate?: string;
  confirmationDate?: string;
  terminationDate?: string;
  employmentType?: string;
  employmentStatus?: string;
  documents?: { status: string }[];
}

export default function Employee() {
  const navigate = useNavigate();
  // Use wouter's search/location hooks to avoid conflict with wouter routing
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(search);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<{ _id: string; name: string; unitName?: string }[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);

  // Consolidated filter states
  const [filters, setFilters] = useState({
    name: "",
    designation: "",
    company: "",
    branch: "",
    department: "",
    costCenter: "",
    manager: "",
    doj: "",
    probation: "",
    confirmation: "",
    termination: "",
    empType: "",
    contact: "",
    gender: "",
    status: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Status toggle & Delete modal states
  const [statusModal, setStatusModal] = useState<{ open: boolean; emp: Employee | null }>({
    open: false,
    emp: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; emp: Employee | null }>({
    open: false,
    emp: null,
  });

  // 🔑 URL state — read directly from wouter's search string
  const page = Number(searchParams.get("page")) || 1;
  const companyFilter = searchParams.get("companyId") || "";
  const unitFilter = searchParams.get("unit") || "";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const currentCompany = searchParams.get("companyId") || "";
    if (companyFilter !== currentCompany) {
      const params = new URLSearchParams({ page: "1", companyId: companyFilter });
      setLocation(`/hrms/SuperAdmin/employees?${params.toString()}`);
    }
  }, [companyFilter]);



  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      // Build query params from filters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        companyId: companyFilter,
        search: debouncedFilters.name,
        designation: debouncedFilters.designation,
        company: debouncedFilters.company,
        branch: unitFilter || debouncedFilters.branch,
        unit: unitFilter || debouncedFilters.branch,
        department: debouncedFilters.department,
        costCenter: debouncedFilters.costCenter,
        manager: debouncedFilters.manager,
        joiningDate: debouncedFilters.doj,
        probationEndDate: debouncedFilters.probation,
        confirmationDate: debouncedFilters.confirmation,
        terminationDate: debouncedFilters.termination,
        employmentType: debouncedFilters.empType,
        contact: debouncedFilters.contact,
        gender: debouncedFilters.gender,
        employmentStatus: debouncedFilters.status,
      });

      // Remove empty values
      for (const [key, value] of Array.from(params.entries())) {
        if (!value) params.delete(key);
      }

      const res = await axios.get(`${API_BASE}/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rawUsers = res.data.data?.users || res.data.users || res.data.data || [];
      const usersData = (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => ({
        ...u,
        // Normalize fullName/username → name
        name: u.fullName || u.name || u.username || "Unknown",
        // Normalize isActive boolean → status string
        status: u.status || (u.isActive === true ? "ACTIVE" : u.isActive === false ? "INACTIVE" : "ACTIVE"),
        // Normalize email field
        email: u.email || u.emailAddress || "",
      }));
      setEmployees(usersData);
      setTotalPages(res.data.data?.pagination?.pages || res.data.pagination?.pages || res.data.totalPages || 1);
      setTotalUsers(res.data.data?.pagination?.total || res.data.pagination?.total || res.data.totalUsers || 0);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch employees", err);
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const companiesData = Array.isArray(res.data.companies) ? res.data.companies : (Array.isArray(res.data) ? res.data : []);
      setCompanies(companiesData);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, debouncedFilters, companyFilter]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Navigate to page — use wouter setLocation so wouter stays in control of routing
  const handlePageChange = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", p.toString());
    if (companyFilter) params.set("companyId", companyFilter);
    setLocation(`/hrms/SuperAdmin/employees?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteModal.emp) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/users/${deleteModal.emp._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteModal({ open: false, emp: null });
      fetchEmployees();
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusModal.emp) return;
    try {
      const token = localStorage.getItem("token");
      const newStatus = statusModal.emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await axios.patch(
        `${API_BASE}/users/${statusModal.emp._id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusModal({ open: false, emp: null });
      fetchEmployees();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getPaginationPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const current = page;
    pages.push(1);
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const getDocCounts = (emp: any) => {
    return {
      uploaded: emp.documentCounts?.uploaded || 0,
      approved: emp.documentCounts?.verified || 0,
    };
  };

  // Clear all column filters
  const clearAllFilters = () => {
    setFilters({
      name: "",
      designation: "",
      company: "",
      branch: "",
      department: "",
      costCenter: "",
      manager: "",
      doj: "",
      probation: "",
      confirmation: "",
      termination: "",
      empType: "",
      contact: "",
      gender: "",
      status: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Employee</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard / Employee</p>

          {/* Search Bar - only show in grid mode (moved here as per user request) */}
          {viewMode === "grid" && (
            <div className="relative mt-4 min-w-[300px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Search Employee..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>
          )}
        </div>

        {/* View Toggles & Filters */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/hrms/SuperAdmin/addUser")}
            className="flex items-center gap-2 bg-[#49A7F5] hover:bg-[#3D96E1] text-white px-4 py-2 rounded-lg transition-all font-medium shadow-sm mr-2 active:scale-95"
          >
            <Users size={18} />
            Add User
          </button>
          {/* Company Filter */}
          {/* <div className="relative min-w-[200px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={companyFilter}
              onChange={(e) => setSearchParams({ ...Object.fromEntries(searchParams), companyId: e.target.value, page: "1" })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#49A7F5] appearance-none bg-white cursor-pointer"
            >
              <option value="">All Companies</option>
              {companies.map(comp => (
                <option key={comp._id} value={comp._id}>{comp.name}</option>
              ))}
            </select>
          </div> */}

          {/* Unit Filter */}
          {/* <div className="relative min-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={unitFilter}
              onChange={(e) => setSearchParams({ ...Object.fromEntries(searchParams), unit: e.target.value, page: "1" })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#49A7F5] appearance-none bg-white cursor-pointer"
            >
              <option value="">All Units/Branches</option>
              {Array.from(new Set(companies.map(c => c.unitName).filter(Boolean))).map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div> */}

          {/* Filter Button - only show in list mode */}
          {viewMode === "list" && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium text-sm shadow-sm
                ${showFilters || hasActiveFilters
                  ? "bg-[#49A7F5] text-white shadow-md border-[#49A7F5]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#49A7F5]/50 hover:text-[#49A7F5]"
                }`}
              title="Toggle Filters"
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-white text-blue-500 rounded-full text-[10px] font-bold px-1.5 py-0.5 leading-none">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>
          )}

          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-500" : "text-gray-400 hover:text-gray-600"}`}
              title="Grid View"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-500" : "text-gray-400 hover:text-gray-600"}`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Leads-style Inline Filter Panel ── */}
      {viewMode === "list" && showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Employee Name / ID</p>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name or ID"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Designation</p>
              <input
                type="text"
                value={filters.designation}
                onChange={(e) => setFilters(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="Designation"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Company</p>
              <input
                type="text"
                value={filters.company}
                onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Unit</p>
              <input
                type="text"
                value={filters.branch}
                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                placeholder="Unit"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Department</p>
              <input
                type="text"
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Department"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Cost Center</p>
              <input
                type="text"
                value={filters.costCenter}
                onChange={(e) => setFilters(prev => ({ ...prev, costCenter: e.target.value }))}
                placeholder="Cost Center"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Reporting Manager</p>
              <input
                type="text"
                value={filters.manager}
                onChange={(e) => setFilters(prev => ({ ...prev, manager: e.target.value }))}
                placeholder="Manager"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">DOJ</p>
              <input
                type="text"
                value={filters.doj}
                onChange={(e) => setFilters(prev => ({ ...prev, doj: e.target.value }))}
                placeholder="e.g. 01/2024"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Probation Ends</p>
              <input
                type="text"
                value={filters.probation}
                onChange={(e) => setFilters(prev => ({ ...prev, probation: e.target.value }))}
                placeholder="e.g. 06/2024"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Confirmation Date</p>
              <input
                type="text"
                value={filters.confirmation}
                onChange={(e) => setFilters(prev => ({ ...prev, confirmation: e.target.value }))}
                placeholder="e.g. 09/2024"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Termination / Resigned Date</p>
              <input
                type="text"
                value={filters.termination}
                onChange={(e) => setFilters(prev => ({ ...prev, termination: e.target.value }))}
                placeholder="e.g. 12/2024"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Employment Type</p>
              <input
                type="text"
                value={filters.empType}
                onChange={(e) => setFilters(prev => ({ ...prev, empType: e.target.value }))}
                placeholder="e.g. Full Time"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Contact (Email / Phone)</p>
              <input
                type="text"
                value={filters.contact}
                onChange={(e) => setFilters(prev => ({ ...prev, contact: e.target.value }))}
                placeholder="Email or Phone"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Gender</p>
              <select
                value={filters.gender}
                onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Employment Status</p>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="">All Status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROBATION">Probation</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-600">{employees.length}</span> of <span className="font-semibold text-gray-600">{totalUsers}</span> employees
            </span>
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X size={12} /> Clear All
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-6">
          <Loader />
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {employees.map((emp) => (
            <div key={emp._id} className="bg-white rounded-xl shadow-sm p-6 relative">
              <div className="absolute top-4 right-4">
                <div
                  className="text-blue-500 cursor-pointer"
                  onClick={() => setOpenMenu(openMenu === emp._id ? null : emp._id)}
                >
                  <MoreVertical size={18} />
                </div>

                {openMenu === emp._id && (
                  <div className="absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-md z-50">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => {
                        setOpenMenu(null);
                        navigate(`/hrms/SuperAdmin/employees/profile/${emp._id}`);
                      }}
                    >
                      View Profile
                    </button>

                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${emp.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                        }`}
                      onClick={() => {
                        setOpenMenu(null);
                        setStatusModal({ open: true, emp });
                      }}
                    >
                      {emp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 border-t"
                      onClick={() => {
                        setOpenMenu(null);
                        setDeleteModal({ open: true, emp });
                      }}
                    >
                      Delete User
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-center mb-4 relative">
                {emp.profilePicture || emp.avatar ? (
                  <img
                    src={emp.profilePicture
                      ? (emp.profilePicture.startsWith('http') ? emp.profilePicture : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${emp.profilePicture}`)
                      : emp.avatar
                    }
                    alt={emp.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-gray-200 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">👤</span>
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-1/2 translate-x-10 w-4 h-4 rounded-full border-2 border-white ${emp.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"
                    }`}
                />
              </div>

              <h3 className="text-center text-blue-500 font-semibold text-lg">{emp.name}</h3>
              <p className="text-center text-gray-500 text-sm mt-1">{emp.role}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-blue-50 border-b">
              {filters.name && <FilterTag label="Name/ID" value={filters.name} onClear={() => setFilters(prev => ({ ...prev, name: "" }))} />}
              {filters.designation && <FilterTag label="Designation" value={filters.designation} onClear={() => setFilters(prev => ({ ...prev, designation: "" }))} />}
              {filters.company && <FilterTag label="Company" value={filters.company} onClear={() => setFilters(prev => ({ ...prev, company: "" }))} />}
              {filters.branch && <FilterTag label="Unit" value={filters.branch} onClear={() => setFilters(prev => ({ ...prev, branch: "" }))} />}
              {filters.department && <FilterTag label="Department" value={filters.department} onClear={() => setFilters(prev => ({ ...prev, department: "" }))} />}
              {filters.costCenter && <FilterTag label="Cost Center" value={filters.costCenter} onClear={() => setFilters(prev => ({ ...prev, costCenter: "" }))} />}
              {filters.manager && <FilterTag label="Manager" value={filters.manager} onClear={() => setFilters(prev => ({ ...prev, manager: "" }))} />}
              {filters.doj && <FilterTag label="DOJ" value={filters.doj} onClear={() => setFilters(prev => ({ ...prev, doj: "" }))} />}
              {filters.probation && <FilterTag label="Probation" value={filters.probation} onClear={() => setFilters(prev => ({ ...prev, probation: "" }))} />}
              {filters.confirmation && <FilterTag label="Confirmation" value={filters.confirmation} onClear={() => setFilters(prev => ({ ...prev, confirmation: "" }))} />}
              {filters.termination && <FilterTag label="Termination" value={filters.termination} onClear={() => setFilters(prev => ({ ...prev, termination: "" }))} />}
              {filters.empType && <FilterTag label="Emp. Type" value={filters.empType} onClear={() => setFilters(prev => ({ ...prev, empType: "" }))} />}
              {filters.contact && <FilterTag label="Contact" value={filters.contact} onClear={() => setFilters(prev => ({ ...prev, contact: "" }))} />}
              {filters.gender && <FilterTag label="Gender" value={filters.gender} onClear={() => setFilters(prev => ({ ...prev, gender: "" }))} />}
              {filters.status && <FilterTag label="Status" value={filters.status} onClear={() => setFilters(prev => ({ ...prev, status: "" }))} />}
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-700 px-2 py-1 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
              >
                <X size={10} /> Clear All
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee Name</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Designation</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost Center</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reporting Manager</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">DOJ</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Probation Ends</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Confirmation Date</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-red-500">Termination / Resigned Date</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Employment Type</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Gender</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Docs</th>
                  <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((emp) => {
                  const docs = getDocCounts(emp);
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp.profilePicture || emp.avatar ? (
                            <img
                              src={emp.profilePicture
                                ? (emp.profilePicture.startsWith('http') ? emp.profilePicture : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${emp.profilePicture}`)
                                : emp.avatar
                              }
                              alt={emp.name}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full border bg-gray-50 flex items-center justify-center">
                              <User size={18} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-400">{emp.employeeId || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{emp.designationId?.name || "—"}</td>
                      <td className="p-4 text-sm text-gray-600">{emp.companyId?.name || "—"}</td>
                      <td className="p-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-300" />
                          {emp.unit || emp.branchId?.name || emp.companyId?.unitName || "—"}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{emp.departmentId?.name || "—"}</td>
                      <td className="p-4 text-sm text-gray-500">
                        {emp.costCenterId ? (
                          <div className="text-xs">
                            <div className="font-medium">{emp.costCenterId.name}</div>
                            <div className="text-[10px] text-gray-400">{emp.costCenterId.code}</div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-gray-300" />
                          {emp.managerId?.name || "—"}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "—"}</td>
                      <td className="p-4 text-sm text-gray-500">{emp.probationEndDate ? new Date(emp.probationEndDate).toLocaleDateString() : "—"}</td>
                      <td className="p-4 text-sm text-gray-500">{emp.confirmationDate ? new Date(emp.confirmationDate).toLocaleDateString() : "—"}</td>
                      <td className="p-4 text-sm">
                        {emp.terminationDate ? (
                          <span className="text-red-500 font-medium">{new Date(emp.terminationDate).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-500">{emp.employmentType || "—"}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Mail size={12} className="text-gray-400" /> {emp.email || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone size={12} className="text-gray-400" /> {emp.mobile || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{emp.gender || "—"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${emp.employmentStatus === "CONFIRMED" ? "bg-green-50 text-green-600 border-green-100" :
                          emp.employmentStatus === "TERMINATED" ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-blue-50 text-blue-600 border-blue-100"
                          }`}>
                          {emp.employmentStatus || "PROBATION"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] text-gray-400 uppercase font-bold text-nowrap">Uploaded: {docs.uploaded}/4</div>
                          <div className={`text-[10px] uppercase font-bold text-nowrap ${docs.approved === 4 ? "text-green-500" : "text-blue-500"}`}>
                            Approved: {docs.approved}/4
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => navigate(`/hrms/SuperAdmin/employees/profile/${emp._id}`)}
                            className="flex-1 bg-[#49A7F5] hover:bg-[#3D96E1] text-white py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
                            title="View Profile"
                          >
                            <User size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-gray-400 text-sm">
                      No employees match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalUsers > 15 && totalPages > 1 && (
        <div className="flex justify-end mt-12">
          <div className="flex items-center gap-2 bg-white shadow-md rounded-xl px-4 py-3">
            {getPaginationPages().map((p, index) =>
              p === "..." ? (
                <span key={index} className="px-3 py-2 text-gray-400 text-sm">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={`px-3 py-1 rounded-md transition-all text-xs font-semibold ${page === p
                      ? "bg-[#49A7F5] text-white shadow-sm"
                      : "text-gray-500 hover:bg-[#49A7F5]/5 hover:text-[#49A7F5]"
                    }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2">
              {statusModal.emp?.status === "ACTIVE" ? "Deactivate Account" : "Activate Account"}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to {statusModal.emp?.status === "ACTIVE" ? "deactivate" : "activate"}{" "}
              <span className="font-semibold">{statusModal.emp?.name}</span>'s account?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusModal({ open: false, emp: null })}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusToggle}
                className={`px-4 py-2 text-sm text-white rounded-md shadow-sm transition-all active:scale-95 ${statusModal.emp?.status === "ACTIVE" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2 text-red-600">Delete User Account</h3>
            <p className="text-sm text-gray-600 mb-6">
              Bhai, are you sure you want to delete <span className="font-semibold">{deleteModal.emp?.name}</span>? This action is permanent.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, emp: null })}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Tag Component
function FilterTag({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      <span className="text-orange-400">{label}:</span> {value}
      <button onClick={onClear} className="ml-1 hover:text-red-600 transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}

