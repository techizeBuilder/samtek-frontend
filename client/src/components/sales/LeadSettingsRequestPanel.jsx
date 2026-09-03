import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi } from '@/api/adminSettingsApi';
import { leadSettingRequestApi } from '@/api/leadSettingRequestApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { List, Tag, Layers, FileText, ClipboardList, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';

// Same 6 categories as the old Super Admin "Lead Settings" dropdown — now
// per-company, and every add/edit/delete here creates a pending request
// instead of saving directly. Company Admin approves/rejects it from
// /hrms/CompanyAdmin/lead-settings (LeadSettingRequests.jsx).
const CATEGORIES = [
  { id: 'leadStages', label: 'Lead Stage', icon: List, primaryKey: 'name', placeholder: 'e.g. Contacted', addLabel: 'Add Stage' },
  { id: 'leadSources', label: 'Lead Source', icon: Tag, primaryKey: 'name', placeholder: 'e.g. IndiaMART', addLabel: 'Add Source' },
  { id: 'businessTypes', label: 'Business Type', icon: Layers, primaryKey: 'name', placeholder: 'e.g. Distributor', addLabel: 'Add Type' },
  { id: 'documentTypes', label: 'Document Type', icon: FileText, primaryKey: 'name', placeholder: 'e.g. Aadhaar', addLabel: 'Add Document Type' },
  { id: 'leadRejectReasons', label: 'Lead Reject Reason', icon: Tag, primaryKey: 'label', placeholder: 'e.g. Quoted Price Is High', addLabel: 'Add Reason' },
  { id: 'salesChecklist', label: 'Sales Checklist', icon: ClipboardList, primaryKey: 'label', addLabel: 'Add Point' },
];

const VALUE_TYPE_OPTIONS = [
  { value: 'none', label: 'No value — just a checkbox' },
  { value: 'text', label: 'Text value' },
  { value: 'number', label: 'Number value' },
];

const describeItem = (categoryId, item) => {
  if (!item) return '';
  return categoryId === 'salesChecklist' ? item.label : (item.name ?? item.label ?? '');
};

const emptyFormFor = (category) => category.id === 'salesChecklist'
  ? { label: '', valueType: 'text', valueLabel: '', valuePlaceholder: '' }
  : { [category.primaryKey]: '' };

const formFromItem = (category, item) => category.id === 'salesChecklist'
  ? { label: item.label || '', valueType: item.valueType || 'text', valueLabel: item.valueLabel || '', valuePlaceholder: item.valuePlaceholder || '' }
  : { [category.primaryKey]: item[category.primaryKey] || '' };

const isFormFilled = (category, form) => category.id === 'salesChecklist'
  ? !!form.label?.trim()
  : !!form[category.primaryKey]?.trim();

function InlineForm({ category, form, setForm, onCancel, onSubmit, submitLabel }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2">
      {category.id === 'salesChecklist' ? (
        <>
          <Input className="h-8 text-sm bg-white" placeholder="Checklist point" value={form.label} onChange={e => set('label', e.target.value)} />
          <select
            className="h-8 w-full text-sm border border-gray-300 rounded px-2 bg-white"
            value={form.valueType}
            onChange={e => set('valueType', e.target.value)}
          >
            {VALUE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {form.valueType !== 'none' && (
            <>
              <Input className="h-8 text-sm bg-white" placeholder="Value field label" value={form.valueLabel} onChange={e => set('valueLabel', e.target.value)} />
              <Input className="h-8 text-sm bg-white" placeholder="Value placeholder" value={form.valuePlaceholder} onChange={e => set('valuePlaceholder', e.target.value)} />
            </>
          )}
        </>
      ) : (
        <Input
          className="h-8 text-sm bg-white"
          placeholder={category.placeholder}
          value={form[category.primaryKey] || ''}
          onChange={e => set(category.primaryKey, e.target.value)}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7" disabled={!isFormFilled(category, form)} onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}

function LiveItemRow({ category, item, pendingRequest, canCancelPending, onEdit, onDelete, onCancel }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => formFromItem(category, item));

  if (pendingRequest?.action === 'delete') {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] shrink-0">Pending Delete</Badge>
          <span className="text-sm text-red-700 line-through truncate">{describeItem(category.id, item)}</span>
        </div>
        {canCancelPending(pendingRequest) && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 shrink-0" onClick={() => onCancel(pendingRequest._id)}>
            <X className="h-3 w-3 mr-1" />Cancel
          </Button>
        )}
      </div>
    );
  }

  if (pendingRequest?.action === 'edit') {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
        <div className="min-w-0">
          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] mb-1">Pending Edit</Badge>
          <p className="text-sm text-gray-500 line-through truncate">{describeItem(category.id, item)}</p>
          <p className="text-sm font-medium text-amber-800 truncate">→ {describeItem(category.id, pendingRequest.payload)}</p>
        </div>
        {canCancelPending(pendingRequest) && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 shrink-0" onClick={() => onCancel(pendingRequest._id)}>
            <X className="h-3 w-3 mr-1" />Cancel
          </Button>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <InlineForm
        category={category}
        form={form}
        setForm={setForm}
        onCancel={() => setEditing(false)}
        onSubmit={() => { onEdit(item._id, form); setEditing(false); }}
        submitLabel="Propose Edit"
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <span className="text-sm text-gray-800 truncate">{describeItem(category.id, item)}</span>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-800" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => onDelete(item._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function PendingAddRow({ category, request, canCancelPending, onCancel }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50">
      <div className="flex items-center gap-2 min-w-0">
        <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] shrink-0">Pending Add</Badge>
        <span className="text-sm text-green-800 font-medium truncate">{describeItem(category.id, request.payload)}</span>
      </div>
      {canCancelPending(request) && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 shrink-0" onClick={() => onCancel(request._id)}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      )}
    </div>
  );
}

const STATUS_STYLE = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

function HistoryCard({ request, canCancelPending, onCancel }) {
  const category = CATEGORIES.find(c => c.id === request.field);
  const actionLabel = request.action === 'add' ? 'Add' : request.action === 'edit' ? 'Edit' : 'Delete';
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant="outline" className="text-[10px]">{category?.label || request.field}</Badge>
          <span className="text-xs font-medium text-gray-600">{actionLabel}</span>
          <Badge className={`text-[10px] border ${STATUS_STYLE[request.status]}`} variant="outline">{request.status}</Badge>
        </div>
        <p className="text-sm text-gray-800">
          {request.action === 'delete' && <>Delete <span className="font-medium">"{describeItem(request.field, request.previousValue)}"</span></>}
          {request.action === 'add' && <>Add <span className="font-medium">"{describeItem(request.field, request.payload)}"</span></>}
          {request.action === 'edit' && (
            <>
              <span className="font-medium">"{describeItem(request.field, request.previousValue)}"</span>
              {' → '}
              <span className="font-medium">"{describeItem(request.field, request.payload)}"</span>
            </>
          )}
        </p>
        {request.status !== 'Pending' && request.reviewRemarks && (
          <p className="text-xs text-gray-500 mt-0.5">Remark: {request.reviewRemarks}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">{new Date(request.requestedAt || request.createdAt).toLocaleString()}</p>
      </div>
      {request.status === 'Pending' && canCancelPending(request) && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 shrink-0" onClick={() => onCancel(request._id)}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      )}
    </div>
  );
}

const HISTORY_TABS = ['Pending', 'Approved', 'Rejected'];

export default function LeadSettingsRequestPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState('manage'); // 'manage' | 'requests'
  const [activeCategory, setActiveCategory] = useState('leadStages');
  const [historyTab, setHistoryTab] = useState('Pending');
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState(() => emptyFormFor(CATEGORIES[0]));

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getAll(),
  });
  const settings = settingsData?.settings || {};

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['lead-setting-requests'],
    queryFn: () => leadSettingRequestApi.listRequests(),
  });
  const allRequests = requestsData?.requests || [];
  const pendingRequests = allRequests.filter(r => r.status === 'Pending');
  const myRequests = allRequests.filter(r => String(r.requestedBy?._id || r.requestedBy) === String(user?.id || user?._id));

  const canCancelPending = (request) => String(request.requestedBy?._id || request.requestedBy) === String(user?.id || user?._id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lead-setting-requests'] });

  const createM = useMutation({
    mutationFn: (body) => leadSettingRequestApi.createRequest(body),
    onSuccess: () => { invalidate(); toast({ title: 'Sent for approval', description: 'Your Company Admin will review this change.' }); },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelM = useMutation({
    mutationFn: (id) => leadSettingRequestApi.cancelRequest(id),
    onSuccess: () => { invalidate(); toast({ title: 'Request withdrawn' }); },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const category = CATEGORIES.find(c => c.id === activeCategory);
  const items = settings[activeCategory] || [];
  const pendingForItem = (itemId) => pendingRequests.find(r => r.field === activeCategory && String(r.targetId) === String(itemId));
  const pendingAdds = pendingRequests.filter(r => r.field === activeCategory && r.action === 'add');

  const switchCategory = (id) => {
    setActiveCategory(id);
    setAddingNew(false);
    setNewForm(emptyFormFor(CATEGORIES.find(c => c.id === id)));
  };

  const isLoading = settingsLoading || requestsLoading;

  return (
    <div className="space-y-4">
      {/* Top-level tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setView('manage')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${view === 'manage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Manage
        </button>
        <button
          onClick={() => setView('requests')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${view === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          My Requests
          {myRequests.filter(r => r.status === 'Pending').length > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 text-amber-700 bg-amber-50">
              {myRequests.filter(r => r.status === 'Pending').length}
            </Badge>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : view === 'manage' ? (
        <div className="flex flex-col md:flex-row gap-4 min-h-[55vh]">
          {/* Category nav */}
          <div className="w-full md:w-48 shrink-0 space-y-0.5">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const count = pendingRequests.filter(r => r.field === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => switchCategory(c.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeCategory === c.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 shrink-0" />{c.label}</span>
                  {count > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 text-amber-700 bg-amber-50">{count}</Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-800">{category.label}</h3>
              {!addingNew && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingNew(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />{category.addLabel}
                </Button>
              )}
            </div>

            {addingNew && (
              <InlineForm
                category={category}
                form={newForm}
                setForm={setNewForm}
                onCancel={() => setAddingNew(false)}
                onSubmit={() => { createM.mutate({ field: activeCategory, action: 'add', payload: newForm }); setAddingNew(false); }}
                submitLabel="Propose Add"
              />
            )}

            <div className="space-y-1.5">
              {items.length === 0 && pendingAdds.length === 0 && !addingNew && (
                <p className="text-sm text-gray-400 italic py-1">No items yet.</p>
              )}
              {items.map(item => (
                <LiveItemRow
                  key={item._id}
                  category={category}
                  item={item}
                  pendingRequest={pendingForItem(item._id)}
                  canCancelPending={canCancelPending}
                  onEdit={(id, form) => createM.mutate({ field: activeCategory, action: 'edit', payload: form, targetId: id })}
                  onDelete={(id) => createM.mutate({ field: activeCategory, action: 'delete', targetId: id })}
                  onCancel={(id) => cancelM.mutate(id)}
                />
              ))}
              {pendingAdds.map(r => (
                <PendingAddRow key={r._id} category={category} request={r} canCancelPending={canCancelPending} onCancel={(id) => cancelM.mutate(id)} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1">
            {HISTORY_TABS.map(t => (
              <button
                key={t}
                onClick={() => setHistoryTab(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${historyTab === t ? STATUS_STYLE[t] + ' border' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {t} ({myRequests.filter(r => r.status === t).length})
              </button>
            ))}
          </div>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {myRequests.filter(r => r.status === historyTab).length === 0 ? (
              <p className="text-sm text-gray-400 italic py-4 text-center">No {historyTab.toLowerCase()} requests.</p>
            ) : (
              myRequests.filter(r => r.status === historyTab).map(r => (
                <HistoryCard key={r._id} request={r} canCancelPending={canCancelPending} onCancel={(id) => cancelM.mutate(id)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
