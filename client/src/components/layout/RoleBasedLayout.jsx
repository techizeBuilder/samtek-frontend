import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from './MainLayout';
import UnitManagerLayout from './UnitManagerLayout';

const RoleBasedLayout = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <MainLayout>{children}</MainLayout>;
  }

  // Check role restriction if specified - STRICT role checking
  // Exception: Super User can access all pages regardless of role restriction
  const isAuthorized = !requiredRole || 
    user.role === 'Super User' || 
    user.role === requiredRole ||
    (requiredRole === 'Sales' && (user.role === 'Sales Employee' || user.role === 'Sales Head')) ||
    (requiredRole === 'Dispatch' && (user.role === 'Dispatch Employee' || user.role === 'Dispatch Head')) ||
    (requiredRole === 'Production' && (user.role === 'Production Employee' || user.role === 'Production Head')) ||
    (requiredRole === 'Packing' && (user.role === 'Packing Employee' || user.role === 'Packing Head')) ||
    (requiredRole === 'Accounts' && (user.role === 'Account Employee' || user.role === 'Accounts Head')) ||
    (requiredRole === 'Employee' && (user.role.endsWith('Employee') || user.role === 'Employee'));

  if (!isAuthorized) {
    const Layout = user.role === 'Unit Manager' ? UnitManagerLayout : MainLayout;
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Use UnitManagerLayout for Unit Manager, MainLayout for others
  const Layout = user.role === 'Unit Manager' ? UnitManagerLayout : MainLayout;
  return <Layout>{children}</Layout>;
};

export default RoleBasedLayout;