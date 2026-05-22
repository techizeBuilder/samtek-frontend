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

  // Check role restriction if specified - STRICT role checking
  // Exception 1: Super Admin can access all pages regardless of role restriction
  // Exception 2: Manager can access HR-Admin (HRMS) pages
  const isSuperAdmin = user.role === 'Superadmin' || user.role === 'Super Admin';
  const isHrAdmin = user.role === 'HR-Admin' || user.role === 'Hr Admin';
  const isManager = user.role === 'Manager';
  
  const isAuthorized = !requiredRole || 
    isSuperAdmin || 
    (Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole) ||
    (requiredRole === 'HR-Admin' && (isHrAdmin || isManager)) ||
    (requiredRole === 'Accounts' && (user.role === 'Account Employee' || user.role === 'Accounts Head')) ||
    (requiredRole === 'Sales' && (user.role === 'Sales Employee' || user.role === 'Sales Head')) ||
    (requiredRole === 'Dispatch' && (user.role === 'Dispatch Employee' || user.role === 'Dispatch Head')) ||
    (requiredRole === 'Production' && (user.role === 'Production Employee' || user.role === 'Production Head')) ||
    (requiredRole === 'Packing' && (user.role === 'Packing Employee' || user.role === 'Packing Head'));

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