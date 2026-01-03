import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import CutoffTimeManagement from '@/components/cutoff/CutoffTimeManagement';
import { Settings } from 'lucide-react';

const UnitHeadCutoffTime = () => {
  const { user, loading } = useAuth();
  const { hasPermission } = usePermissions();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Check permissions for cutoff time management
  const canManageCutoffTime = hasPermission('unitHead', 'sales', 'add') || hasPermission('unitHead', 'sales', 'edit');

  if (!canManageCutoffTime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage cutoff time settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cutoff Time Management
            </h1>
            <p className="text-gray-600">
              Set daily cutoff times to control when sales persons can place orders
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <CutoffTimeManagement />
    </div>
  );
};

export default UnitHeadCutoffTime;