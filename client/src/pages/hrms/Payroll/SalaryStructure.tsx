/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Eye } from "lucide-react";
import AddSalaryStructureModal from "./AddSalaryStructureModal";
import ViewSalaryStructureModal from "./ViewSalaryStructureModal";
import DeleteSalaryStructureModal from "./DeleteSalaryStructureModal";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";


interface SalaryStructure {
  _id: string;
  employee: {
    _id: string;
    name: string;
    employeeId: string;
    joiningDate: string;
    designationId?: { name: string };
    departmentId?: { name: string };
    branchId?: { name: string };
  };
  basic: number;
  hra: number;
  otherAllowance: number;
  pf: number;
  professionalTax: number;
  tds: number;
  advance: number;
  others: number;
}

const API_BASE = import.meta.env.VITE_API_URL;

const SalaryStructure = () => {
  const token = localStorage.getItem("token");

  const [salaryList, setSalaryList] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryStructure | null>(
    null
  );

  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");

  /* ================= FETCH ================= */
  const fetchSalary = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/salary-structures`, {
        params: { companyId: companyFilter },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalaryList(res.data);
    } catch {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
    } catch (err) {
      console.error("Failed to fetch companies");
    }
  };

  useEffect(() => {
    fetchSalary();
  }, [companyFilter]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!selectedSalary) return;

    try {
      const res = await axios.delete(
        `${API_BASE}/salary-structures/${selectedSalary._id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({
        title: "Salary Deleted",
        description:
          res.data?.message || "Salary structure has been deleted successfully.",
      });

      setOpenDeleteModal(false);
      setSelectedSalary(null);
      fetchSalary();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error?.response?.data?.message ||
          "Unable to delete salary structure. Please try again.",
      });
    }
  };

  const calcTotalEarnings = (s: SalaryStructure) =>
    (s.basic || 0) + (s.hra || 0) + (s.otherAllowance || 0);

  const calcTotalDeductions = (s: SalaryStructure) =>
    (s.pf || 0) + (s.professionalTax || 0) + (s.tds || 0) + (s.advance || 0) + (s.others || 0);

  const calcNetSalary = (s: SalaryStructure) =>
    calcTotalEarnings(s) - calcTotalDeductions(s);

  if (loading) {
    return (
      <div className="relative min-h-[300px]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-orange-500">Salary Structure</h1>
          <p className="text-sm text-gray-500">
            HR / Payroll / Salary Structure
          </p>
        </div>

        <div className="flex gap-3">
          <select
            className="border px-3 py-2 rounded-md text-sm outline-none focus:border-orange-500"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedSalary(null);
              setOpenAddModal(true);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600 shadow-md transition-all"
          >
            + Add Salary Structure
          </button>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
            {/* Group Headers */}
            <tr className="border-b">
              <th rowSpan={2} className="px-4 py-3 border-r">No.</th>
              <th colSpan={6} className="px-4 py-2 border-r text-center bg-gray-100/50">Employee Info.</th>
              <th colSpan={4} className="px-4 py-2 border-r text-center bg-green-50">Earnings</th>
              <th colSpan={6} className="px-4 py-2 border-r text-center bg-red-50">Total Deductions</th>
              <th rowSpan={2} className="px-4 py-3 border-r bg-blue-50">Net Salary Payable</th>
              <th rowSpan={2} className="px-4 py-3 text-center">Action</th>
            </tr>
            {/* Field Headers */}
            <tr className="bg-gray-50/50 text-[11px] uppercase tracking-wider">
              {/* Info */}
              <th className="px-2 py-3 border-r">Employee ID</th>
              <th className="px-2 py-3 border-r font-bold">Employee Name</th>
              <th className="px-2 py-3 border-r">Designation</th>
              <th className="px-2 py-3 border-r">Department</th>
              <th className="px-2 py-3 border-r">DOJ</th>
              <th className="px-2 py-3 border-r">Location</th>
              {/* Earnings */}
              <th className="px-2 py-3 border-r">Basic</th>
              <th className="px-2 py-3 border-r">HRA</th>
              <th className="px-2 py-3 border-r">Other Allw.</th>
              <th className="px-2 py-3 border-r font-bold bg-green-100/50">Total Earn.</th>
              {/* Deductions */}
              <th className="px-2 py-3 border-r">Emp PF</th>
              <th className="px-2 py-3 border-r">Prof. Tax</th>
              <th className="px-2 py-3 border-r">TDS</th>
              <th className="px-2 py-3 border-r">Advance</th>
              <th className="px-2 py-3 border-r">Others</th>
              <th className="px-2 py-3 border-r font-bold bg-red-100/50">Total Deduct.</th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {salaryList.length === 0 ? (
              <tr>
                <td colSpan={19} className="text-center py-10 text-gray-400 italic">
                  No salary structure records found
                </td>
              </tr>
            ) : (
              salaryList.map((s, index) => (
                <tr key={s._id} className="border-b hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3 border-r text-center">{index + 1}</td>
                  <td className="px-2 py-3 border-r text-center text-gray-500 font-mono text-[12px]">
                    {s.employee?.employeeId || "-"}
                  </td>
                  <td className="px-2 py-3 border-r text-center font-medium text-orange-600">
                    {s.employee?.name || "Unknown"}
                  </td>
                  <td className="px-2 py-3 border-r text-center">
                    {typeof s.employee?.designationId === "object" ? (s.employee.designationId as any)?.name : (s.employee?.designationId || "-")}
                  </td>
                  <td className="px-2 py-3 border-r text-center">
                    {typeof s.employee?.departmentId === "object" ? (s.employee.departmentId as any)?.name : (s.employee?.departmentId || "-")}
                  </td>
                  <td className="px-2 py-3 border-r text-center">{s.employee?.joiningDate ? new Date(s.employee.joiningDate).toLocaleDateString("en-GB") : "-"}</td>
                  <td className="px-2 py-3 border-r text-center">
                    {typeof s.employee?.branchId === "object" ? (s.employee.branchId as any)?.name : (s.employee?.branchId || "-")}
                  </td>

                  {/* Earnings */}
                  <td className="px-2 py-3 border-r text-center">₹{s.basic}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.hra}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.otherAllowance}</td>
                  <td className="px-2 py-3 border-r text-center font-bold bg-green-50/50">₹{calcTotalEarnings(s)}</td>

                  {/* Deductions */}
                  <td className="px-2 py-3 border-r text-center">₹{s.pf}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.professionalTax}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.tds}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.advance}</td>
                  <td className="px-2 py-3 border-r text-center">₹{s.others}</td>
                  <td className="px-2 py-3 border-r text-center font-bold bg-red-50/50">₹{calcTotalDeductions(s)}</td>

                  <td className="px-4 py-3 border-r text-center bg-blue-50/50 text-blue-700 font-bold text-[14px]">
                    ₹{calcNetSalary(s).toLocaleString()}
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3 text-center relative">
                    <button
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      onClick={() => setOpenMenu(openMenu === s._id ? null : s._id)}
                    >
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>

                    {openMenu === s._id && (
                      <div className="absolute right-8 top-10 w-32 bg-white border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                        <button
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 text-gray-700 transition-colors flex items-center gap-2"
                          onClick={() => {
                            setOpenMenu(null);
                            setSelectedSalary(s);
                            setOpenViewModal(true);
                          }}
                        >
                          <Eye size={14} className="text-gray-400" /> View
                        </button>

                        <button
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 text-gray-700 transition-colors border-t"
                          onClick={() => {
                            setOpenMenu(null);
                            setSelectedSalary(s);
                            setOpenAddModal(true);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t"
                          onClick={() => {
                            setOpenMenu(null);
                            setSelectedSalary(s);
                            setOpenDeleteModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* TOTALS FOOTER */}
          {salaryList.length > 0 && (
            <tfoot className="bg-orange-50 font-bold border-t-2 border-orange-200">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-right text-orange-800 uppercase text-[11px] tracking-wider">Grand Total:</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.basic || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.hra || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.otherAllowance || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center bg-green-100/50">₹{salaryList.reduce((acc, s) => acc + calcTotalEarnings(s), 0).toLocaleString()}</td>
                
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.pf || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.professionalTax || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.tds || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.advance || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center">₹{salaryList.reduce((acc, s) => acc + (s.others || 0), 0).toLocaleString()}</td>
                <td className="px-2 py-3 border-r text-center bg-red-100/50">₹{salaryList.reduce((acc, s) => acc + calcTotalDeductions(s), 0).toLocaleString()}</td>
                
                <td className="px-4 py-3 border-r text-center bg-blue-100/50 text-blue-800 font-black">₹{salaryList.reduce((acc, s) => acc + calcNetSalary(s), 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* VIEW */}
      <ViewSalaryStructureModal
        isOpen={openViewModal}
        data={selectedSalary}
        onClose={() => {
          setOpenViewModal(false);
          setSelectedSalary(null);
        }}
      />

      {/* ADD / EDIT */}
      <AddSalaryStructureModal
        isOpen={openAddModal}
        editData={selectedSalary}
        onClose={() => {
          setOpenAddModal(false);
          setSelectedSalary(null);
          fetchSalary();
        }}
      />

      {/* DELETE */}
      <DeleteSalaryStructureModal
        isOpen={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setSelectedSalary(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default SalaryStructure;


