import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import TaskDashboardView from "@/components/hrmsTaskManagement/Dashboard";
import TaskWorkspaceView from "@/components/hrmsTaskManagement/WorkShop";

// --- ROLE HIERARCHY ---
type Role = string;

interface AuthUser {
    _id: string;
    username: string;
    role: Role;
    department?: string;
}

// Only two tabs needed for Employee/Receiving view
type TabType = "dashboard" | "my_tasks";

export default function EmployeeTasks() {
    const { user, loading } = useAuth() as {
        user: AuthUser | null;
        loading: boolean;
    };

    const [activeTab, setActiveTab] = useState<TabType>("my_tasks");

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen relative">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        My Tasks
                    </h1>
                    <p className="text-sm text-gray-500">
                        View and manage your assigned tasks
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <TabButton
                    label="Dashboard"
                    value="dashboard"
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <TabButton
                    label="My Tasks"
                    value="my_tasks"
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>

            {/* Views */}
            <div className="mt-4">
                {activeTab === "dashboard" && <TaskDashboardView />}
                
                {/* 🔥 FIX: Passed myTasksOnly={true} so Dept Heads only see their own tasks here! */}
                {activeTab === "my_tasks" && <TaskWorkspaceView myTasksOnly={true} />}
            </div>

        </div>
    );
}

// Reusable Tab Button 
function TabButton({
    label,
    value,
    activeTab,
    setActiveTab,
}: {
    label: string;
    value: TabType;
    activeTab: TabType;
    setActiveTab: (val: TabType) => void;
}) {
    return (
        <button
            onClick={() => setActiveTab(value)}
            className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === value
                    ? "text-indigo-600 border-b-2 border-indigo-500"
                    : "text-gray-400 hover:text-indigo-500"
                }`}
        >
            {label}
        </button>
    );
}