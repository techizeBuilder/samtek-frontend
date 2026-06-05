import React from 'react';
import { Settings, Building2, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MISSettings() {
  const { user } = useAuth();
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings size={24} className="text-[#49A7F5]" />Settings</h1>
        <p className="text-sm text-gray-500">Your MIS Admin account information</p>
      </div>
      <div className="max-w-xl space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><User size={16} />Account Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium text-gray-800">{user?.fullName || user?.username}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-gray-800">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium text-[#49A7F5]">{user?.role}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Building2 size={16} />Company Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="font-medium text-gray-800">{user?.company?.name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-medium text-gray-800">{user?.company?.unitName || user?.unit || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="font-medium text-gray-800">{user?.company?.location || 'N/A'}</span></div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Shield size={18} className="text-[#49A7F5] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#49A7F5] text-sm">MIS Admin — Read-Only Access</p>
            <p className="text-xs text-gray-500 mt-1">You can view all reports for your company. Data is filtered to your company only. Contact Super Admin for access changes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
