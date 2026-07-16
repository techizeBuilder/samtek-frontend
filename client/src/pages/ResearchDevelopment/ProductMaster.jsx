import React, { useState, useEffect } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Package, Plus, Search, Filter, Eye, Edit2, Ban, RefreshCw,
  CheckCircle2, Clock, XCircle, FileText, Layers, Settings2
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const MACHINE_TYPES = ['Standard', 'Custom', 'Special Purpose Machine (SPM)'];

// Predefined fallback options for the smart suggestions in the + modal
const DEFAULT_OPTIONS = {
  'Category': ['Mixing Equipment', 'Miling Equipment', 'Crushing Equipment', 'Packing Equipment', 'Pumping Equipment', 'Welding Equipment', 'Construction Equipment', 'Agricultural Equipment', 'Special Purpose Machine'],
  'P-Type': ['Row Material', 'Assembly Material', 'Tool', 'Fabricated Child Part', 'Machining Material', 'Machine'],
  'P-SourceType': ['In House Manufacturing', 'Purchase Machine', 'Job Work Seat Metal', 'Job Work Machining', 'Out Source Manufactured'],
  'Metrology': ['Vernier Caliper', 'Weighing Scale', 'Pressure Gauge', 'Thermometer', 'Flow Meter', 'Torque Wrench']
};

// Cascade: P-Type -> Category -> P-Source Type. Strict linking — a Category only shows
// under the exact P-Type it was created under, and a P-Source Type only under the exact
// Category it was created under (which is itself already scoped to one P-Type).
const categoryOptionsFor = (pTypeVal, masterOptions) =>
  (masterOptions.Category || []).filter(o => o.parentValue === pTypeVal);
const pSourceOptionsFor = (categoryVal, masterOptions) =>
  (masterOptions.PSourceType || []).filter(o => o.parentValue === categoryVal);

const FIELD_KEY_MAP = { 'P-Type': 'pType', 'Category': 'category', 'P-SourceType': 'pSourceType', 'Metrology': 'metrology' };

const machineTypeBadge = (type) => {
  if (type === 'Custom') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (type === 'Special Purpose Machine (SPM)') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const designStatusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Testing: 'bg-amber-100 text-amber-700 border-amber-200',
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
};

const releaseStatusBadge = (status) => status === 'Released'
  ? 'bg-blue-100 text-blue-700 border-blue-200'
  : 'bg-slate-100 text-slate-500 border-slate-200';

const emptyForm = {
  code: '', name: '', description: '', category: '', pType: '', pSourceType: '',
  specifications: [], brand: '', machineType: 'Standard',
  metrology: '', customFields: [], forwardToNextPhase: false
};

const emptyTemplateForm = { pType: '', category: '', pSourceType: '', groups: [] };

export default function ProductMaster() {
  const {
    machines, stats, addMachine, updateMachine, discontinueMachine, reactivateMachine,
    masterOptions, addMasterOption,
    customFieldTemplates, getCustomFieldTemplate, saveCustomFieldTemplate, deleteCustomFieldTemplate,
  } = useRD();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRelease, setFilterRelease] = useState('All');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmDiscontinue, setConfirmDiscontinue] = useState(null);
  const [newOptionModal, setNewOptionModal] = useState({ open: false, field: '', value: '', parentValue: '' });
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [hierarchyInputs, setHierarchyInputs] = useState({ pType: '', category: '', pSourceType: '' });

  const handleAddOption = async () => {
    if (!newOptionModal.value) return;
    try {
      await addMasterOption({ field: newOptionModal.field, value: newOptionModal.value, parentValue: newOptionModal.parentValue || null });
      const fieldKey = FIELD_KEY_MAP[newOptionModal.field];
      if (editOpen) {
        setEditForm(f => ({ ...f, [fieldKey]: newOptionModal.value }));
      } else {
        setForm(f => ({ ...f, [fieldKey]: newOptionModal.value }));
      }
      setNewOptionModal({ open: false, field: '', value: '', parentValue: '' });
      showSuccessToast('Option Added', 'New option added successfully');
    } catch (e) {
      showSmartToast(e, 'Failed to add option');
    }
  };

  // ── Seed / clear custom fields whenever the P-Type/Category/P-Source Type combo changes ──
  const seedCustomFields = (state, setState) => {
    const template = getCustomFieldTemplate(state.pType, state.category, state.pSourceType);
    setState(f => {
      if (!template) {
        return f.customFields.length === 0 ? f : { ...f, customFields: [] };
      }
      const seeded = [];
      template.groups.forEach(g => {
        g.fields.forEach(fld => {
          const existing = f.customFields.find(cf => cf.groupLabel === g.label && cf.fieldName === fld.name);
          seeded.push({ groupLabel: g.label, fieldName: fld.name, value: existing?.value || '' });
        });
      });
      return { ...f, customFields: seeded };
    });
  };

  useEffect(() => {
    if (!addOpen) return;
    seedCustomFields(form, setForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pType, form.category, form.pSourceType, addOpen]);

  useEffect(() => {
    if (!editOpen) return;
    seedCustomFields(editForm, setEditForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.pType, editForm.category, editForm.pSourceType, editOpen]);

  const filtered = machines.filter(m => {
    if (!showDiscontinued && m.isDiscontinued) return false;
    if (showDiscontinued && !m.isDiscontinued) return false;
    if (filterStatus !== 'All' && m.designStatus !== filterStatus) return false;
    if (filterRelease !== 'All' && m.releaseStatus !== filterRelease) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    if (!form.code || !form.name || !form.category || !form.pType || !form.pSourceType) return;
    addMachine(form);
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleEdit = () => {
    if (!editForm.code || !editForm.name || !editForm.category || !editForm.pType || !editForm.pSourceType) return;
    updateMachine(selected._id, editForm);
    setEditOpen(false);
  };

  const openEdit = (m) => {
    setSelected(m);
    setEditForm({
      code: m.code || '', name: m.name || '', description: m.description || '',
      category: m.category || '', pType: m.pType || '', pSourceType: m.pSourceType || '',
      specifications: Array.isArray(m.specifications) ? m.specifications : [],
      brand: m.brand || '',
      machineType: m.machineType || 'Standard',
      metrology: m.metrology || '',
      customFields: Array.isArray(m.customFields) ? m.customFields : [],
      forwardToNextPhase: !!m.forwardToNextPhase,
    });
    setEditOpen(true);
  };

  // ── Specification key-value helpers ──────────────────────────────────────────
  const addSpecRow = (setState) => setState(f => ({ ...f, specifications: [...f.specifications, { key: '', value: '' }] }));
  const removeSpecRow = (setState, idx) => setState(f => ({ ...f, specifications: f.specifications.filter((_, i) => i !== idx) }));
  const updateSpecRow = (setState, idx, field, val) =>
    setState(f => ({
      ...f,
      specifications: f.specifications.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));

  const renderSpecBuilder = (state, setState) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-600">P-Specifications</label>
        <button
          type="button"
          onClick={() => addSpecRow(setState)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Row
        </button>
      </div>
      {state.specifications.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
          No specifications yet — click "Add Row" to add key-value pairs.
        </p>
      ) : (
        <div className="space-y-2">
          {state.specifications.map((spec, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                className="bg-white flex-1"
                placeholder="Key (e.g. Power)"
                value={spec.key}
                onChange={e => updateSpecRow(setState, idx, 'key', e.target.value)}
              />
              <Input
                className="bg-white flex-1"
                placeholder="Value (e.g. 5 kW)"
                value={spec.value}
                onChange={e => updateSpecRow(setState, idx, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeSpecRow(setState, idx)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Cascading dropdown, optionally with a "+" add-new button. `opts.resetKeys` clears
  // dependent fields on change. `opts.showAddButton = false` renders a plain select — used
  // for P-Type/Category/P-Source Type on the machine form, since that 3-level hierarchy is
  // now only built via "Manage Custom Fields", not created ad-hoc while adding a product. ──
  const renderDropdownWithAdd = (label, field, fieldKey, options, state, setState, opts = {}) => {
    const { disabled = false, disabledHint = '', parentValueForAdd = '', resetKeys = [], required = true, showAddButton = true } = opts;
    return (
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}{required && ' *'}</label>
        <div className="flex gap-2">
          <select
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            value={state[fieldKey]}
            disabled={disabled}
            onChange={e => {
              const val = e.target.value;
              setState(f => {
                const next = { ...f, [fieldKey]: val };
                resetKeys.forEach(k => { next[k] = Array.isArray(f[k]) ? [] : ''; });
                return next;
              });
            }}
          >
            <option value="" disabled>{disabled ? disabledHint : 'Select...'}</option>
            {options?.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          {showAddButton && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              onClick={() => setNewOptionModal({ open: true, field, value: '', parentValue: parentValueForAdd })}
              className="flex-shrink-0 h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ── Custom fields block: renders parent label -> sub-field name -> value input ──
  const renderCustomFieldsBlock = (state, setState) => {
    if (!state.pType || !state.category || !state.pSourceType) return null;
    const template = getCustomFieldTemplate(state.pType, state.category, state.pSourceType);

    if (!template || template.groups.length === 0) {
      return (
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Custom Fields</label>
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-xs text-slate-400 italic text-center">
            No custom fields configured for this P-Type / Category / P-Source Type combination. Use "Manage Custom Fields" to add some.
          </div>
        </div>
      );
    }

    const updateFieldValue = (groupLabel, fieldName, value) => {
      setState(f => ({
        ...f,
        customFields: f.customFields.map(cf =>
          (cf.groupLabel === groupLabel && cf.fieldName === fieldName) ? { ...cf, value } : cf
        )
      }));
    };

    return (
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-600 block">Custom Fields</label>
        {template.groups.map(g => (
          <div key={g.label} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">{g.label}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.fields.map(fld => {
                const cf = state.customFields.find(c => c.groupLabel === g.label && c.fieldName === fld.name);
                return (
                  <div key={fld.name}>
                    <label className="text-[11px] text-slate-500 mb-1 block">{fld.name}</label>
                    <Input className="bg-white" value={cf?.value || ''} onChange={e => updateFieldValue(g.label, fld.name, e.target.value)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderForwardCheckbox = (state, setState, idPrefix) => (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <input
        type="checkbox"
        id={`${idPrefix}-forward`}
        className="mt-0.5"
        checked={state.forwardToNextPhase}
        onChange={e => setState(f => ({ ...f, forwardToNextPhase: e.target.checked }))}
      />
      <label htmlFor={`${idPrefix}-forward`} className="text-xs text-blue-800 leading-relaxed cursor-pointer">
        <span className="font-semibold">Forward to Design &amp; Prototype.</span> When checked, this product will appear in the Design Approval and Prototype Testing queues.
      </label>
    </div>
  );

  // ── Custom Field Template Manager helpers ────────────────────────────────────
  useEffect(() => {
    if (!templateManagerOpen) return;
    if (!templateForm.pType || !templateForm.category || !templateForm.pSourceType) {
      setTemplateForm(f => (f.groups.length === 0 ? f : { ...f, groups: [] }));
      return;
    }
    const existing = getCustomFieldTemplate(templateForm.pType, templateForm.category, templateForm.pSourceType);
    setTemplateForm(f => ({
      ...f,
      groups: existing ? existing.groups.map(g => ({ label: g.label, fields: g.fields.map(fl => ({ name: fl.name })) })) : []
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateForm.pType, templateForm.category, templateForm.pSourceType, templateManagerOpen]);

  const addTemplateGroup = () => setTemplateForm(f => ({ ...f, groups: [...f.groups, { label: '', fields: [] }] }));
  const removeTemplateGroup = (idx) => setTemplateForm(f => ({ ...f, groups: f.groups.filter((_, i) => i !== idx) }));
  const updateTemplateGroupLabel = (idx, label) => setTemplateForm(f => ({ ...f, groups: f.groups.map((g, i) => i === idx ? { ...g, label } : g) }));
  const addTemplateField = (gIdx) => setTemplateForm(f => ({ ...f, groups: f.groups.map((g, i) => i === gIdx ? { ...g, fields: [...g.fields, { name: '' }] } : g) }));
  const removeTemplateField = (gIdx, fIdx) => setTemplateForm(f => ({ ...f, groups: f.groups.map((g, i) => i === gIdx ? { ...g, fields: g.fields.filter((_, j) => j !== fIdx) } : g) }));
  const updateTemplateFieldName = (gIdx, fIdx, name) => setTemplateForm(f => ({ ...f, groups: f.groups.map((g, i) => i === gIdx ? { ...g, fields: g.fields.map((fl, j) => j === fIdx ? { name } : fl) } : g) }));

  // ── Classification Hierarchy panel: the only place P-Type/Category/P-Source Type get
  // created. Clicking an item in a column selects it (and clears the deeper levels); the
  // input+button under each column adds a new value scoped to the currently selected parent. ──
  const selectHierarchyValue = (fieldKey, value) => {
    setTemplateForm(f => {
      const next = { ...f, [fieldKey]: value };
      if (fieldKey === 'pType') { next.category = ''; next.pSourceType = ''; }
      if (fieldKey === 'category') { next.pSourceType = ''; }
      return next;
    });
  };

  const handleAddHierarchyValue = async (field, fieldKey, parentValue) => {
    const value = hierarchyInputs[fieldKey]?.trim();
    if (!value) return;
    try {
      await addMasterOption({ field, value, parentValue: parentValue || null });
      setHierarchyInputs(v => ({ ...v, [fieldKey]: '' }));
      selectHierarchyValue(fieldKey, value);
      showSuccessToast(`${label(field)} Added`, `"${value}" added successfully`);
    } catch (e) {
      showSmartToast(e, `Failed to add ${label(field)}`);
    }
  };

  const label = (field) => field === 'P-SourceType' ? 'P-Source Type' : field;

  const renderHierarchyColumn = ({ fieldLabel, field, fieldKey, options, disabled, disabledHint, parentValue }) => (
    <div className={`rounded-lg border p-3 ${disabled ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
      <p className="text-xs font-bold text-slate-700 mb-2">{fieldLabel}</p>
      {disabled ? (
        <p className="text-xs text-slate-400 italic text-center py-6">{disabledHint}</p>
      ) : (
        <>
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              list={`hierarchy-${fieldKey}-suggestions`}
              className="flex-1 h-8 text-xs rounded-md border border-slate-200 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`New ${fieldLabel}...`}
              value={hierarchyInputs[fieldKey]}
              onChange={e => setHierarchyInputs(v => ({ ...v, [fieldKey]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddHierarchyValue(field, fieldKey, parentValue)}
            />
            <datalist id={`hierarchy-${fieldKey}-suggestions`}>
              {DEFAULT_OPTIONS[field]?.map(opt => <option key={opt} value={opt} />)}
            </datalist>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8 flex-shrink-0 bg-white" onClick={() => handleAddHierarchyValue(field, fieldKey, parentValue)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">None yet</p>
            ) : options.map(o => (
              <button
                type="button"
                key={o.value}
                onClick={() => selectHierarchyValue(fieldKey, o.value)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${templateForm[fieldKey] === o.value ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {o.value}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const templateExists = templateForm.pType && templateForm.category && templateForm.pSourceType
    ? !!getCustomFieldTemplate(templateForm.pType, templateForm.category, templateForm.pSourceType)
    : false;

  const handleSaveTemplate = async () => {
    try {
      await saveCustomFieldTemplate({
        pType: templateForm.pType, category: templateForm.category, pSourceType: templateForm.pSourceType,
        groups: templateForm.groups
      });
      showSuccessToast('Template Saved', 'Custom field template saved successfully');
      setTemplateManagerOpen(false);
      setTemplateForm(emptyTemplateForm);
    } catch (e) {
      showSmartToast(e, 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async () => {
    const existing = getCustomFieldTemplate(templateForm.pType, templateForm.category, templateForm.pSourceType);
    if (!existing) return;
    try {
      await deleteCustomFieldTemplate(existing._id);
      showSuccessToast('Template Deleted', 'Custom field template removed');
      setTemplateForm(f => ({ ...f, groups: [] }));
    } catch (e) {
      showSmartToast(e, 'Failed to delete template');
    }
  };

  const groupedCustomFields = (customFields) =>
    (customFields || []).reduce((acc, cf) => {
      (acc[cf.groupLabel] = acc[cf.groupLabel] || []).push(cf);
      return acc;
    }, {});

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" /> Product Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Central register of all machines — no machine exists in ERP without R&D entry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateManagerOpen(true)} className="bg-white">
            <Settings2 className="h-4 w-4 mr-2" /> Manage Classifications &amp; Fields
          </Button>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
            <Plus className="h-4 w-4 mr-2" /> Add Machine
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: stats.totalMachines, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved Designs', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Released for Production', value: stats.released, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Discontinued', value: stats.discontinued, icon: Ban, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-lg`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, code or category..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['All', 'Draft', 'Testing', 'Approved', 'Rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {['All', 'Released', 'Not Released'].map(s => (
                <button key={s} onClick={() => setFilterRelease(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterRelease === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>{s}</button>
              ))}
            </div>
            <button onClick={() => setShowDiscontinued(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiscontinued ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
              {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">P-Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Design Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Release</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No machines found matching the filters.</td></tr>
                ) : filtered.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/30">{m.code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{m.name}</div>
                      {m.isDiscontinued && <span className="text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{m.category}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${machineTypeBadge(m.machineType || 'Standard')}`}>{m.machineType || 'Standard'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${designStatusBadge(m.designStatus)}`}>{m.designStatus}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${releaseStatusBadge(m.releaseStatus)}`}>{m.releaseStatus}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{m.updatedAt}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600" onClick={() => { setSelected(m); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-purple-600" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        {!m.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600" onClick={() => setConfirmDiscontinue(m)}><Ban className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600" onClick={() => reactivateMachine(m._id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Machine Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Add New</DialogTitle></DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Product Code *</label>
                <Input className="bg-white" placeholder="e.g. CM-009" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Name *</label>
                <Input className="bg-white" placeholder="Enter product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderDropdownWithAdd('P-Type', 'P-Type', 'pType', masterOptions.PType, form, setForm, {
                  resetKeys: ['category', 'pSourceType'], showAddButton: false
                })}
                {renderDropdownWithAdd('Category', 'Category', 'category', categoryOptionsFor(form.pType, masterOptions), form, setForm, {
                  disabled: !form.pType, disabledHint: 'Select P-Type first', resetKeys: ['pSourceType'], showAddButton: false
                })}
                {renderDropdownWithAdd('P-Source Type', 'P-SourceType', 'pSourceType', pSourceOptionsFor(form.category, masterOptions), form, setForm, {
                  disabled: !form.category, disabledHint: 'Select Category first', showAddButton: false
                })}
              </div>
              <p className="text-xs text-slate-400">
                Don't see the P-Type / Category / P-Source Type you need? Add it via <strong>Manage Custom Fields</strong> above.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Brand</label>
                <Input className="bg-white" placeholder="Enter brand" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={form.machineType} onChange={e => setForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {renderDropdownWithAdd('Metrology', 'Metrology', 'metrology', masterOptions.Metrology, form, setForm, { required: false })}
            </div>

            {renderSpecBuilder(form, setForm)}

            {renderCustomFieldsBlock(form, setForm)}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {renderForwardCheckbox(form, setForm, 'add')}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 leading-relaxed">
              New machine will be created with <strong>Draft</strong> design status and <strong>Not Released</strong>. It must go through design approval and prototype testing before production release.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.code || !form.name || !form.category || !form.pType || !form.pSourceType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Machine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Edit Machine — {selected?.code}</DialogTitle></DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Product Code *</label>
                <Input className="bg-white" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Name *</label>
                <Input className="bg-white" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderDropdownWithAdd('P-Type', 'P-Type', 'pType', masterOptions.PType, editForm, setEditForm, {
                  resetKeys: ['category', 'pSourceType'], showAddButton: false
                })}
                {renderDropdownWithAdd('Category', 'Category', 'category', categoryOptionsFor(editForm.pType, masterOptions), editForm, setEditForm, {
                  disabled: !editForm.pType, disabledHint: 'Select P-Type first', resetKeys: ['pSourceType'], showAddButton: false
                })}
                {renderDropdownWithAdd('P-Source Type', 'P-SourceType', 'pSourceType', pSourceOptionsFor(editForm.category, masterOptions), editForm, setEditForm, {
                  disabled: !editForm.category, disabledHint: 'Select Category first', showAddButton: false
                })}
              </div>
              <p className="text-xs text-slate-400">
                Don't see the P-Type / Category / P-Source Type you need? Add it via <strong>Manage Custom Fields</strong> above.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Brand</label>
                <Input className="bg-white" value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={editForm.machineType} onChange={e => setEditForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {renderDropdownWithAdd('Metrology', 'Metrology', 'metrology', masterOptions.Metrology, editForm, setEditForm, { required: false })}
            </div>

            {renderSpecBuilder(editForm, setEditForm)}

            {renderCustomFieldsBlock(editForm, setEditForm)}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {renderForwardCheckbox(editForm, setEditForm, 'edit')}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.code || !editForm.name || !editForm.category || !editForm.pType || !editForm.pSourceType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Statuses & Types */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Design Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${designStatusBadge(selected.designStatus)}`}>{selected.designStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Release Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${releaseStatusBadge(selected.releaseStatus)}`}>{selected.releaseStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Machine Type</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${machineTypeBadge(selected.machineType || 'Standard')}`}>{selected.machineType || 'Standard'}</span>
                </div>

                {/* Dynamic Classifications */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selected.category}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Source Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pSourceType || 'N/A'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Metrology</p>
                  <p className="text-sm font-medium text-slate-800">{selected.metrology || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Design &amp; Prototype</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${selected.forwardToNextPhase ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {selected.forwardToNextPhase ? 'Forwarded' : 'Not Forwarded'}
                  </span>
                </div>

                {/* Specifications & Dates */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Brand</p>
                  <p className="text-sm font-medium text-slate-800">{selected.brand || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-slate-800">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Description</p>
                  <p className="text-sm text-slate-700">{selected.description}</p>
                </div>
              )}

              {Array.isArray(selected.specifications) && selected.specifications.filter(s => s.key).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">P-Specifications</p>
                  <div className="divide-y divide-slate-100">
                    {selected.specifications.filter(s => s.key).map((spec, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-semibold text-slate-500 w-2/5">{spec.key}</span>
                        <span className="text-sm text-slate-800 font-medium">{spec.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(selected.customFields) && selected.customFields.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Custom Fields</p>
                  <div className="space-y-3">
                    {Object.entries(groupedCustomFields(selected.customFields)).map(([groupLabel, fields]) => (
                      <div key={groupLabel}>
                        <p className="text-xs font-bold text-slate-600 mb-1">{groupLabel}</p>
                        <div className="divide-y divide-slate-100">
                          {fields.map((cf, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <span className="text-xs font-semibold text-slate-500 w-2/5">{cf.fieldName}</span>
                              <span className="text-sm text-slate-800 font-medium">{cf.value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.rejectionNote && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-500 font-semibold mb-1">Rejection Note</p>
                  <p className="text-sm text-red-800">{selected.rejectionNote}</p>
                </div>
              )}
              {selected.isDiscontinued && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold">This machine has been discontinued and marked inactive in ERP.</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Discontinue Dialog */}
      <Dialog open={!!confirmDiscontinue} onOpenChange={() => setConfirmDiscontinue(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Discontinue Machine</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Are you sure you want to discontinue <strong>{confirmDiscontinue?.name}</strong>? The machine will be marked <strong>Inactive</strong> in ERP and unavailable for new production orders.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscontinue(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { discontinueMachine(confirmDiscontinue._id); setConfirmDiscontinue(null); }}>Discontinue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Master Option Dialog (With Smart Suggestions via Datalist) */}
      <Dialog open={newOptionModal.open} onOpenChange={(open) => !open && setNewOptionModal({ open: false, field: '', value: '', parentValue: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New {newOptionModal.field}</DialogTitle></DialogHeader>
          <div className="py-4">
            {newOptionModal.parentValue && (
              <p className="text-xs text-slate-500 mb-3">Linked under: <span className="font-semibold text-slate-700">{newOptionModal.parentValue}</span></p>
            )}
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Value to Save *</label>

            {/* Input linked to the datalist below */}
            <input
              type="text"
              list="modal-suggestions"
              autoFocus
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={`Type to search or add new...`}
              value={newOptionModal.value}
              onChange={e => setNewOptionModal(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddOption()}
            />

            {/* The Smart Suggestions Dropdown */}
            <datalist id="modal-suggestions">
              {DEFAULT_OPTIONS[newOptionModal.field]?.map(opt => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            <p className="text-xs text-slate-500 mt-2">
              Pick a suggested requirement or type a custom one to save it to the master list.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOptionModal({ open: false, field: '', value: '', parentValue: '' })}>Cancel</Button>
            <Button onClick={handleAddOption} disabled={!newOptionModal.value} className="bg-blue-600 hover:bg-blue-700 text-white">Save Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Custom Fields (Template Editor) Dialog */}
      <Dialog open={templateManagerOpen} onOpenChange={(open) => { setTemplateManagerOpen(open); if (!open) setTemplateForm(emptyTemplateForm); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Classifications &amp; Custom Fields</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              This is the only place P-Type, Category and P-Source Type values are created. Click a P-Type to select it, which unlocks
              its Categories; click a Category to unlock its P-Source Types. Use the input under each column to add a new value scoped
              to whatever is selected in the column to its left. Once a full combination is selected below, you can also define extra
              fields that appear when creating a product with that exact combination.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderHierarchyColumn({
                fieldLabel: 'P-Type', field: 'P-Type', fieldKey: 'pType',
                options: masterOptions.PType || [], disabled: false, parentValue: null
              })}
              {renderHierarchyColumn({
                fieldLabel: 'Category', field: 'Category', fieldKey: 'category',
                options: categoryOptionsFor(templateForm.pType, masterOptions),
                disabled: !templateForm.pType, disabledHint: 'Select a P-Type first', parentValue: templateForm.pType
              })}
              {renderHierarchyColumn({
                fieldLabel: 'P-Source Type', field: 'P-SourceType', fieldKey: 'pSourceType',
                options: pSourceOptionsFor(templateForm.category, masterOptions),
                disabled: !templateForm.category, disabledHint: 'Select a Category first', parentValue: templateForm.category
              })}
            </div>

            {(templateForm.pType || templateForm.category || templateForm.pSourceType) && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                Selected: <strong>{templateForm.pType || '—'}</strong> / <strong>{templateForm.category || '—'}</strong> / <strong>{templateForm.pSourceType || '—'}</strong>
              </p>
            )}

            {templateForm.pType && templateForm.category && templateForm.pSourceType ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">Field Groups</label>
                  <button
                    type="button"
                    onClick={addTemplateGroup}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Group
                  </button>
                </div>

                {templateForm.groups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
                    No groups yet — click "Add Group" to start.
                  </p>
                ) : (
                  templateForm.groups.map((g, gIdx) => (
                    <div key={gIdx} className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          className="bg-white flex-1"
                          placeholder="Parent label (e.g. Motor Specifications)"
                          value={g.label}
                          onChange={e => updateTemplateGroupLabel(gIdx, e.target.value)}
                        />
                        <button type="button" onClick={() => removeTemplateGroup(gIdx)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {g.fields.map((fld, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                            <Input
                              className="bg-white flex-1"
                              placeholder="Sub-field name (e.g. Voltage)"
                              value={fld.name}
                              onChange={e => updateTemplateFieldName(gIdx, fIdx, e.target.value)}
                            />
                            <button type="button" onClick={() => removeTemplateField(gIdx, fIdx)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTemplateField(gIdx)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add Field
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">Select P-Type, Category and P-Source Type to manage fields for that combination.</p>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {templateExists && (
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteTemplate}>Delete Template</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplateManagerOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={!templateForm.pType || !templateForm.category || !templateForm.pSourceType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Template</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
