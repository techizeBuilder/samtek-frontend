import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Save,
  Download,
  Truck,
  Package,
  User,
  Calendar,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DeliveryChallan() {
  const { toast } = useToast();
  
  const [challanData, setChallanData] = useState({
    challanNo: `DC${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    vehicleNo: '',
    driverName: '',
    driverPhone: '',
    items: [],
    remarks: '',
    status: 'pending'
  });

  const [newItem, setNewItem] = useState({
    itemName: '',
    quantity: '',
    unit: '',
    rate: '',
    amount: ''
  });

  // Sample data for demonstration
  const [availableItems] = useState([
    { id: 1, name: 'Milk 500ml', unit: 'Packets', rate: 25 },
    { id: 2, name: 'Bread Loaf', unit: 'Pieces', rate: 35 },
    { id: 3, name: 'Butter 100g', unit: 'Packets', rate: 45 },
    { id: 4, name: 'Cheese 200g', unit: 'Packets', rate: 85 }
  ]);

  const addItem = () => {
    if (!newItem.itemName || !newItem.quantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in item name and quantity",
        variant: "destructive"
      });
      return;
    }

    const item = {
      id: Date.now(),
      ...newItem,
      quantity: parseFloat(newItem.quantity),
      rate: parseFloat(newItem.rate || 0),
      amount: parseFloat(newItem.quantity || 0) * parseFloat(newItem.rate || 0)
    };

    setChallanData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      itemName: '',
      quantity: '',
      unit: '',
      rate: '',
      amount: ''
    });

    toast({
      title: "Item Added",
      description: "Item added to delivery challan successfully"
    });
  };

  const removeItem = (itemId) => {
    setChallanData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const calculateTotal = () => {
    return challanData.items.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const saveChallan = () => {
    if (!challanData.customerName || challanData.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in customer details and add at least one item",
        variant: "destructive"
      });
      return;
    }

    // Simulate saving to backend
    setChallanData(prev => ({ ...prev, status: 'saved' }));
    
    toast({
      title: "Success",
      description: "Delivery challan saved successfully"
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'saved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Saved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Delivery Challan
            </h1>
            <p className="text-gray-600">Create and manage delivery challans</p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(challanData.status)}
            <Button onClick={saveChallan} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Challan
            </Button>
          </div>
        </div>

        {/* Challan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Challan Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="challanNo">Challan No.</Label>
                <Input
                  id="challanNo"
                  value={challanData.challanNo}
                  onChange={(e) => setChallanData(prev => ({ ...prev, challanNo: e.target.value }))}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={challanData.date}
                  onChange={(e) => setChallanData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="vehicleNo">Vehicle Number</Label>
                <Input
                  id="vehicleNo"
                  placeholder="Enter vehicle number"
                  value={challanData.vehicleNo}
                  onChange={(e) => setChallanData(prev => ({ ...prev, vehicleNo: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={challanData.customerName}
                  onChange={(e) => setChallanData(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  placeholder="Enter phone number"
                  value={challanData.customerPhone}
                  onChange={(e) => setChallanData(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                placeholder="Enter customer address"
                value={challanData.customerAddress}
                onChange={(e) => setChallanData(prev => ({ ...prev, customerAddress: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  placeholder="Enter driver name"
                  value={challanData.driverName}
                  onChange={(e) => setChallanData(prev => ({ ...prev, driverName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  placeholder="Enter driver phone"
                  value={challanData.driverPhone}
                  onChange={(e) => setChallanData(prev => ({ ...prev, driverPhone: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="itemName">Item</Label>
                <Select value={newItem.itemName} onValueChange={(value) => {
                  const selectedItem = availableItems.find(item => item.name === value);
                  setNewItem(prev => ({
                    ...prev,
                    itemName: value,
                    unit: selectedItem?.unit || '',
                    rate: selectedItem?.rate.toString() || ''
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map(item => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={newItem.quantity}
                  onChange={(e) => {
                    const quantity = e.target.value;
                    const amount = parseFloat(quantity || 0) * parseFloat(newItem.rate || 0);
                    setNewItem(prev => ({ 
                      ...prev, 
                      quantity,
                      amount: amount.toFixed(2)
                    }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="Unit"
                  value={newItem.unit}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  type="number"
                  placeholder="Rate per unit"
                  value={newItem.rate}
                  onChange={(e) => {
                    const rate = e.target.value;
                    const amount = parseFloat(newItem.quantity || 0) * parseFloat(rate || 0);
                    setNewItem(prev => ({ 
                      ...prev, 
                      rate,
                      amount: amount.toFixed(2)
                    }));
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {challanData.items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No items added yet</p>
                <p className="text-sm text-gray-400">Add items using the form above</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challanData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>₹{item.rate}</TableCell>
                        <TableCell className="font-medium">₹{item.amount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Total */}
                <div className="flex justify-end mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Total Amount: ₹{calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional remarks or notes..."
              value={challanData.remarks}
              onChange={(e) => setChallanData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}