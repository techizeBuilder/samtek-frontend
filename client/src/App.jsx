import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UnitManagerProtectedRoute } from "@/components/auth/UnitManagerProtectedRoute";
import { RoleBasedProtectedRoute } from "@/components/auth/RoleBasedProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";

import Manufacturing from "@/pages/Manufacturing";
import DispatchDashboard from "@/pages/DispatchDashboard";
import Sales from "@/pages/Sales";
import Accounts from "@/pages/Accounts";
import ModernInventoryUI from "@/components/inventory/ModernInventoryUI";
import UnitHeadInventoryManagement from "@/components/inventory/UnitHeadInventoryManagement";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Purchases from "@/pages/Purchases";
import Settings from "@/pages/Settings";
import RolePermissionManagement from "@/pages/RolePermissionManagement";
import UnitHeadRolePermissionManagement from "@/pages/UnitHeadRolePermissionManagement";
import MainLayout from "@/components/layout/MainLayout";
import Profile from "@/pages/Profile";
import Companies from "@/pages/Companies";
import MyOrders from "@/pages/sales/MyIndent";
import MyCustomers from "@/pages/sales/MyCustomers";
import MyDeliveries from "@/pages/sales/MyDeliveries";
import MyInvoices from "@/pages/sales/MyInvoices";

import Returns from "@/pages/sales/Returns";
import Damages from "@/pages/sales/Damages";
import SalesDashboard from "@/pages/SalesDashboard";
import ProductionHistoryPage from "@/pages/ProductionHistoryPage";
import RoleBasedDashboard from "@/components/layout/RoleBasedDashboard";
import NotificationsPage from "@/pages/NotificationsPage";
import UnitHeadDashboard from "@/pages/UnitHeadDashboard";
import UnitHeadOrdersManagement from "@/components/orders/UnitHeadOrdersManagement";
import UnitHeadSales from "@/pages/UnitHeadSales";
import UnitHeadCustomers from "@/pages/UnitHeadCustomers";
import UnitHeadCutoffTime from "@/pages/UnitHeadCutoffTime";
import UnitManagerDashboard from "@/pages/UnitManagerDashboard";
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
import SalesInvoices from "@/pages/accounts/SalesInvoices";
import SalesReturns from "@/pages/accounts/SalesReturns";
import CustomerPayments from "@/pages/accounts/CustomerPayments";
import ReceivableAgeing from "@/pages/accounts/ReceivableAgeing";
import SalesReports from "@/pages/accounts/SalesReports";
import Expenses from "@/pages/accounts/Expenses";
import FinancialSummary from "@/pages/accounts/FinancialSummary";
import LedgerRecord from "@/pages/accounts/LedgerRecord";
import DeliveryChallan from "@/pages/dispatch/DeliveryChallan";
import DispatchHistory from "@/pages/dispatch/DispatchHistory";
import SalesApproval from "@/pages/SalesApproval";
import SalesOrderList from "@/pages/SalesOrderList";
import UnitHeadProductionGroup from "@/components/unit-head/UnitHeadProductionGroup";
import UnitManagerProductionGroup from "@/pages/unit-manager/UnitManagerProductionGroup";
import UnitManagerReturns from "@/pages/unit-manager/UnitManagerReturns";
import UnitManagerLayout from "@/components/layout/UnitManagerLayout";
import RoleBasedLayout from "@/components/layout/RoleBasedLayout";
import SuperAdminAccounts from "@/pages/super-admin/Accounts";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        {() => <Login />}
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
      <Route path="/unit-head/production/:rest*">
        <ProtectedRoute requiredRole="Unit Head">
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
      <Route path="/unit-head-dashboard">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadDashboard />
        </ProtectedRoute>
      </Route>

      {/* Unit Head specific routes */}
      <Route path="/unit-head/orders">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadOrdersManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/sales">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadSales />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/customers">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/inventory">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadInventoryManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/role-permission-management">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadRolePermissionManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/production-group">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadProductionGroup />
        </ProtectedRoute>
      </Route>
      <Route path="/unit-head/cutoff-time">
        <ProtectedRoute requiredRole="Unit Head">
          <UnitHeadCutoffTime />
        </ProtectedRoute>
      </Route>

      {/* Unit Manager specific routes with dedicated layout */}
      <Route path="/unit-manager/dashboard">
        <UnitManagerProtectedRoute requiredRole="Unit Manager">
          <UnitManagerDashboard />
        </UnitManagerProtectedRoute>
      </Route>

      <Route path="/unit-manager/indent-summary">
        <UnitManagerProtectedRoute requiredRole="Unit Manager">
          <SalesApproval />
        </UnitManagerProtectedRoute>
      </Route>

      <Route path="/unit-manager/sales-order-list">
        <UnitManagerProtectedRoute requiredRole="Unit Manager">
          <SalesOrderList />
        </UnitManagerProtectedRoute>
      </Route>
      <Route path="/unit-manager/production-group">
        <UnitManagerProtectedRoute requiredRole="Unit Manager">
          <UnitManagerProductionGroup />
        </UnitManagerProtectedRoute>
      </Route>

      <Route path="/unit-manager/returns">
        <UnitManagerProtectedRoute requiredRole="Unit Manager">
          <UnitManagerReturns />
        </UnitManagerProtectedRoute>
      </Route>

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
      <Route path="/accounts/sales">
        <ProtectedRoute requiredRole="Accounts">
          <AccountsSales />
        </ProtectedRoute>
      </Route>

      {/* Sales Account Module (New Routes) */}
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

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
