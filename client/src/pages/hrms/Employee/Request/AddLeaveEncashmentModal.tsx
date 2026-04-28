/** @format */

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "@/pages/Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface AddLeaveEncashmentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddLeaveEncashmentModal = ({
    open,
    onClose,
    onSuccess,
}: AddLeaveEncashmentModalProps) => {
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        leaveType: "",
        requestedDays: 1,
    });

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchLeaveTypes = async () => {
            try {
                const res = await axios.get(`${API_BASE}/leave-types`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLeaveTypes(res.data || []);
            } catch (err) {
                console.error("Failed to fetch leave types");
            }
        };
        if (open) fetchLeaveTypes();
    }, [open, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/leave-encashment`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            toast({
                type: "success",
                title: "Request Submitted",
                message: res.data.message || "Leave encashment request submitted.",
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            toast({
                type: "error",
                title: "Submission Failed",
                message: error.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <h3 className="text-lg font-semibold mb-5">Request Leave Encashment</h3>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Leave Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            className="w-full border rounded p-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                            value={formData.leaveType}
                            onChange={(e) =>
                                setFormData({ ...formData, leaveType: e.target.value })
                            }
                        >
                            <option value="">Select Leave Type</option>
                            {leaveTypes
                                .filter((lt) => lt.isActive)
                                .map((lt) => (
                                    <option key={lt._id} value={lt.name}>
                                        {lt.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Days <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="w-full border rounded p-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                            value={formData.requestedDays}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    requestedDays: parseInt(e.target.value),
                                })
                            }
                        />
                    </div>

                    <div className="pt-2">
                        <p className="text-xs text-gray-500 italic">
                            Note: Amount will be calculated based on your per-day basic salary (Basic / 30).
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddLeaveEncashmentModal;
