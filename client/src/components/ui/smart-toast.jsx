import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Enhanced toast component with smart categorization features
export const SmartToast = React.forwardRef(({ className, variant, children, onDismiss, action, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
        variant === "destructive" &&
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        variant === "success" &&
          "border-green-500 bg-green-50 text-green-800",
        variant === "warning" &&
          "border-orange-500 bg-orange-50 text-orange-800",
        variant === "info" &&
          "border-blue-500 bg-blue-50 text-blue-800",
        className
      )}
      {...props}
    >
      <div className="grid gap-1">
        {children}
      </div>
      
      {action && (
        <div className="flex items-center space-x-2">
          {typeof action === 'string' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => console.log(`Action: ${action}`)}
            >
              {action}
            </Button>
          ) : (
            action
          )}
        </div>
      )}
      
      {onDismiss && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </div>
  );
});

SmartToast.displayName = "SmartToast";

export const SmartToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
SmartToastTitle.displayName = "SmartToastTitle";

export const SmartToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
SmartToastDescription.displayName = "SmartToastDescription";

export const SmartToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    size="sm"
    className={cn(
      "h-8 px-3 text-xs",
      className
    )}
    {...props}
  />
));
SmartToastAction.displayName = "SmartToastAction";

export const SmartToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    size="sm"
    variant="ghost"
    className={cn(
      "absolute right-2 top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100",
      className
    )}
    {...props}
  >
    <X className="h-3 w-3" />
  </Button>
));
SmartToastClose.displayName = "SmartToastClose";