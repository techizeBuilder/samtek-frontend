import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Layers, Boxes, Settings2 } from 'lucide-react';
import SubChildPartMasterTab from './SubChildPartMasterTab';
import ChildPartMasterTab from './ChildPartMasterTab';
import MachineBOMTab from './MachineBOMTab';
import BOMFieldConfigModal from './BOMFieldConfigModal';

export default function BOMManagement() {
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('rnd', 'bomManagement', 'edit');
  // One global, company-wide config — which Inventory fields show as extra
  // columns/details wherever a raw material line appears (Machine BOM's own
  // extras, Sub Child Part Master's source material, and eventually Child
  // Part's own material list). Lives here, not inside any one tab, so it's
  // reachable no matter which tab is active.
  const [bomFormatOpen, setBomFormatOpen] = useState(false);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> BOM Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Define Sub Child Parts, Child Parts and Bills of Materials — locked BOMs cannot be modified by Production</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setBomFormatOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" /> BOM Format & Modification
          </Button>
        )}
      </div>
      <BOMFieldConfigModal open={bomFormatOpen} onOpenChange={setBomFormatOpen} />

      {/* Sub Child Part Master, Child Part Master, and Machine BOM are all
          standalone — none is scoped to any product-picker state shared
          with anything else (see bom-hierarchy-redesign-2026-09.md). The
          old, per-machine "Child Part / Machine BOM (Legacy)" flow was
          removed once this new hierarchy fully replaced it. */}
      <Tabs defaultValue="sub-child-parts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="sub-child-parts" className="rounded-lg data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <Boxes className="w-4 h-4 mr-2" /> Sub Child Part Master
          </TabsTrigger>
          <TabsTrigger value="child-part-master" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
            <Layers className="w-4 h-4 mr-2" /> Child Part Master
          </TabsTrigger>
          <TabsTrigger value="machine-bom-new" className="rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
            <ClipboardList className="w-4 h-4 mr-2" /> Machine BOM
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="sub-child-parts" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <SubChildPartMasterTab />
          </TabsContent>

          <TabsContent value="child-part-master" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <ChildPartMasterTab />
          </TabsContent>

          <TabsContent value="machine-bom-new" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <MachineBOMTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
