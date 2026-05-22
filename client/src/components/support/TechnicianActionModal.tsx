import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useStartVisit, useCompleteVisit } from '@/hooks/useComplaints';
import { MapPin, Phone, Play, CheckCircle, Camera, Loader2, X, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TechnicianActionModal({ ticket, onClose }: { ticket: any, onClose: () => void }) {
  const { mutate: startVisit, isPending: isStarting } = useStartVisit();
  const { mutate: completeVisit, isPending: isCompleting } = useCompleteVisit();

  // State for the Completion Form
  const [workDone, setWorkDone] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  // Inventory Parts Selection State
  const [inventorySpares, setInventorySpares] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ item: string; name: string; code: string; quantity: number }[]>([]);
  const [currentPartId, setCurrentPartId] = useState('');
  
  // 🔥 FIX 1: Allow currentQty to be an empty string temporarily so you can backspace it!
  const [currentQty, setCurrentQty] = useState<number | ''>(1);
  
  const [loadingSpares, setLoadingSpares] = useState(false);

  // Fetch spare parts when the ticket is In Progress
  useEffect(() => {
    if (ticket.status === 'In Progress') {
      const fetchSpares = async () => {
        setLoadingSpares(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_BASE}/items?type=Spares&limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setInventorySpares(res.data.items || []);
        } catch (error) {
          console.error("Failed to fetch spare parts:", error);
        } finally {
          setLoadingSpares(false);
        }
      };
      fetchSpares();
    }
  }, [ticket.status]);

  const handleStart = () => {
    startVisit(ticket._id, {
      onSuccess: () => onClose()
    });
  };

  const handleAddPart = () => {
    const qtyToAdd = Number(currentQty) || 1;
    if (!currentPartId || qtyToAdd < 1) return;
    
    const partDetails = inventorySpares.find(p => p._id === currentPartId);
    if (!partDetails) return;

    const existingIndex = selectedParts.findIndex(p => p.item === currentPartId);
    
    if (existingIndex >= 0) {
      const updated = [...selectedParts];
      updated[existingIndex].quantity += qtyToAdd;
      setSelectedParts(updated);
    } else {
      setSelectedParts([...selectedParts, { 
        item: partDetails._id, 
        name: partDetails.name, 
        code: partDetails.code,
        quantity: qtyToAdd 
      }]);
    }

    // Reset inputs
    setCurrentPartId('');
    setCurrentQty(1);
  };

  const handleRemovePart = (itemId: string) => {
    setSelectedParts(selectedParts.filter(p => p.item !== itemId));
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDone) return alert("Work done details are required.");

    let finalParts = [...selectedParts];

    // 🔥 FIX 2: UX SAFETY NET! 
    // If the user selected a part in the dropdown but forgot to hit the '+' button before submitting, auto-add it!
    if (currentPartId) {
       const qtyToAdd = Number(currentQty) || 1;
       const existingIndex = finalParts.findIndex(p => p.item === currentPartId);
       
       if (existingIndex >= 0) {
           finalParts[existingIndex].quantity += qtyToAdd;
       } else {
           const partDetails = inventorySpares.find(p => p._id === currentPartId);
           if (partDetails) {
               finalParts.push({
                   item: partDetails._id,
                   name: partDetails.name,
                   code: partDetails.code,
                   quantity: qtyToAdd
               });
           }
       }
    }

    const formData = new FormData();
    formData.append('workDoneDetails', workDone);
    
    // Stringify the array for the backend to parse
    const formattedPartsPayload = finalParts.map(p => ({
      item: p.item,
      quantity: p.quantity
    }));
    formData.append('partsUsed', JSON.stringify(formattedPartsPayload)); 
    
    files.forEach(file => {
      formData.append('media', file); 
    });

    completeVisit({ id: ticket._id, formData }, {
      onSuccess: () => onClose() 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{ticket.tokenId}</p>
            <h2 className="text-lg font-bold text-gray-800 leading-none">{ticket.customer.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <p className="text-indigo-800 font-bold mb-2">{ticket.issue.issueType} on {ticket.machine.machineType}</p>
            <p className="text-sm text-indigo-600/80 mb-3">{ticket.issue.description || "No description provided."}</p>
            <div className="space-y-1.5 text-sm text-indigo-900/70">
              <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0"/> {ticket.customer.address}</p>
              <p className="flex items-center gap-2"><Phone size={16} className="shrink-0"/> <a href={`tel:${ticket.customer.mobileNumber}`} className="underline font-medium">{ticket.customer.mobileNumber}</a></p>
            </div>
          </div>

          {(ticket.status === 'Pending' || ticket.status === 'Reopened') && (
            <div className="text-center py-6">
              <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Arrived at location?</h3>
              <p className="text-sm text-gray-500 mb-6">Tap start to log your arrival time and begin working on the machine.</p>
              <button 
                onClick={handleStart} disabled={isStarting}
                className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isStarting ? <Loader2 className="animate-spin" /> : <><Play size={20} fill="currentColor" /> Start Visit</>}
              </button>
            </div>
          )}

          {ticket.status === 'In Progress' && (
            <form onSubmit={handleComplete} className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 mb-2">
                <Loader2 size={16} className="animate-spin shrink-0"/> Job in progress. Timer is running.
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Work Done Details *</label>
                <textarea 
                  required rows={3} placeholder="What did you fix?"
                  className="w-full border-gray-300 rounded-xl shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm p-3 border bg-gray-50"
                  value={workDone} onChange={(e) => setWorkDone(e.target.value)}
                />
              </div>

              {/* INVENTORY PARTS SELECTOR */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-3">Parts Replaced (Optional)</label>
                
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <select 
                      className="w-full border-gray-300 rounded-lg shadow-sm text-sm p-2 border bg-white focus:ring-amber-500"
                      value={currentPartId}
                      onChange={(e) => setCurrentPartId(e.target.value)}
                    >
                      <option value="">Select a spare part...</option>
                      {loadingSpares ? (
                        <option disabled>Loading inventory...</option>
                      ) : (
                        inventorySpares.map(spare => (
                          <option key={spare._id} value={spare._id}>
                            {spare.name} ({spare.code}) - Stock: {spare.qty}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="w-20">
                    <input 
                      type="number" min="1" 
                      className="w-full border-gray-300 rounded-lg shadow-sm text-sm p-2 border bg-white focus:ring-amber-500 text-center"
                      value={currentQty}
                      // 🔥 FIX 1 APPLIED: Handle empty strings gracefully
                      onChange={(e) => setCurrentQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddPart}
                    disabled={!currentPartId || (currentQty !== '' && currentQty < 1)}
                    className="bg-gray-800 text-white p-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition shrink-0"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {selectedParts.length > 0 && (
                  <ul className="space-y-2 mt-3">
                    {selectedParts.map((part, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded-lg text-sm">
                        <div>
                          <p className="font-semibold text-gray-800">{part.name}</p>
                          <p className="text-[10px] text-gray-500">Code: {part.code} | Qty: {part.quantity}</p>
                        </div>
                        <button 
                          type="button" onClick={() => handleRemovePart(part.item)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                 <label className="flex text-sm font-bold text-gray-700 mb-1 items-center justify-between">
                   <span>Attach Photos/Video</span>
                   <span className="text-xs font-normal text-gray-400">Max 5 files</span>
                 </label>
                 
                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition relative">
                   <div className="space-y-1 text-center">
                     <Camera className="mx-auto h-10 w-10 text-gray-400" />
                     <div className="flex text-sm text-gray-600 justify-center">
                       <label className="relative cursor-pointer bg-white rounded-md font-medium text-amber-600 hover:text-amber-500 focus-within:outline-none">
                         <span className="px-2">Upload a file</span>
                         <input 
                            type="file" multiple accept="image/*,video/*" className="sr-only" 
                            onChange={(e) => {
                              if (e.target.files) {
                                const selected = Array.from(e.target.files).slice(0, 5);
                                setFiles(selected);
                              }
                            }}
                         />
                       </label>
                     </div>
                     <p className="text-xs text-gray-500">PNG, JPG, MP4 up to 10MB</p>
                   </div>
                 </div>
                 
                 {files.length > 0 && (
                   <ul className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-1">
                     {files.map((f, i) => <li key={i} className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> {f.name}</li>)}
                   </ul>
                 )}
              </div>

              <button 
                type="submit" disabled={isCompleting || !workDone}
                className="w-full bg-amber-500 text-white font-bold text-lg py-4 rounded-xl hover:bg-amber-600 active:scale-95 transition shadow-lg shadow-amber-200 flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isCompleting ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20}/> Complete & Submit</>}
              </button>
            </form>
          )}

          {['Resolved', 'Pending Approval', 'Closed'].includes(ticket.status) && (
            <div className="text-center py-10 bg-green-50 rounded-xl border border-green-100">
               <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
               <h3 className="text-lg font-bold text-green-900">
                 {ticket.status === 'Closed' ? 'Ticket Sealed' : 'Visit Completed'}
               </h3>
               <p className="text-sm text-green-700 mt-1">
                 {ticket.status === 'Resolved' && 'Pending dispatcher action to send verification.'}
                 {ticket.status === 'Pending Approval' && 'Awaiting customer to click the verification link.'}
                 {ticket.status === 'Closed' && 'Customer has verified and closed this ticket.'}
               </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}