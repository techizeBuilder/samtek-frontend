import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Package, Wrench } from 'lucide-react';

// Vendor creation, Step 2 — "Assign" (client design change D2): what a vendor
// supplies is chosen in its OWN dialog, separate from the vendor's details
// form. Opened from the vendor card's "Products & Services" button any time,
// and offered right after a vendor is created (afterCreate) — "now, or days
// later". Saves only suppliedItems/services (PUT /api/suppliers/:id; the
// server leaves every other field alone when they're absent).
//
// Products = Items marked Purchasable (Inventory / Product Master / Motor
// Master — never a Child Part or Sub Child Part, whose vendor need is job
// work). Services = Process Template step names, matched by name to every BOM
// step marked Out Source (see supplierController.js getSupplierCatalog).
export default function VendorCoverageDialog({ vendor, open, onOpenChange, catalogItems = [], catalogServices = [], afterCreate = false, onSaved }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  // Products filter (2026-09-28) — by where the item comes from (Inventory /
  // Product Master / Motor Master); only sources that actually have items
  // get a chip.
  const [sourceFilter, setSourceFilter] = useState('all');
  // Second-level filter for one selected source with its own classification:
  // Inventory's itemCategories (multi-select "Item Category" — NOT itemType,
  // ~70% one value in real data), Product Master's category ("P-Type").
  // Motor Master saves neither, so it has none. 'all', a normalized
  // (trimmed, lowercased) value, or '(blank)'.
  const [subFilter, setSubFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  // Fresh copy of the vendor's current coverage every time the dialog opens.
  useEffect(() => {
    if (!open || !vendor) return;
    setItems((vendor.suppliedItems || []).map(String));
    setServices(vendor.services || []);
    setTab('products');
    setSearch('');
    setSourceFilter('all');
    setSubFilter('all');
  }, [open, vendor?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!vendor) return null;
  // Under review — the Company Admin is approving exactly what was submitted.
  const readOnly = vendor.approvalStatus === 'Pending Approval';
  const itemById = new Map(catalogItems.map(it => [String(it._id), it]));
  const toggleIn = (list, setList, value) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('PUT', `/api/suppliers/${vendor._id}`, { suppliedItems: items, services });
      toast({ title: 'Products & Services saved', description: `${items.length} product(s), ${services.length} service(s).` });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Could not save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderProducts = () => {
    const q = search.trim().toLowerCase();
    const sourceOrder = ['Inventory', 'Product Master', 'Motor Master'];
    const availableSources = sourceOrder.filter(src => catalogItems.some(it => it.source === src));
    const subFieldFor = { 'Inventory': 'itemCategories', 'Product Master': 'category' };
    const subField = subFieldFor[sourceFilter];
    const isArraySubField = subField === 'itemCategories';
    const normalize = (s) => (s || '').trim();
    const titleCase = (s) => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    // Every value this item carries for the current sub-field — '(blank)' is
    // its own bucket rather than hidden.
    const subValuesOf = (it) => {
      const raw = isArraySubField ? (it[subField] || []) : [it[subField]];
      const vals = raw.map(normalize).filter(Boolean);
      return vals.length > 0 ? vals : ['(blank)'];
    };
    let subOptions = [];
    if (subField) {
      const seen = new Map();
      catalogItems.filter(it => it.source === sourceFilter).forEach(it => {
        subValuesOf(it).forEach(v => {
          const key = v === '(blank)' ? '(blank)' : v.toLowerCase();
          const label = v === '(blank)' ? 'Unspecified' : titleCase(v);
          if (!seen.has(key)) seen.set(key, { key, label, count: 0 });
          seen.get(key).count++;
        });
      });
      subOptions = [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
    const list = catalogItems
      .filter(it => sourceFilter === 'all' || it.source === sourceFilter)
      .filter(it => !subField || subFilter === 'all' || subValuesOf(it).some(v => (v === '(blank)' ? '(blank)' : v.toLowerCase()) === subFilter))
      .filter(it => !q || it.name.toLowerCase().includes(q) || (it.code || '').toLowerCase().includes(q));

    return (
      <div>
        <p className="text-xs text-slate-500 mb-2">Items this vendor sells us — every item marked <b>Purchasable</b> in Inventory, Product Master or Motor Master. Child Parts / Sub Child Parts are made in-house from their BOM; their outsourced work goes under <b>Services</b>.</p>
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {['all', ...availableSources].map(src => {
            const count = src === 'all' ? catalogItems.length : catalogItems.filter(it => it.source === src).length;
            return (
              <button
                key={src} type="button"
                onClick={() => { setSourceFilter(src); setSubFilter('all'); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sourceFilter === src ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                {src === 'all' ? 'All' : src} ({count})
              </button>
            );
          })}
        </div>
        {subField && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-[11px] text-slate-400">{sourceFilter === 'Inventory' ? 'Item Category:' : 'Category:'}</span>
            {[{ key: 'all', label: 'All', count: catalogItems.filter(it => it.source === sourceFilter).length }, ...subOptions].map(opt => (
              <button
                key={opt.key} type="button"
                onClick={() => setSubFilter(opt.key)}
                className={`px-2 py-0.5 rounded-full text-[11px] border ${subFilter === opt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
              >
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>
        )}
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items by name or code..." className="mb-2 text-sm" />
        <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
          {list.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No purchasable items found.</p>
          ) : list.map(it => {
            const id = String(it._id);
            return (
              <label key={id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={items.includes(id)} disabled={readOnly} onChange={() => toggleIn(items, setItems, id)} />
                <span className="font-medium text-slate-800">{it.name}</span>
                <span className="font-mono text-[11px] text-blue-600">{it.code}</span>
                <span className="ml-auto text-[10px] text-slate-400">{it.source}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderServices = () => {
    const q = search.trim().toLowerCase();
    const list = catalogServices.filter(s => !q || s.name.toLowerCase().includes(q));
    return (
      <div>
        <p className="text-xs text-slate-500 mb-2">Job work this vendor does — steps from BOM Management's Process Templates. Matches that step name at every BOM level, wherever a BOM marks it <b>Out Source</b>.</p>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search steps..." className="mb-2 text-sm" />
        <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
          {list.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No process steps found.</p>
          ) : list.map(s => (
            <label key={s.name} className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={services.includes(s.name)} disabled={readOnly} onChange={() => toggleIn(services, setServices, s.name)} />
              <span className="min-w-0">
                <span className="font-medium text-slate-800">{s.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {s.usedBy.length > 0
                    ? <>Out Source in: {s.usedBy.map(u => `${u.name} (${u.code})`).join(', ')}</>
                    : <span className="text-slate-400">Not an Out Source step in any BOM yet</span>}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {afterCreate ? 'Step 2 — ' : ''}Products &amp; Services — {vendor.supplierName}
          </DialogTitle>
          <DialogDescription>
            {afterCreate
              ? 'Vendor created. Now pick what it supplies — or do it later with "Products & Services" on the vendor card.'
              : readOnly
                ? 'Waiting for Company Admin approval — read-only. Withdraw the submission from the vendor card to change this.'
                : 'What this vendor supplies. Only vendors linked to an item here are offered for that item when quoting.'}
          </DialogDescription>
        </DialogHeader>

        {/* Both picked lists always visible, whatever tab/filter is active —
            filtering the Products list would otherwise hide items picked
            under a different filter. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-md p-2 bg-slate-50">
            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Package className="w-3 h-3" /> Products ({items.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {items.length === 0 ? (
                <span className="text-xs text-slate-400 italic">None picked yet</span>
              ) : items.map(id => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  {itemById.get(id)?.name || id}
                  {!readOnly && (
                    <button type="button" onClick={() => toggleIn(items, setItems, id)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="border rounded-md p-2 bg-slate-50">
            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Services ({services.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {services.length === 0 ? (
                <span className="text-xs text-slate-400 italic">None picked yet</span>
              ) : services.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {name}
                  {!readOnly && (
                    <button type="button" onClick={() => toggleIn(services, setServices, name)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'products', label: 'Products', icon: Package, count: items.length },
            { key: 'services', label: 'Services', icon: Wrench, count: services.length },
          ].map(t => (
            <button
              key={t.key} type="button"
              onClick={() => { setTab(t.key); setSearch(''); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {tab === 'products' ? renderProducts() : renderServices()}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {readOnly ? 'Close' : afterCreate ? 'Later' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Products & Services'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
