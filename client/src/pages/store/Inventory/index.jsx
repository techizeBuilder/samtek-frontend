import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Package, Cog } from 'lucide-react';
import InventoryTab from './tabs/InventoryTab';
import ProductMasterTab from './tabs/ProductMasterTab';
import MotorMasterTab from './tabs/MotorMasterTab';

// Store's Inventory tracks raw material stock only (Item.productKind:null) —
// Product Master machines and Motor Master motors live in the same Item
// collection but are owned/edited by R&D. These two tabs give Store
// read-only visibility into that data (e.g. to know what finished
// goods/motors exist) without granting create/edit/discontinue access.
export default function StoreInventory() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
            <Warehouse className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="product-master" className="rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" />
            Product Master
          </TabsTrigger>
          <TabsTrigger value="motor-master" className="rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">
            <Cog className="w-4 h-4 mr-2" />
            Motor Master
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="inventory" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <InventoryTab />
          </TabsContent>

          <TabsContent value="product-master" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <ProductMasterTab />
          </TabsContent>

          <TabsContent value="motor-master" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <MotorMasterTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
