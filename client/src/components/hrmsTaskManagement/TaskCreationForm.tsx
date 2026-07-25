import React, { useState, useEffect } from "react";
import { X, UploadCloud, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTask, useAssignableEmployees } from "@/hooks/useTaskManagement";

const TOP_LEVEL_ADMINS = ['HR-Admin', 'MIS Admin', 'Company Admin', 'Super Admin', 'Admin']; 

// 🔥 ADDED NEW DEPARTMENT HEADS
const DEPT_HEADS = [
  'Production Head', 'Packing Head', 'Dispatch Head',
  'Accounts Head', 'Sales Head', 'Manager', 'Finance Manager',
  'Unit Head', 'Unit Manager',
  'Research & Development Head', 'Store Head', 'QC Head'
];

// 🔥 ADDED NEW DEPARTMENTS
const DEPARTMENTS = ["Production", "Packing", "Dispatch", "Accounts", "Sales", "R&D", "Store", "QC", "General"];

const getDepartmentFromRole = (role: string) => {
  if (!role) return "General";
  if (role.includes('Production')) return 'Production';
  if (role.includes('Packing')) return 'Packing';
  if (role.includes('Dispatch')) return 'Dispatch';
  if (role.includes('Account') || role.includes('Finance')) return 'Accounts';
  if (role.includes('Sales')) return 'Sales';
  
  // 🔥 ADDED NEW DEPARTMENT MAPPINGS
  if (role.includes('Research') || role.includes('R&D')) return 'R&D';
  if (role.includes('Store')) return 'Store';
  if (role.includes('QC')) return 'QC';

  return role.replace(/(Head|Manager|Employee)/gi, '').trim() || "General"; 
};

interface TaskCreationFormProps {
  onClose: () => void;
  onSuccess?: () => void; 
}

const TaskCreationForm: React.FC<TaskCreationFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth() as { user: any };
  const createTaskMutation = useCreateTask();
  // Cached once (staleTime: Infinity) and shared across Workspace / Reports / Task Creation
  // instead of independently paging through every user on every mount.
  const { data: employees = [] } = useAssignableEmployees();

  const isTopAdmin = TOP_LEVEL_ADMINS.includes(user?.role);
  const defaultDepartment = isTopAdmin ? "" : getDepartmentFromRole(user?.role);

  // Get current user ID to prevent self-assignment
  const currentUserId = user?.id || user?._id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [department, setDepartment] = useState(defaultDepartment);
  const [dueDate, setDueDate] = useState("");
  const [reminder, setReminder] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [assignedTo, setAssignedTo] = useState<string[]>([]); 

  useEffect(() => {
    setAssignedTo([]);
  }, [department]);

  // 🔥 RESTORED CORRECT LOGIC: Filter out the logged-in user AND filter by department
  const filteredEmployees = employees.filter(emp => {
    // 1. Prevent self-assignment for EVERYONE (no one can assign a task to themselves here)
    if (emp._id === currentUserId) return false;
    
    // 2. Filter by department if a department is selected
    if (department && getDepartmentFromRole(emp.role) !== department) return false;
    
    return true;
  });

  const handleAssignUser = (userId: string) => {
    setAssignedTo(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignedTo.length === 0) {
      alert("Please assign the task to at least one user.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("taskType", taskType);
    formData.append("priority", priority);
    formData.append("department", department);
    formData.append("dueDate", dueDate);
    formData.append("reminder", String(reminder));
    if (file) formData.append("file", file);

    assignedTo.forEach(userId => formData.append("assignedTo", userId));

    createTaskMutation.mutate(formData, {
      onSuccess: () => {
        alert("Task created successfully!");
        if (onSuccess) onSuccess();
        onClose();
      },
      onError: (error: any) => {
        console.error("Task creation failed:", error);
        alert(error.response?.data?.message || "Failed to create task.");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign New Task</h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Save & Lock Mechanism Active</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Task Type *</label>
              <select required value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Select type</option>
                <option value="One Time">One Time</option>
                <option value="Running Work">Running Work</option>
                <option value="Surprise Work">Surprise Work</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Department *</label>
              {isTopAdmin ? (
                <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500">
                  <option value="" disabled>Select Dept</option>
                  {DEPARTMENTS.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                </select>
              ) : (
                <input type="text" value={department} disabled className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed font-medium" />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date & Time *</label>
              <input type="datetime-local" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To {department && `(${department})`} *</label>
            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-gray-50 p-2 space-y-1">
              {employees.length === 0 ? (
                <p className="text-xs text-gray-500 p-2">Loading employees...</p>
              ) : filteredEmployees.length === 0 ? (
                <p className="text-xs text-gray-500 p-2 italic">No employees found in this department.</p>
              ) : (
                filteredEmployees.map(emp => (
                  <label key={emp._id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition">
                    <input type="checkbox" checked={assignedTo.includes(emp._id)} onChange={() => handleAssignUser(emp._id)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800 font-medium">{emp.username}</span>
                      <span className="text-[10px] text-gray-500">{emp.role}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Attachment</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
              <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="mx-auto h-6 w-6 text-gray-400 mb-2" />
              <span className="text-sm text-indigo-600 font-medium">{file ? file.name : "Click to upload a file (optional)"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <input type="checkbox" id="reminder" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500" />
            <label htmlFor="reminder" className="text-sm font-semibold text-indigo-900 cursor-pointer select-none">Enable Automated Reminders</label>
          </div>
        </form>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 sticky bottom-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={createTaskMutation.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {createTaskMutation.isPending ? "Creating & Locking..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationForm;