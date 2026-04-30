/** @format */

import * as React from "react";
import { LogOut } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
  isCollapsed?: boolean;
}

export const LogoutButton = React.forwardRef<HTMLButtonElement, LogoutButtonProps>(
  ({ className, isCollapsed, ...props }, ref) => {
    const { logout } = useAuth();

    return (
      <Button
        ref={ref}
        variant="ghost"
        onClick={logout}
        className={cn(
          "w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors",
          isCollapsed && "justify-center px-0",
          className
        )}
        {...props}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span className="font-medium">Logout</span>}
      </Button>
    );
  }
);

LogoutButton.displayName = "LogoutButton";
