import React, { useState, useEffect } from 'react';
import { useCreateTicket, useCustomerHistory } from '@/hooks/useComplaints';
import { Phone, User, MapPin, Monitor, AlertCircle, FileText, Loader2, History, Box, ChevronRight, Mail } from 'lucide-react';

// --- SIDEBAR COMPONENT ---
const HistorySidebar = ({ history, onSelectMachine }: { history: any, onSelectMachine: (machine: any) => void }) => {
  if (!history) return (
    <div className="w-full lg:w-80 lg:border-l border-gray-100 lg:pl-6 flex flex-col items-center justify-center text-center text-gray-400 min-h-[200px]">
      <History size={32} className="mb-2 opacity-50" />
      <p className="text-sm">Enter a 10-digit mobile number to auto-fetch history.</p>
    </div>
  );

  return (
    <div className="w-full lg:w-80 lg:border-l border-t lg:border-t-0 border-gray-100 lg:pl-6 pt-6 lg:pt-0 flex flex-col max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
        <History size={16} className="text-indigo-500" /> Customer Insight
      </h3>
      
      {/* 1. Purchase & Warranty */}
      <div className="mb-6">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Assets & Warranty</h4>
        <div className="space-y-3">
          {history.pastPurchases?.length > 0 ? history.pastPurchases.map((p: any, i: number) => (
            <div 
              key={i} 
              onClick={() => onSelectMachine(p)}
              className="p-3 bg-white border border-indigo-100 rounded-lg text-xs shadow-sm hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-800 group-hover:text-indigo-700 transition">{p.machineType}</p>
                  <p className="text-gray-500 mt-0.5">S/N: {p.serialNumber}</p>
                </div>
                <ChevronRight size={14} className="text-indigo-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  p.warrantyStatus?.startsWith('Active') ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  Warranty: {p.warrantyStatus}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-2">
                <Box size={10} /> AMC: <span className="font-medium text-gray-700">{p.amcStatus}</span>
              </div>
            </div>
          )) : <p className="text-xs text-gray-400 italic">No registered assets found.</p>}
        </div>
      </div>

      {/* 2. Previous Complaints */}
      <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Complaints</h4>
        <div className="space-y-2">
          {history.previousComplaints?.length > 0 ? (
            history.previousComplaints.map((t: any, i: number) => (
              <div key={i} className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs">
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-gray-700">{t.tokenId}</span>
                  <span className={`${
                    t.status === 'Resolved' || t.status === 'Closed' ? 'text-green-600' : 'text-amber-600'
                  }`}>{t.status}</span>
                </div>
                <p className="text-gray-600 font-medium">{t.issue?.issueType}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No previous tickets.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN FORM COMPONENT ---
export default function TicketCreationForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    customer: { mobileNumber: '', name: '', email: '', address: '' },
    machine: { 
      machineType: '', 
      model: '', 
      serialNumber: '',
      warrantyStatus: 'Unknown', // 🔥 Added warranty status
      amcStatus: 'Unknown'       // 🔥 Added AMC status
    },
    issue: { issueType: 'Breakdown', description: '' },
    priority: { level: 'Medium' }
  });

  const { data: historyRes, isFetching: isFetchingHistory } = useCustomerHistory(formData.customer.mobileNumber);
  const history = historyRes?.data;

  useEffect(() => {
    if (history) {
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          name: history.customerName || prev.customer.name,
          email: history.email || prev.customer.email, 
          address: history.address || prev.customer.address,
        }
      }));
    }
  }, [history]);

  const { mutate: createTicket, isPending } = useCreateTicket();

  const handleInputChange = (section: 'customer' | 'machine' | 'issue' | 'priority', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  // 🔥 Now correctly grabs Warranty and AMC from the clicked history item
  const handleSelectMachine = (machine: any) => {
    setFormData(prev => ({
      ...prev,
      machine: {
        machineType: machine.machineType || '',
        model: machine.model || '',
        serialNumber: machine.serialNumber || '',
        warrantyStatus: machine.warrantyStatus || 'Unknown',
        amcStatus: machine.amcStatus || 'Unknown'
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payloadToSubmit = {
      source: 'Call',
      customer: formData.customer,
      machine: formData.machine,
      issue: formData.issue,
      priorityLevel: formData.priority.level 
    };

    createTicket(payloadToSubmit, { onSuccess: () => onClose() });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* FORM SECTION */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Customer Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={16} className="text-blue-500" /> Customer Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    required type="text" maxLength={10} placeholder="10-digit number"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.customer.mobileNumber}
                    onChange={(e) => handleInputChange('customer', 'mobileNumber', e.target.value.replace(/\D/g, ''))}
                  />
                  {isFetchingHistory && <Loader2 size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-500 animate-spin" />}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer / Company Name *</label>
                <input
                  required type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={formData.customer.name}
                  onChange={(e) => handleInputChange('customer', 'name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    required type="email" placeholder="customer@example.com"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.customer.email}
                    onChange={(e) => handleInputChange('customer', 'email', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                  <MapPin size={12}/> Address
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  value={formData.customer.address}
                  onChange={(e) => handleInputChange('customer', 'address', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Machine Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Monitor size={16} className="text-orange-500" /> Machine Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Machine Type *</label>
                <input
                  required type="text" placeholder="e.g., CNC Router"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={formData.machine.machineType}
                  onChange={(e) => handleInputChange('machine', 'machineType', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.machine.model}
                    onChange={(e) => handleInputChange('machine', 'model', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.machine.serialNumber}
                    onChange={(e) => handleInputChange('machine', 'serialNumber', e.target.value)}
                  />
                </div>
              </div>
              
              {/* 🔥 NEW: Warranty & AMC Status Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Status</label>
                  <input
                    type="text"
                    placeholder="e.g., Active, Expired"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.machine.warrantyStatus}
                    onChange={(e) => handleInputChange('machine', 'warrantyStatus', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">AMC Status</label>
                  <input
                    type="text"
                    placeholder="e.g., Valid until 2027"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={formData.machine.amcStatus}
                    onChange={(e) => handleInputChange('machine', 'amcStatus', e.target.value)}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Issue Section */}
          <div className="lg:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" /> Complaint Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type *</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={formData.issue.issueType}
                    onChange={(e) => handleInputChange('issue', 'issueType', e.target.value)}
                  >
                    <option value="Breakdown">Breakdown</option>
                    <option value="Performance Issue">Performance Issue</option>
                    <option value="Installation">Installation</option>
                    <option value="Training">Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority *</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={formData.priority.level}
                    onChange={(e) => handleInputChange('priority', 'level', e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                  <FileText size={12}/> Detailed Description *
                </label>
                <textarea
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                  placeholder="Describe the problem reported by the customer..."
                  value={formData.issue.description}
                  onChange={(e) => handleInputChange('issue', 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
          <button type="submit" disabled={isPending} className="px-6 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isPending ? <><Loader2 size={16} className="animate-spin"/> Registering...</> : 'Register Complaint'}
          </button>
        </div>
      </form>

      {/* SIDEBAR SECTION */}
      <HistorySidebar history={history} onSelectMachine={handleSelectMachine} />
    </div>
  );
}