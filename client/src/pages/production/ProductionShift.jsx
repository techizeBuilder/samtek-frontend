import React, { useState, useEffect } from 'react';
import { Clock, Package, Users, Eye, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function ProductionShift() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [productionGroups, setProductionGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState({});
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [ungroupedItems, setUngroupedItems] = useState([]);
  const [ungroupedLoading, setUngroupedLoading] = useState(false);
  const [ungroupedBatchData, setUngroupedBatchData] = useState({});

  useEffect(() => {
    console.log('🎯 ProductionShift component mounted, calling fetchProductionShiftData');
    fetchProductionShiftData();
  }, []);

  // Fetch production groups with shift data
  const fetchProductionShiftData = async () => {
    console.log('🚀 Starting fetchProductionShiftData...');
    setLoading(true);
    try {
      console.log('📡 Making API call to /api/production/production-shift');
      const response = await fetch('/api/production/production-shift', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.success) {
        console.log('✅ API call successful, setting production groups:', data.data.groups);
        setProductionGroups(data.data.groups);
        
        // Set ungrouped items from the same API response
        if (data.data.ungroupedItems) {
          console.log('✅ Setting ungrouped items:', data.data.ungroupedItems.length, 'items');
          setUngroupedItems(data.data.ungroupedItems);
          
          // Initialize ungrouped batch data
          const ungroupedBatchData = {};
          data.data.ungroupedItems.forEach(item => {
            const itemKey = `ungrouped_${item._id}`;
            ungroupedBatchData[itemKey] = {
              mouldingTime: item.mouldingTime || '',
              unloadingTime: item.unloadingTime || '',
              productionLoss: item.productionLoss || '',
              qtyAchieved: Math.max(0, (item.qtyPerBatch || 0) - (item.productionLoss || 0))
            };
          });
          setUngroupedBatchData(ungroupedBatchData);
        } else {
          console.log('ℹ️ No ungrouped items in response');
          setUngroupedItems([]);
          setUngroupedBatchData({});
        }
        
        // Initialize batch data with proper values from database
        const initialBatchData = {};
        data.data.groups.forEach(group => {
          const batchCount = group.noOfBatchesForProduction || 1;
          
          console.log('🔍 Initializing group data:', {
            name: group.name,
            batchCount: batchCount,
            batchData: group.batchData
          });
          
          // Create batch data for each individual batch
          for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
            const batchKey = `${group._id}_batch_${batchIndex + 1}`;
            
            // Get the actual item for this batch to find its batchNo
            const item = group.items && group.items[batchIndex] ? group.items[batchIndex] : null;
            const itemBatchNo = item?.batchNo;
            
            // Get individual batch data from API response using actual batchNo
            const batchFromAPI = (itemBatchNo && group.batchData?.[itemBatchNo]) ? group.batchData[itemBatchNo] : {};
            
            console.log('🔍 Mapping batch data:', {
              batchKey,
              itemBatchNo,
              batchFromAPI
            });
            
            initialBatchData[batchKey] = {
              productGroup: group.name,
              batchNumber: batchIndex + 1,
              totalBatches: batchCount,
              // Use individual batch timing data if available, otherwise empty
              mouldingTime: batchFromAPI.mouldingTime || '',
              unloadingTime: batchFromAPI.unloadingTime || '',
              productionLoss: batchFromAPI.productionLoss !== undefined ? batchFromAPI.productionLoss : '',
              qtyBatch: group.qtyPerBatch || 0,
              qtyAchieved: batchFromAPI.qtyAchieved !== undefined ? batchFromAPI.qtyAchieved : Math.max(0, (group.qtyPerBatch || 0) - (batchFromAPI.productionLoss || 0))
            };
          }
        });
        
        console.log('📊 Final initialized batch data:', initialBatchData);
        setBatchData(initialBatchData);

      } else {
        console.error('❌ API call failed:', data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to fetch production data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Error fetching production shift data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch production shift data",
        variant: "destructive"
      });
    } finally {
      console.log('🏁 fetchProductionShiftData completed');
      setLoading(false);
    }
  };





  // Handle batch data changes with auto-save
  const handleBatchDataChange = async (batchKey, field, value) => {
    // Update local state immediately
    setBatchData(prev => ({
      ...prev,
      [batchKey]: {
        ...prev[batchKey],
        [field]: value
      }
    }));

    // Auto-save to API
    await handleAutoSave(batchKey, field, value);
  };

  // Handle ungrouped batch data changes (save to API)
  const handleUngroupedBatchDataChange = async (itemKey, field, value) => {
    // Update local state immediately for better UX
    setUngroupedBatchData(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value
      }
    }));

    try {
      // Extract the full item ID from key (includes batch info like _batch_1)
      const fullItemId = itemKey.replace('ungrouped_', '');
      
      // Extract original item ID (remove _batch_X suffix if present)
      let originalItemId = fullItemId;
      if (fullItemId.includes('_batch_')) {
        originalItemId = fullItemId.split('_batch_')[0];
      }
      
      // Find the item to get the batchNo - MUST match by full _id (with batch suffix)
      const item = ungroupedItems.find(item => item._id === fullItemId);
      
      const batchNo = item?.batchNo;
      
      console.log(`🔄 Saving ungrouped item ${field}:`, { 
        itemKey, 
        fullItemId, 
        originalItemId, 
        foundItem: !!item,
        batchNo,
        field, 
        value,
        itemData: {
          id: fullItemId,
          hasOriginalId: fullItemId.includes('_batch_'),
          willSend: originalItemId,
          batchNo: batchNo,
          totalUngroupedItems: ungroupedItems.length
        }
      });
      
      // DEBUGGING: Log all items to check if we have the right data
      console.log('🔍 DEBUG: All ungrouped items:', ungroupedItems.map(i => ({
        id: i._id,
        batchNo: i.batchNo,
        name: i.name
      })));
      
      console.log('🔍 DEBUG: Looking for item with _id:', fullItemId);
      console.log('🔍 DEBUG: Found item:', item);
      
      if (!item) {
        console.error('❌ CRITICAL: Item not found in ungroupedItems array!');
        console.error('Available items:', ungroupedItems.map(i => i._id));
        return;
      }
      
      if (!batchNo) {
        console.error('❌ CRITICAL: batchNo is missing from item!');
        console.error('Item data:', item);
        return;
      }
      
      const requestPayload = {
        _id: originalItemId,  // Use original item ID without batch suffix
        field,
        value
      };
      
      // Include batchno if available (CRITICAL for separate database entries)
      if (batchNo) {
        requestPayload.batchno = batchNo;
        console.log(`🏷️ Including batchno in request: ${batchNo}`);
      }
      
      const response = await fetch('/api/production/ungrouped-items/production', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully saved ${field}:`, result.data);
        toast({
          title: "Saved",
          description: result.message,
          duration: 2000
        });
        
        // Update local state with server response
        setUngroupedBatchData(prev => ({
          ...prev,
          [itemKey]: {
            ...prev[itemKey],
            [field]: result.data[field],
            qtyAchieved: result.data.qtyAchieved,
            status: result.data.status
          }
        }));
      } else {
        console.error(`❌ Failed to save ${field}:`, result.message);
        toast({
          title: "Save failed",
          description: result.message || `Failed to update ${field}`,
          variant: "destructive",
          duration: 3000
        });
        
        // Revert local state on error
        await fetchProductionShiftData();
      }
    } catch (error) {
      console.error(`❌ Error saving ${field}:`, error);
      toast({
        title: "Save error",
        description: `Failed to save ${field}: ${error.message}`,
        variant: "destructive",
        duration: 3000
      });
      
      // Revert local state on error
      await fetchProductionShiftData();
    }
  };

  // Auto-save function - calls API when field changes
  const handleAutoSave = async (batchKey, field, value) => {
    try {
      console.log(`🔄 Auto-saving ${field} for batch ${batchKey}:`, value);
      
      // Find the item data from the batchKey
      // batchKey format: "${group._id}_batch_${batchIndex + 1}"
      const batchKeyParts = batchKey.split('_batch_');
      if (batchKeyParts.length !== 2) {
        console.error('❌ Invalid batchKey format:', batchKey);
        return;
      }
      
      const groupId = batchKeyParts[0];
      const batchIndex = parseInt(batchKeyParts[1]) - 1; // Convert to 0-based index
      
      // Find the group and item
      const group = productionGroups.find(g => g._id === groupId);
      if (!group || !group.items || !group.items[batchIndex]) {
        console.error('❌ Could not find item for batchKey:', batchKey);
        return;
      }
      
      const item = group.items[batchIndex];
      console.log('📦 Found item:', { _id: item._id, batchNo: item.batchNo });
      
      let processedValue = value;
      
      // Convert datetime strings to proper ISO format
      if (field === 'mouldingTime' || field === 'unloadingTime') {
        if (value && value.trim() !== '') {
          // datetime-local input gives us format: "2024-11-28T14:30"
          processedValue = new Date(value).toISOString();
          console.log(`🕐 Converted datetime ${value} to ISO: ${processedValue}`);
        } else {
          processedValue = null;
          console.log(`🕐 Setting ${field} to null (empty datetime)`);
        }
      }
      
      const updateData = {
        _id: item._id,        // Item ID
        batchno: item.batchNo, // Item batch number like "BATNO01"
        field: field,
        value: processedValue
      };

      console.log('📤 Sending unified production API request:', updateData);
      const response = await fetch('/api/production/ungrouped-items/production', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      console.log('✅ Unified Production API Response:', result);

      if (result.success) {
        console.log(`✅ Successfully auto-saved ${field}`);
        
        // Update local batchData state immediately with the response
        setBatchData(prev => ({
          ...prev,
          [batchKey]: {
            ...prev[batchKey],
            [field]: processedValue
          }
        }));
        
        toast({
          title: "Auto-saved",
          description: `${field} updated successfully`,
          duration: 2000
        });
        
        // Refetch the production shift data to get updated values
        console.log('🔄 Refetching production shift data after successful update...');
        await fetchProductionShiftData();
      } else {
        console.error('❌ Auto-save failed:', result.message);
        toast({
          title: "Auto-save failed",
          description: result.message || `Failed to update ${field}`,
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error(`❌ Auto-save error for ${field}:`, error);
      toast({
        title: "Auto-save error",
        description: `Failed to auto-save ${field}: ${error.message}`,
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Save all changes
  const handleSaveAllChanges = async () => {
    try {
      // In a real implementation, you would send the batchData to the API
      // For now, we'll just show a success message
      toast({
        title: "Success",
        description: "All production shift data saved successfully",
      });
    } catch (error) {
      console.error('Error saving production shift data:', error);
      toast({
        title: "Error",
        description: "Failed to save production shift data",
        variant: "destructive"
      });
    }
  };

  // View batch details
  // View batch details - Updated to show entire group details
  const handleViewBatch = (group, item, batchKey) => {
    const batch = batchData[batchKey] || {};
    setSelectedBatch({
      batchNo: productionGroups.findIndex(g => g._id === group._id) + 1,
      productGroup: group.name,
      group: group, // Pass entire group to show all items
      mouldingTime: batch.mouldingTime || '00:00',
      unloadingTime: batch.unloadingTime || '00:00',
      productionLoss: batch.productionLoss || 0,
      totalQty: group.qtyPerBatch || 0, // Use qtyPerBatch from ProductionGroup model
      qtyAchieved: Math.max(0, (group.qtyPerBatch || 0) - (batch.productionLoss || 0)), // Auto-calculated: Qty/Batch - Production Loss
      totalItems: group.totalItems,
      description: group.description || 'No description',
      createdBy: group.createdBy,
      createdAt: group.createdAt
    });
    setViewModalOpen(true);
  };

  // Delete batch
  const handleDeleteBatch = (batchKey) => {
    if (confirm('Are you sure you want to delete this batch?')) {
      setBatchData(prev => {
        const newData = { ...prev };
        delete newData[batchKey];
        return newData;
      });
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
    }
  };

  // Render batch rows - MULTIPLE ROWS PER GROUP based on noOfBatchesForProduction
  const renderBatchRows = (group, groupIndex) => {
    const batchCount = group.noOfBatchesForProduction || 1; // Default to 1 if no batch count specified
    const rows = [];

    // Create multiple batch rows based on noOfBatchesForProduction
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const batchKey = `${group._id}_batch_${batchIndex + 1}`;
      const batch = batchData[batchKey] || {};
      const batchNumber = (groupIndex * batchCount) + (batchIndex + 1); // Sequential batch numbering across all groups
      
      // Get the corresponding item from group.items array for this batch
      const item = group.items && group.items[batchIndex] ? group.items[batchIndex] : null;
      const displayBatchNo = item?.batchNo || `BATNO${batchNumber.toString().padStart(2, '0')}`;

      rows.push(
        <TableRow key={batchKey}>
          <TableCell className="text-center">{displayBatchNo}</TableCell>
          
          {/* Product Group - Simple text, not editable */}
          <TableCell>
            {group.name}
            {batchCount > 1 && (
              <div className="text-xs text-gray-500">Batch {batchIndex + 1} of {batchCount}</div>
            )}
          </TableCell>
        
        {/* Moulding Time - Punch In/Out System */}
        <TableCell>
          {!batch.mouldingTime ? (
            <Button
              onClick={() => {
                const now = new Date();
                handleBatchDataChange(batchKey, 'mouldingTime', now.toISOString());
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
            >
              Start Moulding
            </Button>
          ) : (
            <div className="text-center">
              <div className="p-3 bg-green-50 rounded-lg border">
                <div className="text-sm font-medium text-green-700">Started</div>
                <div className="text-xs text-gray-600">
                  {new Date(batch.mouldingTime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at{' '}
                  {new Date(batch.mouldingTime).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}
                </div>
              </div>
            </div>
          )}
        </TableCell>
        
        {/* Unloading Time - Punch In/Out System */}
        <TableCell>
          {!batch.unloadingTime ? (
            <Button
              onClick={() => {
                const now = new Date();
                handleBatchDataChange(batchKey, 'unloadingTime', now.toISOString());
              }}
              disabled={!batch.mouldingTime}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500 h-10"
              title={!batch.mouldingTime ? "Please start moulding first" : "Click to end and record current time"}
            >
              End Moulding
            </Button>
          ) : (
            <div className="text-center">
              <div className="p-3 bg-blue-50 rounded-lg border">
                <div className="text-sm font-medium text-blue-700">Ended</div>
                <div className="text-xs text-gray-600">
                  {new Date(batch.unloadingTime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at{' '}
                  {new Date(batch.unloadingTime).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}
                </div>
              </div>
            </div>
          )}
        </TableCell>
        
        {/* Production Loss */}
        <TableCell>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter loss amount"
            value={batch.productionLoss !== undefined && batch.productionLoss !== null ? batch.productionLoss : ''}
            disabled={!batch.mouldingTime || !batch.unloadingTime}
            onChange={(e) => {
              // Update local state immediately for typing
              const value = e.target.value;
              setBatchData(prev => ({
                ...prev,
                [batchKey]: {
                  ...prev[batchKey],
                  productionLoss: value === '' ? '' : parseFloat(value) || 0
                }
              }));
            }}
            onBlur={(e) => {
              // Save to API when done editing
              const value = e.target.value;
              handleBatchDataChange(batchKey, 'productionLoss', value === '' ? 0 : parseFloat(value) || 0);
            }}
            className={`w-24 ${!batch.mouldingTime || !batch.unloadingTime ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            title={!batch.mouldingTime || !batch.unloadingTime ? "Please enter both Moulding Time and Unloading Time first" : "Enter production loss"}
          />
        </TableCell>
        
        {/* Qty/Batch for group - Use qtyPerBatch from ProductionGroup model */}
        <TableCell className="text-center">
          <div className="font-medium text-blue-600 text-lg">
            {group.qtyPerBatch || 0}
          </div>
        </TableCell>
        
        {/* Qty Achieved/Batch (auto-calculated) - Qty/Batch minus Production Loss */}
        <TableCell className="text-center">
          <span className="text-green-600 font-medium text-lg">
            {Math.max(0, (group.qtyPerBatch || 0) - (batch.productionLoss || 0))}
          </span>
          <div className="text-xs text-gray-500">
            {group.qtyPerBatch || 0} - {batch.productionLoss || 0}
          </div>
        </TableCell>
        
          {/* Actions */}
          <TableCell>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewBatch(group, null, batchKey)}
                title="View Group Details"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBatch(batchKey)}
                title="Delete Batch"
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button> */}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return rows;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header - WITH ADD NEW BATCH BUTTON */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Sheet Management</h1>
          <p className="text-gray-600">Manage production shift timings and batch performance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionGroups.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionGroups.reduce((sum, group) => sum + group.totalItems, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batch Quantity</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionGroups.reduce((sum, group) => sum + (group.totalBatchQuantity || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all qtyPerBatch values
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionGroups.reduce((sum, group) => sum + group.items.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Shift Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Production Sheet Data ({productionGroups.reduce((total, group) => total + (group.noOfBatchesForProduction || 1), 0)} Batches)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading production data...</div>
          ) : productionGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No production groups found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Batch No.</TableHead>
                    <TableHead>Product Group</TableHead>
                    <TableHead>Moulding Time</TableHead>
                    <TableHead>Unloading Time</TableHead>
                    <TableHead>Production Loss</TableHead>
                    <TableHead>Qty/Batch</TableHead>
                    <TableHead className="text-green-700">Qty Achieved/Batch (auto)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionGroups.map((group, groupIndex) => (
                    <React.Fragment key={group._id}>
                      {/* Batch Rows - Clean simple layout */}
                      {renderBatchRows(group, groupIndex)}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ungrouped Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ungrouped Items ({ungroupedItems.length} Items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ungroupedLoading ? (
            <div className="text-center py-8">Loading ungrouped items...</div>
          ) : ungroupedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No ungrouped items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Batch No.</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Moulding Time</TableHead>
                    <TableHead>Unloading Time</TableHead>
                    <TableHead>Production Loss</TableHead>
                    <TableHead>Qty/Batch</TableHead>
                    <TableHead className="text-green-700">Qty Achieved/Batch (auto)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ungroupedItems.map((item, index) => {
                    const itemKey = `ungrouped_${item._id}`;
                    const batch = ungroupedBatchData[itemKey] || {};
                    
                    // Debug logging to see item structure
                    if (index < 3) { // Only log first 3 items to avoid spam
                      console.log(`🔍 Item ${index + 1}:`, {
                        id: item._id,
                        originalItemId: item.originalItemId,
                        name: item.name,
                        batchNumber: item.batchNumber,
                        itemKey: itemKey
                      });
                    }
                    
                    return (
                      <TableRow key={item._id}>
                        {/* Batch No. */}
                        <TableCell className="text-center font-medium">
                          <div className="text-sm font-bold text-blue-600">
                            {item.batchNo}
                          </div>
                        </TableCell>
                        
                        {/* Product Name */}
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.code}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Moulding Time - Punch In/Out System */}
                        <TableCell>
                          {!batch.mouldingTime ? (
                            <Button
                              onClick={() => {
                                const now = new Date().toISOString();
                                handleUngroupedBatchDataChange(itemKey, 'mouldingTime', now);
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                            >
                              Start Moulding
                            </Button>
                          ) : (
                            <div className="text-center">
                              <div className="p-2 bg-green-50 rounded-lg border">
                                <div className="text-xs font-medium text-green-700">Started</div>
                                <div className="text-xs text-gray-600">
                                  {new Date(batch.mouldingTime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at{' '}
                                  {new Date(batch.mouldingTime).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Unloading Time - Punch In/Out System */}
                        <TableCell>
                          {!batch.unloadingTime ? (
                            <Button
                              onClick={() => {
                                const now = new Date().toISOString();
                                handleUngroupedBatchDataChange(itemKey, 'unloadingTime', now);
                              }}
                              disabled={!batch.mouldingTime}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500 h-8 text-xs"
                              title={!batch.mouldingTime ? "Please start moulding first" : "Click to end and record current time"}
                            >
                              End Moulding
                            </Button>
                          ) : (
                            <div className="text-center">
                              <div className="p-2 bg-blue-50 rounded-lg border">
                                <div className="text-xs font-medium text-blue-700">Ended</div>
                                <div className="text-xs text-gray-600">
                                  {new Date(batch.unloadingTime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} at{' '}
                                  {new Date(batch.unloadingTime).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Production Loss */}
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={batch.productionLoss || ''}
                            disabled={!batch.mouldingTime || !batch.unloadingTime}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleUngroupedBatchDataChange(itemKey, 'productionLoss', value);
                            }}
                            className={`w-20 text-sm ${!batch.mouldingTime || !batch.unloadingTime ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            title={!batch.mouldingTime || !batch.unloadingTime ? "Please enter both Moulding Time and Unloading Time first" : "Enter production loss"}
                          />
                        </TableCell>
                        
                        {/* Qty/Batch */}
                        <TableCell className="text-center">
                          <div className="font-medium text-blue-600">
                            {item.qtyPerBatch || 0}
                          </div>
                        </TableCell>
                        
                        {/* Qty Achieved/Batch (auto-calculated) */}
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">
                            {Math.max(0, (item.qtyPerBatch || 0) - (parseFloat(batch.productionLoss) || 0))}
                          </span>
                          <div className="text-xs text-gray-500">
                            {item.qtyPerBatch || 0} - {batch.productionLoss || 0}
                          </div>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBatch({
                                  batchNo: index + 1,
                                  item: item,
                                  batch: batch,
                                  isUngrouped: true
                                });
                                setViewModalOpen(true);
                              }}
                              title="View Item Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Batch Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBatch?.isUngrouped ? 
                `Item Details - Item #${selectedBatch?.batchNo}` : 
                `Batch Details - Batch #${selectedBatch?.batchNo}`
              }
            </DialogTitle>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product Group</label>
                  <p className="text-lg font-semibold">
                    {selectedBatch.isUngrouped ? selectedBatch.item.name : selectedBatch.productGroup}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Batch Number</label>
                  <p className="text-lg font-semibold">#{selectedBatch.batchNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Moulding Start Time</label>
                  <p className="text-lg">
                    {selectedBatch.isUngrouped ? 
                      (selectedBatch.batch?.mouldingTime ? 
                        new Date(selectedBatch.batch.mouldingTime).toLocaleString() : 
                        'Not started'
                      ) : 
                      (selectedBatch.mouldingTime ? 
                        new Date(selectedBatch.mouldingTime).toLocaleString() : 
                        'Not started'
                      )
                    }
                  </p>
                  {((selectedBatch.isUngrouped && selectedBatch.batch?.mouldingTime) || 
                    (!selectedBatch.isUngrouped && selectedBatch.mouldingTime)) && (
                    <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">
                      Started
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Moulding End Time</label>
                  <p className="text-lg">
                    {selectedBatch.isUngrouped ? 
                      (selectedBatch.batch?.unloadingTime ? 
                        new Date(selectedBatch.batch.unloadingTime).toLocaleString() : 
                        'Not ended'
                      ) : 
                      (selectedBatch.unloadingTime ? 
                        new Date(selectedBatch.unloadingTime).toLocaleString() : 
                        'Not ended'
                      )
                    }
                  </p>
                  {((selectedBatch.isUngrouped && selectedBatch.batch?.unloadingTime) || 
                    (!selectedBatch.isUngrouped && selectedBatch.unloadingTime)) && (
                    <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700">
                      Completed
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Production Loss</label>
                  <p className="text-lg font-semibold text-red-600">
                    {selectedBatch.isUngrouped ? 
                      (selectedBatch.batch?.productionLoss || 0) : 
                      (selectedBatch.productionLoss || 0)
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {selectedBatch.isUngrouped ? 'Qty/Batch' : 'Qty/Batch (First Non-Zero)'}
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedBatch.isUngrouped ? 
                      (selectedBatch.item?.qtyPerBatch || 0) : 
                      (() => {
                        if (!selectedBatch.group?.items || selectedBatch.group.items.length === 0) return 0;
                        const nonZeroQty = selectedBatch.group.items.find(item => item.qtyPerBatch && item.qtyPerBatch > 0);
                        return nonZeroQty ? nonZeroQty.qtyPerBatch : 0;
                      })()
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedBatch.isUngrouped ? 'Item qty per batch' : 'First non-zero qtyPerBatch value'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Qty Achieved</label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedBatch.isUngrouped ? 
                      Math.max(0, (selectedBatch.item?.qtyPerBatch || 0) - (selectedBatch.batch?.productionLoss || 0)) : 
                      (() => {
                        if (!selectedBatch.group?.items || selectedBatch.group.items.length === 0) return 0;
                        const nonZeroQty = selectedBatch.group.items.find(item => item.qtyPerBatch && item.qtyPerBatch > 0);
                        const qtyPerBatch = nonZeroQty ? nonZeroQty.qtyPerBatch : 0;
                        return Math.max(0, qtyPerBatch - (selectedBatch.productionLoss || 0));
                      })()
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedBatch.isUngrouped ? 'Qty/batch - Production loss' : 'Non-zero qty/batch - Production loss'}
                  </p>
                </div>
              </div>

              {/* Group Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {selectedBatch.isUngrouped ? 'Current Stock' : 'Total Items'}
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedBatch.isUngrouped ? 
                      `${selectedBatch.item?.qty || 0} ${selectedBatch.item?.unit || ''}` : 
                      selectedBatch.totalItems
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {selectedBatch.isUngrouped ? 'Category' : 'Created By'}
                  </label>
                  <p className="text-lg">
                    {selectedBatch.isUngrouped ? 
                      selectedBatch.item?.category : 
                      selectedBatch.createdBy
                    }
                  </p>
                </div>
              </div>

              {/* All Items in Group or Single Item Details */}
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {selectedBatch?.isUngrouped ? 'Item Details' : 'All Items in this Production Group'}
                </label>
                <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
                  {selectedBatch?.isUngrouped ? (
                    /* Single ungrouped item details */
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        {selectedBatch.item.image ? (
                          <img
                            src={selectedBatch.item.image}
                            alt={selectedBatch.item.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{selectedBatch.item.name}</div>
                          <div className="text-sm text-gray-600">
                            <strong>Code:</strong> {selectedBatch.item.code} | 
                            <strong> Category:</strong> {selectedBatch.item.category}
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Stock:</strong> {selectedBatch.item.qty} {selectedBatch.item.unit} | 
                            <strong> Qty/Batch:</strong> <span className="text-blue-600 font-medium">{selectedBatch.item.qtyPerBatch || 0}</span> |
                            <strong> Batch Adjusted:</strong> <span className="text-green-600 font-medium">{selectedBatch.item.batchAdjusted || 0}</span>
                          </div>
                          {selectedBatch.item.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              <strong>Description:</strong> {selectedBatch.item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multiple items in production group */
                    selectedBatch.group?.items?.map((item, index) => (
                    <div key={item._id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            <strong>Code:</strong> {item.code} | 
                            <strong> Category:</strong> {item.category}
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Qty:</strong> {item.qty} {item.unit} | 
                            <strong> Qty/Batch:</strong> <span className="text-blue-600 font-medium">{item.qtyPerBatch || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}