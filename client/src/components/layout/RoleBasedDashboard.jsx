import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import Dashboard from "@/pages/Dashboard";
import SalesDashboard from "@/pages/SalesDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import ProductionModule from "@/components/production/ProductionModule";
import PackingDashboard from "@/pages/PackingDashboard";
import DispatchDashboard from "@/pages/DispatchDashboard";
import { PackagingDispatchProvider } from "@/contexts/PackagingDispatchContext";
import PkgDispatchDashboard from "@/pages/packaging-dispatch/Dashboard";
import AccountsDashboard from "@/pages/AccountsDashboard";
import HRMSDashboard from "@/pages/hrms/HRMSDashboard";
import ManagerDashboard from "@/pages/hrms/Manager/ManagerDashboard";
import EmployeeDashboard from "@/pages/hrms/Employee/Dashboard/EmployeeDashboard";
import CompanyAdminDashboard from "@/pages/hrms/CompanyAdmin/CompanyAdminDashboard";
import RDDashboard from "@/pages/ResearchDevelopment/Dashboard";
import { QCProvider } from "@/contexts/QCContext";
import QCDashboard from "@/pages/quality-control/Dashboard";

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If user has specific role, redirect to their dashboard
    if (user && location === '/') {
      switch (user.role) {
        case 'Superadmin':
        case 'Super Admin': // backend stores as 'Super Admin'
          setLocation('/super-admin-dashboard');
          return;
        case 'Sales':
        case 'Sales Employee':
        case 'Sales Head':
          setLocation('/sales-dashboard');
          return;
        case 'Production':
        case 'Production Employee':
        case 'Production Head':
          setLocation('/production/dashboard');
          return;
        case 'Packing':
        case 'Packing Employee':
        case 'Packing Head':
          setLocation('/packing-dashboard');
          return;
        case 'Dispatch':
        case 'Dispatch Employee':
        case 'Dispatch Head':
          setLocation('/packaging-dispatch/dashboard');
          return;
        case 'Accounts':
        case 'Account Employee':
        case 'Accounts Head':
          setLocation('/accounts-dashboard');
          return;
        case 'Hr Admin':
        case 'HR-Admin': // backend stores as 'HR-Admin'
          setLocation('/hrms/SuperAdmin/dashboard');
          return;
        case 'Manager': // HRMS Manager role
          setLocation('/hrms/Manager/dashboard');
          return;
        case 'Employee': // HRMS Employee role
          setLocation('/hrms/Employee/dashboard');
          return;
        case 'Company Admin':
          setLocation('/hrms/CompanyAdmin/dashboard');
          return;
        case 'Research & Development Head':
        case 'Research Development Employee':
          setLocation('/r&d/dashboard');
          return;
        case 'QC Head':
        case 'QC Employee':
          setLocation('/qc/dashboard');
          return;
        case 'Marketing Head':
          setLocation('/sales-dashboard');
          return;
        default:
          // Super User and others stay on main dashboard
          break;
      }
    }
  }, [user, location, setLocation]);

  // For direct dashboard access, show appropriate dashboard based on role
  switch (user?.role) {
    case 'Superadmin':
    case 'Super Admin': // backend stores as 'Super Admin'
      return <SuperAdminDashboard />;
    case 'Sales':
    case 'Sales Employee':
    case 'Sales Head':
      return <SalesDashboard />;
    case 'Production':
    case 'Production Employee':
    case 'Production Head':
      return <ProductionModule />;
    case 'Packing':
    case 'Packing Employee':
    case 'Packing Head':
      return <PackingDashboard />;
    case 'Dispatch':
    case 'Dispatch Employee':
    case 'Dispatch Head':
      return <PackagingDispatchProvider><PkgDispatchDashboard /></PackagingDispatchProvider>;
    case 'Accounts':
    case 'Account Employee':
    case 'Accounts Head':
      return <AccountsDashboard />;
    case 'Hr Admin':
    case 'HR-Admin': // backend stores as 'HR-Admin'
      return <HRMSDashboard />;
    case 'Manager': // HRMS Manager role → focused Manager dashboard
      return <ManagerDashboard />;
    case 'Employee': // HRMS Employee role → focused Employee dashboard
      return <EmployeeDashboard />;
    case 'Company Admin':
      return <CompanyAdminDashboard />;
    case 'Research & Development Head':
    case 'Research Development Employee':
      return <RDDashboard />;
    case 'QC Head':
    case 'QC Employee':
      return <QCProvider><QCDashboard /></QCProvider>;
    case 'Marketing Head':
      return <SalesDashboard />;
    default:
      // Default to main dashboard for Super User and others
      return <Dashboard />;
  }
}