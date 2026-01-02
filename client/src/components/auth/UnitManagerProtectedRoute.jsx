import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import UnitManagerLayout from '@/components/layout/UnitManagerLayout';

export function UnitManagerProtectedRoute({ children, requiredRole = null }) {
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
  // Exception: Super Admin can access all pages regardless of role restriction
  if (requiredRole && user.role !== requiredRole && user.role !== 'Super Admin') {
    return (
      <UnitManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
          </div>
        </div>
      </UnitManagerLayout>
    );
  }

  return <UnitManagerLayout>{children}</UnitManagerLayout>;
}