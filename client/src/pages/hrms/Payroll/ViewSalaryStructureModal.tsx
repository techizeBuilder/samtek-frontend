/** @format */

import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any | null;
}

const ViewSalaryStructureModal = ({ isOpen, onClose, data }: Props) => {
  if (!isOpen || !data) return null;

  const totalEarnings = (data.basic || 0) + (data.hra || 0) + (data.otherAllowance || 0);
  const totalDeductions = (data.pf || 0) + (data.professionalTax || 0) + (data.tds || 0) + (data.advance || 0) + (data.others || 0);
  const netSalary = totalEarnings - totalDeductions;

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-GB");
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-500/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-bold text-gray-800">Salary Structure Info</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-gray-700">
          {/* Employee Header Info */}
          <div className="mb-8 border-b-2 border-orange-100 pb-5">
            <h3 className="text-2xl font-black text-orange-600 mb-2 uppercase tracking-tight">
              {data.employee?.name || data.employeeName || "Unknown Employee"}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase w-20">Employee ID:</span>
                <span className="text-sm font-semibold">{data.employee?.employeeId || data.employeeId || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase w-20">Designation:</span>
                <span className="text-sm font-semibold">
                  {typeof data.employee?.designationId === "object" ? data.employee.designationId?.name : (data.employee?.designationId || "N/A")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase w-20">Department:</span>
                <span className="text-sm font-semibold">
                  {typeof data.employee?.departmentId === "object" ? data.employee.departmentId?.name : (data.employee?.departmentId || "N/A")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase w-20">Location:</span>
                <span className="text-sm font-semibold">
                  {typeof data.employee?.branchId === "object" ? data.employee.branchId?.name : (data.employee?.branchId || "N/A")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase w-20">Date of Join:</span>
                <span className="text-sm font-semibold">{formatDate(data.employee?.joiningDate)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* EARNINGS */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 border-b pb-1 mb-4">Earnings</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Basic Salary</span>
                  <span className="font-semibold text-gray-800">₹{data.basic?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">HRA</span>
                  <span className="font-semibold text-gray-800">₹{data.hra?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Other Allowance</span>
                  <span className="font-semibold text-gray-800">₹{data.otherAllowance?.toLocaleString()}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Total Earnings</span>
                  <span className="text-sm font-bold text-green-600">₹{totalEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 border-b pb-1 mb-4">Deductions</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Employee PF</span>
                  <span className="font-semibold text-gray-800">₹{data.pf?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Professional Tax</span>
                  <span className="font-semibold text-gray-800">₹{data.professionalTax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Income Tax (TDS)</span>
                  <span className="font-semibold text-gray-800">₹{data.tds?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Advance</span>
                  <span className="font-semibold text-gray-800">₹{data.advance?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Others</span>
                  <span className="font-semibold text-gray-800">₹{data.others?.toLocaleString()}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Total Deductions</span>
                  <span className="text-sm font-bold text-red-600">₹{totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NET PAYABLE */}
          <div className="mt-8 bg-gray-50 rounded p-4 flex justify-between items-center border">
             <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ">Net Salary Payable</p>
               <h4 className="text-xl font-bold text-gray-800">₹{netSalary.toLocaleString()}</h4>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ">Monthly CTC</p>
                <p className="text-sm font-bold text-gray-600">₹{totalEarnings.toLocaleString()}</p>
             </div>
          </div>
        </div>

        <div className="p-4 border-t bg-white text-right">
          <button 
            onClick={onClose}
            className="border text-gray-600 px-6 py-2 rounded text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSalaryStructureModal;
