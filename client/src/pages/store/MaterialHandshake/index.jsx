import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Handshake, ArrowRightLeft, History, Package, Truck } from 'lucide-react';
import PendingRequestsTab from './tabs/PendingRequestsTab';
import PendingReturnsTab from './tabs/PendingReturnsTab';
import LogsTab from './tabs/LogsTab';
import OutsourceToDispatchTab from './tabs/OutsourceToDispatchTab';

// Material transfers only. Outsourced work coming back is received on its own
// page, Store → Outsource Receive (2026-10-21, was the "From Outsource" tab).

export default function MaterialHandshake() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Handshake className="h-8 w-8 text-blue-600" />
          Production Material Handshake
        </h1>
        <p className="text-slate-500 mt-1">
          Manage material transfers, returns, and track logs between the Store and Production.
        </p>
      </div>

      <Tabs defaultValue="pending-transfers" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-4xl bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="pending-transfers" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" />
            Pending Transfers
          </TabsTrigger>
          <TabsTrigger value="pending-returns" className="rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Pending Returns
          </TabsTrigger>
          <TabsTrigger value="to-dispatch" className="rounded-lg data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
            <Truck className="w-4 h-4 mr-2" />
            To Dispatch (Outsource)
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
            <History className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="pending-transfers" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <PendingRequestsTab />
          </TabsContent>

          <TabsContent value="pending-returns" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <PendingReturnsTab />
          </TabsContent>

          <TabsContent value="to-dispatch" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <OutsourceToDispatchTab />
          </TabsContent>

          <TabsContent value="logs" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <LogsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
