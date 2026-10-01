import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Info, Building2, Truck, CalendarClock, FileStack, CreditCard,
    Award, AlertTriangle, Users, Package, Mail, MessageCircle, Phone,
    Clock, Plus, X,
} from 'lucide-react';

// ── Static preview — Vendor Batching (2026-09-29, reworked 2026-09-29) ─────
// Everything on this page is hand-written mock data, not a real API call.
// It exists only to give the client something concrete to react to for the
// Procurement redesign meeting — the redesign itself is NOT green-lit yet
// (see server/docs/procurement-redesign-discussion-2026-09.md).
//
// The real logic this demo follows (confirmed with the user): a price is
// only ever SET on the By Item tab — via Email/WhatsApp/Manual (§04 of the
// discussion doc). By Vendor never re-enters a rate; it just lets Purchase
// pick WHICH of that vendor's already-quoted items to pull into one batch.
// So there is exactly one data source — REQUIREMENTS_SEED below — and both
// tabs read off it. By Vendor derives each vendor's buyable lines from
// whichever requirements that vendor has a Received quote on.

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// How a vendor's rate for a quote arrived — per the discussion doc's §04
// correction: the client wants all three feeding the same quote record and
// "pick winner → PO" path, not just email. Email/WhatsApp here simulate
// "request sent, vendor hasn't replied yet" (status Pending, no rate);
// Manual simulates Purchase typing the rate in themselves after a call
// (status Received immediately — there's no one else to wait on).
const CHANNEL_META = {
    Email: { icon: Mail, label: 'Email' },
    WhatsApp: { icon: MessageCircle, label: 'WhatsApp' },
    Manual: { icon: Phone, label: 'Manual entry (by Purchase)' },
};

// Vendor Master metadata — onboarded vendors only. A vendor only shows up
// in the By Vendor tab if they're in this list (matches Vendor Master being
// a separate, prior setup step) AND have at least one Received quote below.
const VENDORS = [
    {
        id: 'sharma-steel',
        name: 'Sharma Steel Traders',
        category: 'Raw Material — Steel / Fabrication',
        freightFreeThreshold: 25000,
        hasOpenDraftPO: true,
        creditLimit: 50000,
        alreadyOutstanding: 38000,
    },
    {
        id: 'bhagwati-metal',
        name: 'Bhagwati Metal Works',
        category: 'Raw Material — Steel / Fabrication',
        freightFreeThreshold: 20000,
        hasOpenDraftPO: false,
        creditLimit: 25000,
        alreadyOutstanding: 2000,
    },
    {
        id: 'precision-bearings',
        name: 'Precision Bearings Co.',
        category: 'Bearings & Hardware',
        freightFreeThreshold: 20000,
        hasOpenDraftPO: false,
        creditLimit: 30000,
        alreadyOutstanding: 5000,
    },
    {
        id: 'apex-motors',
        name: 'Apex Motors Pvt Ltd',
        category: 'Motors',
        freightFreeThreshold: 40000,
        hasOpenDraftPO: false,
        creditLimit: 100000,
        alreadyOutstanding: 10000,
    },
    {
        id: 'universal-fasteners',
        name: 'Universal Fasteners',
        category: 'Fasteners',
        freightFreeThreshold: 15000,
        hasOpenDraftPO: false,
        creditLimit: 20000,
        alreadyOutstanding: 1000,
    },
    {
        id: 'global-ispat',
        name: 'Global Ispat & Alloys',
        category: 'Raw Material — Steel / Fabrication (new, being evaluated)',
        freightFreeThreshold: 25000,
        hasOpenDraftPO: false,
        creditLimit: null, // not onboarded far enough to have a credit limit set yet
        alreadyOutstanding: 0,
    },
];

// The single source of truth for both tabs — what's needed (qty/unit/
// required-by, vendor-agnostic) and every vendor's quote against it. Landed
// cost is a flat mock number (rate + GST + freight share already folded
// in), not computed live — this page never does real pricing math, only
// illustrates the comparison. `source` is Email/WhatsApp/Manual (see
// CHANNEL_META); `status` 'Received' has a rate already, 'Pending' is a
// request sent out with nobody's replied yet.
const REQUIREMENTS_SEED = [
    {
        item: 'MS Sheet 2mm', qty: 50, unit: 'kg', requiredBy: '2026-10-12',
        quotes: [
            { vendor: 'Sharma Steel Traders', source: 'Email', status: 'Received', rate: 185, landedCost: 198, deliveryDays: 7 },
            { vendor: 'Bhagwati Metal Works', source: 'WhatsApp', status: 'Received', rate: 178, landedCost: 188, deliveryDays: 10 },
            { vendor: 'Global Ispat & Alloys', source: 'WhatsApp', status: 'Pending' },
        ],
    },
    {
        item: 'Angle 25x25x3', qty: 120, unit: 'pcs', requiredBy: '2026-10-12',
        quotes: [
            { vendor: 'Sharma Steel Traders', source: 'Email', status: 'Received', rate: 95, landedCost: 101, deliveryDays: 7 },
        ],
    },
    {
        item: 'C Channel 75mm', qty: 40, unit: 'pcs', requiredBy: '2026-10-18',
        quotes: [
            { vendor: 'Sharma Steel Traders', source: 'Email', status: 'Received', rate: 310, landedCost: 328, deliveryDays: 7 },
            { vendor: 'Bhagwati Metal Works', source: 'Manual', status: 'Received', rate: 305, landedCost: 322, deliveryDays: 9 },
        ],
    },
    {
        item: 'Bearing UCP208', qty: 30, unit: 'pcs', requiredBy: '2026-10-05',
        quotes: [
            { vendor: 'Precision Bearings Co.', source: 'Email', status: 'Received', rate: 420, landedCost: 441, deliveryDays: 6 },
        ],
    },
    {
        item: 'Bearing 6205ZZ', qty: 60, unit: 'pcs', requiredBy: '2026-10-09',
        quotes: [
            { vendor: 'Precision Bearings Co.', source: 'Email', status: 'Received', rate: 95, landedCost: 101, deliveryDays: 6 },
        ],
    },
    {
        item: 'Motor A 1HP', qty: 10, unit: 'pcs', requiredBy: '2026-10-20',
        quotes: [
            { vendor: 'Apex Motors Pvt Ltd', source: 'Email', status: 'Received', rate: 3200, landedCost: 3400, deliveryDays: 12 },
        ],
    },
    {
        item: 'Motor B 2HP', qty: 5, unit: 'pcs', requiredBy: '2026-10-20',
        quotes: [
            { vendor: 'Apex Motors Pvt Ltd', source: 'Email', status: 'Received', rate: 5600, landedCost: 5950, deliveryDays: 12 },
        ],
    },
    {
        item: 'Hex Bolt M8x40', qty: 500, unit: 'pcs', requiredBy: '2026-10-07',
        quotes: [
            { vendor: 'Universal Fasteners', source: 'Manual', status: 'Received', rate: 4, landedCost: 4.3, deliveryDays: 5 },
        ],
    },
    {
        item: 'Nut M8', qty: 500, unit: 'pcs', requiredBy: '2026-10-15',
        quotes: [
            { vendor: 'Universal Fasteners', source: 'Manual', status: 'Received', rate: 2, landedCost: 2.15, deliveryDays: 5 },
        ],
    },
];

// This vendor's own Received quote per requirement — not the cheapest
// overall, THEIRS specifically, since this is "what could I buy from this
// vendor," not a price comparison (that's the By Item tab's job).
function receivedLinesFor(vendorName, requirements) {
    const lines = [];
    requirements.forEach(req => {
        const q = req.quotes.find(q => q.vendor === vendorName && q.status === 'Received');
        if (q) lines.push({ item: req.item, qty: req.qty, unit: req.unit, requiredBy: req.requiredBy, rate: q.rate });
    });
    return lines;
}

function batchTotal(lines) {
    return lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
}

// A badge only fires when the mock numbers actually satisfy it, computed
// over whichever lines are currently checked — unchecking an item can make
// a badge disappear, which is the point (it's THIS batch's numbers).
function insightsFor(vendor, lines) {
    const total = batchTotal(lines);
    const insights = [];
    if (lines.length === 0) return insights;

    if (total >= vendor.freightFreeThreshold) {
        insights.push({
            key: 'freight', icon: Truck, tone: 'good',
            text: `Crosses free-freight threshold (${inr(vendor.freightFreeThreshold)})`,
        });
    }
    const dateGroups = new Map();
    lines.forEach(l => dateGroups.set(l.requiredBy, (dateGroups.get(l.requiredBy) || 0) + 1));
    const clustered = [...dateGroups.entries()].find(([, count]) => count >= 2);
    if (clustered) {
        insights.push({
            key: 'cluster', icon: CalendarClock, tone: 'good',
            text: `${clustered[1]} items share the same delivery window (${new Date(clustered[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`,
        });
    }
    if (vendor.hasOpenDraftPO) {
        insights.push({
            key: 'openpo', icon: FileStack, tone: 'good',
            text: 'Open Draft PO exists — append instead of creating a new one',
        });
    }
    if (vendor.creditLimit) {
        const exposure = vendor.alreadyOutstanding + total;
        const exposurePct = exposure / vendor.creditLimit;
        if (exposurePct >= 0.7) {
            insights.push({
                key: 'credit', icon: CreditCard, tone: exposurePct >= 1 ? 'bad' : 'warn',
                text: `Credit exposure ${inr(exposure)} of ${inr(vendor.creditLimit)} limit (${Math.round(exposurePct * 100)}%)`,
            });
        }
    }
    return insights;
}

const toneClass = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
};

function VendorCard({ vendor, requirements, deselectedItems, onToggleItem }) {
    const available = receivedLinesFor(vendor.name, requirements);
    const selected = available.filter(l => !deselectedItems.has(l.item));
    const total = batchTotal(selected);
    const insights = insightsFor(vendor, selected);

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" /> {vendor.name}
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">{vendor.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-xs text-slate-400">{selected.length} of {available.length} selected</div>
                        <div className="text-lg font-bold text-slate-900">{inr(total)}</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {available.length === 0 ? (
                    <p className="text-xs text-slate-400 italic border rounded-md px-3 py-4 text-center">
                        No received quotes from this vendor yet — set a price for them on the By Item tab first.
                    </p>
                ) : (
                    <div className="border rounded-md divide-y">
                        {available.map((l, i) => (
                            <label key={i} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={!deselectedItems.has(l.item)}
                                    onChange={() => onToggleItem(l.item)}
                                />
                                <div className="flex-1">
                                    <span className="font-medium text-slate-800">{l.item}</span>
                                    <span className="text-slate-400 ml-2 text-xs">{l.qty} {l.unit} × {inr(l.rate)}</span>
                                </div>
                                <span className="font-semibold text-slate-700">{inr(l.qty * l.rate)}</span>
                            </label>
                        ))}
                    </div>
                )}

                {insights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {insights.map(ins => (
                            <span key={ins.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${toneClass[ins.tone]}`}>
                                <ins.icon className="w-3 h-3" /> {ins.text}
                            </span>
                        ))}
                    </div>
                )}

                <div className="pt-1">
                    <Button type="button" size="sm" variant="outline" className="w-full" disabled={selected.length === 0}>
                        Consolidate {selected.length > 0 ? `${selected.length} items (${inr(total)})` : ''} into one PO
                        <span className="text-[10px] text-slate-400 ml-1.5">(preview only)</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// The "how does a rate even arrive" mechanism — §04 of the discussion doc:
// email (existing RFQ link), WhatsApp (same link, new channel) and manual
// entry after a call (Purchase types it in directly) all feed this same
// quote list, which the By Vendor tab reads its prices from. Still
// frontend-only: Email/WhatsApp just add a Pending row — nothing is
// actually sent — and Manual adds a Received row immediately.
function AddQuoteRow({ onAdd }) {
    const [channel, setChannel] = useState(null);
    const [vendor, setVendor] = useState('');
    const [rate, setRate] = useState('');
    const [deliveryDays, setDeliveryDays] = useState('');

    const reset = () => { setChannel(null); setVendor(''); setRate(''); setDeliveryDays(''); };

    const submit = () => {
        if (!vendor.trim()) return;
        if (channel === 'Manual') {
            if (!rate) return;
            onAdd({ vendor: vendor.trim(), source: 'Manual', status: 'Received', rate: Number(rate), landedCost: Number(rate), deliveryDays: deliveryDays ? Number(deliveryDays) : undefined });
        } else {
            onAdd({ vendor: vendor.trim(), source: channel, status: 'Pending' });
        }
        reset();
    };

    if (!channel) {
        return (
            <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(CHANNEL_META).map(([key, meta]) => (
                    <button
                        key={key} type="button"
                        onClick={() => setChannel(key)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                    >
                        <Plus className="w-3 h-3" /> <meta.icon className="w-3 h-3" /> Request via {meta.label.replace(' (by Purchase)', '')}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="border border-dashed border-slate-300 rounded-md p-2.5 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    {React.createElement(CHANNEL_META[channel].icon, { className: 'w-3.5 h-3.5' })} {CHANNEL_META[channel].label}
                </span>
                <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Vendor name" className="text-sm h-8" />
            {channel === 'Manual' && (
                <div className="flex gap-2">
                    <Input value={rate} onChange={e => setRate(e.target.value)} type="number" placeholder="Rate (₹)" className="text-sm h-8" />
                    <Input value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} type="number" placeholder="Delivery days" className="text-sm h-8" />
                </div>
            )}
            <Button type="button" size="sm" className="w-full h-8" onClick={submit}>
                {channel === 'Manual' ? 'Save quote' : `Send request via ${CHANNEL_META[channel].label}`}
            </Button>
        </div>
    );
}

function ItemComparisonCard({ requirement, onAddQuote }) {
    const received = requirement.quotes.filter(q => q.status !== 'Pending');
    const pendingCount = requirement.quotes.length - received.length;
    const cheapest = received.length > 0 ? received.reduce((min, q) => q.landedCost < min.landedCost ? q : min, received[0]) : null;
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" /> {requirement.item}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                    Need {requirement.qty} {requirement.unit} by {new Date(requirement.requiredBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
                {received.length === 1 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> Only 1 vendor on file for this item
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="border rounded-md divide-y">
                    {requirement.quotes.map((q, i) => {
                        const meta = CHANNEL_META[q.source];
                        const isPending = q.status === 'Pending';
                        return (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div>
                                    <div className="font-medium text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        {q.vendor}
                                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 border border-slate-200 rounded-full px-1.5 py-0.5">
                                            <meta.icon className="w-2.5 h-2.5" /> {meta.label.replace(' (by Purchase)', '')}
                                        </span>
                                        {!isPending && received.length > 1 && q === cheapest && (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] flex items-center gap-1">
                                                <Award className="w-2.5 h-2.5" /> Lowest landed cost
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {isPending
                                            ? <span className="inline-flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> Awaiting response</span>
                                            : <>Rate {inr(q.rate)}{q.deliveryDays ? ` · ${q.deliveryDays} day delivery` : ''}</>}
                                    </div>
                                </div>
                                {!isPending && (
                                    <span className="font-semibold text-slate-700">{inr(q.landedCost)}<span className="text-[10px] text-slate-400 font-normal">/unit landed</span></span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {pendingCount > 0 && (
                    <p className="text-[11px] text-slate-400">{pendingCount} request{pendingCount > 1 ? 's' : ''} sent, waiting on a reply.</p>
                )}
                <AddQuoteRow onAdd={onAddQuote} />
            </CardContent>
        </Card>
    );
}

const INSIGHT_LEGEND = [
    { icon: Truck, text: 'Free-freight threshold — batching small PRs together crosses a vendor\'s free-delivery cutoff.' },
    { icon: CalendarClock, text: 'Delivery-date clustering — items already needed around the same date, worth one shipment instead of several.' },
    { icon: FileStack, text: 'Open Draft PO — a PO to this vendor already exists unsent; add lines to it instead of starting a second one.' },
    { icon: CreditCard, text: 'Credit exposure — this batch plus what\'s already outstanding, against the vendor\'s credit limit.' },
];

const VendorBatchingPreview = () => {
    const [view, setView] = useState('vendor');
    const [requirements, setRequirements] = useState(REQUIREMENTS_SEED);
    // Per-vendor set of item names unticked from their default (all-selected)
    // batch — not present here means "selected", so a newly-added item is
    // automatically included without needing to sync this against the list.
    const [deselected, setDeselected] = useState({});

    const addQuoteToItem = (itemIndex, quote) => {
        setRequirements(list => list.map((r, i) => i === itemIndex ? { ...r, quotes: [...r.quotes, quote] } : r));
    };
    const toggleVendorItem = (vendorId, itemName) => {
        setDeselected(prev => {
            const cur = new Set(prev[vendorId]);
            cur.has(itemName) ? cur.delete(itemName) : cur.add(itemName);
            return { ...prev, [vendorId]: cur };
        });
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Vendor Batching (Preview)</h1>
                <p className="text-slate-500">Sample data to illustrate the proposed Procurement redesign — not connected to real purchase requests</p>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm mb-6">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Every vendor, item and amount on this page is hand-entered sample data for discussion. Nothing here is read from or written to real Purchase Requests, Purchase Orders or Vendor records. A price is only ever set on the <b>By Item</b> tab — <b>By Vendor</b> just lets you pick which already-quoted items to batch.</span>
            </div>

            <div className="flex gap-2 mb-2">
                {[
                    { key: 'vendor', label: 'By Vendor', icon: Building2 },
                    { key: 'item', label: 'By Item', icon: Package },
                ].map(t => (
                    <button
                        key={t.key} type="button"
                        onClick={() => setView(t.key)}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border flex items-center gap-2 ${view === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {view === 'vendor' && (
                <>
                    <Card className="border-0 shadow-sm mb-4 bg-white">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">What the badges below mean</p>
                            <p className="text-xs text-slate-400 mb-3">These four are proposed ideas beyond the client's original brief — for discussion, not decided yet. Untick an item below and watch the badges update — they're computed off the batch you've actually selected, not the vendor's full list.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {INSIGHT_LEGEND.map((l, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                        <l.icon className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" /> {l.text}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {VENDORS.map(v => (
                            <VendorCard
                                key={v.id}
                                vendor={v}
                                requirements={requirements}
                                deselectedItems={deselected[v.id] || new Set()}
                                onToggleItem={itemName => toggleVendorItem(v.id, itemName)}
                            />
                        ))}
                    </div>
                </>
            )}

            {view === 'item' && (
                <>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                        <Users className="w-3.5 h-3.5" /> Which vendors can supply the same pending item, quoted side by side — and how each rate came in: Email, WhatsApp or Purchase entering it manually after a call. A Received quote here is what shows up as a buyable line on the By Vendor tab.
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {requirements.map((r, i) => <ItemComparisonCard key={i} requirement={r} onAddQuote={q => addQuoteToItem(i, q)} />)}
                    </div>
                </>
            )}
        </div>
    );
};

export default VendorBatchingPreview;
