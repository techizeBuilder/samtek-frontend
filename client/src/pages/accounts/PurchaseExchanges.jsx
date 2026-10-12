import React from 'react';
import QcRejections from '@/components/accounts/purchase/QcRejections';
import { usePermissions } from '@/hooks/usePermissions';
import { PackageX } from 'lucide-react';

// Accounts → Purchases → QC Rejections (rebuilt 2026-10-12, accounts
// Slice 3). Replaces the old "Purchase Exchange" page: before, every QC
// rejection automatically emailed the vendor a replacement link AND booked a
// purchase return. Now each rejection waits for the vendor's answer — replace,
// refund, credit or refused — recorded here or on Purchase Orders.
// Refunds due and vendor credit are on Vendor Payments.
export default function PurchaseExchanges() {
  const { hasFeatureAccess } = usePermissions();
  const canAnswer = hasFeatureAccess('accounts', 'purchases', 'edit');
  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2"><PackageX className="w-7 h-7 text-red-600" /> QC Rejections</h1>
        <p className="text-slate-500">Purchased material QC rejected, and what each vendor agreed to</p>
      </div>
      <QcRejections canAnswer={canAnswer} />
    </div>
  );
}
