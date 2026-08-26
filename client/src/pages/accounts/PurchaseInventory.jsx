import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Package, Cog, Search, Save, IndianRupee, Boxes } from 'lucide-react';

// Purchase > Inventory — three read views over the same Item collection R&D
// uses (Inventory / Product Master / Motor Master), bucketed by productKind,
// restricted here to items flagged purchase:true. Purchase's only job on
// this screen is to set/update each item's purchaseCost.
const TABS = [
  {
    key: 'raw-material',
    label: 'Tools & Raw Material',
    productKind: 'none',
    icon: Wrench,
    accent: {
      trigger: 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm',
      chip: 'bg-blue-100 text-blue-700',
      ring: 'focus:ring-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    emptyHint: 'Raw material & tool items appear here once added to Inventory with "Purchase" enabled.',
  },
  {
    key: 'product-master',
    label: 'Product Master',
    productKind: 'Machine',
    icon: Package,
    accent: {
      trigger: 'data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm',
      chip: 'bg-purple-100 text-purple-700',
      ring: 'focus:ring-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700',
    },
    emptyHint: 'Purchasable machines from Product Master will appear here.',
  },
  {
    key: 'motor-master',
    label: 'Motor Master',
    productKind: 'Motor',
    icon: Cog,
    accent: {
      trigger: 'data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm',
      chip: 'bg-amber-100 text-amber-700',
      ring: 'focus:ring-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    emptyHint: 'Purchasable motors from Motor Master will appear here.',
  },
];

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Total kg currently in stock for a fabrication item, summed across every
// dimensionVariant (different sizes each carry their own subStock and
// weightPerPieceKg — see Inventory.js). Used instead of `qty` (a piece
// count that means nothing on its own for these items) wherever a
// fabrication item's stock value needs computing.
const stockWeightKg = (item) =>
  (item.dimensionVariants || []).reduce((sum, dv) => sum + (Number(dv.subStock) || 0) * (Number(dv.weightPerPieceKg) || 0), 0);

function InventoryCostPanel({ tab }) {
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['purchase-inventory', tab.productKind],
    queryFn: () => apiRequest('GET', `/api/accounts/purchases/inventory?productKind=${tab.productKind}`),
  });

  const items = data?.items || [];

  // Fabrication items (Item.fabricationRef set) are priced per kg
  // (weightUnitPrice), not per piece (purchaseCost) — see Inventory.js's
  // weightUnitPrice field comment for why the two can't be the same field.
  useEffect(() => {
    const next = {};
    items.forEach((it) => {
      const draftField = it.fabricationRef ? it.weightUnitPrice : it.purchaseCost;
      next[it._id] = draftField != null ? String(draftField) : '';
    });
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (it) => it.name?.toLowerCase().includes(q) || it.code?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalValue = useMemo(
    () => items.reduce((sum, it) => sum + (it.fabricationRef
      ? (Number(it.weightUnitPrice) || 0) * stockWeightKg(it)
      : (Number(it.purchaseCost) || 0) * (Number(it.qty) || 0)), 0),
    [items]
  );

  const setDraft = (id, value) => setDrafts((d) => ({ ...d, [id]: value }));

  const saveItem = async (item) => {
    const draftValue = drafts[item._id];
    const isFabrication = !!item.fabricationRef;
    if (draftValue === '' || draftValue === undefined || isNaN(Number(draftValue)) || Number(draftValue) < 0) {
      toast({ title: 'Invalid Cost', description: `Enter a valid, non-negative ${isFabrication ? 'price per kg' : 'purchase cost'}.`, variant: 'destructive' });
      return;
    }
    setSavingId(item._id);
    try {
      if (isFabrication) {
        await apiRequest('PUT', `/api/accounts/purchases/inventory/${item._id}/weight-unit-price`, {
          weightUnitPrice: Number(draftValue),
        });
        toast({ title: 'Saved', description: `Price per kg updated for ${item.code}`, variant: 'default' });
      } else {
        await apiRequest('PUT', `/api/accounts/purchases/inventory/${item._id}/purchase-cost`, {
          purchaseCost: Number(draftValue),
        });
        toast({ title: 'Saved', description: `Purchase cost updated for ${item.code}`, variant: 'default' });
      }
      refetch();
    } catch (err) {
      toast({ title: 'Save Failed', description: err.message || 'Could not update cost', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const Icon = tab.icon;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tab.accent.chip}`}>
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Items</p>
            <p className="text-lg font-bold text-slate-800">{items.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tab.accent.chip}`}>
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Stock Value</p>
            <p className="text-lg font-bold text-slate-800">{money(totalValue)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tab.accent.chip}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Category</p>
            <p className="text-sm font-semibold text-slate-800">{tab.label}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 h-14 flex items-center border-b border-slate-100 gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by item name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${tab.accent.ring} focus:border-transparent`}
            />
          </div>
          {isFetching && !isLoading && <span className="text-xs text-slate-400">Refreshing…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item Code</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Item Type</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Purchase Cost</th>
                <th className="px-4 py-3 text-right">MRP</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading items...</td></tr>
              ) : isError ? (
                <tr><td colSpan={8} className="text-center py-12 text-red-400">Failed to load items.</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {items.length === 0 ? tab.emptyHint : 'No items match your search.'}
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item._id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{item.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    {item.subCategory && <div className="text-[11px] text-slate-400">{item.subCategory}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.itemType || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600 text-xs">
                    {item.fabricationRef
                      ? <>{stockWeightKg(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg</>
                      : <>{item.qty ?? 0} {item.unit || ''}</>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0"
                        value={drafts[item._id] ?? ''}
                        onChange={(e) => setDraft(item._id, e.target.value)}
                        disabled={!canEdit}
                        className={`w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 ${tab.accent.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                      />
                      {item.fabricationRef && <span className="text-slate-400 text-xs">/kg</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 text-xs">{money(item.mrp)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 text-xs">{money(item.salePrice)}</td>
                  <td className="px-4 py-3 text-center">
                    {canEdit && (
                      <button
                        onClick={() => saveItem(item)}
                        disabled={savingId === item._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 ${tab.accent.button}`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingId === item._id ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseInventory() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Purchase Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Accounts / Purchases / Inventory — set and update purchase cost for purchasable items
        </p>
      </div>

      <Tabs defaultValue="raw-material" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-2xl bg-white border border-slate-200 h-auto sm:h-12 p-1 rounded-xl shadow-sm gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className={`rounded-lg ${tab.accent.trigger}`}>
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          {TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <InventoryCostPanel tab={tab} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
