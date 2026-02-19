import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Eye, TrendingDown, RotateCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const Purchases = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingToPurchase, setIsAddingToPurchase] = useState(false);
  const { toast } = useToast();

  // Fetch purchase items from API
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/accounts/purchases/items', searchTerm, selectedType, currentPage, limit],
    queryFn: () => apiRequest('GET', `/api/accounts/purchases/items?search=${searchTerm}&type=${selectedType}&skip=${(currentPage - 1) * limit}&limit=${limit}`),
    retry: 1,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase items",
        variant: "destructive"
      });
    }
  });

  const items = response?.data?.items || [];
  const pagination = response?.data?.pagination || {};
  const itemTypes = ['', 'Material', 'Spares', 'Assemblies'];

  const totalItems = pagination.total || 0;
  const totalValue = items.reduce((sum, item) => sum + (item.purchaseCost * item.currentQty), 0);
  const lowStockItems = items.filter(item => item.currentQty < item.minStock).length;

  const getTypeColor = (type) => {
    switch (type) {
      case 'Material': return 'bg-blue-100 text-blue-800';
      case 'Spares': return 'bg-orange-100 text-orange-800';
      case 'Assemblies': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle View Item Details
  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  // Handle Add to Purchase
  const handleAddToPurchase = (item) => {
    setSelectedItem(item);
    setPurchaseQuantity(1);
    setShowAddModal(true);
  };

  // Confirm Add to Purchase
  const handleConfirmAddPurchase = async () => {
    if (!selectedItem || purchaseQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    // TODO: Create purchase order logic
    // For now, just show success message
    setIsAddingToPurchase(true);
    try {
      // This would typically call an API to create a purchase order draft
      toast({
        title: "Success",
        description: `Added ${purchaseQuantity} unit(s) of ${selectedItem.name} to purchase order`,
        variant: "default"
      });
      setShowAddModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to purchase",
        variant: "destructive"
      });
    } finally {
      setIsAddingToPurchase(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="shadow-lg border-0">
          <CardContent className="p-8 text-center">
            <div className="animate-spin inline-block mb-4">
              <RotateCw className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-gray-600">Loading purchase items...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="shadow-lg border-0 bg-red-50">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">❌ Failed to load purchase items</p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="bg-red-600 text-white hover:bg-red-700">
              <RotateCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Purchases Management</h1>
            <p className="text-gray-600 mt-2">Select items to create purchase orders</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <Search className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalValue / 100000).toFixed(2)}L</p>
                </div>
                <TrendingDown className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Item Types</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <TrendingDown className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by item name or code..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {itemTypes.map(type => (
                  <Button
                    key={type || 'all'}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedType(type);
                      setCurrentPage(1);
                    }}
                    className={selectedType === type ? "bg-gradient-to-r from-orange-600 to-red-600" : ""}
                  >
                    {type || 'All Types'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Purchase Items ({items.length})</CardTitle>
            <CardDescription>Available items for purchase orders</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 text-lg">No items found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 hover:bg-slate-100">
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Item Code</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Item Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Current Qty</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Purchase Cost</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Min Stock</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item._id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-gray-900">{item.code}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-600">{item.category}</td>
                        <td className="px-6 py-4">
                          <Badge className={getTypeColor(item.type)}>{item.type}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {item.currentQty}
                          {item.currentQty < item.minStock && (
                            <span className="ml-2 text-red-600 font-bold">⚠️</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{item.unit}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          ₹{item.purchaseCost.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{item.minStock}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => handleViewItem(item)}
                              title="View item details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleAddToPurchase(item)}
                              title="Add to purchase order"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.hasMore || currentPage > 1 ? (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasMore}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* View Item Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>Complete information about the selected item</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Item Code</p>
                  <p className="font-semibold text-gray-900 font-mono">{selectedItem.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Item Name</p>
                  <p className="font-semibold text-gray-900">{selectedItem.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Type</p>
                  <Badge className={getTypeColor(selectedItem.type)}>{selectedItem.type}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Current Qty</p>
                  <p className="font-semibold text-gray-900">{selectedItem.currentQty} {selectedItem.unit}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Min Stock</p>
                  <p className="font-semibold text-gray-900">{selectedItem.minStock}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Purchase Cost</p>
                  <p className="font-semibold text-gray-900">₹{selectedItem.purchaseCost.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Std Cost</p>
                  <p className="font-semibold text-gray-900">₹{selectedItem.stdCost.toLocaleString('en-IN')}</p>
                </div>
                {selectedItem.gst > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">GST Rate</p>
                    <p className="font-semibold text-gray-900">{selectedItem.gst}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Purchase Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Purchase Order</DialogTitle>
            <DialogDescription>Enter quantity to create a new purchase order</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Item: {selectedItem.name}</p>
                <p className="text-xs text-gray-600">Code: {selectedItem.code}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Purchase Cost: ₹{selectedItem.purchaseCost.toLocaleString('en-IN')} per {selectedItem.unit}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity to Purchase</label>
                <Input 
                  type="number" 
                  min="1" 
                  max="10000"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                  placeholder="Enter quantity"
                  className="h-10"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Estimated Total:</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{(selectedItem.purchaseCost * purchaseQuantity).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleConfirmAddPurchase}
              disabled={isAddingToPurchase}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAddingToPurchase ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Purchase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
