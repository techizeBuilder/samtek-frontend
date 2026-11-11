import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VendorDocumentsSection from './VendorDocumentsSection';

// A vendor's documents in their own dialog (2026-10-28, client) — the same
// two-step pattern as Products & Services (VendorCoverageDialog): offered
// right after a vendor is created (afterCreate: "Later" skips it) and from the
// vendor card's Documents button any time. Uploads and removals save on their
// own, so there is no Save button; the vendor shown here is kept current
// through onVendorChange. Which documents are needed comes from the Company
// Admin's Vendor documents setting (shown by VendorDocumentsSection).
export default function VendorDocumentsDialog({ vendor, open, afterCreate = false, readOnly = false, onVendorChange, onClose }) {
  if (!vendor) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{afterCreate ? 'Step 2 — ' : ''}Documents — {vendor.supplierName}</DialogTitle>
          <DialogDescription>
            {afterCreate
              ? 'Vendor created. Upload its documents now — or later with "Documents" on the vendor card.'
              : readOnly
                ? 'Waiting for Company Admin approval — read-only. Withdraw the submission from the vendor card to change documents.'
                : 'Compliance documents for this vendor.'}
          </DialogDescription>
        </DialogHeader>
        <VendorDocumentsSection vendor={vendor} readOnly={readOnly} onChange={onVendorChange} />
        <DialogFooter>
          <Button onClick={onClose}>
            {readOnly ? 'Close' : afterCreate ? ((vendor.documents || []).length ? 'Next — Products & Services' : 'Later — Products & Services') : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
