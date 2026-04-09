import React, { useState, useEffect } from 'react';
import { Package, Users, Eye, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function ProductionSheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [productionGroups, setProductionGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    console.log('📋 ProductionSheet component mounted');
    fetchProductionData();
  }, []);

  // Fetch production data from API
  const fetchProductionData = async () => {
    console.log('🚀 Fetching production sheet data...');
    setLoading(true);
    try {
      const response = await fetch('/api/production/production-shift', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      console.log('📊 Production sheet data:', data);
      
      if (data.success) {
        setProductionGroups(data.data.groups || []);
        toast({
          title: "Success",
          description: "Production sheet data loaded successfully"
        });
      } else {
        console.error('❌ API error:', data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to fetch production data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Error fetching production data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch production sheet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle view group details
  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setViewModalOpen(true);
  };

  // Calculate efficiency percentage
  const calculateEfficiency = (qtyAchieved, qtyPerBatch) => {
    if (!qtyPerBatch || qtyPerBatch === 0) return 0;
    return Math.round((qtyAchieved / qtyPerBatch) * 100);
  };

  // Get badge variant for efficiency
  const getEfficiencyBadgeVariant = (efficiency) => {
    if (efficiency >= 90) return "default"; // Green
    if (efficiency >= 70) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Sheet</h1>
          <p className="text-gray-600 mt-1">Monitor batch quantities and production achievements</p>
        </div>
        <Button 
          onClick={fetchProductionData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionGroups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty/Batch</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionGroups.reduce((sum, group) => sum + (group.qtyPerBatch || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Achieved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(productionGroups.reduce((sum, group) => sum + (group.qtyAchievedPerBatch || 0), 0).toFixed(2))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalTarget = productionGroups.reduce((sum, group) => sum + (group.qtyPerBatch || 0), 0);
                const totalAchieved = productionGroups.reduce((sum, group) => sum + (group.qtyAchievedPerBatch || 0), 0);
                return totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
              })()}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Production Groups - Batch Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : productionGroups.length > 0 ? (
            <>
              {/* Desktop / tablet: keep table layout */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Items Count</TableHead>
                        <TableHead className="text-center">Qty/Batch</TableHead>
                        <TableHead className="text-center">Qty Achieved/Batch</TableHead>
                        <TableHead className="text-center">Efficiency</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionGroups.map((group) => {
                        const efficiency = calculateEfficiency(group.qtyAchievedPerBatch || 0, group.qtyPerBatch || 0);
                        return (
                          <TableRow key={group._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{group.name}</div>
                                <div className="text-sm text-gray-500">{group.description || 'No description'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {group.items?.length || 0} items
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-semibold text-lg text-blue-600">
                                {group.qtyPerBatch || 0}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-semibold text-lg text-gray-900">
                                {parseFloat((group.qtyAchievedPerBatch || 0).toFixed(2))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={getEfficiencyBadgeVariant(efficiency)}>
                                {efficiency}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={group.isActive ? "default" : "secondary"}>
                                {group.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewGroup(group)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile: stacked cards, no horizontal scroll */}
              <div className="md:hidden space-y-3">
                {productionGroups.map((group) => {
                  const efficiency = calculateEfficiency(group.qtyAchievedPerBatch || 0, group.qtyPerBatch || 0);
                  const itemsCount = group.items?.length || 0;
                  return (
                    <div
                      key={group._id}
                      className="border border-gray-200 rounded-lg bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{group.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {group.description || 'No description'}
                          </div>
                          <div className="mt-1 text-[11px] text-gray-600">
                            {itemsCount} item{itemsCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={getEfficiencyBadgeVariant(efficiency)} className="text-[11px] px-2 py-0.5">
                            {efficiency}% eff.
                          </Badge>
                          <div>
                            <Badge
                              variant={group.isActive ? 'default' : 'secondary'}
                              className="text-[11px] px-2 py-0.5"
                            >
                              {group.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[11px] text-gray-500">Qty/Batch</div>
                          <div className="font-semibold text-blue-600 text-sm">
                            {group.qtyPerBatch || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500">Qty Achieved/Batch</div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {parseFloat((group.qtyAchievedPerBatch || 0).toFixed(2))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleViewGroup(group)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No production groups found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Group Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Production Group Details: {selectedGroup?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-6">
              {/* Group Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Group Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedGroup.name}</div>
                    <div><span className="font-medium">Description:</span> {selectedGroup.description || 'N/A'}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge variant={selectedGroup.isActive ? "default" : "secondary"} className="ml-2">
                        {selectedGroup.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedGroup.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Batch Quantities</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Qty/Batch:</span> 
                      <span className="text-blue-600 font-semibold ml-2 text-lg">
                        {parseFloat((selectedGroup.qtyPerBatch || 0).toFixed(2))}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Qty Achieved/Batch:</span> 
                      <span className="text-gray-900 font-semibold ml-2 text-lg">
                        {parseFloat((selectedGroup.qtyAchievedPerBatch || 0).toFixed(2))}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Efficiency:</span>
                      <Badge 
                        variant={getEfficiencyBadgeVariant(
                          calculateEfficiency(selectedGroup.qtyAchievedPerBatch || 0, selectedGroup.qtyPerBatch || 0)
                        )}
                        className="ml-2"
                      >
                        {calculateEfficiency(selectedGroup.qtyAchievedPerBatch || 0, selectedGroup.qtyPerBatch || 0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {selectedGroup.items && selectedGroup.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Items in this Group ({selectedGroup.items.length})</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Available Qty</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.items.map((item, index) => (
                          <TableRow key={item._id || index}>
                            <TableCell className="font-medium">{item.name || 'N/A'}</TableCell>
                            <TableCell>{item.code || 'N/A'}</TableCell>
                            <TableCell>{item.category || 'N/A'}</TableCell>
                            <TableCell>{item.qty || 0}</TableCell>
                            <TableCell>{item.unit || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}