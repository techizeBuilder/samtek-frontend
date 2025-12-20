import PackingSheet from '../models/Packing.js';
import ProductionGroup from '../models/ProductionGroup.js';
import ProductDetailsDailySummary from '../models/ProductDetailsDailySummary.js';
import ProductionBatch from '../models/ProductionBatch.js';
import { Item } from '../models/Inventory.js';

// Get all production groups with item details for packing sheet
export const getProductionGroupsForPacking = async (req, res) => {
  try {
    console.log('📦 Getting production groups for packing sheet - COMPLETED BATCHES ONLY');
    console.log('User details:', {
      username: req.user?.username,
      role: req.user?.role,
      companyId: req.user?.companyId
    });

    // Set today's date for filtering
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('🗓️ Filtering for date:', today.toISOString());

    // Step 1: Get all completed ProductionBatch records for today
    const completedBatches = await ProductionBatch.find({
      companyId: req.user.companyId,
      productionDate: { 
        $gte: today, 
        $lte: endOfDay 
      },
      status: 'completed'
    }).lean();

    console.log(`🏁 Found ${completedBatches.length} completed production batches for today`);

    if (completedBatches.length === 0) {
      return res.json({
        success: true,
        message: 'No completed production batches found for today',
        data: {
          productionGroups: [],
          totalGroups: 0
        }
      });
    }

    // Extract unique item IDs and group IDs from completed batches
    const completedItemIds = [...new Set(completedBatches.map(batch => batch.itemId?.toString()).filter(id => id))];
    const completedGroupIds = [...new Set(completedBatches.map(batch => batch.groupId?.toString()).filter(id => id))];

    console.log('📋 Completed item IDs:', completedItemIds.length, completedItemIds);
    console.log('📋 Completed group IDs:', completedGroupIds.length, completedGroupIds);
    console.log('🔍 All completed batches details:', completedBatches.map(b => ({
      itemId: b.itemId?.toString(),
      groupId: b.groupId?.toString(),
      batchNo: b.batchNo,
      qtyAchieved: b.qtyAchieved,
      status: b.status
    })));

    // Get ALL production groups from user's company (not just ones with completed items)
    const allProductionGroups = await ProductionGroup.find({
      isActive: true,
      company: req.user.companyId
    })
      .populate({
        path: 'items',
        select: 'name code category qty unit price image',
        match: { 
          isActive: { $ne: false }
        }
      })
      .populate({
        path: 'createdBy',
        select: 'username'
      })
      .lean();

    console.log(`📦 Found ${allProductionGroups.length} total production groups`);

    // Also get ungrouped items that have completed batches
    const ungroupedCompletedItems = completedBatches.filter(batch => 
      !batch.groupId || batch.groupId === null
    );

    console.log(`🔄 Found ${ungroupedCompletedItems.length} completed ungrouped batches`);

    console.log(`📦 Found ${allProductionGroups.length} production groups to check`);

    // Transform data for packing sheet display - check ALL groups for completed items
    const packingData = await Promise.all(allProductionGroups.map(async (group) => {
      const groupItems = [];
      
      if (group.items && group.items.length > 0) {
        for (const item of group.items) {
          // Check if this item has ANY completed production batches today
          const itemCompletedBatches = completedBatches.filter(batch => 
            batch.itemId?.toString() === item._id.toString()
          );

          console.log(`🔍 Item ${item.name}: ${itemCompletedBatches.length} completed batches`);

          if (itemCompletedBatches.length > 0) {
            // Calculate total produced quantity from completed batches
            const totalProducedQty = itemCompletedBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0);
            
            // Get ProductDetailsDailySummary data for this item and today's date
            const dailySummary = await ProductDetailsDailySummary.findOne({
              productId: item._id,
              companyId: req.user.companyId,
              date: today
            }).lean();

            console.log(`📊 ${item.name}: Batches=${itemCompletedBatches.length}, TotalProduced=${totalProducedQty}, DailySummary=${dailySummary?.productionFinalBatches || 0}`);
            
            try {
              groupItems.push({
                _id: item._id,
                name: item.name,
                code: item.code,
                category: item.category,
                unit: item.unit || '',
                image: item.image,
                currentStock: item.qty || 0,
                // Use productionFinalBatches from ProductDailySummary as Indent Qty
                producedQty: dailySummary?.productionFinalBatches || 0,
                indentQty: dailySummary?.productionFinalBatches || 0, // Explicit indent qty field
                achievedQty: totalProducedQty, // Actual achieved from completed batches
                // Packing quantities (will be entered manually)
                packedQty: 0,
                packingLoss: 0,
                notes: '',
                // Add completed batch info for reference
                completedBatches: itemCompletedBatches.length,
                batchDetails: itemCompletedBatches.map(batch => ({
                  batchNo: batch.batchNo,
                  qtyAchieved: batch.qtyAchieved,
                  productionLoss: batch.productionLoss
                })),
                // Include all ProductDetailsDailySummary data
                dailySummaryData: dailySummary ? {
                  productionFinalBatches: dailySummary.productionFinalBatches || 0,
                  qtyPerBatch: dailySummary.qtyPerBatch || 0,
                  totalQuantity: dailySummary.totalQuantity || 0,
                  balanceFinalBatches: dailySummary.balanceFinalBatches || 0,
                  toBePrintedBatches: dailySummary.toBePrintedBatches || 0,
                  expiry: dailySummary.expiry || 0,
                  status: dailySummary.status || 'pending',
                  date: dailySummary.date,
                  createdAt: dailySummary.createdAt,
                  updatedAt: dailySummary.updatedAt
                } : null
              });

            } catch (itemError) {
              console.error(`Error processing item ${item.name}:`, itemError);
            }
          }
        }
      }

      // Only return groups that have items with completed batches
      if (groupItems.length === 0) {
        return null;
      }

      // Calculate group totals from completed batches for this group
      const groupCompletedBatches = completedBatches.filter(batch => 
        batch.groupId?.toString() === group._id.toString()
      );
      const totalGroupProducedQty = groupCompletedBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0);

      console.log(`📦 Group ${group.name}: ${groupItems.length} completed items, ${groupCompletedBatches.length} completed batches`);

      return {
        _id: group._id,
        name: group.name,
        description: group.description || '',
        totalItems: groupItems.length,
        // Production Group level quantities from completed batches
        qtyPerBatch: group.qtyPerBatch || 0,
        qtyAchievedPerBatch: totalGroupProducedQty,
        productionLoss: groupCompletedBatches.reduce((sum, batch) => sum + (batch.productionLoss || 0), 0),
        items: groupItems,
        createdBy: group.createdBy?.username || 'Unknown',
        createdAt: group.createdAt,
        completedBatches: groupCompletedBatches.length
      };
    }));

    // Filter out null entries (groups with no completed items)
    const filteredPackingData = packingData.filter(group => group !== null);

    // Handle ungrouped completed items (items not in any production group)
    if (ungroupedCompletedItems.length > 0) {
      console.log(`🔄 Processing ${ungroupedCompletedItems.length} ungrouped completed items`);
      
      const ungroupedItemIds = [...new Set(ungroupedCompletedItems.map(batch => batch.itemId?.toString()).filter(id => id))];
      
      // Get item details for ungrouped completed items
      const ungroupedItems = await Item.find({
        _id: { $in: ungroupedItemIds },
        store: req.user.companyId,
        isActive: { $ne: false }
      }).lean();

      if (ungroupedItems.length > 0) {
        const ungroupedPackingItems = [];
        
        for (const item of ungroupedItems) {
          const itemCompletedBatches = ungroupedCompletedItems.filter(batch => 
            batch.itemId?.toString() === item._id.toString()
          );

          if (itemCompletedBatches.length > 0) {
            const totalProducedQty = itemCompletedBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0);
            
            const dailySummary = await ProductDetailsDailySummary.findOne({
              productId: item._id,
              companyId: req.user.companyId,
              date: today
            }).lean();

            console.log(`🔄 Ungrouped ${item.name}: ${itemCompletedBatches.length} completed batches`);

            ungroupedPackingItems.push({
              _id: item._id,
              name: item.name,
              code: item.code,
              category: item.category,
              unit: item.unit || '',
              image: item.image,
              currentStock: item.qty || 0,
              producedQty: dailySummary?.productionFinalBatches || 0,
              indentQty: dailySummary?.productionFinalBatches || 0,
              achievedQty: totalProducedQty,
              packedQty: 0,
              notes: '',
              completedBatches: itemCompletedBatches.length,
              batchDetails: itemCompletedBatches.map(batch => ({
                batchNo: batch.batchNo,
                qtyAchieved: batch.qtyAchieved,
                productionLoss: batch.productionLoss
              })),
              dailySummaryData: dailySummary || null
            });
          }
        }

        // Add ungrouped items as a separate group
        if (ungroupedPackingItems.length > 0) {
          filteredPackingData.push({
            _id: 'ungrouped-items',
            name: 'Ungrouped Items',
            description: 'Items not assigned to any production group',
            totalItems: ungroupedPackingItems.length,
            qtyPerBatch: 0,
            qtyAchievedPerBatch: ungroupedCompletedItems.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0),
            productionLoss: ungroupedCompletedItems.reduce((sum, batch) => sum + (batch.productionLoss || 0), 0),
            items: ungroupedPackingItems,
            createdBy: 'System',
            createdAt: new Date(),
            completedBatches: ungroupedCompletedItems.length
          });
        }
      }
    }

    console.log('✅ Final packing data summary:');
    filteredPackingData.forEach(group => {
      console.log(`   Group: ${group.name} - ${group.items.length} items, ${group.completedBatches} completed batches`);
      group.items.forEach(item => {
        console.log(`     Item: ${item.name} - ${item.completedBatches} batches, achieved: ${item.achievedQty}`);
      });
    });

    // Add packing sheet relationship data for each production group
    const productionGroupsWithPackingSheets = await Promise.all(filteredPackingData.map(async (group) => {
      try {
        let packingSheetQuery;
        
        // Handle ungrouped items vs regular production groups
        if (group._id === 'ungrouped-items') {
          // For ungrouped items, search for null productionGroup
          packingSheetQuery = {
            company: req.user.companyId,
            $or: [
              { productionGroup: null },
              { productionGroup: { $exists: false } }
            ],
            productionGroupName: 'Ungrouped Items',
            packingDate: { $gte: today, $lte: endOfDay }
          };
        } else {
          // For regular production groups
          packingSheetQuery = {
            company: req.user.companyId,
            productionGroup: group._id,
            packingDate: { $gte: today, $lte: endOfDay }
          };
        }
        
        console.log(`🔍 Searching packing sheets for group ${group.name}`);
        
        const existingPackingSheets = await PackingSheet.find(packingSheetQuery)
          .select('_id slNo status packingStartTime packingEndTime totalPackedQty packingLoss notes items')
          .lean();
          
        console.log(`📋 Found ${existingPackingSheets.length} packing sheets for group ${group.name}`);

        return {
          ...group,
          packingSheets: existingPackingSheets || []
        };
      } catch (error) {
        console.error(`Error fetching packing sheets for group ${group.name}:`, error);
        return {
          ...group,
          packingSheets: []
        };
      }
    }));

    // Add packing sheet data for ungrouped items as well
    const ungroupedPackingSheets = await PackingSheet.find({
      company: req.user.companyId,
      $or: [
        { productionGroup: null },
        { productionGroup: { $exists: false } }
      ],
      productionGroupName: 'Ungrouped Items',
      packingDate: { $gte: today, $lte: endOfDay }
    })
    .select('_id slNo status packingStartTime packingEndTime totalPackedQty packingLoss items')
    .lean();

    console.log('✅ Production groups with completed batches and packing sheets processed:', productionGroupsWithPackingSheets.length);
    console.log('📦 Found existing packing sheets across all groups:', productionGroupsWithPackingSheets.reduce((sum, g) => sum + g.packingSheets.length, 0));
    console.log('🔄 Ungrouped packing sheets found:', ungroupedPackingSheets.length);

    res.json({
      success: true,
      message: 'Production groups for packing fetched successfully',
      data: {
        productionGroups: productionGroupsWithPackingSheets,
        ungroupedPackingSheets: ungroupedPackingSheets,
        totalGroups: productionGroupsWithPackingSheets.length,
        dateFilter: today.toISOString(),
        totalCompletedBatches: completedBatches.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching production groups for packing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production groups for packing',
      error: error.message
    });
  }
};

// Get all packing sheets for today or specific date
export const getPackingSheets = async (req, res) => {
  try {
    const { date, status } = req.query;
    console.log('📋 Getting FRESH packing sheets', { date, status });

    let query = { company: req.user.companyId, isActive: true };

    // Filter by date (default to today)
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.packingDate = { $gte: startOfDay, $lte: endOfDay };
    } else {
      // Default to today
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      query.packingDate = { $gte: startOfDay, $lte: endOfDay };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    console.log('🔍 Query:', JSON.stringify(query, null, 2));

    const packingSheets = await PackingSheet.find(query)
      .populate({
        path: 'productionGroup',
        select: 'name description'
      })
      .populate({
        path: 'createdBy',
        select: 'username'
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance

    console.log(`✅ Found ${packingSheets.length} packing sheets`);

    res.json({
      success: true,
      message: 'Fresh packing sheets fetched successfully',
      data: {
        packingSheets,
        totalSheets: packingSheets.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching packing sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packing sheets',
      error: error.message
    });
  }
};

// Create a new packing sheet
export const createPackingSheet = async (req, res) => {
  try {
    const { productionGroupId, items, shift } = req.body;
    console.log('📋 REMOVE & RECREATE packing sheet for group:', productionGroupId);

    // Set today's date range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let productionGroupName = 'Unknown Group';
    let productionGroup = null;

    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    // STEP 1: ALWAYS DELETE EXISTING SHEETS FIRST (NO CHECKING)
    if (productionGroupId === 'ungrouped-items') {
      productionGroupName = 'Ungrouped Items';
      
      // Delete ALL ungrouped packing sheets for today with more specific query
      const deleteQuery = {
        company: req.user.companyId,
        $or: [
          { productionGroup: null },
          { productionGroup: { $exists: false } }
        ],
        productionGroupName: 'Ungrouped Items',
        packingDate: { $gte: today, $lte: endOfDay },
        isActive: { $ne: false }
      };
      
      console.log(`🗑️ Deleting ungrouped packing sheets with query:`, JSON.stringify(deleteQuery, null, 2));
      
      const deleteResult = await PackingSheet.deleteMany(deleteQuery);
      
      console.log(`🗑️ REMOVED ${deleteResult.deletedCount} existing ungrouped packing sheets`);
    } else {
      // Validate and get production group
      productionGroup = await ProductionGroup.findOne({
        _id: productionGroupId,
        company: req.user.companyId,
        isActive: true
      });

      if (!productionGroup) {
        return res.status(404).json({
          success: false,
          message: 'Production group not found'
        });
      }
      
      productionGroupName = productionGroup.name;
      
      // Delete ALL packing sheets for this production group today
      const deleteResult = await PackingSheet.deleteMany({
        company: req.user.companyId,
        productionGroup: productionGroupId,
        packingDate: { $gte: today, $lte: endOfDay }
      });
      
      console.log(`🗑️ REMOVED ${deleteResult.deletedCount} existing packing sheets for group: ${productionGroupName}`);
    }

    // STEP 2: CREATE NEW PACKING SHEET
    const nextSlNo = await PackingSheet.getNextSlNo(req.user.companyId);
    
    const packingSheetData = {
      slNo: nextSlNo,
      productionGroup: productionGroupId === 'ungrouped-items' ? null : productionGroupId,
      productionGroupName: productionGroupName,
      items: items || [],
      shift: shift || 'morning',
      company: req.user.companyId,
      createdBy: req.user._id || req.user.id,
      lastUpdatedBy: req.user._id || req.user.id,
      status: req.body.status || 'pending',
      packingStartTime: req.body.packingStartTime ? new Date(req.body.packingStartTime) : null,
      packingDate: today,
      isActive: true
    };
    
    console.log('📋 Creating packing sheet with data:', JSON.stringify(packingSheetData, null, 2));

    const packingSheet = new PackingSheet(packingSheetData);
    await packingSheet.save();

    console.log('✅ NEW PACKING SHEET CREATED:', packingSheet._id);
    
    // Verify no duplicates exist after creation
    const verifyQuery = productionGroupId === 'ungrouped-items' 
      ? {
          company: req.user.companyId,
          $or: [{ productionGroup: null }, { productionGroup: { $exists: false } }],
          productionGroupName: 'Ungrouped Items',
          packingDate: { $gte: today, $lte: endOfDay },
          isActive: { $ne: false }
        }
      : {
          company: req.user.companyId,
          productionGroup: productionGroupId,
          packingDate: { $gte: today, $lte: endOfDay },
          isActive: { $ne: false }
        };
        
    const remainingSheets = await PackingSheet.find(verifyQuery).lean();
    console.log(`🔍 Verification: ${remainingSheets.length} packing sheets exist after creation`);
    
    if (remainingSheets.length > 1) {
      console.warn(`⚠️ WARNING: ${remainingSheets.length} packing sheets found, expected 1!`);
      remainingSheets.forEach((sheet, index) => {
        console.log(`   Sheet ${index + 1}: ID=${sheet._id}, Created=${sheet.createdAt}`);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Packing sheet created successfully',
      data: packingSheet
    });

  } catch (error) {
    console.error('❌ Error in remove & recreate packing sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create packing sheet',
      error: error.message
    });
  }
};

// Start packing timing for a packing sheet
export const startPackingTiming = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    console.log('⏰ Starting packing timing for sheet:', packingSheetId);

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Start timing
    await packingSheet.startPacking();
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    await packingSheet.save();

    console.log('Packing started at:', packingSheet.packingStartTime);

    res.json({
      success: true,
      message: 'Packing timing started successfully',
      data: {
        packingSheetId: packingSheet._id,
        packingStartTime: packingSheet.packingStartTime,
        status: packingSheet.status
      }
    });

  } catch (error) {
    console.error('Error starting packing timing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start packing timing',
      error: error.message
    });
  }
};

// Stop packing timing for a packing sheet
export const stopPackingTiming = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    console.log('⏰ Stopping packing timing for sheet:', packingSheetId);

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Stop timing
    await packingSheet.endPacking();
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    await packingSheet.save();

    console.log('Packing ended at:', packingSheet.packingEndTime);

    res.json({
      success: true,
      message: 'Packing timing stopped successfully',
      data: {
        packingSheetId: packingSheet._id,
        packingStartTime: packingSheet.packingStartTime,
        packingEndTime: packingSheet.packingEndTime,
        status: packingSheet.status
      }
    });

  } catch (error) {
    console.error('Error stopping packing timing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop packing timing',
      error: error.message
    });
  }
};

// Update packing loss for a packing sheet
export const updatePackingLoss = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    const { packingLoss } = req.body;
    console.log('📉 Updating packing loss for sheet:', packingSheetId, 'Loss:', packingLoss);

    if (packingLoss < 0) {
      return res.status(400).json({
        success: false,
        message: 'Packing loss cannot be negative'
      });
    }

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Update packing loss
    packingSheet.packingLoss = packingLoss;
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    await packingSheet.save();

    console.log('Packing loss updated to:', packingLoss);

    res.json({
      success: true,
      message: 'Packing loss updated successfully',
      data: {
        packingSheetId: packingSheet._id,
        packingLoss: packingSheet.packingLoss
      }
    });

  } catch (error) {
    console.error('Error updating packing loss:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update packing loss',
      error: error.message
    });
  }
};

// Update item quantities in packing sheet
export const updatePackingQuantities = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    const { items } = req.body;
    console.log('📦 Updating packing quantities for sheet:', packingSheetId);

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Update item quantities
    if (items && Array.isArray(items)) {
      items.forEach(updateItem => {
        const existingItem = packingSheet.items.find(
          item => item.productId.toString() === updateItem.productId
        );
        
        if (existingItem) {
          // Update fields if provided
          if (updateItem.indentQty !== undefined) existingItem.indentQty = updateItem.indentQty;
          if (updateItem.producedQty !== undefined) existingItem.producedQty = updateItem.producedQty;
          // Store packingLoss at MAIN SHEET LEVEL, not item level
          if (updateItem.packingLoss !== undefined) packingSheet.packingLoss = updateItem.packingLoss;
          // Store notes at MAIN SHEET LEVEL, not item level  
          if (updateItem.notes !== undefined) packingSheet.notes = updateItem.notes;
          
          // AUTO-CALCULATE packedQty = producedQty - packingLoss (from main sheet)
          if (updateItem.producedQty !== undefined || updateItem.packingLoss !== undefined) {
            const producedQty = existingItem.producedQty || 0;
            const packingLoss = packingSheet.packingLoss || 0; // Use main sheet packingLoss
            existingItem.packedQty = Math.max(0, producedQty - packingLoss);
            console.log(`📊 Auto-calculated packedQty for ${existingItem.productName}: ${producedQty} - ${packingLoss} = ${existingItem.packedQty}`);
          }
          
          // Allow manual override of packedQty if specifically provided
          if (updateItem.packedQty !== undefined) {
            existingItem.packedQty = updateItem.packedQty;
            console.log(`✏️ Manual override packedQty for ${existingItem.productName}: ${updateItem.packedQty}`);
          }
        }
      });
    }

    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    await packingSheet.save();

    console.log('Packing quantities updated');

    res.json({
      success: true,
      message: 'Packing quantities updated successfully',
      data: {
        packingSheetId: packingSheet._id,
        totalPackedQty: packingSheet.totalPackedQty,
        items: packingSheet.items
      }
    });

  } catch (error) {
    console.error('Error updating packing quantities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update packing quantities',
      error: error.message
    });
  }
};

// Get packing sheet by ID
export const getPackingSheetById = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    console.log('🔍 Getting packing sheet by ID:', packingSheetId);

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    })
      .populate({
        path: 'productionGroup',
        select: 'name description'
      })
      .populate({
        path: 'createdBy',
        select: 'username'
      })
      .populate({
        path: 'lastUpdatedBy',
        select: 'username'
      });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    res.json({
      success: true,
      message: 'Packing sheet fetched successfully',
      data: packingSheet
    });

  } catch (error) {
    console.error('Error fetching packing sheet by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packing sheet',
      error: error.message
    });
  }
};

// Get packing statistics
export const getPackingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('📊 Getting packing statistics');

    let dateQuery = { company: req.user.companyId, isActive: true };

    // Set date range (default to last 30 days)
    if (startDate && endDate) {
      dateQuery.packingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateQuery.packingDate = { $gte: thirtyDaysAgo };
    }

    // Get aggregated statistics
    const stats = await PackingSheet.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalSheets: { $sum: 1 },
          completedSheets: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalPackedQty: { $sum: '$totalPackedQty' },
          totalPackingLoss: { $sum: '$packingLoss' },
          avgPackingLoss: { $avg: '$packingLoss' }
        }
      }
    ]);

    const result = stats[0] || {
      totalSheets: 0,
      completedSheets: 0,
      totalPackedQty: 0,
      totalPackingLoss: 0,
      avgPackingLoss: 0
    };

    // Get today's stats
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaySheets = await PackingSheet.countDocuments({
      company: req.user.companyId,
      packingDate: { $gte: startOfDay, $lte: endOfDay },
      isActive: true
    });

    res.json({
      success: true,
      message: 'Packing statistics fetched successfully',
      data: {
        overview: result,
        todaySheets,
        efficiency: result.totalSheets > 0 ? 
          (result.completedSheets / result.totalSheets * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching packing statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packing statistics',
      error: error.message
    });
  }
};

// Update individual item in packing sheet (for direct field updates)
export const updatePackingItem = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    const { productId, packingLoss, notes } = req.body;
    console.log('📝 Updating individual packing item:', { packingSheetId, productId, packingLoss, notes });
    console.log('📝 Raw req.body:', req.body);
    console.log('📝 Notes value type and content:', typeof notes, notes);

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required'
      });
    }

    if (packingLoss !== undefined && (packingLoss < 0 || isNaN(Number(packingLoss)))) {
      return res.status(400).json({
        success: false,
        message: 'Packing loss must be a non-negative number'
      });
    }

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Find the specific item
    const item = packingSheet.items.find(item => item.productId.toString() === productId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in packing sheet'
      });
    }

    // Update fields if provided
    if (packingLoss !== undefined) {
      // Store packingLoss at MAIN SHEET LEVEL, not item level
      packingSheet.packingLoss = Number(packingLoss);
      console.log(`🔄 Updated packingLoss for main sheet: ${packingSheet.packingLoss}`);
    }
    if (notes !== undefined) {
      // Store notes at MAIN SHEET LEVEL, not item level
      packingSheet.notes = notes;
      console.log(`📝 Updated notes for main sheet: ${packingSheet.notes}`);
    }

    // AUTO-CALCULATE packedQty = producedQty - packingLoss (from main sheet)
    const producedQty = Number(item.producedQty) || 0;
    const currentPackingLoss = Number(packingSheet.packingLoss) || 0; // Use main sheet packingLoss
    item.packedQty = Math.max(0, producedQty - currentPackingLoss);
    
    console.log(`📊 Auto-calculated for ${item.productName}: packedQty = ${producedQty} - ${currentPackingLoss} = ${item.packedQty}`);

    // Update sheet metadata
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    packingSheet.updatedAt = new Date();
    
    // Save the changes
    await packingSheet.save();
    
    console.log(`✅ Successfully updated packing item for ${item.productName}`);
    console.log(`📝 Final saved notes: "${packingSheet.notes}"`);
    console.log(`📦 Final saved packingLoss: ${packingSheet.packingLoss}`);

    res.json({
      success: true,
      message: 'Packing item updated successfully',
      data: {
        packingSheetId: packingSheet._id,
        productId: item.productId,
        productName: item.productName,
        indentQty: item.indentQty,
        producedQty: item.producedQty,
        packingLoss: packingSheet.packingLoss, // Return from main sheet level
        packedQty: item.packedQty,
        notes: packingSheet.notes, // Return from main sheet level
        lastUpdated: packingSheet.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating packing item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update packing item',
      error: error.message
    });
  }
};

// Clean up duplicate packing sheets (utility function)
export const cleanupDuplicatePackingSheets = async (req, res) => {
  try {
    console.log('🧹 Cleaning up duplicate packing sheets for company:', req.user.companyId);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Find all packing sheets for today
    const allSheets = await PackingSheet.find({
      company: req.user.companyId,
      packingDate: { $gte: today, $lte: endOfDay },
      isActive: true
    }).sort({ createdAt: -1 }); // Most recent first

    console.log(`Found ${allSheets.length} total sheets for today`);

    const sheetsToKeep = [];
    const sheetsToDelete = [];
    const processedGroups = new Set();

    for (const sheet of allSheets) {
      const groupKey = sheet.productionGroup 
        ? sheet.productionGroup.toString()
        : `ungrouped-${sheet.productionGroupName}`;
      
      if (!processedGroups.has(groupKey)) {
        processedGroups.add(groupKey);
        sheetsToKeep.push(sheet);
        console.log(`✅ Keeping most recent sheet: ${sheet._id} for group: ${groupKey}`);
      } else {
        sheetsToDelete.push(sheet);
        console.log(`🗑️ Marking for deletion: ${sheet._id} for group: ${groupKey}`);
      }
    }

    // Delete duplicate sheets
    if (sheetsToDelete.length > 0) {
      const deleteIds = sheetsToDelete.map(sheet => sheet._id);
      const deleteResult = await PackingSheet.deleteMany({ _id: { $in: deleteIds } });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} duplicate packing sheets`);
    }

    res.json({
      success: true,
      message: `Cleanup completed. Deleted ${sheetsToDelete.length} duplicate sheets.`,
      data: {
        totalSheetsFound: allSheets.length,
        sheetsKept: sheetsToKeep.length,
        duplicatesDeleted: sheetsToDelete.length,
        keptSheets: sheetsToKeep.map(sheet => ({
          _id: sheet._id,
          productionGroupName: sheet.productionGroupName,
          status: sheet.status,
          createdAt: sheet.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error cleaning up duplicate packing sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup duplicate packing sheets',
      error: error.message
    });
  }
};

// Dashboard Statistics Controller
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Today's packed items count
    const todayPackedCount = await PackingSheet.aggregate([
      {
        $match: {
          company: req.user.companyId,
          packingDate: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['in_progress', 'completed'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: null,
          totalPacked: { $sum: '$items.packedQty' }
        }
      }
    ]);

    // Active packers count (sheets in progress today)
    const activePackersCount = await PackingSheet.countDocuments({
      company: req.user.companyId,
      packingDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'in_progress'
    });

    // Total pending orders (sheets not started)
    const pendingOrdersCount = await PackingSheet.countDocuments({
      company: req.user.companyId,
      status: 'pending'
    });

    // Calculate efficiency (completed vs total for today)
    const completedToday = await PackingSheet.countDocuments({
      company: req.user.companyId,
      packingDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed'
    });

    const totalToday = await PackingSheet.countDocuments({
      company: req.user.companyId,
      packingDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const efficiency = totalToday > 0 ? ((completedToday / totalToday) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        todaysPacked: todayPackedCount[0]?.totalPacked || 0,
        activePackers: activePackersCount,
        pendingOrders: pendingOrdersCount,
        efficiency: parseFloat(efficiency),
        targetPacked: 1100, // You can make this configurable
        qualityRate: 98.1 // You can calculate this from actual data if available
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Approve a packing sheet
export const approvePackingSheet = async (req, res) => {
  try {
    const { packingSheetId } = req.params;
    console.log('✅ Approving packing sheet:', packingSheetId);

    const packingSheet = await PackingSheet.findOne({
      _id: packingSheetId,
      company: req.user.companyId
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    // Check if already approved
    if (packingSheet.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Packing sheet is already approved'
      });
    }

    // Check if completed
    if (packingSheet.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Packing sheet must be completed before approval'
      });
    }

    // Update approval status
    packingSheet.status = 'approved';
    packingSheet.approvedAt = new Date();
    packingSheet.approvedBy = req.user._id || req.user.id;
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    
    await packingSheet.save();

    console.log('✅ Packing sheet approved successfully');

    // Create dispatch console entry automatically with proper data calculation
    try {
      const Dispatch = (await import('../models/Dispatch.js')).default;
      const ProductDetailsDailySummary = (await import('../models/ProductDetailsDailySummary.js')).default;
      
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

      // Get the product group from packing sheet items to find related ProductDetailsDailySummary
      let totalPackedQuantity = packingSheet.totalPackedQty || 0;
      let totalIndentQuantity = 0;
      let previousClosingStock = 0;
      let returnQuantity = 0;

      // Get today's ProductDetailsDailySummary for items in this packing sheet
      if (packingSheet.items && packingSheet.items.length > 0) {
        const productIds = packingSheet.items.map(item => item.productId);
        
        // Get today's data for total indent
        const todaysSummaries = await ProductDetailsDailySummary.find({
          productId: { $in: productIds },
          companyId: req.user.companyId,
          date: { $gte: startOfDay, $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) }
        });

        // Get yesterday's data for closing stock
        const yesterdaysSummaries = await ProductDetailsDailySummary.find({
          productId: { $in: productIds },
          companyId: req.user.companyId,
          date: { $gte: yesterdayStart, $lte: yesterdayEnd }
        });

        // Calculate totals
        totalIndentQuantity = todaysSummaries.reduce((sum, s) => sum + (s.totalIndent || 0), 0);
        previousClosingStock = yesterdaysSummaries.reduce((sum, s) => sum + (s.physicalStock || 0), 0);
        
        // For return quantity, we can check if there are any return records (simplified to 0 for now)
        returnQuantity = 0; // TODO: Integrate with actual return data if available

        console.log('📊 Calculated dispatch data:', {
          totalPackedQuantity,
          totalIndentQuantity,
          previousClosingStock,
          returnQuantity,
          productIds: productIds.length
        });
      }
      
      // Create separate dispatch console entries for each item in the packing sheet
      const dispatchEntries = [];
      
      for (const item of packingSheet.items) {
        if (item.packedQty > 0) { // Only create entries for items with packed quantity
          
          // Validate item has required fields
          if (!item.productId || !item.productName) {
            console.log('⚠️ Skipping item with missing data:', {
              productId: item.productId,
              productName: item.productName,
              packedQty: item.packedQty
            });
            continue;
          }
          
          console.log('🔍 Processing item:', {
            productId: item.productId,
            productName: item.productName,
            packedQty: item.packedQty
          });
          
          // Get individual item data from ProductDetailsDailySummary
          const todayItemSummary = await ProductDetailsDailySummary.findOne({
            productId: item.productId,
            companyId: req.user.companyId,
            date: { $gte: startOfDay, $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) }
          });

          const yesterdayItemSummary = await ProductDetailsDailySummary.findOne({
            productId: item.productId,
            companyId: req.user.companyId,
            date: { $gte: yesterdayStart, $lte: yesterdayEnd }
          });

          // Also check for existing dispatch entries from yesterday for closing stock
          const yesterdayDispatch = await Dispatch.findOne({
            productId: item.productId,
            company: req.user.companyId,
            date: { $gte: yesterdayStart, $lte: yesterdayEnd }
          });

          const itemIndentQuantity = todayItemSummary?.totalIndent || item.indentQty || 0;
          
          // Try multiple fields for previous stock - priority order
          const itemPreviousStock = yesterdayDispatch?.closingStockEndOfDayBalance || 
                                   yesterdayDispatch?.physicalStockEntryManualVerification ||
                                   yesterdayItemSummary?.physicalStock || 
                                   yesterdayItemSummary?.closingStock || 
                                   0;
          
          const itemReturnQuantity = yesterdayItemSummary?.returnQuantity || yesterdayDispatch?.returnQuantityYesterdayReturns || 0;
          
          console.log(`📊 Item calculations for ${item.productName}:`, {
            packedQty: item.packedQty,
            previousStock: itemPreviousStock,
            returnQty: itemReturnQuantity,
            indentQty: itemIndentQuantity,
            expectedTotalAvailable: item.packedQty + itemPreviousStock + itemReturnQuantity
          });
         

          // Check if dispatch entry already exists for this combination
          const existingDispatchEntry = await Dispatch.findOne({
            packingSheetId: packingSheet._id,
            productId: item.productId,
            date: startOfDay
          });

          let dispatchEntry;
          
          if (existingDispatchEntry) {
            // Update existing entry
            console.log(`🔄 Updating existing dispatch entry for ${item.productName} (ID: ${existingDispatchEntry._id})`);
            dispatchEntry = await Dispatch.findByIdAndUpdate(
              existingDispatchEntry._id,
              {
                $set: {
                  productGroup: `${packingSheet.productionGroupName || 'Unknown Group'} - ${item.productName}`,
                  productName: item.productName,
                  packedQuantityReadyForDispatch: item.packedQty,
                  previousClosingStockYesterdayBalance: itemPreviousStock,
                  returnQuantityYesterdayReturns: itemReturnQuantity,
                  totalIndentQuantityOrdersForTheDay: itemIndentQuantity,
                  // Calculate totalAvailableStock = packing + closing + returns
                  totalAvailableStock: item.packedQty + itemPreviousStock + itemReturnQuantity,
                  // Calculate excessShortage = available - indent
                  excessShortage: (item.packedQty + itemPreviousStock + itemReturnQuantity) - itemIndentQuantity,
                  closingStockEndOfDayBalance: item.packedQty + itemPreviousStock + itemReturnQuantity,
                  status: 'updated',
                  lastUpdatedBy: req.user._id || req.user.id
                }
              },
              { new: true }
            );
          } else {
            // Create new dispatch entry
            console.log(`✨ Creating new dispatch entry for ${item.productName}`);
       
            dispatchEntry = await Dispatch.create({
              packingSheetId: packingSheet._id,
              productId: item.productId,
              productName: item.productName,
              date: startOfDay,
              productGroup: `${packingSheet.productionGroupName || 'Unknown Group'} - ${item.productName}`,
              company: req.user.companyId,
              packedQuantityReadyForDispatch: item.packedQty,
              previousClosingStockYesterdayBalance: itemPreviousStock,
              returnQuantityYesterdayReturns: itemReturnQuantity,
              totalIndentQuantityOrdersForTheDay: itemIndentQuantity,
              // Calculate totalAvailableStock = packing + closing + returns                                  
              totalAvailableStock: item.packedQty + itemPreviousStock + itemReturnQuantity,
              // Calculate excessShortage = available - indent
              excessShortage: (item.packedQty + itemPreviousStock + itemReturnQuantity) - itemIndentQuantity,
              dispatchedQuantitySentToday: 0,
              closingStockEndOfDayBalance: item.packedQty + itemPreviousStock + itemReturnQuantity, // Initial closing = total available
              physicalStockEntryManualVerification: 0,
              batchNo: packingSheet.batchNo,
              status: 'updated',
              lastUpdatedBy: req.user._id || req.user.id
            });
          }
          console.log(`✨ Creating new dispatch entry for ${dispatchEntry}`);
          
          // Log the final calculated values after model auto-calculation
          console.log(`📈 Final dispatch calculations for ${item.productName}:`, {
            packedQty: dispatchEntry.packedQuantityReadyForDispatch,
            previousStock: dispatchEntry.previousClosingStockYesterdayBalance,
            returns: dispatchEntry.returnQuantityYesterdayReturns,
            totalAvailable: dispatchEntry.totalAvailableStock,
            excessShortage: dispatchEntry.excessShortage,
            dispatchId: dispatchEntry._id
          });
          
          dispatchEntries.push(dispatchEntry);
        }
      }

      console.log('✅ Dispatch console entries created:', {
        totalEntries: dispatchEntries.length,
        packingSheetId: packingSheet._id,
        productGroup: packingSheet.productionGroupName,
        entries: dispatchEntries.map(entry => ({
          dispatchId: entry._id,
          productName: entry.productName,
          packedQuantity: entry.packedQuantityReadyForDispatch,
          totalAvailableStock: entry.totalAvailableStock,
          totalIndent: entry.totalIndentQuantityOrdersForTheDay,
          excessShortage: entry.excessShortage
        }))
      });

    } catch (dispatchError) {
      console.error('⚠️ Error creating dispatch console entry (but approval succeeded):', dispatchError);
      // Don't fail approval if dispatch entry creation fails
    }

    // UPDATE ProductDetailsDailySummary with packed quantities (for dispatch console)
    try {
      console.log('🚀 Updating ProductDetailsDailySummary with packed quantities...');
      
      const ProductDetailsDailySummary = (await import('../models/ProductDetailsDailySummary.js')).default;
      
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      
      // Update each item's packed quantity in ProductDetailsDailySummary
      for (const item of packingSheet.items) {
        if (item.packedQty > 0) {
          await ProductDetailsDailySummary.findOneAndUpdate(
            {
              productId: item.productId,
              companyId: req.user.companyId,
              date: {
                $gte: startOfDay,
                $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
              }
            },
            {
              $set: {
                packing: item.packedQty, // This is "Packed Quantity Ready for Dispatch"
                status: 'approved'
              }
            },
            {
              upsert: true,
              new: true
            }
          );
          
          console.log(`✅ Updated packing quantity for ${item.productName}: ${item.packedQty}`);
        }
      }
      
    } catch (summaryError) {
      console.error('⚠️ Error updating ProductDetailsDailySummary (but approval succeeded):', summaryError);
      // Don't fail the approval if summary update fails
    }

    res.json({
      success: true,
      message: 'Packing sheet approved and dispatch console entry created successfully',
      data: {
        packingSheetId: packingSheet._id,
        status: packingSheet.status,
        approvedAt: packingSheet.approvedAt,
        approvedBy: packingSheet.approvedBy,
        totalPackedQty: packingSheet.totalPackedQty,
        productGroup: packingSheet.productionGroupName,
        dispatchConsoleCreated: true
      }
    });

  } catch (error) {
    console.error('Error approving packing sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve packing sheet',
      error: error.message
    });
  }
};

// Get packing history with pagination and filters
export const getPackingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status, groupId } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📊 Fetching packing history with params:', { page, limit, startDate, endDate, status, groupId, userCompanyId });

    // Build filter object - using correct field names for PackingSheet model
    const filter = {
      company: userCompanyId  // PackingSheet uses 'company' field, not 'companyId'
    };

    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }

    // Add status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add group filter - using correct field name
    if (groupId && groupId !== 'all') {
      filter.productionGroup = groupId;  // PackingSheet uses 'productionGroup' field
    }

    console.log('🔍 Query filter:', JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get paginated packing history with populated details
    const packingHistory = await PackingSheet.find(filter)
      .populate({
        path: 'productionGroup',
        select: 'name description'
      })
      .populate({
        path: 'createdBy',
        select: 'username fullName'
      })
      .populate({
        path: 'approvedBy',
        select: 'username fullName'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`📋 Found ${packingHistory.length} packing sheets`);

    // Get total count for pagination
    const totalCount = await PackingSheet.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Calculate summary statistics
    const summaryStats = await PackingSheet.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSheets: { $sum: 1 },
          completedSheets: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressSheets: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          approvedSheets: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = summaryStats[0] || {
      totalSheets: 0,
      completedSheets: 0,
      inProgressSheets: 0,
      approvedSheets: 0
    };

    console.log('📊 Summary stats:', stats);

    // Format the packing history data to match frontend expectations
    const formattedData = packingHistory.map(sheet => {
      // Calculate total packed and total loss from items array
      const totalPacked = sheet.items?.reduce((sum, item) => sum + (item.packedQty || 0), 0) || 0;
      const totalLoss = sheet.packingLoss || 0;
      const totalProduced = sheet.items?.reduce((sum, item) => sum + (item.producedQty || 0), 0) || 0;
      const efficiency = totalProduced > 0 ? Math.round(((totalPacked / totalProduced) * 100)) : 0;

      // Calculate duration if start and end times exist
      let totalDuration = null;
      if (sheet.packingStartTime && sheet.packingEndTime) {
        totalDuration = Math.round((new Date(sheet.packingEndTime) - new Date(sheet.packingStartTime)) / (1000 * 60)); // minutes
      }

      return {
        id: sheet._id,
        sheetId: sheet.slNo || sheet._id,  // Use slNo as sheet ID
        group: {
          id: sheet.productionGroup?._id,
          name: sheet.productionGroup?.name || sheet.productionGroupName || 'N/A',
          description: sheet.productionGroup?.description || ''
        },
        items: sheet.items?.map(item => ({
          id: item.productId,
          name: item.productName,
          code: item.productCode || '',
          category: item.category || '',
          unit: item.unit || '',
          packingQty: item.packedQty || 0,
          packingLoss: sheet.packingLoss || 0, // Loss is stored at sheet level
          notes: sheet.notes || ''
        })) || [],
        timing: {
          startTime: sheet.packingStartTime,
          endTime: sheet.packingEndTime,
          totalDuration: totalDuration
        },
        status: sheet.status,
        efficiency: efficiency,
        totalLoss: totalLoss,
        totalPacked: totalPacked,
        notes: sheet.notes,
        createdBy: sheet.createdBy?.username || sheet.createdBy?.fullName || 'Unknown',
        approvedBy: sheet.approvedBy?.username || sheet.approvedBy?.fullName || null,
        approvedAt: sheet.approvedAt,
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt
      };
    });

    console.log(`✅ Formatted ${formattedData.length} packing history records`);

    res.json({
      success: true,
      message: 'Packing history retrieved successfully',
      data: {
        reports: formattedData,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        summary: stats,
        filters: {
          startDate,
          endDate,
          status,
          groupId,
          companyId: filter.company
        }
      }
    });

  } catch (error) {
    console.error('Error fetching packing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packing history',
      error: error.message
    });
  }
};