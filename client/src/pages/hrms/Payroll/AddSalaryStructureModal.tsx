/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "../../../hooks/use-toast";
import { useAuth } from "../../../hooks/useAuth";
import { never } from "zod";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editData: any | null;
}

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
  fullName: string;
  role: string;
  companyId: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

const AddSalaryStructureModal = ({ isOpen, onClose, editData }: Props) => {
  const { user: currentUser } = useAuth() as any;
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employee, setEmployee] = useState("");

  // Earnings
  const [basic, setBasic] = useState(0);
  const [hra, setHra] = useState(0);
  const [otherAllowance, setOtherAllowance] = useState(0);

  // Deductions
  const [pf, setPf] = useState(0);
  const [professionalTax, setProfessionalTax] = useState(0);
  const [tds, setTds] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [others, setOthers] = useState(0);

  /* CALCULATIONS */
  const totalEarnings = basic + hra + otherAllowance;
  const totalDeductions = pf + professionalTax + tds + advance + others;
  const netSalary = totalEarnings - totalDeductions;

  /* PREFILL */
  useEffect(() => {
    if (editData) {
      setEmployee(editData.employee?._id || editData.employee || "");
      setBasic(editData.basic || 0);
      setHra(editData.hra || 0);
      setOtherAllowance(editData.otherAllowance || 0);
      setPf(editData.pf || 0);
      setProfessionalTax(editData.professionalTax || 0);
      setTds(editData.tds || 0);
      setAdvance(editData.advance || 0);
      setOthers(editData.others || 0);
    } else {
      setEmployee("");
      setBasic(0);
      setHra(0);
      setOtherAllowance(0);
      setPf(0);
      setProfessionalTax(0);
      setTds(0);
      setAdvance(0);
      setOthers(0);
    }
  }, [editData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    axios
      .get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const allUsers = res.data.users || res.data.data?.users || res.data || [];
        // Filter by same company as current user
        if (currentUser?.companyId) {
          const companyId = typeof currentUser.companyId === 'string' ? currentUser.companyId : currentUser.companyId._id;
          const filtered = allUsers.filter((u: any) => {
            const userCompanyId = typeof u.companyId === 'string' ? u.companyId : u.companyId?._id;
            return userCompanyId === companyId;
          });
          setEmployees(filtered);
        } else {
          setEmployees(allUsers);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch employees", err);
        setEmployees([]);
      });
  }, [isOpen, currentUser, token]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      if (!employee) {
        toast({ variant: "destructive", title: "Error", description: "Please select an employee" });
        return;
      }

      const payload = {
        employee,
        basic,
        hra,
        otherAllowance,
        pf,
        professionalTax,
        tds,
        advance,
        others
      };

      if (editData) {
        await axios.put(
          `${API_BASE}/salary-structures/${editData._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast({ title: "Success", description: "Salary structure updated" });
      } else {
        await axios.post(`${API_BASE}/salary-structures`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast({ title: "Success", description: "Salary structure added" });
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error?.response?.data?.message || "Failed to save salary structure",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg flex flex-col max-h-[95vh] overflow-hidden border">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <h2 className="text-lg font-semibold text-gray-800">
            {editData ? "Edit Salary Structure" : "Add Salary Structure"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* Employee Selection */}
          <div className="mb-5">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Employee <span className="text-red-500">*</span></label>
            {editData ? (
              <div className="w-full border bg-gray-50 px-3 py-2 rounded mt-1 text-sm text-gray-700 font-medium">
                {editData.employee?.fullName ||
                  (editData.employee as any)?.name ||
                  employees.find((e) => e._id === employee)?.fullName ||
                  "Unknown Employee"}
                {editData.employee?.employeeId ? ` (${editData.employee.employeeId})` : ""}
              </div>
            ) : (
              <select
                className="w-full border px-3 py-2 rounded mt-1 text-sm outline-none focus:border-orange-500"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.fullName || (e as any).name || "No Name"} ({e.role || "No Role"})
                  </option>
                ))}
              </select>
            )}
            {editData && <p className="text-[10px] text-gray-400 mt-1 italic">* Cannot change employee in edit mode</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 border-b pb-1">Earnings</h3>
              {[
                ["Basic Salary", basic, setBasic],
                ["HRA", hra, setHra],
                ["Other Allowance", otherAllowance, setOtherAllowance],
              ].map(([label, val, setVal]: any, i) => (
                <div key={i}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      className="w-full border pl-7 pr-3 py-1.5 rounded text-sm outline-none focus:border-orange-500"
                      value={val}
                      onChange={(e) => setVal(Math.max(0, +e.target.value))}
                    />
                  </div>
                </div>
              ))}
              <div className="bg-gray-50 p-2 rounded border flex justify-between items-center mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Gross</span>
                <span className="text-sm font-bold text-gray-900">₹{totalEarnings}</span>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 border-b pb-1">Deductions</h3>
              {[
                ["Employee PF", pf, setPf],
                ["Professional Tax", professionalTax, setProfessionalTax],
                ["Income Tax (TDS)", tds, setTds],
                ["Advance", advance, setAdvance],
                ["Others", others, setOthers],
              ].map(([label, val, setVal]: any, i) => (
                <div key={i}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      className="w-full border pl-7 pr-3 py-1.5 rounded text-sm outline-none focus:border-orange-500"
                      value={val}
                      onChange={(e) => setVal(Math.max(0, +e.target.value))}
                    />
                  </div>
                </div>
              ))}
              <div className="bg-gray-50 p-2 rounded border flex justify-between items-center mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Total Ded.</span>
                <span className="text-sm font-bold text-gray-900">₹{totalDeductions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-6 border-t flex flex-col items-end gap-4 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Net Payable:</span>
            <span className="text-lg font-bold text-orange-600">₹{netSalary}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 shadow-sm"
            >
              {editData ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSalaryStructureModal;
