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

    // Set date for filtering - allow query parameter to override
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('🗓️ Filtering for date:', targetDate.toISOString(), '(query param:', req.query.date, ')');

    // Step 1: Get all completed ProductionBatch records for today
    // If you want to include pending batches, change the status filter
    const completedBatches = await ProductionBatch.find({
      companyId: req.user.companyId,
      productionDate: { 
        $gte: targetDate, 
        $lte: endOfDay 
      },
      status: { $in: ['completed'] }  // Include both completed and in-progress batches
    }).lean();

    console.log(`🏁 Found ${completedBatches.length} completed production batches for ${targetDate.toDateString()}`);
    console.log('🔍 Date range:', { targetDate: targetDate.toISOString(), endOfDay: endOfDay.toISOString() });
    console.log('🔍 Company ID:', req.user.companyId.toString());
    
    // Debug: Log ALL batch details to see what we're getting
    completedBatches.forEach((batch, index) => {
      console.log(`🔍 Batch ${index + 1}:`, {
        _id: batch._id.toString(),
        batchNo: batch.batchNo,
        status: batch.status,
        groupId: batch.groupId?.toString() || 'NO GROUP',
        itemId: batch.itemId?.toString() || 'NO ITEM',
        productionDate: batch.productionDate,
        qtyAchieved: batch.qtyAchieved,
        notes: batch.notes
      });
    });
    
    // Debug: Log the first few batches to see their structure
    if (completedBatches.length > 0) {
      console.log('🔍 Sample completed batch data:', JSON.stringify(completedBatches[0], null, 2));
      console.log('🔍 Completed batch keys:', Object.keys(completedBatches[0]));
      console.log('🔍 Batch _id:', completedBatches[0]._id);
      console.log('🔍 Batch companyId:', completedBatches[0].companyId);
      console.log('🔍 Batch itemId:', completedBatches[0].itemId);
    }

    if (completedBatches.length === 0) {
      return res.json({
        success: true,
        message: `No completed production batches found for ${targetDate.toDateString()}`,
        data: {
          productionGroups: [],
          totalGroups: 0
        }
      });
    }

    // Extract unique item IDs and group IDs from completed batches
    const completedItemIds = [...new Set(completedBatches.map(batch => batch.itemId?.toString()).filter(id => id))];
    const completedGroupIds = [...new Set(completedBatches.map(batch => batch.groupId?.toString()).filter(id => id && id !== 'null'))];

    console.log('📋 Completed item IDs:', completedItemIds.length, completedItemIds);
    console.log('📋 Completed group IDs:', completedGroupIds.length, completedGroupIds);
    console.log('🔍 Completed batches details:', completedBatches.map(b => ({
      itemId: b.itemId?.toString(),
      groupId: b.groupId?.toString(),
      batchNo: b.batchNo,
      qtyAchieved: b.qtyAchieved,
      status: b.status
    })));

    // Get ALL production groups from user's company - filter only those with completed batches
    const allProductionGroups = await ProductionGroup.find({
      isActive: true,
      company: req.user.companyId,
      _id: { $in: completedGroupIds } // Only get groups that have completed batches
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

    console.log(`📦 Found ${allProductionGroups.length} production groups with completed batches`);

    // Identify items that need to be in groups (either existing groups or individual groups)
    const itemsInGroups = new Set();
    
    // First, handle existing production groups with completed batches
    const packingData = [];
    
    for (const group of allProductionGroups) {
      // Get all batches for this group (regardless of itemId since GROUP batches may not have itemId)
      const groupCompletedBatches = completedBatches.filter(batch => 
        batch.groupId?.toString() === group._id.toString()
      );
      
      console.log(`📦 Processing group "${group.name}": ${groupCompletedBatches.length} completed batches`);
      
      if (groupCompletedBatches.length === 0) {
        console.log(`⏭️ Skipping group "${group.name}" - no completed batches`);
        continue;
      }
      
      const groupItems = [];
      const totalGroupAchievedQty = groupCompletedBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0);
      const totalGroupLoss = groupCompletedBatches.reduce((sum, batch) => sum + (batch.productionLoss || 0), 0);
      
      // For GROUP batches (which don't have itemId), create ONE combined item for the entire group
      // This prevents duplicates where each product gets all batches
      
      // Get first item for display purposes (group name already shows on parent)
      const displayItem = group.items && group.items.length > 0 ? group.items[0] : null;
      
      if (displayItem) {
        // Get ProductDetailsDailySummary for the first item as representative
        const dailySummary = await ProductDetailsDailySummary.findOne({
          productId: displayItem._id,
          companyId: req.user.companyId,
          date: targetDate
        }).lean();

        console.log(`📊 Creating combined item for group ${group.name} with ${groupCompletedBatches.length} batches`);
        
        // Create ONE combined item for all batches in the group
        groupItems.push({
          _id: displayItem._id,
          name: group.name, // Use group name instead of individual item name
          code: displayItem.code,
          category: displayItem.category,
          unit: displayItem.unit || '',
          image: displayItem.image,
          currentStock: displayItem.qty || 0,
          producedQty: dailySummary?.productionFinalBatches || 0,
          indentQty: dailySummary?.productionFinalBatches || 0,
          achievedQty: totalGroupAchievedQty,
          packedQty: 0,
          packingLoss: 0,
          notes: '',
          completedBatches: groupCompletedBatches.length,
          batchDetails: await Promise.all(groupCompletedBatches.map(async (batch) => {
            try {
              const batchPackingSheets = await PackingSheet.find({
                $or: [
                  { batchId: batch._id },
                  { batchNo: batch.batchNo }
                ],
                company: req.user.companyId,
                packingDate: { $gte: targetDate, $lte: endOfDay }
              }).lean() || [];

              return {
                _id: batch._id,
                batchNo: batch.batchNo,
                    qtyAchieved: batch.qtyAchieved,
                    productionLoss: batch.productionLoss,
                    status: 'completed',
                    companyId: batch.companyId,
                    itemId: batch.itemId,
                    groupId: batch.groupId,
                    productionDate: batch.productionDate,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                    // Include packing sheets array for this individual batch
                    packingSheets: Array.isArray(batchPackingSheets) ? batchPackingSheets.map(sheet => ({
                      _id: sheet._id,
                      packingStartTime: sheet.packingStartTime,
                      packingEndTime: sheet.packingEndTime,
                      packingLoss: sheet.packingLoss || 0,
                      packedQty: sheet.packedQty || batch.qtyAchieved || 0,
                      notes: sheet.notes || '',
                      status: sheet.status || 'pending',
                      isApproved: sheet.isApproved || false,
                      createdAt: sheet.createdAt,
                      updatedAt: sheet.updatedAt
                    })) : []
                  };
                } catch (error) {
                  console.error('Error processing batch in group:', batch._id, error);
                  return {
                    _id: batch._id,
                    batchNo: batch.batchNo,
                    qtyAchieved: batch.qtyAchieved,
                    productionLoss: batch.productionLoss,
                    status: 'completed',
                    companyId: batch.companyId,
                    itemId: batch.itemId,
                    groupId: batch.groupId,
                    productionDate: batch.productionDate,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                    packingSheets: []
                  };
                }
              })),
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
      }

      // Add group since we already filtered to only groups with completed batches
      if (groupItems.length > 0) {
        console.log(`📦 Adding group ${group.name}: ${groupItems.length} items, ${groupCompletedBatches.length} completed batches`);

        packingData.push({
          _id: group._id,
          name: group.name,
          description: group.description || '',
          totalItems: groupItems.length,
          qtyPerBatch: group.qtyPerBatch || 0,
          qtyAchievedPerBatch: totalGroupAchievedQty,
          productionLoss: totalGroupLoss,
          items: groupItems,
          createdBy: group.createdBy?.username || 'Unknown',
          createdAt: group.createdAt,
          completedBatches: groupCompletedBatches.length
        });
      } else {
        console.log(`⚠️ Group ${group.name} has no items - skipping`);
      }
    }

    // Now handle items that completed production but are NOT in existing groups
    // Each of these should get their own individual group (no more "ungrouped items")
    const ungroupedItemIds = completedItemIds.filter(itemId => !itemsInGroups.has(itemId));
    
    if (ungroupedItemIds.length > 0) {
      console.log(`🔄 Found ${ungroupedItemIds.length} items with completed batches but not in existing groups - creating individual groups`);
      
      // Get item details for these items
      const ungroupedItems = await Item.find({
        _id: { $in: ungroupedItemIds },
        store: req.user.companyId,
        isActive: { $ne: false }
      }).lean();

      // Create individual groups for each item (don't lump them into "ungrouped")
      for (const item of ungroupedItems) {
        const itemCompletedBatches = completedBatches.filter(batch => 
          batch.itemId?.toString() === item._id.toString()
        );

        if (itemCompletedBatches.length > 0) {
          const totalAchievedQty = itemCompletedBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0);
          const totalProductionLoss = itemCompletedBatches.reduce((sum, batch) => sum + (batch.productionLoss || 0), 0);
          
          const dailySummary = await ProductDetailsDailySummary.findOne({
            productId: item._id,
            companyId: req.user.companyId,
            date: targetDate
          }).lean();

          console.log(`✨ Creating individual group for ${item.name}: ${itemCompletedBatches.length} batches, total achieved: ${totalAchievedQty}`);
          
          // Create individual group for this item (use a unique ID)
          const individualGroupId = `individual-${item._id}`;
          
          packingData.push({
            _id: individualGroupId,
            name: item.name, // Use item name as group name
            description: `Individual production group for ${item.name}`,
            totalItems: 1,
            qtyPerBatch: 0,
            qtyAchievedPerBatch: totalAchievedQty,
            productionLoss: totalProductionLoss,
            items: [{
              _id: item._id,
              name: item.name,
              code: item.code,
              category: item.category,
              unit: item.unit || '',
              image: item.image,
              currentStock: item.qty || 0,
              producedQty: dailySummary?.productionFinalBatches || 0,
              indentQty: dailySummary?.productionFinalBatches || 0,
              achievedQty: totalAchievedQty,
              packedQty: 0,
              packingLoss: 0,
              notes: '',
              completedBatches: itemCompletedBatches.length,
              batchDetails: await Promise.all(itemCompletedBatches.map(async (batch) => {
                try {
                  // Find packing sheets for this specific batch using root level batchId/batchNo
                  const batchPackingSheets = await PackingSheet.find({
                    $or: [
                      { batchId: batch._id },
                      { batchNo: batch.batchNo }
                    ],
                    company: req.user.companyId,
                    packingDate: { $gte: targetDate, $lte: endOfDay }
                  }).lean() || [];

                  return {
                    _id: batch._id,
                    batchNo: batch.batchNo,
                    qtyAchieved: batch.qtyAchieved,
                    productionLoss: batch.productionLoss,
                    status: 'completed',
                    companyId: batch.companyId,
                    itemId: batch.itemId,
                    groupId: batch.groupId,
                    productionDate: batch.productionDate,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                    // Include packing sheets array for this individual batch
                    packingSheets: Array.isArray(batchPackingSheets) ? batchPackingSheets.map(sheet => ({
                      _id: sheet._id,
                      packingStartTime: sheet.packingStartTime,
                      packingEndTime: sheet.packingEndTime,
                      packingLoss: sheet.packingLoss || 0,
                      packedQty: sheet.packedQty || batch.qtyAchieved || 0,
                      notes: sheet.notes || '',
                      status: sheet.status || 'pending',
                      isApproved: sheet.isApproved || false,
                      createdAt: sheet.createdAt,
                      updatedAt: sheet.updatedAt
                    })) : []
                  };
                } catch (error) {
                  console.error('Error processing individual batch:', batch._id, error);
                  return {
                    _id: batch._id,
                    batchNo: batch.batchNo,
                    qtyAchieved: batch.qtyAchieved,
                    productionLoss: batch.productionLoss,
                    status: 'completed',
                    companyId: batch.companyId,
                    itemId: batch.itemId,
                    groupId: batch.groupId,
                    productionDate: batch.productionDate,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                    packingSheets: []
                  };
                }
              })),
              dailySummaryData: dailySummary || null
            }],
            createdBy: 'System',
            createdAt: new Date(),
            completedBatches: itemCompletedBatches.length
          });
          
          console.log(`✅ Created individual group "${item.name}" with ${itemCompletedBatches.length} batches:`, 
            itemCompletedBatches.map(b => `${b.batchNo}:${b.qtyAchieved}`).join(', ')
          );
        }
      }
    }
    
    // Optional: Only add "Ungrouped Items" if there are batches with literally no groupId AND no itemId match
    // (This should be rare - most items should get individual groups above)
    const trueOrphanBatches = completedBatches.filter(batch => 
      (!batch.groupId || batch.groupId === null) && 
      (!batch.itemId || !completedItemIds.includes(batch.itemId?.toString()))
    );
    
    if (trueOrphanBatches.length > 0) {
      console.log(`🔄 Found ${trueOrphanBatches.length} truly orphaned batches - adding to ungrouped`);
      
      packingData.push({
        _id: 'ungrouped-items',
        name: 'Ungrouped Items',
        description: 'Batches without proper item or group assignment',
        totalItems: trueOrphanBatches.length,
        qtyPerBatch: 0,
        qtyAchievedPerBatch: trueOrphanBatches.reduce((sum, batch) => sum + (batch.qtyAchieved || 0), 0),
        productionLoss: trueOrphanBatches.reduce((sum, batch) => sum + (batch.productionLoss || 0), 0),
        items: trueOrphanBatches.map(batch => ({
          _id: batch._id,
          name: `Batch ${batch.batchNo}`,
          code: batch.batchNo,
          category: 'Unknown',
          unit: 'pcs',
          image: null,
          currentStock: 0,
          producedQty: 0,
          indentQty: 0,
          achievedQty: batch.qtyAchieved || 0,
          packedQty: 0,
          packingLoss: 0,
          notes: '',
          completedBatches: 1,
          batchDetails: [{
            _id: batch._id,
            batchNo: batch.batchNo,
            qtyAchieved: batch.qtyAchieved,
            productionLoss: batch.productionLoss,
            status: 'completed',
            companyId: batch.companyId,
            itemId: batch.itemId,
            groupId: batch.groupId,
            productionDate: batch.productionDate,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt
          }],
          dailySummaryData: null
        })),
        createdBy: 'System',
        createdAt: new Date(),
        completedBatches: trueOrphanBatches.length
      });
    }

    console.log('✅ Final packing data summary:');
    packingData.forEach(group => {
      console.log(`   Group: ${group.name} - ${group.items.length} items, ${group.completedBatches} completed batches`);
      group.items.forEach(item => {
        console.log(`     Item: ${item.name} - ${item.completedBatches} completed batches, achieved: ${item.achievedQty}`);
      });
    });

    // Add packing sheet relationship data for each production group
    const productionGroupsWithPackingSheets = packingData.map((group) => {
      // Calculate totals from individual batch packing sheets
      let totalBatches = 0;
      let completedBatchSheets = 0;
      
      group.items.forEach(item => {
        if (item.batchDetails) {
          totalBatches += item.batchDetails.length;
          completedBatchSheets += item.batchDetails.filter(batch => 
            batch.packingSheets && batch.packingSheets.length > 0
          ).length;
        }
      });
      
      console.log(`📋 Group ${group.name}: ${totalBatches} total batches, ${completedBatchSheets} with packing sheets`);

      return {
        ...group,
        totalBatches: totalBatches,
        completedBatchSheets: completedBatchSheets
      };
    });

    // Add packing sheet data for ungrouped items as well
    const ungroupedPackingSheets = await PackingSheet.find({
      company: req.user.companyId,
      $or: [
        { productionGroup: null },
        { productionGroup: { $exists: false } }
      ],
      productionGroupName: 'Ungrouped Items',
      packingDate: { $gte: targetDate, $lte: endOfDay }
    })
    .select('_id slNo status packingStartTime packingEndTime totalPackedQty packingLoss items')
    .lean();

    console.log('✅ Production groups processed:', productionGroupsWithPackingSheets.length);
    console.log('📦 Total batches across all groups:', productionGroupsWithPackingSheets.reduce((sum, g) => sum + (g.totalBatches || 0), 0));
    console.log('🔄 Ungrouped packing sheets found:', ungroupedPackingSheets.length);
    
    // ungroupedPackingSheets: ungroupedPackingSheets,
    res.json({
      success: true,
      message: 'Production groups for packing fetched successfully',
      data: {
        productionGroups: productionGroupsWithPackingSheets,
        totalGroups: productionGroupsWithPackingSheets.length,
        dateFilter: targetDate.toISOString(),
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

    // Add computed fields for each packing sheet
    const enrichedPackingSheets = packingSheets.map(sheet => ({
      ...sheet,
      // Computed fields for frontend logic
      hasPackingProgress: sheet.items.some(item => (Number(item.packedQty) || 0) > 0) || 
                         Number(sheet.packingLoss) > 0 || 
                         (sheet.notes && sheet.notes.trim().length > 0) ||
                         Boolean(sheet.packingStartTime),
      isApprovable: sheet.status !== 'approved' && (
                   sheet.items.some(item => (Number(item.packedQty) || 0) > 0) || 
                   Number(sheet.packingLoss) > 0 || 
                   (sheet.notes && sheet.notes.trim().length > 0) ||
                   Boolean(sheet.packingStartTime)
                   ),
      totalPackedQty: sheet.items.reduce((sum, item) => sum + (Number(item.packedQty) || 0), 0),
      totalProducedQty: sheet.items.reduce((sum, item) => sum + (Number(item.producedQty) || 0), 0),
      packingProgress: (() => {
        const totalProduced = sheet.items.reduce((sum, item) => sum + (Number(item.producedQty) || 0), 0);
        const totalPacked = sheet.items.reduce((sum, item) => sum + (Number(item.packedQty) || 0), 0);
        return totalProduced > 0 ? Math.round((totalPacked / totalProduced) * 100) : 0;
      })()
    }));

    res.json({
      success: true,
      message: 'Fresh packing sheets fetched successfully',
      data: {
        packingSheets: enrichedPackingSheets,
        totalSheets: packingSheets.length,
        timestamp: new Date().toISOString(),
        summary: {
          total: packingSheets.length,
          pending: packingSheets.filter(s => s.status === 'pending').length,
          inProgress: packingSheets.filter(s => s.status === 'in_progress').length,
          completed: packingSheets.filter(s => s.status === 'completed').length,
          approved: packingSheets.filter(s => s.status === 'approved').length
        }
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
    console.log('📋 Create/Update packing sheet for group:', productionGroupId);

    // Set today's date range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let productionGroupName = 'Unknown Group';
    let productionGroup = null;

    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    
    // Handle ungrouped items - check for empty/null/undefined, specific "ungrouped" values, or individual group IDs
    const isUngrouped = !productionGroupId || 
                       productionGroupId === '' || 
                       productionGroupId === 'ungrouped-items' || 
                       productionGroupId === 'ungrouped' ||
                       (typeof productionGroupId === 'string' && productionGroupId.startsWith('individual-'));
    
    console.log('🔍 Ungrouped check:', { productionGroupId, isUngrouped });
    
    // Determine if this is ungrouped or production group
    if (!isUngrouped && productionGroupId) {
      // Try to find the production group - if not found, treat as ungrouped
      productionGroup = await ProductionGroup.findOne({
        _id: productionGroupId,
        company: req.user.companyId,
        isActive: true
      });

      if (productionGroup) {
        productionGroupName = productionGroup.name;
        console.log(`✅ Found production group: ${productionGroupName}`);
      } else {
        console.log(`⚠️ ProductionGroup not found for ID: ${productionGroupId}, treating as ungrouped`);
        productionGroupName = 'Ungrouped Items';
        productionGroup = null;
      }
    } else {
      productionGroupName = 'Ungrouped Items';
      productionGroup = null;
      console.log(`🔄 Handling as ungrouped items`);
    }

    // Extract batchId and batchNo from root level or from first item
    let batchId = req.body.batchId;
    let batchNo = req.body.batchNo;
    
    // If not provided at root level, get from first item
    if (!batchId && !batchNo && items && items.length > 0) {
      batchId = items[0].batchId;
      batchNo = items[0].batchNo;
      console.log('📦 Extracted batchId/batchNo from first item:', { batchId, batchNo });
    }
    
    // Process items (batchId and batchNo are now at root level, not item level)
    const processedItems = (items || []).map(item => ({
      productId: item.productId,
      productName: item.productName,
      indentQty: item.indentQty || 0,
      producedQty: item.producedQty || 0,
      packedQty: item.packedQty || 0,
      packingLoss: item.packingLoss || 0,
      notes: item.notes || ''
    }));
    
    console.log('📦 Processed items (batchId/batchNo now at root level):', processedItems.map(item => ({
      productName: item.productName,
      producedQty: item.producedQty,
      packedQty: item.packedQty
    })));

    // Check if packing sheet already exists for today using simple criteria
    const existingQuery = {
      company: req.user.companyId,
      packingDate: { $gte: today, $lte: endOfDay },
      batchId: batchId,
      batchNo: batchNo,
      isActive: { $ne: false }
    };

    const existingSheet = await PackingSheet.findOne(existingQuery);

    if (existingSheet) {
      // Update existing packing sheet
      console.log(`🔄 Updating existing packing sheet: ${existingSheet._id}`);
      
      existingSheet.items = processedItems;
      existingSheet.batchId = batchId || existingSheet.batchId;
      existingSheet.batchNo = batchNo || existingSheet.batchNo;
      existingSheet.shift = shift || existingSheet.shift;
      existingSheet.status = req.body.status || existingSheet.status;
      existingSheet.packingStartTime = req.body.packingStartTime ? new Date(req.body.packingStartTime) : existingSheet.packingStartTime;
      existingSheet.lastUpdatedBy = req.user._id || req.user.id;
      existingSheet.updatedAt = new Date();

      await existingSheet.save();

      console.log('✅ PACKING SHEET UPDATED:', existingSheet._id);

      res.status(200).json({
        success: true,
        message: 'Packing sheet updated successfully',
        data: existingSheet
      });
    } else {
      // Create new packing sheet
      console.log(`🆕 Creating new packing sheet`);
      
      const nextSlNo = await PackingSheet.getNextSlNo(req.user.companyId);
      
      const packingSheetData = {
        slNo: nextSlNo,
        productionGroup: productionGroup ? productionGroupId : null,
        productionGroupName: productionGroupName,
        batchId: batchId || null,
        batchNo: batchNo || null,
        items: processedItems,
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

      res.status(201).json({
        success: true,
        message: 'Packing sheet created successfully',
        data: packingSheet
      });
    }

  } catch (error) {
    console.error('❌ Error in create/update packing sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update packing sheet',
      error: error.message
    });
  }
};

// Update entire packing sheet
export const updatePackingSheet = async (req, res) => {
  try {
    const updateData = req.body;
    console.log('📝 Updating packing sheet by batchNo/batchId');
    console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

    // Validation - need batchNo and batchId to find the sheet
    if (!updateData.batchNo || !updateData.batchId) {
      return res.status(400).json({
        success: false,
        message: 'batchNo and batchId are required to update packing sheet'
      });
    }

    // Set today's date range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('🔍 Finding packing sheet with:', {
      companyId: req.user.companyId,
      batchNo: updateData.batchNo,
      batchId: updateData.batchId,
      dateRange: { from: today, to: endOfDay }
    });

    // Find packing sheet by root level batchNo, batchId, company, and today's date
    const packingSheet = await PackingSheet.findOne({
      company: req.user.companyId,
      packingDate: { $gte: today, $lte: endOfDay },
      batchNo: updateData.batchNo,
      batchId: updateData.batchId,
      isActive: { $ne: false }
    });

    if (!packingSheet) {
      return res.status(404).json({
        success: false,
        message: `Packing sheet not found for batchNo: ${updateData.batchNo}, batchId: ${updateData.batchId} in company ${req.user.companyId} for today`
      });
    }

    console.log('✅ Found packing sheet:', packingSheet._id);

    // Update basic fields if provided
    if (updateData.productionGroupName !== undefined) {
      packingSheet.productionGroupName = updateData.productionGroupName;
    }
    if (updateData.batchId !== undefined) {
      packingSheet.batchId = updateData.batchId;
    }
    if (updateData.batchNo !== undefined) {
      packingSheet.batchNo = updateData.batchNo;
    }
    if (updateData.status !== undefined) {
      packingSheet.status = updateData.status;
    }
    if (updateData.packingStartTime !== undefined) {
      packingSheet.packingStartTime = updateData.packingStartTime ? new Date(updateData.packingStartTime) : null;
    }
    if (updateData.packingEndTime !== undefined) {
      packingSheet.packingEndTime = updateData.packingEndTime ? new Date(updateData.packingEndTime) : null;
    }
    if (updateData.packingLoss !== undefined) {
      packingSheet.packingLoss = updateData.packingLoss;
    }
    if (updateData.notes !== undefined) {
      packingSheet.notes = updateData.notes;
    }

    // Update items if provided
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.items.forEach(updateItem => {
        // Find item by productId since batchId/batchNo are now at root level
        const existingItem = packingSheet.items.find(
          item => item.productId?.toString() === updateItem.productId
        );
        
        if (existingItem) {
          console.log(`🔄 Updating item: ${updateItem.productName || existingItem.productName}`);
          // Update item fields (batchId/batchNo are handled at root level)
          if (updateItem.productName !== undefined) existingItem.productName = updateItem.productName;
          if (updateItem.indentQty !== undefined) existingItem.indentQty = updateItem.indentQty;
          if (updateItem.producedQty !== undefined) existingItem.producedQty = updateItem.producedQty;
          if (updateItem.packedQty !== undefined) existingItem.packedQty = updateItem.packedQty;
          if (updateItem.packingLoss !== undefined) existingItem.packingLoss = updateItem.packingLoss;
          if (updateItem.notes !== undefined) existingItem.notes = updateItem.notes;
        } else {
          console.log(`❌ Item not found with productId: ${updateItem.productId}`);
        }
      });
    }

    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    packingSheet.updatedAt = new Date();
    
    const updatedSheet = await packingSheet.save();

    console.log('✅ Packing sheet updated successfully:', updatedSheet._id);

    res.json({
      success: true,
      message: 'Packing sheet updated successfully',
      data: updatedSheet
    });

  } catch (error) {
    console.error('❌ Error updating packing sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update packing sheet',
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
          // Update batchId and batchNo if provided
          if (updateItem.batchId !== undefined) existingItem.batchId = updateItem.batchId;
          if (updateItem.batchNo !== undefined) existingItem.batchNo = updateItem.batchNo;
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
    const { productId, packingLoss, notes, batchId, batchNo } = req.body;
    console.log('📝 Updating individual packing item:', { packingSheetId, productId, packingLoss, notes, batchId, batchNo });
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
    if (batchId !== undefined) {
      item.batchId = batchId;
      console.log(`🔄 Updated batchId for item: ${item.batchId}`);
    }
    if (batchNo !== undefined) {
      item.batchNo = batchNo;
      console.log(`🔄 Updated batchNo for item: ${item.batchNo}`);
    }
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

    // AUTO-UPDATE STATUS: Check if packing is complete
    const allItemsPacked = packingSheet.items.every(item => {
      const itemProducedQty = Number(item.producedQty) || 0;
      const itemPackedQty = Number(item.packedQty) || 0;
      return itemProducedQty > 0 ? itemPackedQty > 0 : true; // If produced, must be packed
    });

    if (allItemsPacked && packingSheet.status === 'pending') {
      packingSheet.status = 'in_progress';
      console.log(`📋 Updated status to in_progress`);
    }

    // If packedQty equals producedQty for all items, mark as completed
    const allItemsCompleted = packingSheet.items.every(item => {
      const itemProducedQty = Number(item.producedQty) || 0;
      const itemPackedQty = Number(item.packedQty) || 0;
      return itemProducedQty === 0 || itemPackedQty === itemProducedQty;
    });

    if (allItemsCompleted && packingSheet.status !== 'completed' && packingSheet.status !== 'approved') {
      packingSheet.status = 'completed';
      packingSheet.packingEndTime = new Date();
      console.log(`✅ Updated status to completed`);
    }

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
        batchId: item.batchId,
        batchNo: item.batchNo,
        indentQty: item.indentQty,
        producedQty: item.producedQty,
        packingLoss: packingSheet.packingLoss, // Return from main sheet level
        packedQty: item.packedQty,
        notes: packingSheet.notes, // Return from main sheet level
        status: packingSheet.status, // Include status for frontend
        packingStartTime: packingSheet.packingStartTime,
        packingEndTime: packingSheet.packingEndTime,
        lastUpdated: packingSheet.updatedAt,
        // Include all items for frontend state update
        allItems: packingSheet.items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          indentQty: i.indentQty,
          producedQty: i.producedQty,
          packedQty: i.packedQty
        }))
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

    // Check if ready for approval - must have actual packing progress
    const hasPackingProgress = packingSheet.items.some(item => {
      const packedQty = Number(item.packedQty) || 0;
      return packedQty > 0;
    });

    const hasPackingLoss = Number(packingSheet.packingLoss) > 0;
    const hasNotes = packingSheet.notes && packingSheet.notes.trim().length > 0;
    const hasStartTime = packingSheet.packingStartTime;

    if (!hasPackingProgress && !hasPackingLoss && !hasNotes && !hasStartTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve: No packing activity detected. Please update packed quantities, add notes, or record packing loss.',
        error: 'NO_PACKING_PROGRESS',
        details: {
          packedItems: 0,
          packingLoss: packingSheet.packingLoss || 0,
          hasNotes: Boolean(hasNotes),
          hasStartTime: Boolean(hasStartTime)
        }
      });
    }

    // Update approval status
    packingSheet.status = 'approved';
    packingSheet.approvedAt = new Date();
    packingSheet.approvedBy = req.user._id || req.user.id;
    packingSheet.lastUpdatedBy = req.user._id || req.user.id;
    
    await packingSheet.save();

    console.log('✅ Packing sheet approved successfully');

    // Initialize dispatchEntries array outside try-catch block
    let dispatchEntries = [];

    // Create dispatch console entry automatically with proper data calculation
    try {
      const Dispatch = (await import('../models/Dispatch.js')).default;
      const ProductDetailsDailySummary = (await import('../models/ProductDetailsDailySummary.js')).default;
      
      const today = new Date();
      const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

      console.log('📅 Date debugging for dispatch entry:', {
        todayOriginal: today.toISOString(),
        startOfDay: startOfDay.toISOString(),
        todayLocal: today.toLocaleDateString(),
        startOfDayLocal: startOfDay.toLocaleDateString(),
        todayUTC: today.toUTCString(),
        startOfDayUTC: startOfDay.toUTCString()
      });

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
      // dispatchEntries array already declared above
      
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
            packedQty: item.packedQty,
            packingSheetBatchId: packingSheet.batchId
          });
          
          // STEP 1: Get ProductionBatch using batchId from PackingSheet
          const ProductionBatch = (await import('../models/ProductionBatch.js')).default;
          let todayItemSummary = null;
          let dailyProductionId = null;
          
          if (packingSheet.batchId) {
            const productionBatch = await ProductionBatch.findById(packingSheet.batchId);
            
            if (productionBatch) {
              dailyProductionId = productionBatch.DailyProductionId;
              console.log('📦 Found ProductionBatch:', {
                batchId: packingSheet.batchId,
                batchNo: productionBatch.batchNo,
                DailyProductionId: dailyProductionId
              });
              
              // STEP 2: Get ProductDetailsDailySummary using DailyProductionId
              if (dailyProductionId) {
                todayItemSummary = await ProductDetailsDailySummary.findById(dailyProductionId);
                
                if (todayItemSummary) {
                  console.log('📋 Found ProductDetailsDailySummary:', {
                    _id: todayItemSummary._id,
                    productId: todayItemSummary.productId,
                    orderIds: todayItemSummary.orderIds?.length || 0
                  });
                }
              }
            }
          }
          
          // Fallback: If no batchId or DailyProductionId, try direct lookup by productId and date
          if (!todayItemSummary) {
            console.log('⚠️ Fallback: Looking up ProductDetailsDailySummary by productId and date');
            todayItemSummary = await ProductDetailsDailySummary.findOne({
              productId: item.productId,
              companyId: req.user.companyId,
              date: { $gte: startOfDay, $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) }
            });
          }

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
          
          // Calculate actual return quantity from Return table for yesterday
          const Return = (await import('../models/Return.js')).default;
          
          // Get yesterday's returns for this specific product and company from all customers
          const yesterdayReturns = await Return.aggregate([
            {
              $match: {
                companyId: req.user.companyId,
                returnDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
                status: { $in: ['approved', 'completed'] } // Only approved/completed returns
              }
            },
            {
              $unwind: '$items'
            },
            {
              $match: {
                'items.productId': item.productId
              }
            },
            {
              $group: {
                _id: null,
                totalReturnQuantity: { $sum: '$items.quantity' }
              }
            }
          ]);
          
          const itemReturnQuantity = yesterdayReturns.length > 0 ? yesterdayReturns[0].totalReturnQuantity : 0;
          
          console.log(`📊 Item calculations for ${item.productName}:`, {
            packedQty: item.packedQty,
            previousStock: itemPreviousStock,
            returnQty: itemReturnQuantity,
            returnQtyFromActualData: itemReturnQuantity,
            indentQty: itemIndentQuantity,
            expectedTotalAvailable: item.packedQty + itemPreviousStock + itemReturnQuantity
          });
         
          // STEP 3: Get customer and salesPerson from Orders using orderIds from ProductDetailsDailySummary
          const Order = (await import('../models/Order.js')).default;
          let salesPersonId = null;
          let customerId = null;
          
          // Get from ProductDetailsDailySummary orderIds
          if (todayItemSummary && todayItemSummary.orderIds && todayItemSummary.orderIds.length > 0) {
            console.log(`📋 Found ${todayItemSummary.orderIds.length} orderIds in ProductDetailsDailySummary for ${item.productName}`);
            
            // Get ALL orders from the orderIds array and find one with customer and salesPerson
            const orders = await Order.find({
              _id: { $in: todayItemSummary.orderIds },
              companyId: req.user.companyId
            })
              .select('salesPerson customer orderCode')
              .populate('salesPerson', 'username')
              .populate('customer', 'name');
            
            console.log(`📦 Retrieved ${orders.length} orders from ProductDetailsDailySummary`);
            
            // Find first order with both customer and salesPerson
            for (const order of orders) {
              if (order.customer && order.salesPerson) {
                salesPersonId = order.salesPerson._id || order.salesPerson;
                customerId = order.customer._id || order.customer;
                
                console.log(`✅ Retrieved from order ${order.orderCode}:`, {
                  salesPerson: order.salesPerson.username || salesPersonId,
                  customer: order.customer.name || customerId
                });
                break; // Found valid order, exit loop
              }
            }
            
            // If no order has both, try to get at least one of them
            if (!salesPersonId || !customerId) {
              for (const order of orders) {
                if (!salesPersonId && order.salesPerson) {
                  salesPersonId = order.salesPerson._id || order.salesPerson;
                }
                if (!customerId && order.customer) {
                  customerId = order.customer._id || order.customer;
                }
                if (salesPersonId && customerId) break;
              }
            }
          }
          
          // Fallback: Search orders directly by productId if not found via ProductDetailsDailySummary
          if (!salesPersonId || !customerId) {
            console.log(`🔍 Fallback: Searching for orders directly for product ${item.productName}`);
            const todayOrders = await Order.find({
              orderDate: { $gte: startOfDay, $lte: endOfDay },
              companyId: req.user.companyId,
              status: { $in: ['approved', 'confirmed'] },
              'products.product': item.productId
            }).populate('salesPerson', 'username').populate('customer', 'name');

            console.log(`📦 Found ${todayOrders.length} orders for product ${item.productName}`);

            // Get salesperson and customer from first valid order
            for (const order of todayOrders) {
              if (!salesPersonId && order.salesPerson) {
                salesPersonId = order.salesPerson._id || order.salesPerson;
              }
              if (!customerId && order.customer) {
                customerId = order.customer._id || order.customer;
              }
              if (salesPersonId && customerId) {
                console.log(`✅ Retrieved from fallback order ${order.orderCode}`);
                break;
              }
            }
          }
          
          console.log(`🎯 Final customer and salesPerson for ${item.productName}:`, {
            customerId: customerId,
            salesPersonId: salesPersonId
          });

          // Check if dispatch entry already exists for this product
          const existingDispatchEntry = await Dispatch.findOne({
            packingSheetId: packingSheet._id,
            date: startOfDay,
            productId: item.productId,
            company: req.user.companyId,
            batchNo: packingSheet.batchNo
          });

          let dispatchEntry;
          
          if (existingDispatchEntry) {
            // Update existing entry
            console.log(`🔄 Updating existing dispatch entry for ${item.productName} (ID: ${existingDispatchEntry._id})`);
            
            dispatchEntry = await Dispatch.findByIdAndUpdate(
              existingDispatchEntry._id,
              {
                $set: {
                  dcno: null,
                  salesPerson: salesPersonId,
                  customer: customerId,
                  productGroup: `${packingSheet.productionGroupName || 'Unknown Group'} - ${item.productName}`,
                  productName: item.productName,
                  packedQuantityReadyForDispatch: item.packedQty,
                  previousClosingStockYesterdayBalance: itemPreviousStock,
                  returnQuantityYesterdayReturns: itemReturnQuantity,
                  totalIndentQuantityOrdersForTheDay: itemIndentQuantity,
                  totalAvailableStock: item.packedQty + itemPreviousStock + itemReturnQuantity,
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
              salesPerson: salesPersonId,
              customer: customerId,
              date: startOfDay,
              productGroup: `${packingSheet.productionGroupName || 'Unknown Group'} - ${item.productName}`,
              company: req.user.companyId,
              dcno: null,
              packedQuantityReadyForDispatch: item.packedQty,
              previousClosingStockYesterdayBalance: itemPreviousStock,
              returnQuantityYesterdayReturns: itemReturnQuantity,
              totalIndentQuantityOrdersForTheDay: itemIndentQuantity,
              totalAvailableStock: item.packedQty + itemPreviousStock + itemReturnQuantity,
              excessShortage: (item.packedQty + itemPreviousStock + itemReturnQuantity) - itemIndentQuantity,
              dispatchedQuantitySentToday: 0,
              closingStockEndOfDayBalance: item.packedQty + itemPreviousStock + itemReturnQuantity,
              physicalStockEntryManualVerification: 0,
              batchNo: packingSheet.batchNo,
              status: 'updated',
              lastUpdatedBy: req.user._id || req.user.id
            });
          }
          
          dispatchEntries.push(dispatchEntry);
        } // End of if (item.packedQty > 0)
      } // End of for (const item of packingSheet.items)

      console.log('✅ Dispatch console entries created:', {
        totalEntries: dispatchEntries.length,
        packingSheetId: packingSheet._id,
        productGroup: packingSheet.productionGroupName,
        entries: dispatchEntries.map(entry => ({
          dispatchId: entry._id,
          dcno: entry.dcno,
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
      const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
      
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
        dispatchConsoleCreated: true,
        dispatchEntries: dispatchEntries.map(entry => ({
          dispatchId: entry._id,
          dcno: entry.dcno,
          productName: entry.productName,
          packedQuantity: entry.packedQuantityReadyForDispatch,
          totalAvailableStock: entry.totalAvailableStock
        })),
        // Include updated sheet data for frontend state management
        packingSheet: {
          _id: packingSheet._id,
          slNo: packingSheet.slNo,
          productionGroupName: packingSheet.productionGroupName,
          batchId: packingSheet.batchId,
          batchNo: packingSheet.batchNo,
          status: packingSheet.status,
          packingStartTime: packingSheet.packingStartTime,
          packingEndTime: packingSheet.packingEndTime,
          packingLoss: packingSheet.packingLoss,
          notes: packingSheet.notes,
          items: packingSheet.items,
          totalPackedQty: packingSheet.totalPackedQty,
          approvedAt: packingSheet.approvedAt,
          approvedBy: packingSheet.approvedBy,
          createdAt: packingSheet.createdAt,
          updatedAt: packingSheet.updatedAt
        }
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