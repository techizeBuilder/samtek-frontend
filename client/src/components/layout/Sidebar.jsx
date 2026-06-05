import React, { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Cog, Truck, TrendingUp, Calculator, Package, Users, Handshake, Receipt,
  Settings, LogOut, Factory, Shield, Building2, ChevronDown, ChevronRight, Building,
  PieChart, ShoppingCart, CreditCard, RotateCcw, Calendar, Play, FileText, CheckCircle,
  BarChart, Clock, AlertTriangle, History, UserCheck, Target, Star, MessageSquare, Briefcase,
  ClipboardList, CalendarCheck, CheckSquare, UserCircle, Award, Layers, Beaker, ShieldAlert,
  FolderOpen, Upload, Folder, Share2, Pen, User, Bell
} from 'lucide-react';

// ============================================================
// MENU ITEM DEFINITIONS
// ============================================================
const superAdminMenuItems = [
  { label: 'Super Admin Dashboard', path: '/super-admin-dashboard', icon: Shield, module: 'dashboard' },
  { label: 'Orders', path: '/super-admin/orders', icon: Receipt, module: 'orders' },
  { label: 'Sales', path: '/super-admin/sales', icon: TrendingUp, module: 'sales' },
  // { label: 'Dispatches', path: '/super-admin/dispatches', icon: Truck, module: 'dispatches' },
  // { label: 'Accounts', path: '/super-admin/accounts', icon: Calculator, module: 'accounts' },
  { label: 'Inventory', path: '/super-admin/inventory', icon: Package, module: 'inventory' },
  { label: 'Customers', path: '/super-admin/customers', icon: Users, module: 'customers' },
  { label: 'Companies', path: '/super-admin/companies', icon: Building2, module: 'companies' },
  { label: 'Role & Permissions', path: '/role-permission-management', icon: Shield, module: 'permissions' },
  { label: 'Settings', path: '/super-admin/settings', icon: Settings, module: 'settings' },
];

const productionMenuItems = [
  { label: 'Dashboard', path: '/production/dashboard', icon: Factory, module: 'production' },
  { label: 'Task Management', path: '/production/task-management', icon: CheckSquare, module: 'production' },
  { label: 'My Task', path: '/production/my-task', icon: CheckSquare, module: 'production' },
  { label: 'Orders', path: '/production/orders', icon: ClipboardList, module: 'production' },
  { label: 'Work Planning', path: '/production/work-planning', icon: Calendar, module: 'production' },
  { label: 'Process & QC', path: '/production/process-execution', icon: Cog, module: 'production' },
  { label: 'Job Cards', path: '/production/job-cards', icon: FileText, module: 'production' },
  { label: 'Manpower', path: '/production/manpower', icon: Users, module: 'production' },
  { label: 'Production Sheet', path: '/production/production-sheet', icon: Clock, module: 'production', feature: 'productionSheet' },
  { label: 'Production Reports', path: '/production/reports', icon: BarChart, module: 'production', feature: 'productionReports' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'production',
    feature: 'lms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'lms' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'lms' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'lms' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'lms' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'production', feature: 'traineeDashboard' },
];

const packingMenuItems = [
  { label: 'Dashboard', path: '/packing-dashboard', icon: LayoutDashboard, module: 'packing', feature: 'dashboard' },
  { label: 'Task Management', path: '/packing/task-management', icon: CheckSquare, module: 'packing' },
  { label: 'My Task', path: '/packing/my-task', icon: CheckSquare, module: 'packing' },
  { label: 'Packing Sheet', path: '/packing/packing-sheet', icon: FileText, module: 'packing', feature: 'packingSheet' },
  { label: 'Packing History', path: '/packing/history', icon: BarChart, module: 'packing', feature: 'packingHistory' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'packing',
    feature: 'lms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'lms' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'lms' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'lms' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'lms' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'packing', feature: 'traineeDashboard' },
];

const dispatchMenuItems = [
  { label: 'Dashboard', path: '/packaging-dispatch/dashboard', icon: LayoutDashboard, module: 'dispatches' },
  { label: 'Task Management', path: '/dispatch/task-management', icon: CheckSquare, module: 'dispatches' },
  { label: 'My Task', path: '/dispatch/my-task', icon: CheckSquare, module: 'dispatches' },
  { label: 'Delivery Challan', path: '/dispatch/delivery-challan', icon: FileText, module: 'dispatches' },
  { label: 'Packaging Queue', path: '/packaging/queue', icon: Package, module: 'dispatches' },
  { label: 'Packaging Jobs', path: '/packaging/jobs', icon: ClipboardList, module: 'dispatches' },
  { label: 'Dispatch Planning', path: '/dispatch/planning', icon: Truck, module: 'dispatches' },
  { label: 'Active Dispatches', path: '/dispatch/active', icon: CheckSquare, module: 'dispatches' },
  { label: 'Dispatch History', path: '/dispatch/completed', icon: BarChart, module: 'dispatches', feature: 'dispatchHistory' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'dispatches',
    feature: 'lms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'lms' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'lms' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'lms' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'lms' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'dispatches', feature: 'traineeDashboard' },
];

const salesMenuItems = [
  { label: 'Dashboard', path: '/sales-dashboard', icon: LayoutDashboard, module: 'sales', feature: 'dashboard' },
  { label: 'Leads', path: '/sales/leads', icon: Target, module: 'sales' },
  { label: 'Payment Requests', path: '/sales/payment-requests', icon: Receipt, module: 'sales' },
  { label: 'My Customers', path: '/sales/my-customers', icon: Users, module: 'sales', feature: 'myCustomers' },
  { label: 'My Orders', path: '/sales/orders', icon: ShoppingCart, module: 'sales', feature: 'orders' },
  { label: 'My Dispatches', path: '/sales/my-deliveries', icon: Truck, module: 'sales', feature: 'myDeliveries' },
  { label: 'My Payments', path: '/sales/my-invoices', icon: CreditCard, module: 'sales', feature: 'myInvoices' },
  { label: 'Returns', path: '/sales/returns', icon: RotateCcw, module: 'sales', feature: 'returns' },
  { label: 'Damages', path: '/sales/damages', icon: AlertTriangle, module: 'sales', feature: 'damages' },
  { label: 'Customers', path: '/customers', icon: Users, module: 'customers' },
  { label: 'Marketing Library', path: '/marketing/library', icon: Share2, module: 'marketing' },
  { label: 'Task Management', path: '/sales/task-management', icon: CheckSquare, module: 'sales' },
  { label: 'My Task', path: '/sales/my-task', icon: CheckSquare, module: 'sales' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'sales',
    feature: 'lms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'lms' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'lms' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'lms' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'lms' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'sales', feature: 'traineeDashboard' },
];

const accountsMenuItems = [
  { label: 'Dashboard', path: '/accounts-dashboard', icon: LayoutDashboard, module: 'accounts', feature: 'dashboard' },
  { label: 'Payment Verifications', path: '/accounts/payment-verifications', icon: CheckCircle, module: 'accounts' },
  { label: 'Task Management', path: '/accounts/task-management', icon: CheckSquare, module: 'accounts' },
  { label: 'My Task', path: '/accounts/my-task', icon: CheckSquare, module: 'accounts' },
  {
    label: 'Sales',
    path: '/accounts/sales',
    icon: TrendingUp,
    module: 'accounts',
    feature: 'sales',
    submodules: [
      { label: 'Sales Order', path: '/accounts/sales/orders', feature: 'sales' },
      { label: 'Customer Master', path: '/accounts/sales/customers', feature: 'sales' },
      { label: 'Sales Invoice', path: '/accounts/sales/invoices', feature: 'sales' },
      { label: 'Sales Return', path: '/accounts/sales/returns', feature: 'sales' },
      { label: 'Customer Payment', path: '/accounts/sales/payments', feature: 'sales' },
      { label: 'Sales Order Tracking', path: '/accounts/sales/order-tracking', feature: 'sales' },
      { label: 'NOC Requests', path: '/accounts/sales/noc-request', feature: 'sales' },
      { label: 'Receivable Ageing', path: '/accounts/sales/ageing', feature: 'sales' },
      { label: 'Sales Reports', path: '/accounts/sales/reports', feature: 'sales' }
    ]
  },
  {
    label: 'Purchases',
    path: '/accounts/purchases',
    icon: ShoppingCart,
    module: 'accounts',
    feature: 'purchases',
    submodules: [
      { label: 'Vendor Master', path: '/accounts/purchases/vendors', feature: 'purchases' },
      { label: 'Purchase Request', path: '/accounts/purchases/requests', feature: 'purchases' },
      { label: 'Purchase Invoice', path: '/accounts/purchases/invoices', feature: 'purchases' },
      { label: 'Purchase Return', path: '/accounts/purchases/returns', feature: 'purchases' },
      { label: 'Vendor Payment', path: '/accounts/purchases/payments', feature: 'purchases' },
      { label: 'Payable Ageing', path: '/accounts/purchases/ageing', feature: 'purchases' },
      { label: 'Purchase Reports', path: '/accounts/purchases/reports', feature: 'purchases' }
    ]
  },
  { label: 'GST & TDS', path: '/accounts/gst-tds', icon: FileText, module: 'accounts', feature: 'gstAndTds' },
  { label: 'Expenses', path: '/accounts/expenses', icon: Receipt, module: 'accounts', feature: 'expenses' },
  { label: 'Salesman Settlement', path: '/accounts/salesman-settlement', icon: Handshake, module: 'accounts', feature: 'salesmanSettlement' },
  { label: 'Bank & Cash', path: '/accounts/bank-cash', icon: CreditCard, module: 'accounts', feature: 'bankAndCash' },
  { label: 'Ledger', path: '/accounts/ledger', icon: History, module: 'accounts', feature: 'bankAndCash' },
  { label: 'Reports', path: '/accounts/financial-summary', icon: BarChart, module: 'accounts', feature: 'reports' },
  { label: 'Payment Reminders', path: '/accounts/payment-reminders', icon: Bell, module: 'accounts', feature: 'bankAndCash' },
  { label: 'Lead Payments', path: '/accounts/lead-payments', icon: Target, module: 'accounts' },
  { label: 'Settings', path: '/accounts/settings', icon: Settings, module: 'accounts', feature: 'settings' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'accounts',
    feature: 'lms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'lms' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'lms' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'lms' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'lms' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'accounts', feature: 'traineeDashboard' },
];

const hrAdminMenuItems = [
  { label: 'Dashboard', path: '/hrms/SuperAdmin/dashboard', icon: LayoutDashboard, module: 'hrms' },
  {
    label: 'System Configuration',
    path: '/hrms/SuperAdmin/system-configuration',
    icon: Settings,
    module: 'hrms',
    submodules: [
      { label: 'Companies', path: '/hrms/SuperAdmin/companies', feature: 'companies' },
      { label: 'Branches', path: '/hrms/SuperAdmin/branches', feature: 'branches' },
      { label: 'Departments', path: '/hrms/SuperAdmin/departments', feature: 'departments' },
      { label: 'Designations', path: '/hrms/SuperAdmin/designations', feature: 'designations' }
    ]
  },
  { label: 'Employee Management', path: '/hrms/SuperAdmin/employees', icon: Users, module: 'hrms' },
  {
    label: 'Leave Management',
    path: '/hrms/SuperAdmin/leave-management',
    icon: CalendarCheck,
    module: 'hrms',
    submodules: [
      { label: 'Leave Requests', path: '/hrms/SuperAdmin/leave-requests', feature: 'leaveRequests' },
      { label: 'Leave Types & Rules', path: '/hrms/SuperAdmin/leave-types', feature: 'leaveTypes' }
    ]
  },
  {
    label: 'Attendance',
    path: '/hrms/SuperAdmin/attendance-module',
    icon: Clock,
    module: 'hrms',
    submodules: [
      { label: 'Attendance Record', path: '/hrms/SuperAdmin/attendance-record', feature: 'attendanceRecord' },
      { label: 'Attendance Requests', path: '/hrms/SuperAdmin/attendance-requests', feature: 'attendanceRequests' }
    ]
  },
  {
    label: 'Payroll',
    path: '/hrms/SuperAdmin/payroll',
    icon: Calculator,
    module: 'hrms',
    submodules: [
      { label: 'Salary Structure', path: '/hrms/SuperAdmin/payroll/salary-structure', feature: 'salaryStructure' },
      { label: 'Payroll Run', path: '/hrms/SuperAdmin/payroll/run', feature: 'payrollRun' },
      { label: 'Payslips', path: '/hrms/SuperAdmin/payroll/payslips', feature: 'payslips' },
      { label: 'Statutory Reports', path: '/hrms/SuperAdmin/payroll/statutory-report', feature: 'statutoryReport' }
    ]
  },
  {
    label: 'Recruitment',
    path: '/hrms/SuperAdmin/recruitment',
    icon: Handshake,
    module: 'hrms',
    submodules: [
      { label: 'Job Opening', path: '/hrms/SuperAdmin/recruitment/job-openings', feature: 'jobOpenings' },
      { label: 'Candidate', path: '/hrms/SuperAdmin/recruitment/candidates', feature: 'candidates' },
      { label: 'Interview Pipeline', path: '/hrms/SuperAdmin/recruitment/pipeline', feature: 'interviewPipeline' }
    ]
  },
  { label: 'Holidays', path: '/hrms/SuperAdmin/holidays', icon: Calendar, module: 'hrms' },
  { label: 'HR Policy', path: '/hrms/SuperAdmin/hr-policy', icon: Shield, module: 'hrms' },
  { label: 'Task Management', path: '/hrms/SuperAdmin/task-management', icon: CheckSquare, module: 'hrms' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'hrms',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'dashboard' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'trainees' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'trainingModules' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'questionBank' },
    ]
  },
];

const managerMenuItems = [
  { label: 'Dashboard', path: '/hrms/Manager/dashboard', icon: LayoutDashboard, module: 'hrms' },
  { label: 'Task Management', path: '/hrms/Manager/task-management', icon: CheckSquare, module: 'hrms' },
  { label: 'My Task', path: '/hrms/Manager/my-task', icon: CheckSquare, module: 'hrms' },
  {
    label: 'Team',
    path: '/hrms/Manager/team',
    icon: Users,
    module: 'hrms',
    submodules: [
      { label: 'Team Members', path: '/hrms/Manager/employees', feature: 'teamMembers' },
      { label: 'Team Attendance', path: '/hrms/Manager/attendance', feature: 'teamAttendance' }
    ]
  },
  { label: 'Holiday Calendar', path: '/hrms/Manager/holidays', icon: Calendar, module: 'hrms' },
  { label: 'Leaves - Employee', path: '/hrms/Manager/leaves', icon: CalendarCheck, module: 'hrms' },
  { label: 'Performance Metrics', path: '/hrms/Manager/performance-metrics', icon: BarChart, module: 'hrms' },
  {
    label: 'Approvals',
    path: '/hrms/Manager/approvals',
    icon: CheckSquare,
    module: 'hrms',
    submodules: [
      { label: 'Leave Requests', path: '/hrms/Manager/approvals/leaves', feature: 'leaveRequests' },
      { label: 'Attendance Corrections', path: '/hrms/Manager/approvals/attendance', feature: 'attendanceCorrections' },
      { label: 'Overtime Requests', path: '/hrms/Manager/approvals/overtime', feature: 'overtimeRequests' },
      { label: 'Expense / Reimbursement', path: '/hrms/Manager/approvals/expense', feature: 'expenseRequests' },
      { label: 'Travel Requests', path: '/hrms/Manager/approvals/travel', feature: 'travelRequests' },
      { label: 'Profile Update Requests', path: '/hrms/Manager/approvals/profile', feature: 'profileRequests' }
    ]
  },
  {
    label: 'Recruitment',
    path: '/hrms/Manager/recruitment',
    icon: Briefcase,
    module: 'hrms',
    submodules: [
      { label: 'Interview Feedback', path: '/hrms/Manager/recruitment/pipeline', feature: 'interviewFeedback' },
    ]
  }
];

const employeeMenuItems = [
  { label: 'Dashboard', path: '/hrms/Employee/dashboard', icon: LayoutDashboard, module: 'hrms' },
  { label: 'My Task', path: '/hrms/Employee/my-task', icon: CheckSquare, module: 'hrms' },
  {
    label: 'My Profile',
    path: '/hrms/Employee/profile',
    icon: UserCircle,
    module: 'hrms',
    submodules: [
      { label: 'Personal Information', path: '/hrms/Employee/profile/personal', feature: 'profile' },
      { label: 'Document Upload', path: '/hrms/Employee/profile/documents', feature: 'profile' },
      { label: 'Organizational Info', path: '/hrms/Employee/profile/org', feature: 'profile' }
    ]
  },
  {
    label: 'Attendance',
    path: '/hrms/Employee/attendance',
    icon: Clock,
    module: 'hrms',
    submodules: [
      { label: 'Mark Attendance', path: '/hrms/Employee/attendance/mark', feature: 'attendance' },
      { label: 'Attendance Calendar', path: '/hrms/Employee/attendance/calendar', feature: 'attendance' },
      { label: 'Attendance Requests', path: '/hrms/Employee/attendance/requests', feature: 'attendance' }
    ]
  },
  {
    label: 'Leave',
    path: '/hrms/Employee/leave',
    icon: Calendar,
    module: 'hrms',
    submodules: [
      { label: 'Leave Balance', path: '/hrms/Employee/leave/balance', feature: 'leave' },
      { label: 'Apply Leave', path: '/hrms/Employee/leave/apply', feature: 'leave' }
    ]
  },
  {
    label: 'Payroll',
    path: '/hrms/Employee/payroll',
    icon: Calculator,
    module: 'hrms',
    submodules: [
      { label: 'Payslips', path: '/hrms/Employee/payroll/payslips', feature: 'payroll' },
      { label: 'Salary Structure', path: '/hrms/Employee/payroll/structure', feature: 'payroll' }
    ]
  },
  {
    label: 'Expenses',
    path: '/hrms/Employee/expenses',
    icon: Receipt,
    module: 'hrms',
    submodules: [
      { label: 'Submit Expense', path: '/hrms/Employee/expenses/submit', feature: 'expenses' }
    ]
  },
  {
    label: 'Requests',
    path: '/hrms/Employee/requests',
    icon: ClipboardList,
    module: 'hrms',
    submodules: [
      { label: 'My Travel Requests', path: '/hrms/Employee/requests/travel', feature: 'requests' },
      { label: 'My Resign Requests', path: '/hrms/Employee/requests/resign', feature: 'requests' },
      { label: 'Overtime Requests', path: '/hrms/Employee/requests/overtime', feature: 'requests' },
      { label: 'Profile Update Requests', path: '/hrms/Employee/requests/profile-update', feature: 'requests' }
    ]
  },
];

const companyAdminMenuItems = [
  { label: 'Dashboard', path: '/hrms/CompanyAdmin/dashboard', icon: LayoutDashboard, module: 'hrms' },
  { label: 'Employee Management', path: '/hrms/CompanyAdmin/employees', icon: Users, module: 'hrms' },
  { label: 'My Company', path: '/hrms/CompanyAdmin/companies', icon: Building2, module: 'hrms' },
  { label: 'Operating Units', path: '/hrms/CompanyAdmin/branches', icon: Building, module: 'hrms' },
  { label: 'Departments', path: '/hrms/CompanyAdmin/departments', icon: Users, module: 'hrms' },
  { label: 'Designations', path: '/hrms/CompanyAdmin/designations', icon: Briefcase, module: 'hrms' },
  { label: 'Roles & Permissions', path: '/hrms/CompanyAdmin/user-management', icon: Shield, module: 'hrms' },
  { label: 'Task Management', path: '/hrms/CompanyAdmin/task-management', icon: CheckSquare, module: 'hrms' }
];

const rdMenuItems = [
  { label: 'Dashboard', path: '/r&d/dashboard', icon: LayoutDashboard, module: 'rnd' },
  { label: 'Product Master', path: '/r&d/product-master', icon: Package, module: 'rnd' },
  { label: 'Design Approval', path: '/r&d/design-approval', icon: CheckCircle, module: 'rnd' },
  { label: 'BOM Management', path: '/r&d/bom-management', icon: ClipboardList, module: 'rnd' },
  { label: 'Tool & Process', path: '/r&d/tool-process', icon: Cog, module: 'rnd' },
  { label: 'Prototype', path: '/r&d/prototype', icon: Beaker, module: 'rnd' },
  { label: 'Change Management', path: '/r&d/change-management', icon: AlertTriangle, module: 'rnd' },
  { label: 'Quality Parameters', path: '/r&d/quality-parameters', icon: ShieldAlert, module: 'rnd' },
  { label: 'Documentation', path: '/r&d/documentation', icon: FolderOpen, module: 'rnd' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'rnd',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'dashboard' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'trainees' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'trainingModules' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'questionBank' },
    ]
  },
  { label: 'Task Management', path: '/r&d/task-management', icon: CheckSquare, module: 'rnd' },
  { label: 'My Task', path: '/r&d/my-task', icon: CheckSquare, module: 'rnd' },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'rnd', feature: 'traineeDashboard' },
];

const complaintHeadMenuItems = [
  { label: 'Dashboard', path: '/complaints/dashboard', icon: LayoutDashboard, module: 'complaints' },
  { label: 'Support Management', path: '/complaints/support', icon: MessageSquare, module: 'complaints' },
  { label: 'Technicians', path: '/complaints/technicians', icon: User, module: 'complaints' },
  { label: 'Customer Records', path: '/complaints/customer-records', icon: Users, module: 'complaints' },
  { label: 'Deal Verifications', path: '/complaints/deal-verifications', icon: CheckCircle, module: 'complaints' },
  { label: 'Delivery Confirmation', path: '/complaints/delivery-confirmation', icon: CheckCircle, module: 'complaints' },
  { label: 'Installation Schedule', path: '/complaints/installation-schedule', icon: CalendarCheck, module: 'complaints' },
  { label: 'Feedback & Ratings', path: '/complaints/feedback-ratings', icon: Star, module: 'complaints' },
];

const complaintAgentMenuItems = [
  { label: 'Service Requests', path: '/complaints/service', icon: MessageSquare, module: 'complaints' },
  { label: 'Deal Verifications', path: '/complaints/deal-verifications', icon: CheckCircle, module: 'complaints' },
  { label: 'Delivery Confirmation', path: '/complaints/delivery-confirmation', icon: CheckCircle, module: 'complaints' },
  { label: 'Installation Schedule', path: '/complaints/installation-schedule', icon: CalendarCheck, module: 'complaints' },
  { label: 'Feedback & Ratings', path: '/complaints/feedback-ratings', icon: Star, module: 'complaints' },
];

const marketingMenuItems = [
  { label: 'Dashboard', path: '/marketing/dashboard', icon: LayoutDashboard, module: 'marketing' },
  { label: 'Marketing Library', path: '/marketing/library', icon: FolderOpen, module: 'marketing' },
  { label: 'Upload Content', path: '/marketing/upload', icon: Upload, module: 'marketing' },
  { label: 'Category Management', path: '/marketing/categories', icon: Folder, module: 'marketing' },
  { label: 'Reports', path: '/marketing/reports', icon: BarChart, module: 'marketing' },
  { label: 'Audit Logs', path: '/marketing/audit-logs', icon: History, module: 'marketing' },
  { label: 'Notifications', path: '/marketing/notifications', icon: Bell, module: 'marketing' },
];

const storeMenuItems = [
  { label: 'Dashboard', path: '/store-dashboard', icon: LayoutDashboard, module: 'Store' },
  { label: 'Inventory', path: '/store/inventory', icon: Package, module: 'Store' },
  { label: 'Orders', path: '/store/orders', icon: Receipt, module: 'Store' },
  { label: 'Purchase Orders', path: '/store/purchases/requests', icon: ShoppingCart, module: 'Store' },
  { label: 'Task Management', path: '/store/task-management', icon: CheckSquare, module: 'store' },
  { label: 'My Task', path: '/store/my-task', icon: CheckSquare, module: 'store' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'store',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'dashboard' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'trainees' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'trainingModules' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'questionBank' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'store', feature: 'traineeDashboard' },
];

const qcMenuItems = [
  { label: 'Dashboard', path: '/qc/dashboard', icon: LayoutDashboard, module: 'quality-control' },
  { label: 'QC Inward Entry', path: '/qc/inward', icon: ClipboardList, module: 'quality-control' },
  { label: 'All QC Jobs', path: '/qc/jobs', icon: ShieldAlert, module: 'quality-control' },
  { label: 'Pending Inspection', path: '/qc/jobs?status=Pending', icon: Clock, module: 'quality-control' },
  { label: 'In Progress', path: '/qc/jobs?status=In Progress', icon: AlertTriangle, module: 'quality-control' },
  { label: 'Task Management', path: '/qc/task-management', icon: CheckSquare, module: 'quality-control' },
  { label: 'My Task', path: '/qc/my-task', icon: CheckSquare, module: 'quality-control' },
  {
    label: 'Training Management',
    path: '/lms',
    icon: CheckSquare,
    module: 'quality-control',
    submodules: [
      { label: 'Dashboard', path: '/lms/dashboard', feature: 'dashboard' },
      { label: 'Trainees', path: '/lms/trainees', feature: 'trainees' },
      { label: 'Training Modules', path: '/lms/training-modules', feature: 'trainingModules' },
      { label: 'Question Bank', path: '/lms/question-bank', feature: 'questionBank' },
    ]
  },
  { label: 'Training', path: '/lms/training', icon: Pen, module: 'quality-control', feature: 'traineeDashboard' },
];

const misAdminMenuItems = [
  { label: 'Dashboard', path: '/mis/dashboard', icon: LayoutDashboard, module: 'mis' },
  { label: 'Sales Reports', path: '/mis/sales-report', icon: TrendingUp, module: 'mis' },
  { label: 'Finance Reports', path: '/mis/finance-report', icon: Calculator, module: 'mis' },
  { label: 'Production Summary', path: '/mis/production-report', icon: Factory, module: 'mis' },
  { label: 'Inventory Reports', path: '/mis/inventory-report', icon: Package, module: 'mis' },
  { label: 'Complaint & Service', path: '/mis/complaint-report', icon: MessageSquare, module: 'mis' },
  { label: 'HRMS Report', path: '/mis/hrms-report', icon: Users, module: 'mis' },
  { label: 'Quality Reports', path: '/mis/quality-report', icon: PieChart, module: 'mis' },
  { label: 'Settings', path: '/mis/settings', icon: Settings, module: 'mis' },
];

// 🔥 MISSING: Pure Trainee Menu Items
const traineeMenuItems = [
  { label: 'Dashboard', path: '/lms/dashboard', icon: LayoutDashboard, module: 'lms' },
  { label: 'My Training', path: '/lms/training', icon: Pen, module: 'lms' }
];

// Function to get menu items based on role
const getMenuItemsByRole = (role) => {
  if (!role) return [];

  if (role.toLowerCase().includes('trainee')) {
    return traineeMenuItems;
  }

  switch (role) {
    case 'Superadmin':
    case 'Super Admin':
      return superAdminMenuItems;
    case 'Production':
    case 'Production Employee':
    case 'Production Head':
      return productionMenuItems;
    case 'Packing':
    case 'Packing Employee':
    case 'Packing Head':
      return packingMenuItems;
    case 'Dispatch':
    case 'Dispatch Employee':
    case 'Dispatch Head':
      return dispatchMenuItems;
    case 'Sales':
    case 'Sales Employee':
    case 'Sales Head':
      return salesMenuItems;
    case 'Accounts':
    case 'Account Employee':
    case 'Accounts Head':
      return accountsMenuItems;
    case 'Hr Admin':
    case 'HR-Admin':
      return hrAdminMenuItems;
    case 'Manager':
      return managerMenuItems;
    case 'Employee':
      return employeeMenuItems;
    case 'Company Admin':
      return companyAdminMenuItems;
    case 'Research & Development Head':
    case 'Research Development Employee':
      return rdMenuItems;
    case 'Store Head':
    case 'Store Employee':
      return storeMenuItems;
    case 'Complaint Management Head':
      return complaintHeadMenuItems;
    case 'Complaint Management Employee':
      return complaintAgentMenuItems;
    case 'QC Head':
    case 'QC Employee':
      return qcMenuItems;
    case 'Marketing Head':
      return marketingMenuItems;
    case 'MIS Admin':
      return misAdminMenuItems;
    default:
      return [];
  }
};

export default function Sidebar({ isOpen, onClose }) {
  const [location] = useLocation();
  const searchString = useSearch(); // query string e.g. "status=Pending"
  const fullPath = searchString ? `${location}?${searchString}` : location;
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { hasModuleAccess, hasFeatureAccess } = usePermissions();
  const [expandedModules, setExpandedModules] = useState({});

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  let roleMenuItems = getMenuItemsByRole(user?.role);

  const normalizedRole = user?.role === 'Super Admin' ? 'Superadmin'
    : user?.role === 'HR-Admin' ? 'Hr Admin'
      : user?.role;

  const isHrmsRole = user?.role === 'Manager' || user?.role === 'HR-Admin' || user?.role === 'Hr Admin' || user?.role === 'Employee';
  const isManagerRole = user?.role === 'Manager';

  const shouldBypassSubmoduleCheck = isHrmsRole ||
    normalizedRole === 'Research & Development Head' ||
    normalizedRole === 'Research Development Employee' ||
    normalizedRole === 'Complaint Management Head' ||
    normalizedRole === 'Complaint Management Employee' ||
    normalizedRole === 'QC Head' ||
    normalizedRole === 'QC Employee' ||
    normalizedRole === 'Store Head' ||
    normalizedRole === 'Store Employee' ||
    normalizedRole === 'Company Admin';

  const isHeadRole = normalizedRole?.includes('Head') || normalizedRole === 'Manager' || normalizedRole === 'Superadmin' || normalizedRole === 'Hr Admin' || normalizedRole === 'Company Admin';

  // ==========================================
  // 🔥 UNIVERSAL PRE-FILTER 
  // ==========================================
  roleMenuItems = roleMenuItems.filter(item => {
    if (item.label === 'Task Management' && !isHeadRole) return false;

    // THE FIX: This now applies cleanly to ALL departments. 
    // Heads see "Training Management", Employees see "Training"
    if (item.label === 'Training Management' && !isHeadRole) return false;
    if (item.label === 'Training' && isHeadRole) return false;

    return true;
  });

  // 🔥 THE FIX: Unlock ONLY the Head's menu. 
  // The Employee's "Training" menu must keep its DB check so normal employees don't see it!
  roleMenuItems = roleMenuItems.map(item => {
    if (item.label === 'Training Management') {
      return { ...item, feature: undefined };
    }
    return item;
  });

  // ==========================================
  // ROLE SPECIFIC FILTERING
  // ==========================================
  let filteredMenuItems;

  if (normalizedRole === 'Superadmin') {
    filteredMenuItems = roleMenuItems;
  } else if (normalizedRole === 'Production' || normalizedRole === 'Production Employee' || normalizedRole === 'Production Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'production') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Packing' || normalizedRole === 'Packing Employee' || normalizedRole === 'Packing Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'packing') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Dispatch' || normalizedRole === 'Dispatch Employee' || normalizedRole === 'Dispatch Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'dispatches' || item.module === 'dispatch') {
        if (item.feature) {
          return hasFeatureAccess('dispatches', item.feature, 'view') || hasFeatureAccess('dispatch', item.feature, 'view');
        }
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Accounts' || normalizedRole === 'Account Employee' || normalizedRole === 'Accounts Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'accounts') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Sales' || normalizedRole === 'Sales Employee' || normalizedRole === 'Sales Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'sales' || item.module === 'customers') {
        if (item.feature && item.module !== 'customers') return hasFeatureAccess('sales', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Hr Admin' || normalizedRole === 'Manager' || normalizedRole === 'Employee') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'hrms') return true;
      return false;
    });
  } else if (normalizedRole === 'Research & Development Head' || normalizedRole === 'Research Development Employee' ||
    normalizedRole === 'Complaint Management Head' || normalizedRole === 'Complaint Management Employee' ||
    normalizedRole === 'QC Head' || normalizedRole === 'QC Employee' ||
    normalizedRole === 'Company Admin' ||
    normalizedRole === 'Store Head' || normalizedRole === 'Store Employee' ||
    normalizedRole === 'MIS Admin') {
    filteredMenuItems = roleMenuItems;
  } else {
    filteredMenuItems = roleMenuItems.filter(item => {
      const hasAccess = hasModuleAccess(item.module);
      if (!hasAccess) return false;
      if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
      if (settings?.modules && settings.modules[item.module] === false) return false;
      return true;
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 sm:w-72 bg-white/95 backdrop-blur-sm shadow-xl border-r border-slate-200 transition-all duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-3 border-b border-slate-200 bg-white">
            <div className="flex-1 flex items-center justify-center h-full py-2">
              <img
                src="/logo Semtek.webp"
                alt="Samtek Logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-500 hover:bg-slate-100 rounded-full w-8 h-8 flex-shrink-0"
              onClick={onClose}
            >
              ×
            </Button>
          </div>

          {/* Navigation Menu */}
          <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
            <nav className="space-y-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = fullPath === item.path ||
                  (item.module === 'dashboard' && location === '/') ||
                  (item.module === 'dashboard' && location === '/super-admin-dashboard') ||
                  (item.module === 'rnd' && location === '/r&d-dashboard') ||
                  (item.module === 'complaints' && location === '/complaints');
                const hasSubmodules = item.submodules && item.submodules.length > 0;
                const isExpanded = expandedModules[item.path];

                // 🔥 THE FIX: Always allow Training Management to reveal its submodules
                const hasAccessibleSubmodules = hasSubmodules &&
                  (item.label === 'Training Management' || shouldBypassSubmoduleCheck || item.submodules.some(sub => hasFeatureAccess(item.module, sub.feature, 'view')));

                return (
                  <div key={item.path} className="space-y-1">
                    {/* Main Module Button */}
                    <div className="flex items-center">
                      {hasAccessibleSubmodules ? (
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                            "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleModule(item.path);
                          }}
                        >
                          <Icon className={cn(
                            "w-5 h-5 mr-2 sm:mr-3 transition-all duration-200 group-hover:scale-110"
                          )} />
                          <span className="font-medium text-sm sm:text-base">{item.label}</span>
                          <div className="ml-auto">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                      ) : (
                        <Link href={item.path} className="flex-1">
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                : "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
                            )}
                            onClick={onClose}
                          >
                            <Icon className={cn(
                              "w-5 h-5 mr-2 sm:mr-3 transition-all duration-200",
                              isActive ? "drop-shadow-sm" : "group-hover:scale-110"
                            )} />
                            <span className="font-medium text-sm sm:text-base">{item.label}</span>
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                            )}
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Submodules */}
                    {hasAccessibleSubmodules && isExpanded && (
                      <div className="ml-6 sm:ml-8 space-y-1">
                        {item.submodules
                          // 🔥 THE FIX: Bypass DB checks for LMS submodules so they render perfectly for Heads
                          .filter(sub => item.label === 'Training Management' || shouldBypassSubmoduleCheck || hasFeatureAccess(item.module, sub.feature, 'view'))
                          .map((submodule) => {
                            const isSubActive = fullPath === submodule.path;
                            return (
                              <Link key={submodule.path} href={submodule.path}>
                                <Button
                                  variant={isSubActive ? "default" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start h-9 sm:h-9 px-2 sm:px-3 transition-all duration-200",
                                    isSubActive
                                      ? "bg-blue-100 text-blue-800"
                                      : "text-slate-600 hover:bg-slate-100:bg-slate-800"
                                  )}
                                  onClick={onClose}
                                >
                                  <span className="text-xs sm:text-sm">{submodule.label}</span>
                                </Button>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Profile - Always available */}
              <Separator className="my-4" />
              <Link href="/profile">
                <Button
                  variant={location === '/profile' ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 px-4 transition-all duration-200 group relative overflow-hidden",
                    location === '/profile'
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      : "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
                  )}
                  onClick={onClose}
                >
                  <Shield className={cn(
                    "w-5 h-5 mr-3 transition-all duration-200",
                    location === '/profile' ? "drop-shadow-sm" : "group-hover:scale-110"
                  )} />
                  <span className="font-medium">Profile</span>
                  {location === '/profile' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                  )}
                </Button>
              </Link>
            </nav>
          </ScrollArea>

          {/* Logout */}
          <div className="p-4 border-t border-slate-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-700 hover:bg-red-50 hover:text-red-600:bg-red-900/20:text-red-400 transition-colors duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}