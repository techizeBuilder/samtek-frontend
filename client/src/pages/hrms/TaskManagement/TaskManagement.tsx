import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import TaskDashboardView from "@/components/hrmsTaskManagement/Dashboard";
import TaskWorkspaceView from "@/components/hrmsTaskManagement/WorkShop";
import TaskCreationForm from "@/components/hrmsTaskManagement/TaskCreationForm";

// --- ROLE HIERARCHY ---
type Role = string; // Simplified for flexibility

interface AuthUser {
  _id: string;
  username: string;
  role: Role;
  department?: string;
}

type TabType = "dashboard" | "workspace" | "reports";

export default function HRMSTaskManagement() {
  const { user, loading } = useAuth() as {
    user: AuthUser | null;
    loading: boolean;
  };

  const [activeTab, setActiveTab] = useState<TabType>("workspace");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  
  // THE REFRESH TRIGGER: Updates when a new task is created
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) return <div className="p-6">Loading...</div>;

  const TOP_LEVEL_ADMINS = ['HR-Admin', 'MIS Admin', 'Company Admin', 'Super Admin', 'Admin']; 
  
  // 🔥 ADDED NEW DEPARTMENT HEADS HERE
  const DEPT_HEADS = [
    'Production Head', 'Packing Head', 'Dispatch Head', 
    'Accounts Head', 'Sales Head', 'Manager', 'Finance Manager',
    'Unit Head', 'Unit Manager',
    'Research & Development Head', 'Store Head', 'QC Head'
  ];

  const canCreateTask = user && (TOP_LEVEL_ADMINS.includes(user.role) || DEPT_HEADS.includes(user.role));

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Task Management</h1>
          <p className="text-sm text-gray-500">Manage, track, and analyze team productivity</p>
        </div>

        {canCreateTask && (
          <button 
            onClick={() => setIsCreateFormOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 transition font-medium"
          >
            + Assign Task
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <TabButton label="Dashboard" value="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Primary Workspace" value="workspace" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton label="Reports & Analytics" value="reports" activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Views */}
      <div className="mt-4">
        {activeTab === "dashboard" && <TaskDashboardView refreshTrigger={refreshKey} />}
        {activeTab === "workspace" && <TaskWorkspaceView refreshTrigger={refreshKey} />}
        {activeTab === "reports" && <TaskReportsView />}
      </div>

      {/* Creation Form Modal */}
      {isCreateFormOpen && (
        <TaskCreationForm 
          onClose={() => setIsCreateFormOpen(false)} 
          onSuccess={() => setRefreshKey(prev => prev + 1)} // Updates the trigger!
        />
      )}
    </div>
  );
}

function TabButton({ label, value, activeTab, setActiveTab }: any) {
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-6 py-3 text-sm font-medium transition-all ${
        activeTab === value ? "text-indigo-600 border-b-2 border-indigo-500" : "text-gray-400 hover:text-indigo-500"
      }`}
    >
      {label}
    </button>
  );
}

const TaskReportsView = () => (
  <div className="p-4 bg-white rounded-lg shadow border border-gray-100 text-gray-500">
    Analytics & Export Options Coming Soon...
  </div>
);