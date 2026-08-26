import React, { useState, useEffect } from 'react';
import {
  useTraineeDetails,
  useFinalizeTrainee,
  useModules,
  useUpdateTraineeModules,
  useViewCertificate
} from '../../hooks/useTraining';
import { usePermissions } from '../../hooks/usePermissions';

interface TraineeDetailsViewProps {
  isOpen: boolean;
  profileId: string | null;
  onClose: () => void;
}

const TOP_LEVEL_ADMINS = ['HR-Admin', 'Super Admin', 'Admin', 'Company Admin'];

// ==========================================
// NEW COMPONENT: THE TEST REVIEW MODAL
// ==========================================
const TestReviewModal = ({ isOpen, onClose, attempt }: { isOpen: boolean, onClose: () => void, attempt: any }) => {
  if (!isOpen || !attempt) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {attempt.isPassed ? '✅' : '❌'} Review: Attempt {attempt.attemptNumber}
            </h2>
            <div className="text-sm text-gray-500 mt-1 flex gap-4">
              <span><strong>Score:</strong> {attempt.scorePercentage}%</span>
              <span><strong>Time Taken:</strong> {attempt.timeTakenFormatted}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/50 flex-1">
          {attempt.reviewData?.length > 0 ? (
            attempt.reviewData.map((item: any, idx: number) => (
              <div key={idx} className={`p-5 rounded-lg border shadow-sm bg-white ${item.isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                <p className="font-semibold text-gray-900 text-sm mb-4 break-words">
                  <span className={item.isCorrect ? 'text-green-600' : 'text-red-600'}>Q{idx + 1}.</span> {item.questionText}
                </p>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className={`p-3 rounded-md border break-words ${item.isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                    <span className="block text-xs font-bold uppercase mb-1 opacity-75">Candidate's Answer</span>
                    {item.selectedAnswerText}
                  </div>

                  {!item.isCorrect && (
                    <div className="p-3 rounded-md border bg-blue-50 border-blue-200 text-blue-900 break-words">
                      <span className="block text-xs font-bold uppercase mb-1 opacity-75">Correct Answer</span>
                      {item.correctAnswerText}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-10">No detailed review data available for this older attempt.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: TRAINEE DETAILS VIEW
// ==========================================
export default function TraineeDetailsView({ isOpen, profileId, onClose }: TraineeDetailsViewProps) {

  const [isEditingModules, setIsEditingModules] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  // Tracks which attempt the user wants to review
  const [reviewAttempt, setReviewAttempt] = useState<any>(null);

  const currentUserStr = localStorage.getItem('user');
  const currentUserRole = currentUserStr ? JSON.parse(currentUserStr).role : '';
  const { hasAnyModuleFeatureAccess } = usePermissions();
  const canEdit = hasAnyModuleFeatureAccess('lms', 'edit');
  const canFinalize = TOP_LEVEL_ADMINS.includes(currentUserRole) && canEdit;

  const { data: response, isLoading, isError } = useTraineeDetails(profileId || '');
  const { mutate: finalizeTrainee, isPending: isFinalizing } = useFinalizeTrainee();

  const { data: modulesResponse, isLoading: isLoadingModules } = useModules();
  const { mutate: updateModules, isPending: isUpdatingModules } = useUpdateTraineeModules();

  const { mutate: viewCertificate, isPending: isViewingCert } = useViewCertificate();

  const profile = response?.data;
  const analytics = profile?.analytics;
  const assignedModules = profile?.assignedModules || [];
  const allAvailableModules = modulesResponse?.data || [];
  const user = profile?.user;

  // 🔥 THE FIX: Use the robust normalizer so "Edit Courses" works perfectly for the new departments
  const traineeDept = profile?.assignedDepartment || '';

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

  useEffect(() => {
    if (isEditingModules && assignedModules) {
      setSelectedModuleIds(assignedModules.map((m: any) => m._id));
    }
  }, [isEditingModules, assignedModules]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingModules(false);
      setReviewAttempt(null); // Reset review modal on close
    }
  }, [isOpen]);

  if (!isOpen || !profileId) return null;

  const handleFinalize = (action: 'hire' | 'reject') => {
    const actionText = action === 'hire' ? 'Approve & Activate' : 'Revoke Access';
    if (window.confirm(`Are you sure you want to ${actionText}? This updates their permanent HRMS record.`)) {
      finalizeTrainee({ id: profileId, action }, {
        onSuccess: () => onClose()
      });
    }
  };

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModuleIds(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSaveModules = () => {
    if (selectedModuleIds.length === 0) return alert("Please select at least one module.");
    updateModules({ id: profileId, assignedModules: selectedModuleIds }, {
      onSuccess: () => setIsEditingModules(false)
    });
  };

  const isPendingDecision = profile?.status === 'Passed' || profile?.status === 'Failed';
  const isAlreadyFinalized = profile?.status === 'Completed_Onboarding' || profile?.status === 'Rejected';
  const hasPassed = profile?.status === 'Passed' || profile?.status === 'Completed_Onboarding';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

      <div className="relative bg-gray-50 rounded-lg shadow-xl w-full max-w-5xl m-4 max-h-[90vh] flex flex-col overflow-hidden z-10">

        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
          <h2 className="text-xl font-bold text-gray-900">Candidate Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><p className="text-gray-500 animate-pulse">Loading detailed candidate data...</p></div>
          ) : isError || !profile ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-md">Error loading candidate details.</div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user?.fullName || 'Unknown User'}</h1>
                  <p className="text-gray-500">{user?.email} • {profile.assignedDepartment} Department</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${profile.status === 'Passed' ? 'bg-green-100 text-green-800' :
                        profile.status === 'Completed_Onboarding' ? 'bg-blue-600 text-white' :
                          profile.status === 'Failed' ? 'bg-red-100 text-red-800' :
                            profile.status === 'Rejected' ? 'bg-gray-800 text-white' :
                              'bg-blue-100 text-blue-800'}`}>
                      Status: {profile.status.replace(/_/g, ' ')}
                    </span>
                    {!profile.isEligible && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Not Eligible
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-3 items-center">
                    {hasPassed && (
                      <button
                        onClick={() => viewCertificate(profileId)}
                        disabled={isViewingCert}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors shadow-sm font-bold text-sm flex items-center gap-2"
                      >
                        <span className="text-lg">🎓</span>
                        {isViewingCert ? 'Loading PDF...' : 'Preview Certificate'}
                      </button>
                    )}

                    {canFinalize && isPendingDecision && !isAlreadyFinalized && (
                      <>
                        <button
                          onClick={() => handleFinalize('reject')}
                          disabled={isFinalizing}
                          className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm font-medium text-sm"
                        >
                          Revoke Access
                        </button>
                        <button
                          onClick={() => handleFinalize('hire')}
                          disabled={isFinalizing || profile.status === 'Failed'}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm font-medium text-sm"
                        >
                          Complete Onboarding
                        </button>
                      </>
                    )}
                  </div>

                  {canFinalize && !isPendingDecision && !isAlreadyFinalized && (
                    <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border">
                      Decisions unlock when training completes.
                    </div>
                  )}

                  {canFinalize && isAlreadyFinalized && (
                    <div className={`px-4 py-2 rounded-md font-bold text-sm shadow-inner ${profile.status === 'Completed_Onboarding' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {profile.status === 'Completed_Onboarding' ? '✅ Onboarding Completed - User is Active' : '❌ Access Revoked & Terminated'}
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium uppercase">Overall Progress</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.progressPercentage || 0}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-gray-100" style={{ borderTopColor: '#3b82f6', transform: `rotate(${(analytics?.progressPercentage || 0) * 3.6}deg)` }}></div>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 font-medium uppercase">Modules Completed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analytics?.completedCount || 0} <span className="text-lg text-gray-400 font-normal">/ {analytics?.totalAssigned || 0}</span>
                  </p>
                </div>
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 font-medium uppercase">Training Time</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {isPendingDecision || isAlreadyFinalized ? 'Completed' : 'Tracking Active'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Started: {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Detailed Modules List */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Assigned Coursework Breakdown</h2>
                {!isEditingModules ? (
                  <button
                    onClick={() => setIsEditingModules(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1 rounded-md transition-colors"
                  >
                    Edit Courses
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingModules(false)}
                      className="text-sm text-gray-600 hover:text-gray-800 bg-gray-200 px-3 py-1 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveModules}
                      disabled={isUpdatingModules}
                      className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isUpdatingModules ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                {isEditingModules ? (
                  <div className="p-4 bg-gray-50 max-h-80 overflow-y-auto">
                    {isLoadingModules ? (
                      <p className="text-sm text-gray-500">Loading master module list...</p>
                    ) : dynamicModules.length === 0 ? (
                      <p className="text-sm text-red-500 font-medium p-2">
                        No training modules found for the {profile?.assignedDepartment} department.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {dynamicModules.map((mod: any) => (
                          <label key={mod._id} className={`flex items-start p-3 rounded cursor-pointer border transition-colors ${selectedModuleIds.includes(mod._id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                            <div className="flex-shrink-0 h-5 w-5 mt-0.5">
                              <input type="checkbox" checked={selectedModuleIds.includes(mod._id)} onChange={() => handleModuleToggle(mod._id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            </div>
                            <div className="ml-3 flex-1">
                              <span className="block text-sm font-medium text-gray-900">{mod.title}</span>
                              <span className="block text-xs text-gray-500">{mod.department} • {mod.category}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  assignedModules.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No modules assigned to this candidate yet.</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {assignedModules.map((module: any, index: number) => {
                        const testAttempts = module.testAttempts || [];
                        const bestScore = testAttempts.length > 0 ? Math.max(...testAttempts.map((t: any) => t.scorePercentage)) : null;

                        return (
                          <li key={module._id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">{index + 1}. {module.title}</span>
                                <span className="text-sm text-gray-500 mt-1">{module.category}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                {bestScore !== null && (
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase">Best Score</p>
                                    <p className={`font-bold ${bestScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>{bestScore}%</p>
                                  </div>
                                )}
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${module.progressStatus === 'Completed' ? 'bg-green-100 text-green-800' : module.progressStatus === 'In-Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {module.progressStatus || 'Pending'}
                                </span>
                              </div>
                            </div>

                            {testAttempts.length > 0 && (
                              <div className="mt-4 grid gap-2">
                                {testAttempts.map((attempt: any, idx: number) => (
                                  <div
                                    key={attempt._id || idx}
                                    className={`text-sm p-3 rounded border flex flex-col md:flex-row md:items-center justify-between gap-3 
                                      ${attempt.isPassed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                                  >
                                    <div className="font-semibold flex items-center gap-2">
                                      {attempt.isPassed ? '✅' : '⚠'}
                                      <span>Attempt {attempt.attemptNumber} {attempt.isPassed ? '(Passed)' : '(Failed)'}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium opacity-90">
                                      <span className="flex items-center gap-1" title="Time Taken">
                                        ⏱ {attempt.timeTakenFormatted || 'N/A'}
                                      </span>
                                      <span className="flex items-center gap-1 text-green-700" title="Correct Answers">
                                        ✔ {attempt.correctAnswers || 0} Correct
                                      </span>
                                      <span className="flex items-center gap-1 text-red-700" title="Wrong Answers">
                                        ❌ {attempt.wrongAnswers || 0} Wrong
                                      </span>
                                      <span className="font-bold border-l pl-4 border-current">
                                        Score: {attempt.scorePercentage}%
                                      </span>

                                      <button
                                        onClick={() => setReviewAttempt(attempt)}
                                        className={`ml-2 px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm bg-white border 
                                          ${attempt.isPassed ? 'border-green-300 text-green-700 hover:bg-green-100' : 'border-red-300 text-red-700 hover:bg-red-100'}`}
                                      >
                                        View Details
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <TestReviewModal
        isOpen={!!reviewAttempt}
        onClose={() => setReviewAttempt(null)}
        attempt={reviewAttempt}
      />

    </div>
  );
}