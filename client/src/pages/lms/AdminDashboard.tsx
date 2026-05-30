import React from 'react';
import { useLocation } from 'wouter'; 
import { useAdminDashboard } from '../../hooks/useTraining'; 

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: response, isLoading, isError } = useAdminDashboard();

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const TOP_LEVEL_ADMINS = ['HR-Admin', 'Super Admin', 'Admin', 'Company Admin'];
  const canFinalize = currentUser && TOP_LEVEL_ADMINS.includes(currentUser.role);

  // Helper to keep UI labels clean
  const formatDeptName = (dept: string) => {
    const map: Record<string, string> = {
      'Research & Development': 'R&D',
      'Quality Control': 'QC'
    };
    return map[dept] || dept;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-500 font-medium text-lg">Compiling Real-Time Analytics...</p>
        </div>
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 text-red-600 p-8 rounded-xl max-w-lg text-center shadow-sm border border-red-100">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-xl font-bold mb-2">Failed to load dashboard data</h2>
        </div>
      </div>
    );
  }

  const stats = response.data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Training Analytics Overview</h1>
            <p className="text-gray-500 mt-1">Live tracking of onboarding, module completion, and failure analysis.</p>
          </div>
          
          {stats.kpis.pendingDecisionCount > 0 && canFinalize && (
            <button 
              onClick={() => setLocation('/lms/trainees')} 
              className="bg-orange-100 text-orange-800 border border-orange-200 px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-orange-200 transition-colors flex items-center gap-2 animate-pulse"
            >
              <span>⚠️</span> {stats.kpis.pendingDecisionCount} Candidates Awaiting Final Decision
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Active Trainees</p>
            <p className="text-4xl font-black text-gray-900">{stats.kpis.totalTrainees}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-yellow-400">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">In-Training</p>
            <p className="text-4xl font-black text-gray-900">{stats.kpis.inTrainingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Passed / Completed</p>
            <p className="text-4xl font-black text-green-600">{stats.kpis.passedCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-red-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Failed / Revoked</p>
            <p className="text-4xl font-black text-red-600">{stats.kpis.failedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-3">Department Completion Rates</h3>
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar max-h-80">
              {Object.entries(stats.departmentStats).map(([dept, data]: any) => {
                const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
                return (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">{formatDeptName(dept)}</span>
                      <span className="text-gray-500 font-medium">{data.passed} / {data.total} Passed ({passRate}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${passRate >= 80 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${passRate}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">⭐ Top Performers</h3>
              <ul className="space-y-3">
                {stats.topPerformers.map((user: any, i: number) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-gray-700">{user.name}</span>
                      <span className="text-xs text-gray-400">{formatDeptName(user.department)}</span>
                    </div>
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{user.averageScore}%</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">⚠️ At Risk</h3>
              <ul className="space-y-3">
                {stats.lowPerformers.map((user: any, i: number) => (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-gray-700">{user.name}</span>
                      <span className="text-xs text-gray-400">{formatDeptName(user.department)}</span>
                    </div>
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{user.averageScore}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-6 py-5 border-b border-red-100">
            <h3 className="font-bold text-red-900 text-lg">Critical Fail Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Question</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Module</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.failAnalysis.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.questionText}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.moduleTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDeptName(item.department)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">{item.failCount}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}