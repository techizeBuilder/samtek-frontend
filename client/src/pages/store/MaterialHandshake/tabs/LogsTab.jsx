import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, FileOutput, ArrowLeftRight } from 'lucide-react';
import StoreTransferLogsTab from './StoreTransferLogsTab';
import MaterialIssueLogsTab from './MaterialIssueLogsTab';
import ReturnedMaterialsTab from './ReturnedMaterialsTab';

export default function LogsTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Historical Logs</h2>
          <p className="text-sm text-slate-500">View logs for store transfers, material issues, and returns.</p>
        </div>
      </div>

      <Tabs defaultValue="store-transfers" className="w-full">
        <TabsList className="bg-slate-100/50 border border-slate-200 h-10 p-1 rounded-lg">
          <TabsTrigger value="store-transfers" className="rounded-md text-sm">
            <Truck className="w-4 h-4 mr-2" />
            Store Transfers
          </TabsTrigger>
          <TabsTrigger value="material-issues" className="rounded-md text-sm">
            <FileOutput className="w-4 h-4 mr-2" />
            Material Issues
          </TabsTrigger>
          <TabsTrigger value="returned-materials" className="rounded-md text-sm">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Returned Materials
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="store-transfers" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreTransferLogsTab />
          </TabsContent>
          
          <TabsContent value="material-issues" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <MaterialIssueLogsTab />
          </TabsContent>
          
          <TabsContent value="returned-materials" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <ReturnedMaterialsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
