import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings as SettingsIcon, 
  Save, 
  Building, 
  Globe, 
  Mail, 
  Shield,
  Bell,
  Upload,
  Image
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings data
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    enabled: true
  });

  // State for each settings section
  const [companyData, setCompanyData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    gstNumber: ''
  });

  const [systemData, setSystemData] = useState({
    currency: 'USD',
    timezone: 'Eastern Time',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12 Hour'
  });

  const [emailData, setEmailData] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: ''
  });

  const [moduleSettings, setModuleSettings] = useState({
    dashboard: true,
    manufacturing: true,
    sales: true,
    inventory: true,
    suppliers: true,
    orders: true,
    dispatches: true,
    accounts: true,
    customers: true,
    purchases: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    lowStock: true,
    orderDelay: true,
    paymentDue: true,
    productionAlert: true
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Update state when data is loaded
  useEffect(() => {
    if (settingsData?.settings) {
      const settings = settingsData.settings;
      
      if (settings.company) {
        setCompanyData({
          name: settings.company.name || '',
          address: {
            street: settings.company.address?.street || '',
            city: settings.company.address?.city || '',
            state: settings.company.address?.state || '',
            zipCode: settings.company.address?.zipCode || ''
          },
          contact: {
            phone: settings.company.contact?.phone || '',
            email: settings.company.contact?.email || '',
            website: settings.company.contact?.website || ''
          },
          gstNumber: settings.company.gstNumber || ''
        });
        
        if (settings.company.logo) {
          setLogoPreview(settings.company.logo);
        }
      }

      if (settings.system) {
        setSystemData({
          currency: settings.system.currency || 'USD',
          timezone: settings.system.timezone || 'Eastern Time',
          dateFormat: settings.system.dateFormat || 'MM/DD/YYYY',
          timeFormat: settings.system.timeFormat || '12 Hour'
        });
      }

      if (settings.email) {
        setEmailData({
          smtpHost: settings.email.smtpHost || '',
          smtpPort: settings.email.smtpPort || 587,
          smtpUser: settings.email.smtpUser || '',
          smtpPassword: '', // Don't show password
          fromEmail: settings.email.fromEmail || '',
          fromName: settings.email.fromName || ''
        });
      }

      if (settings.modules) {
        setModuleSettings({
          dashboard: settings.modules.dashboard ?? true,
          manufacturing: settings.modules.manufacturing ?? true,
          sales: settings.modules.sales ?? true,
          inventory: settings.modules.inventory ?? true,
          suppliers: settings.modules.suppliers ?? true,
          orders: settings.modules.orders ?? true,
          dispatches: settings.modules.dispatches ?? true,
          accounts: settings.modules.accounts ?? true,
          customers: settings.modules.customers ?? true,
          purchases: settings.modules.purchases ?? true
        });
      }

      if (settings.notifications) {
        setNotificationSettings({
          lowStock: settings.notifications.lowStock ?? true,
          orderDelay: settings.notifications.orderDelay ?? true,
          paymentDue: settings.notifications.paymentDue ?? true,
          productionAlert: settings.notifications.productionAlert ?? true
        });
      }
    }
  }, [settingsData]);

  // Mutations for different settings sections
  const companyMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', '/api/settings/company', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showSmartToast({ message: 'Company settings updated successfully' }, 'settings_update');
    },
    onError: (error) => {
      showSmartToast(error, 'settings_update');
    },
  });

  const systemMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', '/api/settings/system', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showSmartToast({ message: 'System settings updated successfully' }, 'settings_update');
    },
    onError: (error) => {
      showSmartToast(error, 'settings_update');
    },
  });

  const emailMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', '/api/settings/email', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showSmartToast({ message: 'Email settings updated successfully' }, 'settings_update');
    },
    onError: (error) => {
      showSmartToast(error, 'settings_update');
    },
  });

  const modulesMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', '/api/settings/modules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showSmartToast({ message: 'Module settings updated successfully' }, 'settings_update');
    },
    onError: (error) => {
      showSmartToast(error, 'settings_update');
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', '/api/settings/notifications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      showSmartToast({ message: 'Notification settings updated successfully' }, 'settings_update');
    },
    onError: (error) => {
      showSmartToast(error, 'settings_update');
    },
  });

  const logoMutation = useMutation({
    mutationFn: (formData) => {
      console.log('Uploading logo...');
      return fetch('/api/settings/company/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      }).then(res => {
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      });
    },
    onSuccess: (data) => {
      console.log('Logo upload success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setLogoPreview(data.logoPath);
      setLogoFile(null); // Clear the file input
      showSmartToast({ message: 'Company logo uploaded successfully' }, 'logo_upload');
    },
    onError: (error) => {
      console.error('Logo upload error:', error);
      showSmartToast(error, 'logo_upload');
    },
  });

  // Handle logo file selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Selected logo file:', file);
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle logo upload
  const handleLogoUpload = () => {
    if (logoFile) {
      console.log('Uploading logo file:', logoFile);
      const formData = new FormData();
      formData.append('logo', logoFile);
      console.log('FormData created:', formData);
      logoMutation.mutate(formData);
    } else {
      console.log('No logo file selected');
    }
  };

  // Handle form submissions
  const handleCompanySubmit = () => {
    companyMutation.mutate(companyData);
  };

  const handleSystemSubmit = () => {
    systemMutation.mutate(systemData);
  };

  const handleEmailSubmit = () => {
    emailMutation.mutate(emailData);
  };

  const handleModuleSubmit = () => {
    modulesMutation.mutate(moduleSettings);
  };

  const handleNotificationSubmit = () => {
    notificationsMutation.mutate(notificationSettings);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Logo */}
              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-16 h-16 rounded border overflow-hidden border-slate-200">
                      <img 
                        src={logoPreview} 
                        alt="Company Logo" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('Settings logo preview error:', e);
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                              <span class="text-gray-400 text-xs">No Preview</span>
                            </div>
                          `;
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-64"
                    />
                    {logoFile && (
                      <Button 
                        onClick={handleLogoUpload}
                        disabled={logoMutation.isPending}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {logoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    placeholder="Enter GST number"
                    value={companyData.gstNumber}
                    onChange={(e) => setCompanyData({...companyData, gstNumber: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  placeholder="Enter street address"
                  value={companyData.address.street}
                  onChange={(e) => setCompanyData({
                    ...companyData, 
                    address: {...companyData.address, street: e.target.value}
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    value={companyData.address.city}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      address: {...companyData.address, city: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="Enter state"
                    value={companyData.address.state}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      address: {...companyData.address, state: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="Enter zip code"
                    value={companyData.address.zipCode}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      address: {...companyData.address, zipCode: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={companyData.contact.phone}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      contact: {...companyData.contact, phone: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Enter email address"
                    value={companyData.contact.email}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      contact: {...companyData.contact, email: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="Enter website URL"
                    value={companyData.contact.website}
                    onChange={(e) => setCompanyData({
                      ...companyData, 
                      contact: {...companyData.contact, website: e.target.value}
                    })}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCompanySubmit}
                disabled={companyMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {companyMutation.isPending ? 'Saving...' : 'Save Company Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={systemData.currency} 
                    onValueChange={(value) => setSystemData({...systemData, currency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD - US Dollar">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR - Euro">EUR - Euro</SelectItem>
                      <SelectItem value="INR - Indian Rupee">INR - Indian Rupee</SelectItem>
                      <SelectItem value="GBP - British Pound">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={systemData.timezone} 
                    onValueChange={(value) => setSystemData({...systemData, timezone: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eastern Time">Eastern Time</SelectItem>
                      <SelectItem value="Central Time">Central Time</SelectItem>
                      <SelectItem value="Mountain Time">Mountain Time</SelectItem>
                      <SelectItem value="Pacific Time">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={systemData.dateFormat} 
                    onValueChange={(value) => setSystemData({...systemData, dateFormat: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select 
                    value={systemData.timeFormat} 
                    onValueChange={(value) => setSystemData({...systemData, timeFormat: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12 Hour">12 Hour</SelectItem>
                      <SelectItem value="24 Hour">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleSystemSubmit}
                disabled={systemMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {systemMutation.isPending ? 'Saving...' : 'Save System Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp@gmail.com"
                    value={emailData.smtpHost}
                    onChange={(e) => setEmailData({...emailData, smtpHost: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    placeholder="587"
                    value={emailData.smtpPort}
                    onChange={(e) => setEmailData({...emailData, smtpPort: parseInt(e.target.value) || 587})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    placeholder="ronak01"
                    value={emailData.smtpUser}
                    onChange={(e) => setEmailData({...emailData, smtpUser: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    placeholder="••••••••"
                    value={emailData.smtpPassword}
                    onChange={(e) => setEmailData({...emailData, smtpPassword: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    placeholder="noreply@company.com"
                    value={emailData.fromEmail}
                    onChange={(e) => setEmailData({...emailData, fromEmail: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    placeholder="Company Name"
                    value={emailData.fromName}
                    onChange={(e) => setEmailData({...emailData, fromName: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                onClick={handleEmailSubmit}
                disabled={emailMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {emailMutation.isPending ? 'Saving...' : 'Save Email Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Settings */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Module Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(moduleSettings).map(([module, enabled]) => (
                  <div key={module} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor={module} className="capitalize font-medium">
                      {module}
                    </Label>
                    <Switch
                      id={module}
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        setModuleSettings({...moduleSettings, [module]: checked})
                      }
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleModuleSubmit}
                disabled={modulesMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {modulesMutation.isPending ? 'Saving...' : 'Save Module Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Low Stock</Label>
                    <p className="text-sm text-gray-500">Receive alerts when inventory is low</p>
                  </div>
                  <Switch
                    checked={notificationSettings.lowStock}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, lowStock: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Order Delay</Label>
                    <p className="text-sm text-gray-500">Get notified of delayed orders</p>
                  </div>
                  <Switch
                    checked={notificationSettings.orderDelay}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, orderDelay: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Payment Due</Label>
                    <p className="text-sm text-gray-500">Receive payment due reminders</p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentDue}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, paymentDue: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Production Alert</Label>
                    <p className="text-sm text-gray-500">Get production status alerts</p>
                  </div>
                  <Switch
                    checked={notificationSettings.productionAlert}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, productionAlert: checked})
                    }
                  />
                </div>
              </div>

              <Button 
                onClick={handleNotificationSubmit}
                disabled={notificationsMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {notificationsMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}