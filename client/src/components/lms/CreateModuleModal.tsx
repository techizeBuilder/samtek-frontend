import React, { useState, useEffect } from 'react';
import { useCreateTrainingModule } from '../../hooks/useTraining';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS = ["Production", "Packing", "Dispatch", "Accounts", "Sales", "General"];
const CATEGORIES = ["Induction", "SOP", "Reporting", "ERP Usage", "Professional / Behavioral", "Task Management", "Skill", "Safety", "Customer Relationship", "Sales", "Product", "Demo"];
const TOP_LEVEL_ADMINS = ['HR-Admin', 'Super Admin', 'Admin', 'Company Admin'];

export default function CreateModuleModal({ isOpen, onClose }: CreateModuleModalProps) {
  // --- ROLE CHECKS ---
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isTopAdmin = currentUser && TOP_LEVEL_ADMINS.includes(currentUser.role);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState<number | ''>('');
  
  // File Staging State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [watchTimes, setWatchTimes] = useState<number[]>([]);

  const { mutate: createModule, isPending } = useCreateTrainingModule();

  useEffect(() => {
    if (isOpen) {
      setTitle(''); setDescription(''); setDepartment(''); setCategory(''); setSequenceOrder('');
      setSelectedFiles([]); setWatchTimes([]);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      // Initialize watch times to 0 for each new file
      setWatchTimes(filesArray.map(() => 0));
    }
  };

  const handleWatchTimeChange = (index: number, value: number) => {
    const newWatchTimes = [...watchTimes];
    newWatchTimes[index] = value;
    setWatchTimes(newWatchTimes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Department is only required if they are an HR/Top Admin
    if (!title || !category || sequenceOrder === '') return;
    if (isTopAdmin && !department) return; 

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    
    // Only append assignedDepartment if it's an Admin. Dept Heads are handled by backend.
    if (isTopAdmin) {
      formData.append('assignedDepartment', department);
    }
    
    formData.append('category', category);
    formData.append('sequenceOrder', sequenceOrder.toString());
    formData.append('minWatchTimes', JSON.stringify(watchTimes));

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    createModule(formData, {
      onSuccess: () => onClose()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={!isPending ? onClose : undefined}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Create New Training Module</h2>
          <button onClick={onClose} disabled={isPending} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Module Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            
            {/* 🔥 DYNAMIC DEPARTMENT FIELD */}
            {isTopAdmin ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                  <option value="" disabled>Select Dept</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div className="opacity-75">
                <label className="block text-sm font-medium text-gray-700">Department Assignment</label>
                <div className="mt-1 w-full rounded-md border border-gray-300 bg-gray-50 shadow-sm p-2 text-sm font-semibold text-gray-600 cursor-not-allowed">
                  Locked: {currentUser?.role.replace(/(Head|Manager)/gi, '').trim() || 'Your Department'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="" disabled>Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sequence Order *</label>
              <input type="number" min="1" value={sequenceOrder} onChange={e => setSequenceOrder(parseInt(e.target.value))} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Content (Videos, PDFs, PPTs)</label>
            <input type="file" multiple accept=".pdf,.ppt,.pptx,.mp4,.mov,.mkv,.avi,.webm" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            
            {/* Watch Time Configurator */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded border">
                <p className="text-xs font-semibold text-gray-500 uppercase">Set Minimum Watch Times (Seconds)</p>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="truncate w-2/3">{file.name}</span>
                    <input 
                      type="number" min="0" placeholder="Seconds" 
                      value={watchTimes[idx]} 
                      onChange={(e) => handleWatchTimeChange(idx, parseInt(e.target.value) || 0)}
                      className="w-24 rounded border-gray-300 shadow-sm p-1 border text-right"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <button type="button" onClick={onClose} disabled={isPending} className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isPending ? 'Uploading...' : 'Create Module'}
          </button>
        </div>
      </div>
    </div>
  );
}