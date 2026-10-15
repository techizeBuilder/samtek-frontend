import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Truck, History, Mail, Ban, ScrollText, CalendarClock, PackageX } from 'lucide-react';
import PurchaseOrderList, { PURCHASE_ACTIVE_STATUSES, PURCHASE_DONE_STATUSES, awaitingAdvance } from '@/components/accounts/purchase/PurchaseOrderList';
import QuoteHistoryDialog from '@/components/accounts/purchase/QuoteHistoryDialog';
import CancelPoDialog, { canAskToCancel, linesToCancel } from '@/components/accounts/purchase/CancelPoDialog';
import { PoHistoryDialog, useCanSeeAudit } from '@/components/accounts/purchase/AuditLog';
import ReviseDeliveryDateDialog from '@/components/accounts/purchase/ReviseDeliveryDateDialog';
import QcRejections from '@/components/accounts/purchase/QcRejections';
import { usePermissions } from '@/hooks/usePermissions';

// Purchase Orders (procurement-v2, 2026-10-08) — moved out of the retired By
// Vendor tab. Active also shows POs waiting for Company Admin approval;
// History also shows the ones the Company Admin rejected (with the reason).
// A PO only reaches History once every line is received (or it's cancelled /
// rejected). Store's own receive page uses the plain ACTIVE/DONE lists and
// never sees a PO that isn't a real order yet.
// Each expanded PO has "All quotes" (every quotation behind it) and, for a
// real order still open with the vendor, "Send / Resend PO email" — a PO is
// emailed automatically when it's created or approved; this is the retry.
// "Cancel PO" / "Cancel the rest" (gap 13, 2026-10-09) asks the Company Admin
// to cancel a real order (or short close what isn't received yet).
const EMAILABLE = ['Draft', 'Sent', 'Acknowledged', 'Partially Received'];

function PoActions({ po, reload, onHistory }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canSeeAudit = useCanSeeAudit();
  const live = (po.items || []).filter(l => !l.cancelled?.at);
  const shortClose = canAskToCancel(po) && linesToCancel(po).length < live.length;
  const send = async () => {
    setSending(true);
    try {
      const res = await apiRequest('POST', `/api/accounts/purchases/orders/${po._id}/send-email`);
      toast({ title: res?.message || `${po.purchaseOrderNumber} emailed to the vendor` });
      reload();
    } catch (err) {
      toast({ title: 'Could not email the PO', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => onHistory(po)}><History className="w-3.5 h-3.5 mr-1" /> All quotes</Button>
      {canSeeAudit && (
        <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)} title="Every step of this PO — who, when"><ScrollText className="w-3.5 h-3.5 mr-1" /> History</Button>
      )}
      {EMAILABLE.includes(po.status) && (
        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={send} disabled={sending}>
          <Mail className="w-3.5 h-3.5 mr-1" /> {sending ? 'Sending…' : po.status === 'Draft' ? 'Send PO email' : 'Resend PO email'}
        </Button>
      )}
      {po.status === 'Draft' && <span className="text-[11px] text-amber-700">Not emailed to the vendor yet.</span>}
      {canAskToCancel(po) && (
        <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
          <Ban className="w-3.5 h-3.5 mr-1" /> {shortClose ? 'Cancel the rest' : 'Cancel PO'}
        </Button>
      )}
      <CancelPoDialog open={cancelOpen} onOpenChange={setCancelOpen} po={po} onDone={reload} />
      {canSeeAudit && <PoHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} poId={po._id} poNumber={po.purchaseOrderNumber} vendorName={po.supplier?.supplierName} />}
    </>
  );
}

// Delivery follow-up (2026-10-10): "Change date" on a line not yet received —
// the vendor gave a new date; recorded with their reason.
const OPEN_FOR_DATES = ['Draft', 'Sent', 'Acknowledged', 'Partially Received'];

export default function PurchaseOrdersTab({ expandPONumber = null }) {
  const [sub, setSub] = useState('active');
  const [historyPo, setHistoryPo] = useState(null);
  const [revise, setRevise] = useState(null); // { po, line }
  const [listKey, setListKey] = useState(0);
  // QC rejections waiting for the vendor's answer (2026-10-12, accounts Slice 3).
  const [rejCounts, setRejCounts] = useState(null);
  const { hasFeatureAccess } = usePermissions();
  const canAnswer = hasFeatureAccess('accounts', 'purchases', 'edit');
  React.useEffect(() => {
    apiRequest('GET', '/api/accounts/purchases/rejections?view=open&limit=1').then(res => setRejCounts(res?.data?.counts || null)).catch(() => {});
  }, []);
  const renderPoActions = (po, reload) => <PoActions po={po} reload={reload} onHistory={setHistoryPo} />;
  const renderLineAction = (line, po, { isReceived }) => (
    // Not while the PO waits for its advance — there is no date yet (2026-10-12).
    !isReceived && OPEN_FOR_DATES.includes(po.status) && !awaitingAdvance(po) ? (
      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-sky-700" onClick={(e) => { e.stopPropagation(); setRevise({ po, line }); }} title="The vendor gave a new date">
        <CalendarClock className="w-3 h-3 mr-1" /> Change date
      </Button>
    ) : null
  );
  return (
    <>
      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="mb-4">
          <TabsTrigger value="active"><Truck className="w-3.5 h-3.5 mr-1.5" /> Active</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1.5" /> History</TabsTrigger>
          <TabsTrigger value="rejections">
            <PackageX className="w-3.5 h-3.5 mr-1.5" /> QC Rejections
            {rejCounts?.awaiting > 0 && <span className="ml-1.5 text-[10px] font-bold bg-red-600 text-white rounded-full px-1.5">{rejCounts.awaiting}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <PurchaseOrderList
            reloadSignal={listKey}
            scopeStatuses={PURCHASE_ACTIVE_STATUSES}
            emptyMessage="No active purchase orders."
            expandPONumber={expandPONumber}
            renderPoActions={renderPoActions}
            renderLineAction={renderLineAction}
            showDueFilter
          />
        </TabsContent>
        <TabsContent value="history">
          <PurchaseOrderList
            scopeStatuses={PURCHASE_DONE_STATUSES}
            emptyMessage="No completed, cancelled or rejected purchase orders yet."
            expandPONumber={null}
            renderPoActions={renderPoActions}
          />
        </TabsContent>
        <TabsContent value="rejections">
          <QcRejections canAnswer={canAnswer} onCounts={setRejCounts} />
        </TabsContent>
      </Tabs>
      <ReviseDeliveryDateDialog open={!!revise} onOpenChange={(v) => { if (!v) setRevise(null); }} po={revise?.po} line={revise?.line} onDone={() => setListKey(k => k + 1)} />
      <QuoteHistoryDialog
        open={!!historyPo}
        onOpenChange={(v) => { if (!v) setHistoryPo(null); }}
        endpoint={historyPo ? `/api/item-quote-groups/quote-history?purchase=${historyPo._id}` : null}
        title={historyPo ? `All quotes — ${historyPo.purchaseOrderNumber}` : ''}
        vendorId={historyPo?.supplier?._id || null}
        vendorName={historyPo?.supplier?.supplierName || ''}
      />
    </>
  );
}
