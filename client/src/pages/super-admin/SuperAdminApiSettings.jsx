import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  RefreshCw,
  Save,
  Settings,
  Globe,
  PhoneCall,
  Key,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Users,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem('token');

const apiFetch = (url, options = {}) => {
  const token = getToken();
  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  });
};

export default function SuperAdminApiSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('acefone');
  const [showApiKey, setShowApiKey] = useState(false);
  const [visibleIndiamartKeys, setVisibleIndiamartKeys] = useState({});

  const [ivrForm, setIvrForm] = useState({
    enabled: false,
    apiKey: '',
    callerID: '',
  });

  const [indiamartForm, setIndiamartForm] = useState({
    enabled: false,
    accounts: [],
  });

  const [websiteForm, setWebsiteForm] = useState({
    enabled: false,
    apiKey: '',
  });

  // Fetch API Settings
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-api-settings'],
    queryFn: () => apiFetch('/super-admin/api-settings'),
  });

  // Fetch all companies for context
  const { data: companiesData } = useQuery({
    queryKey: ['companies-dropdown'],
    queryFn: () => apiFetch('/super-admin/companies/dropdown'),
  });

  const companies = companiesData?.companies || [];

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setIvrForm({
        enabled: s.ivr?.enabled || false,
        apiKey: s.ivr?.apiKey || '',
        callerID: s.ivr?.callerID || '',
      });
      let accounts = s.indiamart?.accounts || [];
      if (accounts.length === 0 && (s.indiamart?.sellerMobile || s.indiamart?.authKey)) {
        accounts = [{
          apiName: 'Primary Account',
          sellerMobile: s.indiamart.sellerMobile || '',
          authKey: s.indiamart.authKey || '',
          lastSyncedAt: s.indiamart.lastSyncedAt
        }];
      }
      setIndiamartForm({
        enabled: s.indiamart?.enabled || false,
        accounts: accounts,
      });
      setWebsiteForm({
        enabled: s.website?.enabled || false,
        apiKey: s.website?.apiKey || '',
      });
    }
  }, [settingsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => apiFetch('/super-admin/api-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-api-settings'] });
      toast({ title: 'Settings Saved', description: 'API integration settings updated successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSaveAcefone = () => {
    const current = settingsData?.settings || {};
    saveMutation.mutate({
      ivr: {
        ...current.ivr,
        enabled: ivrForm.enabled,
        apiKey: ivrForm.apiKey.trim(),
        callerID: ivrForm.callerID.trim(),
      },
      indiamart: current.indiamart,
      website: current.website,
    });
  };

  const handleSaveIndiamart = () => {
    const current = settingsData?.settings || {};
    const cleanedAccounts = indiamartForm.accounts.map(acc => ({
      apiName: (acc.apiName || '').trim(),
      sellerMobile: (acc.sellerMobile || '').trim(),
      authKey: (acc.authKey || '').trim(),
      lastSyncedAt: acc.lastSyncedAt
    }));

    saveMutation.mutate({
      ivr: current.ivr,
      indiamart: {
        ...current.indiamart,
        enabled: indiamartForm.enabled,
        accounts: cleanedAccounts,
        sellerMobile: cleanedAccounts[0]?.sellerMobile || '',
        authKey: cleanedAccounts[0]?.authKey || '',
      },
      website: current.website,
    });
  };

  const handleSaveWebsite = () => {
    const current = settingsData?.settings || {};
    saveMutation.mutate({
      ivr: current.ivr,
      indiamart: current.indiamart,
      website: {
        ...current.website,
        enabled: websiteForm.enabled,
        apiKey: websiteForm.apiKey.trim(),
      },
    });
  };

  const tabs = [
    { id: 'acefone', label: 'Acefone IVR', icon: PhoneCall },
    { id: 'indiamart', label: 'IndiaMART', icon: Globe },
    { id: 'website', label: 'Website Webhook', icon: Zap },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading API Settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            API Integration Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage Acefone IVR calling, IndiaMART lead fetch, and website webhook integrations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">How this works:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li><strong>Acefone IVR:</strong> Add API Key + Caller ID here. Sales employees add their own IVR extension number in their HRMS profile.</li>
            <li><strong>IndiaMART:</strong> Add company Seller Mobile here. Leads auto-fetch every 10 mins and go to Cruncher (unassigned) for review.</li>
            <li><strong>Website Webhook:</strong> Add API key for your website contact form integration.</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Tab Navigation */}
        <div className="w-52 shrink-0">
          <Card>
            <CardContent className="p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Status Cards */}
          <div className="mt-4 space-y-2">
            <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              ivrForm.enabled && ivrForm.apiKey
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${ivrForm.enabled && ivrForm.apiKey ? 'bg-green-500' : 'bg-gray-400'}`} />
              Acefone {ivrForm.enabled && ivrForm.apiKey ? 'Active' : 'Inactive'}
            </div>
            <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              indiamartForm.enabled && indiamartForm.accounts?.some(acc => acc.sellerMobile && acc.authKey)
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${indiamartForm.enabled && indiamartForm.accounts?.some(acc => acc.sellerMobile && acc.authKey) ? 'bg-orange-500' : 'bg-gray-400'}`} />
              IndiaMART {indiamartForm.enabled && indiamartForm.accounts?.some(acc => acc.sellerMobile && acc.authKey) ? 'Active' : 'Inactive'}
            </div>
            <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              websiteForm.enabled && websiteForm.apiKey
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${websiteForm.enabled && websiteForm.apiKey ? 'bg-purple-500' : 'bg-gray-400'}`} />
              Website {websiteForm.enabled && websiteForm.apiKey ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {/* ═══════════════════ ACEFONE IVR ═══════════════════ */}
          {activeTab === 'acefone' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PhoneCall className="h-5 w-5 text-blue-600" />
                  Acefone IVR Configuration
                </CardTitle>
                <CardDescription>
                  Configure click-to-call API. The Caller ID (company number shown to customers) is set here.
                  Each Sales Employee sets their own IVR extension in their HRMS profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable Acefone IVR</p>
                    <p className="text-sm text-gray-500">Turn on click-to-call functionality for Sales team</p>
                  </div>
                  <Switch
                    checked={ivrForm.enabled}
                    onCheckedChange={(v) => setIvrForm({ ...ivrForm, enabled: v })}
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Acefone API Key <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter your Acefone API Key"
                      value={ivrForm.apiKey}
                      onChange={(e) => setIvrForm({ ...ivrForm, apiKey: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get this from your Acefone dashboard → API Settings.
                  </p>
                </div>

                {/* Caller ID */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Company Caller ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 9240246800 (Number shown to customers)"
                    value={ivrForm.callerID}
                    onChange={(e) => setIvrForm({ ...ivrForm, callerID: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    This is the outbound number customers will see when Sales calls them. Usually your company's main number.
                  </p>
                </div>

                {/* How it works */}
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2">
                  <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    How IVR calling works:
                  </p>
                  <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1">
                    <li>Super Admin sets API Key + Caller ID here (company-level)</li>
                    <li>HR-Admin sets each Sales Employee's IVR Extension in their HRMS profile</li>
                    <li>Sales Employee clicks "Call" on a lead → their phone rings first</li>
                    <li>When they pick up, system connects them to the customer</li>
                    <li>Customer sees the Caller ID (company number) — not the agent's personal number</li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAcefone}
                    disabled={saveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Acefone Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ INDIAMART ═══════════════════ */}
          {activeTab === 'indiamart' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                  IndiaMART Lead Fetch
                </CardTitle>
                <CardDescription>
                  Configure IndiaMART seller credentials. Leads auto-fetch every 10 minutes and go to Cruncher (unassigned) for review and assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable IndiaMART Sync</p>
                    <p className="text-sm text-gray-500">Automatically fetch leads from IndiaMART every 10 minutes</p>
                  </div>
                  <Switch
                    checked={indiamartForm.enabled}
                    onCheckedChange={(v) => setIndiamartForm({ ...indiamartForm, enabled: v })}
                  />
                </div>

                {/* IndiaMART Accounts List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Label className="text-base font-semibold text-gray-900">
                      Configure IndiaMART Accounts
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIndiamartForm(prev => ({
                          ...prev,
                          accounts: [
                            ...(prev.accounts || []),
                            { apiName: '', sellerMobile: '', authKey: '', lastSyncedAt: null }
                          ]
                        }));
                      }}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      + Add Account
                    </Button>
                  </div>

                  {!indiamartForm.accounts || indiamartForm.accounts.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-xl bg-gray-50 text-gray-500 text-sm">
                      No IndiaMART accounts configured yet. Click "+ Add Account" to add one.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {indiamartForm.accounts.map((account, index) => (
                        <div key={index} className="p-4 border rounded-xl bg-gray-50/50 space-y-4 relative">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Account #{index + 1}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIndiamartForm(prev => ({
                                  ...prev,
                                  accounts: prev.accounts.filter((_, i) => i !== index)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Account Label */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-700">Account Label / Name</Label>
                              <Input
                                placeholder="e.g. IndiaMART Samtek"
                                value={account.apiName || ''}
                                onChange={(e) => {
                                  const updated = [...indiamartForm.accounts];
                                  updated[index] = { ...updated[index], apiName: e.target.value };
                                  setIndiamartForm(prev => ({ ...prev, accounts: updated }));
                                }}
                              />
                            </div>

                            {/* Seller Mobile */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-700">Seller Mobile *</Label>
                              <Input
                                placeholder="e.g. 7042115971"
                                value={account.sellerMobile || ''}
                                onChange={(e) => {
                                  const updated = [...indiamartForm.accounts];
                                  updated[index] = { ...updated[index], sellerMobile: e.target.value };
                                  setIndiamartForm(prev => ({ ...prev, accounts: updated }));
                                }}
                              />
                            </div>

                            {/* Auth Key */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-700">API Key / Auth Key *</Label>
                              <div className="relative">
                                <Input
                                  type={visibleIndiamartKeys[index] ? 'text' : 'password'}
                                  placeholder="Enter IndiaMART API Key"
                                  value={account.authKey || ''}
                                  onChange={(e) => {
                                    const updated = [...indiamartForm.accounts];
                                    updated[index] = { ...updated[index], authKey: e.target.value };
                                    setIndiamartForm(prev => ({ ...prev, accounts: updated }));
                                  }}
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisibleIndiamartKeys(prev => ({
                                      ...prev,
                                      [index]: !prev[index]
                                    }));
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                  {visibleIndiamartKeys[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Webhook URL — register this in IndiaMART's Lead Manager /
                              CRM Integration push settings so leads arrive here in real
                              time, instead of relying on the 10-min poll (which needs
                              this server's IP whitelisted with IndiaMART to work at all). */}
                          {account.authKey && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-gray-700">Webhook URL (give this to IndiaMART / your account manager)</Label>
                              <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs text-gray-700 break-all">
                                {`${window.location.origin}/api/leads/indiamart-webhook?q=${account.authKey}`}
                              </div>
                            </div>
                          )}

                          {account.lastSyncedAt && (
                            <div className="text-xs text-green-700 flex items-center gap-1.5 mt-2 bg-green-50/50 p-2 rounded border border-green-100">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              Last Synced: {new Date(account.lastSyncedAt).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last sync info */}
                {settingsData?.settings?.indiamart?.lastSyncedAt && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Last synced: {new Date(settingsData.settings.indiamart.lastSyncedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Lead Flow explanation */}
                <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 space-y-2">
                  <p className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    IndiaMART Lead Flow (Cruncher Model):
                  </p>
                  <ol className="text-xs text-orange-800 list-decimal list-inside space-y-1">
                    <li>IndiaMART sends enquiries to the configured Seller Mobile accounts</li>
                    <li>System fetches them every 10 minutes automatically</li>
                    <li>All leads saved as <strong>Unassigned</strong> (no auto-assignment)</li>
                    <li><strong>Cruncher</strong> (designation) sees all unassigned leads, reviews them</li>
                    <li>Cruncher assigns genuine leads to Sales Employees manually</li>
                    <li>Sales Employee sees only their assigned leads</li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveIndiamart}
                    disabled={saveMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save IndiaMART Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ WEBSITE WEBHOOK ═══════════════════ */}
          {activeTab === 'website' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Website Webhook
                </CardTitle>
                <CardDescription>
                  Connect your website contact forms to automatically create leads in the CRM.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable Website Webhook</p>
                    <p className="text-sm text-gray-500">Accept leads from your website contact form</p>
                  </div>
                  <Switch
                    checked={websiteForm.enabled}
                    onCheckedChange={(v) => setWebsiteForm({ ...websiteForm, enabled: v })}
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Webhook API Key
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter or generate a webhook secret key"
                      value={websiteForm.apiKey}
                      onChange={(e) => setWebsiteForm({ ...websiteForm, apiKey: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Your website sends this key with every form submission for authentication.
                  </p>
                </div>

                {/* Webhook URL */}
                {websiteForm.apiKey && (
                  <div className="space-y-2">
                    <Label>Your Webhook URL (share with web developer)</Label>
                    <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs text-gray-700 break-all">
                      {`${window.location.origin}/api/leads/website-webhook?q=${websiteForm.apiKey}`}
                    </div>
                    <p className="text-xs text-gray-500">POST to this URL with: name, mobile, email, product_service, describe_requirement, city, state</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveWebsite}
                    disabled={saveMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Website Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
