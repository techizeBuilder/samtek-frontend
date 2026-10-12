import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import PurchaseRequestsTab from './PurchaseRequestsTab';
import RfqPoTab from './rfqPo/RfqPoTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import VendorRatingsTab from './VendorRatingsTab';
import PurchaseSettingsTab from './PurchaseSettingsTab';
import { AuditLogTable, useCanSeeAudit } from '@/components/accounts/purchase/AuditLog';

// Purchase tabs (procurement-v2, 2026-10-08):
//   PRs             — every purchase request, with its quote status
//   RFQ/PO          — the merged By Item + By Vendor page (client design D3):
//                     items on the left, approved vendors on the right,
//                     Vendor Quotation → one PO per vendor
//   Purchase Orders — Active (incl. waiting for Company Admin approval) /
//                     History (incl. rejected) — moved out of the old By Vendor tab
//   Vendor Ratings  — computed, read-only (services/vendorRatingService.js)
//   Settings        — the PO charge / payment-term name templates; shown only
//                     to users given the accounts.purchaseSettings permission
//                     (Company Admin → Roles & Permissions). Anyone creating a
//                     PO still gets the names in the PO review dialog.
//   Audit Log       — every step of every PO (gap 17, 2026-10-10); shown only
//                     with the accounts.purchaseAuditLog permission.
export default function PurchaseTab() {
  const [subTab, setSubTab] = useState('prs');
  const [focusItemId, setFocusItemId] = useState(null);
  const [justCreatedPO, setJustCreatedPO] = useState(null);
  const { hasFeatureAccess } = usePermissions();
  const canSeeSettings = hasFeatureAccess('accounts', 'purchaseSettings', 'view') || hasFeatureAccess('accounts', 'purchaseSettings', 'edit');
  const canSeeAudit = useCanSeeAudit();

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="prs">PRs</TabsTrigger>
        <TabsTrigger value="rfqPo">RFQ/PO</TabsTrigger>
        <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
        <TabsTrigger value="vendorRatings">Vendor Ratings</TabsTrigger>
        {canSeeSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
        {canSeeAudit && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
      </TabsList>
      <TabsContent value="prs">
        <PurchaseRequestsTab onGoToQuote={(itemId) => { setFocusItemId(itemId); setSubTab('rfqPo'); }} />
      </TabsContent>
      <TabsContent value="rfqPo">
        <RfqPoTab
          key={focusItemId || 'all'}
          focusItemId={focusItemId}
          onPOCreated={(res) => { setJustCreatedPO(res?.purchase?.purchaseOrderNumber || null); }}
        />
      </TabsContent>
      <TabsContent value="orders">
        <PurchaseOrdersTab expandPONumber={justCreatedPO} />
      </TabsContent>
      {canSeeAudit && (
        <TabsContent value="audit">
          <AuditLogTable />
        </TabsContent>
      )}
      <TabsContent value="vendorRatings">
        <VendorRatingsTab />
      </TabsContent>
      {canSeeSettings && (
        <TabsContent value="settings">
          <PurchaseSettingsTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
