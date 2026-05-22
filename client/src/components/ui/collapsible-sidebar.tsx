/** @format */

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent as ShadcnSidebarContent,
  SidebarFooter as ShadcnSidebarFooter,
  SidebarGroup as ShadcnSidebarGroup,
  SidebarHeader as ShadcnSidebarHeader,
  useSidebar as useShadcnSidebar,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider as ShadcnSidebarProvider,
} from "./sidebar";
import { cn } from "@/lib/utils";

export const Sidebar = ShadcnSidebar;
export const SidebarContent = ShadcnSidebarContent;
export const SidebarFooter = ShadcnSidebarFooter;
export const SidebarGroup = ShadcnSidebarGroup;
export const SidebarHeader = ShadcnSidebarHeader;
export const useSidebar = useShadcnSidebar;
export const SidebarProvider = ShadcnSidebarProvider;

export const SidebarTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { state } = useSidebar();
  if (state === "collapsed") return null;
  return (
    <h2
      className={cn(
        "text-lg font-semibold tracking-tight text-[var(--sidebar-foreground)]",
        className
      )}
    >
      {children}
    </h2>
  );
};

export const SidebarToggle = ({ className }: { className?: string }) => {
  return <SidebarTrigger className={cn("text-slate-600 hover:bg-slate-50", className)} />;
};

export const SidebarNav = ({ children }: { children: React.ReactNode }) => (
  <SidebarMenu>{children}</SidebarMenu>
);

export const SidebarNavItem = ({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon?: any;
  children: React.ReactNode;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={typeof children === "string" ? children : undefined}
        className={cn(
          "w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        <Link to={to} className="flex items-center gap-3 w-full">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span>{children}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
