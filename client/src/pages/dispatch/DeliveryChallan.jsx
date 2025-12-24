import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DeliveryChallan() {
  // Sample data for dropdowns
  const [customers] = useState([
    'ABC Retail Store',
    'XYZ Supermarket', 
    'Quick Mart',
    'Daily Needs Store'
  ]);

  const [salesmen] = useState([
    'Rajesh Kumar',
    'Priya Sharma',
    'Amit Singh', 
    'Neha Gupta'
  ]);

  // Sample dispatch entry data (matching your image)
  const [dispatchData] = useState([
    { productGroup: 'Milk 400', indentQty: 20, qtyIssued: 20 },
    { productGroup: 'Milk 400', indentQty: 40, qtyIssued: 40 },
    { productGroup: 'Milk 400', indentQty: 0, qtyIssued: 0 },
    { productGroup: 'Milk 400', indentQty: 30, qtyIssued: 30 },
    { productGroup: 'Sandwich', indentQty: 30, qtyIssued: 30 },
    { productGroup: 'Sandwich', indentQty: 20, qtyIssued: 20 },
    { productGroup: 'Burger 200g', indentQty: 20, qtyIssued: 20 },
    { productGroup: 'Pizza 7', indentQty: 20, qtyIssued: 20 },
    { productGroup: 'buns', indentQty: 20, qtyIssued: 20 },
    { productGroup: 'cakes', indentQty: 20, qtyIssued: 20 }
  ]);

  const [formData, setFormData] = useState({
    manualEntryNo: '',
    customerName: '',
    salesmanName: '',
    dcNo: '',
    to: '',
    by: ''
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Main Table Structure */}
      <div className="border border-gray-800">
        
        {/* First Row - Manual Entry Section */}
        <div className="grid grid-cols-5 border-b border-gray-800">
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm">
              Manual Entry with successful No.
            </div>
            <Input
              className="mt-2"
              placeholder="Enter entry number"
              value={formData.manualEntryNo}
              onChange={(e) => setFormData(prev => ({ ...prev, manualEntryNo: e.target.value }))}
            />
          </div>
          
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Customer Name by dropdown
            </div>
            <Select value={formData.customerName} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, customerName: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer, index) => (
                  <SelectItem key={index} value={customer}>
                    {customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Salesman Name by Dropdown
            </div>
            <Select value={formData.salesmanName} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, salesmanName: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select Salesman" />
              </SelectTrigger>
              <SelectContent>
                {salesmen.map((salesman, index) => (
                  <SelectItem key={index} value={salesman}>
                    {salesman}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              give button Option
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
              Give Button Option
            </Button>
          </div>

          <div className="p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              give button Option
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-sm">
              Give Button Option
            </Button>
          </div>
        </div>

        {/* Second Row - DC Details */}
        <div className="grid grid-cols-5 border-b border-gray-800">
          <div className="border-r border-gray-800 p-3">
            <div className="text-center font-medium text-sm mb-2">DC No.</div>
            <Input
              placeholder="Enter DC Number"
              value={formData.dcNo}
              onChange={(e) => setFormData(prev => ({ ...prev, dcNo: e.target.value }))}
            />
          </div>
          
          <div className="border-r border-gray-800 p-3">
            <div className="text-center font-medium text-sm mb-2">TO</div>
            <Input
              placeholder="Enter destination"
              value={formData.to}
              onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>

          <div className="border-r border-gray-800 p-3">
            <div className="text-center font-medium text-sm mb-2">By</div>
            <Input
              placeholder="Enter by whom"
              value={formData.by}
              onChange={(e) => setFormData(prev => ({ ...prev, by: e.target.value }))}
            />
          </div>

          <div className="border-r border-gray-800 p-3">
            <div className="text-center font-medium text-sm mb-2">Deduct from Inventory</div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-sm">
              Deduct from Inventory
            </Button>
          </div>

          <div className="p-3">
            <div className="text-center font-medium text-sm mb-2">Convert this to Invoice</div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-sm">
              Convert this to Invoice
            </Button>
          </div>
        </div>

        {/* Third Row - Dispatch Entry */}
        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="border-r border-gray-800 p-4">
            <div className="text-center">
              <div className="font-medium mb-2">Dispatch Entry</div>
              <div className="text-sm text-gray-600">Data from Indent Module</div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-100">
            <div className="text-center">
              <div className="font-medium mb-2">Manual entry by unit Manager</div>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-3 bg-yellow-300 border-b border-gray-800">
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Product / Product Group
            </div>
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Indent Qty
            </div>
            <div className="p-3 text-center font-medium">
              Qty issued
            </div>
          </div>

          {/* Table Rows */}
          {dispatchData.map((item, index) => (
            <div key={index} className="grid grid-cols-3 border-b border-gray-800">
              <div className="border-r border-gray-800 p-3">{item.productGroup}</div>
              <div className="border-r border-gray-800 p-3 text-center">{item.indentQty}</div>
              <div className="p-3 text-center">{item.qtyIssued}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}