import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShoppingCart } from 'lucide-react';
import SubChildJobWork from '../SubChildJobWork';
import PurchaseTab from './PurchaseTab';

// Purchase department restructure (2026-10) — splits what used to be a
// single "Outsource Work" page into two tabs: Purchase (new — PRs / By
// Vendor / By Item, see PurchaseTab.jsx) and Out Source Work (unchanged —
// SubChildJobWork.jsx is mounted as-is, not touched or rewritten, since the
// Job Work side is explicitly deferred). Route renamed 2026-10-05 from the
// old /accounts/purchases/sub-child-job-work (a leftover from when this
// page was just "Outsource Work") to /accounts/purchases/purchase-outsource
// — sidebar relabeled "Purchase & Outsource" (see config/moduleRoutes.js).
export default function PurchaseOutsourceHub() {
  const [tab, setTab] = useState('purchase');

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-blue-600" /> Purchase &amp; Outsource
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">PR → Vendor Quotation → PO, and outsourced Job Work, in one place</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="purchase">Purchase</TabsTrigger>
          <TabsTrigger value="outsource">Out Source Work</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase">
          <PurchaseTab />
        </TabsContent>
        <TabsContent value="outsource">
          <SubChildJobWork />
        </TabsContent>
      </Tabs>
    </div>
  );
}
