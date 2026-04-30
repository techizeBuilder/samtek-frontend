import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  // Check if user has access to a specific module
  const hasModuleAccess = (moduleName) => {
    if (!user || !user.permissions) return false;
    
    // Super Admin has access to everything (both variants)
    if (user.role === 'Superadmin' || user.role === 'Super Admin') return true;
    
    // Special handling for Unit Head role
    if (user.role === 'Unit Head') {
      // Unit Head permissions can be stored in either 'unitHead' or 'unitManager' module
      const unitHeadModule = user.permissions.modules?.find(module => 
        module.name === 'unitHead' || module.name === 'unitManager'
      );
      if (unitHeadModule) {
        console.log(`[DEBUG] Unit Head hasModuleAccess: Looking for module '${moduleName}' in:`, unitHeadModule);
        // Check if the requested module exists as a feature with at least view permission
        const moduleFeature = unitHeadModule.features?.find(feature => feature.key === moduleName);
        const hasAccess = moduleFeature && moduleFeature.view;
        console.log(`[DEBUG] Unit Head hasModuleAccess result for '${moduleName}':`, hasAccess, moduleFeature);
        return hasAccess;
      }
    }
    
    // Special handling for Unit Manager role
    if (user.role === 'Unit Manager') {
      // Unit Manager has permissions stored in modules array
      if (Array.isArray(user.permissions.modules)) {
        return user.permissions.modules.some(module => module.name === moduleName);
      }
    }
    
    // For other roles, check direct module access
    if (Array.isArray(user.permissions)) {
      // Simple array of module names
      return user.permissions.includes(moduleName);
    } else if (user.permissions && typeof user.permissions === 'object') {
      // Complex permissions object - check if it has modules array
      if (Array.isArray(user.permissions.modules)) {
        // Check for both singular and plural forms (e.g., 'dispatch' vs 'dispatches')
        const hasSingular = user.permissions.modules.some(module => module.name === moduleName);
        if (hasSingular) return true;
        
        // Check plural form if singular not found
        const pluralForm = moduleName.endsWith('s') ? moduleName.slice(0, -1) : moduleName + 's';
        return user.permissions.modules.some(module => module.name === pluralForm);
      } else if (user.permissions.some && typeof user.permissions.some === 'function') {
        // Legacy format - array-like permissions
        return user.permissions.some(permission => {
          if (typeof permission === 'string') {
            return permission === moduleName;
          }
          return permission.module === moduleName && permission.access;
        });
      }
    }
    
    return false;
  };  // Check if user has specific feature access with action
  const hasFeatureAccess = (moduleName, featureKey, action = 'view') => {
    if (!user || !user.permissions) return false;
    
    // Super Admin has access to everything (both variants)
    if (user.role === 'Superadmin' || user.role === 'Super Admin') return true;
    
    // Special handling for Unit Head role
    if (user.role === 'Unit Head') {
      // Unit Head permissions can be stored in either 'unitHead' or 'unitManager' module
      const unitHeadModule = user.permissions.modules?.find(module => 
        module.name === 'unitHead' || module.name === 'unitManager'
      );
      if (unitHeadModule) {
        console.log(`[DEBUG] Unit Head hasFeatureAccess: Looking for module '${moduleName}', feature '${featureKey}' in:`, unitHeadModule);
        // If the module is 'unitHead' or we're looking for unitManager features, look for the specific feature within it
        if (moduleName === 'unitHead' || moduleName === 'unitManager') {
          const feature = unitHeadModule.features?.find(feature => feature.key === featureKey);
          if (feature) {
            const hasAccess = feature[action] || false;
            console.log(`[DEBUG] Unit Head hasFeatureAccess result for '${moduleName}.${featureKey}.${action}':`, hasAccess, feature);
            return hasAccess;
          }
        } else {
          // For other modules, treat module names as feature keys (legacy behavior)
          const moduleFeature = unitHeadModule.features?.find(feature => feature.key === moduleName);
          if (moduleFeature) {
            const hasAccess = moduleFeature[action] || false;
            console.log(`[DEBUG] Unit Head hasFeatureAccess (legacy) result for '${moduleName}.${action}':`, hasAccess, moduleFeature);
            return hasAccess;
            return moduleFeature[action] || false;
          }
        }
      }
    }
    
    // Special handling for Unit Manager role
    if (user.role === 'Unit Manager') {
      const userModule = user.permissions.modules?.find(module => 
        module.name === moduleName
      );
      
      if (!userModule) return false;
      
      if (featureKey === 'dashboard') {
        return userModule.dashboard === true;
      }
      
      const feature = userModule.features?.find(f => f.key === featureKey);
      if (!feature) return false;
      
      return feature[action] || false;
    }
    
    // For other roles, check direct module access with both singular and plural forms
    let userModule = user.permissions.modules?.find(module => 
      module.name === moduleName
    );
    
    // If not found, try the alternate form (singular/plural)
    if (!userModule) {
      const alternateForm = moduleName.endsWith('s') ? moduleName.slice(0, -1) : moduleName + 's';
      userModule = user.permissions.modules?.find(module => 
        module.name === alternateForm
      );
    }
    
    if (!userModule) return false;
    
    if (featureKey === 'dashboard') {
      return userModule.dashboard === true;
    }
    
    const feature = userModule.features?.find(f => f.key === featureKey);
    if (!feature) return false;
    
    return feature[action] || false;
  };

  // Get all accessible modules for sidebar rendering
  const getAccessibleModules = () => {
    if (!user || !user.permissions) return [];
    
    // Super Admin gets all modules (both variants)
    if (user.role === 'Superadmin' || user.role === 'Super Admin') {
      return [
        'dashboard', 'orders', 'manufacturing', 'production', 'dispatches', 
        'sales', 'accounts', 'inventory', 'customers', 
        'suppliers', 'purchases'
      ];
    }
    
    // Special handling for Unit Head role
    if (user.role === 'Unit Head') {
      const unitHeadModule = user.permissions.modules?.find(module => 
        module.name === 'unitHead' || module.name === 'unitManager'
      );
      if (unitHeadModule) {
        // Return the feature keys (which represent module names) that have at least view permission
        return unitHeadModule.features
          ?.filter(feature => feature.view)
          ?.map(feature => feature.key) || [];
      }
    }
    
    // Special handling for Unit Manager role
    if (user.role === 'Unit Manager') {
      // Unit Manager modules are defined differently
      return user.permissions.modules
        ?.map(module => module.name) || [];
    }
    
    // For other roles, return modules they have access to
    return user.permissions.modules
      ?.filter(module => module.dashboard)
      ?.map(module => module.name) || [];
  };

  // Get submodules/features for a specific module
  const getModuleFeatures = (moduleName) => {
    if (!user || !user.permissions) return [];
    
    const normalizedModuleName = moduleName?.toLowerCase();
    const userModule = user.permissions.modules?.find(module => 
      module.name === normalizedModuleName
    );
    
    return userModule?.features || [];
  };

  // Check specific action permission
  const canPerformAction = (moduleName, featureKey, action) => {
    return hasFeatureAccess(moduleName, featureKey, action);
  };

  // Check if user can manage users (for backwards compatibility)
  const canManageUsers = () => {
    return user && ['Superadmin', 'Super Admin', 'Unit Head'].includes(user.role);
  };

  // Check if user can access settings (for backwards compatibility)
  const canAccessSettings = () => {
    return user && (user.role === 'Superadmin' || user.role === 'Super Admin');
  };

  // Check if user can access all units
  const canAccessAllUnits = () => {
    if (!user || !user.permissions) return false;
    return user.role === 'Superadmin' || user.role === 'Super Admin' || user.permissions?.canAccessAllUnits;
  };

  // Get user's permission role
  const getPermissionRole = () => {
    return user?.permissions?.role || user?.role?.toLowerCase().replace(' ', '_');
  };

  return {
    hasModuleAccess,
    hasFeatureAccess,
    getAccessibleModules,
    getModuleFeatures,
    canPerformAction,
    canManageUsers,
    canAccessSettings,
    canAccessAllUnits,
    getPermissionRole,
    // Legacy support
    hasPermission: hasFeatureAccess,
    getUserModules: getAccessibleModules
  };
};