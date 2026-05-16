/** @format */
const ViewPayslipModal = ({ data, onClose, onDownload }: any) => {
    if (!data) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* HEADER */}
                <div className="bg-orange-500 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mb-1">Electronic Salary Slip</p>
                    <h3 className="text-2xl font-black">
                        {new Date(data.month).toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                        })}
                    </h3>
                </div>

                <div className="p-6">
                    {/* INFO SECTION */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Employee</p>
                            <p className="text-sm font-bold text-gray-800">{data.user?.name || data.employeeName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference ID</p>
                            <p className="text-sm font-mono text-gray-500">#{data._id?.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>

                    {/* SALARY DETAILS */}
                    <div className="space-y-4 mb-8">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-2">Salary Breakdown</h4>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Basic Salary</span>
                                <span className="font-bold text-gray-800">₹{data.basic?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">HRA</span>
                                <span className="font-bold text-gray-800">₹{data.hra?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Allowances</span>
                                <span className="font-bold text-gray-800">₹{data.otherAllowance || data.allowance || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                                <span className="text-gray-500">Deductions</span>
                                <span className="font-bold text-red-500">-₹{data.deduction?.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* TOTAL */}
                        <div className="bg-orange-50 rounded-2xl p-4 flex justify-between items-center border border-orange-100 shadow-inner">
                            <span className="text-sm font-bold text-orange-800 uppercase tracking-wider">Net Amount</span>
                            <span className="text-xl font-black text-orange-600">₹{data.netSalary?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onDownload}
                            className="flex-[2] py-3 px-4 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewPayslipModal;
