import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PackageCheck, Truck, History, Barcode } from 'lucide-react';
import SerialNumbersTab from '@/components/accounts/purchase/SerialNumbersTab';
import PurchaseOrderList, { ACTIVE_STATUSES, DONE_STATUSES } from '@/components/accounts/purchase/PurchaseOrderList';
import LineReceiveDialog from '@/components/accounts/purchase/LineReceiveDialog';
import LineFabricationReceiveDialog from '@/components/accounts/purchase/LineFabricationReceiveDialog';

// Store's own page (2026-10 rebuild) — this used to be a flat table of
// every PurchaseRequest (ordered or not), with a standalone "Mark Received"
// per PR. That matched the old 1 PR = 1 PO = 1 line design; since item-wise
// PR consolidation let several PRs share one PO line (one vendor shipment),
// a flat per-PR list stopped matching reality — there's no way to say which
// part of one physical delivery belongs to which PR. Rebuilt grouped by
// PO -> line (the same PurchaseOrderList pattern Accounts' own Active
// POs/Order History already use), with a receive action added per line.
//
// An "Approvals Needed" tab (Production/QC-sourced requests awaiting
// Store's own approve/reject before a PO can exist for them) was built
// here first, then removed — confirmed against every real PurchaseRequest
// creation path in this codebase (Sales/Order Form submit via
// storeFlowService.js, the Material Flow low-stock cron, and Store's own
// Material Transfer page) that none of them actually set `source` to
// 'Production'/'QC' in a way that would ever populate it; that gate exists
// in the data model but nothing in this company's real workflow uses it.
// The backend endpoints it called (store-approve/store-reject/
// check-inventory) are untouched, just no longer called from this page.
//
// Un-ordered PRs no longer appear anywhere here either — there's nothing to
// do with them on this page; they show up the moment Purchase orders them.
// See LineReceiveDialog/LineFabricationReceiveDialog for why receiving is
// one action per line, not per PR.
export default function PurchaseRequest() {
  const [subTab, setSubTab] = useState('receive');
  // Bumped after a line is received: the To Receive list refetches IN PLACE
  // (reloadSignal) — the open PO, filters and scroll stay where they were
  // (2026-10-14; it used to remount the whole list).
  const [toReceiveRefreshKey, setToReceiveRefreshKey] = useState(0);

  const [receiveTarget, setReceiveTarget] = useState(null); // { purchaseId, line, prs, isFab }

  const openReceiveDialog = (po, line, allPrRefs) => {
    // Only the requests still to be received. A line can already have
    // received requests (a QC replacement arriving on a line that was
    // received earlier): counting those too made the dialog expect their
    // pieces again (a 1-piece replacement asked for 6 serials). The server
    // already works on the not-yet-received requests only.
    const prRefs = allPrRefs.filter(pr => pr?.status !== 'Received');
    const isFab = prRefs.some(pr => pr.fabricationDimensionLines?.length > 0);
    setReceiveTarget({ purchaseId: po._id, line, prs: prRefs, isFab });
  };

  const handleReceived = () => {
    setReceiveTarget(null);
    setToReceiveRefreshKey(k => k + 1);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Requests & POs</h1>
          <p className="text-slate-500 mt-2">Receive incoming vendor shipments one PO line at a time.</p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="receive"><Truck className="w-3.5 h-3.5 mr-1.5" /> To Receive</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1.5" /> Received</TabsTrigger>
          <TabsTrigger value="serials"><Barcode className="w-3.5 h-3.5 mr-1.5" /> Serial Numbers</TabsTrigger>
        </TabsList>

        <TabsContent value="receive">
          <PurchaseOrderList
            reloadSignal={toReceiveRefreshKey}
            scopeStatuses={ACTIVE_STATUSES}
            emptyMessage="Nothing waiting to be received right now."
            expandPONumber={null}
            apiBase="/api/purchase-requests/orders"
            showDueFilter
            renderLineAction={(it, po, { isReceived, prRefs }) => {
              if (isReceived || !prRefs.length) return null;
              return (
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => { e.stopPropagation(); openReceiveDialog(po, it, prRefs); }}
                >
                  <PackageCheck className="w-3 h-3 mr-1" /> Receive
                </Button>
              );
            }}
          />
        </TabsContent>

        <TabsContent value="history">
          <PurchaseOrderList
            scopeStatuses={DONE_STATUSES}
            emptyMessage="No received purchase orders yet."
            expandPONumber={null}
            apiBase="/api/purchase-requests/orders"
          />
        </TabsContent>

        {/* Serial numbers / lots of everything received (2026-10-13). */}
        <TabsContent value="serials">
          <SerialNumbersTab />
        </TabsContent>
      </Tabs>

      {/* ── Line-level receive dialogs ───────────────────────────────────────── */}
      {receiveTarget && !receiveTarget.isFab && (
        <LineReceiveDialog
          purchaseId={receiveTarget.purchaseId}
          line={receiveTarget.line}
          prs={receiveTarget.prs}
          onClose={() => setReceiveTarget(null)}
          onReceived={handleReceived}
        />
      )}
      {receiveTarget && receiveTarget.isFab && (
        <LineFabricationReceiveDialog
          purchaseId={receiveTarget.purchaseId}
          line={receiveTarget.line}
          prs={receiveTarget.prs}
          onClose={() => setReceiveTarget(null)}
          onReceived={handleReceived}
        />
      )}
      {/* ─────────────────────────────────────────────────────────────────────── */}
    </div>
  );
}
