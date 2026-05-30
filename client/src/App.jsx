import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedProtectedRoute } from "@/components/auth/RoleBasedProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";

import Manufacturing from "@/pages/Manufacturing";
import DispatchDashboard from "@/pages/DispatchDashboard";
import Sales from "@/pages/Sales";
import Accounts from "@/pages/Accounts";
import ModernInventoryUI from "@/components/inventory/ModernInventoryUI";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Purchases from "@/pages/Purchases";
import Settings from "@/pages/Settings";
import RolePermissionManagement from "@/pages/RolePermissionManagement";
import MainLayout from "@/components/layout/MainLayout";
import Profile from "@/pages/Profile";
import Companies from "@/pages/Companies";
import MyOrders from "@/pages/sales/MyIndent";
import MyCustomers from "@/pages/sales/MyCustomers";
import MyDeliveries from "@/pages/sales/MyDeliveries";
import MyInvoices from "@/pages/sales/MyInvoices";
import Leads from "@/pages/sales/Leads";
import Quotation from "@/pages/sales/Quotation";
import PaymentRequests from "@/pages/sales/PaymentRequests";
import PaymentVerifications from "@/pages/accounts/PaymentVerifications";
import DealVerifications from "@/pages/complaintsAndServices/DealVerifications";

import Returns from "@/pages/sales/Returns";
import Damages from "@/pages/sales/Damages";
import SalesDashboard from "@/pages/SalesDashboard";
import ProductionHistoryPage from "@/pages/ProductionHistoryPage";
import RoleBasedDashboard from "@/components/layout/RoleBasedDashboard";
import NotificationsPage from "@/pages/NotificationsPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import SuperAdminOrders from "@/pages/super-admin/SuperAdminOrders";
import SuperAdminSales from "@/pages/super-admin/SuperAdminSales";
import SuperAdminCustomers from "@/pages/super-admin/SuperAdminCustomers";
import SuperAdminSettings from "@/pages/super-admin/SuperAdminSettings";
import SuperAdminCompanies from "@/pages/super-admin/SuperAdminCompanies";
import SuperAdminDispatches from "@/pages/super-admin/SuperAdminDispatches";
import ProductionDashboard from "@/pages/production/ProductionDashboard";
import ProductionModule from "@/components/production/ProductionModule";
import ProductionShift from "@/pages/production/ProductionShift";
import PackingDashboard from "@/pages/PackingDashboard";
import PackingSheet from "@/pages/PackingSheet";
import PackingHistory from "@/pages/packing/PackingHistory";
import AccountsDashboard from "@/pages/AccountsDashboard";
import ChartOfAccounts from "@/pages/accounts/ChartOfAccounts";
import AccountsSales from "@/pages/accounts/Sales";
import AccountsPurchases from "@/pages/accounts/Purchases";
import VendorMaster from "@/pages/accounts/VendorMaster";
import PurchaseInvoices from "@/pages/accounts/PurchaseInvoices";
import PurchaseReturns from "@/pages/accounts/PurchaseReturns";
import PurchaseReports from "@/pages/accounts/PurchaseReports";
import PurchaseRequest from "@/pages/accounts/PurchaseRequest";
import VendorPayments from "@/pages/accounts/VendorPayments";
import PayableAgeing from "@/pages/accounts/PayableAgeing";
import GSTAndTDS from "@/pages/accounts/GSTAndTDS";
import DamageAndExpiry from "@/pages/accounts/DamageAndExpiry";
import SalesmanSettlement from "@/pages/accounts/SalesmanSettlement";
import BankAndCash from "@/pages/accounts/BankAndCash";
import InterUnit from "@/pages/accounts/InterUnit";
import AccountsReports from "@/pages/accounts/Reports";
import AccountsSettings from "@/pages/accounts/Settings";

// Sales Account Module (New)
import CustomerMaster from "@/pages/accounts/CustomerMaster";
import SalesOrders from "@/pages/accounts/SalesOrders";
import SalesInvoices from "@/pages/accounts/SalesInvoices";
import SalesReturns from "@/pages/accounts/SalesReturns";
import CustomerPayments from "@/pages/accounts/CustomerPayments";
import ReceivableAgeing from "@/pages/accounts/ReceivableAgeing";
import SalesReports from "@/pages/accounts/SalesReports";
import Expenses from "@/pages/accounts/Expenses";
import FinancialSummary from "@/pages/accounts/FinancialSummary";
import LedgerRecord from "@/pages/accounts/LedgerRecord";
import PaymentReminders from "@/pages/accounts/PaymentReminders";
import LeadPayments from "@/pages/accounts/LeadPayments";
import DeliveryChallan from "@/pages/dispatch/DeliveryChallan";
import DispatchHistory from "@/pages/dispatch/DispatchHistory";
import SalesApproval from "@/pages/SalesApproval";
import SalesOrderList from "@/pages/SalesOrderList";
import RoleBasedLayout from "@/components/layout/RoleBasedLayout";
import SuperAdminAccounts from "@/pages/super-admin/Accounts";

// HRMS Module Imports
import SalesOrderTracking from "@/pages/accounts/SalesOrderTracking";
import NocRequest from "@/pages/accounts/NocRequest";
import HRMSDashboard from "@/pages/hrms/HRMSDashboard";
import HRMSEmployees from "@/pages/hrms/Employee";
import HRMSAttendance from "@/pages/hrms/AttendanceReport";
import HRMSSalaryStructure from "@/pages/hrms/Payroll/SalaryStructure";
import HRMSPayrollRun from "@/pages/hrms/Payroll/PayrollRun";
import HRMSPayslips from "@/pages/hrms/Payroll/Payslips";
import HRMSJobOpenings from "@/pages/hrms/Recruitment/JobOpenings";
import HRMSCandidates from "@/pages/hrms/Recruitment/Candidates";
import HRMSInterviewPipeline from "@/pages/hrms/Recruitment/InterviewPipeline";
import HRMSHoliday from "@/pages/hrms/Holidays/Holiday";
import HRMSPolicies from "@/pages/hrms/SystemConfigration/Policies";
import HRMSAddUser from "@/pages/hrms/AddUser";
import HRMSProfile from "@/pages/hrms/Profile";
import HRMSStatutoryReport from "@/pages/hrms/Payroll/StatutoryReport";
import HRMSLeaveTypes from "@/pages/hrms/LeaveManagement/LeaveType";
import HRMSLeaveRequests from "@/pages/hrms/LeaveManagement/HRAdminLeaveRequest";
import HRMSAttendanceRequests from "@/pages/hrms/Attendance/HRAdminAttendanceRequest";

// System Configuration Imports
import HRMSCompany from "@/pages/hrms/SystemConfigration/Company";
import HRMSBranches from "@/pages/hrms/SystemConfigration/Branches";
import HRMSDepartments from "@/pages/hrms/SystemConfigration/Departments";
import HRMSDesignation from "@/pages/hrms/SystemConfigration/Desigantion";

import ManagerDashboard from "@/pages/hrms/Manager/ManagerDashboard";
import ManagerLeaveRequest from "@/pages/hrms/Manager/Approvals/LeaveRequest";
import ManagerAttendanceRequest from "@/pages/hrms/Manager/Approvals/AttendanceRequest";
import ManagerOverTimeRequest from "@/pages/hrms/Manager/Approvals/OverTimeRequest";
import ManagerExpenseRequest from "@/pages/hrms/Manager/Approvals/ExpenseRequest";
import ManagerTravelRequest from "@/pages/hrms/Manager/Approvals/TravelRequest";
import ManagerProfileRequest from "@/pages/hrms/Manager/Approvals/ProfileRequest";
import ManagerInterviews from "@/pages/hrms/Manager/Interviews/ManagerInterviews";
import EmployeeDashboard from "@/pages/hrms/Employee/Dashboard/EmployeeDashboard";
import EmployeePersonalInformation from "@/pages/hrms/Employee/Profile/PersonalInformation";
import EmployeeDocumentUpload from "@/pages/hrms/Employee/Profile/DocumentUpload";
import EmployeePolicies from "@/pages/hrms/Employee/Profile/EmployeePolicies";
import EmployeeMarkAttendance from "@/pages/hrms/Employee/Attendance/MarkAttendance";
import EmployeeAttendanceCalendar from "@/pages/hrms/Employee/Attendance/AttendanceCalender";
import EmployeeAttendanceRequest from "@/pages/hrms/Employee/Attendance/AttendanceRequest";
import EmployeeLeaveBalance from "@/pages/hrms/Employee/Leave/LeaveBalance";
import EmployeeLeaves from "@/pages/hrms/Employee/Leave/Leaves";
import EmployeePayslips from "@/pages/hrms/Employee/Payroll/EmployeePayslips";
import EmployeeSalaryStructure from "@/pages/hrms/Employee/Payroll/EmployeeSalaryStructure";
import EmployeeExpenses from "@/pages/hrms/Employee/Expenses/Expenses";
import EmployeeTravelRequests from "@/pages/hrms/Employee/Request/TravelRequests";
import EmployeeResignRequest from "@/pages/hrms/Employee/Request/ResignRequest";
import EmployeeOverTimeRequests from "@/pages/hrms/Employee/Request/OverTimeRequests";
import EmployeeProfileUpdateRequest from "@/pages/hrms/Employee/Request/ProfileUpdateRequest";
import HRMSTaskManagement from "@/pages/hrms/TaskManagement/TaskManagement";
import EmployeeTasks from "@/pages/hrms/TaskManagement/EmployeeTasks";

// complaints and services imports
import SupportDashboard from "@/pages/complaintsAndServices/SupportDashboard";
import TicketWorkspace from "@/pages/complaintsAndServices/TicketWorkspace";
import CustomerVerificationPage from "@/pages/complaintsAndServices/CustomerVerificationPage";
import TechnicianWorkSapce from "@/pages/complaintsAndServices/TechnicianWorkSapce";
import DeliveryConfirmation from "@/pages/complaintsAndServices/DeliveryConfirmation";
import InstallationSchedule from "@/pages/complaintsAndServices/InstallationSchedule";
import FeedbackRatings from "@/pages/complaintsAndServices/FeedbackRatings";

// training management imports
import Trainees from "@/pages/lms/Trainees";
import TrainingModules from "@/pages/lms/TrainingModules";
import QuestionBank from "@/pages/lms/QuestionBank";
import CandidateDashboard from "@/pages/lms/CandidateDashboard";
import ModulePlayer from "@/pages/lms/ModulePlayer";
import QuizRunner from "@/pages/lms/QuizRunner";
import AdminDashboard from "@/pages/lms/AdminDashboard";

import CompanyAdminDashboard from "@/pages/hrms/CompanyAdmin/CompanyAdminDashboard";
import CompanyAdminLayout from "@/pages/hrms/CompanyAdmin/CompanyAdminLayout";
import ManagerLeaves from "@/pages/hrms/Manager/LeavesEmployee";
import PerformanceMetrics from "@/pages/hrms/Manager/PerformanceMetrics";
import RDDashboard from "@/pages/ResearchDevelopment/Dashboard";
import StoreDashboard from "@/pages/store/StoreDashboard";
import StoreOrders from "@/pages/store/StoreOrders";
import { RDProvider } from "@/contexts/RDContext";
import ProductMaster from "@/pages/ResearchDevelopment/ProductMaster";
import DesignApproval from "@/pages/ResearchDevelopment/DesignApproval";
import BOMManagement from "@/pages/ResearchDevelopment/BOMManagement";
import ToolProcess from "@/pages/ResearchDevelopment/ToolProcess";
import Prototype from "@/pages/ResearchDevelopment/Prototype";
import ChangeManagement from "@/pages/ResearchDevelopment/ChangeManagement";
import QualityParameters from "@/pages/ResearchDevelopment/QualityParameters";
import Documentation from "@/pages/ResearchDevelopment/Documentation";

import { PackagingDispatchProvider } from "@/contexts/PackagingDispatchContext";
import PkgDispatchDashboard from "@/pages/packaging-dispatch/Dashboard";
import PackagingQueue from "@/pages/packaging-dispatch/PackagingQueue";
import PackagingJobs from "@/pages/packaging-dispatch/PackagingJobs";
import PkgDispatchPlanning from "@/pages/packaging-dispatch/DispatchPlanning";
import PkgDispatchExecution from "@/pages/packaging-dispatch/DispatchExecution";
import PkgDispatchHistory from "@/pages/packaging-dispatch/DispatchHistory";

import { QCProvider } from "@/contexts/QCContext";
import QCDashboard from "@/pages/quality-control/Dashboard";
import QCInward from "@/pages/quality-control/QCInward";
import QCJobs from "@/pages/quality-control/QCJobs";
import QCInspection from "@/pages/quality-control/QCInspection";

// Marketing Module Imports
import { MarketingProvider } from "@/contexts/MarketingContext";
import MarketingDashboard from "@/pages/marketing/Dashboard";
import MarketingLibrary from "@/pages/marketing/Library";
import UploadContent from "@/pages/marketing/Upload";
import CategoryManagement from "@/pages/marketing/Categories";
import MarketingReports from "@/pages/marketing/Reports";
import AuditLogs from "@/pages/marketing/AuditLogs";
import MarketingNotifications from "@/pages/marketing/Notifications";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        {() => <Login />}
      </Route>

      {/* ========================================== */}
      {/* NEW: PUBLIC CUSTOMER VERIFICATION ROUTE */}
      {/* ========================================== */}
      <Route path="/verify-ticket/:token">
        <CustomerVerificationPage />
      </Route>

      {/* task management routes for production deparment */}
      <Route path="/production/task-management">
        <ProtectedRoute requiredRole="Production Head">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/production/my-task">
        <ProtectedRoute requiredRole={["Production Head", "Production Employee"]}>
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/* HRMS Module Routes - Moved to top to ensure priority and prevent overlap */}
      <Route exact path="/hrms/SuperAdmin/dashboard">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSDashboard />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/employees">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSEmployees />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/employees/profile/:id">
        <ProtectedRoute requiredRole={["HR-Admin", "Company Admin", "Manager"]}>
          <HRMSProfile />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/addUser">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSAddUser />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/attendance-record">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSAttendance />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/attendance-requests">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSAttendanceRequests />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/leave-requests">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSLeaveRequests />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/leave-types">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSLeaveTypes />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/payroll/salary-structure">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSSalaryStructure />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/payroll/run">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPayrollRun />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/payroll/payslips">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPayslips />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/payroll/statutory-report">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSStatutoryReport />
        </ProtectedRoute>
      </Route>

      <Route exact path="/hrms/SuperAdmin/recruitment/job-openings">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSJobOpenings />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/recruitment/candidates">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSCandidates />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/recruitment/pipeline">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSInterviewPipeline />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/holidays">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSHoliday />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/hr-policy">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPolicies />
        </ProtectedRoute>
      </Route>

      {/* System Configuration Routes */}
      <Route exact path="/hrms/SuperAdmin/companies">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSCompany />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/branches">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSBranches />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/departments">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSDepartments />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/SuperAdmin/designations">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSDesignation />
        </ProtectedRoute>
      </Route>

      {/* HRMS Manager Routes */}
      <Route exact path="/hrms/Manager/dashboard">
        <ProtectedRoute requiredRole="Manager">
          <ManagerDashboard />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/employees">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSEmployees />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/employees/profile/:id">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSProfile />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/attendance">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSAttendance />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/holidays">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSHoliday />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/recruitment/job-openings">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSJobOpenings />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/recruitment/candidates">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <HRMSCandidates />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/recruitment/pipeline">
        <ProtectedRoute requiredRole={["Manager", "HR-Admin"]}>
          <ManagerInterviews />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/leaves">
        <ProtectedRoute requiredRole="Manager">
          <ManagerLeaves />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/performance-metrics">
        <ProtectedRoute requiredRole="Manager">
          <PerformanceMetrics />
        </ProtectedRoute>
      </Route>

      {/* Manager Approvals Section */}
      <Route exact path="/hrms/Manager/approvals/leaves">
        <ProtectedRoute requiredRole="Manager">
          <ManagerLeaveRequest />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/approvals/attendance">
        <ProtectedRoute requiredRole="Manager">
          <ManagerAttendanceRequest />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/approvals/overtime">
        <ProtectedRoute requiredRole="Manager">
          <ManagerOverTimeRequest />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/approvals/expense">
        <ProtectedRoute requiredRole="Manager">
          <ManagerExpenseRequest />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/approvals/travel">
        <ProtectedRoute requiredRole="Manager">
          <ManagerTravelRequest />
        </ProtectedRoute>
      </Route>
      <Route exact path="/hrms/Manager/approvals/profile">
        <ProtectedRoute requiredRole="Manager">
          <ManagerProfileRequest />
        </ProtectedRoute>
      </Route>

      {/* Employee Module Routes */}
      <Route exact path="/hrms/Employee/dashboard">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeDashboard />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/profile/personal">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeePersonalInformation />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/profile/documents">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeDocumentUpload />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/profile/org">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeePolicies />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/attendance/mark">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeMarkAttendance />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/attendance/calendar">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeAttendanceCalendar />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/attendance/requests">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeAttendanceRequest />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/leave/balance">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeLeaveBalance />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/leave/apply">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeLeaves />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/payroll/payslips">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeePayslips />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/payroll/structure">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeSalaryStructure />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/expenses/submit">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeExpenses />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/requests/travel">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeTravelRequests />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/requests/resign">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeResignRequest />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/requests/overtime">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeOverTimeRequests />
        </RoleBasedProtectedRoute>
      </Route>
      <Route exact path="/hrms/Employee/requests/profile-update">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeProfileUpdateRequest />
        </RoleBasedProtectedRoute>
      </Route>


      <Route path="/hrms/CompanyAdmin/:rest*">
        <ProtectedRoute requiredRole="Company Admin">
          <Switch>
            <Route exact path="/hrms/CompanyAdmin/dashboard" component={CompanyAdminDashboard} />
            <Route exact path="/hrms/CompanyAdmin/employees" component={HRMSEmployees} />
            <Route exact path="/hrms/CompanyAdmin/companies" component={HRMSCompany} />
            <Route exact path="/hrms/CompanyAdmin/branches" component={HRMSBranches} />
            <Route exact path="/hrms/CompanyAdmin/departments" component={HRMSDepartments} />
            <Route exact path="/hrms/CompanyAdmin/designations" component={HRMSDesignation} />
            <Route exact path="/hrms/CompanyAdmin/user-management" component={RolePermissionManagement} />
            <Route exact path="/hrms/CompanyAdmin/task-management" component={HRMSTaskManagement} />
            <Route component={NotFound} />
          </Switch>
        </ProtectedRoute>
      </Route>

      {/* R&D Module Routes */}
      <Route path="/r&d/dashboard">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <RDDashboard />
        </ProtectedRoute>
      </Route>

      {/* support management route*/}
      <Route path="/complaints/dashboard">
        <ProtectedRoute requiredRole="Complaint Management Head">
          <SupportDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/complaints/deal-verifications">
        <ProtectedRoute requiredRole={["Complaint Management Head", "Complaint Management Employee"]}>
          <DealVerifications />
        </ProtectedRoute>
      </Route>
      <Route path="/complaints/support">
        <ProtectedRoute requiredRole="Complaint Management Head">
          <TicketWorkspace />
        </ProtectedRoute>
      </Route>

      <Route exact path="/complaints/service">
        <RoleBasedProtectedRoute requiredRole="Complaint Management Employee">
          <TechnicianWorkSapce />
        </RoleBasedProtectedRoute>
      </Route>
      <Route path="/complaints/delivery-confirmation">
        <ProtectedRoute requiredRole={["Complaint Management Head", "Complaint Management Employee"]}>
          <DeliveryConfirmation />
        </ProtectedRoute>
      </Route>
      <Route path="/complaints/installation-schedule">
        <ProtectedRoute requiredRole={["Complaint Management Head", "Complaint Management Employee"]}>
          <InstallationSchedule />
        </ProtectedRoute>
      </Route>
      <Route path="/complaints/feedback-ratings">
        <ProtectedRoute requiredRole={["Complaint Management Head", "Complaint Management Employee"]}>
          <FeedbackRatings />
        </ProtectedRoute>
      </Route>

      <Route path="/r&d/product-master">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <ProductMaster />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/design-approval">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <DesignApproval />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/bom-management">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <BOMManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/tool-process">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <ToolProcess />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/prototype">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <Prototype />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/change-management">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <ChangeManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/quality-parameters">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <QualityParameters />
        </ProtectedRoute>
      </Route>
      <Route path="/r&d/documentation">
        <ProtectedRoute requiredRole={["Research & Development Head", "Research Development Employee"]}>
          <Documentation />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <RoleBasedDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/manufacturing">
        <RoleBasedProtectedRoute>
          <Manufacturing />
        </RoleBasedProtectedRoute>
      </Route>

      {/* Production Module Routes - Must come before specific routes */}
      <Route path="/production/:rest*">
        <ProtectedRoute>
          <ProductionModule />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/production/:rest*">
        <ProtectedRoute requiredRole="Super Admin">
          <ProductionModule />
        </ProtectedRoute>
      </Route>

      <Route path="/production/history">
        <ProtectedRoute requiredRole="Production">
          <ProductionHistoryPage />
        </ProtectedRoute>
      </Route>
      {/* Sales Submodules - specific routes first */}
      <Route path="/sales/orders">
        <ProtectedRoute>
          <MyOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/payment-requests">
        <ProtectedRoute>
          <PaymentRequests />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/leads">
        <ProtectedRoute>
          <Leads />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/quotation">
        <ProtectedRoute>
          <Quotation />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/my-customers">
        <ProtectedRoute>
          <MyCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/my-deliveries">
        <ProtectedRoute>
          <MyDeliveries />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/my-invoices">
        <ProtectedRoute>
          <MyInvoices />
        </ProtectedRoute>
      </Route>

      <Route path="/sales/returns">
        <ProtectedRoute>
          <Returns />
        </ProtectedRoute>
      </Route>

      <Route path="/sales/damages">
        <ProtectedRoute>
          <Damages />
        </ProtectedRoute>
      </Route>

      {/* Main Sales route */}
      <Route path="/sales">
        <ProtectedRoute>
          <Sales />
        </ProtectedRoute>
      </Route>

      {/* Sales Dashboard route */}
      <Route path="/sales-dashboard">
        <ProtectedRoute>
          <SalesDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/accounts">
        <ProtectedRoute>
          <Accounts />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/payment-verifications">
        <ProtectedRoute>
          <PaymentVerifications />
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <RoleBasedProtectedRoute>
          <ModernInventoryUI />
        </RoleBasedProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      </Route>
      <Route path="/purchases">
        <ProtectedRoute>
          <Purchases />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/companies">
        <ProtectedRoute>
          <Companies />
        </ProtectedRoute>
      </Route>
      <Route path="/role-permission-management">
        <ProtectedRoute>
          <RolePermissionManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin-dashboard">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/orders">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/sales">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminSales />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/customers">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/companies">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminCompanies />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/dispatches">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminDispatches />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/accounts">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminAccounts />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/inventory">
        <ProtectedRoute requiredRole="Super Admin">
          <ModernInventoryUI />
        </ProtectedRoute>
      </Route>

      <Route path="/super-admin/settings">
        <ProtectedRoute requiredRole="Super Admin">
          <SuperAdminSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      </Route>

      {/* Role-specific Dashboard routes */}

      <Route path="/packing-dashboard">
        <ProtectedRoute requiredRole="Packing">
          <PackingDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/packing/packing-sheet">
        <ProtectedRoute requiredRole="Packing">
          <PackingSheet />
        </ProtectedRoute>
      </Route>
      <Route path="/packing/history">
        <ProtectedRoute requiredRole="Packing">
          <PackingHistory />
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch-dashboard">
        <ProtectedRoute requiredRole="Dispatch">
          <DispatchDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/delivery-challan">
        <ProtectedRoute requiredRole="Dispatch">
          <DeliveryChallan />
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/history">
        <ProtectedRoute requiredRole="Dispatch">
          <DispatchHistory />
        </ProtectedRoute>
      </Route>

      {/* Packaging & Dispatch Module Routes */}
      <Route path="/packaging-dispatch/dashboard">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PkgDispatchDashboard /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/packaging/queue">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PackagingQueue /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/packaging/jobs">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PackagingJobs /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/planning">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PkgDispatchPlanning /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/active">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PkgDispatchExecution /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/completed">
        <ProtectedRoute requiredRole={["Dispatch", "Dispatch Head", "Dispatch Employee"]}>
          <PackagingDispatchProvider><PkgDispatchHistory /></PackagingDispatchProvider>
        </ProtectedRoute>
      </Route>

      {/* Quality Control Routes */}
      <Route path="/qc/dashboard">
        <ProtectedRoute requiredRole={["QC Head", "QC Employee"]}>
          <QCProvider><QCDashboard /></QCProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/qc/inward">
        <ProtectedRoute requiredRole={["QC Head", "QC Employee"]}>
          <QCProvider><QCInward /></QCProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/qc/jobs/:id">
        <ProtectedRoute requiredRole={["QC Head", "QC Employee"]}>
          <QCProvider><QCInspection /></QCProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/qc/jobs">
        <ProtectedRoute requiredRole={["QC Head", "QC Employee"]}>
          <QCProvider><QCJobs /></QCProvider>
        </ProtectedRoute>
      </Route>


      <Route path="/accounts-dashboard">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/chart-of-accounts">
        <ProtectedRoute requiredRole="Accounts">
          <ChartOfAccounts />
        </ProtectedRoute>
      </Route>
      {/* Sales Account Module (New Routes) */}
      <Route path="/accounts/sales/orders">
        <ProtectedRoute requiredRole="Accounts">
          <SalesOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/order-tracking">
        <RoleBasedProtectedRoute allowedRoles={['Superadmin', 'Accounts']}>
          <SalesOrderTracking />
        </RoleBasedProtectedRoute>
      </Route>
      <Route path="/accounts/sales/noc-request">
        <RoleBasedProtectedRoute allowedRoles={['Superadmin', 'Accounts']}>
          <NocRequest />
        </RoleBasedProtectedRoute>
      </Route>
      <Route path="/accounts/sales/customers">
        <ProtectedRoute requiredRole="Accounts">
          <CustomerMaster />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/invoices">
        <ProtectedRoute requiredRole="Accounts">
          <SalesInvoices />
        </ProtectedRoute>
      </Route>

      <Route path="/accounts/sales">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsSales />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/returns">
        <ProtectedRoute requiredRole="Accounts">
          <SalesReturns />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/payments">
        <ProtectedRoute requiredRole="Accounts">
          <CustomerPayments />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/ageing">
        <ProtectedRoute requiredRole="Accounts">
          <ReceivableAgeing />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/sales/reports">
        <ProtectedRoute requiredRole="Accounts">
          <SalesReports />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsPurchases />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/vendors">
        <ProtectedRoute requiredRole="Accounts">
          <VendorMaster />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/requests">
        <ProtectedRoute requiredRole="Accounts">
          <PurchaseRequest />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/invoices">
        <ProtectedRoute requiredRole="Accounts">
          <PurchaseInvoices />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/returns">
        <ProtectedRoute requiredRole="Accounts">
          <PurchaseReturns />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/payments">
        <ProtectedRoute requiredRole="Accounts">
          <VendorPayments />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/ageing">
        <ProtectedRoute requiredRole="Accounts">
          <PayableAgeing />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/purchases/reports">
        <ProtectedRoute requiredRole="Accounts">
          <PurchaseReports />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/gst-tds">
        <ProtectedRoute requiredRole="Accounts">
          <GSTAndTDS />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/damage-expiry">
        <ProtectedRoute requiredRole="Accounts">
          <DamageAndExpiry />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/salesman-settlement">
        <ProtectedRoute requiredRole="Accounts">
          <SalesmanSettlement />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/bank-cash">
        <ProtectedRoute requiredRole="Accounts">
          <BankAndCash />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/ledger">
        <ProtectedRoute requiredRole="Accounts">
          <LedgerRecord />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/inter-unit">
        <ProtectedRoute requiredRole="Accounts">
          <InterUnit />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/expenses">
        <ProtectedRoute requiredRole="Accounts">
          <Expenses />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/financial-summary">
        <ProtectedRoute requiredRole="Accounts">
          <FinancialSummary />
        </ProtectedRoute>
      </Route>

      {/* Store Module Routes */}
      <Route path="/store-dashboard">
        <ProtectedRoute requiredRole={["Store Head", "Store Employee"]}>
          <StoreDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/store/inventory">
        <ProtectedRoute requiredRole={["Store Head", "Store Employee"]}>
          <ModernInventoryUI />
        </ProtectedRoute>
      </Route>
      <Route path="/store/orders">
        <ProtectedRoute requiredRole={["Store Head", "Store Employee"]}>
          <StoreOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/store/purchases/requests">
        <ProtectedRoute requiredRole={["Store Head", "Store Employee"]}>
          <PurchaseRequest />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/reports">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsReports />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/settings">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/payment-reminders">
        <ProtectedRoute requiredRole="Accounts">
          <PaymentReminders />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/lead-payments">
        <ProtectedRoute requiredRole="Accounts">
          <LeadPayments />
        </ProtectedRoute>
      </Route>


      {/* HRMS Module Routes */}
      <Route path="/hrms/dashboard">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/employees">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSEmployees />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/attendance">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSAttendance />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/payroll">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSSalaryStructure />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/payroll/run">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPayrollRun />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/payslips">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPayslips />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/recruitment">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSJobOpenings />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/recruitment/candidates">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSCandidates />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/recruitment/pipeline">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSInterviewPipeline />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/holidays">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSHoliday />
        </ProtectedRoute>
      </Route>
      <Route path="/hrms/hr-policy">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSPolicies />
        </ProtectedRoute>
      </Route>
      {/* task management route for HR-Admin */}
      <Route path="/hrms/SuperAdmin/task-management">
        <ProtectedRoute requiredRole="HR-Admin">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>

      {/* Employee My task Route */}
      <Route exact path="/hrms/Employee/my-task">
        <RoleBasedProtectedRoute requiredRole="Employee">
          <EmployeeTasks />
        </RoleBasedProtectedRoute>
      </Route>

      

      {/* task management and my task routes for packing department */}
      <Route path="/packing/task-management">
        <ProtectedRoute requiredRole="Packing Head">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/packing/my-task">
        <ProtectedRoute requiredRole={["Packing Head", "Packing Employee"]}>
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/* task management and my task routes for dispatch department */}
      <Route path="/dispatch/task-management">
        <ProtectedRoute requiredRole="Dispatch Head">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/dispatch/my-task">
        <ProtectedRoute requiredRole={["Dispatch Head", "Dispatch Employee"]}>
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/* task management and my task routes for sales department */}
      <Route path="/sales/task-management">
        <ProtectedRoute requiredRole="Sales Head">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/sales/my-task">
        <ProtectedRoute requiredRole={["Sales Head", "Sales Employee"]}>
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/* task management and my task routes for accounts department */}
      <Route path="/accounts/task-management">
        <ProtectedRoute requiredRole="Accounts Head">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/accounts/my-task">
        <ProtectedRoute requiredRole={["Accounts Head", "Account Employee"]}>
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/*  my task routes for manager */}

      <Route path="/hrms/Manager/my-task">
        <ProtectedRoute requiredRole="Manager">
          <EmployeeTasks />
        </ProtectedRoute>
      </Route>

      {/* task management route for company admin */}

      <Route path="/hrms/CompanyAdmin/task-management">
        <ProtectedRoute requiredRole="Company Admin">
          <HRMSTaskManagement />
        </ProtectedRoute>
      </Route>

      {/* to be removed only testing purpose -- training modules routes */}
      <Route path="/lms/dashboard">
        <ProtectedRoute requiredRole={["HR-Admin", "Accounts Head", "Sales Head", "Production Head", "Packing Head", "Dispatch Head"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/lms/trainees">
        <ProtectedRoute requiredRole={["HR-Admin", "Accounts Head", "Sales Head", "Production Head", "Packing Head", "Dispatch Head"]}>
          <Trainees />
        </ProtectedRoute>
      </Route>
      <Route path="/lms/training-modules">
        <ProtectedRoute requiredRole={["HR-Admin", "Accounts Head", "Sales Head", "Production Head", "Packing Head", "Dispatch Head"]}>
          <TrainingModules />
        </ProtectedRoute>
      </Route>
      <Route path="/lms/question-bank/:moduleId?">
        <ProtectedRoute requiredRole={["HR-Admin", "Accounts Head", "Sales Head", "Production Head", "Packing Head", "Dispatch Head"]}>
          <QuestionBank />
        </ProtectedRoute>
      </Route>
      {/* 1. Trainee Dashboard */}
      <Route path="/lms/training">
        <ProtectedRoute requiredRole={["Dispatch Employee", "Packing Employee", "Production Employee", "Sales Employee", "Account Employee"]}>
          <CandidateDashboard />
        </ProtectedRoute>
      </Route>

      {/* 2. The Classroom (Watching Videos/PDFs) */}
      <Route path="/lms/my-training/:moduleId/learn">
        <ProtectedRoute requiredRole={["Dispatch Employee", "Packing Employee", "Production Employee", "Sales Employee", "Account Employee"]}>
          <ModulePlayer />
        </ProtectedRoute>
      </Route>

      {/* 3. The Exam Room (Taking the Test) */}
      <Route path="/lms/my-training/:moduleId/quiz">
        <ProtectedRoute requiredRole={["Dispatch Employee", "Packing Employee", "Production Employee", "Sales Employee", "Account Employee"]}>
          <QuizRunner />
        </ProtectedRoute>
      </Route>

      {/* Marketing Module Routes */}
      <Route path="/marketing/dashboard">
        <ProtectedRoute requiredRole={['Marketing Head', 'Sales', 'Sales Employee', 'Sales Head']}>
          <MarketingProvider><MarketingDashboard /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/library">
        <ProtectedRoute requiredRole={['Marketing Head', 'Sales', 'Sales Employee', 'Sales Head']}>
          <MarketingProvider><MarketingLibrary /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/upload">
        <ProtectedRoute requiredRole="Marketing Head">
          <MarketingProvider><UploadContent /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/categories">
        <ProtectedRoute requiredRole="Marketing Head">
          <MarketingProvider><CategoryManagement /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/reports">
        <ProtectedRoute requiredRole="Marketing Head">
          <MarketingProvider><MarketingReports /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/audit-logs">
        <ProtectedRoute requiredRole="Marketing Head">
          <MarketingProvider><AuditLogs /></MarketingProvider>
        </ProtectedRoute>
      </Route>
      <Route path="/marketing/notifications">
        <ProtectedRoute requiredRole="Marketing Head">
          <MarketingProvider><MarketingNotifications /></MarketingProvider>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RDProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Router />
            </BrowserRouter>
          </TooltipProvider>
        </RDProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

