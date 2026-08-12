import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoutePermission } from '@/config/moduleRoutes';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';
import { AccessDenied } from '@/components/auth/AccessDenied';

export function ProtectedRoute({ children, requiredRole = null }) {
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
    return <Login />;
  }

  // Check role restriction if specified - Case-insensitive role checking
  const userRoleLower = (user.role || '').toLowerCase().trim();
  const reqRoleLower = typeof requiredRole === 'string' ? requiredRole.toLowerCase().trim() : '';

  const isSuperAdmin = userRoleLower === 'superadmin' || userRoleLower === 'super admin';
  const isHrAdmin = userRoleLower === 'hr-admin' || userRoleLower === 'hr admin';
  const isManager = userRoleLower === 'manager';
  
  const isAuthorized = !requiredRole || 
    isSuperAdmin || 
    (Array.isArray(requiredRole) 
      ? requiredRole.map(r => r.toLowerCase().trim()).includes(userRoleLower) 
      : userRoleLower === reqRoleLower) ||
    (reqRoleLower === 'hr-admin' && (isHrAdmin || isManager)) ||
    (reqRoleLower === 'accounts' && (userRoleLower === 'account employee' || userRoleLower === 'accounts employee' || userRoleLower === 'accounts head' || userRoleLower === 'accounts')) ||
    (reqRoleLower === 'sales' && (userRoleLower === 'sales employee' || userRoleLower === 'sales head' || userRoleLower === 'sales person' || userRoleLower === 'salesman' || userRoleLower === 'sales')) ||
    (reqRoleLower === 'dispatch' && (userRoleLower === 'dispatch employee' || userRoleLower === 'dispatch head' || userRoleLower === 'dispatch')) ||
    (reqRoleLower === 'production' && (userRoleLower === 'production employee' || userRoleLower === 'production head' || userRoleLower === 'production')) ||
    (reqRoleLower === 'packing' && (userRoleLower === 'packing employee' || userRoleLower === 'packing head' || userRoleLower === 'packing'));

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

  return <MainLayout>{children}</MainLayout>;
}