import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  Calendar as CalendarIcon,
  BarChart3
} from 'lucide-react';

// Dummy data for Dispatch Module Dashboard (Prototype)
const dispatchStats = {
  todayDispatches: 85,
  todayTarget: 100,
  activeVehicles: 24,
  totalVehicles: 30,
  onTimeDeliveries: 94.2,
  avgDeliveryTime: 2.8,
  pendingPickups: 12,
  completedDeliveries: 73
};

const dispatchData = [
  { group: "Milk 400", fromPacking: 448, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Milk 400", fromPacking: 100, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Milk 400", fromPacking: 100, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Milk 400", fromPacking: 100, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Sandwich", fromPacking: 100, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Sandwich", fromPacking: 48, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Burger 200", fromPacking: 180, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "Pizza 7", fromPacking: 120, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "buns", fromPacking: 150, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" },
  { group: "cakes", fromPacking: 120, yesterdayClosing: "", yesterdayReturn: "", totalForDispatch: "", totalIndent: "", excessQty: "", dispatchedQty: "", pendingDispatch: "", leftOver: "", closingStock: "", manualStock: "" }
];

export default function Dispatches() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="p-6 space-y-6">
      {/* Header with Date Selection */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispatch Dashboard</h1>
          <p className="text-gray-600">This is a prototype for Dispatch Module dashboard</p>
        </div>
        
        {/* Date Selection */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, 'dd-MM-yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Explanation Row */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Data Flow Explanation:</strong></p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3 rounded border">
                <strong>From Packing:</strong><br/>
                Data from Unit Manager portal / Indent Summary
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Yesterday Data:</strong><br/>
                Derives from Unit Manager Inventory Module
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Total Indent:</strong><br/>
                From Unit Manager Inventory Module
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Manual Entry:</strong><br/>
                Updated by unit manager on dispatch completion
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Dispatches</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchStats.todayDispatches}</div>
            <div className="text-xs text-muted-foreground">
              Target: {dispatchStats.todayTarget}
            </div>
            <Progress value={(dispatchStats.todayDispatches / dispatchStats.todayTarget) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchStats.activeVehicles}</div>
            <div className="text-xs text-muted-foreground">
              of {dispatchStats.totalVehicles} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchStats.onTimeDeliveries}%</div>
            <div className="text-xs text-muted-foreground">
              Avg: {dispatchStats.avgDeliveryTime}hrs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchStats.pendingPickups}</div>
            <div className="text-xs text-muted-foreground">
              Completed: {dispatchStats.completedDeliveries}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dispatch Console
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
              <th className="p-3 text-left font-semibold border border-gray-300 bg-blue-100">
  Product Group
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-green-100">
  Packed Quantity
  <br />
  <span className="text-xs font-normal">Ready for Dispatch</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-orange-100">
  Previous Closing Stock
  <br />
  <span className="text-xs font-normal">Yesterday Balance</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-red-100">
  Return Quantity
  <br />
  <span className="text-xs font-normal">Yesterday Returns</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-purple-100">
  Total Available Stock
  <br />
  <span className="text-xs font-normal">Packing + Closing + Returns</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-yellow-100">
  Total Indent Quantity
  <br />
  <span className="text-xs font-normal">Orders for the Day</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-indigo-100">
  Excess / Shortage
  <br />
  <span className="text-xs font-normal">Available − Indent</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-green-200">
  Dispatched Quantity
  <br />
  <span className="text-xs font-normal">Sent Today</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-blue-200">
  Pending Dispatch
  <br />
  <span className="text-xs font-normal">Yet to Dispatch</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-orange-200">
  Leftover Stock
  <br />
  <span className="text-xs font-normal">After Dispatch</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-gray-200">
  Closing Stock
  <br />
  <span className="text-xs font-normal">End of Day Balance</span>
</th>

<th className="p-3 text-center font-semibold border border-gray-300 bg-pink-100">
  Physical Stock Entry
  <br />
  <span className="text-xs font-normal">Manual Verification</span>
</th>
 
               </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 border border-gray-300">Dispatch Console Totals</td>
                  <td className="p-3 border border-gray-300 text-center">1466</td>
                  <td className="p-3 border border-gray-300 text-center">0</td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                  <td className="p-3 border border-gray-300 text-center"></td>
                </tr>
                {dispatchData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 border border-gray-300 font-medium">{item.group}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.fromPacking}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.yesterdayClosing}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.yesterdayReturn}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.totalForDispatch}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.totalIndent}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.excessQty}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.dispatchedQty}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.pendingDispatch || ""}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.leftOver}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.closingStock || ""}</td>
                    <td className="p-3 border border-gray-300 text-center">{item.manualStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 text-center">
            <strong>Note:</strong> This is a prototype Dispatch Module dashboard. 
            All data shown is dummy data for demonstration purposes only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
