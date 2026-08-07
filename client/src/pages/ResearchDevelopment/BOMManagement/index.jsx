import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Layers, ChevronDown } from 'lucide-react';
import ChildPartCreationTab from './ChildPartCreationTab';
import BOMCreationTab from './BOMCreationTab';

// Child Part Creation and BOM Creation both start from the same step —
// pick a manufacturing product — so that selector lives here once, shared
// by both tabs, instead of being asked for twice.
const MANUFACTURING_SOURCE_TYPES = ['In House Manufacturing', 'Out Source Manufactured'];

export default function BOMManagement() {
  const { machines } = useRD();
  const [selectedProductId, setSelectedProductId] = useState('');

  const manufacturingProducts = machines.filter(m => !m.isDiscontinued && MANUFACTURING_SOURCE_TYPES.includes(m.pSourceType));
  const selectedProduct = manufacturingProducts.find(m => String(m._id) === selectedProductId);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" /> BOM Management
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Define Child Parts and Bills of Materials for manufacturing products — locked BOMs cannot be modified by Production</p>
      </div>

      {/* Shared Product Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Product <span className="text-xs text-slate-400 font-normal">(Manufacturing only)</span></label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
            >
              <option value="">-- Select a product --</option>
              {manufacturingProducts.map(m => (
                <option key={m._id} value={m._id}>{m.code} — {m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedProductId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a manufacturing product to create its Child Parts or manage its BOM</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="child-parts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="child-parts" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 mr-2" /> Child Part Creation
            </TabsTrigger>
            <TabsTrigger value="bom-creation" className="rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
              <ClipboardList className="w-4 h-4 mr-2" /> BOM Creation
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="child-parts" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <ChildPartCreationTab product={selectedProduct} />
            </TabsContent>
            <TabsContent value="bom-creation" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <BOMCreationTab product={selectedProduct} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
