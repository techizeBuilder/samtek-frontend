import { useState, useEffect } from "react";
import axios from "axios";

interface User {
    _id: string;
    username: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    users: User[];
    initialData?: any | null;
    mode: 'create' | 'edit' | 'view'; // Added mode prop
}

export default function TaskModal({
    show,
    onClose,
    onSuccess,
    users,
    initialData,
    mode
}: Props) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        assignedTo: [] as string[],
        priority: "Medium",
        status: "Pending",
        dueDate: "",
        file: null as File | null,
    });

    useEffect(() => {
        if (initialData && (mode === 'edit' || mode === 'view')) {
            setForm({
                title: initialData.title || "",
                description: initialData.description || "",
                assignedTo: initialData.assignedTo?.map((u: any) => u._id) || [],
                priority: initialData.priority || "Medium",
                status: initialData.status || "Pending",
                dueDate: initialData.dueDate ? initialData.dueDate.split("T")[0] : "",
                file: null, 
            });
        } else {
            setForm({
                title: "",
                description: "",
                assignedTo: [],
                priority: "Medium",
                status: "Pending",
                dueDate: "",
                file: null,
            });
        }
    }, [initialData, show, mode]);

    if (!show) return null;

    // --- VIEW MODE UI ---
    if (mode === 'view' && initialData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 break-words">{initialData.title}</h2>
                        <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ml-2 ${
                            initialData.status === "Completed" ? "bg-green-100 text-green-700" :
                            initialData.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                        }`}>
                            {initialData.status || "Pending"}
                        </span>
                    </div>

                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                            {initialData.description || "No description provided."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Priority</h3>
                            <span className={`px-2 py-1 text-xs rounded ${
                                initialData.priority === 'High' ? 'bg-red-100 text-red-700' :
                                initialData.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                                'bg-purple-100 text-purple-700'
                            }`}>
                                {initialData.priority || "Medium"}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</h3>
                            <p className="text-gray-800 text-sm">
                                {initialData.dueDate ? new Date(initialData.dueDate).toLocaleDateString() : "Not set"}
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned To</h3>
                        <div className="flex flex-wrap gap-2">
                            {initialData.assignedTo?.length > 0 ? (
                                initialData.assignedTo.map((u: any) => (
                                    <span key={u._id || u} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">
                                        {u.username || "Unknown User"}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-500 text-sm italic">Unassigned</span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- CREATE / EDIT MODE UI ---
    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("description", form.description);
            formData.append("priority", form.priority);
            formData.append("status", form.status);
            formData.append("dueDate", form.dueDate);

            form.assignedTo.forEach((id) => {
                formData.append("assignedTo", id);
            });

            if (form.file) {
                formData.append("file", form.file);
            }

            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "multipart/form-data",
                },
            };

            if (mode === 'edit' && initialData) {
                await axios.put(
                    `http://localhost:5000/api/hrms/tasks/update/${initialData._id}`,
                    formData,
                    config
                );
            } else {
                await axios.post(
                    "http://localhost:5000/api/hrms/tasks/create",
                    formData,
                    config
                );
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert(mode === 'edit' ? "Error updating task" : "Error creating task");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-4">
                    {mode === 'edit' ? "Edit Task" : "Create Task"}
                </h2>

                <input
                    type="text"
                    placeholder="Title"
                    className="w-full border p-2 rounded mb-3"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <textarea
                    placeholder="Description"
                    className="w-full border p-2 rounded mb-3"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <select
                    className="w-full border p-2 rounded mb-3"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Assign Users</label>
                    <div className="border rounded p-2 max-h-40 overflow-y-auto">
                        {users.map((user) => (
                            <label key={user._id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                                <input
                                    type="checkbox"
                                    checked={form.assignedTo.includes(user._id)}
                                    onChange={(e) => {
                                        const newAssigned = e.target.checked
                                            ? [...form.assignedTo, user._id]
                                            : form.assignedTo.filter((id) => id !== user._id);
                                        setForm({ ...form, assignedTo: newAssigned });
                                    }}
                                />
                                <span className="text-sm text-gray-700">{user.username}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <select
                        className="border p-2 rounded"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                    </select>
                    <input
                        type="date"
                        className="border p-2 rounded"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                </div>

                <input
                    type="file"
                    className="w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors">
                        {mode === 'edit' ? "Update Task" : "Create Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}
