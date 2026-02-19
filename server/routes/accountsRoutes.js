import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  getCompanySalesInvoices,
  getInvoiceDetail,
  updateInvoice,
  getSalesAnalytics,
  getAllSalesPersons,
  getSalesPersonById,
  getSalesPersonOrders,
  debugCheckSalesPersons,
  getDamageExpiryList,
  getDamageExpiryDetail
} from '../controllers/accountsController.js';
import { getPurchaseItems } from '../controllers/purchaseController.js';

const accountsRouter = express.Router();

// Apply authentication to all accounts routes
accountsRouter.use(authenticateToken);

// Sales Invoices - Get all invoices for the company
// Can be used by: Unit Manager, Unit Head, Sales Person, Super Admin, Admin, Accounts
accountsRouter.get(
  '/sales/invoices',
  authorizeRoles('Unit Manager', 'Unit Head', 'Sales Person', 'Super Admin', 'Admin', 'Accounts'),
  getCompanySalesInvoices
);

// Get detailed invoice information
accountsRouter.get(
  '/sales/invoices/:invoiceId',
  authorizeRoles('Unit Manager', 'Unit Head', 'Sales Person', 'Super Admin', 'Admin', 'Accounts'),
  getInvoiceDetail
);

// Update invoice payment status or details
accountsRouter.put(
  '/sales/invoices/:invoiceId',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  updateInvoice
);

// Get sales analytics
accountsRouter.get(
  '/sales/analytics',
  authorizeRoles('Unit Manager', 'Unit Head', 'Sales Person', 'Super Admin', 'Admin', 'Accounts'),
  getSalesAnalytics
);

// ==================== SALES PERSONS MANAGEMENT ====================

// Get all sales persons for the company
accountsRouter.get(
  '/sales-persons',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getAllSalesPersons
);

// Get specific sales person details
accountsRouter.get(
  '/sales-persons/:salesPersonId',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getSalesPersonById
);

// Get all orders for a specific sales person
accountsRouter.get(
  '/sales-persons/:salesPersonId/orders',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getSalesPersonOrders
);

// Debug endpoint - check for sales persons
accountsRouter.get(
  '/debug/check-sales-persons',
  authorizeRoles('Super Admin', 'Admin', 'Accounts'),
  debugCheckSalesPersons
);

// ==================== DAMAGE & EXPIRY MANAGEMENT ====================

// Get all damage and expiry items for the company
accountsRouter.get(
  '/damage-expiry',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getDamageExpiryList
);

// Get specific damage/expiry item details
accountsRouter.get(
  '/damage-expiry/:id',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getDamageExpiryDetail
);

// ==================== PURCHASES MANAGEMENT ====================

// Get inventory items for purchases (only Material, Spares, Assemblies - NOT Product)
// Available for: Unit Manager, Unit Head, Super Admin, Admin, Accounts
accountsRouter.get(
  '/purchases/items',
  authorizeRoles('Unit Manager', 'Unit Head', 'Super Admin', 'Admin', 'Accounts'),
  getPurchaseItems
);

export default accountsRouter;
