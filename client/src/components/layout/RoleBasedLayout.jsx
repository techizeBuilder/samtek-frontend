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
  if (requiredRole && user.role !== requiredRole && user.role !== 'Super User') {
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