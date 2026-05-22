/** @format */

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  SidebarTitle,
  SidebarToggle,
  SidebarGroup,
  useSidebar,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/collapsible-sidebar";
import {
  Users,
  Building2,
  Briefcase,
  LogOut,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

import { LogoutButton } from "@/components/ui/logout-button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { CRMHeaderUserInfo } from "@/components/crm/CRMHeaderUserInfo";

interface Props {
  children: React.ReactNode;
}

export default function CompanyAdminLayout({ children }: Props) {
  return (
    <SidebarProvider>
      <CompanyAdminLayoutContent>{children}</CompanyAdminLayoutContent>
    </SidebarProvider>
  );
}

function CompanyAdminLayoutContent({ children }: Props) {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  return (
    <div className="flex h-screen">
      <Sidebar className="h-screen">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <img
                src="/logo Semtek.webp"
                alt="Samtek Logo"
                className="h-8 w-8 object-contain"
              />
            )}
            <SidebarTitle>Company Admin</SidebarTitle>
          </div>
          <SidebarToggle />
        </SidebarHeader>
        <SidebarContent className="space-y-4">
          <SidebarGroup label="Main Menu">
            <SidebarNav>
              <SidebarNavItem to="/hrms/CompanyAdmin/dashboard" icon={LayoutDashboard}>
                Dashboard
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          <SidebarGroup label="Company Configuration">
            <SidebarNav>
              <SidebarNavItem to="/hrms/CompanyAdmin/companies" icon={Building2}>
                My Company
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/CompanyAdmin/branches" icon={MapPin}>
                Units
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/CompanyAdmin/departments" icon={Users}>
                Departments
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/CompanyAdmin/designations" icon={Briefcase}>
                Designations
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          <SidebarGroup label="User Management">
            <SidebarNav>
              <SidebarNavItem to="/hrms/CompanyAdmin/user-management" icon={ShieldCheck}>
                Roles & Permissions
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="space-y-2">
            <LogoutButton
              variant="ghost"
              size={isCollapsed ? "icon" : "default"}
              className={cn(
                "w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                isCollapsed && "justify-center"
              )}
              isCollapsed={isCollapsed}
            />
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <SidebarToggle className="text-gray-700 hover:bg-gray-100" />
              </div>
              <CRMHeaderUserInfo name={user?.fullName || user?.name} role={user?.role} />
            </div>
            <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {user?.unit || "Main Branch"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
