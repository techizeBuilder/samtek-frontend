import React from "react";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Calendar, BarChart3, TrendingUp, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTaskDashboard } from "@/hooks/useTaskManagement";

interface DeptPerf { department: string; total: number; completed: number; completionRate: number; }
interface DashboardData {
  totalTasks: number;
  statusBreakdown: { pending: number; inProgress: number; completed: number; hold: number; overdue: number; };
  priorityDistribution: { high: number; medium: number; low: number; };
  deadlines: { today: number; upcoming: number; };
  performance: { completionRate: number; departmentPerformance: DeptPerf[]; };
}

const TOP_LEVEL_ADMINS = ['HR-Admin', 'MIS Admin', 'Company Admin', 'Super Admin', 'Admin'];

// 🔥 ADDED NEW DEPARTMENT HEADS HERE
const DEPT_HEADS = [
  'Production Head', 'Packing Head', 'Dispatch Head',
  'Accounts Head', 'Sales Head', 'Manager', 'Finance Manager',
  'Unit Head', 'Unit Manager',
  'Research & Development Head', 'Store Head', 'QC Head'
];

const getDepartmentFromRole = (role: string) => {
  if (!role) return "General";
  if (role.includes('Production')) return 'Production';
  if (role.includes('Packing')) return 'Packing';
  if (role.includes('Dispatch')) return 'Dispatch';
  if (role.includes('Account') || role.includes('Finance')) return 'Accounts';
  if (role.includes('Sales')) return 'Sales';
  
  // 🔥 ADDED NEW DEPARTMENT MAPPINGS HERE
  if (role.includes('Research') || role.includes('R&D')) return 'R&D';
  if (role.includes('Store')) return 'Store';
  if (role.includes('QC')) return 'QC';

  return role.replace(/(Head|Manager|Employee)/gi, '').trim() || "General";
};

const TaskDashboardView = ({ myTasksOnly = false }: { myTasksOnly?: boolean }) => {
  const { user } = useAuth() as { user: any };
  const { data: response, isLoading } = useTaskDashboard(myTasksOnly);
  const data: DashboardData | undefined = response?.data;

  const isTopAdmin = TOP_LEVEL_ADMINS.includes(user?.role);
  const isDeptHead = DEPT_HEADS.includes(user?.role);
  const userDepartment = getDepartmentFromRole(user?.role);

  if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Analytics...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={data.totalTasks} icon={<ClipboardList className="text-blue-600" />} bgColor="bg-blue-50" />
        <StatCard label="Completed" value={data.statusBreakdown.completed} icon={<CheckCircle2 className="text-green-600" />} bgColor="bg-green-50" borderColor="border-green-200" />
        <StatCard label="Pending" value={data.statusBreakdown.pending + data.statusBreakdown.inProgress} icon={<Clock className="text-yellow-600" />} bgColor="bg-yellow-50" borderColor="border-yellow-200" />
        <StatCard label="Overdue" value={data.statusBreakdown.overdue} icon={<AlertCircle className="text-red-600" />} bgColor="bg-red-50" borderColor="border-red-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Deadlines Snapshot</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <p className="text-xs text-gray-500 font-bold uppercase">Due Today</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{data.deadlines.today}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <p className="text-xs text-gray-500 font-bold uppercase">Upcoming (3 Days)</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{data.deadlines.upcoming}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Priority Mix</h3>
          </div>
          <div className="space-y-4">
            <PriorityProgress label="High" count={data.priorityDistribution.high} total={data.totalTasks} color="bg-red-500" />
            <PriorityProgress label="Medium" count={data.priorityDistribution.medium} total={data.totalTasks} color="bg-yellow-500" />
            <PriorityProgress label="Low" count={data.priorityDistribution.low} total={data.totalTasks} color="bg-green-500" />
          </div>
        </div>
      </div>

      {(isTopAdmin || isDeptHead) && !myTasksOnly && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">{isTopAdmin ? "All Departments Performance" : `${userDepartment} Performance`}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.performance.departmentPerformance.map((dept, index) => (
              <div key={index} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-gray-700">{dept.department || "General"}</span>
                  <span className="text-xs font-bold text-indigo-600">{dept.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${dept.completionRate}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-500 uppercase font-medium">{dept.completed} / {dept.total} Tasks Completed</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-5 h-5 opacity-90" /><h3 className="text-lg font-semibold">Overall Performance Snapshot</h3></div>
          <p className="text-sm opacity-80">Completion efficiency across authorized scope</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold">{data.performance.completionRate}%</p>
          <p className="text-xs uppercase font-bold tracking-widest opacity-70">Efficiency Rate</p>
        </div>
      </div>
    </div>
  );
};

function StatCard({ label, value, icon, bgColor, borderColor = "border-transparent" }: any) {
  return (
    <div className={`p-5 rounded-xl border-2 ${borderColor} ${bgColor} transition-transform hover:scale-[1.02] cursor-default shadow-sm`}>
      <div className="flex justify-between items-start">
        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p><p className="text-3xl font-bold text-gray-900 mt-1">{value}</p></div>
        <div className="p-2 bg-white/70 rounded-lg shadow-inner">{icon}</div>
      </div>
    </div>
  );
}

function PriorityProgress({ label, count, total, color }: any) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-bold"><span className="text-gray-500">{label}</span><span className="text-gray-400">{count}</span></div>
      <div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }}></div></div>
    </div>
  );
}

export default TaskDashboardView;