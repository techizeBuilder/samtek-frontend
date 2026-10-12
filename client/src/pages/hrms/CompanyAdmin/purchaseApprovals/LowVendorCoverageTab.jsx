import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { STAGE_META } from '@/components/accounts/vendor/vendorUi';

// Company Admin → Purchase & Vendor Approval → Low Vendor Coverage
// (procurement-v2, 2026-10-08). Every Purchasable item with FEWER than the
// company's "minimum vendors per item" (Settings tab) approved + active
// vendors, with ALL its linked vendors and their status — so "2 linked but 1
// is still a Draft" is visible. Backend: GET /api/purchase-settings/
// low-coverage-items (purchaseSettingsController.js).
const PAGE_SIZES = [10, 20, 50, 100];

export default function LowVendorCoverageTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Light debounce so typing doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-settings', 'low-coverage', page, limit, search],
    queryFn: () => apiRequest('GET', `/api/purchase-settings/low-coverage-items?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
    keepPreviousData: true,
  });
  const items = data?.items || [];
  const pg = data?.pagination || { page: 1, pages: 1, total: 0 };
  const minVendors = data?.minVendorsPerItem;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Purchasable items with fewer than <b>{minVendors ?? '…'}</b> approved, active vendors (change the number in Settings).
        Vendors still in Draft, waiting for approval, suspended or inactive are listed but don't count.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search item name or code..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Per page
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="border rounded-md px-2 py-1 text-sm bg-white">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="text-xs text-gray-400 ml-auto">{pg.total} item{pg.total === 1 ? '' : 's'}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {search ? 'No matching item is short of vendors.' : 'Every purchasable item has enough approved vendors.'}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {items.map(it => (
              <div key={it._id} className="px-4 py-3 flex flex-wrap items-start gap-3">
                <div className="min-w-[220px] flex-1">
                  <p className="font-medium text-gray-800">{it.name} <span className="font-mono text-xs text-blue-600">{it.code}</span></p>
                  <p className="text-[11px] text-gray-400">{it.source}</p>
                </div>
                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${it.eligibleCount === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <AlertTriangle className="w-3 h-3" /> {it.eligibleCount} / {minVendors} approved
                  </span>
                </div>
                <div className="w-full flex flex-wrap gap-1.5">
                  {it.vendors.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No vendor linked to this item in Vendor Master</span>
                  ) : it.vendors.map(v => {
                    const meta = STAGE_META[v.approvalStatus] || STAGE_META.Draft;
                    return (
                      <span key={v._id} className="inline-flex items-center gap-1.5 text-xs border rounded-full pl-2 pr-1 py-0.5 bg-white">
                        {v.supplierName}
                        <span className={`px-1.5 rounded-full border text-[10px] ${meta.className}`}>{meta.label}</span>
                        {v.status === 'inactive' && <span className="px-1.5 rounded-full border text-[10px] bg-slate-100 text-slate-500 border-slate-200">Inactive</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pg.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pg.page <= 1}>Previous</Button>
          <span className="text-sm text-gray-500">Page {pg.page} of {pg.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pg.pages, p + 1))} disabled={pg.page >= pg.pages}>Next</Button>
        </div>
      )}
    </div>
  );
}
