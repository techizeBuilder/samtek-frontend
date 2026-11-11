/** @format */

// The roles someone with a login can have: Add Employee and Give Login both offer
// these. Manpower isn't one: that's for someone with no login.

// A role option is either a plain string (value === label) or an object
// when the stored role differs from what's shown, e.g. Dispatch has absorbed
// Packing into one combined role/menu, so the Dispatch roles read "Packing and
// Dispatch".
export type RoleOption = string | { value: string; label: string };
export const roleValue = (role: RoleOption) => (typeof role === "string" ? role : role.value);
export const roleLabel = (role: RoleOption) => (typeof role === "string" ? role : role.label);

// HRMS-specific roles - static list
export const HRMS_ROLES: RoleOption[] = [
  "Manager",
  "Employee",
  "Sales Employee",
  "Production Employee",
  { value: "Dispatch Employee", label: "Packing and Dispatch Employee" },
  "Account Employee",
  // 'Auditor',
  "Research Development Employee",
  "Complaint Management Employee",
  "Store Employee",
  "QC Employee",
  "MIS Admin",
  "Marketing Employee",
];

// Roles below use the real, shared MODULES/ROLE_MODULE_MAP-driven
// Module Permissions grid — the same system Company Admin's "Roles & Permissions"
// page uses — instead of a separate, ad-hoc checkbox list, so their permissions
// always match what the Sidebar actually checks.
export const DEPARTMENT_HEAD_ROLES: RoleOption[] = [
  "Sales Head",
  "Production Head",
  { value: "Dispatch Head", label: "Packing and Dispatch Head" },
  "Accounts Head",
  "Research & Development Head",
  "Complaint Management Head",
  "Store Head",
  "QC Head",
  "Marketing Head",
];
export const DEPARTMENT_HEAD_ROLE_VALUES = DEPARTMENT_HEAD_ROLES.map(roleValue);
export const EMPLOYEE_MODULE_ROLES = [
  "Manager",
  "Sales Employee",
  "Production Employee",
  "Dispatch Employee",
  "Account Employee",
  "Research Development Employee",
  "Complaint Management Employee",
  "Store Employee",
  "QC Employee",
  "Marketing Employee",
  "MIS Admin",
];
export const isHeadRole = (role: string) => DEPARTMENT_HEAD_ROLE_VALUES.includes(role);
export const usesModulePermissionsGrid = (role: string) => isHeadRole(role) || EMPLOYEE_MODULE_ROLES.includes(role);
