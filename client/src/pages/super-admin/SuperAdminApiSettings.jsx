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
  Megaphone,
  Facebook,
  MessageCircle,
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

  const [googleAdsForm, setGoogleAdsForm] = useState({
    enabled: false,
    webhookKey: '',
  });
  const [showGoogleAdsKey, setShowGoogleAdsKey] = useState(false);

  const [facebookForm, setFacebookForm] = useState({
    enabled: false,
    verifyToken: '',
    pageAccessToken: '',
    pageId: '',
  });
  const [showFbVerifyToken, setShowFbVerifyToken] = useState(false);
  const [showFbPageToken, setShowFbPageToken] = useState(false);

  const [whatsappForm, setWhatsappForm] = useState({
    enabled: false,
    phoneNumberId: '',
    accessToken: '',
  });
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

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
      setGoogleAdsForm({
        enabled: s.googleAds?.enabled || false,
        webhookKey: s.googleAds?.webhookKey || '',
      });
      setFacebookForm({
        enabled: s.facebook?.enabled || false,
        verifyToken: s.facebook?.verifyToken || '',
        pageAccessToken: s.facebook?.pageAccessToken || '',
        pageId: s.facebook?.pageId || '',
      });
      setWhatsappForm({
        enabled: s.whatsapp?.enabled || false,
        phoneNumberId: s.whatsapp?.phoneNumberId || '',
        accessToken: s.whatsapp?.accessToken || '',
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
      googleAds: current.googleAds,
      facebook: current.facebook,
      whatsapp: current.whatsapp,
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
      googleAds: current.googleAds,
      facebook: current.facebook,
      whatsapp: current.whatsapp,
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
      googleAds: current.googleAds,
      facebook: current.facebook,
      whatsapp: current.whatsapp,
    });
  };

  const handleSaveGoogleAds = () => {
    const current = settingsData?.settings || {};
    saveMutation.mutate({
      ivr: current.ivr,
      indiamart: current.indiamart,
      website: current.website,
      googleAds: {
        ...current.googleAds,
        enabled: googleAdsForm.enabled,
        webhookKey: googleAdsForm.webhookKey.trim(),
      },
      facebook: current.facebook,
      whatsapp: current.whatsapp,
    });
  };

  const handleSaveFacebook = () => {
    const current = settingsData?.settings || {};
    saveMutation.mutate({
      ivr: current.ivr,
      indiamart: current.indiamart,
      website: current.website,
      googleAds: current.googleAds,
      facebook: {
        ...current.facebook,
        enabled: facebookForm.enabled,
        verifyToken: facebookForm.verifyToken.trim(),
        pageAccessToken: facebookForm.pageAccessToken.trim(),
        pageId: facebookForm.pageId.trim(),
      },
      whatsapp: current.whatsapp,
    });
  };

  const handleSaveWhatsapp = () => {
    const current = settingsData?.settings || {};
    saveMutation.mutate({
      ivr: current.ivr,
      indiamart: current.indiamart,
      website: current.website,
      googleAds: current.googleAds,
      facebook: current.facebook,
      whatsapp: {
        ...current.whatsapp,
        enabled: whatsappForm.enabled,
        phoneNumberId: whatsappForm.phoneNumberId.trim(),
        accessToken: whatsappForm.accessToken.trim(),
      },
    });
  };

  const generateRandomKey = () => {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  };
  const generateGoogleAdsKey = () => setGoogleAdsForm(f => ({ ...f, webhookKey: generateRandomKey() }));
  const generateFbVerifyToken = () => setFacebookForm(f => ({ ...f, verifyToken: generateRandomKey() }));

  const tabs = [
    { id: 'acefone', label: 'Acefone IVR', icon: PhoneCall },
    { id: 'indiamart', label: 'IndiaMART', icon: Globe },
    { id: 'website', label: 'Website Webhook', icon: Zap },
    { id: 'googleAds', label: 'Google Ads', icon: Megaphone },
    { id: 'facebook', label: 'Facebook Ads', icon: Facebook },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
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
            <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              facebookForm.enabled && facebookForm.verifyToken && facebookForm.pageAccessToken
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${facebookForm.enabled && facebookForm.verifyToken && facebookForm.pageAccessToken ? 'bg-blue-500' : 'bg-gray-400'}`} />
              Facebook Ads {facebookForm.enabled && facebookForm.verifyToken && facebookForm.pageAccessToken ? 'Active' : 'Inactive'}
            </div>
            <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              whatsappForm.enabled && whatsappForm.phoneNumberId && whatsappForm.accessToken
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${whatsappForm.enabled && whatsappForm.phoneNumberId && whatsappForm.accessToken ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              WhatsApp {whatsappForm.enabled && whatsappForm.phoneNumberId && whatsappForm.accessToken ? 'Active' : 'Inactive'}
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

          {/* ═══════════════════ GOOGLE ADS LEAD FORM ═══════════════════ */}
          {activeTab === 'googleAds' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5 text-red-600" />
                  Google Ads Lead Form
                </CardTitle>
                <CardDescription>
                  Connect Google Ads Lead Form extensions to automatically create leads in the CRM.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable Google Ads Webhook</p>
                    <p className="text-sm text-gray-500">Accept leads from Google Ads Lead Form extensions</p>
                  </div>
                  <Switch
                    checked={googleAdsForm.enabled}
                    onCheckedChange={(v) => setGoogleAdsForm({ ...googleAdsForm, enabled: v })}
                  />
                </div>

                {/* Webhook Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Webhook Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showGoogleAdsKey ? 'text' : 'password'}
                        placeholder="Generate a webhook key"
                        value={googleAdsForm.webhookKey}
                        onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, webhookKey: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGoogleAdsKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showGoogleAdsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" onClick={generateGoogleAdsKey}>Generate</Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Paste this exact same value into Google Ads' Lead Form → Lead delivery → Webhook "Key" field — Google echoes it back on every lead so we can verify it's really from Google Ads.
                  </p>
                </div>

                {/* Webhook URL */}
                {googleAdsForm.webhookKey && (
                  <div className="space-y-2">
                    <Label>Your Webhook URL (paste into Google Ads' Webhook URL field)</Label>
                    <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs text-gray-700 break-all">
                      {`${window.location.origin}/api/leads/google-ads-webhook?q=${googleAdsForm.webhookKey}`}
                    </div>
                  </div>
                )}

                {/* Setup instructions */}
                <div className="bg-red-50 rounded-xl border border-red-100 p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    How to connect in Google Ads:
                  </p>
                  <ol className="text-xs text-red-800 list-decimal list-inside space-y-1">
                    <li>Save the Webhook Key here first (Generate button above), then Save Settings</li>
                    <li>In Google Ads: Campaign → Assets → your Lead Form asset → Lead delivery settings</li>
                    <li>Choose "Webhook" delivery, paste the Webhook URL above into the URL field</li>
                    <li>Paste the same Webhook Key into Google Ads' "Key" field</li>
                    <li>Google Ads sends a test call to verify — it should show as connected/verified</li>
                    <li>New leads then arrive here automatically, unassigned, for Cruncher to review</li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveGoogleAds}
                    disabled={saveMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Google Ads Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ FACEBOOK / META LEAD ADS ═══════════════════ */}
          {activeTab === 'facebook' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  Facebook / Meta Lead Ads
                </CardTitle>
                <CardDescription>
                  Connect Facebook Lead Ads forms to automatically create leads in the CRM.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable Facebook Ads Webhook</p>
                    <p className="text-sm text-gray-500">Accept leads from Facebook/Instagram Lead Ads forms</p>
                  </div>
                  <Switch
                    checked={facebookForm.enabled}
                    onCheckedChange={(v) => setFacebookForm({ ...facebookForm, enabled: v })}
                  />
                </div>

                {/* Verify Token */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Verify Token
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showFbVerifyToken ? 'text' : 'password'}
                        placeholder="Generate a verify token"
                        value={facebookForm.verifyToken}
                        onChange={(e) => setFacebookForm({ ...facebookForm, verifyToken: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFbVerifyToken(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showFbVerifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" onClick={generateFbVerifyToken}>Generate</Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Paste this exact same value into Facebook's App → Webhooks → "Verify Token" field when you subscribe the Callback URL below.
                  </p>
                </div>

                {/* Page Access Token */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Page Access Token
                  </Label>
                  <div className="relative">
                    <Input
                      type={showFbPageToken ? 'text' : 'password'}
                      placeholder="Long-lived Page Access Token from Graph API Explorer"
                      value={facebookForm.pageAccessToken}
                      onChange={(e) => setFacebookForm({ ...facebookForm, pageAccessToken: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFbPageToken(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showFbPageToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Facebook's lead notification only carries a lead ID, not the actual answers — this token is what lets us fetch the real lead data back from Facebook.
                  </p>
                </div>

                {/* Page ID (optional) */}
                <div className="space-y-2">
                  <Label>Page ID (optional)</Label>
                  <Input
                    placeholder="Your Facebook Page ID"
                    value={facebookForm.pageId}
                    onChange={(e) => setFacebookForm({ ...facebookForm, pageId: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Only needed if you'll ever connect more than one Facebook Page — leave blank for a single Page.</p>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label>Your Callback URL (paste into Facebook's Webhooks "Callback URL" field)</Label>
                  <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs text-gray-700 break-all">
                    {`${window.location.origin}/api/leads/facebook-webhook`}
                  </div>
                </div>

                {/* Setup instructions */}
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2">
                  <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    How to connect in Facebook (this is a longer setup than the others):
                  </p>
                  <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1">
                    <li>Save the Verify Token here first (Generate button above), then Save Settings</li>
                    <li>Go to developers.facebook.com → your App → Webhooks → Page → Subscribe to this object</li>
                    <li>Paste the Callback URL above, paste the same Verify Token, click Verify and Save</li>
                    <li>Under "leadgen", click Subscribe for your Page</li>
                    <li>In Graph API Explorer, generate a long-lived <strong>Page Access Token</strong> for that Page (needs <code>pages_manage_ads</code> + <code>leads_retrieval</code> permissions) and paste it above</li>
                    <li>Save Settings again — new leads then arrive here automatically, unassigned, for Cruncher to review</li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveFacebook}
                    disabled={saveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Facebook Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ WHATSAPP CLOUD API ═══════════════════ */}
          {activeTab === 'whatsapp' && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  WhatsApp (Meta Cloud API)
                </CardTitle>
                <CardDescription>
                  Send WhatsApp messages to customers automatically from Leads, Accounts, and Complaints/Service — instead of just opening the WhatsApp app for a manual click.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-medium text-gray-900">Enable WhatsApp Sending</p>
                    <p className="text-sm text-gray-500">Turn on automatic WhatsApp message sending across the app</p>
                  </div>
                  <Switch
                    checked={whatsappForm.enabled}
                    onCheckedChange={(v) => setWhatsappForm({ ...whatsappForm, enabled: v })}
                  />
                </div>

                {/* Phone Number ID */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Phone Number ID
                  </Label>
                  <Input
                    placeholder="Meta WhatsApp Business Phone Number ID"
                    value={whatsappForm.phoneNumberId}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    From Meta Business Manager → WhatsApp → API Setup — this is an ID, not the phone number itself.
                  </p>
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    Access Token
                  </Label>
                  <div className="relative">
                    <Input
                      type={showWhatsappToken ? 'text' : 'password'}
                      placeholder="Permanent System User access token"
                      value={whatsappForm.accessToken}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWhatsappToken(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use a <strong>permanent</strong> System User token (Business Settings → System Users), not the 24-hour test token — that one expires and sending will silently stop working.
                  </p>
                </div>

                {/* Critical limitation callout */}
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Important — this won't message every customer automatically:
                  </p>
                  <ul className="text-xs text-amber-800 list-disc list-inside space-y-1">
                    <li>If the customer messaged you on WhatsApp within the last 24 hours → free-text sends work instantly, no template needed</li>
                    <li>If not (most first-time outreach, reminders, notifications) → Meta requires a pre-approved <strong>message Template</strong>, which must be created and approved in Meta Business Manager first — plain text will fail</li>
                    <li>Every "Send WhatsApp" button across the app tries the API first — if it's rejected for this reason, it automatically falls back to opening the WhatsApp app for a manual send, exactly like it does today, so nothing breaks</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveWhatsapp}
                    disabled={saveMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save WhatsApp Settings'}
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
