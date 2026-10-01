import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
    Plus, Search, Edit2, MapPin, Phone, Mail,
    Tag, X, Package, Wrench
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// ── Main Component ─────────────────────────────────────────────────────────────
const VendorMaster = () => {
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'purchases', 'add');
    const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);

    const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

    // dynamic array state for form
    const [formCategories, setFormCategories] = useState([]);
    // What this vendor covers (2026-09-25): Product tab = Item ids,
    // Services tab = Process Template step names (see Supplier.js).
    const [formItems, setFormItems] = useState([]);
    const [formServices, setFormServices] = useState([]);
    const [coverageTab, setCoverageTab] = useState('products');
    const [coverageSearch, setCoverageSearch] = useState('');
    // Products picker filter (2026-09-28) — narrows by where the item comes
    // from (Inventory / Product Master / Motor Master). Only a source that
    // actually has items gets shown as a chip — see the "available sources"
    // computation in the products tab below.
    const [productSourceFilter, setProductSourceFilter] = useState('all');
    // Second-level filter, only shown for a single selected source that has
    // its own classification field: Inventory's itemCategories (its "Item
    // Category" field, multi-select — NOT itemType/"Item Type", checked
    // against real data: itemType is ~70% one value there, itemCategories
    // has a real spread), Product Master's category (its "P-Type"). Motor
    // Master never saves these (the form has no fields for them), so it
    // stays a plain list — no sub-filter for it. Stores 'all' or a
    // normalized (trimmed, lowercased) value key, '(blank)' for items with
    // nothing set.
    const [productSubFilter, setProductSubFilter] = useState('all');

    // Pickable Purchasable items + Process Template steps (with which BOM
    // parts use each as Out Source) — also used to show names on the cards,
    // since a vendor stores item ids.
    const { data: catalogData } = useQuery({
        queryKey: ['/api/suppliers/catalog'],
        queryFn: () => apiRequest('GET', '/api/suppliers/catalog'),
    });
    const catalogItems = catalogData?.items || [];
    const catalogServices = catalogData?.services || [];
    const itemById = new Map(catalogItems.map(it => [String(it._id), it]));
    const toggleIn = (list, setList, value) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

    // Passing page/limit opts this browse page into the paginated response
    // shape — vendor-picker dropdowns elsewhere call /api/suppliers with no
    // params and keep getting the full list, unaffected by this.
    const { data, isLoading } = useQuery({
        queryKey: ['/api/suppliers', page, searchTerm],
        queryFn: () => apiRequest('GET', `/api/suppliers?page=${page}&limit=20&search=${encodeURIComponent(searchTerm)}`),
        keepPreviousData: true,
    });

    const vendors = data?.suppliers || [];
    const pagination = data?.pagination || {};
    // Search now happens server-side — `vendors` is already the current
    // page's filtered slice.
    const filteredVendors = vendors;

    const mutation = useMutation({
        mutationFn: (vendorData) => {
            if (editingVendor) {
                return apiRequest('PUT', `/api/suppliers/${editingVendor._id}`, vendorData);
            }
            return apiRequest('POST', '/api/suppliers', vendorData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
            toast({ title: "Success", description: "Vendor saved successfully" });
            setIsAddModalOpen(false);
            setEditingVendor(null);
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const resetCoverage = (vendor) => {
        setFormItems((vendor?.suppliedItems || []).map(String));
        setFormServices(vendor?.services || []);
        setCoverageTab('products');
        setCoverageSearch('');
        setProductSourceFilter('all');
        setProductSubFilter('all');
    };

    const openAdd = () => {
        setEditingVendor(null);
        setFormCategories([]);
        resetCoverage(null);
        setIsAddModalOpen(true);
    };

    const openEdit = (vendor) => {
        setEditingVendor(vendor);
        setFormCategories(vendor.vendorCategories || []);
        resetCoverage(vendor);
        setIsAddModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const raw = Object.fromEntries(formData.entries());

        const vendorData = {
            ...raw,
            address: {
                street: raw['address.street'] || '',
                city: raw['address.city'] || '',
                state: raw['address.state'] || '',
                zipCode: raw['address.zipCode'] || '',
                country: raw['address.country'] || 'India',
            },
            vendorCategories: formCategories,
            suppliedItems: formItems,
            services: formServices,
        };
        // Remove flat address keys
        ['address.street', 'address.city', 'address.state', 'address.zipCode', 'address.country']
            .forEach(k => delete vendorData[k]);

        mutation.mutate(vendorData);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vendor Master</h1>
                    <p className="text-slate-500">Manage your raw material and service providers</p>
                </div>
                {canAdd && (
                    <Button onClick={openAdd} className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Vendor
                    </Button>
                )}
            </div>

            {/* Search */}
            <Card className="mb-6 shadow-sm border-0">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search vendors by name or code..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Vendor Cards */}
            {isLoading ? (
                <div className="text-center text-slate-400 py-20">Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
                <div className="text-center text-slate-400 py-20">No vendors found. Add your first vendor.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor) => (
                        <Card key={vendor._id} className="hover:shadow-md transition-shadow border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-bold">{vendor.supplierName}</CardTitle>
                                <Badge variant={vendor.status === 'active' ? 'success' : 'secondary'}>
                                    {vendor.status || 'Active'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-xs font-mono text-slate-400">{vendor.supplierCode}</div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Phone className="w-4 h-4 mr-2 shrink-0" /> {vendor.phone}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Mail className="w-4 h-4 mr-2 shrink-0" /> {vendor.email}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <MapPin className="w-4 h-4 mr-2 shrink-0" />
                                        {[vendor.address?.city, vendor.address?.state, vendor.address?.country]
                                            .filter(Boolean).join(', ') || 'Location not set'}
                                    </div>
                                </div>

                                {/* Vendor Categories */}
                                {vendor.vendorCategories?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1 mb-1">
                                            <Tag className="w-3 h-3" /> Categories
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {vendor.vendorCategories.map((cat, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Products / Services this vendor covers */}
                                {(() => {
                                    const productNames = (vendor.suppliedItems || []).map(id => itemById.get(String(id))?.name).filter(Boolean);
                                    const chips = (list, cls) => (
                                        <div className="flex flex-wrap gap-1">
                                            {list.slice(0, 4).map((n, i) => (
                                                <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{n}</span>
                                            ))}
                                            {list.length > 4 && <span className="px-2 py-0.5 text-xs text-slate-400">+{list.length - 4} more</span>}
                                        </div>
                                    );
                                    return (
                                        <>
                                            {productNames.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1 mb-1">
                                                        <Package className="w-3 h-3" /> Products
                                                    </p>
                                                    {chips(productNames, 'bg-emerald-100 text-emerald-700')}
                                                </div>
                                            )}
                                            {vendor.services?.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1 mb-1">
                                                        <Wrench className="w-3 h-3" /> Services
                                                    </p>
                                                    {chips(vendor.services, 'bg-purple-100 text-purple-700')}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                <div className="pt-3 border-t flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-slate-400">Opening Balance: </span>
                                        <span className="font-bold">₹{vendor.openingBalance || 0}</span>
                                    </div>
                                    {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(vendor)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
                    <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} vendors)</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
                </div>
            )}

            {/* Add / Edit Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) setEditingVendor(null); }}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                        {/* Basic Info */}
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Vendor Name *</label>
                            <Input name="supplierName" defaultValue={editingVendor?.supplierName} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contact Person *</label>
                            <Input name="contactPerson" defaultValue={editingVendor?.contactPerson} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">GST Number</label>
                            <Input name="gstNumber" defaultValue={editingVendor?.gstNumber} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone *</label>
                            <Input name="phone" defaultValue={editingVendor?.phone} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Email *</label>
                            <Input name="email" type="email" defaultValue={editingVendor?.email} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Opening Balance (Dr/Cr)</label>
                            <Input name="openingBalance" type="number" defaultValue={editingVendor?.openingBalance || 0} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Entity Type</label>
                            <select name="entityType" className="w-full border rounded-md p-2" defaultValue={editingVendor?.entityType || 'Others'}>
                                <option value="Individual">Individual</option>
                                <option value="HUF">HUF</option>
                                <option value="Company">Company</option>
                                <option value="Firm">Firm</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">TDS Section</label>
                            <select name="tdsSection" className="w-full border rounded-md p-2" defaultValue={editingVendor?.tdsSection || 'None'}>
                                <option value="194C">Section 194C (Contract)</option>
                                <option value="194J">Section 194J (Prof.)</option>
                                <option value="194Q">Section 194Q (Goods Sale)</option>
                                <option value="206C_1H">Section 206C(1H)</option>
                                <option value="None">None</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <select name="status" className="w-full border rounded-md p-2" defaultValue={editingVendor?.status || 'active'}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* ── What this vendor supplies ── Products (real
                            Purchasable items) and Services (Process Template
                            steps done as job work). The old free-text tags
                            tab was removed 2026-09-28 — vendor shortlisting
                            is done by Products/Services now, not tags; the
                            "Tags" section further below just keeps whatever
                            a vendor already had, read-only display on the
                            card. */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-blue-500" /> Vendor Categories
                                <span className="text-xs font-normal text-slate-400 ml-1">— What does this vendor supply?</span>
                            </h3>

                            {/* Always visible, both at once, regardless of
                                which tab/filter is active below — narrowing
                                the Products list by source would otherwise
                                hide items already picked under a different
                                filter, and a vendor can supply both products
                                and services at the same time. */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="border rounded-md p-2 bg-slate-50">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                        <Package className="w-3 h-3" /> Products ({formItems.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {formItems.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">None picked yet</span>
                                        ) : formItems.map(id => (
                                            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                {itemById.get(id)?.name || id}
                                                <button type="button" onClick={() => toggleIn(formItems, setFormItems, id)} className="hover:opacity-70">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="border rounded-md p-2 bg-slate-50">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                        <Wrench className="w-3 h-3" /> Services ({formServices.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {formServices.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">None picked yet</span>
                                        ) : formServices.map(name => (
                                            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                {name}
                                                <button type="button" onClick={() => toggleIn(formServices, setFormServices, name)} className="hover:opacity-70">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mb-3">
                                {[
                                    { key: 'products', label: 'Products', icon: Package, count: formItems.length },
                                    { key: 'services', label: 'Services', icon: Wrench, count: formServices.length },
                                ].map(t => (
                                    <button
                                        key={t.key} type="button"
                                        onClick={() => { setCoverageTab(t.key); setCoverageSearch(''); }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${coverageTab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <t.icon className="w-3.5 h-3.5" /> {t.label}{t.count > 0 ? ` (${t.count})` : ''}
                                    </button>
                                ))}
                            </div>

                            {coverageTab === 'products' && (() => {
                                const q = coverageSearch.trim().toLowerCase();
                                // Dynamic: only a source that actually has at
                                // least one item gets a filter chip.
                                const sourceOrder = ['Inventory', 'Product Master', 'Motor Master'];
                                const availableSources = sourceOrder.filter(src => catalogItems.some(it => it.source === src));

                                // Second-level filter field per source —
                                // Motor Master has none (see state comment).
                                // Inventory's is a multi-select array
                                // (itemCategories); Product Master's is a
                                // plain string (category).
                                const subFieldFor = { 'Inventory': 'itemCategories', 'Product Master': 'category' };
                                const subField = subFieldFor[productSourceFilter];
                                const isArraySubField = subField === 'itemCategories';
                                const normalize = (s) => (s || '').trim();
                                const titleCase = (s) => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
                                // Every value this item carries for the
                                // current sub-field, normalized — '(blank)'
                                // as its own bucket rather than hidden.
                                const subValuesOf = (it) => {
                                    const raw = isArraySubField ? (it[subField] || []) : [it[subField]];
                                    const vals = raw.map(normalize).filter(Boolean);
                                    return vals.length > 0 ? vals : ['(blank)'];
                                };

                                let subOptions = [];
                                if (subField) {
                                    const bySource = catalogItems.filter(it => it.source === productSourceFilter);
                                    const seen = new Map();
                                    bySource.forEach(it => {
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
                                    .filter(it => productSourceFilter === 'all' || it.source === productSourceFilter)
                                    .filter(it => !subField || productSubFilter === 'all' || subValuesOf(it).some(v => (v === '(blank)' ? '(blank)' : v.toLowerCase()) === productSubFilter))
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
                                                        onClick={() => { setProductSourceFilter(src); setProductSubFilter('all'); }}
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${productSourceFilter === src ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                                                    >
                                                        {src === 'all' ? 'All' : src} ({count})
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {subField && (
                                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                                <span className="text-[11px] text-slate-400">{productSourceFilter === 'Inventory' ? 'Item Category:' : 'Category:'}</span>
                                                {[{ key: 'all', label: 'All', count: catalogItems.filter(it => it.source === productSourceFilter).length }, ...subOptions].map(opt => (
                                                    <button
                                                        key={opt.key} type="button"
                                                        onClick={() => setProductSubFilter(opt.key)}
                                                        className={`px-2 py-0.5 rounded-full text-[11px] border ${productSubFilter === opt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                                                    >
                                                        {opt.label} ({opt.count})
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <Input value={coverageSearch} onChange={e => setCoverageSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Search items by name or code..." className="mb-2 text-sm" />
                                        <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                                            {list.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">No purchasable items found.</p>
                                            ) : list.map(it => {
                                                const id = String(it._id);
                                                return (
                                                    <label key={id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                                                        <input type="checkbox" checked={formItems.includes(id)} onChange={() => toggleIn(formItems, setFormItems, id)} />
                                                        <span className="font-medium text-slate-800">{it.name}</span>
                                                        <span className="font-mono text-[11px] text-blue-600">{it.code}</span>
                                                        <span className="ml-auto text-[10px] text-slate-400">{it.source}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {coverageTab === 'services' && (() => {
                                const q = coverageSearch.trim().toLowerCase();
                                const list = catalogServices.filter(s => !q || s.name.toLowerCase().includes(q));
                                return (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Job work this vendor does — steps from BOM Management's Process Templates. Matches that step name at every BOM level, wherever a BOM marks it <b>Out Source</b>.</p>
                                        <Input value={coverageSearch} onChange={e => setCoverageSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Search steps..." className="mb-2 text-sm" />
                                        <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                                            {list.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">No process steps found.</p>
                                            ) : list.map(s => (
                                                <label key={s.name} className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                                                    <input type="checkbox" className="mt-1" checked={formServices.includes(s.name)} onChange={() => toggleIn(formServices, setFormServices, s.name)} />
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
                            })()}
                        </div>

                        {/* Address Section */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Address / Location
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Street / Area</label>
                                    <Input
                                        name="address.street"
                                        placeholder="Street, Area, Locality"
                                        defaultValue={editingVendor?.address?.street}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">City</label>
                                    <Input name="address.city" placeholder="City" defaultValue={editingVendor?.address?.city} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">State</label>
                                    <Input name="address.state" placeholder="State" defaultValue={editingVendor?.address?.state} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Pincode / Zip Code</label>
                                    <Input name="address.zipCode" placeholder="Pincode" defaultValue={editingVendor?.address?.zipCode} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Country</label>
                                    <Input name="address.country" placeholder="Country" defaultValue={editingVendor?.address?.country || 'India'} />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Saving...' : 'Save Vendor'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VendorMaster;
