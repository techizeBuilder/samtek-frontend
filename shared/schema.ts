import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User roles and permissions
export const USER_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  UNIT_HEAD: 'Unit Head',
  UNIT_MANAGER: 'Unit Manager',
  PRODUCTION: 'Production',
  PACKING: 'Packing',
  DISPATCH: 'Dispatch',
  ACCOUNTS: 'Accounts',
  SALES: 'Sales'
} as const;

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
  SETTINGS: 'Settings'
} as const;

export const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  ALTER: 'alter'
} as const;

export const ORDER_STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DISPATCHED: 'Dispatched'
} as const;

export const PRODUCTION_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold'
} as const;

export const DISPATCH_STATUS = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
} as const;
