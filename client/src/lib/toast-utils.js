import React from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Error categories for smart notifications
export const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  SERVER: 'server',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  BUSINESS_LOGIC: 'business_logic'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Smart error categorization based on status codes and messages
export const categorizeError = (error) => {
  const status = error.status || error.response?.status;
  const message = error.message?.toLowerCase() || error.response?.data?.message?.toLowerCase() || '';
  const isNetworkError = error.isNetworkError;
  const errors = error.response?.data?.errors;

  // Network errors (actual connection issues)
  if (isNetworkError || (!status && message.includes('fetch'))) {
    return {
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      title: 'Connection Problem',
      description: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Retry',
      icon: '🌐'
    };
  }

  // Authentication errors
  if (status === 401) {
    return {
      category: ERROR_CATEGORIES.AUTHENTICATION,
      severity: ERROR_SEVERITY.HIGH,
      title: 'Authentication Required',
      description: 'Your session has expired. Please log in again.',
      action: 'Login',
      icon: '🔐'
    };
  }

  // Permission errors
  if (status === 403) {
    return {
      category: ERROR_CATEGORIES.PERMISSION,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Access Denied',
      description: 'You don\'t have permission to perform this action.',
      action: 'Contact Admin',
      icon: '🚫'
    };
  }

  // Not found errors
  if (status === 404) {
    return {
      category: ERROR_CATEGORIES.NOT_FOUND,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Resource Not Found',
      description: 'The requested item could not be found.',
      action: 'Refresh',
      icon: '❓'
    };
  }

  // Validation errors (400 status or validation keywords)
  if (status === 400 || message.includes('validation') || message.includes('invalid') || 
      message.includes('required') || message.includes('already exists') || 
      message.includes('duplicate') || message.includes('not found')) {
    const errorCount = errors ? Object.keys(errors).length : 0;
    return {
      category: ERROR_CATEGORIES.VALIDATION,
      severity: ERROR_SEVERITY.LOW,
      title: 'Validation Error',
      description: error.message || (errorCount > 0 
        ? `Please fix ${errorCount} field${errorCount > 1 ? 's' : ''}`
        : 'Please check your input and try again.'),
      action: 'Fix Fields',
      icon: '⚠️',
      details: errors
    };
  }

  // Conflict errors (duplicate data, etc.) - keeping as fallback
  if (status === 409) {
    return {
      category: ERROR_CATEGORIES.CONFLICT,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Data Conflict',
      description: error.message || 'This item already exists or conflicts with existing data.',
      action: 'Modify',
      icon: '⚡'
    };
  }

  // Business logic errors
  if (status === 422) {
    return {
      category: ERROR_CATEGORIES.BUSINESS_LOGIC,
      severity: ERROR_SEVERITY.MEDIUM,
      title: 'Business Rule Violation',
      description: 'This action violates business rules or constraints.',
      action: 'Review',
      icon: '📋'
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      category: ERROR_CATEGORIES.SERVER,
      severity: ERROR_SEVERITY.HIGH,
      title: 'Server Error',
      description: error.message || 'An unexpected server error occurred.',
      action: 'Try Again',
      icon: '🔧'
    };
  }

  // Default fallback
  return {
    category: ERROR_CATEGORIES.SERVER,
    severity: ERROR_SEVERITY.MEDIUM,
    title: 'Unexpected Error',
    description: message || 'An unexpected error occurred.',
    action: 'Retry',
    icon: '❌'
  };
};

// Smart toast notification with error categorization and success handling
export const showSmartToast = (errorOrSuccess, context = '') => {
  try {
    // Handle success messages (both string and object format)
    if (typeof errorOrSuccess === 'string' || 
        (errorOrSuccess && typeof errorOrSuccess === 'object' && 
         (errorOrSuccess.success === true || 
          (errorOrSuccess.message && !errorOrSuccess.status && !errorOrSuccess.error)))) {
      
      const successMessage = typeof errorOrSuccess === 'string' ? errorOrSuccess : errorOrSuccess.message;
      
      // Context-specific success messages
      let contextualMessage = successMessage;
      if (context === 'settings_update') {
        if (successMessage.includes('Company')) {
          contextualMessage = 'Company settings saved successfully';
        } else if (successMessage.includes('System')) {
          contextualMessage = 'System preferences updated successfully';
        } else if (successMessage.includes('Email')) {
          contextualMessage = 'Email configuration saved successfully';
        } else if (successMessage.includes('Module')) {
          contextualMessage = 'Module settings updated successfully';
        } else if (successMessage.includes('Notification')) {
          contextualMessage = 'Notification preferences saved successfully';
        }
      } else if (context === 'logo_upload') {
        contextualMessage = 'Company logo uploaded successfully';
      }
      
      toast({
        title: "✅ Success",
        description: contextualMessage,
        className: "border-green-200 bg-green-50 text-green-800",
        duration: 4000
      });
      return;
    }
    
    // Handle error messages
    const errorInfo = categorizeError(errorOrSuccess);
    
    // Show toast with appropriate styling based on severity
    const variant = errorInfo.severity === ERROR_SEVERITY.HIGH || errorInfo.severity === ERROR_SEVERITY.CRITICAL 
      ? 'destructive' 
      : 'default';

    // Use the actual error message for validation errors
    let description = errorInfo.description;
    if (errorInfo.category === ERROR_CATEGORIES.VALIDATION && errorOrSuccess.message) {
      description = errorOrSuccess.message;
    }

    toast({
      title: `${errorInfo.icon} ${errorInfo.title}`,
      description,
      variant,
      duration: getDurationBySeverity(errorInfo.severity),
      action: errorInfo.action ? React.createElement(ToastAction, {
        altText: errorInfo.action,
        onClick: () => handleErrorAction(errorInfo),
        children: errorInfo.action
      }) : undefined
    });

    // Log error for debugging
    console.error(`[${errorInfo.category.toUpperCase()}] ${errorInfo.title}:`, errorOrSuccess);

    return errorInfo;
  } catch (err) {
    // Fallback for any errors in toast handling
    console.error('[TOAST ERROR]', err, errorOrSuccess);
    toast({
      title: "⚠️ Error",
      description: typeof errorOrSuccess === 'string' ? errorOrSuccess : 'An error occurred',
      variant: "destructive",
      duration: 5000
    });
  }
};

// Get toast duration based on severity
const getDurationBySeverity = (severity) => {
  switch (severity) {
    case ERROR_SEVERITY.LOW:
      return 3000;
    case ERROR_SEVERITY.MEDIUM:
      return 5000;
    case ERROR_SEVERITY.HIGH:
      return 8000;
    case ERROR_SEVERITY.CRITICAL:
      return 0; // Manual dismiss
    default:
      return 5000;
  }
};

// Handle error actions
const handleErrorAction = (errorInfo) => {
  switch (errorInfo.action) {
    case 'Retry':
      window.location.reload();
      break;
    case 'Login':
      // Redirect to login or trigger login modal
      window.location.href = '/login';
      break;
    case 'Refresh':
      window.location.reload();
      break;
    case 'Contact Admin':
      // Open support modal or redirect to contact page
      console.log('Contact admin action triggered');
      break;
    default:
      console.log(`Action triggered: ${errorInfo.action}`);
  }
};

// Success toast variants
export const showSuccessToast = (title, description, options = {}) => {
  toast({
    title: `✅ ${title}`,
    description,
    variant: 'default',
    duration: options.duration || 3000,
    className: 'border-green-500 bg-green-50 text-green-800'
  });
};

// Warning toast
export const showWarningToast = (title, description, options = {}) => {
  toast({
    title: `⚠️ ${title}`,
    description,
    variant: 'default',
    duration: options.duration || 4000,
    className: 'border-orange-500 bg-orange-50 text-orange-800'
  });
};

// Info toast
export const showInfoToast = (title, description, options = {}) => {
  toast({
    title: `ℹ️ ${title}`,
    description,
    variant: 'default',
    duration: options.duration || 4000,
    className: 'border-blue-500 bg-blue-50 text-blue-800'
  });
};

// Loading toast with progress
export const showLoadingToast = (title, description) => {
  return toast({
    title: `⏳ ${title}`,
    description,
    duration: 0, // Manual dismiss
    className: 'border-gray-500 bg-gray-50'
  });
};

// Validation specific toast
export const showValidationToast = (errors, formName = 'form') => {
  if (!errors || typeof errors !== 'object') return;

  const errorFields = Object.keys(errors);
  const errorCount = errorFields.length;
  
  if (errorCount === 0) return;

  const title = `Validation Failed`;
  const description = errorCount === 1 
    ? `Please fix the error in ${errorFields[0]}`
    : `Please fix ${errorCount} errors in: ${errorFields.join(', ')}`;

  toast({
    title: `⚠️ ${title}`,
    description,
    variant: 'destructive',
    duration: 6000,
    action: {
      altText: 'Fix Fields',
      label: 'Fix Fields',
      onClick: () => {
        // Scroll to first error field
        const firstField = errorFields[0];
        const element = document.querySelector(`[name="${firstField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
    }
  });
};

// Network status toast
export const showNetworkStatusToast = (isOnline) => {
  if (isOnline) {
    showSuccessToast('Connection Restored', 'You are back online');
  } else {
    toast({
      title: '🔌 Connection Lost',
      description: 'You are currently offline. Some features may not work.',
      variant: 'destructive',
      duration: 0 // Keep until online
    });
  }
};

// Batch operation toast
export const showBatchOperationToast = (results) => {
  const { success = 0, failed = 0, total = 0 } = results;
  
  if (failed === 0) {
    showSuccessToast(
      'Batch Operation Complete',
      `Successfully processed ${success} of ${total} items`
    );
  } else if (success === 0) {
    showSmartToast(
      new Error(`All ${total} operations failed`),
      'Batch Operation'
    );
  } else {
    showWarningToast(
      'Batch Operation Partial Success',
      `${success} succeeded, ${failed} failed out of ${total} items`
    );
  }
};

export default {
  showSmartToast,
  showSuccessToast,
  showWarningToast,
  showInfoToast,
  showLoadingToast,
  showValidationToast,
  showNetworkStatusToast,
  showBatchOperationToast,
  categorizeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY
};