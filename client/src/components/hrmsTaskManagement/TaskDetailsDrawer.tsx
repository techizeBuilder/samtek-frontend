import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Paperclip, Clock, User, MessageSquare, Activity, Send, CheckCircle, PauseCircle, PlayCircle, Lock, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_BASE.replace('/api', '');

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

interface DetailedTask {
  _id: string; title: string; description: string; department: string; priority: string; status: string; taskType: string; file?: string; dueDate: string;
  assignedTo: Array<{ _id: string; username: string; email: string }>;
  createdBy: { _id: string; username: string; role: string };
  activityLog: Array<{ _id: string; action: string; timestamp: string; performedBy: { username: string; role: string } }>;
  comments: Array<{ _id: string; text: string; createdAt: string; user: { username: string; role: string } }>;
}

interface TaskDetailsDrawerProps { taskId: string | null; onClose: () => void; onTaskUpdated?: () => void; }

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ taskId, onClose, onTaskUpdated }) => {
  const { user } = useAuth() as { user: any };
  const [task, setTask] = useState<DetailedTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");

  useEffect(() => { if (taskId) fetchTaskDetails(); }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/hrms/tasks/task/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setTask(response.data.data);
    } catch (error) { console.error("Failed to load task details:", error); }
    finally { setLoading(false); }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const response = await axios.post(`${API_BASE}/hrms/tasks/comment/${taskId}`, { text: commentText }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (response.data.success) { setTask(response.data.data); setCommentText(""); }
    } catch (error: any) { alert(error.response?.data?.message || "Failed to post comment."); }
    finally { setSubmittingComment(false); }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (task?.status === newStatus || task?.status === "Completed") return;
    try {
      setUpdatingStatus(true);
      const response = await axios.put(`${API_BASE}/hrms/tasks/update/${taskId}`, { status: newStatus }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (response.data.success) { await fetchTaskDetails(); if (onTaskUpdated) onTaskUpdated(); }
    } catch (error: any) { alert(error.response?.data?.message || "Server error while updating status."); }
    finally { setUpdatingStatus(false); }
  };

  const [previewFile, setPreviewFile] = useState<{ url: string; ext: string; name: string } | null>(null);
  const handleFilePreview = (e: React.MouseEvent, fileUrl: string) => {
    e.stopPropagation();
    const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    const fullUrl = `${FILE_BASE}${cleanPath}`;
    const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
    const name = fileUrl.split('/').pop() || 'Document';
    setPreviewFile({ url: fullUrl, ext, name });
  };

  if (!taskId) return null;

  const currentUserId = user?.id || user?._id;
  const isTopAdmin = TOP_LEVEL_ADMINS.includes(user?.role);
  // This depends on the updated getDepartmentFromRole to show controls to the new Dept Heads
  const isDeptHead = DEPT_HEADS.includes(user?.role) && task?.department === getDepartmentFromRole(user?.role);
  const isAssigned = task?.assignedTo.some(u => u._id === currentUserId);
  const isCreator = task?.createdBy?._id === currentUserId;

  // Status changes are restricted to the task's creator or an assigned user (matches backend rule).
  const canChangeStatus = isCreator || isAssigned;
  // Commenting stays open to Top Admins / Dept Heads / assignees for oversight & collaboration.
  const canComment = isTopAdmin || isDeptHead || isAssigned;
  const canViewActivityLog = isTopAdmin || isDeptHead;

  // Mirrors the backend STATUS_TRANSITIONS map so invalid moves are disabled before the request is even sent.
  const STATUS_TRANSITIONS: Record<string, string[]> = {
    "Pending": ["In Progress", "Hold"],
    "In Progress": ["Hold", "Completed"],
    "Hold": ["In Progress"],
    "Completed": []
  };
  const allowedNextStatuses = task ? (STATUS_TRANSITIONS[task.status] || []) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl h-full bg-gray-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start sticky top-0 z-10">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{task?.taskType}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${task?.status === 'Completed' ? 'bg-green-50 text-green-600' : task?.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : task?.status === 'Hold' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-50 text-yellow-600'}`}>{task?.status}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{loading ? "Loading..." : task?.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {loading || !task ? (
          <div className="flex-1 p-10 text-center text-gray-400">Loading task details...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {canChangeStatus && task.status !== "Completed" && (
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex gap-3">
                <button onClick={() => handleStatusUpdate("In Progress")} disabled={updatingStatus || !allowedNextStatuses.includes("In Progress")} className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"><PlayCircle size={16} /> Start</button>
                <button onClick={() => handleStatusUpdate("Hold")} disabled={updatingStatus || !allowedNextStatuses.includes("Hold")} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"><PauseCircle size={16} /> Hold</button>
                <button onClick={() => handleStatusUpdate("Completed")} disabled={updatingStatus || !allowedNextStatuses.includes("Completed")} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"><CheckCircle size={16} /> Complete</button>
              </div>
            )}

            {canChangeStatus && task.status === "Completed" && (
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-center gap-2 text-sm font-bold text-gray-500">
                <Lock size={16} className="text-gray-400" /> This task is completed and status updates are locked.
              </div>
            )}

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Due Date</p><div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Clock size={14} className="text-gray-400" />{new Date(task.dueDate).toLocaleDateString()}</div></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Priority</p><p className={`text-sm font-bold ${task.priority === 'High' ? 'text-red-600' : 'text-blue-600'}`}>{task.priority}</p></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Created By</p><p className="text-sm font-semibold text-gray-800">{task.createdBy?.username}</p></div>
                <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Department</p><p className="text-sm font-semibold text-gray-800">{task.department}</p></div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Description</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description || "No description provided."}</p>
                {task.file && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Attachments</h3>
                    <button
                      onClick={(e) => handleFilePreview(e, task.file!)}
                      className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 p-1 rounded"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><User size={14} /> Assigned Team</h3>
                <div className="flex flex-wrap gap-2">
                  {task.assignedTo.map(assignedUser => (
                    <div key={assignedUser._id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">{assignedUser.username.charAt(0).toUpperCase()}</div>
                      <span className="text-xs font-semibold text-gray-700">{assignedUser.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <button onClick={() => setActiveTab("comments")} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'comments' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><MessageSquare size={16} /> Discussion ({task.comments.length})</button>
                  {canViewActivityLog && <button onClick={() => setActiveTab("activity")} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'activity' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><Activity size={16} /> Activity Log</button>}
                </div>

                <div className="p-5 max-h-[400px] overflow-y-auto">
                  {activeTab === "comments" && (
                    <div className="space-y-4">
                      {task.comments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the discussion.</p>
                      ) : (
                        <div className="space-y-4 mb-4">
                          {task.comments.map(comment => (
                            <div key={comment._id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">{comment.user?.username?.charAt(0).toUpperCase()}</div>
                              <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none p-3 border border-gray-100">
                                <div className="flex justify-between items-end mb-1">
                                  <span className="text-xs font-bold text-gray-900">{comment.user?.username}</span>
                                  <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-700">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {canComment ? (
                        <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-gray-100">
                          <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Type a comment..." className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" disabled={submittingComment} />
                          <button type="submit" disabled={!commentText.trim() || submittingComment} className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"><Send size={16} /></button>
                        </form>
                      ) : (
                        <div className="pt-2 border-t border-gray-100 text-center text-xs text-gray-400 italic">You do not have permission to comment on this task.</div>
                      )}
                    </div>
                  )}

                  {canViewActivityLog && activeTab === "activity" && (
                    <div className="space-y-0 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                      {task.activityLog.map((log) => (
                        <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group py-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Activity size={12} /></div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-3 rounded shadow-sm bg-white border border-gray-100">
                            <div className="flex justify-between items-start mb-1"><span className="font-bold text-gray-800 text-xs">{log.action}</span></div>
                            <div className="text-[10px] text-gray-500 font-medium">By {log.performedBy?.username || 'System'} • {new Date(log.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default TaskDetailsDrawer;