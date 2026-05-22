/** @format */

import { useState } from "react";
import axios from "axios";
import { X, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "./Alert/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isAdminView?: boolean;
}

const API = import.meta.env.VITE_API_URL;

export default function ChangePasswordModal({ isOpen, onClose, userId, isAdminView = false }: Props) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(isAdminView ? 2 : 1);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (form.newPassword !== form.confirmPassword) {
      return toast({ type: "error", title: "Mismatch", message: "Passwords do not match" });
    }
    if (form.newPassword.length < 6) {
      return toast({ type: "error", title: "Too Short", message: "Password must be at least 6 characters" });
    }

    setLoading(true);
    try {
      const endpoint = isAdminView ? `${API}/users/reset-password` : `${API}/users/change-password`;
      const payload = isAdminView
        ? { userId: userId, newPassword: form.newPassword }
        : { id: userId, currentPassword: form.currentPassword, newPassword: form.newPassword };

      await axios.post(
        endpoint,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        type: "success",
        title: "Success",
        message: "Password updated successfully",
      });
      onClose();
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStep(isAdminView ? 2 : 1); // Reset step based on isAdminView
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed",
        message: err.response?.data?.message || "Incorrect current password or server error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-xl shadow-lg relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Lock size={18} className="text-gray-400" />
            Change Password
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step Indicators */}
          {!isAdminView && (
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-100'}`} />
              <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-100'}`} />
            </div>
          )}

          {/* Current Password Field (Hidden if Admin) */}
          {!isAdminView && step === 1 && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPass.current ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all pr-12 bg-gray-50/30"
                  placeholder="Required to continue"
                />
                <button
                  type="button"
                  onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* New Password Fields */}
          {(isAdminView || step === 2) && (
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPass.new ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all pr-12 bg-gray-50/30"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPass.confirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all pr-12 bg-gray-50/30"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-white border rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={step === 1 ? () => { if (form.currentPassword) setStep(2); } : handleUpdate}
            disabled={loading || (step === 2 && !form.newPassword)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === 1 ? (
              "Next Step"
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}