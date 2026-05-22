import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Building2,
  Mail,
  Shield,
  Users,
  Database,
  Bell,
  Palette,
  Globe,
  Lock,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Upload
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState('company');
  const [isLogoUploadOpen, setIsLogoUploadOpen] = useState(false);
  const [formData, setFormData] = useState({}); // Store form changes
  const [hasChanges, setHasChanges] = useState(false); // Track if there are unsaved changes
  const [selectedLogo, setSelectedLogo] = useState(null); // Store selected logo file
  const [logoPreview, setLogoPreview] = useState(null); // Store logo preview URL
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest('GET', '/api/settings'),
    retry: 1
  });

  const settings = settingsData?.data || {};

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: ({ section, data }) => {
      console.log(`Making API call for ${section}:`, data);
      if (section === 'notifications') {
        return apiRequest('PUT', '/api/settings/notifications', data);
      } else if (section === 'company') {
        return apiRequest('PUT', '/api/settings/company', data);
      } else if (section === 'system') {
        return apiRequest('PUT', '/api/settings/system', data);
      }
      return apiRequest('PUT', `/api/settings/${section}`, data);
    },
    onSuccess: (response, { section }) => {
      console.log(`${section} settings update successful:`, response);
      queryClient.invalidateQueries(['settings']);
      // Force refetch to get updated data
      refetch();
      showSmartToast('success', 'Settings updated successfully');
    },
    onError: (error) => {
      console.error('Settings update error:', error);
      showSmartToast('error', `Failed to update settings: ${error.message}`);
    }
  });

  // Company logo upload mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      console.log('Uploading file:', file.name, file.size, file.type);
      console.log('FormData created with file:', formData.get('logo'));
      
      // Use apiRequest without custom headers to let browser handle FormData headers
      return apiRequest('POST', '/api/settings/company/logo', formData);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['settings']);
      handleLogoDialogClose();
      showSmartToast('success', 'Company logo updated successfully');
      console.log('Logo upload success:', response);
    },
    onError: (error) => {
      console.error('Logo upload error:', error);
      showSmartToast('error', `Failed to upload logo: ${error.message}`);
    }
  });

  const handleUpdateSettings = (section, data) => {
    console.log(`Updating ${section} settings with:`, data);
    updateSettingsMutation.mutate({ section, data });
    // Clear form data after successful update
    setFormData(prev => ({
      ...prev,
      [section]: {}
    }));
    setHasChanges(false);
  };

  const handleFieldChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleUpdateButtonClick = () => {
    if (activeTab === 'notifications') {
      handleUpdateSettings('notifications', { roleNotifications: formData.notifications });
    } else {
      const sectionData = {
        ...settings[activeTab],
        ...formData[activeTab]
      };
      handleUpdateSettings(activeTab, sectionData);
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showSmartToast('error', 'Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showSmartToast('error', 'File size too large. Please select an image smaller than 5MB.');
        return;
      }
      
      setSelectedLogo(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleLogoSubmit = () => {
    if (selectedLogo) {
      console.log('Submitting logo file:', selectedLogo);
      logoUploadMutation.mutate(selectedLogo); // Pass the file directly
    } else {
      showSmartToast('error', 'Please select a file first');
    }
  };
  
  const handleLogoDialogClose = () => {
    setIsLogoUploadOpen(false);
    setSelectedLogo(null);
    setLogoPreview(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'system', label: 'System', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Super Admin - System Settings</h1>
          <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start h-10"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </Button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {/* Company Settings */}
          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Manage your company's basic information and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      value={formData.company?.name ?? settings.company?.name ?? ''} 
                      placeholder="Enter company name"
                      onChange={(e) => handleFieldChange('company', 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      value={formData.company?.email ?? settings.company?.contact?.email ?? ''} 
                      placeholder="Enter company email"
                      onChange={(e) => handleFieldChange('company', 'email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea 
                    value={formData.company?.address ?? settings.company?.address?.street ?? ''} 
                    placeholder="Enter company address"
                    onChange={(e) => handleFieldChange('company', 'address', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={formData.company?.phone ?? settings.company?.contact?.phone ?? ''} 
                      placeholder="Enter phone number"
                      onChange={(e) => handleFieldChange('company', 'phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      value={formData.company?.website ?? settings.company?.contact?.website ?? ''} 
                      placeholder="https://www.example.com"
                      onChange={(e) => handleFieldChange('company', 'website', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="space-y-4">
                    {/* Current Logo Display */}
                    {settings.company?.logo ? (
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">Current Logo:</div>
                        <img 
                          src={settings.company.logo.startsWith('/') ? `http://localhost:5000${settings.company.logo}` : settings.company.logo}
                          alt="Company Logo" 
                          className="h-20 w-20 object-contain border rounded-lg shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No logo uploaded yet</div>
                    )}
                    
                    {/* Upload Button */}
                    <Button onClick={() => setIsLogoUploadOpen(true)} variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      {settings.company?.logo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>

                {/* Update Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => {
                      // Properly structure the data according to backend expectations
                      const sectionData = {
                        name: formData.company?.name ?? settings.company?.name,
                        email: formData.company?.email ?? settings.company?.contact?.email,
                        logo: settings.company?.logo, // Keep existing logo
                        address: formData.company?.address ?? settings.company?.address?.street,
                        phone: formData.company?.phone ?? settings.company?.contact?.phone,
                        website: formData.company?.website ?? settings.company?.contact?.website,
                        gstNumber: settings.company?.gstNumber,
                        panNumber: settings.company?.panNumber
                      };
                      console.log('Sending company update data:', sectionData);
                      handleUpdateSettings('company', sectionData);
                    }}
                    disabled={updateSettingsMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateSettingsMutation.isLoading ? 'Updating...' : 'Update Company'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={formData.system?.currency ?? settings.system?.currency ?? 'INR'} onValueChange={(value) => handleFieldChange('system', 'currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                        <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={formData.system?.timezone ?? settings.system?.timezone ?? 'Asia/Kolkata'} onValueChange={(value) => handleFieldChange('system', 'timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select value={formData.system?.dateFormat ?? settings.system?.dateFormat ?? 'DD/MM/YYYY'} onValueChange={(value) => handleFieldChange('system', 'dateFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Update Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => {
                      const sectionData = {
                        ...settings.system,
                        ...formData.system
                      };
                      handleUpdateSettings('system', sectionData);
                    }}
                    disabled={updateSettingsMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateSettingsMutation.isLoading ? 'Updating...' : 'Update System'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Role-Based Notification Settings
                </CardTitle>
                <CardDescription>
                  Enable or disable notifications for each user role. When disabled, users of that role won't receive any notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { role: 'Sales Person', key: 'salesPerson', description: 'Sales representatives and field agents' },
                    { role: 'Unit Head', key: 'unitHead', description: 'Unit managers and supervisors' },
                    { role: 'Unit Manager', key: 'unitManager', description: 'Department and unit managers' },
                    { role: 'Production', key: 'production', description: 'Production staff and managers' },
                    { role: 'Accounts', key: 'accounts', description: 'Accounting and finance team' },
                    { role: 'Superadmin', key: 'superAdmin', description: 'System administrators' }
                  ].map((roleInfo) => (
                    <div key={roleInfo.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{roleInfo.role}</h3>
                        <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          (formData.notifications?.[roleInfo.key]?.enabled ?? settings.notifications?.roleSettings?.[roleInfo.key]?.enabled) !== false 
                            ? 'default' 
                            : 'secondary'
                        }>
                          {(formData.notifications?.[roleInfo.key]?.enabled ?? settings.notifications?.roleSettings?.[roleInfo.key]?.enabled) !== false ? 'Active' : 'Disabled'}
                        </Badge>
                        <Switch 
                          checked={(formData.notifications?.[roleInfo.key]?.enabled ?? settings.notifications?.roleSettings?.[roleInfo.key]?.enabled) !== false}
                          onCheckedChange={(checked) => {
                            handleFieldChange('notifications', roleInfo.key, { enabled: checked });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Update Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => {
                      handleUpdateSettings('notifications', { roleNotifications: formData.notifications });
                    }}
                    disabled={updateSettingsMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateSettingsMutation.isLoading ? 'Updating...' : 'Update Notifications'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other settings tabs */}
          {!['company', 'system', 'notifications'].includes(activeTab) && (
            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  This settings section is under development.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Security settings will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Logo Upload Dialog */}
      <Dialog open={isLogoUploadOpen} onOpenChange={handleLogoDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Company Logo</DialogTitle>
            <DialogDescription>
              Select an image file to use as your company logo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Format and Size Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-900 mb-1">Supported formats:</div>
              <div className="text-xs text-blue-700">JPEG, PNG, GIF, WebP</div>
              <div className="text-xs text-blue-700 mt-1">Maximum size: 5MB</div>
              <div className="text-xs text-blue-700">Recommended: 200x200px or larger</div>
            </div>
            
            {/* File Input */}
            <Input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleLogoUpload}
              disabled={logoUploadMutation.isLoading}
            />
            
            {/* Preview */}
            {logoPreview && (
              <div className="space-y-2">
                <Label>Preview:</Label>
                <div className="flex justify-center p-4 border rounded-lg bg-gray-50">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="h-24 w-24 object-contain"
                  />
                </div>
                {selectedLogo && (
                  <div className="text-xs text-muted-foreground text-center">
                    {selectedLogo.name} ({(selectedLogo.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleLogoDialogClose}>
              Cancel
            </Button>
            {selectedLogo && (
              <Button 
                onClick={handleLogoSubmit}
                disabled={logoUploadMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {logoUploadMutation.isLoading ? 'Uploading...' : 'Upload Logo'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
