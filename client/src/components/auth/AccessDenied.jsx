import MainLayout from '@/components/layout/MainLayout';

/**
 * Shared "Access Denied" screen for both role-based and permission-based
 * route guards (ProtectedRoute.jsx, RoleBasedLayout.jsx) so a user hitting
 * a URL they aren't permitted for sees a consistent message instead of the
 * page content, regardless of which guard stopped them.
 */
export function AccessDenied({ reason = 'role', requiredRole = null }) {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            {reason === 'permission'
              ? "You don't have permission to access this page. Contact your admin if you need access."
              : <>You don't have permission to access this page. Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}</>}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
