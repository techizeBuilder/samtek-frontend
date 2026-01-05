import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';

export default function PackingSheet() {
  const { toast } = useToast();
  const [packingData, setPackingData] = useState([]);
  const [groupTimings, setGroupTimings] = useState({});
  const [loading, setLoading] = useState(true);
  const [approvingBatches, setApprovingBatches] = useState({});
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

  const loadPackingData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      console.log('🔄 Loading production groups for packing sheet...');
      console.log('🌐 API URL:', `${config.baseURL}/api/packing/production-groups`);
      
      // Fetch production groups from the correct API
      const response = await fetch(`${config.baseURL}/api/packing/production-groups`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ API Response Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error Response Body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Production groups API response:', result);
      console.log('📋 Raw groups data:', result.data.productionGroups);
      
      if (result.success && result.data.productionGroups) {
        // Transform API data to match packing sheet structure
        const transformedData = result.data.productionGroups.map((group, index) => {
          console.log('🔍 Processing group:', group.name, 'ID:', group._id);
          console.log('🔍 Group items:', group.items?.map(item => ({ name: item.name, id: item._id })));
          
          // Use existing packing sheet data if available
          const existingSheet = group.packingSheets && group.packingSheets.length > 0 ? group.packingSheets[0] : null;
          console.log('📄 Existing sheet:', existingSheet?._id);
          
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
            groupId: group._id, // This should be the real production group ID
            rawGroupData: group, // Keep original data for debugging
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
            items: group.items.map(item => {
              return {
                name: item.name,
                id: item._id, 
                rawItemData: item, 
                productId: item._id, // Use item._id directly for individual batches
                indentQty: item.indentQty || 0,
                producedQty: item.dailySummaryData?.productionFinalBatches || 0,
                achievedQty: item.achievedQty || 0, 
                packedQty: 0, // Will be calculated from batch sheets
                packingLoss: 0, // Will be calculated from batch sheets
                notes: '', 
                // Store the daily summary data for reference
                dailySummaryData: item.dailySummaryData,
                // Store batch details with their corresponding packing sheets
                batchDetails: item.batchDetails?.map(batch => {
                  // Use the packingSheets array from within the batch
                  const batchSheet = batch.packingSheets?.[0]; // Get first packing sheet for this batch
                  
                  return {
                    ...batch,
                    // Add packing sheet information from the batch's packingSheets array
                    packingSheetId: batchSheet?._id || null,
                    packingStartTime: batchSheet?.packingStartTime || null,
                    packingEndTime: batchSheet?.packingEndTime || null,
                    packingLoss: batchSheet?.packingLoss || 0,
                    packedQty: batchSheet?.packedQty || batch.qtyAchieved || 0,
                    notes: batchSheet?.notes || '',
                    status: batchSheet?.status || 'pending',
                    isApproved: batchSheet?.isApproved || batchSheet?.status === 'approved' || false,
                    hasExistingSheet: !!(batchSheet && batchSheet._id),
                    // Keep original batch data and packingSheets array
                    batchData: batch,
                    packingSheets: batch.packingSheets || []
                  };
                }) || []
              };
            })
          };
        });
        
        console.log('✅ Transformed packing data:', transformedData);
        console.log('📦 Groups with existing packing sheets:', transformedData.filter(g => g.hasExistingPackingSheet).length);
        setPackingData(transformedData);
        
        // Initialize group timings from existing data
        const initialTimings = {};
        transformedData.forEach((group, groupIndex) => {
          // Group-level timings
          if (group.punchInStatus && group.packingStartTime) {
            initialTimings[groupIndex] = {
              punchedIn: true,
              startTime: group.packingStartTime,
              punchedOut: group.punchOutStatus || false,
              endTime: group.packingEndTime || null
            };
          }
          
          // Batch-level timings - initialize for each batch based on existing packing sheets
          if (group.items && group.items.length > 0) {
            group.items.forEach((item, itemIndex) => {
              if (item.batchDetails && item.batchDetails.length > 0) {
                item.batchDetails.forEach((batch, batchIndex) => {
                  const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
                  
                  // Initialize batch timings from existing packing sheet data
                  let batchTiming = {
                    punchedIn: false,
                    startTime: null,
                    punchedOut: false,
                    endTime: null
                  };
                  
                  // If batch has packing sheets, load timing data from first sheet
                  if (batch.packingSheets && batch.packingSheets.length > 0) {
                    const packingSheet = batch.packingSheets[0];
                    if (packingSheet.packingStartTime) {
                      const startTime = new Date(packingSheet.packingStartTime);
                      batchTiming = {
                        punchedIn: true,
                        startTime: startTime.toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        }),
                        punchedOut: !!packingSheet.packingEndTime,
                        endTime: packingSheet.packingEndTime ? new Date(packingSheet.packingEndTime).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        }) : null
                      };
                    }
                  }
                  
                  initialTimings[batchKey] = batchTiming;
                });
              }
            });
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
      if (!silent) {
        setLoading(false);
      }
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
      console.log('📋 Group data:', packingData[groupIndex]);
      console.log('🆔 Group ID:', packingData[groupIndex].groupId);
      console.log('🔍 Raw group from API:', packingData[groupIndex]);
      console.log('📋 Group data:', packingData[groupIndex]);
      console.log('🆔 Group ID:', packingData[groupIndex].groupId);
      
      // Save punch-in time to backend
      const packingSheetData = {
        productionGroupId: packingData[groupIndex].groupId.replace('individual-', '').replace('group-', ''), // Clean ID
        productionGroupName: packingData[groupIndex].productGroup,
        packingStartTime: now.toISOString(),
        status: 'in_progress',
        items: packingData[groupIndex].items.map(item => ({
          productId: item.id.replace('individual-', '').replace('group-', ''), // Clean ID
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
        
        // Update local state with packingSheetId
        setPackingData(prev => {
          const newData = [...prev];
          newData[groupIndex] = {
            ...newData[groupIndex],
            packingSheetId: result.data._id || result.data.id,
            punchInStatus: true,
            packingStartTime: timeString
          };
          return newData;
        });
        
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

          // Refresh data after approval to get latest status from server
          setTimeout(() => {
            loadPackingData();
          }, 1000);
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

            // Refresh data to sync with server state
            setTimeout(() => {
              loadPackingData();
            }, 500);
          } else {
            // Show the actual error message from the server
            toast({
              title: 'Error',
              description: errorData.message || `HTTP error! status: ${response.status}`,
              variant: 'destructive'
            });
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
    
    // Return Promise for API call
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounced API call - only call API if we have a packing sheet
      if (group.packingSheetId) {
        debounceTimeoutRef.current = setTimeout(async () => {
          try {
            console.log(`🚀 API call for ${item.name}: ${packingLoss}`);
            console.log(`📝 Sending productId: ${item.productId}`);
            console.log(`📝 Item.id (production group): ${item.id}`);
            console.log(`📋 Full item data:`, item);
            
            const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/item`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                productId: item.productId, // Use productId from existing packing sheet data
                packingLoss: packingLoss
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('✅ Packing loss updated:', result);
              
              // Update local state with server response
              setPackingData(prev => {
                const newData = [...prev];
                const currentItem = newData[groupIndex]?.items[itemIndex];
                if (currentItem) {
                  currentItem.packedQty = result.data.packedQty;
                }
                return newData;
              });
              
              resolve(result);
            } else {
              const errorData = await response.json();
              console.error('❌ Failed to update:', response.status, errorData);
              reject(new Error(`HTTP ${response.status}: ${errorData.message}`));
            }
          } catch (error) {
            console.error('❌ Network error:', error);
            reject(error);
          }
        }, 300); // Reduced debounce
      } else {
        console.warn('⚠️ No packing sheet ID');
        resolve({ message: 'No packing sheet ID' });
      }
    });
  };

  // Batch-level punch in functionality
  const handleBatchPunchIn = async (groupIndex, itemIndex, batchIndex, batch) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
    
    // Update local state
    setGroupTimings(prev => ({
      ...prev,
      [batchKey]: {
        ...prev[batchKey],
        startTime: timeString,
        punchedIn: true
      }
    }));
    
    try {
      console.log('🔄 Batch punch-in for:', batch.batchNo);
      
      // Create or update packing sheet for this specific batch
      const packingSheetData = {
        productionGroupId: packingData[groupIndex].groupId?.replace('individual-', '').replace('group-', '') || null,
        productionGroupName: packingData[groupIndex].productGroup,
        packingStartTime: now.toISOString(),
        status: 'in_progress',
        items: [{
          productId: batch.itemId || packingData[groupIndex].items[itemIndex].id,
          productName: packingData[groupIndex].items[itemIndex].name,
          batchId: batch._id,
          batchNo: batch.batchNo,
          indentQty: batch.qtyAchieved || 0,
          producedQty: batch.qtyAchieved || 0,
          packedQty: batch.qtyAchieved || 0,
          packingLoss: 0,
          notes: ''
        }]
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
        console.log('✅ Batch punch-in saved:', result);
        
        // Update local state with batch-specific packing sheet ID
        setPackingData(prev => {
          const newData = [...prev];
          if (newData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex]) {
            newData[groupIndex].items[itemIndex].batchDetails[batchIndex] = {
              ...newData[groupIndex].items[itemIndex].batchDetails[batchIndex],
              packingSheetId: result.data._id || result.data.id,
              packingStartTime: now.toISOString(),
              status: 'in_progress',
              hasExistingSheet: true
            };
          }
          return newData;
        });
        
        toast({
          title: 'Success',
          description: `Punch-in recorded for batch ${batch.batchNo}`,
        });
      }
    } catch (error) {
      console.error('❌ Error saving batch punch-in:', error);
      toast({
        title: 'Warning',
        description: 'Punch-in recorded locally, but could not save to server',
        variant: 'destructive'
      });
    }
  };

  // Batch-level punch out functionality
  const handleBatchPunchOut = async (groupIndex, itemIndex, batchIndex, batch) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
    
    // Update local state
    setGroupTimings(prev => ({
      ...prev,
      [batchKey]: {
        ...prev[batchKey],
        endTime: timeString,
        punchedOut: true
      }
    }));

    try {
      const batch = packingData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex];
      const batchPackingSheetId = batch?.packingSheetId;
      
      if (batchPackingSheetId) {
        console.log('⏰ Batch punch-out for:', batch.batchNo);
        
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${batchPackingSheetId}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('✅ Batch punch-out saved');
          
          // Update batch details in local state
          setPackingData(prev => {
            const newData = [...prev];
            if (newData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex]) {
              newData[groupIndex].items[itemIndex].batchDetails[batchIndex] = {
                ...newData[groupIndex].items[itemIndex].batchDetails[batchIndex],
                packingEndTime: new Date().toISOString(),
                status: 'completed'
              };
            }
            return newData;
          });
          
          toast({
            title: 'Success',
            description: `Punch-out recorded for batch ${batch.batchNo}`,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error saving batch punch-out:', error);
      toast({
        title: 'Warning',
        description: 'Punch-out recorded locally, but could not save to server',
        variant: 'destructive'
      });
    }
  };

  // Batch-level packing loss change
  const handleBatchPackingLossChange = (groupIndex, itemIndex, batchIndex, batch, newPackingLoss) => {
    // Check if batch is punched out before allowing packing loss entry
    const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
    const batchTiming = groupTimings[batchKey];
    const isPunchedOut = batchTiming?.punchedOut;
    
    if (!isPunchedOut) {
      toast({
        title: "Cannot Enter Packing Loss",
        description: "Please punch out first before entering packing loss",
        variant: "destructive",
      });
      // Reset the input field to previous value
      const input = event.target;
      input.value = batch.packingLoss || 0;
      return;
    }

    const packingLoss = Math.max(0, Number(newPackingLoss) || 0);
    const producedQty = Number(batch.qtyAchieved) || 0;
    const newPackedQty = Math.max(0, producedQty - packingLoss);
    
    console.log(`📝 Batch ${batch.batchNo} packing loss: ${packingLoss}, packed: ${newPackedQty}`);
    
    // Update local state
    setPackingData(prev => {
      const newData = [...prev];
      if (newData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex]) {
        newData[groupIndex].items[itemIndex].batchDetails[batchIndex] = {
          ...newData[groupIndex].items[itemIndex].batchDetails[batchIndex],
          packingLoss: packingLoss,
          packedQty: newPackedQty
        };
      }
      return newData;
    });

    // API call for batch-specific update
    const batchData = packingData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex];
    const batchPackingSheetId = batchData?.packingSheetId;
    
    if (batchPackingSheetId) {
      // Debounced API call
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          console.log(`🚀 API call for batch ${batch.batchNo} packing loss: ${packingLoss}`);
          const response = await fetch(`${config.baseURL}/api/packing/sheets/${batchPackingSheetId}/item`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              productId: batchData.itemId,
              batchId: batchData._id,
              packingLoss: packingLoss
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Batch packing loss updated:', result);
            
            // Show success toast
            toast({
              title: "Success",
              description: `Packing loss updated for batch ${batch.batchNo}`,
            });
          } else {
            throw new Error(`API call failed: ${response.status}`);
          }
        } catch (error) {
          console.error('❌ Error updating batch packing loss:', error);
          toast({
            title: "Error",
            description: `Failed to update packing loss for batch ${batch.batchNo}`,
            variant: "destructive",
          });
        }
      }, 300);
    }
  };

  // Batch-level notes change
  const handleBatchNotesChange = (groupIndex, itemIndex, batchIndex, batch, newNotes) => {
    // Update local state
    setPackingData(prev => {
      const newData = [...prev];
      if (newData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex]) {
        newData[groupIndex].items[itemIndex].batchDetails[batchIndex] = {
          ...newData[groupIndex].items[itemIndex].batchDetails[batchIndex],
          notes: newNotes
        };
      }
      return newData;
    });

    // API call for batch-specific update
    const batchData = packingData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex];
    const batchPackingSheetId = batchData?.packingSheetId;
    
    if (batchPackingSheetId) {
      setTimeout(async () => {
        try {
          const response = await fetch(`${config.baseURL}/api/packing/sheets/${batchPackingSheetId}/item`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              productId: batchData.itemId,
              batchId: batchData._id,
              notes: newNotes
            })
          });
          
          if (response.ok) {
            console.log('✅ Batch notes updated');
          }
        } catch (error) {
          console.error('❌ Error updating batch notes:', error);
        }
      }, 500);
    }
  };

  // Batch-level approval
  const handleBatchApproval = async (groupIndex, itemIndex, batchIndex, batch) => {
    const batchData = packingData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex];
    const batchPackingSheetId = batchData?.packingSheetId;
    const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
    
    // Prevent double-clicking
    if (approvingBatches[batchKey]) {
      return;
    }
    
    try {
      if (batchPackingSheetId) {
        console.log('✅ Approving batch:', batch.batchNo);
        
        // Set loading state for this specific batch
        setApprovingBatches(prev => ({ ...prev, [batchKey]: true }));
        
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${batchPackingSheetId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('✅ Batch approved successfully');
          
          // Update local state
          setPackingData(prev => {
            const newData = [...prev];
            if (newData[groupIndex]?.items[itemIndex]?.batchDetails[batchIndex]) {
              newData[groupIndex].items[itemIndex].batchDetails[batchIndex] = {
                ...newData[groupIndex].items[itemIndex].batchDetails[batchIndex],
                status: 'approved',
                isApproved: true
              };
            }
            return newData;
          });

          toast({
            title: 'Success',
            description: `Batch ${batch.batchNo} approved and dispatch created`,
          });

          // Refresh data after batch approval silently (without loading screen)
          setTimeout(() => {
            loadPackingData(true);
          }, 1000);
        } else {
          throw new Error('Failed to approve batch');
        }
      }
    } catch (error) {
      console.error('❌ Error approving batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve batch',
        variant: 'destructive'
      });
    } finally {
      // Remove loading state for this batch
      setApprovingBatches(prev => {
        const newState = { ...prev };
        delete newState[batchKey];
        return newState;
      });
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
        console.log(`📝 Updating notes for ${item.name} with productId: ${item.productId}`);
        
        const response = await fetch(`${config.baseURL}/api/packing/sheets/${group.packingSheetId}/item`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: item.productId, // Use productId from existing packing sheet data
            notes: newNotes
          })
        });
        
        if (response.ok) {
          console.log('✅ Notes updated successfully');
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to update notes:', errorData);
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
                    <tr className="bg-grey-300">
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
                  {/* Group Header Row - Simple summary only */}
                  <tr className="bg-blue-50 border-b-2 border-blue-200">
                    <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center text-xs sm:text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>{group.slNo}</span>
                        {group.hasExistingPackingSheet && (
                          <div title={`Has ${group.packingSheets.length} existing packing sheet(s)`} className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-900 px-2 sm:px-4 py-2">
                      <div className="font-semibold text-center text-sm text-blue-700">
                        {group.productGroup}
                      </div>
                    </td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                        {group.items.reduce((sum, i) => sum + (i.dailySummaryData?.productionFinalBatches || 0), 0)}
                      </span>
                    </td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                      <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                        {group.items.reduce((sum, i) => sum + (i.achievedQty || 0), 0)}
                      </span>
                    </td>
                    
                    {/* Group header - No packing functionality */}
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500">-</td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500">-</td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500">-</td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500">-</td>
                    <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500">-</td>
                    <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center text-xs text-gray-500">-</td>
                  </tr>
                  
                  {/* Individual Batch Rows - Show each batch as a separate row */}
                  {group.items.map((item, itemIndex) => (
                    // Map through each batch in the item to create individual batch rows
                    item.batchDetails && item.batchDetails.length > 0 ? 
                      item.batchDetails.map((batch, batchIndex) => (
                        <tr key={`${groupIndex}-${itemIndex}-${batchIndex}`} className="hover:bg-gray-50 border-b border-gray-200">
                          <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center text-xs sm:text-sm">
                            
                          </td>
                          <td className="border border-gray-900 px-2 sm:px-4 py-2">
                            <div className="bg-gray-50 p-2 rounded ml-4">
                              <div className="font-medium text-xs">{item.name}</div>
                              <div className="text-xs text-blue-600 mt-1">Batch: {batch.batchNo}</div>
                            </div>
                          </td>
                          
                          {/* Indent Qty - from batch */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                              {batch.qtyAchieved || 0}
                            </span>
                          </td>
                          
                          {/* Produced Qty - from batch */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                              {batch.qtyAchieved || 0}
                            </span>
                          </td>
                          
                          {/* Batch-level Packing Start time */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            {(groupTimings[`${groupIndex}-${itemIndex}-${batchIndex}`]?.punchedIn) ? (
                              <span className="text-green-600 font-medium text-xs sm:text-sm">
                                {groupTimings[`${groupIndex}-${itemIndex}-${batchIndex}`]?.startTime}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBatchPunchIn(groupIndex, itemIndex, batchIndex, batch)}
                                className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors whitespace-nowrap"
                              >
                                Punch In
                              </button>
                            )}
                          </td>
                          
                          {/* Batch-level Packing End time */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            {(groupTimings[`${groupIndex}-${itemIndex}-${batchIndex}`]?.punchedOut) ? (
                              <span className="text-red-600 font-medium text-xs sm:text-sm">
                                {groupTimings[`${groupIndex}-${itemIndex}-${batchIndex}`]?.endTime}
                              </span>
                            ) : (groupTimings[`${groupIndex}-${itemIndex}-${batchIndex}`]?.punchedIn) ? (
                              <button
                                onClick={() => handleBatchPunchOut(groupIndex, itemIndex, batchIndex, batch)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                              >
                                Punch Out
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Batch-level Packing loss */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            {(() => {
                              const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
                              const batchTiming = groupTimings[batchKey];
                              const isPunchedOut = batchTiming?.punchedOut;
                              
                              return (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  defaultValue={batch.packingLoss || 0}
                                  disabled={!isPunchedOut}
                                  className={`w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold ${
                                    isPunchedOut 
                                      ? 'bg-yellow-50 text-gray-900' 
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  placeholder="0"
                                  title={!isPunchedOut ? "Punch out first to enter packing loss" : "Enter packing loss"}
                                  onChange={(e) => handleBatchPackingLossChange(groupIndex, itemIndex, batchIndex, batch, e.target.value)}
                                />
                              );
                            })()}
                          </td>
                          
                          {/* Batch-level Qty Packed */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                              {Math.max(0, (batch.qtyAchieved || 0) - (batch.packingLoss || 0))}
                            </span>
                          </td>
                          
                          {/* Batch-level Notes */}
                          <td className="border border-gray-900 px-1 sm:px-2 py-2">
                            <input
                              type="text"
                              placeholder="Batch notes..."
                              defaultValue={batch.notes || ''}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onChange={(e) => handleBatchNotesChange(groupIndex, itemIndex, batchIndex, batch, e.target.value)}
                            />
                          </td>
                          
                          {/* Batch-level Actions */}
                          <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center">
                            {(() => {
                              const batchKey = `${groupIndex}-${itemIndex}-${batchIndex}`;
                              const batchTiming = groupTimings[batchKey];
                              const isCompleted = batchTiming?.punchedOut;
                              const isAlreadyApproved = batch.status === 'approved' || batch.isApproved;
                              const hasPackingLoss = (batch.packingLoss || 0) > 0;
                              const isApproving = approvingBatches[batchKey];
                              
                              // If already approved, show approved status
                              if (isAlreadyApproved) {
                                return (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                                    ✅ Approved
                                  </span>
                                );
                              }
                              
                              if (isCompleted) {
                                if (hasPackingLoss) {
                                  return (
                                    <button
                                      onClick={() => handleBatchApproval(groupIndex, itemIndex, batchIndex, batch)}
                                      disabled={isApproving}
                                      className={`px-2 sm:px-3 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                                        isApproving 
                                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                                          : 'bg-green-500 text-white hover:bg-green-600'
                                      }`}
                                    >
                                      {isApproving ? (
                                        <span className="flex items-center gap-1">
                                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Approving...
                                        </span>
                                      ) : (
                                        'Approve'
                                      )}
                                    </button>
                                  );
                                } else {
                                  return (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                                      ✅ Completed
                                    </span>
                                  );
                                }
                              }
                              
                              return (
                                <span className="text-gray-400 text-xs">
                                  Complete first
                                </span>
                              );
                            })()} 
                          </td>
                        </tr>
                      )) :
                      // Fallback for items without batch details
                      (
                        <tr key={`${groupIndex}-${itemIndex}`} className="hover:bg-gray-50 border-b border-gray-200">
                          <td className="border border-gray-900 px-2 sm:px-4 py-2 text-center text-xs sm:text-sm">
                            
                          </td>
                          <td className="border border-gray-900 px-2 sm:px-4 py-2">
                            <div className="bg-red-50 p-2 rounded ml-4">
                              <div className="font-medium text-xs text-red-600">{item.name}</div>
                              <div className="text-xs text-red-500">No batch data available</div>
                            </div>
                          </td>
                          <td className="border border-gray-900 px-1 sm:px-2 py-2 text-center text-xs text-gray-500" colSpan="8">
                            No batch information
                          </td>
                        </tr>
                      )
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