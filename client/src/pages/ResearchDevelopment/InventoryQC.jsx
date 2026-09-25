import React from 'react';
import { Package, Layers, Boxes } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import QCChecklistModule from '@/components/qc/QCChecklistModule';
import ChildPartInventoryQC from './ChildPartInventoryQC';
import SubChildPartInventoryQC from './SubChildPartInventoryQC';

// Three tabs: plain Inventory items (module 'inventory', flat single
// checklist, generic QCChecklistModule), Child Part (module 'childPart',
// staged Initial/Process — see ChildPartInventoryQC.jsx), and Sub Child Part
// (module 'subChildPart', flat single checklist — see
// SubChildPartInventoryQC.jsx). Child Part/Sub Child Part each get their own
// dedicated page (not the generic QCChecklistModule) since both also show a
// live Composition reference panel (Sub Child Parts/materials, or the one
// source material — see each file's own comment) that the generic,
// Inventory-shared component shouldn't carry. childPart/subChildPart are
// genuinely independent modules, not borrowed from Product Master QC
// (2026-09-14 rescope — see server/docs/qc-module-restructure-client-request.md).
export default function InventoryQC() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" /> Inventory QC
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Select which QC checks apply to each item, from one shared checklist
        </p>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="child-part" className="rounded-lg data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <Layers className="w-4 h-4 mr-2" /> Child Part
          </TabsTrigger>
          <TabsTrigger value="sub-child-part" className="rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
            <Boxes className="w-4 h-4 mr-2" /> Sub Child Part
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="inventory" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <QCChecklistModule
              module="inventory"
              featureKey="qcInventory"
              title="Inventory QC"
              description="Select which QC checks apply to each inventory item, from one shared checklist"
              icon={Package}
              itemsEndpoint="/api/items?productKind=none&limit=1000"
              embedded
            />
          </TabsContent>
          <TabsContent value="child-part" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <ChildPartInventoryQC />
          </TabsContent>
          <TabsContent value="sub-child-part" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <SubChildPartInventoryQC />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
