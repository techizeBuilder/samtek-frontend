import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { ProductionProvider } from '@/contexts/ProductionContext';
import ProductionDashboard from '@/pages/production/ProductionDashboard';
import ProductionReports from '@/pages/production/ProductionReports';
import ProductionGroup from '@/pages/production/ProductionGroup';
import ProductionShift from '@/pages/production/ProductionShift';
import OrderManagement from '@/pages/production/OrderManagement';
import WorkPlanning from '@/pages/production/WorkPlanning';
import JobCards from '@/pages/production/JobCards';
import ProcessExecution from '@/pages/production/ProcessExecution';
import ManpowerTracking from '@/pages/production/ManpowerTracking';
import ProductionExpenses from '@/pages/production/ProductionExpenses';

export default function ProductionModule() {
  return (
    <ProductionProvider>
      <Switch>
        {/* Production Head routes */}
        <Route path="/production/dashboard"><ProductionDashboard /></Route>
        <Route path="/production/orders"><OrderManagement /></Route>
        <Route path="/production/work-planning"><WorkPlanning /></Route>
        <Route path="/production/job-cards"><JobCards /></Route>
        <Route path="/production/process-execution"><ProcessExecution /></Route>
        <Route path="/production/manpower"><ManpowerTracking /></Route>
        <Route path="/production/reports"><ProductionReports /></Route>
        <Route path="/production/production-group"><ProductionGroup /></Route>
        <Route path="/production/production-sheet"><ProductionShift /></Route>
        <Route path="/production/expenses"><ProductionExpenses /></Route>
        <Route path="/production"><Redirect to="/production/dashboard" /></Route>

        {/* Super Admin production routes */}
        <Route path="/super-admin/production/dashboard"><ProductionDashboard /></Route>
        <Route path="/super-admin/production/orders"><OrderManagement /></Route>
        <Route path="/super-admin/production/work-planning"><WorkPlanning /></Route>
        <Route path="/super-admin/production/job-cards"><JobCards /></Route>
        <Route path="/super-admin/production/process-execution"><ProcessExecution /></Route>
        <Route path="/super-admin/production/manpower"><ManpowerTracking /></Route>
        <Route path="/super-admin/production/reports"><ProductionReports /></Route>
        <Route path="/super-admin/production/production-group"><ProductionGroup /></Route>
        <Route path="/super-admin/production/production-sheet"><ProductionShift /></Route>
        <Route path="/super-admin/production"><Redirect to="/super-admin/production/dashboard" /></Route>

        {/* Unit Head production routes */}
        <Route path="/unit-head/production/dashboard"><ProductionDashboard /></Route>
        <Route path="/unit-head/production/orders"><OrderManagement /></Route>
        <Route path="/unit-head/production/work-planning"><WorkPlanning /></Route>
        <Route path="/unit-head/production/job-cards"><JobCards /></Route>
        <Route path="/unit-head/production/process-execution"><ProcessExecution /></Route>
        <Route path="/unit-head/production/manpower"><ManpowerTracking /></Route>
        <Route path="/unit-head/production/reports"><ProductionReports /></Route>
        <Route path="/unit-head/production/production-group"><ProductionGroup /></Route>
        <Route path="/unit-head/production/production-sheet"><ProductionShift /></Route>
        <Route path="/unit-head/production"><Redirect to="/unit-head/production/dashboard" /></Route>
      </Switch>
    </ProductionProvider>
  );
}
