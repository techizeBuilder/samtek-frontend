interface PayslipData {
  userId?: string;
  payrollId?: string;
  name: string;
  month: string;
  gross: number;
  deduction: number;
  net: number;
  payDays: number;
  lopDays: number;
  unearnedSalary?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PayslipData | null;
  onDownload?: (id: string, month: string) => void;
}

const ViewPayrollModal = ({ isOpen, onClose, data, onDownload }: Props) => {
  if (!isOpen || !data) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Payroll Details – {data.month}
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{data.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Attendance Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Payable Days</p>
              <p className="text-lg font-bold text-gray-700">{data.payDays} Days</p>
            </div>
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">LOP Days</p>
              <p className="text-lg font-bold text-red-500">{data.lopDays} Days</p>
            </div>
          </div>

          {/* Financials List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Earnings & Deductions</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-600">Gross Earnings</span>
                <span className="font-bold text-gray-800">₹{data.gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-600">Total Deductions</span>
                <span className="font-bold text-red-500">-₹{data.deduction.toLocaleString()}</span>
              </div>
              
              {data.unearnedSalary && data.unearnedSalary > 0 && (
                <div className="flex justify-between items-center text-[10px] py-1 text-gray-400 italic">
                  <span>(Includes ₹{data.unearnedSalary.toLocaleString()} unearned for future days)</span>
                </div>
              )}
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center px-3 py-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-sm font-bold text-blue-800 uppercase tracking-wider">Net Payable</span>
                  <span className="text-xl font-bold text-blue-700">₹{data.net.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-wider"
            >
              Close
            </button>
            <button 
              className="flex-1 py-2.5 px-4 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              onClick={() => {
                if (onDownload && data.payrollId) {
                  onDownload(data.payrollId, data.month);
                } else {
                  alert("Download only available for processed/paid payroll.");
                }
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              PDF Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPayrollModal;
