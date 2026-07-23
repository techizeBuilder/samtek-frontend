export const USER_ROLES = {
  SUPER_USER: 'Super User',
  PRODUCTION: 'Production',
  PACKING: 'Packing',
  DISPATCH: 'Dispatch',
  ACCOUNTS: 'Accounts',
  RESEARCH_DEVELOPMENT_HEAD: 'Research & Development Head',
  RESEARCH_DEVELOPMENT_EMPLOYEE: 'Research Development Employee',
  COMPLAINT_MANAGEMENT_HEAD: 'Complaint Management Head',
  COMPLAINT_MANAGEMENT_EMPLOYEE: 'Complaint Management Employee',
  STORE_HEAD: 'Store Head',
  STORE_EMPLOYEE: 'Store Employee',
  COMPANY_ADMIN: 'Company Admin',
  HR_ADMIN: 'HR-Admin',
  MARKETING_HEAD: 'Marketing Head',
  MARKETING_EMPLOYEE: 'Marketing Employee'
};

export const MODULES = {
  DASHBOARD: 'Dashboard',
  ORDERS: 'Orders',
  MANUFACTURING: 'Manufacturing',
  DISPATCHES: 'Dispatches',
  SALES: 'Sales',
  ACCOUNTS: 'Accounts',
  INVENTORY: 'Inventory',
  CUSTOMERS: 'Customers',
  SUPPLIERS: 'Suppliers',
  PURCHASES: 'Purchases',
  SETTINGS: 'Settings',
  STORE: 'Store',
  MARKETING: 'Marketing'
};

export const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  ALTER: 'alter'
};

export const ORDER_STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DISPATCHED: 'Dispatched'
};

export const PRODUCTION_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold'
};

export const DISPATCH_STATUS = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
};

export const INVENTORY_CATEGORIES = {
  RAW_MATERIAL: 'Raw Material',
  WORK_IN_PROGRESS: 'Work in Progress',
  FINISHED_GOODS: 'Finished Goods',
  CONSUMABLES: 'Consumables',
  TOOLS: 'Tools'
};

export const ACCOUNT_TYPES = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expense'
};

export const CUSTOMER_TYPES = {
  REGULAR: 'Regular',
  VIP: 'VIP',
  WHOLESALE: 'Wholesale',
  RETAIL: 'Retail'
};

export const SUPPLIER_TYPES = {
  RAW_MATERIAL: 'Raw Material',
  SERVICES: 'Services',
  EQUIPMENT: 'Equipment',
  CONSUMABLES: 'Consumables'
};

export const UNITS = [
  'Unit A - Assembly',
  'Unit B - Packaging',
  'Unit C - Quality Control',
  'Unit D - Dispatch'
];

export const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'GBP', label: 'GBP - British Pound' }
];

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Europe/London', label: 'Greenwich Mean Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' }
];

export const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
];

export const TIME_FORMATS = [
  { value: '12', label: '12 Hour' },
  { value: '24', label: '24 Hour' }
];

export const PRIORITY_LEVELS = [
  'Low',
  'Medium',
  'High',
  'Urgent'
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Bank Transfer',
  'Cheque',
  'UPI'
];
