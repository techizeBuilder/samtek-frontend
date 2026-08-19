import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoutePermission } from '@/config/moduleRoutes';
import { AccessDenied } from '@/components/auth/AccessDenied';
import MainLayout from './MainLayout';

const RoleBasedLayout = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const { hasModuleAccess, hasFeatureAccess } = usePermissions();

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

  // Check role restriction if specified - Case-insensitive role checking.
  // requiredRole may be a single role string or an array of role strings
  // (e.g. ['Superadmin', 'Accounts']) — normalize to an array up front so the
  // department expansion below (treating 'accounts' as also covering
  // 'accounts head'/'accounts employee' etc.) applies the same way regardless
  // of which form the route declared. Previously this expansion only ran for
  // the string form, so any route using the array form silently excluded every
  // department sub-role (e.g. an 'Accounts Head' user got locked out of a page
  // declared as requiredRole={['Superadmin', 'Accounts']}).
  const userRoleLower = (user.role || '').toLowerCase().trim();
  const requiredRolesLower = (requiredRole == null ? [] : Array.isArray(requiredRole) ? requiredRole : [requiredRole])
    .map(r => r.toLowerCase().trim());

  const DEPARTMENT_SUB_ROLES = {
    sales: ['sales', 'sales employee', 'sales head', 'sales person', 'salesman'],
    dispatch: ['dispatch', 'dispatch employee', 'dispatch head'],
    production: ['production', 'production employee', 'production head'],
    packing: ['packing', 'packing employee', 'packing head'],
    accounts: ['accounts', 'account employee', 'accounts employee', 'accounts head'],
  };

  const isAuthorized = !requiredRole ||
    userRoleLower === 'super user' ||
    userRoleLower === 'superadmin' ||
    requiredRolesLower.includes(userRoleLower) ||
    requiredRolesLower.some(r => DEPARTMENT_SUB_ROLES[r]?.includes(userRoleLower)) ||
    (requiredRolesLower.includes('employee') && userRoleLower.endsWith('employee'));

  if (!isAuthorized) {
    return <AccessDenied reason="role" requiredRole={requiredRole} />;
  }

  // Module/feature permission check — same data the sidebar uses to decide
  // what to show, now also enforced on the route itself so a direct URL hit
  // can't reach a page the user's permissions don't grant.
  const required = getRoutePermission(location);
  const hasPermission = !required ||
    (required.feature ? hasFeatureAccess(required.module, required.feature, 'view') : hasModuleAccess(required.module));

  if (!hasPermission) {
    return <AccessDenied reason="permission" />;
  }

  // Use MainLayout for all roles
  const Layout = MainLayout;
  return <Layout>{children}</Layout>;
};

export default RoleBasedLayout;