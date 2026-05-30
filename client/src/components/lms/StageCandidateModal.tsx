import React, { useState, useEffect } from 'react';
import {
  useAvailableTrainees,
  useModules,
  useStageCandidate
} from '../../hooks/useTraining'; // Adjust path if needed

interface StageCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StageCandidateModal({ isOpen, onClose }: StageCandidateModalProps) {
  // --- STATE ---
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // --- DATA FETCHING ---
  const { data: traineesResponse, isLoading: loadingTrainees } = useAvailableTrainees();
  const { data: modulesResponse, isLoading: loadingModules } = useModules();

  // --- MUTATION ---
  const { mutate: stageCandidate, isPending } = useStageCandidate();

  const availableTrainees = traineesResponse?.data || [];
  const allAvailableModules = modulesResponse?.data || [];

  // --- DYNAMIC DEPARTMENT FILTERING LOGIC ---
  const selectedTrainee = availableTrainees.find((t: any) => t._id === selectedUserId);

  // Strip "Employee" (or Head/Manager) from the role to get the raw department string
  const traineeDept = selectedTrainee ? selectedTrainee.role.replace(/(Employee|Head|Manager)/gi, '').trim() : '';

  // 🔥 THE FIX: Robust normalizer to perfectly match the new departments
  const normalizeDept = (dept: string) => {
    if (!dept) return '';
    const d = dept.toLowerCase().trim();
    if (d.includes('research') || d.includes('r&d')) return 'r&d';
    if (d.includes('account') || d.includes('finance')) return 'accounts';
    if (d.includes('quality') || d === 'qc') return 'qc';
    if (d.includes('store')) return 'store';
    return d;
  };

  const dynamicModules = allAvailableModules.filter((module: any) => {
    if (!traineeDept) return true;
    const modDept = normalizeDept(module.department);
    const userDept = normalizeDept(traineeDept);

    return modDept === userDept || modDept === 'general' || modDept === 'all';
  });

  const isAllSelected = dynamicModules.length > 0 && selectedModules.length === dynamicModules.length;

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setSelectedModules([]);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedModules([]);
  }, [selectedUserId]);

  // --- HANDLERS ---
  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedModules([]);
    } else {
      setSelectedModules(dynamicModules.map((m: any) => m._id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || selectedModules.length === 0) return;

    stageCandidate(
      { userId: selectedUserId, assignedModules: selectedModules },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isPending ? onClose : undefined}
      ></div>

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 z-10 m-4 flex flex-col max-h-[90vh]">

        <div className="flex justify-between items-center mb-5 border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Assign Training to New Hire</h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">

          {/* Step 1 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Unstaged Candidate
            </label>
            {loadingTrainees ? (
              <div className="p-3 bg-gray-50 text-sm text-gray-500 rounded border animate-pulse">Loading candidates...</div>
            ) : availableTrainees.length === 0 ? (
              <div className="p-3 bg-yellow-50 text-sm text-yellow-700 rounded border border-yellow-200">
                No new candidates available for staging. HR must create a User with the "Is Trainee" checkbox selected first.
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="" disabled>-- Select a Candidate --</option>
                {availableTrainees.map((trainee: any) => (
                  <option key={trainee._id} value={trainee._id}>
                    {trainee.fullName} ({trainee.role}) - {trainee.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2 */}
          <div className="mb-2">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-700">
                2. Assign Department Modules
              </label>
              {selectedUserId && !loadingModules && dynamicModules.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Select the courses this candidate must complete before they can be officially onboarded.
            </p>

            {!selectedUserId ? (
              <div className="p-8 text-center bg-gray-50 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300">
                👆 Please select a candidate above to view their relevant department modules.
              </div>
            ) : loadingModules ? (
              <div className="p-3 bg-gray-50 text-sm text-gray-500 rounded border animate-pulse">Loading modules...</div>
            ) : dynamicModules.length === 0 ? (
              <div className="p-4 bg-red-50 text-sm text-red-700 rounded border border-red-200">
                No training modules found for the <strong>{traineeDept}</strong> department.
                Please create modules in the Course Library first.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50">
                {dynamicModules.map((module: any) => (
                  <label
                    key={module._id}
                    className={`flex items-start p-3 rounded cursor-pointer border transition-colors
                      ${selectedModules.includes(module._id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-100'}
                    `}
                  >
                    <div className="flex-shrink-0 h-5 w-5 mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(module._id)}
                        onChange={() => handleModuleToggle(module._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{module.title}</span>
                      <span className="block text-xs text-gray-500">
                        {module.department} • {module.category}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId || selectedModules.length === 0 || isPending}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none transition-colors
                ${(!selectedUserId || selectedModules.length === 0 || isPending)
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {isPending ? 'Staging Candidate...' : `Stage with ${selectedModules.length} Modules`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}