import { useDebouncedValue } from '@/hooks/useDebouncedValue';
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
    Tag, X, Package, Wrench, Landmark, Building2, ShieldCheck, FileText, Clock, AlertTriangle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import VendorDocumentsSection from '@/components/accounts/vendor/VendorDocumentsSection';
import VendorStatusActions from '@/components/accounts/vendor/VendorStatusActions';
import VendorCoverageDialog from '@/components/accounts/vendor/VendorCoverageDialog';
import VendorSuppliesDialog from '@/components/accounts/vendor/VendorSuppliesDialog';
import { STAGE_META, vendorStage, SENSITIVE_LABELS, formatDate, formatDay } from '@/components/accounts/vendor/vendorUi';
import { GST_STATES, checkGstin, stateFromText } from '@/lib/gstStates';

// Vendor Master v2 (procurement-v2, 2026-10-08): a new vendor is a Draft until
// the Company Admin approves it; only approved + active vendors can be quoted
// or given a PO. Status chips filter by approvalStatus.
const STATUS_FILTERS = ['all', 'Draft', 'Pending Approval', 'Approved', 'Rejected', 'Suspended', 'Blacklisted'];
// On an approved (or suspended/blacklisted) vendor these changes go to the
// Company Admin instead of saving straight away (server: supplierController
// updateSupplier).
const APPROVED_LIKE = ['Approved', 'Suspended', 'Blacklisted'];

// ── Main Component ─────────────────────────────────────────────────────────────
const VendorMaster = () => {
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'purchases', 'add');
    const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    // Ask the server once typing pauses, not on every key (2026-10-10).
    const searchText = useDebouncedValue(searchTerm.trim(), 400);
    const [page, setPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);

    const [statusFilter, setStatusFilter] = useState('all');
    // Billing / Dispatch address default to the Registered one; unticking
    // shows their own inputs.
    const [billingSame, setBillingSame] = useState(true);
    const [dispatchSame, setDispatchSame] = useState(true);
    // Point 15 (2026-10-10): the GSTIN decides CGST + SGST vs IGST on POs —
    // checked as it's typed against the registered state.
    const [gstinDraft, setGstinDraft] = useState(null);
    const [regStateDraft, setRegStateDraft] = useState(null);

    const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

    // dynamic array state for form
    const [formCategories, setFormCategories] = useState([]);
    // Vendor creation is two separate steps (client design change D2):
    // Step 1 = this page's vendor form (details only); Step 2 = "Assign"
    // Products & Services in their own dialog (VendorCoverageDialog), from
    // the card's button any time, and offered right after a vendor is
    // created (coverageAfterCreate).
    const [coverageVendor, setCoverageVendor] = useState(null);
    const [coverageAfterCreate, setCoverageAfterCreate] = useState(false);
    const openCoverage = (vendor, afterCreate = false) => {
        setCoverageAfterCreate(afterCreate);
        setCoverageVendor(vendor);
    };
    // Read-only "everything this vendor supplies", from a card's "+N more".
    const [suppliesVendor, setSuppliesVendor] = useState(null);

    // Pickable Purchasable items + Process Template steps (with which BOM
    // parts use each as Out Source) — for the Products & Services dialog,
    // and to show names on the cards, since a vendor stores item ids.
    const { data: catalogData } = useQuery({
        queryKey: ['/api/suppliers/catalog'],
        queryFn: () => apiRequest('GET', '/api/suppliers/catalog'),
    });
    const catalogItems = catalogData?.items || [];
    const catalogServices = catalogData?.services || [];
    const itemById = new Map(catalogItems.map(it => [String(it._id), it]));

    // Passing page/limit opts this browse page into the paginated response
    // shape — vendor-picker dropdowns elsewhere call /api/suppliers with no
    // params and keep getting the full list, unaffected by this.
    // withStanding=true: each vendor also carries its stage (Probationary /
    // Active / Watchlist for an approved one) and any request still waiting
    // for the Company Admin.
    const { data, isLoading } = useQuery({
        queryKey: ['/api/suppliers', page, searchText, statusFilter],
        queryFn: () => apiRequest('GET', `/api/suppliers?page=${page}&limit=20&withStanding=true&search=${encodeURIComponent(searchText)}${statusFilter !== 'all' ? `&approvalStatus=${encodeURIComponent(statusFilter)}` : ''}`),
        keepPreviousData: true,
    });
    const refreshVendors = () => queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });

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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
            if (!editingVendor && data?.supplier) {
                // Step 1 done. Close the details form and offer Step 2 —
                // Products & Services in their own dialog — straight away;
                // "Later" closes it, and the card's "Products & Services"
                // button reopens it any time.
                toast({ title: "Vendor Created", description: "Step 2: pick what it supplies — now or later." });
                setIsAddModalOpen(false);
                setEditingVendor(null);
                openCoverage(data.supplier, true);
            } else {
                // On an approved vendor, legal name / GSTIN / PAN / bank
                // changes go to the Company Admin — the server says so.
                const sent = data?.sentForApproval?.length > 0;
                toast({ title: sent ? "Saved — some changes need approval" : "Success", description: data?.message || "Vendor saved successfully" });
                setIsAddModalOpen(false);
                setEditingVendor(null);
            }
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const openAdd = () => {
        setGstinDraft(null); setRegStateDraft(null);
        setEditingVendor(null);
        setFormCategories([]);
        setBillingSame(true);
        setDispatchSame(true);
        setIsAddModalOpen(true);
    };

    const openEdit = (vendor) => {
        setGstinDraft(null); setRegStateDraft(null);
        setEditingVendor(vendor);
        setFormCategories(vendor.vendorCategories || []);
        setBillingSame(vendor.billingSameAsRegistered ?? true);
        setDispatchSame(vendor.dispatchSameAsRegistered ?? true);
        setIsAddModalOpen(true);
        // Documents save on their own, outside this form — re-read the vendor
        // so reopening right after an upload/remove (before the list has
        // refetched) never shows a stale document list. Keeps the list-only
        // extras (standing, pendingRequests) from the card's copy.
        apiRequest('GET', `/api/suppliers/${vendor._id}`)
            .then(fresh => setEditingVendor(v => (v && String(v._id) === String(fresh?._id))
                ? { ...v, ...fresh, standing: v.standing, pendingRequests: v.pendingRequests }
                : v))
            .catch(() => { /* keep the card's copy */ });
    };

    // Document upload/delete returns the saved vendor without the list-only
    // extras (standing, pendingRequests) — keep those from what's open.
    const mergeEditingVendor = (saved) => {
        setEditingVendor(v => ({ ...v, ...saved, standing: v?.standing, pendingRequests: v?.pendingRequests }));
        refreshVendors();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const raw = Object.fromEntries(formData.entries());
        const addr = (prefix) => ({
            street: raw[`${prefix}.street`] || '',
            city: raw[`${prefix}.city`] || '',
            state: raw[`${prefix}.state`] || '',
            zipCode: raw[`${prefix}.zipCode`] || '',
            country: raw[`${prefix}.country`] || 'India',
        });
        const coi = raw.coiDeclared;

        const vendorData = {
            ...raw,
            address: addr('address'),
            billingSameAsRegistered: billingSame,
            dispatchSameAsRegistered: dispatchSame,
            ...(billingSame ? {} : { billingAddress: addr('billingAddress') }),
            ...(dispatchSame ? {} : { dispatchAddress: addr('dispatchAddress') }),
            bankDetails: {
                accountNumber: raw['bankDetails.accountNumber'] || '',
                accountName: raw['bankDetails.accountName'] || '',
                bankName: raw['bankDetails.bankName'] || '',
                branchName: raw['bankDetails.branchName'] || '',
                ifscCode: raw['bankDetails.ifscCode'] || '',
            },
            // Checkbox groups/flags: FormData only carries checked boxes, so
            // these are read explicitly (an unticked box must save as false).
            businessTypes: formData.getAll('businessTypes'),
            providesInspectionCertificate: formData.has('providesInspectionCertificate'),
            providesMaterialTestCertificate: formData.has('providesMaterialTestCertificate'),
            riskClass: raw.riskClass || null,
            conflictOfInterest: {
                declared: coi === 'yes' ? true : coi === 'no' ? false : null,
                details: coi === 'yes' ? (raw.coiDetails || '') : '',
            },
            // Products & Services are NOT sent from here — they're saved by
            // their own dialog (Step 2), and an absent suppliedItems/services
            // leaves them untouched server-side.
            vendorCategories: formCategories,
        };
        // Remove the flat helper keys (address.*, bankDetails.*, coi*)
        Object.keys(vendorData).filter(k => k.includes('.')).forEach(k => delete vendorData[k]);
        delete vendorData.coiDeclared;
        delete vendorData.coiDetails;

        const gstCheck = checkGstin(vendorData.gstNumber, vendorData.address?.state);
        if (gstCheck.error) {
            toast({ title: 'Check the GSTIN', description: gstCheck.error, variant: 'destructive' });
            return;
        }
        mutation.mutate(vendorData);
    };

    // Edit-dialog state derived from the open vendor.
    const editingStatus = editingVendor?.approvalStatus || 'Draft';
    const isLocked = editingStatus === 'Pending Approval';
    const needsApprovalForIdentity = !!editingVendor && APPROVED_LIKE.includes(editingStatus);
    // While a legal-name / GSTIN / PAN / bank change is waiting for the
    // Company Admin, those inputs show the PROPOSED values — saving the form
    // resends whatever they show, so showing the live values would cancel
    // the pending change (server contract, supplierController updateSupplier).
    const pendingChange = editingVendor?.pendingRequests?.find(r => r.type === 'DetailsChange')?.payload || {};
    const sv = (field) => pendingChange[field] ?? editingVendor?.[field];
    const sb = (key) => pendingChange.bankDetails?.[key] ?? editingVendor?.bankDetails?.[key];

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
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {STATUS_FILTERS.map(s => (
                            <button
                                key={s} type="button"
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusFilter === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                            >
                                {s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        Only <b>Approved</b>, active vendors can be quoted or given a PO. New vendors start as Draft — fill them in, upload documents, then Submit for Approval; the Company Admin approves.
                    </p>
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
                            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                                <div className="min-w-0">
                                    <CardTitle className="text-lg font-bold">{vendor.supplierName}</CardTitle>
                                    {vendor.tradeName && <p className="text-xs text-slate-400 truncate">{vendor.tradeName}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {(() => {
                                        const stage = vendorStage(vendor);
                                        const meta = STAGE_META[stage] || STAGE_META.Draft;
                                        return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.className}`}>{meta.label}</span>;
                                    })()}
                                    {vendor.status === 'inactive' && (
                                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Rating moved off this page entirely (2026-10) — now
                                    computed, not typed, and lives in the Purchase tab's
                                    own "Vendor Ratings" tab instead. Its stage effect
                                    (Probationary / Watchlist) shows in the badge above. */}
                                <div className="text-xs font-mono text-slate-400">{vendor.supplierCode}</div>

                                {/* Approval notices — why a vendor can't be used yet,
                                    and what's waiting for the Company Admin. */}
                                {vendor.approvalStatus === 'Rejected' && vendor.rejectionReason && (
                                    <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-2 py-1.5">
                                        <b>Rejected:</b> {vendor.rejectionReason}
                                    </div>
                                )}
                                {['Suspended', 'Blacklisted'].includes(vendor.approvalStatus) && (
                                    <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-2 py-1.5">
                                        <b>{vendor.approvalStatus}</b> since {formatDate(vendor.restriction?.effectiveDate)}{vendor.restriction?.reason ? ` — ${vendor.restriction.reason}` : ''}
                                        {vendor.restriction?.reviewDate && <span className="block">Review on {formatDay(vendor.restriction.reviewDate)}</span>}
                                    </div>
                                )}
                                {vendor.standing?.stage === 'Watchlist' && (
                                    <div className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2 py-1.5 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 shrink-0" /> Rating {vendor.standing.rating} from {vendor.standing.eventCount} deliveries/QC checks — on the Company Admin's watchlist.
                                    </div>
                                )}
                                {(vendor.pendingRequests || []).length > 0 && (
                                    <div className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-2 py-1.5 flex items-start gap-1">
                                        <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span>
                                            Waiting for Company Admin: {vendor.pendingRequests.map(r =>
                                                r.type === 'NewVendor' ? 'approval'
                                                    : r.type === 'DetailsChange' ? `change to ${Object.keys(r.payload || {}).map(f => SENSITIVE_LABELS[f] || f).join(', ')}`
                                                        : r.type.toLowerCase()
                                            ).join(' · ')}
                                        </span>
                                    </div>
                                )}

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
                                            {list.length > 4 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSuppliesVendor(vendor)}
                                                    className="px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    title="See everything this vendor supplies"
                                                >
                                                    +{list.length - 4} more
                                                </button>
                                            )}
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

                                <div className="pt-3 border-t space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs text-slate-400 flex gap-3 flex-wrap">
                                            {vendor.creditLimit != null && <span>Credit Limit: <b className="text-slate-600">₹{vendor.creditLimit}</b></span>}
                                            <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{(vendor.documents || []).length} docs</span>
                                        </div>
                                        {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(vendor)} title={vendor.approvalStatus === 'Pending Approval' ? 'View (locked while under approval)' : 'Edit'}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>}
                                    </div>
                                    {canEdit && (
                                        <Button
                                            type="button" size="sm" variant="outline"
                                            className="h-7 px-2 text-xs w-full justify-center border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => openCoverage(vendor)}
                                        >
                                            <Package className="w-3 h-3 mr-1" />
                                            Products &amp; Services ({(vendor.suppliedItems || []).length} / {(vendor.services || []).length})
                                        </Button>
                                    )}
                                    {canEdit && <VendorStatusActions vendor={vendor} onDone={refreshVendors} />}
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

                    <form onSubmit={handleSubmit} className="py-4">
                        {/* Approval status of the open vendor (Vendor Master v2) */}
                        {editingVendor && (() => {
                            const stage = vendorStage(editingVendor);
                            const meta = STAGE_META[stage] || STAGE_META.Draft;
                            return (
                                <div className="mb-4 rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border mr-2 ${meta.className}`}>{meta.label}</span>
                                        {editingStatus === 'Draft' && 'Not usable for quotes or POs yet. Needed before approval: PAN, registered address (city/state/pincode), full bank details, risk class, the conflict-of-interest answer, at least one Product or Service, and the PAN card + cancelled cheque (+ GST certificate if GSTIN given) documents. Save, then use "Submit for Approval" on the vendor card.'}
                                        {editingStatus === 'Rejected' && <>Rejected by the Company Admin{editingVendor.rejectionReason ? `: ${editingVendor.rejectionReason}` : ''}. Fix it, save, and submit again.</>}
                                        {editingStatus === 'Pending Approval' && 'Waiting for the Company Admin — read-only. Withdraw it from the vendor card to make changes.'}
                                        {needsApprovalForIdentity && 'Changes to Legal Name, GSTIN, PAN or Bank Details go to the Company Admin for approval; the current values stay in use until then. Other changes save straight away.'}
                                    </div>
                                </div>
                            );
                        })()}
                        {Object.keys(pendingChange).length > 0 && (
                            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                <b>Waiting for approval:</b> the {Object.keys(pendingChange).map(f => SENSITIVE_LABELS[f] || f).join(', ')} fields below show the proposed values, not the ones in use. Change them back to cancel the request.
                            </div>
                        )}

                        <fieldset disabled={isLocked} className="grid grid-cols-2 gap-4 min-w-0 border-0 p-0 m-0">
                        {/* Basic Info */}
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Legal Name *{needsApprovalForIdentity && <span className="text-[11px] text-blue-600 font-normal ml-1">(change needs approval)</span>}</label>
                            <Input name="supplierName" defaultValue={sv('supplierName')} required />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Trade / Brand Name</label>
                            <Input name="tradeName" defaultValue={editingVendor?.tradeName} placeholder="If different from the legal name" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contact Person *</label>
                            <Input name="contactPerson" defaultValue={editingVendor?.contactPerson} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Designation</label>
                            <Input name="contactDesignation" defaultValue={editingVendor?.contactDesignation} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone *</label>
                            <Input name="phone" defaultValue={editingVendor?.phone} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">WhatsApp Number</label>
                            <Input name="whatsappNumber" defaultValue={editingVendor?.whatsappNumber} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Email *</label>
                            <Input name="email" type="email" defaultValue={editingVendor?.email} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Alternate Contact Person</label>
                            <Input name="alternateContactPerson" defaultValue={editingVendor?.alternateContactPerson} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Alternate Phone</label>
                            <Input name="alternatePhone" defaultValue={editingVendor?.alternatePhone} />
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
                            <p className="text-[11px] text-slate-400 mt-0.5">On/off switch — separate from approval.</p>
                        </div>

                        {/* Registration (blueprint §8) */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500" /> Registration
                                {needsApprovalForIdentity && <span className="text-xs font-normal text-blue-600">— GSTIN / PAN changes need Company Admin approval</span>}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">GSTIN</label>
                                    <Input name="gstNumber" defaultValue={sv('gstNumber')} placeholder="Leave blank if not GST-registered" onChange={e => setGstinDraft(e.target.value)} />
                                    {(() => {
                                        const g = gstinDraft ?? sv('gstNumber') ?? '';
                                        const st = regStateDraft ?? editingVendor?.address?.state ?? '';
                                        const c = checkGstin(g, st);
                                        if (c.error) return <p className="text-[11px] text-red-600 mt-1">{c.error}</p>;
                                        if (c.warning) return <p className="text-[11px] text-amber-700 mt-1">{c.warning}</p>;
                                        return g ? <p className="text-[11px] text-slate-400 mt-1">Used to work out CGST + SGST or IGST on POs.</p> : null;
                                    })()}
                                </div>
                                <div>
                                    <label className="text-sm font-medium">PAN Number</label>
                                    <Input name="panNumber" defaultValue={sv('panNumber')} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">CIN / Registration No.</label>
                                    <Input name="cinNumber" defaultValue={editingVendor?.cinNumber} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">MSME / Udyam No.</label>
                                    <Input name="msmeNumber" defaultValue={editingVendor?.msmeNumber} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">IEC (import/export)</label>
                                    <Input name="iecNumber" defaultValue={editingVendor?.iecNumber} placeholder="Only if relevant" />
                                </div>
                            </div>
                        </div>

                        {/* Business Profile (blueprint §8) */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-500" /> Business Profile
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium block mb-1">Business Type</label>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        {['Manufacturer', 'Trader', 'Service Provider'].map(t => (
                                            <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" name="businessTypes" value={t} defaultChecked={(editingVendor?.businessTypes || []).includes(t)} /> {t}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">OEM / Authorized Distributor</label>
                                    <select name="oemStatus" className="w-full border rounded-md p-2" defaultValue={editingVendor?.oemStatus || 'None'}>
                                        <option value="None">Neither</option>
                                        <option value="OEM">OEM (makes the product)</option>
                                        <option value="Authorized Distributor">Authorized Distributor</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Capacity</label>
                                    <Input name="capacity" defaultValue={editingVendor?.capacity} placeholder="e.g. 20 tonnes/month" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Locations Served</label>
                                    <Input name="locationsServed" defaultValue={editingVendor?.locationsServed} placeholder="e.g. Maharashtra, Gujarat" />
                                </div>
                            </div>
                        </div>

                        {/* Products & Services are Step 2 of vendor creation (client
                            design change D2) — assigned in their own dialog
                            (VendorCoverageDialog), never in this details form. */}
                        <div className="col-span-2">
                            <div className="border border-dashed border-slate-300 rounded-md px-3 py-2 bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
                                <Package className="w-4 h-4 text-slate-400 shrink-0" />
                                {editingVendor
                                    ? <>What this vendor supplies is managed separately — use <b>Products &amp; Services</b> on the vendor card.</>
                                    : <>Step 1 of 2 — vendor details. After saving, you can pick its <b>Products &amp; Services</b> (Step 2) straight away or later.</>}
                            </div>
                        </div>

                        {/* Compliance documents (blueprint §8) — edit mode only (the
                            vendor has to exist before files can be attached).
                            Each upload/delete saves on its own. */}
                        {editingVendor && (
                            <div className="col-span-2 pt-2">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" /> Documents
                                </h3>
                                <VendorDocumentsSection vendor={editingVendor} readOnly={isLocked} onChange={mergeEditingVendor} />
                            </div>
                        )}

                        {/* Quality & Risk (blueprint §8, §9) */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500" /> Quality &amp; Risk
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Quality System</label>
                                    <Input name="qualitySystem" defaultValue={editingVendor?.qualitySystem} placeholder="e.g. ISO 9001:2015, or none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Risk Class</label>
                                    <select name="riskClass" className="w-full border rounded-md p-2" defaultValue={editingVendor?.riskClass || ''}>
                                        <option value="">Not set</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Your initial view; the Company Admin can change it when approving.</p>
                                </div>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" name="providesInspectionCertificate" defaultChecked={!!editingVendor?.providesInspectionCertificate} />
                                    Provides inspection certificates
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" name="providesMaterialTestCertificate" defaultChecked={!!editingVendor?.providesMaterialTestCertificate} />
                                    Provides material test certificates (MTC)
                                </label>
                            </div>
                        </div>

                        {/* Conflict of interest (blueprint §14) */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">Conflict of Interest</h3>
                            <p className="text-xs text-slate-500 mb-2">Is the vendor (owner, partner or staff) related to, or does it have a business link with, anyone working at our company?</p>
                            <div className="flex gap-4 text-sm mb-2">
                                {[['no', 'No'], ['yes', 'Yes']].map(([val, label]) => (
                                    <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="radio" name="coiDeclared" value={val}
                                            defaultChecked={editingVendor?.conflictOfInterest?.declared === (val === 'yes')}
                                        /> {label}
                                    </label>
                                ))}
                            </div>
                            <Input name="coiDetails" defaultValue={editingVendor?.conflictOfInterest?.details} placeholder="If yes: who, and what the relationship is" />
                        </div>

                        {/* Credit Limit — the max ₹ this vendor can be owed at
                            once, a vendor-wide cap, so it stays here. Payment
                            Terms (Advance/Balance %, Credit Days, Notes) and GST
                            Rate were removed from this form (2026-10-08): they're
                            decided per order and move onto PO creation in the PO
                            rework (procurement-v2). The Supplier fields and their
                            backend readers are untouched until then, so vendors
                            that already have values keep them; this only stops
                            new edits here. */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-blue-500" /> Credit Limit
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Credit Limit (₹)</label>
                                    <Input name="creditLimit" type="number" min="0" defaultValue={editingVendor?.creditLimit ?? ''} />
                                </div>
                            </div>
                        </div>

                        {/* Bank Details — needed to actually pay this vendor
                            (NEFT/RTGS); existed on the schema already but was never
                            wired into this form. */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <Landmark className="w-4 h-4" /> Bank Details
                                {needsApprovalForIdentity && <span className="text-xs font-normal text-blue-600">— changes need Company Admin approval</span>}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Account Name</label>
                                    <Input name="bankDetails.accountName" defaultValue={sb('accountName')} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Account Number</label>
                                    <Input name="bankDetails.accountNumber" defaultValue={sb('accountNumber')} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Bank Name</label>
                                    <Input name="bankDetails.bankName" defaultValue={sb('bankName')} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Branch Name</label>
                                    <Input name="bankDetails.branchName" defaultValue={sb('branchName')} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">IFSC Code</label>
                                    <Input name="bankDetails.ifscCode" defaultValue={sb('ifscCode')} />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Upload a cancelled cheque or bank letter under Documents — needed for approval.</p>
                        </div>

                        {/* Address Section */}
                        <div className="col-span-2 pt-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Addresses
                            </h3>
                            {/* Registered (the existing `address`), Billing and
                                Dispatch/Factory (blueprint §8) — the last two
                                default to "same as registered". */}
                            {[
                                { key: 'address', title: 'Registered Address', value: editingVendor?.address, same: null },
                                { key: 'billingAddress', title: 'Billing Address', value: editingVendor?.billingAddress, same: [billingSame, setBillingSame] },
                                { key: 'dispatchAddress', title: 'Dispatch / Factory Address', value: editingVendor?.dispatchAddress, same: [dispatchSame, setDispatchSame] },
                            ].map(({ key, title, value, same }) => (
                                <div key={key} className="mb-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">{title}</p>
                                        {same && (
                                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={same[0]} onChange={e => same[1](e.target.checked)} /> Same as registered
                                            </label>
                                        )}
                                    </div>
                                    {(!same || !same[0]) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium">Street / Area</label>
                                                <Input name={`${key}.street`} placeholder="Street, Area, Locality" defaultValue={value?.street} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">City</label>
                                                <Input name={`${key}.city`} placeholder="City" defaultValue={value?.city} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">State</label>
                                                {(() => {
                                                    const known = stateFromText(value?.state);
                                                    const current = known?.name || value?.state || '';
                                                    return (
                                                        <select
                                                            name={`${key}.state`}
                                                            defaultValue={current}
                                                            onChange={key === 'address' ? (e => setRegStateDraft(e.target.value)) : undefined}
                                                            className="w-full border rounded-md h-9 px-2 text-sm bg-white"
                                                        >
                                                            <option value="">Choose state…</option>
                                                            {current && !known && <option value={current}>{current} (please pick from the list)</option>}
                                                            {GST_STATES.map(st => <option key={st.code} value={st.name}>{st.name} ({st.code})</option>)}
                                                        </select>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Pincode / Zip Code</label>
                                                <Input name={`${key}.zipCode`} placeholder="Pincode" defaultValue={value?.zipCode} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Country</label>
                                                <Input name={`${key}.country`} placeholder="Country" defaultValue={value?.country || 'India'} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        </fieldset>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>{isLocked ? 'Close' : 'Cancel'}</Button>
                            {!isLocked && (
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending ? 'Saving...' : 'Save Vendor'}
                                </Button>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Step 2 — Products & Services, its own dialog (D2) */}
            <VendorCoverageDialog
                vendor={coverageVendor}
                open={!!coverageVendor}
                onOpenChange={(o) => { if (!o) { setCoverageVendor(null); setCoverageAfterCreate(false); } }}
                catalogItems={catalogItems}
                catalogServices={catalogServices}
                afterCreate={coverageAfterCreate}
                onSaved={refreshVendors}
            />

            {/* Full read-only list, from a card's "+N more" */}
            <VendorSuppliesDialog
                vendor={suppliesVendor}
                open={!!suppliesVendor}
                onOpenChange={(o) => { if (!o) setSuppliesVendor(null); }}
                catalogItems={catalogItems}
                catalogServices={catalogServices}
                onEdit={canEdit ? () => { const v = suppliesVendor; setSuppliesVendor(null); openCoverage(v); } : undefined}
            />
        </div>
    );
};

export default VendorMaster;
