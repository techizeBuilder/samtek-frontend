import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Star, ChevronDown, ChevronUp, RotateCw, Award, Search, X, Info } from 'lucide-react';

const inr = (n) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;

function StarRow({ rating, size = 'w-3.5 h-3.5' }) {
  if (rating == null) return <span className="text-xs text-slate-400 italic">No data yet</span>;
  return (
    <div className="flex items-center gap-0.5" title={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating}</span>
    </div>
  );
}

// Computed rating — on-time delivery + QC pass/fail, a plain average, see
// services/vendorRatingService.js. Deliberately separate from the old
// manual Supplier.rating field (removed from Vendor Master entirely).
function VendorRow({ vendor }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', `/api/suppliers/${vendor._id}/item-breakdown`);
      setData(res?.data || { overallRating: null, items: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && data === null) load(); /* eslint-disable-next-line */ }, [open]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <button type="button" className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
          <div className="text-left flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg shrink-0"><Award className="h-4 w-4 text-amber-600" /></div>
            <div>
              <p className="font-semibold text-slate-800">{vendor.supplierName}</p>
              <p className="text-xs text-slate-400">{vendor.itemCount} product{vendor.itemCount === 1 ? '' : 's'}{vendor.eventCount ? ` · ${vendor.eventCount} delivery/QC event${vendor.eventCount === 1 ? '' : 's'}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StarRow rating={vendor.rating} />
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {open && (
          <div className="mt-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : (data?.items || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">No products linked to this vendor in Vendor Master yet.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {/* "Bought before" — what we paid this vendor on DELIVERED purchases,
                    before GST, per purchase unit. Same numbers the RFQ/PO page shows
                    (quoteChecksService, 2026-10-09). */}
                <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase">
                  <span className="col-span-2">Item</span>
                  <span>Rating</span>
                  <span>Bought before: Avg / Last</span>
                  <span>Lowest bought</span>
                </div>
                {data.items.map(item => (
                  <div key={item.itemId} className="grid grid-cols-5 gap-2 px-3 py-2 text-sm items-center">
                    <span className="col-span-2 truncate">{item.itemName}</span>
                    <StarRow rating={item.rating} size="w-3 h-3" />
                    <span className="text-slate-600">
                      {inr(item.avgPrice)} / {inr(item.lastPrice)}{item.priceUnit ? <span className="text-[11px] text-slate-400"> /{item.priceUnit}</span> : ''}
                      {item.deliveries > 0 && <span className="block text-[10px] text-slate-400">{item.deliveries} deliver{item.deliveries === 1 ? 'y' : 'ies'}</span>}
                    </span>
                    <span className="text-slate-600">{inr(item.lowestPrice)}</span>
                  </div>
                ))}
                <p className="px-3 py-2 text-[11px] text-slate-400">Prices paid on delivered purchases, before GST.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Static explanation of vendorRatingService.js's own formula — kept in
// sync by hand since it's plain English, not generated from the code.
// Update this alongside any change to computeVendorRating/
// computeVendorItemPricing.
function HowRatingWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between px-3 py-2" onClick={() => setOpen(o => !o)}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
          <Info className="w-3.5 h-3.5" /> How this rating is calculated
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-blue-900 space-y-1.5">
          <p>Rating is computed, never typed in — a plain average of every signed event below, no weighting:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Delivery:</strong> on-time or early = +5, late = +1 — checked against that specific item's own expected delivery date, not a shared date across a whole batch order.</li>
            <li><strong>QC result:</strong> Pass = +5, Fail = +1.</li>
            <li><strong>Partial QC rejection:</strong> each one counts as its own +1, separate from whatever the job's final Pass/Fail ends up being for what's left — a shipment that needed a partial reject doesn't get full credit just because the remainder later passed.</li>
          </ul>
          <p>Item price (Avg / Last / Lowest) is the <strong>raw goods price only</strong> — no GST, no vendor charges — and only counts once an item has actually been received, not when it's merely quoted or ordered.</p>
        </div>
      )}
    </div>
  );
}

export default function VendorRatingsTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratedOnly, setRatedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('ratingDesc'); // ratingDesc | ratingAsc | name

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/suppliers/vendor-ratings');
      setVendors(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visibleVendors = vendors
    .filter(v => {
      if (ratedOnly && v.rating == null) return false;
      if (searchTerm && !(v.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.supplierName || '').localeCompare(b.supplierName || '');
      // Unrated vendors (no delivery/QC history yet) sort to the bottom
      // regardless of direction — there's nothing to rank them by.
      if (a.rating == null) return 1;
      if (b.rating == null) return -1;
      return sortBy === 'ratingAsc' ? a.rating - b.rating : b.rating - a.rating;
    });
  const anyFilterActive = searchTerm || ratedOnly;
  const clearFilters = () => { setSearchTerm(''); setRatedOnly(false); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Overall rating is computed from on-time delivery and QC pass/fail history, not typed in — expand a vendor for the item-wise breakdown and pricing.</p>
        <Button size="sm" variant="outline" onClick={load}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      <HowRatingWorks />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by vendor name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="ratingDesc">Rating: High to Low</option>
          <option value="ratingAsc">Rating: Low to High</option>
          <option value="name">Name: A to Z</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={ratedOnly} onChange={e => setRatedOnly(e.target.checked)} /> Rated vendors only
        </label>
        {anyFilterActive && (
          <button type="button" onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 py-10 text-center">Loading...</p>
      ) : vendors.length === 0 ? (
        <p className="text-slate-400 py-10 text-center">No vendors yet.</p>
      ) : visibleVendors.length === 0 ? (
        <p className="text-slate-400 py-10 text-center">No vendors match these filters.</p>
      ) : (
        visibleVendors.map(v => <VendorRow key={v._id} vendor={v} />)
      )}
    </div>
  );
}
