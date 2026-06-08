import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from './MainLayout';

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

  // Check role restriction if specified - Case-insensitive role checking
  const userRoleLower = (user.role || '').toLowerCase().trim();
  const reqRoleLower = typeof requiredRole === 'string' ? requiredRole.toLowerCase().trim() : '';

  const isAuthorized = !requiredRole || 
    userRoleLower === 'super user' || 
    userRoleLower === reqRoleLower ||
    (reqRoleLower === 'sales' && (userRoleLower === 'sales employee' || userRoleLower === 'sales head' || userRoleLower === 'sales person' || userRoleLower === 'salesman' || userRoleLower === 'sales')) ||
    (reqRoleLower === 'dispatch' && (userRoleLower === 'dispatch employee' || userRoleLower === 'dispatch head' || userRoleLower === 'dispatch')) ||
    (reqRoleLower === 'production' && (userRoleLower === 'production employee' || userRoleLower === 'production head' || userRoleLower === 'production')) ||
    (reqRoleLower === 'packing' && (userRoleLower === 'packing employee' || userRoleLower === 'packing head' || userRoleLower === 'packing')) ||
    (reqRoleLower === 'accounts' && (userRoleLower === 'account employee' || userRoleLower === 'accounts employee' || userRoleLower === 'accounts head' || userRoleLower === 'accounts')) ||
    (reqRoleLower === 'employee' && (userRoleLower.endsWith('employee') || userRoleLower === 'employee'));

  if (!isAuthorized) {
    const Layout = MainLayout;
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

  // Use MainLayout for all roles
  const Layout = MainLayout;
  return <Layout>{children}</Layout>;
};

export default RoleBasedLayout;