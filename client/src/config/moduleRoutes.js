import {
  LayoutDashboard, Cog, Truck, TrendingUp, Calculator, Package, Users, Handshake, Receipt,
  Settings, Factory, Shield, Building2, Building,
  PieChart, ShoppingCart, CreditCard, RotateCcw, Calendar, FileText, CheckCircle,
  BarChart, Clock, AlertTriangle, History, Target, Star, MessageSquare, Briefcase,
  ClipboardList, CalendarCheck, CheckSquare, UserCircle, Beaker, ShieldAlert,
  FolderOpen, Upload, Pen, User, Bell, Megaphone, Inbox, ShieldCheck, Image
} from 'lucide-react';

// ============================================================
// MENU ITEM DEFINITIONS
//
// Single source of truth for two things:
//   1. Sidebar.jsx renders these to build the nav for each role.
//   2. getRoutePermission() below flattens them into a path -> {module,
//      feature} lookup used by the route guards (ProtectedRoute /
//      RoleBasedLayout) so a URL requires the same permission as the
//      sidebar link that points to it.
// ============================================================
const superAdminMenuItems = [
  { label: 'Super Admin Dashboard', path: '/super-admin-dashboard', icon: Shield, module: 'dashboard' },
  { label: 'Orders', path: '/super-admin/orders', icon: Receipt, module: 'orders' },
  { label: 'Sales', path: '/super-admin/sales', icon: TrendingUp, module: 'sales' },
  // { label: 'Dispatches', path: '/super-admin/dispatches', icon: Truck, module: 'dispatches' },
  // { label: 'Accounts', path: '/super-admin/accounts', icon: Calculator, module: 'accounts' },
  // { label: 'Inventory', path: '/super-admin/inventory', icon: Package, module: 'inventory' },
  { label: 'Customers', path: '/super-admin/customers', icon: Users, module: 'customers' },
  { label: 'Companies', path: '/super-admin/companies', icon: Building2, module: 'companies' },
  { label: 'Role & Permissions', path: '/role-permission-management', icon: Shield, module: 'permissions' },
  { label: 'Settings', path: '/admin/settings', icon: Settings, module: 'settings' },
];

const productionMenuItems = [
  { label: 'Dashboard', path: '/production/dashboard', icon: Factory, module: 'production' },
  { label: 'Task Management', path: '/production/task-management', icon: CheckSquare, module: 'production' },
  { label: 'My Task', path: '/production/my-task', icon: CheckSquare, module: 'production' },
  { label: 'Orders', path: '/production/orders', icon: ClipboardList, module: 'production', feature: 'orders' },
  { label: 'Repair Production', path: '/production/repair', icon: ShieldAlert, module: 'production', feature: 'repairProduction' },
  { label: 'Work Planning', path: '/production/work-planning', icon: Calendar, module: 'production', feature: 'workPlanning' },
  { label: 'Process & QC', path: '/production/process-execution', icon: Cog, module: 'production', feature: 'processQc' },
  { label: 'Job Cards', path: '/production/job-cards', icon: FileText, module: 'production', feature: 'jobCards' },
  { label: 'Manpower', path: '/production/manpower', icon: Users, module: 'production', feature: 'manpower' },
  // { label: 'Production Sheet', path: '/production/production-sheet', icon: Clock, module: 'production', feature: 'productionSheet' },
  // { label: 'Production Reports', path: '/production/reports', icon: BarChart, module: 'production', feature: 'productionReports' },
  { label: 'Expenses', path: '/production/expenses', icon: Receipt, module: 'production', feature: 'expenses' },
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
  { label: 'Expenses', path: '/packaging-dispatch/expenses', icon: Receipt, module: 'packing' },
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

// Dispatch's own combined view — includes Packaging Queue/Jobs (Dispatch's
// visibility into the packaging pipeline) but not the Packing team's own
// Packing Sheet/History creation pages, which stay exclusive to the Packing
// role above.
const packagingDispatchMenuItems = [
  { label: 'Dashboard', path: '/packaging-dispatch/dashboard', icon: LayoutDashboard, module: 'dispatches' },
  { label: 'Task Management', path: '/dispatch/task-management', icon: CheckSquare, module: 'dispatches' },
  { label: 'My Task', path: '/dispatch/my-task', icon: CheckSquare, module: 'dispatches' },
  { label: 'Packaging Queue', path: '/packaging/queue', icon: Package, module: 'dispatches', feature: 'packagingQueue' },
  { label: 'Packaging Jobs', path: '/packaging/jobs', icon: ClipboardList, module: 'dispatches', feature: 'packagingJobs' },
  { label: 'Dispatch Planning', path: '/dispatch/planning', icon: Truck, module: 'dispatches', feature: 'dispatchPlanning' },
  { label: 'Active Dispatches', path: '/dispatch/active', icon: CheckSquare, module: 'dispatches', feature: 'activeDispatches' },
  { label: 'Dispatch History', path: '/dispatch/completed', icon: BarChart, module: 'dispatches', feature: 'dispatchHistory' },
  { label: 'Delivery Challan', path: '/dispatch/delivery-challan', icon: FileText, module: 'dispatches', feature: 'deliveryChallan' },
  { label: 'Expenses', path: '/packaging-dispatch/expenses', icon: Receipt, module: 'dispatches' },
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
  { label: 'Leads', path: '/sales/leads', icon: Target, module: 'sales', feature: 'leads' },
  { label: 'Payment Requests', path: '/sales/payment-requests', icon: Receipt, module: 'sales', feature: 'paymentRequests' },
  { label: 'My Customers', path: '/sales/my-customers', icon: Users, module: 'sales', feature: 'myCustomers' },
  { label: 'My Orders', path: '/sales/orders', icon: ShoppingCart, module: 'sales', feature: 'orders' },
  { label: 'My Dispatches', path: '/sales/my-deliveries', icon: Truck, module: 'sales', feature: 'myDeliveries' },
  { label: 'My Payments', path: '/sales/my-invoices', icon: CreditCard, module: 'sales', feature: 'myInvoices' },
  { label: 'Returns', path: '/sales/returns', icon: RotateCcw, module: 'sales', feature: 'returns' },
  { label: 'Damages', path: '/sales/damages', icon: AlertTriangle, module: 'sales', feature: 'damages' },
  { label: 'Customers', path: '/customers', icon: Users, module: 'customers' },
  { label: 'Marketing Content', path: '/sales/marketing-content', icon: Megaphone, module: 'marketing' },
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
      // { label: 'Sales Return', path: '/accounts/sales/returns', feature: 'sales' },
      { label: 'Customer Payment', path: '/accounts/sales/payments', feature: 'sales' },
      // { label: 'Sales Order Tracking', path: '/accounts/sales/order-tracking', feature: 'sales' },
      { label: 'NOC Requests', path: '/accounts/sales/noc-request', feature: 'sales' },
      { label: 'Packed Orders (Payment)', path: '/accounts/sales/packed-orders', feature: 'sales' },
      { label: 'Order Form', path: '/accounts/sales/order-forms', feature: 'sales' },
      // { label: 'Receivable Ageing', path: '/accounts/sales/ageing', feature: 'sales' },
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
      { label: 'Inventory', path: '/accounts/purchases/inventory', feature: 'purchases' },
      { label: 'Purchase Request', path: '/accounts/purchases/requests', feature: 'purchases' },
      { label: 'RFQ Management', path: '/accounts/purchases/rfq', feature: 'purchases' },
      { label: 'Vendor Bids', path: '/accounts/purchases/vendor-bids', feature: 'purchases' },
      { label: 'Purchase Invoice', path: '/accounts/purchases/invoices', feature: 'purchases' },
      // { label: 'Purchase Return', path: '/accounts/purchases/returns', feature: 'purchases' },
      { label: 'Purchase Exchange', path: '/accounts/purchases/exchanges', feature: 'purchases' },
      { label: 'Vendor Payment', path: '/accounts/purchases/payments', feature: 'purchases' },
      { label: 'Payable Ageing', path: '/accounts/purchases/ageing', feature: 'purchases' },
      { label: 'Purchase Expenses', path: '/accounts/purchases/expenses', feature: 'purchases' },
      { label: 'Purchase Reports', path: '/accounts/purchases/reports', feature: 'purchases' }
    ]
  },
  { label: 'GST & TDS', path: '/accounts/gst-tds', icon: FileText, module: 'accounts', feature: 'gstAndTds' },
  { label: 'Expenses', path: '/accounts/expenses', icon: Receipt, module: 'accounts', feature: 'expenses' },
  { label: 'Tender Expenses', path: '/accounts/tender-expenses', icon: Receipt, module: 'accounts' },
  // { label: 'Salesman Settlement', path: '/accounts/salesman-settlement', icon: Handshake, module: 'accounts', feature: 'salesmanSettlement' },
  { label: 'Bank & Cash', path: '/accounts/bank-cash', icon: CreditCard, module: 'accounts', feature: 'bankAndCash' },
  { label: 'Ledger', path: '/accounts/ledger', icon: History, module: 'accounts', feature: 'bankAndCash' },
  { label: 'Reports', path: '/accounts/financial-summary', icon: BarChart, module: 'accounts', feature: 'reports' },
  { label: 'Payment Reminders', path: '/accounts/payment-reminders', icon: Bell, module: 'accounts', feature: 'bankAndCash' },
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
  { label: 'Document Verification', path: '/hrms/SuperAdmin/document-verification', icon: ShieldCheck, module: 'hrms' },
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
  { label: 'Expenses', path: '/hrms/SuperAdmin/expenses', icon: Receipt, module: 'hrms' },
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
  { label: 'Holidays', path: '/hrms/Employee/holidays', icon: Calendar, module: 'hrms' },
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

// Reusable "core HRMS self-service" block for department-tier Employee roles
// (Sales Employee, Production Employee, etc.) — they're company employees
// too and should get the same self-service access as the plain 'Employee'
// role. Built from employeeMenuItems minus Dashboard/My Task (the
// department menu already has its own), with Expenses optionally skipped
// when the department menu already has its own expense-logging item.
const employeeSelfServiceItems = ({ skipExpenses = false } = {}) =>
  employeeMenuItems.filter(item =>
    item.label !== 'Dashboard' &&
    item.label !== 'My Task' &&
    !(skipExpenses && item.label === 'Expenses')
  );

const companyAdminMenuItems = [
  { label: 'Dashboard', path: '/hrms/CompanyAdmin/dashboard', icon: LayoutDashboard, module: 'hrms', feature: 'dashboard' },
  { label: 'Employee Management', path: '/hrms/CompanyAdmin/employees', icon: Users, module: 'hrms', feature: 'employeeManagement' },
  { label: 'My Company', path: '/hrms/CompanyAdmin/companies', icon: Building2, module: 'hrms', feature: 'myCompany' },
  { label: 'Pricing Value', path: '/hrms/CompanyAdmin/pricing-value', icon: Calculator, module: 'hrms', feature: 'pricingValue' },
  { label: 'Operating Units', path: '/hrms/CompanyAdmin/branches', icon: Building, module: 'hrms', feature: 'operatingUnits' },
  { label: 'Departments', path: '/hrms/CompanyAdmin/departments', icon: Users, module: 'hrms', feature: 'departments' },
  { label: 'Designations', path: '/hrms/CompanyAdmin/designations', icon: Briefcase, module: 'hrms', feature: 'designations' },
  { label: 'Roles & Permissions', path: '/hrms/CompanyAdmin/user-management', icon: Shield, module: 'hrms', feature: 'rolePermissions' },
  { label: 'Task Management', path: '/hrms/CompanyAdmin/task-management', icon: CheckSquare, module: 'hrms', feature: 'taskManagement' }
];

const rdMenuItems = [
  { label: 'Dashboard', path: '/r&d/dashboard', icon: LayoutDashboard, module: 'rnd', feature: 'dashboard' },
  { label: 'Inventory', path: '/r&d/inventory', icon: Package, module: 'rnd', feature: 'inventory' },
  { label: 'Approve Requests', path: '/r&d/approve-requests', icon: CheckCircle, module: 'rnd', feature: 'approveRequests' },
  {
    label: 'Product Management',
    path: '/r&d/product-master',
    icon: Package,
    module: 'rnd',
    // No top-level `feature` — same convention as "Training Management" below:
    // access is governed per-submodule instead, so a role missing one of these
    // three features still sees the parent and whichever it does have.
    submodules: [
      { label: 'Product Master', path: '/r&d/product-master', feature: 'productMaster' },
      { label: 'Motor Master', path: '/r&d/motor-master', feature: 'motorMaster' },
      { label: 'Plant Master', path: '/r&d/plant-master', feature: 'plantMaster' },
      { label: 'Fabrication Master', path: '/r&d/fabrication-master', feature: 'fabricationMaster' },
    ]
  },
  { label: 'Design Approval', path: '/r&d/design-approval', icon: CheckCircle, module: 'rnd', feature: 'designApproval' },
  { label: 'BOM Management', path: '/r&d/bom-management', icon: ClipboardList, module: 'rnd', feature: 'bomManagement' },
  { label: 'Tool & Process', path: '/r&d/tool-process', icon: Cog, module: 'rnd', feature: 'toolProcess' },
  { label: 'Prototype', path: '/r&d/prototype', icon: Beaker, module: 'rnd', feature: 'prototype' },
  { label: 'Change Management', path: '/r&d/change-management', icon: AlertTriangle, module: 'rnd', feature: 'changeManagement' },
  { label: 'Quality Parameters', path: '/r&d/quality-parameters', icon: ShieldAlert, module: 'rnd', feature: 'qualityParameters' },
  { label: 'Documentation', path: '/r&d/documentation', icon: FolderOpen, module: 'rnd', feature: 'documentation' },
  { label: 'Expenses', path: '/r&d/expenses', icon: Receipt, module: 'rnd', feature: 'expenses' },
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
  { label: 'Dashboard', path: '/complaints/dashboard', icon: LayoutDashboard, module: 'complaints', feature: 'dashboard' },
  { label: 'Support Management', path: '/complaints/support', icon: MessageSquare, module: 'complaints', feature: 'supportManagement' },
  { label: 'Technicians', path: '/complaints/technicians', icon: User, module: 'complaints', feature: 'technicians' },
  { label: 'Customer Records', path: '/complaints/customer-records', icon: Users, module: 'complaints', feature: 'customerRecords' },
  { label: 'Deal Verifications', path: '/complaints/deal-verifications', icon: CheckCircle, module: 'complaints', feature: 'dealVerifications' },
  { label: 'Delivery Confirmation', path: '/complaints/delivery-confirmation', icon: CheckCircle, module: 'complaints', feature: 'deliveryConfirmation' },
  { label: 'Installation Schedule', path: '/complaints/installation-schedule', icon: CalendarCheck, module: 'complaints', feature: 'installationSchedule' },
  { label: 'Feedback & Ratings', path: '/complaints/feedback-ratings', icon: Star, module: 'complaints', feature: 'feedbackRatings' },
  { label: 'Expenses', path: '/complaints/expenses', icon: Receipt, module: 'complaints', feature: 'expenses' },
];

const complaintAgentMenuItems = [
  { label: 'Service Requests', path: '/complaints/service', icon: MessageSquare, module: 'complaints' },
  { label: 'Deal Verifications', path: '/complaints/deal-verifications', icon: CheckCircle, module: 'complaints' },
  { label: 'Delivery Confirmation', path: '/complaints/delivery-confirmation', icon: CheckCircle, module: 'complaints' },
  { label: 'Installation Schedule', path: '/complaints/installation-schedule', icon: CalendarCheck, module: 'complaints' },
  { label: 'Feedback & Ratings', path: '/complaints/feedback-ratings', icon: Star, module: 'complaints' },
  { label: 'Expenses', path: '/complaints/expenses', icon: Receipt, module: 'complaints' },
];

const marketingMenuItems = [
  { label: 'Dashboard', path: '/marketing/dashboard', icon: LayoutDashboard, module: 'marketing' },
  { label: 'Upload Content', path: '/marketing/upload', icon: Upload, module: 'marketing' },
  { label: 'Event Flyer', path: '/marketing/events', icon: Image, module: 'marketing' },
  { label: 'Sales Requests', path: '/marketing/sales-requests', icon: Inbox, module: 'marketing' },
  { label: 'Marketing Expenses', path: '/marketing/expenses', icon: Receipt, module: 'marketing' },
  { label: 'Reports', path: '/marketing/reports', icon: BarChart, module: 'marketing' },
  { label: 'Audit Logs', path: '/marketing/audit-logs', icon: History, module: 'marketing' },
  { label: 'Notifications', path: '/marketing/notifications', icon: Bell, module: 'marketing' },
];

// Marketing Employee has a narrower scope than Marketing Head — logging
// expenses and publishing event flyers, no access to content library/upload.
const marketingEmployeeMenuItems = [
  { label: 'Event Flyer', path: '/marketing/events', icon: Image, module: 'marketing' },
  { label: 'Marketing Expenses', path: '/marketing/expenses', icon: Receipt, module: 'marketing' },
];

const storeMenuItems = [
  { label: 'Dashboard', path: '/store-dashboard', icon: LayoutDashboard, module: 'Store', feature: 'dashboard' },
  { label: 'Inventory', path: '/store/inventory', icon: Package, module: 'Store', feature: 'inventory' },
  { label: 'Orders', path: '/store/orders', icon: Receipt, module: 'Store', feature: 'orders' },
  { label: 'Purchase Orders', path: '/store/purchases/requests', icon: ShoppingCart, module: 'Store', feature: 'purchaseOrders' },
  { label: 'Material Transfers', path: '/store/material-issues', icon: Handshake, module: 'Store', feature: 'materialTransfers' },
  { label: 'Defective Inventory', path: '/store/defective-inventory', icon: AlertTriangle, module: 'Store', feature: 'defectiveInventory' },
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
  { label: 'Dashboard', path: '/qc/dashboard', icon: LayoutDashboard, module: 'quality-control', feature: 'dashboard' },
  { label: 'QC Inward Entry', path: '/qc/inward', icon: ClipboardList, module: 'quality-control', feature: 'qcInward' },
  { label: 'All QC Jobs', path: '/qc/jobs', icon: ShieldAlert, module: 'quality-control', feature: 'qcJobs' },
  { label: 'Pending Inspection', path: '/qc/jobs?status=Pending', icon: Clock, module: 'quality-control', feature: 'qcJobs' },
  { label: 'In Progress', path: '/qc/jobs?status=In Progress', icon: AlertTriangle, module: 'quality-control', feature: 'qcJobs' },
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
  { label: 'Dashboard', path: '/mis/dashboard', icon: LayoutDashboard, module: 'mis', feature: 'dashboard' },
  { label: 'Sales Reports', path: '/mis/sales-report', icon: TrendingUp, module: 'mis', feature: 'salesReport' },
  { label: 'Finance Reports', path: '/mis/finance-report', icon: Calculator, module: 'mis', feature: 'financeReport' },
  { label: 'Production Summary', path: '/mis/production-report', icon: Factory, module: 'mis', feature: 'productionReport' },
  { label: 'Inventory Reports', path: '/mis/inventory-report', icon: Package, module: 'mis', feature: 'inventoryReport' },
  { label: 'Complaint & Service', path: '/mis/complaint-report', icon: MessageSquare, module: 'mis', feature: 'complaintReport' },
  { label: 'HRMS Report', path: '/mis/hrms-report', icon: Users, module: 'mis', feature: 'hrmsReport' },
  { label: 'Quality Reports', path: '/mis/quality-report', icon: PieChart, module: 'mis', feature: 'qualityReport' },
  { label: 'Settings', path: '/mis/settings', icon: Settings, module: 'mis' },
];

// Pure Trainee Menu Items
const traineeMenuItems = [
  { label: 'Dashboard', path: '/lms/dashboard', icon: LayoutDashboard, module: 'lms' },
  { label: 'My Training', path: '/lms/training', icon: Pen, module: 'lms' }
];

// Function to get menu items based on role
export const getMenuItemsByRole = (role) => {
  if (!role) return [];

  if (role.toLowerCase().includes('trainee')) {
    return traineeMenuItems;
  }

  switch (role) {
    case 'Superadmin':
    case 'Super Admin':
      return superAdminMenuItems;
    // Department-tier Employee roles get their ERP menu PLUS the standard
    // HRMS self-service block (Profile/Attendance/Leave/Holidays/Payroll/
    // Requests) — Head roles and the bare department role keep just the ERP
    // menu, unchanged.
    case 'Production Employee':
      return [...productionMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'Production':
    case 'Production Head':
      return productionMenuItems;
    case 'Packing Employee':
      return [...packingMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'Packing':
    case 'Packing Head':
      return packingMenuItems;
    case 'Dispatch Employee':
      return [...packagingDispatchMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'Dispatch':
    case 'Dispatch Head':
      return packagingDispatchMenuItems;
    case 'Sales Employee':
      return [...salesMenuItems, ...employeeSelfServiceItems()];
    case 'Sales':
    case 'Sales Head':
      return salesMenuItems;
    case 'Account Employee':
      return [...accountsMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'Accounts':
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
    case 'Research Development Employee':
      return [...rdMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'Research & Development Head':
      return rdMenuItems;
    case 'Store Employee':
      return [...storeMenuItems, ...employeeSelfServiceItems()];
    case 'Store Head':
      return storeMenuItems;
    case 'Complaint Management Head':
      return complaintHeadMenuItems;
    case 'Complaint Management Employee':
      return [...complaintAgentMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'QC Employee':
      return [...qcMenuItems, ...employeeSelfServiceItems()];
    case 'QC Head':
      return qcMenuItems;
    case 'Marketing Head':
      return marketingMenuItems;
    case 'Marketing Employee':
      return [...marketingEmployeeMenuItems, ...employeeSelfServiceItems({ skipExpenses: true })];
    case 'MIS Admin':
      return misAdminMenuItems;
    default:
      return [];
  }
};

// All menu arrays, regardless of role — used to build the route permission
// index below. A path only needs to appear once; if multiple roles' arrays
// disagree on the feature key for the same path the first one encountered
// wins (in practice they agree everywhere this occurs today).
const ALL_MENU_ARRAYS = [
  superAdminMenuItems,
  productionMenuItems,
  packingMenuItems,
  packagingDispatchMenuItems,
  salesMenuItems,
  accountsMenuItems,
  hrAdminMenuItems,
  managerMenuItems,
  employeeMenuItems,
  companyAdminMenuItems,
  rdMenuItems,
  complaintHeadMenuItems,
  complaintAgentMenuItems,
  marketingMenuItems,
  marketingEmployeeMenuItems,
  storeMenuItems,
  qcMenuItems,
  misAdminMenuItems,
  traineeMenuItems,
];

function buildRoutePermissionIndex() {
  const index = new Map();
  const add = (path, module, feature) => {
    if (!path || !module) return;
    // Strip a trailing query string (e.g. '/qc/jobs?status=Pending') — the
    // guard matches on pathname only, permission is really about the base path.
    const cleanPath = path.split('?')[0];
    if (!index.has(cleanPath)) {
      index.set(cleanPath, { module, feature: feature || null });
    }
  };

  for (const menuArray of ALL_MENU_ARRAYS) {
    for (const item of menuArray) {
      add(item.path, item.module, item.feature);
      if (item.submodules) {
        for (const sub of item.submodules) {
          add(sub.path, item.module, sub.feature);
        }
      }
    }
  }
  return index;
}

const routePermissionIndex = buildRoutePermissionIndex();

/**
 * Resolve which {module, feature} a URL path requires, using the same
 * path -> module/feature associations the Sidebar renders from. Used by
 * ProtectedRoute / RoleBasedLayout to gate direct navigation the same way
 * the sidebar already gates what's shown.
 *
 * Returns null when the path isn't governed by any module/feature (e.g.
 * /profile, /dashboard, /login) — those stay "authenticated access only",
 * unchanged from prior behavior.
 */
export function getRoutePermission(pathname) {
  if (!pathname) return null;
  const cleanPath = pathname.split('?')[0];

  const exact = routePermissionIndex.get(cleanPath);
  if (exact) return exact;

  // Longest-prefix ancestor match — covers detail/sub-pages (e.g. `/qc/jobs/:id`)
  // and pages rendered by a nested internal <Switch> (e.g. everything under
  // `/production/:rest*`) that share a parent's permission but aren't
  // themselves a literal sidebar entry.
  const segments = cleanPath.split('/').filter(Boolean);
  for (let i = segments.length - 1; i > 0; i--) {
    const ancestorPath = '/' + segments.slice(0, i).join('/');
    const match = routePermissionIndex.get(ancestorPath);
    if (match) return match;
  }

  return null;
}
