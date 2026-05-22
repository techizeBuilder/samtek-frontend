import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";

import TaskDetailsDrawer from "@/components/hrmsTaskManagement/TaskDetailsDrawer";
import { Download, X, Search, Trash2, Paperclip, Eye, Clock, ChevronLeft, ChevronRight, User, Tag, List, LayoutGrid, Calendar as CalendarIcon, Building2 } from "lucide-react";

interface Task {
  _id: string;
  title: string;
  assignedTo: Array<{ username: string; _id: string }>;
  createdBy: { username: string; role: string };
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed" | "Hold";
  taskType: string;
  file?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_BASE.replace('/api', '');

type ViewMode = "list" | "kanban" | "calendar";

const TOP_LEVEL_ADMINS = ['HR-Admin', 'MIS Admin', 'Company Admin', 'Super Admin', 'Admin'];
const DEPT_HEADS = [
  'Production Head', 'Packing Head', 'Dispatch Head',
  'Accounts Head', 'Sales Head', 'Manager', 'Finance Manager',
  'Unit Head', 'Unit Manager'
];
const DEPARTMENTS = ["Production", "Packing", "Dispatch", "Accounts", "Sales", "General"];

const getDepartmentFromRole = (role: string) => {
  if (!role) return "General";
  if (role.includes('Production')) return 'Production';
  if (role.includes('Packing')) return 'Packing';
  if (role.includes('Dispatch')) return 'Dispatch';
  if (role.includes('Account') || role.includes('Finance')) return 'Accounts';
  if (role.includes('Sales')) return 'Sales';
  return role.replace(/(Head|Manager|Employee)/gi, '').trim() || "General";
};

// 🔥 FIX: Added myTasksOnly to the props
const TaskWorkspaceView = ({ refreshTrigger, myTasksOnly = false }: { refreshTrigger?: number, myTasksOnly?: boolean }) => {
  const { user } = useAuth() as { user: any };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; ext: string; name: string } | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [taskType, setTaskType] = useState("");
  const [date, setDate] = useState("");
  const [department, setDepartment] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);

  // 🔥 FIX: Automatically set assignedTo to the current user if in My Tasks mode
  const currentUserId = user?.id || user?._id;
  const [assignedTo, setAssignedTo] = useState(myTasksOnly ? currentUserId : "");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const isTopAdmin = TOP_LEVEL_ADMINS.includes(user?.role);
  const isDeptHead = DEPT_HEADS.includes(user?.role);
  
  // 🔥 FIX: Hide the user filter dropdown if we are in My Tasks mode
  const canFilterUsers = (isTopAdmin || isDeptHead) && !myTasksOnly;

  const handleFilePreview = (e: React.MouseEvent, fileUrl: string) => {
    e.stopPropagation();
    const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    const fullUrl = `${FILE_BASE}${cleanPath}`;
    const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
    const name = fileUrl.split('/').pop() || 'Document';
    setPreviewFile({ url: fullUrl, ext, name });
  };

  const handleTaskClick = (task: Task) => setSelectedTaskId(task._id);

  useEffect(() => {
    if (!canFilterUsers) return;
    const fetchAllEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        let allUsers: any[] = [];
        let currentPage = 1;
        let fetchedTotalPages = 1;

        do {
          const response = await axios.get(`${API_BASE}/users`, {
            params: { page: currentPage, limit: 50 },
            headers: { Authorization: `Bearer ${token}` }
          });
          const responseData = response.data;
          let usersChunk: any[] = [];
          if (responseData && Array.isArray(responseData.users)) usersChunk = responseData.users;
          else if (responseData?.data && Array.isArray(responseData.data.users)) usersChunk = responseData.data.users;

          if (usersChunk.length > 0) allUsers = [...allUsers, ...usersChunk];
          else break;

          fetchedTotalPages = responseData.pagination?.pages || responseData.data?.pagination?.pages || 1;
          currentPage++;
          if (currentPage > 20) break;
        } while (currentPage <= fetchedTotalPages);
        setEmployees(allUsers);
      } catch (err) { console.error("Failed to load employees for filter:", err); }
    };
    fetchAllEmployees();
  }, [canFilterUsers]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/hrms/tasks/all`, {
        // 🔥 This now accurately sends assignedTo=YOUR_ID if myTasksOnly is true
        params: { search, status, priority, taskType, assignedTo, date, department, page, limit },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTasks(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [search, status, priority, taskType, assignedTo, date, department]);
  useEffect(() => { fetchTasks(); }, [page, search, status, priority, taskType, assignedTo, date, department, refreshTrigger]);

  // 🔥 FIX: Prevent clearing the assignedTo state if we are in My Tasks mode
  useEffect(() => { 
    if (!myTasksOnly) {
      setAssignedTo(""); 
    }
  }, [department, myTasksOnly]);

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const response = await axios.delete(`${API_BASE}/hrms/tasks/delete/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.data.success) fetchTasks();
    } catch (error) { console.error("Delete error:", error); }
  };

  const filteredEmployees = department ? employees.filter(emp => getDepartmentFromRole(emp.role) === department) : employees;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500"}`}><List size={18} /></button>
          <button onClick={() => setViewMode("kanban")} className={`p-1.5 rounded-md transition-all ${viewMode === "kanban" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500"}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded-md transition-all ${viewMode === "calendar" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500"}`}><CalendarIcon size={18} /></button>
        </div>

        <div className="flex flex-1 min-w-[150px] items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tasks..." className="bg-transparent border-none focus:outline-none text-sm w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Hide Department Dropdown for Dept Heads/Employees */}
        {isTopAdmin && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[120px]" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
        )}

        {/* Hide Assignee Dropdown if myTasksOnly is true */}
        {canFilterUsers && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
            <User className="w-4 h-4 text-gray-400" />
            <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[120px]" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">All Assignees</option>
              {filteredEmployees.map(emp => <option key={emp._id} value={emp._id}>{emp.username}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
          <Tag className="w-4 h-4 text-gray-400" />
          <select className="text-sm py-2 bg-transparent focus:outline-none min-w-[120px]" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            <option value="">All Types</option>
            <option value="One Time">One Time</option>
            <option value="Running Work">Running Work</option>
            <option value="Surprise Work">Surprise Work</option>
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-white">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <input type="date" className="text-sm py-2 bg-transparent focus:outline-none text-gray-600" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Hold">Hold</option>
        </select>

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className={viewMode === "list" ? "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" : ""}>
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium animate-pulse">Updating Workspace...</div>
        ) : (
          <>
            {viewMode === "list" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Task Title</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Assigned To</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Created By</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Due Date</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Priority</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks?.map((task) => (
                      <tr key={task._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4 cursor-pointer" onClick={() => handleTaskClick(task)}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{task.title}</span>
                              {task.file && (
                                <button
                                  onClick={(e) => handleFilePreview(e, task.file!)}
                                  className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1 rounded transition"
                                  title="View Attachment"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{task.taskType}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {task.assignedTo.map((user, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">{user.username.charAt(0).toUpperCase()}</div>
                                <span className="text-sm text-gray-700 font-medium">{user.username}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{task.createdBy.username}</td>
                        <td className="p-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" />{new Date(task.dueDate).toLocaleDateString()}</div>
                        </td>
                        <td className="p-4 text-[10px] font-bold uppercase tracking-wider">
                          <span className={task.priority === 'High' ? 'text-red-600' : 'text-blue-600'}>{task.priority}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${task.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{task.status}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleTaskClick(task)} className="p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"><Eye className="w-4 h-4" /></button>
                            {isTopAdmin && <button onClick={() => handleDeleteTask(task._id)} className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-md"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {["Pending", "In Progress", "Completed", "Hold"].map(colStatus => (
                  <div key={colStatus} className="bg-gray-100/50 p-3 rounded-xl border border-gray-200 min-h-[500px]">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{colStatus}</h3>
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold">{tasks?.filter(t => t.status === colStatus).length}</span>
                    </div>
                    <div className="space-y-3">
                      {tasks?.filter(t => t.status === colStatus).map(task => (
                        <div key={task._id} onClick={() => handleTaskClick(task)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-400 transition-all cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase">{task.taskType}</div>
                            {task.file && (
                              <button onClick={(e) => handleFilePreview(e, task.file!)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors leading-tight mb-3">{task.title}</div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <div className="flex -space-x-2">
                              {task.assignedTo.map((u, i) => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600 uppercase">{u.username[0]}</div>)}
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{task.priority}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "calendar" && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="grid grid-cols-7 border-t border-l border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-3 text-[10px] font-bold text-gray-400 uppercase text-center border-r border-b border-gray-200 bg-gray-50">{d}</div>)}
                  {[...Array(31)].map((_, i) => {
                    const dayTasks = tasks?.filter(t => new Date(t.dueDate).getDate() === i + 1);
                    return (
                      <div key={i} className="min-h-[120px] border-r border-b border-gray-200 p-2 hover:bg-gray-50 transition-colors">
                        <span className="text-xs font-bold text-gray-300 mb-2 block">{i + 1}</span>
                        <div className="space-y-1">
                          {dayTasks?.map(t => (
                            <div key={t._id} onClick={() => handleTaskClick(t)} className="flex items-center gap-1 text-[9px] font-bold bg-indigo-100 text-indigo-700 p-1.5 rounded border border-indigo-200 truncate cursor-pointer hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title={t.title}>
                              {t.file && (
                                <button onClick={(e) => handleFilePreview(e, t.file!)} className="hover:text-indigo-200 flex-shrink-0">
                                  <Paperclip className="w-3 h-3" />
                                </button>
                              )}
                              <span className="truncate">{t.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalPages > 1 && viewMode === "list" && (
              <div className="p-4 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 border border-gray-200 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 border border-gray-200 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <button onClick={() => setPreviewFile(null)} className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full"><X size={28} /></button>
          <div className="w-full h-full flex flex-col items-center justify-center max-w-5xl">
            {['jpg', 'jpeg', 'png', 'gif'].includes(previewFile.ext) ? (
              <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            ) : previewFile.ext === 'pdf' ? (
              <iframe src={previewFile.url} className="w-full h-[85vh] bg-white rounded-xl shadow-2xl border-none" title="PDF" />
            ) : (
              <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center">
                <Paperclip size={32} className="mx-auto mb-4 text-indigo-600" />
                <h3 className="text-xl font-bold mb-4">{previewFile.name}</h3>
                <a href={previewFile.url} download className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2"><Download size={18} /> Download to View</a>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTaskId && <TaskDetailsDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onTaskUpdated={fetchTasks} />}
    </div>
  );
};

export default TaskWorkspaceView;