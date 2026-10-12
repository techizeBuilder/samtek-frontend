import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Wrench, Edit2 } from 'lucide-react';

// Read-only view of EVERYTHING a vendor supplies — opened from the vendor
// card's "+N more" (the card only shows the first 4 of each). Editing stays in
// the Step 2 dialog (VendorCoverageDialog); onEdit jumps there when allowed.
export default function VendorSuppliesDialog({ vendor, open, onOpenChange, catalogItems = [], catalogServices = [], onEdit }) {
  const [search, setSearch] = useState('');
  useEffect(() => { if (open) setSearch(''); }, [open, vendor?._id]);
  if (!vendor) return null;

  const itemById = new Map(catalogItems.map(it => [String(it._id), it]));
  const serviceByName = new Map(catalogServices.map(s => [s.name.trim().toLowerCase(), s]));
  const q = search.trim().toLowerCase();

  // A linked item missing from the catalog was discontinued or is no longer
  // marked Purchasable — still listed, so the count matches the card.
  const products = (vendor.suppliedItems || []).map(id => {
    const it = itemById.get(String(id));
    return it ? { id: String(id), name: it.name, code: it.code, source: it.source } : { id: String(id), name: null };
  }).filter(p => !q || (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));
  const services = (vendor.services || [])
    .map(name => ({ name, usedBy: serviceByName.get(name.trim().toLowerCase())?.usedBy || [] }))
    .filter(s => !q || s.name.toLowerCase().includes(q));

  const total = (vendor.suppliedItems || []).length + (vendor.services || []).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>What {vendor.supplierName} supplies</DialogTitle>
          <DialogDescription>
            {(vendor.suppliedItems || []).length} product(s) · {(vendor.services || []).length} service(s)
          </DialogDescription>
        </DialogHeader>

        {total > 8 && (
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." className="text-sm" />
        )}

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
            <Package className="w-3 h-3" /> Products ({products.length})
          </p>
          <div className="border rounded-md divide-y">
            {products.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">{q ? 'No match.' : 'No products linked.'}</p>
            ) : products.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {p.name ? (
                  <>
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="font-mono text-[11px] text-blue-600">{p.code}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{p.source}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">An item that's been discontinued or is no longer Purchasable</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
            <Wrench className="w-3 h-3" /> Services ({services.length})
          </p>
          <div className="border rounded-md divide-y">
            {services.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">{q ? 'No match.' : 'No services linked.'}</p>
            ) : services.map(s => (
              <div key={s.name} className="px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{s.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {s.usedBy.length > 0
                    ? <>Out Source in: {s.usedBy.map(u => `${u.name} (${u.code})`).join(', ')}</>
                    : <span className="text-slate-400">Not an Out Source step in any BOM yet</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-1.5" />Edit Products &amp; Services
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
