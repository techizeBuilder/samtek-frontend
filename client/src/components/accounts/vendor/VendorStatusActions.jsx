import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Undo2, PauseCircle, Ban, RotateCcw, AlertTriangle } from 'lucide-react';

// Purchase's side of the vendor approval lifecycle (Vendor Master v2,
// procurement-v2). Every action here only RAISES a request — the Company
// Admin approves it on the Purchase & Vendor Approval page. Which buttons show
// depends on approvalStatus and on what's already pending.
const STATUS_REQUEST_COPY = {
  Suspend: {
    title: 'Request suspension',
    description: 'A suspended vendor can\'t be quoted or given a PO until reinstated. Existing invoices and payments are not affected. The Company Admin approves this.',
    needsEvidence: true,
  },
  Blacklist: {
    title: 'Request blacklisting',
    description: 'For serious, proven problems (fake documents, collusion, repeated serious quality failures). A blacklisted vendor can\'t be quoted or ordered from until formally reinstated. The Company Admin approves this.',
    needsEvidence: true,
  },
  Reinstate: {
    title: 'Request reinstatement',
    description: 'Makes the vendor usable for quotes and POs again, once the Company Admin approves.',
    needsEvidence: false,
  },
};

export default function VendorStatusActions({ vendor, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(null);
  const [requestType, setRequestType] = useState(null);
  const [reason, setReason] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [files, setFiles] = useState([]);

  const status = vendor.approvalStatus || 'Draft';
  const pendingTypes = new Set((vendor.pendingRequests || []).map(r => r.type));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/suppliers/${vendor._id}/submit`);
      toast({ title: 'Submitted', description: res.message });
      onDone?.();
    } catch (err) {
      const list = err.responseData?.missing;
      if (Array.isArray(list) && list.length) setMissing(list);
      else toast({ title: 'Could not submit', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw this vendor from approval? It goes back to Draft so you can edit it.')) return;
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/suppliers/${vendor._id}/withdraw`);
      toast({ title: 'Withdrawn', description: res.message });
      onDone?.();
    } catch (err) {
      toast({ title: 'Could not withdraw', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openRequest = (type) => {
    setRequestType(type);
    setReason('');
    setReviewDate('');
    setFiles([]);
  };

  const sendRequest = async () => {
    const copy = STATUS_REQUEST_COPY[requestType];
    if (!reason.trim()) {
      toast({ title: 'A reason is required', variant: 'destructive' });
      return;
    }
    if (copy.needsEvidence && files.length === 0) {
      toast({ title: 'Attach at least one evidence file', variant: 'destructive' });
      return;
    }
    const fd = new FormData();
    fd.append('type', requestType);
    fd.append('reason', reason.trim());
    if (reviewDate) fd.append('reviewDate', reviewDate);
    files.forEach(f => fd.append('evidence', f));
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/suppliers/${vendor._id}/status-requests`, fd);
      toast({ title: 'Request sent', description: res.message });
      setRequestType(null);
      onDone?.();
    } catch (err) {
      toast({ title: 'Could not send request', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const btn = 'h-7 px-2 text-xs';
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {(status === 'Draft' || status === 'Rejected') && (
          <Button size="sm" className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`} onClick={submit} disabled={busy}>
            <Send className="w-3 h-3 mr-1" />Submit for Approval
          </Button>
        )}
        {status === 'Pending Approval' && (
          <Button size="sm" variant="outline" className={btn} onClick={withdraw} disabled={busy}>
            <Undo2 className="w-3 h-3 mr-1" />Withdraw
          </Button>
        )}
        {status === 'Approved' && !pendingTypes.has('Suspend') && (
          <Button size="sm" variant="outline" className={`${btn} text-amber-700 border-amber-200`} onClick={() => openRequest('Suspend')} disabled={busy}>
            <PauseCircle className="w-3 h-3 mr-1" />Request Suspension
          </Button>
        )}
        {(status === 'Approved' || status === 'Suspended') && !pendingTypes.has('Blacklist') && (
          <Button size="sm" variant="outline" className={`${btn} text-red-700 border-red-200`} onClick={() => openRequest('Blacklist')} disabled={busy}>
            <Ban className="w-3 h-3 mr-1" />Request Blacklist
          </Button>
        )}
        {(status === 'Suspended' || status === 'Blacklisted') && !pendingTypes.has('Reinstate') && (
          <Button size="sm" variant="outline" className={`${btn} text-emerald-700 border-emerald-200`} onClick={() => openRequest('Reinstate')} disabled={busy}>
            <RotateCcw className="w-3 h-3 mr-1" />Request Reinstatement
          </Button>
        )}
      </div>

      {/* What's still missing before this vendor can be submitted */}
      <Dialog open={!!missing} onOpenChange={(o) => { if (!o) setMissing(null); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Not ready for approval yet</DialogTitle>
            <DialogDescription>Fill these in — vendor details and documents under Edit, what it supplies under "Products &amp; Services" — then submit again.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700">
            {(missing || []).map(m => <li key={m}>{m}</li>)}
          </ul>
          <DialogFooter>
            <Button onClick={() => setMissing(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Blacklist / Reinstate request */}
      <Dialog open={!!requestType} onOpenChange={(o) => { if (!o) setRequestType(null); }}>
        {requestType && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{STATUS_REQUEST_COPY[requestType].title} — {vendor.supplierName}</DialogTitle>
              <DialogDescription>{STATUS_REQUEST_COPY[requestType].description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="What happened, with dates / PO numbers where relevant" />
              </div>
              {requestType !== 'Reinstate' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Review date (optional)</label>
                    <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
                    <p className="text-[11px] text-slate-400 mt-0.5">When this should be looked at again.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Evidence * (up to 5 files)</label>
                    <Input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRequestType(null)} disabled={busy}>Cancel</Button>
              <Button onClick={sendRequest} disabled={busy}>{busy ? 'Sending...' : 'Send to Company Admin'}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
