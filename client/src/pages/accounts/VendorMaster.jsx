import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Search, Edit2, MapPin, Phone, Mail,
    Tag, X, PlusCircle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// ── Tag Input component ────────────────────────────────────────────────────────
const TagInput = ({ label, icon: Icon, items, setItems, placeholder, colorClass }) => {
    const [inputVal, setInputVal] = useState('');

    const addItem = () => {
        const trimmed = inputVal.trim();
        if (trimmed && !items.includes(trimmed)) {
            setItems([...items, trimmed]);
        }
        setInputVal('');
    };

    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    return (
        <div className="col-span-2">
            <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Icon className="w-4 h-4" /> {label}
            </label>

            {/* existing tags */}
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {items.map((item, idx) => (
                    <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}
                    >
                        {item}
                        <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="hover:opacity-70 ml-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                {items.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No items added yet</span>
                )}
            </div>

            {/* add row */}
            <div className="flex gap-2">
                <Input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addItem(); }
                    }}
                    placeholder={placeholder}
                    className="flex-1 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="shrink-0">
                    <PlusCircle className="w-4 h-4 mr-1" /> Add
                </Button>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const VendorMaster = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);

    const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

    // dynamic array state for form
    const [formCategories, setFormCategories] = useState([]);

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

    const openAdd = () => {
        setEditingVendor(null);
        setFormCategories([]);
        setIsAddModalOpen(true);
    };

    const openEdit = (vendor) => {
        setEditingVendor(vendor);
        setFormCategories(vendor.vendorCategories || []);
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
                <Button onClick={openAdd} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                </Button>
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

                                <div className="pt-3 border-t flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-slate-400">Opening Balance: </span>
                                        <span className="font-bold">₹{vendor.openingBalance || 0}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(vendor)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
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

                        {/* ── Vendor Categories ── */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-blue-500" /> Vendor Categories
                                <span className="text-xs font-normal text-slate-400 ml-1">— What type of goods/services does this vendor supply?</span>
                            </h3>
                            <TagInput
                                label="Categories"
                                icon={Tag}
                                items={formCategories}
                                setItems={setFormCategories}
                                placeholder='e.g. Raw Material, Services… then press Enter or Add'
                                colorClass="bg-blue-100 text-blue-700"
                            />
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
