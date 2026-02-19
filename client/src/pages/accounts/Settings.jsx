import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save, Lock, Bell, Database, Eye, EyeOff } from 'lucide-react';

const AccountsSettings = () => {
  const [settings, setSettings] = useState({
    companyName: 'Your Company Name',
    fiscalYearStart: '2024-04-01',
    fiscalYearEnd: '2025-03-31',
    currency: 'INR',
    decimalPlaces: '2',
    autoReconciliation: true,
    emailNotifications: true,
    monthlyReportEmail: true,
    gstCompliance: true,
    tdsDeduction: true,
    budgetTracking: true,
    costCenterTracking: false,
    profitCenterTracking: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Accounts Settings</h1>
          <p className="text-gray-600 mt-2">Configure your accounting module preferences</p>
        </div>

        {/* Basic Settings */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Basic Settings
            </CardTitle>
            <CardDescription>Company and fiscal information</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <Input
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleInputChange}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Year Start</label>
                <Input
                  name="fiscalYearStart"
                  type="date"
                  value={settings.fiscalYearStart}
                  onChange={handleInputChange}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Year End</label>
                <Input
                  name="fiscalYearEnd"
                  type="date"
                  value={settings.fiscalYearEnd}
                  onChange={handleInputChange}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Decimal Places</label>
                <Input
                  name="decimalPlaces"
                  type="number"
                  value={settings.decimalPlaces}
                  onChange={handleInputChange}
                  className="h-10"
                  min="0"
                  max="4"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Settings */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Feature Settings
            </CardTitle>
            <CardDescription>Enable or disable accounting features</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Row 1 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Auto Reconciliation</p>
                  <p className="text-sm text-gray-600">Automatically reconcile accounts</p>
                </div>
                <Switch
                  checked={settings.autoReconciliation}
                  onChange={() => handleToggle('autoReconciliation')}
                />
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">GST Compliance</p>
                  <p className="text-sm text-gray-600">Track GST compliance requirements</p>
                </div>
                <Switch
                  checked={settings.gstCompliance}
                  onChange={() => handleToggle('gstCompliance')}
                />
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">TDS Deduction</p>
                  <p className="text-sm text-gray-600">Enable TDS deduction tracking</p>
                </div>
                <Switch
                  checked={settings.tdsDeduction}
                  onChange={() => handleToggle('tdsDeduction')}
                />
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Budget Tracking</p>
                  <p className="text-sm text-gray-600">Track budgets against expenses</p>
                </div>
                <Switch
                  checked={settings.budgetTracking}
                  onChange={() => handleToggle('budgetTracking')}
                />
              </div>

              {/* Row 5 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Cost Center Tracking</p>
                  <p className="text-sm text-gray-600">Enable cost center allocations</p>
                </div>
                <Switch
                  checked={settings.costCenterTracking}
                  onChange={() => handleToggle('costCenterTracking')}
                />
              </div>

              {/* Row 6 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Profit Center Tracking</p>
                  <p className="text-sm text-gray-600">Enable profit center allocations</p>
                </div>
                <Switch
                  checked={settings.profitCenterTracking}
                  onChange={() => handleToggle('profitCenterTracking')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Row 1 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive email alerts for important transactions</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                />
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Monthly Report Email</p>
                  <p className="text-sm text-gray-600">Receive monthly financial reports via email</p>
                </div>
                <Switch
                  checked={settings.monthlyReportEmail}
                  onChange={() => handleToggle('monthlyReportEmail')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage access and permissions</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  className="h-10 pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Account Locked:</strong> Your account is protected with two-factor authentication. Last login: Feb 16, 2025
              </p>
            </div>

            <Button variant="outline" className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Save Settings */}
        <div className="flex gap-3">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white flex-1">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>

        {/* Last Updated Info */}
        <div className="mt-6 p-4 bg-slate-100 rounded-lg">
          <p className="text-sm text-gray-600">
            Last updated: February 16, 2025 at 10:30 AM
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountsSettings;
