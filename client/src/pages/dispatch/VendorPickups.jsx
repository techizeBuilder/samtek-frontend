import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Truck, Package, RotateCw } from 'lucide-react';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Dispatch stub (2026-10) — "just show the request, build the rest later."
// Purchase chooses Vendor/Company transport at PO batch-creation time (By
// Vendor tab); this lists every PO where Company is responsible, so
// Logistics/Dispatch knows a pickup needs arranging. Purely read-only for
// now — no vehicle/driver assignment, no status tracking. See
// purchaseController.js's getVendorPickupsForDispatch and
// procurement-purchase-restructure-changes-2026-10.md for the full design
// discussion (including the open question this deferred: which PO charges
// should drop when the company — not the vendor — handles transport).
export default function VendorPickups() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/dispatches/vendor-pickups');
      setPurchases(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-violet-600" /> Vendor Pickups
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Purchase Orders where transport is this company's responsibility, not the vendor's.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      {loading ? (
        <p className="text-slate-400 py-10 text-center">Loading...</p>
      ) : purchases.length === 0 ? (
        <p className="text-slate-400 py-10 text-center">No vendor pickups pending right now.</p>
      ) : (
        <div className="space-y-3">
          {purchases.map(po => (
            <Card key={po._id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      {po.purchaseOrderNumber}
                      <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200 text-[10px]">We pick up</Badge>
                    </p>
                    <p className="text-sm text-slate-500">{po.supplier?.supplierName}</p>
                    {po.supplier?.address && (
                      <p className="text-xs text-slate-400">
                        {[po.supplier.address.street, po.supplier.address.city, po.supplier.address.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Expected</p>
                    <p className="text-sm font-medium text-slate-700">
                      {po.deliveryClock?.startsOn === 'advance' && !po.deliveryClock.startedAt
                        ? <span className="text-violet-700" title="The vendor's delivery days start when the advance is paid">After advance</span>
                        : po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 border rounded-md divide-y bg-slate-50">
                  {(po.items || []).map((it, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400" /> {it.itemName}</span>
                      <span className="text-slate-500">{it.quantity} {it.expectedDeliveryDate ? `· due ${new Date(it.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">{inr(po.grandTotal)} · Status: {po.status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
