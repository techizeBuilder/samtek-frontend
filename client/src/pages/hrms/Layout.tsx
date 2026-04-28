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
} from "@/components/ui/collapsible-sidebar";
import {
  Users,
  Building2,
  Briefcase,
  CalendarDays,
  FileText,
  NotebookPen,
  ListChecks,
  Boxes,

  // 🔽 missing icons added
  ShieldCheck,
  LogOut,
  Layers,
  Receipt,
  Clock,
  ClipboardCheck,
  Calendar,
  Settings,
  Wallet,
  IndianRupee,
  PlayCircle,
  FileBarChart,
  GitBranch,
  ClipboardList,
  MapPin,
  Shield,
  List,
  AlertCircle,
  UserCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogoutButton } from "@/components/ui/logout-button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CRMHeaderUserInfo } from "@/components/crm/CRMHeaderUserInfo";

interface HRMSAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: HRMSAdminLayoutProps) {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

  return (
    <div className="flex h-screen">
      <Sidebar className="h-screen">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <img
                src="/fancy-logo.jpg"
                alt="ThinkPro Logo"
                className="h-8 w-8 object-contain"
              />
            )}
            <SidebarTitle>HRMS Portal</SidebarTitle>
          </div>
          <SidebarToggle />
        </SidebarHeader>
        <SidebarContent className="space-y-4">
          <SidebarGroup label="Main Menu">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/dashboard" icon={Building2}>
                Dashboard
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          <SidebarGroup label="System Configuration">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/companies" icon={Building2}>
                Companies
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/SuperAdmin/branches" icon={MapPin}>
                Branches
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/SuperAdmin/departments" icon={Users}>
                Departments
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/SuperAdmin/designations" icon={Briefcase}>
                Designations
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          <SidebarGroup label="Master Data">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/cost-centers" icon={Wallet}>
                Cost Centers
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/working-days" icon={Calendar}>
                Working Days
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/master-list" icon={List}>
                Master List
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/roles" icon={Shield}>
                Roles
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/audit-logs" icon={ClipboardList}>
                Audit Logs
              </SidebarNavItem>

              <SidebarNavItem to="/hrms/SuperAdmin/policies" icon={ShieldCheck}>
                Company Policies
              </SidebarNavItem>

              <SidebarNavItem
                to="/hrms/SuperAdmin/payroll-settings"
                icon={IndianRupee}
              >
                Payroll Settings
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Employee Lifecycle */}
          <SidebarGroup label="User and Roles">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/addUser" icon={Users}>
                Add Users
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>
          {/* Employee Lifecycle */}
          <SidebarGroup label="Employee Management">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/employees" icon={Users}>
                All Users
              </SidebarNavItem>
              {/* <SidebarNavItem to="/hrms/SuperAdmin/documents" icon={FileText}>
                Documents
              </SidebarNavItem> */}
              <SidebarNavItem to="/hrms/SuperAdmin/letters" icon={NotebookPen}>
                Letters
              </SidebarNavItem>
              {/* <SidebarNavItem to="/hrms/SuperAdmin/probation" icon={UserCheck}>
                Probation & Confirmation
              </SidebarNavItem> */}
            </SidebarNav>
          </SidebarGroup>

          {/* Onboarding */}
          <SidebarGroup label="Onboarding">
            <SidebarNav>
              <SidebarNavItem
                to="/hrms/SuperAdmin/onboarding/checklist"
                icon={ListChecks}
              >
                Onboarding Checklist
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/onboarding/tasks"
                icon={ClipboardList}
              >
                Onboarding Tasks
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Offboarding */}
          <SidebarGroup label="Offboarding">
            <SidebarNav>
              <SidebarNavItem
                to="/hrms/SuperAdmin/offboarding/resignations"
                icon={LogOut}
              >
                Resignations
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/offboarding/clearance"
                icon={Layers}
              >
                Clearance Workflow
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/offboarding/full-final"
                icon={Receipt}
              >
                Full & Final Settlement
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Attendance */}
          <SidebarGroup label="Attendance">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/attendance" icon={CalendarDays}>
                Attendance Records
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/shifts" icon={Clock}>
                Shifts & Rosters
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/attendance/requests"
                icon={ClipboardCheck}
              >
                Attendance Requests
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/holidays" icon={Calendar}>
                Holidays
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Leave */}
          <SidebarGroup label="Leave Management">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/leaves" icon={Briefcase}>
                Leave Requests
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/leave-encashment-requests"
                icon={Wallet}
              >
                Encashment Requests
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/leave-override"
                icon={UserCog}
              >
                Override Balance
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/leave-types" icon={Settings}>
                Leave Types & Rules
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Payroll */}
          <SidebarGroup label="Payroll">
            <SidebarNav>
              <SidebarNavItem
                to="/hrms/SuperAdmin/salary-structure"
                icon={IndianRupee}
              >
                Salary Structure
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/payroll/run" icon={PlayCircle}>
                Payroll Run
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/payslips" icon={FileText}>
                Payslips
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/statutory-reports"
                icon={FileBarChart}
              >
                Statutory Reports
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Data Management */}
          <SidebarGroup label="Data Management">
            <SidebarNav>
              <SidebarNavItem
                to="/hrms/SuperAdmin/data-management/import-export"
                icon={Boxes}
              >
                Import / Export Data
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/data-management/hard-delete"
                icon={ShieldCheck}
              >
                Hard Delete
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Recruitment */}
          <SidebarGroup label="Recruitment (ATS)">
            <SidebarNav>
              <SidebarNavItem to="/hrms/SuperAdmin/jobs" icon={Briefcase}>
                Job Openings
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/candidates" icon={Users}>
                Candidates
              </SidebarNavItem>
              <SidebarNavItem to="/hrms/SuperAdmin/interviews" icon={GitBranch}>
                Interview Pipeline
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>

          {/* Support & Escalations */}
          <SidebarGroup label="Support & Escalations">
            <SidebarNav>
              <SidebarNavItem
                to="/hrms/SuperAdmin/raise-escalation"
                icon={AlertCircle}
              >
                Raise Escalation
              </SidebarNavItem>
              <SidebarNavItem
                to="/hrms/SuperAdmin/escalations"
                icon={ClipboardList}
              >
                Manage Tickets
              </SidebarNavItem>
            </SidebarNav>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="space-y-2">
            {!isCollapsed ? (
              <Link to="/superadmin">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm bg-[#333A47] hover:bg-[#20252d]"
                >
                  <Building2 className="mr-3 h-4 w-4 text-white" />
                  <span className="text-white">Back to LMS</span>
                </Button>
              </Link>
            ) : (
              <Link to="/superadmin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full bg-[#333A47] hover:bg-[#20252d]"
                >
                  <Building2 className="h-4 w-4 text-white" />
                  <span className="sr-only">Back to LMS</span>
                </Button>
              </Link>
            )}

            <LogoutButton
              variant="ghost"
              size={isCollapsed ? "icon" : "default"}
              className={cn(
                "w-full justify-start text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover-bg)]",
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
              <CRMHeaderUserInfo name={user?.name} role={user?.role} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
