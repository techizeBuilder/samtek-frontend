import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi } from '@/api/adminSettingsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Building2, Settings, Globe, Mail, Zap, PhoneCall, Eye, EyeOff, Megaphone, Facebook, MessageCircle,
  Plus, Pencil, Trash2, Save, RefreshCw, Info, Key, Phone, CheckCircle2,
  FileText, Tag, List, Layers, DollarSign, StickyNote, Target, Upload,
  ChevronRight, Truck, ClipboardList,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { buildQuotationNumber } from '@/utils/quotationNumber';

// ─── Reusable inline-edit list item ──────────────────────────────────────────
function ListItem({ item, onSave, onDelete, fields }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const startEdit = () => {
    const init = {};
    fields.forEach(f => { init[f.key] = item[f.key] ?? ''; });
    setForm(init);
    setEditing(true);
  };

  return editing ? (
    <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-gray-300 bg-gray-50">
      {fields.map(f => (
        <div key={f.key} className="flex-1 min-w-[120px]">
          <Label className="text-xs text-gray-600 mb-1 block">{f.label}</Label>
          {f.type === 'textarea'
            ? <Textarea rows={2} className="text-sm" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            : <Input type={f.type || 'text'} className="h-8 text-sm" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          }
        </div>
      ))}
      <div className="flex gap-1">
        <Button size="sm" className="h-8" onClick={() => { onSave(form); setEditing(false); }}><Save className="h-3 w-3" /></Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>✕</Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex-1 min-w-0 flex flex-wrap gap-x-4">
        {fields.filter(f => !f.hideInList).map(f => (
          <span key={f.key} className={f.primary ? 'font-medium text-gray-800' : 'text-sm text-gray-500'}>
            {f.prefix && <span className="text-gray-400 mr-1">{f.prefix}</span>}{item[f.key]}
          </span>
        ))}
      </div>
      <div className="flex gap-1 shrink-0 ml-3">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-800" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

// ─── Generic CRUD list — shows items + add form directly (no accordion) ───────
function CrudSection({ title, icon: Icon, items = [], fields, addLabel, onAdd, onUpdate, onDelete, emptyText }) {
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({});

  const startAdd = () => {
    const init = {};
    fields.forEach(f => { init[f.key] = f.default ?? ''; });
    setNewForm(init);
    setAdding(true);
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          {title}
          <span className="ml-1 text-xs font-normal text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{items.length}</span>
        </h3>
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-3 w-3" />{addLabel || 'Add'}
        </button>
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-gray-300 bg-gray-50">
          {fields.map(f => (
            <div key={f.key} className="flex-1 min-w-[130px]">
              <Label className="text-xs text-gray-600 mb-1 block">{f.label}</Label>
              {f.type === 'textarea'
                ? <Textarea rows={2} className="text-sm" placeholder={f.placeholder || ''} value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))} />
                : <Input type={f.type || 'text'} className="h-8 text-sm" placeholder={f.placeholder || ''} value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))} />
              }
            </div>
          ))}
          <div className="flex gap-1">
            <Button size="sm" className="h-8" onClick={() => { onAdd(newForm); setAdding(false); }}><Plus className="h-3 w-3 mr-1" />Add</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}>✕</Button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-1.5">
        {items.length === 0 && !adding && (
          <p className="text-sm text-gray-400 italic py-1">{emptyText || 'No items yet.'}</p>
        )}
        {items.map(item => (
          <ListItem key={item._id} item={item} fields={fields}
            onSave={form => onUpdate(item._id, form)}
            onDelete={() => onDelete(item._id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Quotation Number Setting — bespoke form + table (dropdowns + live example,
//     which the generic CrudSection/ListItem above don't support) ─────────────
const BIFURCATE_OPTIONS = ['-', '/', '_', 'None'];
const FY_POSITION_OPTIONS = [
  { value: 'none', label: '== Select ==' },
  { value: 'before_prefix', label: 'Before Prefix' },
  { value: 'after_prefix', label: 'After Prefix' },
];
const selectClass = 'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300';

function QuotationNumberSettingSection({ items = [], onAdd, onUpdate, onDelete }) {
  const emptyForm = { prefix: '', suffix: '', bifurcateWith: '-', financialYearPosition: 'none' };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const example = buildQuotationNumber(form, 'LD-0001');

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      prefix: item.prefix || '',
      suffix: item.suffix || '',
      bifurcateWith: item.bifurcateWith || '-',
      financialYearPosition: item.financialYearPosition || 'none',
    });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };
  const handleSave = () => {
    if (editingId) onUpdate(editingId, form);
    else onAdd(form);
    setForm(emptyForm);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Form */}
      <div className="p-5 border-b border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-sm">Prefix</Label>
            <Input value={form.prefix} onChange={e => set('prefix', e.target.value)} placeholder="e.g. SAM" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Suffix</Label>
            <Input value={form.suffix} onChange={e => set('suffix', e.target.value)} placeholder="e.g. 0011" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Bifurcate With</Label>
            <select className={selectClass} value={form.bifurcateWith} onChange={e => set('bifurcateWith', e.target.value)}>
              {BIFURCATE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Add Financial Year (eg. 25-26)</Label>
            <select className={selectClass} value={form.financialYearPosition} onChange={e => set('financialYearPosition', e.target.value)}>
              {FY_POSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">For Example:</span> {example}</p>
          <div className="flex gap-2">
            {editingId && <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>}
            <Button size="sm" onClick={handleSave}>{editingId ? 'Update' : 'Save'}</Button>
          </div>
        </div>
      </div>

      {/* Saved settings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Prefix</th>
              <th className="px-5 py-3 font-medium">Suffix</th>
              <th className="px-5 py-3 font-medium">Bifurcate With</th>
              <th className="px-5 py-3 font-medium">Financial Year Position</th>
              <th className="px-5 py-3 font-medium">Example</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-gray-400 italic">No number settings yet — add one above.</td></tr>
            ) : items.map(item => (
              <tr key={item._id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3">{item.prefix || '-'}</td>
                <td className="px-5 py-3">{item.suffix || '-'}</td>
                <td className="px-5 py-3">{item.bifurcateWith}</td>
                <td className="px-5 py-3">{FY_POSITION_OPTIONS.find(o => o.value === item.financialYearPosition)?.label || item.financialYearPosition}</td>
                <td className="px-5 py-3 font-medium text-gray-800">{buildQuotationNumber(item, 'LD-0001')}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-800" onClick={() => startEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => onDelete(item._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [category, setCategory] = useState('company');   // 'company' | 'general' | 'api'
  const [generalSection, setGeneralSection] = useState('smtp'); // 'smtp' | 'lead' | 'quotation' | 'other'

  // SMTP form
  const [smtpForm, setSmtpForm] = useState({ department: 'SALES', provider: 'Gmail', mailServer: 'smtp.gmail.com', port: 587, email: '', password: '' });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const SMTP_DEPARTMENTS = [
    { value: 'SALES', label: 'Sales — quotations, meeting invites' },
    { value: 'ACCOUNTS', label: 'Accounts — payment reminders' },
    { value: 'PURCHASE', label: 'Purchase — PO, RFQ, vendor exchange' },
    { value: 'HR', label: 'HR — training, task notifications' },
    { value: 'INFO', label: 'Info — service/complaint tickets' },
    { value: 'CASH_ACCESS', label: 'Cash Access — OTP approval' },
  ];

  // Fetch all admin settings
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getAll(),
  });
  const settings      = data?.settings || {};
  const smtpList      = settings.smtp || [];
  const leadStages    = settings.leadStages || [];
  const leadSources   = settings.leadSources || [];
  const businessTypes = settings.businessTypes || [];
  const documentTypes = settings.documentTypes || [];
  const leadRejectReasons = settings.leadRejectReasons || [];
  const terms         = settings.termsAndConditions || [];
  const charges       = settings.additionalCharges || [];
  const notes         = settings.quotationNotes || [];
  const dispatchChecklist = settings.dispatchChecklist || [];
  const quotationNumberSettings = settings.quotationNumberSettings || [];
  const hrmsDocumentTypes = settings.hrmsDocumentTypes || [];

  const inv = () => qc.invalidateQueries({ queryKey: ['admin-settings'] });
  const m = (fn, msg) => ({ mutationFn: fn, onSuccess: () => { inv(); toast({ title: msg }); }, onError: e => toast({ title: 'Error', description: e.message, variant: 'destructive' }) });

  // SMTP
  const addSmtpM    = useMutation({ ...m(b => adminSettingsApi.addSmtp(b), 'SMTP added'), onSuccess: () => { inv(); toast({ title: 'SMTP added' }); setSmtpForm({ department: 'SALES', provider: 'Gmail', mailServer: 'smtp.gmail.com', port: 587, email: '', password: '' }); } });
  const delSmtpM    = useMutation(m(id => adminSettingsApi.deleteSmtp(id), 'SMTP deleted'));

  // Lead stages
  const addStageM   = useMutation(m(b => adminSettingsApi.addLeadStage(b), 'Stage added'));
  const updStageM   = useMutation(m(({ id, body }) => adminSettingsApi.updateLeadStage(id, body), 'Stage updated'));
  const delStageM   = useMutation(m(id => adminSettingsApi.deleteLeadStage(id), 'Stage deleted'));

  // Lead sources
  const addSourceM  = useMutation(m(b => adminSettingsApi.addLeadSource(b), 'Source added'));
  const updSourceM  = useMutation(m(({ id, body }) => adminSettingsApi.updateLeadSource(id, body), 'Source updated'));
  const delSourceM  = useMutation(m(id => adminSettingsApi.deleteLeadSource(id), 'Source deleted'));

  // Business types
  const addBizM     = useMutation(m(b => adminSettingsApi.addBusinessType(b), 'Business type added'));
  const updBizM     = useMutation(m(({ id, body }) => adminSettingsApi.updateBusinessType(id, body), 'Business type updated'));
  const delBizM     = useMutation(m(id => adminSettingsApi.deleteBusinessType(id), 'Business type deleted'));

  // Document types
  const addDocM     = useMutation(m(b => adminSettingsApi.addDocumentType(b), 'Document type added'));
  const updDocM     = useMutation(m(({ id, body }) => adminSettingsApi.updateDocumentType(id, body), 'Document type updated'));
  const delDocM     = useMutation(m(id => adminSettingsApi.deleteDocumentType(id), 'Document type deleted'));

  // Terms
  const addTermM    = useMutation(m(b => adminSettingsApi.addTerm(b), 'Term added'));
  const updTermM    = useMutation(m(({ id, body }) => adminSettingsApi.updateTerm(id, body), 'Term updated'));
  const delTermM    = useMutation(m(id => adminSettingsApi.deleteTerm(id), 'Term deleted'));

  // Charges
  const addChargeM  = useMutation(m(b => adminSettingsApi.addCharge(b), 'Charge added'));
  const updChargeM  = useMutation(m(({ id, body }) => adminSettingsApi.updateCharge(id, body), 'Charge updated'));
  const delChargeM  = useMutation(m(id => adminSettingsApi.deleteCharge(id), 'Charge deleted'));

  // Notes
  const addNoteM    = useMutation(m(b => adminSettingsApi.addNote(b), 'Note added'));
  const updNoteM    = useMutation(m(({ id, body }) => adminSettingsApi.updateNote(id, body), 'Note updated'));
  const delNoteM    = useMutation(m(id => adminSettingsApi.deleteNote(id), 'Note deleted'));

  // Dispatch Checklist
  const addChecklistM = useMutation(m(b => adminSettingsApi.addDispatchChecklistItem(b), 'Checklist item added'));
  const updChecklistM = useMutation(m(({ id, body }) => adminSettingsApi.updateDispatchChecklistItem(id, body), 'Checklist item updated'));
  const delChecklistM = useMutation(m(id => adminSettingsApi.deleteDispatchChecklistItem(id), 'Checklist item deleted'));

  // Lead Reject Reasons
  const addRejectReasonM = useMutation(m(b => adminSettingsApi.addLeadRejectReason(b), 'Reject reason added'));
  const updRejectReasonM = useMutation(m(({ id, body }) => adminSettingsApi.updateLeadRejectReason(id, body), 'Reject reason updated'));
  const delRejectReasonM = useMutation(m(id => adminSettingsApi.deleteLeadRejectReason(id), 'Reject reason deleted'));

  // Quotation Number Settings
  const addNumberSettingM = useMutation(m(b => adminSettingsApi.addQuotationNumberSetting(b), 'Number setting added'));
  const updNumberSettingM = useMutation(m(({ id, body }) => adminSettingsApi.updateQuotationNumberSetting(id, body), 'Number setting updated'));
  const delNumberSettingM = useMutation(m(id => adminSettingsApi.deleteQuotationNumberSetting(id), 'Number setting deleted'));

  // HRMS: Upload Document Settings
  const addHrmsDocTypeM = useMutation(m(b => adminSettingsApi.addHrmsDocumentType(b), 'Document type added'));
  const updHrmsDocTypeM = useMutation(m(({ id, body }) => adminSettingsApi.updateHrmsDocumentType(id, body), 'Document type updated'));
  const delHrmsDocTypeM = useMutation(m(id => adminSettingsApi.deleteHrmsDocumentType(id), 'Document type deleted'));
  // Stable key derived from the label — stored permanently on each employee's
  // uploaded UserDocument, so it must not change when the label is edited later.
  const slugifyDocKey = (label) => (label || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `DOC_${Date.now()}`;

  // ─── API settings ─────────────────────────────────────────────────────────
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const apiFetch = (url, opts = {}) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}${url}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Failed'); return d; });
  };
  const [activeApiTab, setActiveApiTab] = useState('acefone');
  const [showApiKey, setShowApiKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [ivrForm, setIvrForm]         = useState({ enabled: false, apiKey: '', callerID: '' });
  const [indiamartForm, setIndiamartForm] = useState({ enabled: false, accounts: [] });
  const [websiteForm, setWebsiteForm]     = useState({ enabled: false, apiKey: '' });
  const [googleAdsForm, setGoogleAdsForm] = useState({ enabled: false, webhookKey: '' });
  const [showGoogleAdsKey, setShowGoogleAdsKey] = useState(false);
  const [facebookForm, setFacebookForm] = useState({ enabled: false, verifyToken: '', pageAccessToken: '', pageId: '' });
  const [showFbVerifyToken, setShowFbVerifyToken] = useState(false);
  const [showFbPageToken, setShowFbPageToken] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({ enabled: false, phoneNumberId: '', accessToken: '' });
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

  const { data: apiData, refetch: apiRefetch } = useQuery({
    queryKey: ['admin-api-settings'],
    queryFn: () => apiFetch('/super-admin/api-settings'),
    enabled: category === 'api',
  });
  useEffect(() => {
    if (!apiData?.settings) return;
    const s = apiData.settings;
    setIvrForm({ enabled: s.ivr?.enabled || false, apiKey: s.ivr?.apiKey || '', callerID: s.ivr?.callerID || '' });
    let accs = s.indiamart?.accounts || [];
    if (accs.length === 0 && (s.indiamart?.sellerMobile || s.indiamart?.authKey))
      accs = [{ apiName: 'Primary Account', sellerMobile: s.indiamart.sellerMobile || '', authKey: s.indiamart.authKey || '', lastSyncedAt: s.indiamart.lastSyncedAt }];
    setIndiamartForm({ enabled: s.indiamart?.enabled || false, accounts: accs });
    setWebsiteForm({ enabled: s.website?.enabled || false, apiKey: s.website?.apiKey || '' });
    setGoogleAdsForm({ enabled: s.googleAds?.enabled || false, webhookKey: s.googleAds?.webhookKey || '' });
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
  }, [apiData]);

  const saveApiM = useMutation({
    mutationFn: d => apiFetch('/super-admin/api-settings', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-api-settings'] }); toast({ title: 'API Settings Saved' }); },
    onError: e => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const cur = apiData?.settings || {};
  const saveAcefone   = () => saveApiM.mutate({ ivr: { ...cur.ivr, enabled: ivrForm.enabled, apiKey: ivrForm.apiKey.trim(), callerID: ivrForm.callerID.trim() }, indiamart: cur.indiamart, website: cur.website, googleAds: cur.googleAds, facebook: cur.facebook, whatsapp: cur.whatsapp });
  const saveIndiamart = () => {
    const c = indiamartForm.accounts.map(a => ({ apiName: (a.apiName||'').trim(), sellerMobile: (a.sellerMobile||'').trim(), authKey: (a.authKey||'').trim(), lastSyncedAt: a.lastSyncedAt }));
    saveApiM.mutate({ ivr: cur.ivr, indiamart: { ...cur.indiamart, enabled: indiamartForm.enabled, accounts: c, sellerMobile: c[0]?.sellerMobile||'', authKey: c[0]?.authKey||'' }, website: cur.website, googleAds: cur.googleAds, facebook: cur.facebook, whatsapp: cur.whatsapp });
  };
  const saveWebsite   = () => saveApiM.mutate({ ivr: cur.ivr, indiamart: cur.indiamart, website: { ...cur.website, enabled: websiteForm.enabled, apiKey: websiteForm.apiKey.trim() }, googleAds: cur.googleAds, facebook: cur.facebook, whatsapp: cur.whatsapp });
  const saveGoogleAds = () => saveApiM.mutate({ ivr: cur.ivr, indiamart: cur.indiamart, website: cur.website, googleAds: { ...cur.googleAds, enabled: googleAdsForm.enabled, webhookKey: googleAdsForm.webhookKey.trim() }, facebook: cur.facebook, whatsapp: cur.whatsapp });
  const saveFacebook  = () => saveApiM.mutate({ ivr: cur.ivr, indiamart: cur.indiamart, website: cur.website, googleAds: cur.googleAds, facebook: { ...cur.facebook, enabled: facebookForm.enabled, verifyToken: facebookForm.verifyToken.trim(), pageAccessToken: facebookForm.pageAccessToken.trim(), pageId: facebookForm.pageId.trim() }, whatsapp: cur.whatsapp });
  const saveWhatsapp  = () => saveApiM.mutate({ ivr: cur.ivr, indiamart: cur.indiamart, website: cur.website, googleAds: cur.googleAds, facebook: cur.facebook, whatsapp: { ...cur.whatsapp, enabled: whatsappForm.enabled, phoneNumberId: whatsappForm.phoneNumberId.trim(), accessToken: whatsappForm.accessToken.trim() } });
  const generateRandomKey = () => {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  };
  const generateGoogleAdsKey = () => setGoogleAdsForm(f => ({ ...f, webhookKey: generateRandomKey() }));
  const generateFbVerifyToken = () => setFacebookForm(f => ({ ...f, verifyToken: generateRandomKey() }));

  // ─── Company settings ─────────────────────────────────────────────────────
  const { data: csd } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest('GET', '/api/settings'),
    enabled: category === 'company',
  });
  const cs = csd?.data || {};
  const [compForm, setCompForm]     = useState({});
  const [logoFile, setLogoFile]     = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  useEffect(() => {
    if (!cs.company) return;
    setCompForm({ name: cs.company.name||'', email: cs.company.contact?.email||'', phone: cs.company.contact?.phone||'', website: cs.company.contact?.website||'', address: cs.company.address?.street||'', gstNumber: cs.company.gstNumber||'' });
    if (cs.company.logo) setLogoPreview(cs.company.logo);
  }, [csd]);

  const saveCompM = useMutation({
    mutationFn: d => apiRequest('PUT', '/api/settings/company', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ title: 'Company settings saved' }); },
    onError: e => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const logoUploadM = useMutation({
    mutationFn: async file => {
      const fd = new FormData(); fd.append('logo', file);
      const r = await fetch('/api/settings/company/logo', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: fd });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setLogoFile(null); toast({ title: 'Logo updated' }); },
    onError: e => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading && category === 'general') {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-7 w-7 animate-spin text-gray-400" /></div>;
  }

  // ─── Sidebar nav config ───────────────────────────────────────────────────
  const catNav = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'general', label: 'General', icon: Settings  },
    { id: 'api',     label: 'API',     icon: Globe     },
  ];

  // General sub-items — some have flyout children
  const genNav = [
    { id: 'smtp',      label: 'SMTP Settings',     icon: Mail     },
    {
      id: 'lead', label: 'Lead Settings', icon: Target,
      children: [
        { id: 'lead_stage',    label: 'Lead Stage'    },
        { id: 'lead_source',   label: 'Lead Source'   },
        { id: 'business_type', label: 'Business Type' },
        { id: 'document_type', label: 'Document Type' },
        { id: 'lead_reject_reason', label: 'Lead Reject Reason' },
      ]
    },
    {
      id: 'quotation', label: 'Quotation Settings', icon: FileText,
      children: [
        { id: 'terms',   label: 'Terms & Conditions' },
        { id: 'charges', label: 'Additional Charges'  },
        { id: 'notes',   label: 'Notes'               },
        { id: 'quotation_number', label: 'Number Setting' },
      ]
    },
    {
      id: 'dispatch', label: 'Dispatch', icon: Truck,
      children: [
        { id: 'dispatch_checklist', label: 'Manage Checklist' },
      ]
    },
    {
      id: 'hrms', label: 'HRMS Setting', icon: Upload,
      children: [
        { id: 'hrms_upload_document', label: 'Upload Document Setting' },
      ]
    },
    { id: 'other', label: 'Other Settings', icon: Layers },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ─── Left sidebar ─────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Settings</h2>
        </div>

        {/* Top-level categories */}
        <nav className="p-2 space-y-0.5">
          {catNav.map(c => {
            const Icon = c.icon;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  category === c.id
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <Icon className="h-4 w-4 shrink-0" />{c.label}
              </button>
            );
          })}
        </nav>

        {/* General sub-sections — flyout on hover for items with children */}
        {category === 'general' && (
          <div className="px-2 pt-1 pb-2 space-y-0.5 border-t border-gray-100 mt-1">
            <p className="px-3 pt-2 pb-1 text-xs text-gray-400 uppercase tracking-wider font-medium">Sections</p>
            {genNav.map(s => {
              const Icon = s.icon;
              const isActive = generalSection === s.id || s.children?.some(c => c.id === generalSection);

              if (s.children) {
                // Hover-triggered flyout submenu
                return (
                  <div key={s.id} className="relative group">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-default select-none ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" />{s.label}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    </div>

                    {/* Flyout panel — appears on hover, floats to the right of the sidebar */}
                    <div className="absolute left-full top-0 ml-1 z-50 hidden group-hover:block">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                        {s.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => setGeneralSection(child.id)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              generalSection === child.id
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              // Plain nav item (no children)
              return (
                <button key={s.id} onClick={() => setGeneralSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />{s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 p-6 overflow-auto">

        {/* ════════════════ COMPANY ════════════════ */}
        {category === 'company' && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Company Settings</h1>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview.startsWith('/') ? `http://localhost:5000${logoPreview}` : logoPreview}
                      alt="Logo" className="h-14 w-14 object-contain border rounded-lg"
                    />
                  )}
                  <div className="space-y-2">
                    <input type="file" accept="image/*" className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                      onChange={e => { const f = e.target.files[0]; if (f) { setLogoFile(f); const r = new FileReader(); r.onload = ev => setLogoPreview(ev.target.result); r.readAsDataURL(f); } }}
                    />
                    {logoFile && (
                      <Button size="sm" variant="outline" disabled={logoUploadM.isPending} onClick={() => logoUploadM.mutate(logoFile)}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />{logoUploadM.isPending ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name',       label: 'Company Name' },
                  { key: 'gstNumber',  label: 'GST Number'   },
                  { key: 'email',      label: 'Email'        },
                  { key: 'phone',      label: 'Phone'        },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-sm">{f.label}</Label>
                    <Input value={compForm[f.key] || ''} onChange={e => setCompForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-sm">Website</Label>
                  <Input value={compForm.website || ''} onChange={e => setCompForm(p => ({ ...p, website: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-sm">Address</Label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" value={compForm.address || ''} onChange={e => setCompForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button disabled={saveCompM.isPending} onClick={() => saveCompM.mutate(compForm)}>
                  <Save className="h-4 w-4 mr-2" />{saveCompM.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════ GENERAL ════════════════ */}
        {category === 'general' && (
          <div className="max-w-3xl space-y-5">

            {/* ── SMTP Settings ── */}
            {generalSection === 'smtp' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">SMTP Settings</h1>
                {/* Add form */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                  <p className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Add New SMTP Configuration</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Department</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={smtpForm.department}
                      onChange={e => setSmtpForm(f => ({ ...f, department: e.target.value }))}
                    >
                      {SMTP_DEPARTMENTS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Choose Provider</Label>
                    <div className="flex gap-5">
                      {['Gmail', 'Other'].map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" checked={smtpForm.provider === p} onChange={() => setSmtpForm(f => ({ ...f, provider: p, mailServer: p === 'Gmail' ? 'smtp.gmail.com' : '' }))} />{p}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-sm">Mail Server</Label><Input value={smtpForm.mailServer} onChange={e => setSmtpForm(f => ({ ...f, mailServer: e.target.value }))} placeholder="smtp.gmail.com" /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Port</Label><Input type="number" value={smtpForm.port} onChange={e => setSmtpForm(f => ({ ...f, port: parseInt(e.target.value) || 587 }))} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Email</Label><Input value={smtpForm.email} onChange={e => setSmtpForm(f => ({ ...f, email: e.target.value }))} placeholder="Enter email" /></div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Password</Label>
                      <div className="relative">
                        <Input type={showSmtpPass ? 'text' : 'password'} value={smtpForm.password} onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))} className="pr-10" placeholder="Enter password" />
                        <button type="button" onClick={() => setShowSmtpPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button disabled={addSmtpM.isPending} onClick={() => addSmtpM.mutate(smtpForm)}>
                      <Save className="h-4 w-4 mr-2" />{addSmtpM.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Existing list */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
                  <p className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Configured SMTP Servers</p>
                  {smtpList.length === 0
                    ? <p className="text-sm text-gray-400 italic">No SMTP configured yet.</p>
                    : smtpList.map(s => (
                      <div key={s._id} className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <Badge variant="secondary" className="text-xs">{s.department || 'UNSET'}</Badge>
                          <span className="font-medium text-sm text-gray-800">{s.provider}</span>
                          <span className="text-sm text-gray-500">{s.mailServer}:{s.port}</span>
                          <span className="text-sm text-gray-500">{s.email}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => delSmtpM.mutate(s._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  }
                </div>
              </>
            )}

            {/* ── Lead Settings — each child is its own section ── */}
            {generalSection === 'lead_stage' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Lead Stage</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Lead Stage" icon={List} items={leadStages} defaultOpen
                    fields={[{ key: 'name', label: 'Stage Name', placeholder: 'e.g. Contacted', primary: true }]}
                    addLabel="Add Stage"
                    onAdd={f => addStageM.mutate(f)}
                    onUpdate={(id, f) => updStageM.mutate({ id, body: f })}
                    onDelete={id => delStageM.mutate(id)}
                    emptyText="No stages yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'lead_source' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Lead Source</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Lead Source" icon={Tag} items={leadSources} defaultOpen
                    fields={[{ key: 'name', label: 'Source Name', placeholder: 'e.g. IndiaMART', primary: true }]}
                    addLabel="Add Source"
                    onAdd={f => addSourceM.mutate(f)}
                    onUpdate={(id, f) => updSourceM.mutate({ id, body: f })}
                    onDelete={id => delSourceM.mutate(id)}
                    emptyText="No sources yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'business_type' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Business Type</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Business Type" icon={Layers} items={businessTypes} defaultOpen
                    fields={[{ key: 'name', label: 'Business Type', placeholder: 'e.g. Distributor', primary: true }]}
                    addLabel="Add Type"
                    onAdd={f => addBizM.mutate(f)}
                    onUpdate={(id, f) => updBizM.mutate({ id, body: f })}
                    onDelete={id => delBizM.mutate(id)}
                    emptyText="No business types yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'document_type' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Document Type</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Document Type" icon={FileText} items={documentTypes} defaultOpen
                    fields={[{ key: 'name', label: 'Document Type', placeholder: 'e.g. Aadhaar', primary: true }]}
                    addLabel="Add Document Type"
                    onAdd={f => addDocM.mutate(f)}
                    onUpdate={(id, f) => updDocM.mutate({ id, body: f })}
                    onDelete={id => delDocM.mutate(id)}
                    emptyText="No document types yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'lead_reject_reason' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Lead Reject Reason</h1>
                <p className="text-sm text-gray-500 -mt-3">These appear when disqualifying a lead (thumb-down) on the Leads page.</p>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Lead Reject Reason" icon={Tag} items={leadRejectReasons} defaultOpen
                    fields={[{ key: 'label', label: 'Reason', placeholder: 'e.g. Quoted Price Is High', primary: true }]}
                    addLabel="Add Reason"
                    onAdd={f => addRejectReasonM.mutate(f)}
                    onUpdate={(id, f) => updRejectReasonM.mutate({ id, body: f })}
                    onDelete={id => delRejectReasonM.mutate(id)}
                    emptyText="No reject reasons yet."
                  />
                </div>
              </>
            )}

            {/* ── Quotation Settings — each child is its own section ── */}
            {generalSection === 'terms' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Terms & Conditions</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Terms & Conditions" icon={FileText} items={terms} defaultOpen
                    fields={[
                      { key: 'heading', label: 'Heading', placeholder: 'e.g. Payment Terms', primary: true },
                      { key: 'text',    label: 'Content', placeholder: 'Full terms text...', type: 'textarea' },
                    ]}
                    addLabel="Add Term"
                    onAdd={f => addTermM.mutate(f)}
                    onUpdate={(id, f) => updTermM.mutate({ id, body: f })}
                    onDelete={id => delTermM.mutate(id)}
                    emptyText="No terms yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'charges' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Additional Charges</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Additional Charges" icon={DollarSign} items={charges} defaultOpen
                    fields={[
                      { key: 'name',  label: 'Charge Name', placeholder: 'e.g. Installation Charges', primary: true },
                      { key: 'price', label: 'Price (₹)',   placeholder: '0',  type: 'number', prefix: '₹' },
                      { key: 'gst',   label: 'GST %',       placeholder: '18', type: 'number', prefix: 'GST%:', default: 18 },
                    ]}
                    addLabel="Add Charge"
                    onAdd={f => addChargeM.mutate({ ...f, price: parseFloat(f.price) || 0, gst: f.gst === '' ? 18 : (parseFloat(f.gst) || 0) })}
                    onUpdate={(id, f) => updChargeM.mutate({ id, body: { ...f, price: parseFloat(f.price) || 0, gst: f.gst === '' ? 18 : (parseFloat(f.gst) || 0) } })}
                    onDelete={id => delChargeM.mutate(id)}
                    emptyText="No charges yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'notes' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Notes</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Notes" icon={StickyNote} items={notes} defaultOpen
                    fields={[{ key: 'text', label: 'Note Text', placeholder: 'Enter note...', type: 'textarea', primary: true }]}
                    addLabel="Add Note"
                    onAdd={f => addNoteM.mutate(f)}
                    onUpdate={(id, f) => updNoteM.mutate({ id, body: f })}
                    onDelete={id => delNoteM.mutate(id)}
                    emptyText="No notes yet."
                  />
                </div>
              </>
            )}
            {generalSection === 'quotation_number' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Quotation Number Setting</h1>
                <p className="text-sm text-gray-500 -mt-3">Controls the "Quotation No" shown in preview, download, print & email. The most recently saved row is the active format.</p>
                <QuotationNumberSettingSection
                  items={quotationNumberSettings}
                  onAdd={f => addNumberSettingM.mutate(f)}
                  onUpdate={(id, f) => updNumberSettingM.mutate({ id, body: f })}
                  onDelete={id => delNumberSettingM.mutate(id)}
                />
              </>
            )}

            {generalSection === 'dispatch_checklist' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Manage Checklist</h1>
                <p className="text-sm text-gray-500 -mt-3">These items appear as the packing checklist on the Packaging Jobs page.</p>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Dispatch Checklist" icon={ClipboardList} items={dispatchChecklist} defaultOpen
                    fields={[{ key: 'label', label: 'Checklist Item', placeholder: 'e.g. All Parts Included', primary: true }]}
                    addLabel="Add Item"
                    onAdd={f => addChecklistM.mutate(f)}
                    onUpdate={(id, f) => updChecklistM.mutate({ id, body: f })}
                    onDelete={id => delChecklistM.mutate(id)}
                    emptyText="No checklist items yet."
                  />
                </div>
              </>
            )}

            {/* ── HRMS Setting ── */}
            {generalSection === 'hrms_upload_document' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Upload Document Setting</h1>
                <p className="text-sm text-gray-500 -mt-3">
                  Controls the documents employees are required to upload on their HRMS "Documents" tab, and what HR-Admin verifies under Document Verification.
                </p>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <CrudSection title="Upload Document Setting" icon={Upload} items={hrmsDocumentTypes} defaultOpen
                    fields={[
                      { key: 'label', label: 'Document Name', placeholder: 'e.g. Aadhaar Card', primary: true },
                      { key: 'description', label: 'Description', placeholder: 'e.g. Front & back scan' },
                    ]}
                    addLabel="Add Document Type"
                    onAdd={f => addHrmsDocTypeM.mutate({ label: f.label, description: f.description, key: slugifyDocKey(f.label) })}
                    onUpdate={(id, f) => updHrmsDocTypeM.mutate({ id, body: { label: f.label, description: f.description } })}
                    onDelete={id => delHrmsDocTypeM.mutate(id)}
                    emptyText="No document types yet."
                  />
                </div>
              </>
            )}

            {/* ── Other Settings ── */}
            {generalSection === 'other' && (
              <>
                <h1 className="text-xl font-semibold text-gray-900">Other Settings</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-1">
                  <p className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Database Backup</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
                    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
                      <h3 className="font-medium text-gray-800 text-sm">Download Backup</h3>
                      <p className="text-xs text-gray-500">Create and download full database backup.</p>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm" onClick={async () => {
                        try {
                          toast({ title: 'Preparing backup...' });
                          const token = localStorage.getItem('token');
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/super-admin/backup`, { headers: { Authorization: `Bearer ${token}` } });
                          if (!res.ok) throw new Error('Backup failed');
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
                        } catch (e) { toast({ title: 'Backup Failed', description: e.message, variant: 'destructive' }); }
                      }}>⬇ Download Backup</Button>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
                      <h3 className="font-medium text-gray-800 text-sm">Restore Backup</h3>
                      <p className="text-xs text-gray-500">Upload a JSON/SQL file to restore database.</p>
                      <input type="file" id="restore-file" accept=".json,.sql" className="text-sm text-gray-600 w-full" />
                      <Button variant="destructive" className="w-full text-sm" onClick={() => {
                        const f = document.getElementById('restore-file')?.files?.[0];
                        if (!f) { toast({ title: 'Select a file first', variant: 'destructive' }); return; }
                        toast({ title: 'Restore initiated' });
                      }}>↺ Restore Backup</Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════ API ════════════════ */}
        {category === 'api' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">API Integration Settings</h1>
              <Button variant="outline" size="sm" onClick={() => apiRefetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-2">
              <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              Acefone IVR — add API Key + Caller ID. IndiaMART — leads auto-fetch every 10 min. Website — connect your contact form.
            </div>
            <div className="flex gap-5">
              {/* Tab nav */}
              <div className="w-44 shrink-0 space-y-1">
                {[
                  { id: 'acefone',   label: 'Acefone IVR',     icon: PhoneCall },
                  { id: 'indiamart', label: 'IndiaMART',        icon: Globe     },
                  { id: 'website',   label: 'Website Webhook',  icon: Zap       },
                  { id: 'googleAds', label: 'Google Ads',       icon: Megaphone },
                  { id: 'facebook',  label: 'Facebook Ads',     icon: Facebook  },
                  { id: 'whatsapp',  label: 'WhatsApp',         icon: MessageCircle },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setActiveApiTab(t.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        activeApiTab === t.id ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                      <Icon className="h-4 w-4" />{t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-5">
                {/* Acefone */}
                {activeApiTab === 'acefone' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">Acefone IVR Configuration</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable Acefone IVR</p><p className="text-xs text-gray-500">Turn on click-to-call for Sales team</p></div>
                      <Switch checked={ivrForm.enabled} onCheckedChange={v => setIvrForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Acefone API Key</Label>
                      <div className="relative">
                        <Input type={showApiKey ? 'text' : 'password'} value={ivrForm.apiKey} onChange={e => setIvrForm(f => ({ ...f, apiKey: e.target.value }))} className="pr-10" placeholder="Enter API Key" />
                        <button type="button" onClick={() => setShowApiKey(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />Company Caller ID</Label>
                      <Input value={ivrForm.callerID} onChange={e => setIvrForm(f => ({ ...f, callerID: e.target.value }))} placeholder="e.g. 9240246800" />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveAcefone}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}

                {/* IndiaMART */}
                {activeApiTab === 'indiamart' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">IndiaMART Lead Fetch</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable IndiaMART Sync</p><p className="text-xs text-gray-500">Auto-fetch leads every 10 minutes</p></div>
                      <Switch checked={indiamartForm.enabled} onCheckedChange={v => setIndiamartForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Accounts</Label>
                      <Button size="sm" variant="outline" className="text-sm gap-1" onClick={() => setIndiamartForm(p => ({ ...p, accounts: [...p.accounts, { apiName: '', sellerMobile: '', authKey: '', lastSyncedAt: null }] }))}>
                        <Plus className="h-3.5 w-3.5" />Add Account
                      </Button>
                    </div>
                    {indiamartForm.accounts.length === 0
                      ? <p className="text-sm text-gray-400 italic">No accounts yet.</p>
                      : indiamartForm.accounts.map((acc, i) => (
                        <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Account #{i + 1}</span>
                            <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => setIndiamartForm(p => ({ ...p, accounts: p.accounts.filter((_, j) => j !== i) }))}>Remove</button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><Label className="text-xs mb-1 block">Label</Label><Input className="h-8 text-sm" placeholder="Primary" value={acc.apiName} onChange={e => { const a = [...indiamartForm.accounts]; a[i] = { ...a[i], apiName: e.target.value }; setIndiamartForm(p => ({ ...p, accounts: a })); }} /></div>
                            <div><Label className="text-xs mb-1 block">Seller Mobile</Label><Input className="h-8 text-sm" placeholder="7042115971" value={acc.sellerMobile} onChange={e => { const a = [...indiamartForm.accounts]; a[i] = { ...a[i], sellerMobile: e.target.value }; setIndiamartForm(p => ({ ...p, accounts: a })); }} /></div>
                            <div><Label className="text-xs mb-1 block">API Key</Label>
                              <div className="relative">
                                <Input className="h-8 text-sm pr-8" type={visibleKeys[i] ? 'text' : 'password'} value={acc.authKey} onChange={e => { const a = [...indiamartForm.accounts]; a[i] = { ...a[i], authKey: e.target.value }; setIndiamartForm(p => ({ ...p, accounts: a })); }} />
                                <button type="button" onClick={() => setVisibleKeys(p => ({ ...p, [i]: !p[i] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{visibleKeys[i] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                              </div>
                            </div>
                          </div>
                          {acc.authKey && (
                            <div>
                              <Label className="text-xs mb-1 block">Webhook URL (give this to IndiaMART / your account manager)</Label>
                              <div className="p-2 bg-gray-100 rounded font-mono text-[11px] text-gray-700 break-all">
                                {`${window.location.origin}/api/leads/indiamart-webhook?q=${acc.authKey}`}
                              </div>
                            </div>
                          )}
                          {acc.lastSyncedAt && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Last Synced: {new Date(acc.lastSyncedAt).toLocaleString('en-IN')}</p>}
                        </div>
                      ))
                    }
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveIndiamart}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}

                {/* Website */}
                {activeApiTab === 'website' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">Website Webhook</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable Website Webhook</p><p className="text-xs text-gray-500">Accept leads from your website contact form</p></div>
                      <Switch checked={websiteForm.enabled} onCheckedChange={v => setWebsiteForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Webhook API Key</Label>
                      <Input value={websiteForm.apiKey} onChange={e => setWebsiteForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Enter webhook secret key" />
                    </div>
                    {websiteForm.apiKey && (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Webhook URL</Label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 break-all">{`${window.location.origin}/api/leads/website-webhook?q=${websiteForm.apiKey}`}</div>
                      </div>
                    )}
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveWebsite}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}

                {activeApiTab === 'googleAds' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">Google Ads Lead Form</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable Google Ads Webhook</p><p className="text-xs text-gray-500">Accept leads from Google Ads Lead Form extensions</p></div>
                      <Switch checked={googleAdsForm.enabled} onCheckedChange={v => setGoogleAdsForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Webhook Key</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showGoogleAdsKey ? 'text' : 'password'}
                            className="pr-9"
                            value={googleAdsForm.webhookKey}
                            onChange={e => setGoogleAdsForm(f => ({ ...f, webhookKey: e.target.value }))}
                            placeholder="Generate a webhook key"
                          />
                          <button type="button" onClick={() => setShowGoogleAdsKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showGoogleAdsKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                        </div>
                        <Button type="button" variant="outline" onClick={generateGoogleAdsKey}>Generate</Button>
                      </div>
                      <p className="text-xs text-gray-500">Paste this same value into Google Ads' Lead Form → Lead delivery → Webhook "Key" field.</p>
                    </div>
                    {googleAdsForm.webhookKey && (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Webhook URL (paste into Google Ads' Webhook URL field)</Label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 break-all">{`${window.location.origin}/api/leads/google-ads-webhook?q=${googleAdsForm.webhookKey}`}</div>
                      </div>
                    )}
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveGoogleAds}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}

                {activeApiTab === 'facebook' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">Facebook / Meta Lead Ads</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable Facebook Ads Webhook</p><p className="text-xs text-gray-500">Accept leads from Facebook/Instagram Lead Ads forms</p></div>
                      <Switch checked={facebookForm.enabled} onCheckedChange={v => setFacebookForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Verify Token</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showFbVerifyToken ? 'text' : 'password'}
                            className="pr-9"
                            value={facebookForm.verifyToken}
                            onChange={e => setFacebookForm(f => ({ ...f, verifyToken: e.target.value }))}
                            placeholder="Generate a verify token"
                          />
                          <button type="button" onClick={() => setShowFbVerifyToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showFbVerifyToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                        </div>
                        <Button type="button" variant="outline" onClick={generateFbVerifyToken}>Generate</Button>
                      </div>
                      <p className="text-xs text-gray-500">Paste this same value into Facebook's App → Webhooks → "Verify Token" field.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Page Access Token</Label>
                      <div className="relative">
                        <Input
                          type={showFbPageToken ? 'text' : 'password'}
                          className="pr-9"
                          value={facebookForm.pageAccessToken}
                          onChange={e => setFacebookForm(f => ({ ...f, pageAccessToken: e.target.value }))}
                          placeholder="Long-lived Page Access Token from Graph API Explorer"
                        />
                        <button type="button" onClick={() => setShowFbPageToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showFbPageToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                      </div>
                      <p className="text-xs text-gray-500">Needed to fetch the real lead answers — Facebook's notification only carries a lead ID.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Page ID (optional)</Label>
                      <Input value={facebookForm.pageId} onChange={e => setFacebookForm(f => ({ ...f, pageId: e.target.value }))} placeholder="Your Facebook Page ID" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Callback URL (paste into Facebook's Webhooks "Callback URL" field)</Label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 break-all">{`${window.location.origin}/api/leads/facebook-webhook`}</div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveFacebook}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}

                {activeApiTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <p className="font-medium text-gray-800 text-sm border-b border-gray-100 pb-3">WhatsApp (Meta Cloud API)</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div><p className="text-sm font-medium">Enable WhatsApp Sending</p><p className="text-xs text-gray-500">Send messages automatically instead of just opening the WhatsApp app</p></div>
                      <Switch checked={whatsappForm.enabled} onCheckedChange={v => setWhatsappForm(f => ({ ...f, enabled: v }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Phone Number ID</Label>
                      <Input value={whatsappForm.phoneNumberId} onChange={e => setWhatsappForm(f => ({ ...f, phoneNumberId: e.target.value }))} placeholder="Meta WhatsApp Business Phone Number ID" />
                      <p className="text-xs text-gray-500">From Meta Business Manager → WhatsApp → API Setup.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-gray-400" />Access Token</Label>
                      <div className="relative">
                        <Input
                          type={showWhatsappToken ? 'text' : 'password'}
                          className="pr-9"
                          value={whatsappForm.accessToken}
                          onChange={e => setWhatsappForm(f => ({ ...f, accessToken: e.target.value }))}
                          placeholder="Permanent System User access token"
                        />
                        <button type="button" onClick={() => setShowWhatsappToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showWhatsappToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                      </div>
                      <p className="text-xs text-gray-500">Use a permanent System User token, not the 24-hour test token.</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg border border-amber-100 p-3 text-xs text-amber-800 space-y-1">
                      <p className="font-semibold text-amber-900">Important:</p>
                      <p>Free-text sends only work if the customer messaged you within the last 24 hours. Otherwise Meta needs an approved message Template. Every "Send WhatsApp" button tries the API first and automatically falls back to opening the WhatsApp app if it's rejected — nothing breaks either way.</p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button disabled={saveApiM.isPending} onClick={saveWhatsapp}><Save className="h-4 w-4 mr-2" />{saveApiM.isPending ? 'Saving...' : 'Save'}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
