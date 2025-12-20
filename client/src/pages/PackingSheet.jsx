import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';

export default function PackingSheet() {
  const { toast } = useToast();
  const [packingData, setPackingData] = useState([]);
  const [groupTimings, setGroupTimings] = useState({});
  const [loading, setLoading] = useState(true);
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    loadPackingData();
  }, []);
  
  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const loadPackingData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading production groups for packing sheet...');
      
      // Fetch production groups from the correct API
      const response = await fetch(`${config.baseURL}/api/packing/production-groups`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Production groups API response:', result);
      
      if (result.success && result.data.productionGroups) {
        // Transform API data to match packing sheet structure
        const transformedData = result.data.productionGroups.map((group, index) => {
          // Use existing packing sheet data if available
          const existingSheet = group.packingSheets && group.packingSheets.length > 0 ? group.packingSheets[0] : null;
          
          // Get packing start time from existing sheet
          let packingStartTime = null;
          let packingEndTime = null;
          let punchInStatus = false;
          let punchOutStatus = false;
          
          if (existingSheet && existingSheet.packingStartTime) {
            const startTime = new Date(existingSheet.packingStartTime);
            packingStartTime = startTime.toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });
            punchInStatus = true;
          }
          
          // Get packing end time from existing sheet if available
          if (existingSheet && existingSheet.packingEndTime) {
            const endTime = new Date(existingSheet.packingEndTime);
            packingEndTime = endTime.toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });
            punchOutStatus = true;
          }
          
          return {
            slNo: index + 1,
            productGroup: group.name,
            groupDescription: group.description || '',
            groupId: group._id,
            // Group-level quantities (main totals)
            groupIndentQty: group.qtyPerBatch || 0,
            groupProducedQty: group.qtyAchievedPerBatch || 0,
            // Include packing sheet data
            packingSheets: group.packingSheets || [],
            hasExistingPackingSheet: group.packingSheets && group.packingSheets.length > 0,
            existingPackingSheet: existingSheet,
            packingSheetId: existingSheet?._id || null,
            packingStartTime: packingStartTime,
            packingEndTime: packingEndTime,
            punchInStatus: punchInStatus,
            punchOutStatus: punchOutStatus,
            // Load approval status from existing sheet
            isApproved: existingSheet?.isApproved || existingSheet?.status === 'approved' || false,
            status: existingSheet?.status || 'pending',
            items: existingSheet ? 
              // Use data from existing packing sheet
              existingSheet.items.map(item => ({
                name: item.productName,
                id: item.productId,
                indentQty: item.indentQty || 0,
                producedQty: item.producedQty || 0,
                packedQty: item.packedQty || 0,
                packingLoss: existingSheet.packingLoss || 0,
                notes: existingSheet.notes || ''
              })) :
              // Fallback to group items if no packing sheet exists
              group.items.map(item => ({
                name: item.name,
                id: item._id,
                indentQty: item.producedQty || 0,
                producedQty: item.achievedQty || 0,
                packedQty: Math.max(0, (item.achievedQty || 0) - 0), // producedQty - packingLoss
                packingLoss: 0,
                notes: ''
              }))
          };
        });
        
        console.log('✅ Transformed packing data:', transformedData);
        console.log('📦 Groups with existing packing sheets:', transformedData.filter(g => g.hasExistingPackingSheet).length);
        setPackingData(transformedData);
        
        // Initialize group timings from existing data
        const initialTimings = {};
        transformedData.forEach((group, index) => {
          if (group.punchInStatus && group.packingStartTime) {
            initialTimings[index] = {
              punchedIn: true,
              startTime: group.packingStartTime,
              punchedOut: group.punchOutStatus || false,
              endTime: group.packingEndTime || null
            };
          }
        });
        setGroupTimings(initialTimings);
        
        toast({
          title: 'Success',
          description: `Loaded ${transformedData.length} production groups for packing`,
        });
      } else {
        throw new Error(result.message || 'Failed to fetch production groups');
      }
    } catch (error) {
      console.error('❌ Failed to load packing data from API:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to load packing data. Please refresh and try again.',
        variant: 'destructive'
      });
      
      // Set empty data instead of sample data
      setPackingData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async (groupIndex) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Update local state
    setGroupTimings(prev => ({
      ...prev,
      [groupIndex]: {
        ...prev[groupIndex],
        startTime: timeString,
        punchedIn: true
      }
    }));
    
    try {
      console.log('🔄 Saving punch-in time for group:', packingData[groupIndex].productGroup);
      
      // Save punch-in time to backend
      const packingSheetData = {
        productionGroupId: packingData[groupIndex].groupId,
        productionGroupName: packingData[groupIndex].productGroup,
        packingStartTime: now.toISOString(),
        status: 'in_progress',
        items: packingData[groupIndex].items.map(item => ({
          productId: item.id,
          productName: item.name,
          indentQty: parseFloat(item.indentQty) || 0,
          producedQty: parseFloat(item.producedQty) || 0,
          packedQty: parseFloat(item.packedQty) || 0,
          packingLoss: 0,
          notes: item.notes || ''
        }))
      };
      
      const response = await fetch(`${config.baseURL}/api/packing/sheets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packingSheetData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Punch-in time saved successfully:', result);
        toast({
          title: 'Success',
          description: `Punch-in recorded for ${packingData[groupIndex].productGroup}`,
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error saving punch-in time:', error);
      toast({
        title: 'Warning',
        description: 'Punch-in recorded locally, but could not save to server',
        variant: 'destructive'
      });
    }
  };

  const handlePunchOut = async (groupIndex) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const group = packingData[groupIndex];
    
    // Update local state
    setGroupTimings(prev => ({
      ...prev,
      [groupIndex]: {
        ...prev[groupIndex],
        endTime: timeString,
        punchedOut: true
      }
    }));

    try {
      if (group.packingSheetId) {
        console.log('⏰ Saving punch-out time for group:', group.productGroup);
        
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Punch-out time saved successfully:', result);
          
          // Update the packing data to mark as completed
          setPackingData(prev => {
            const newData = [...prev];
            newData[groupIndex] = {
              ...newData[groupIndex],
              status: 'completed',
              packingEndTime: timeString
            };
            return newData;
          });
          
          toast({
            title: 'Success',
            description: `Punch-out recorded for ${group.productGroup}`,
          });
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('❌ Error saving punch-out time:', error);
      toast({
        title: 'Warning',
        description: 'Punch-out recorded locally, but could not save to server',
        variant: 'destructive'
      });
    }
  };

  const handleApproval = async (groupIndex) => {
    const group = packingData[groupIndex];
    
    console.log('🔍 handleApproval called with groupIndex:', groupIndex);
    console.log('🔍 Group data:', group);
    console.log('🔍 PackingSheetId:', group.packingSheetId);
    
    try {
      if (group.packingSheetId) {
        console.log('✅ Approving packing sheet for group:', group.productGroup);
        console.log('🚀 Making API call to:', `${config.baseURL}/api/packing/sheets/${group.packingSheetId}/approve`);
        
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Packing sheet approved successfully:', result);
          
          // Update the packing data to mark as approved
          setPackingData(prev => {
            const newData = [...prev];
            newData[groupIndex] = {
              ...newData[groupIndex],
              status: 'approved',
              isApproved: true
            };
            return newData;
          });

          toast({
            title: 'Success',
            description: `Packing sheet approved and dispatch created for ${group.productGroup}`,
          });
        } else {
          const errorData = await response.json();
          console.log('❌ Error response data:', errorData);
          
          // If it's already approved, update the frontend state to reflect this
          if (errorData.message && errorData.message.includes('already approved')) {
            console.log('ℹ️ Packing sheet is already approved, updating frontend state');
            setPackingData(prev => {
              const newData = [...prev];
              newData[groupIndex] = {
                ...newData[groupIndex],
                status: 'approved',
                isApproved: true
              };
              return newData;
            });
            
            toast({
              title: 'Info',
              description: 'This packing sheet is already approved',
            });
          } else {
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
        }
      } else {
        console.log('⚠️ No packingSheetId found for group:', group.productGroup);
        console.log('ℹ️ This might be an ungrouped item or legacy data');
        
        // For groups without packingSheetId, we can still mark as approved locally
        // This handles cases like "Ungrouped Items" that might not have formal packing sheets
        setPackingData(prev => {
          const newData = [...prev];
          newData[groupIndex] = {
            ...newData[groupIndex],
            status: 'approved',
            isApproved: true
          };
          return newData;
        });
        
        toast({
          title: 'Success',
          description: `Packing loss approved for ${group.productGroup}`,
        });
      }
    } catch (error) {
      console.error('❌ Error approving packing sheet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve packing sheet',
        variant: 'destructive'
      });
    }
  };

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handlePackingLossChange = (groupIndex, itemIndex, newPackingLoss) => {
    const group = packingData[groupIndex];
    const item = group.items[itemIndex];
    
    console.log(`📝 handlePackingLossChange called:`, {
      groupIndex, 
      itemIndex, 
      newPackingLoss, 
      itemName: item.name, 
      packingSheetId: group.packingSheetId
    });
    
    // Validate input
    const packingLoss = Math.max(0, Number(newPackingLoss) || 0);
    const producedQty = Number(item.producedQty) || 0;
    const newPackedQty = Math.max(0, producedQty - packingLoss);
    
    console.log(`📊 Calculation: ${producedQty} - ${packingLoss} = ${newPackedQty}`);
    
    // Update local state immediately for responsive UI
    setPackingData(prev => {
      const newData = [...prev];
      newData[groupIndex].items[itemIndex] = {
        ...newData[groupIndex].items[itemIndex],
        packingLoss: packingLoss,
        packedQty: newPackedQty
      };
      return newData;
    });
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounced API call - only call API if we have a packing sheet
    if (group.packingSheetId) {
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          console.log(`🚀 Debounced API call for ${item.name}: ${packingLoss}`);
          console.log(`🔗 API URL: ${config.baseURL}/api/packing/sheets/${group.packingSheetId}/item`);
          
          const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/item`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              productId: item.id,
              packingLoss: packingLoss
            })
          });
          
          console.log(`📡 API Response Status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Packing loss updated successfully:', result.data);
            
            // Update the packed qty in local state with the server response
            setPackingData(prev => {
              const newData = [...prev];
              const currentItem = newData[groupIndex]?.items[itemIndex];
              if (currentItem) {
                currentItem.packedQty = result.data.packedQty;
              }
              return newData;
            });
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to update packing loss:', response.status, errorText);
            toast({
              title: 'Warning',
              description: `Could not save packing loss to server: ${response.status}`,
              variant: 'destructive'
            });
          }
        } catch (error) {
          console.error('❌ Error updating packing loss:', error);
          toast({
            title: 'Error',
            description: 'Network error while updating packing loss',
            variant: 'destructive'
          });
        }
      }, 800); // 800ms debounce delay
    } else {
      console.warn('⚠️ No packing sheet ID available, cannot save to server');
    }
  };
  
  const handleNotesChange = async (groupIndex, itemIndex, newNotes) => {
    const group = packingData[groupIndex];
    const item = group.items[itemIndex];
    
    // Update local state immediately
    setPackingData(prev => {
      const newData = [...prev];
      newData[groupIndex].items[itemIndex].notes = newNotes;
      return newData;
    });
    
    // Call API to update if we have a packing sheet
    if (group.packingSheetId) {
      try {
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/item`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: item.id,
            notes: newNotes
          })
        });
        
        if (response.ok) {
          console.log('✅ Notes updated successfully');
        }
      } catch (error) {
        console.error('❌ Error updating notes:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-full mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Packing Sheet</h1>
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg text-gray-600">Loading production groups...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Packing Sheet</h1>
            <button
              onClick={loadPackingData}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 text-sm sm:text-base"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Table */}
        {packingData.length === 0 ? (
          <div className="text-center py-8 sm:py-12 border-2 border-dashed border-gray-300 rounded-lg bg-white mx-2 sm:mx-0">
            <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V6a1 1 0 00-1-1H7a1 1 0 00-1 1v1m12 0H5" />
            </svg>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Production Groups Found</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 px-4">
              No production groups are available for packing. Please check if production groups have been created.
            </p>
            <button
              onClick={loadPackingData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          /* Responsive Table Container */
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Mobile/Tablet: Horizontal Scroll */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]"> {/* Minimum width for proper table display */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-yellow-300">
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm">
                        SL NO.
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[120px] sm:min-w-[150px]">
                        Product Group<br />with Product
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                        Indent Qty
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                        Produced Qty
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                        Packing Start<br />time
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                        Packing End<br />time
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                        Packing loss
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                        Qty Packed
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                        Notes
                      </th>
                      <th className="border border-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{/* Table content */}
              {packingData.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {group.items.map((item, itemIndex) => (
                    <tr key={`${groupIndex}-${itemIndex}`} className="hover:bg-gray-50 border-b border-gray-200">
                      {/* SL NO. - only show for first item of each group */}
                      <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center text-xs sm:text-sm">
                        {itemIndex === 0 ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span>{group.slNo}</span>
                            {group.hasExistingPackingSheet && (
                              <div title={`Has ${group.packingSheets.length} existing packing sheet(s)`} className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        ) : ''}
                      </td>
                      
                      {/* Product Group with Product */}
                      <td className="border border-gray-900 px-2 sm:px-4 py-2">
                        {itemIndex === 0 ? (
                          <div>
                            <div className="font-semibold text-center mb-1 text-xs sm:text-sm">
                              {group.productGroup}
                            </div>
                            <div className="text-xs">{item.name}</div>
                          </div>
                        ) : (
                          <div className="text-xs pl-2 sm:pl-4">{item.name}</div>
                        )}
                      </td>
                      
                      {/* Indent Qty */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2">
                        <div className="w-full text-center bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm min-h-[32px] flex items-center justify-center text-gray-600">
                          {item.indentQty || 0}
                        </div>
                      </td>
                      
                      {/* Produced Qty */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2">
                        <div className="w-full text-center bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm min-h-[32px] flex items-center justify-center text-gray-600">
                          {item.producedQty || 0}
                        </div>
                      </td>
                      
                      {/* Packing Start time - show timing for first item of each group */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                        {itemIndex === 0 ? (
                          (groupTimings[groupIndex]?.punchedIn || group.punchInStatus) ? (
                            <span className="text-green-600 font-medium text-xs sm:text-sm">
                              {groupTimings[groupIndex]?.startTime || group.packingStartTime}
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePunchIn(groupIndex)}
                              className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors whitespace-nowrap"
                            >
                              Punch In
                            </button>
                          )
                        ) : ''}
                      </td>
                      
                      {/* Packing End time - show timing for first item of each group */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                        {itemIndex === 0 ? (
                          (groupTimings[groupIndex]?.punchedOut || group.punchOutStatus || group.status === 'completed') ? (
                            <span className="text-red-600 font-medium text-xs sm:text-sm">
                              {groupTimings[groupIndex]?.endTime || group.packingEndTime}
                            </span>
                          ) : (groupTimings[groupIndex]?.punchedIn || group.punchInStatus) ? (
                            <button
                              onClick={() => handlePunchOut(groupIndex)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Punch Out
                            </button>
                          ) : ''
                        ) : ''}
                      </td>
                      
                      {/* Packing loss - editable for each item with real-time update */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2">
                        <Input
                          type="number"
                          value={item.packingLoss || 0}
                          onChange={(e) => handlePackingLossChange(groupIndex, itemIndex, e.target.value)}
                          className="w-full text-center border-0 focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm min-h-[32px]"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      
                      {/* Qty Packed - calculated automatically */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2">
                        <div className="w-full text-center bg-green-100 px-2 py-1 rounded text-xs sm:text-sm min-h-[32px] flex items-center justify-center font-medium">
                          {item.packedQty || 0}
                        </div>
                      </td>
                      
                      {/* Notes - editable */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2">
                        <Input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleNotesChange(groupIndex, itemIndex, e.target.value)}
                          className="w-full text-center border-0 focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm min-h-[32px]"
                          placeholder="Notes"
                        />
                      </td>
                      
                      {/* Actions - show for first item of each group */}
                      <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                        {itemIndex === 0 ? (
                          <div className="flex flex-col gap-1">
                            {(() => {
                              // Calculate total packing loss for the group
                              const totalPackingLoss = group.items.reduce((sum, item) => sum + (Number(item.packingLoss) || 0), 0);
                              const hasPackingLoss = totalPackingLoss > 0;
                              const isCompleted = groupTimings[groupIndex]?.punchedOut || group.status === 'completed' || group.punchOutStatus;
                              const isApproved = group.isApproved || group.status === 'approved';
                              
                              console.log(`🔍 Group ${groupIndex} (${group.productGroup}):`, {
                                totalPackingLoss,
                                hasPackingLoss,
                                isCompleted,
                                isApproved,
                                packingSheetId: group.packingSheetId,
                                groupTimings: groupTimings[groupIndex],
                                groupStatus: group.status,
                                punchOutStatus: group.punchOutStatus
                              });
                              
                              // Already approved
                              if (isApproved) {
                                return (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                                    ✅ Approved
                                  </span>
                                );
                              }
                              
                              // Completed - check for approval needs
                              if (isCompleted) {
                                // Has packing loss - needs approval (don't require packingSheetId)
                                if (hasPackingLoss) {
                                  return (
                                    <button
                                      onClick={() => handleApproval(groupIndex)}
                                      className="bg-green-500 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors whitespace-nowrap"
                                    >
                                      Approve
                                    </button>
                                  );
                                }
                                // No packing loss - automatically completed
                                else {
                                  return (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                                      ✅ Completed
                                    </span>
                                  );
                                }
                              }
                              
                              // Not completed yet
                              return (
                                <span className="text-gray-400 text-xs">
                                  Complete first
                                </span>
                              );
                            })()}
                          </div>
                        ) : ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Auto-save indicator - only show when there's data */}
        {packingData.length > 0 && (
          <div className="flex justify-center mt-6">
            <div className="text-sm text-gray-500">
              Changes are automatically saved
            </div>
          </div>
        )}
      </div>
    </div>
  );
}