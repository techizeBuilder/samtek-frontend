import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import MainLayout from '@/components/layout/MainLayout';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading } = useAuth();

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
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}