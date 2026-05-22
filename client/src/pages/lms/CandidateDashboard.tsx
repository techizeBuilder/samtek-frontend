import React from 'react';
import { useLocation } from 'wouter'; // Swapped to Wouter
import { useMyDashboard } from '../../hooks/useTraining';

export default function CandidateDashboard() {
  const [, setLocation] = useLocation(); // Wouter's navigation hook
  const { data: response, isLoading, isError } = useMyDashboard();

  // Extract data from the API response
  const modules = response?.modules || [];
  const profileStatus = response?.profileStatus;
  const isEligible = response?.isEligible;
  const overallProgress = response?.overallProgressPercentage || 0;

  // --- RENDER: LOADING STATE ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-500 font-medium">Loading your training dashboard...</p>
        </div>
      </div>
    );
  }

  // --- RENDER: ERROR STATE ---
  if (isError || !response) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto mt-10 bg-red-50 rounded-xl border border-red-100">
        <h2 className="text-red-700 font-bold text-lg mb-2">Could not load dashboard</h2>
        <p className="text-red-600">Please contact HR or your manager to ensure your training profile is set up.</p>
      </div>
    );
  }

  // --- HELPER: Action Button Logic ---
 // --- HELPER: Action Button Logic ---
  const renderActionButton = (mod: any) => {
    // 1. Locked by Sequence
    if (mod.isLockedBySequence) {
      return (
        <button disabled className="w-full py-2.5 rounded-lg text-sm font-bold bg-gray-100 text-gray-400 flex justify-center items-center gap-2 cursor-not-allowed">
          🔒 Locked
        </button>
      );
    }

    // 2. Fully Passed (Can still review!)
    if (mod.isPassed) {
      return (
        <div className="flex flex-col gap-2">
          <button disabled className="w-full py-2.5 rounded-lg text-sm font-bold bg-green-50 text-green-700 border border-green-200 flex justify-center items-center gap-2">
            ✓ Completed (Score: {mod.bestScore}%)
          </button>
          <button 
            onClick={() => setLocation(`/lms/my-training/${mod._id}/learn`)}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Review Materials
          </button>
        </div>
      );
    }

    // 3. Needs to Retake Test (Failed 1st Attempt)
    if (!mod.isPassed && mod.attemptsUsed === 1) {
      return (
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setLocation(`/lms/my-training/${mod._id}/quiz`)}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors animate-pulse"
          >
            Retake Assessment (1 Attempt Left)
          </button>
          {/* Allow them to study before their final attempt! */}
          <button 
            onClick={() => setLocation(`/lms/my-training/${mod._id}/learn`)}
            className="w-full py-2 rounded-lg text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            Review Materials First
          </button>
        </div>
      );
    }

    // 4. Ready for First Test (Contents watched, test unlocked)
    if (mod.isTestUnlocked && mod.attemptsUsed === 0) {
      return (
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setLocation(`/lms/my-training/${mod._id}/quiz`)}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
          >
            Take Assessment
          </button>
          {/* Allow them to review before their first test! */}
          <button 
            onClick={() => setLocation(`/lms/my-training/${mod._id}/learn`)}
            className="w-full py-2 rounded-lg text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            Review Materials
          </button>
        </div>
      );
    }

    // 5. In Progress or Pending (Needs to watch videos)
    const buttonText = mod.progressStatus === 'In-Progress' ? 'Resume Learning' : 'Start Learning';
    return (
      <button 
        onClick={() => setLocation(`/lms/my-training/${mod._id}/learn`)}
        className="w-full py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
      >
        {buttonText}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* --- TOP BANNER (Stats & Progress) --- */}
      <div className="bg-white border-b border-gray-200 px-6 py-10 mb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Training Program</h1>
              <p className="text-gray-500">Complete these modules sequentially to finalize your onboarding.</p>
            </div>
            
            {/* Status Badges */}
            <div className="flex gap-3">
              {profileStatus === 'Passed' && (
                <span className="px-4 py-2 bg-green-100 text-green-800 font-bold rounded-lg border border-green-200">🎉 Training Complete!</span>
              )}
              {!isEligible && (
                <span className="px-4 py-2 bg-red-100 text-red-800 font-bold rounded-lg border border-red-200">❌ Eligibility Revoked</span>
              )}
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="bg-gray-100 rounded-full h-4 w-full overflow-hidden mb-2 border border-gray-200">
            <div 
              className="bg-blue-600 h-full transition-all duration-1000 ease-out"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-600">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Module Grid) --- */}
      <div className="max-w-5xl mx-auto px-6">
        {modules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No training modules have been assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod: any, index: number) => {
              
              const isLocked = mod.isLockedBySequence;
              const cardClass = isLocked 
                ? 'bg-gray-50 border-gray-200 opacity-75 grayscale-[50%]' 
                : 'bg-white border-blue-100 shadow-md hover:shadow-lg hover:-translate-y-1';

              return (
                <div key={mod._id} className={`rounded-xl border transition-all duration-300 flex flex-col overflow-hidden ${cardClass}`}>
                  
                  <div className={`px-5 py-4 border-b ${isLocked ? 'border-gray-200' : 'border-blue-50 bg-blue-50/30'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Step {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {mod.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2" title={mod.title}>
                      {mod.title}
                    </h3>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-center">
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {mod.description || "No description provided."}
                    </p>
                    <div className="mt-auto flex items-center text-sm font-medium text-gray-500 bg-gray-50 p-2 rounded">
                      <span>📚 {mod.totalContents} Learning Materials</span>
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white mt-auto">
                    {renderActionButton(mod)}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}