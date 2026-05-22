import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RDProvider } from "@/contexts/RDContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import NotFound from "@/pages/not-found";
import DemoAccounts from "@/pages/DemoAccounts";
import Dashboard from "@/pages/Dashboard";
import InventoryModern from "@/pages/InventoryModern";
import Companies from "@/pages/Companies";
import Profile from "@/pages/Profile";
import RolePermissionManagement from "@/pages/RolePermissionManagement";
import MainLayout from "@/components/layout/MainLayout";
import Sales from "@/pages/Sales";
import Accounts from "@/pages/Accounts";
import Dispatches from "@/pages/Dispatches";
import MyOrders from "@/pages/sales/MyIndent";
import MyCustomers from "@/pages/sales/MyCustomers";
import MyDeliveries from "@/pages/sales/MyDeliveries";
import MyInvoices from "@/pages/sales/MyInvoices";
import MyLedger from "@/pages/sales/MyLedger";
import RefundReturn from "@/pages/sales/RefundReturn";
import SalesDashboard from "@/pages/SalesDashboard";
import RDDashboard from "@/pages/ResearchDevelopment/Dashboard";
import ProductMaster from "@/pages/ResearchDevelopment/ProductMaster";
import DesignApproval from "@/pages/ResearchDevelopment/DesignApproval";
import BOMManagement from "@/pages/ResearchDevelopment/BOMManagement";
import ToolProcess from "@/pages/ResearchDevelopment/ToolProcess";
import Prototype from "@/pages/ResearchDevelopment/Prototype";
import ChangeManagement from "@/pages/ResearchDevelopment/ChangeManagement";
import QualityParameters from "@/pages/ResearchDevelopment/QualityParameters";
import Documentation from "@/pages/ResearchDevelopment/Documentation";

function ProtectedRoute({ component: Component, ...props }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <DemoAccounts />;
  }

  return (
    <MainLayout>
      <Component {...props} />
    </MainLayout>
  );
}

function RoleDashboard() {
  const { user } = useAuth();
  
  // Show Sales Dashboard for Sales role users
  if (user?.role === 'Sales') {
    return <SalesDashboard />;
  }
  
  // Show regular Dashboard for all other roles
  return <Dashboard />;
}

function Router() {
  return (
    <Switch>
      {/* Sales Submodules - specific routes first */}
      <Route path="/sales/orders">
        <ProtectedRoute component={MyOrders} />
      </Route>
      <Route path="/sales/my-customers">
        <ProtectedRoute component={MyCustomers} />
      </Route>
      <Route path="/sales/my-deliveries">
        <ProtectedRoute component={MyDeliveries} />
      </Route>
      <Route path="/sales/my-invoices">
        <ProtectedRoute component={MyInvoices} />
      </Route>
      <Route path="/sales/my-ledger">
        <ProtectedRoute component={MyLedger} />
      </Route>
      <Route path="/sales/refund-return">
        <ProtectedRoute component={RefundReturn} />
      </Route>
      
      {/* Main module routes */}
      <Route path="/sales">
        <ProtectedRoute component={Sales} />
      </Route>
      <Route path="/accounts">
        <ProtectedRoute component={Accounts} />
      </Route>
      <Route path="/dispatches">
        <ProtectedRoute component={Dispatches} />
      </Route>
      
      {/* R&D Module Routes */}
      <Route path="/r&d/dashboard">
        <ProtectedRoute component={RDDashboard} />
      </Route>
      <Route path="/r&d/product-master">
        <ProtectedRoute component={ProductMaster} />
      </Route>
      <Route path="/r&d/design-approval">
        <ProtectedRoute component={DesignApproval} />
      </Route>
      <Route path="/r&d/bom-management">
        <ProtectedRoute component={BOMManagement} />
      </Route>
      <Route path="/r&d/tool-process">
        <ProtectedRoute component={ToolProcess} />
      </Route>
      <Route path="/r&d/prototype">
        <ProtectedRoute component={Prototype} />
      </Route>
      <Route path="/r&d/change-management">
        <ProtectedRoute component={ChangeManagement} />
      </Route>
      <Route path="/r&d/quality-parameters">
        <ProtectedRoute component={QualityParameters} />
      </Route>
      <Route path="/r&d/documentation">
        <ProtectedRoute component={Documentation} />
      </Route>

      {/* Other routes */}
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/role-permission-management">
        <ProtectedRoute component={RolePermissionManagement} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={InventoryModern} />
      </Route>
      <Route path="/companies">
        <ProtectedRoute component={Companies} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={RoleDashboard} />
      </Route>
      
      <Route path="/">
        <ProtectedRoute component={RoleDashboard} />
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  // Monitor network status for smart notifications
  useNetworkStatus();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RDProvider>
            <Router />
            <Toaster />
          </RDProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
