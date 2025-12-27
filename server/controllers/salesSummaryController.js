import ProductDailySummary from '../models/ProductDailySummary.js';
import ProductDetailsDailySummary from '../models/ProductDetailsDailySummary.js';
import ProductionBatch from '../models/ProductionBatch.js';
import { getSalesBreakdown } from '../services/productionSummaryService.js';
import { Item } from '../models/Inventory.js';
import ProductionGroup from '../models/ProductionGroup.js';
import mongoose from 'mongoose';

/**
 * GET /api/sales/product-summary
 * Get daily sales summary for all products (for Sales Approval Dashboard)
 * Now uses ProductDetailsDailySummary for daily data
 */
export const getSalesSummary = async (req, res) => {
  try {
    const { date, companyId } = req.query;
    const userRole = req.user.role;
    const userCompanyId = req.user.companyId;

    // Date handling enabled for unit-manager indent-summary
    let summaryDate = null;
    if (date) {
      summaryDate = new Date(date);
      if (isNaN(summaryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
      summaryDate.setUTCHours(0, 0, 0, 0);
    }
    
    // If no date provided, use today's date
    if (!summaryDate) {
      summaryDate = new Date();
      summaryDate.setUTCHours(0, 0, 0, 0);
    }

    // Company filtering based on user role
    let filterCompanyId;
    if (userRole === 'Unit Manager' || userRole === 'Unit Head') {
      if (!userCompanyId) {
        return res.status(403).json({
          success: false,
          message: 'User not assigned to any company'
        });
      }
      filterCompanyId = userCompanyId;
    } else if (userRole === 'Super Admin' && companyId) {
      filterCompanyId = companyId;
    } else if (userRole === 'Super Admin') {
      filterCompanyId = null;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access sales summary'
      });
    }

    console.log('🔍 Getting product summary for date:', summaryDate.toISOString().split('T')[0]);
    console.log('🏢 Filter company ID:', filterCompanyId);
    console.log('👤 User role:', userRole);

    // Step 1: Get master product data from ProductDailySummary
    const masterFilter = {};
    if (filterCompanyId) {
      masterFilter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
    }

    const masterProducts = await ProductDailySummary.find(masterFilter)
      .populate('productId', 'name category subCategory')
      .populate('companyId', 'name')
      .sort({ productName: 1 });

    console.log('📊 Master products found:', masterProducts.length);

    // Step 2: Get daily details for the specific date - with fallback to most recent
    const dailyFilter = {
      date: summaryDate
    };
    if (filterCompanyId) {
      dailyFilter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
    }

    let dailyDetails = await ProductDetailsDailySummary.find(dailyFilter)
      .populate('productId', 'name category subCategory')
      .populate('companyId', 'name');

    console.log('📅 Daily details found for date:', dailyDetails.length);

    // If no data for the specific date, show master products with empty sales data
    if (dailyDetails.length === 0) {
      console.log('⚠️ No daily data found for specific date, showing master products with empty sales...');
      
      // Create empty daily details for all master products
      const emptyDailyDetails = masterProducts.map(masterProduct => ({
        _id: `empty-${masterProduct._id}`,
        date: summaryDate,
        productId: masterProduct.productId,
        companyId: masterProduct.companyId,
        productionFinalBatches: 0,
        packing: 0,
        physicalStock: 0,
        batchAdjusted: 0,
        toBeProduced: 0
      }));
      
      dailyDetails = emptyDailyDetails;
      console.log('📦 Created empty daily details for:', dailyDetails.length, 'master products');
    }

    // Step 3: Create a map of daily details by productId
    const dailyDetailsMap = new Map();
    dailyDetails.forEach(detail => {
      if (detail.productId && detail.productId._id) {
        dailyDetailsMap.set(detail.productId._id.toString(), detail);
      }
    });

    // Step 4: Combine master data with daily details
    const combinedSummaries = masterProducts.map(masterProduct => {
      const productId = masterProduct.productId ? masterProduct.productId._id.toString() : null;
      const dailyDetail = dailyDetailsMap.get(productId);

      return {
        _id: masterProduct._id,
        productId: masterProduct.productId,
        productName: masterProduct.productName,
        companyId: masterProduct.companyId,
        date: summaryDate,
        qtyPerBatch: masterProduct.qtyPerBatch || 0,
        
        // Daily fields from ProductDetailsDailySummary (with defaults)
        packing: dailyDetail?.packing || 0,
        physicalStock: dailyDetail?.physicalStock || 0,
        batchAdjusted: dailyDetail?.batchAdjusted || 0,
        totalQuantity: dailyDetail?.totalQuantity || 0,
        totalIndent: dailyDetail?.totalIndent || 0,
        productionFinalBatches: dailyDetail?.productionFinalBatches || 0,
        toBeProducedDay: dailyDetail?.toBeProducedDay || 0,
        toBeProducedBatches: dailyDetail?.toBeProducedBatches || 0,
        produceBatches: dailyDetail?.produceBatches || 0,
        expiryShortage: dailyDetail?.expiryShortage || 0,
        balanceFinalBatches: dailyDetail?.balanceFinalBatches || 0,
        status: dailyDetail?.status || 'pending',
        
        // Additional metadata
        hasDailyData: !!dailyDetail,
        dailyDetailsId: dailyDetail?._id || null,
        createdAt: masterProduct.createdAt,
        updatedAt: dailyDetail?.updatedAt || masterProduct.updatedAt
      };
    });

    console.log('🔄 Combined summaries created:', combinedSummaries.length);
    console.log('📈 Products with daily data:', combinedSummaries.filter(s => s.hasDailyData).length);

    // Step 5: Get sales breakdown for orders
    const salesBreakdown = await getSalesBreakdown(
      combinedSummaries.map(s => s.productId),
      summaryDate,
      filterCompanyId
    );

    console.log('📊 Sales breakdown processed:', salesBreakdown.length);

    // Step 6: Attach sales data to each product (salesBreakdown separate from summary)
    const productsWithSalesData = combinedSummaries.map(product => {
      const salesData = salesBreakdown.find(s => 
        s.productId && product.productId &&
        s.productId._id.toString() === product.productId._id.toString()
      );

      return {
        ...product,
        summary: {
          totalIndent: salesData?.summary?.totalIndent || 0,
          totalQuantity: product.totalQuantity || 0,
          productionFinalBatches: product.productionFinalBatches || 0,
          status: product.status || 'pending'
        },
        salesBreakdown: salesData?.salesBreakdown || [] // Separate from summary
      };
    });

    // Step 7: Build the response with production groups (new grouped format)
    const productGroups = await ProductionGroup.find({
      ...(filterCompanyId && { company: filterCompanyId }),
      isActive: true
    }).populate('items');

    const validProducts = productsWithSalesData.filter(p => 
      p.productId && p.productId._id && p.productName
    );

    console.log('🔍 Found production groups:', productGroups.length);
    console.log('📦 Valid products for grouping:', validProducts.length);

    const productionGroupsData = productGroups.map(group => {
      const groupProducts = validProducts.filter(product => {
        return group.items.some(item => 
          product.productId && 
          item._id.toString() === product.productId._id.toString()
        );
      });

      console.log(`📋 Group "${group.name}" has ${groupProducts.length} products`);

      return {
        groupId: group._id,
        groupName: group.name,
        groupDescription: group.description || "",
        products: groupProducts.map(product => ({
          _id: product._id,
          productId: product.productId,
          productName: product.productName,
          companyId: product.companyId,
          date: product.date,
          qtyPerBatch: product.qtyPerBatch,
          batchAdjusted: product.batchAdjusted,
          productionFinalBatches: product.productionFinalBatches,
          totalQuantity: product.totalQuantity,
          totalIndent: product.totalIndent,
          physicalStock: product.physicalStock,
          toBeProducedDay: product.toBeProducedDay,
          toBeProducedBatches: product.toBeProducedBatches,
          produceBatches: product.produceBatches,
          expiryShortage: product.expiryShortage,
          balanceFinalBatches: product.balanceFinalBatches,
          status: product.status,
          salesBreakdown: product.salesBreakdown || []
        }))
      };
    });

    // Ungrouped products
    const groupedProductIds = new Set();
    productGroups.forEach(group => {
      group.items.forEach(item => {
        groupedProductIds.add(item._id.toString());
      });
    });

    const ungroupedProducts = validProducts
      .filter(product => !groupedProductIds.has(product.productId._id.toString()))
      .map(product => ({
        _id: product._id,
        productId: product.productId,
        productName: product.productName,
        companyId: product.companyId,
        date: product.date,
        qtyPerBatch: product.qtyPerBatch,
        batchAdjusted: product.batchAdjusted,
        productionFinalBatches: product.productionFinalBatches,
        totalQuantity: product.totalQuantity,
        totalIndent: product.totalIndent,
        physicalStock: product.physicalStock,
        toBeProducedDay: product.toBeProducedDay,
        toBeProducedBatches: product.toBeProducedBatches,
        produceBatches: product.produceBatches,
        expiryShortage: product.expiryShortage,
        balanceFinalBatches: product.balanceFinalBatches,
        status: product.status,
        salesBreakdown: product.salesBreakdown || []
      }));

    console.log('✅ Response built successfully');
    console.log('🏭 Production groups with products:', productionGroupsData.length);
    console.log('📋 Ungrouped products:', ungroupedProducts.length);
    console.log('📊 Total products processed:', validProducts.length);

    // NEW GROUPED RESPONSE FORMAT
    const responseData = {
      success: true,
      date: date || "all-dates",
      companyId: filterCompanyId || "all-companies",
      totalProducts: validProducts.length,
      productionGroups: productionGroupsData,
      ungroupedProducts: ungroupedProducts
    };

    console.log('🔍 New response format keys:', Object.keys(responseData));

    res.json(responseData);

  } catch (error) {
    console.error('Error getting sales summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * POST /api/sales/update-product-summary
 * Update daily product details in ProductDetailsDailySummary
 */
export const updateSalesSummary = async (req, res) => {
  try {
    const { date, productId, updates } = req.body;
    const userRole = req.user.role;
    const userCompanyId = req.user.companyId;

    console.log('📝 Update request received:', { date, productId, updates });

    // Validate required fields
    if (!date || !productId || !updates) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, productId, and updates are required'
      });
    }

    // Parse and validate date
    const summaryDate = new Date(date);
    if (isNaN(summaryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    summaryDate.setUTCHours(0, 0, 0, 0);

    // Extract productId - handle both string and object formats
    let actualProductId;
    if (typeof productId === 'string') {
      actualProductId = productId;
    } else if (typeof productId === 'object' && productId._id) {
      actualProductId = productId._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid productId format - must be string or object with _id'
      });
    }

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(actualProductId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid productId format'
      });
    }

    console.log('✅ Using productId:', actualProductId);

    // Get master product data to validate access and get qtyPerBatch
    const masterProduct = await ProductDailySummary.findOne({
      productId: new mongoose.Types.ObjectId(actualProductId)
    }).populate('productId companyId');

    if (!masterProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in master data'
      });
    }

    // Check permissions
    if (userRole === 'Unit Manager' || userRole === 'Unit Head') {
      if (!userCompanyId || masterProduct.companyId._id.toString() !== userCompanyId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this product'
        });
      }
    }

    console.log('✅ Master product found:', masterProduct.productName);
    console.log('📅 Updating daily details for date:', summaryDate.toISOString().split('T')[0]);

    // Find or create daily details record
    let dailyDetails = await ProductDetailsDailySummary.findOne({
      date: summaryDate,
      productId: new mongoose.Types.ObjectId(actualProductId),
      companyId: masterProduct.companyId._id
    });

    if (!dailyDetails) {
      // Create new daily details record
      dailyDetails = new ProductDetailsDailySummary({
        date: summaryDate,
        productId: new mongoose.Types.ObjectId(actualProductId),
        productDailySummaryId: masterProduct._id,
        companyId: masterProduct.companyId._id
      });
      console.log('📝 Creating new daily details record');
    } else {
      console.log('📝 Updating existing daily details record');
    }

    // Apply updates to daily details
    Object.keys(updates).forEach(key => {
      if (dailyDetails.schema.paths[key] && key !== '_id' && key !== '__v') {
        dailyDetails[key] = updates[key];
        console.log(`  ✏️ Updated ${key}: ${updates[key]}`);
      }
    });

    // Validate approval requirements
    if (updates.status === 'approved') {
      // Check if batchAdjusted is set and > 0
      const batchAdjusted = dailyDetails.batchAdjusted;
      if (!batchAdjusted || batchAdjusted <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Batch Adjusted must be greater than 0 to approve the product',
          field: 'batchAdjusted',
          currentValue: batchAdjusted || 0
        });
      }
    }

    // Calculate formulas using qtyPerBatch from master data
    dailyDetails.calculateFormulas(masterProduct.qtyPerBatch);

    // Save the daily details
    await dailyDetails.save();

    console.log('💾 Daily details saved successfully');
    
    // 🎯 Handle ProductionBatch creation/removal based on status changes AND batchAdjusted updates
    if (userRole === 'Unit Manager') {
      // Check if this is an approval (status is approved) AND batchAdjusted has a value
      if (updates.status === 'approved' || (dailyDetails.status === 'approved' && updates.batchAdjusted)) {
        console.log('🏭 Unit Manager approved product or updated batches - creating ProductionBatch entries...');
        
        // First, remove existing non-completed batches for this product to avoid duplicates
        const today = new Date(summaryDate);
        today.setUTCHours(0, 0, 0, 0);
        
        const deletedBatches = await ProductionBatch.deleteMany({
          itemId: actualProductId,
          companyId: masterProduct.companyId._id,
          productionDate: today,
          status: { $ne: 'completed' } // Remove all except completed batches
        });
        
        console.log(`🗑️ Removed ${deletedBatches.deletedCount} existing non-completed ProductionBatch entries before creating new ones`);
        
        // Create ProductionBatch entries (batchAdjusted already validated >= 1)
        const batchesToCreate = Math.max(Math.ceil(dailyDetails.batchAdjusted), 1); // Ensure at least 1 batch
        
        // Double-check validation before creating batches
        if (batchesToCreate > 0 && dailyDetails.batchAdjusted > 0) {
          console.log(`📊 Creating ${batchesToCreate} batch(es) for approved product (from batchAdjusted: ${dailyDetails.batchAdjusted})`);
          
          await createProductionBatchEntries({
            productId: actualProductId,
            companyId: masterProduct.companyId._id,
            date: summaryDate,
            qtyPerBatch: masterProduct.qtyPerBatch,
            produceBatches: batchesToCreate,
            approvedBy: req.user.username
          });
        } else {
          console.log(`⚠️ Skipped batch creation - invalid batchAdjusted value: ${dailyDetails.batchAdjusted}`);
        }
      } else if (updates.status === 'pending') {
        console.log('⚠️ Unit Manager moved product back to pending - removing ProductionBatch entries...');
        
        // Remove ProductionBatch entries for this product, company and date
        const today = new Date(summaryDate);
        today.setHours(0, 0, 0, 0);
        
        // Remove ALL ProductionBatch entries except completed ones
        // This includes: pending, not_started, in_progress, paused, cancelled, migrated_from_batchdata
        const deletedBatches = await ProductionBatch.deleteMany({
          itemId: actualProductId,
          companyId: masterProduct.companyId._id,
          productionDate: today,
          status: { $ne: 'completed' } // Remove all except completed batches
        });
        
        console.log(`🗑️ Removed ${deletedBatches.deletedCount} ProductionBatch entries for pending product (all except completed)`);
      }
    }

    // Return the updated daily details
    const response = {
      _id: dailyDetails._id,
      date: dailyDetails.date,
      productId: dailyDetails.productId,
      productName: masterProduct.productName,
      companyId: dailyDetails.companyId,
      qtyPerBatch: masterProduct.qtyPerBatch,
      
      // Daily fields
      packing: dailyDetails.packing,
      physicalStock: dailyDetails.physicalStock,
      batchAdjusted: dailyDetails.batchAdjusted,
      totalQuantity: dailyDetails.totalQuantity,
      totalIndent: dailyDetails.totalIndent,
      productionFinalBatches: dailyDetails.productionFinalBatches,
      toBeProducedDay: dailyDetails.toBeProducedDay,
      toBeProducedBatches: dailyDetails.toBeProducedBatches,
      produceBatches: dailyDetails.produceBatches,
      expiryShortage: dailyDetails.expiryShortage,
      balanceFinalBatches: dailyDetails.balanceFinalBatches,
      status: dailyDetails.status,
      
      updatedAt: dailyDetails.updatedAt
    };

    res.json({
      success: true,
      message: 'Product summary updated successfully',
      data: response
    });

  } catch (error) {
    console.error('Error updating sales summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Helper function to create ProductionBatch entries when Unit Manager approves products
 * This implements the new requirement for pre-creating batch entries with "pending" status
 */
const createProductionBatchEntries = async ({
  productId,
  companyId,
  date,
  qtyPerBatch,
  produceBatches,
  approvedBy
}) => {
  try {
    console.log('🏭 Creating ProductionBatch entries:', {
      productId,
      companyId,
      produceBatches,
      qtyPerBatch,
      approvedBy
    });

    // Validate inputs - CRITICAL: Prevent creation of 0-batch entries
    if (!produceBatches || produceBatches <= 0 || produceBatches === 0) {
      console.log(`⚠️ Invalid produceBatches value: ${produceBatches} - skipping ProductionBatch creation`);
      return [];
    }

    // Additional safety check for edge cases
    if (isNaN(produceBatches) || !isFinite(produceBatches)) {
      console.log(`⚠️ Invalid produceBatches value (NaN or infinite): ${produceBatches} - skipping ProductionBatch creation`);
      return [];
    }

    // Get the next batch number for this company and date
    const today = new Date(date);
    today.setUTCHours(0, 0, 0, 0); // Use UTC to avoid timezone issues
    
    // Find the highest existing batch number for this date and company
    const existingBatches = await ProductionBatch.find({
      companyId,
      productionDate: today
    }).select('batchNumber').sort({ batchNumber: -1 }).limit(1);
    
    let nextBatchNumber = 1;
    if (existingBatches.length > 0) {
      nextBatchNumber = existingBatches[0].batchNumber + 1;
    }
    
    console.log(`📊 Next batch number will start from: ${nextBatchNumber}`);

    // Check if this product is part of a production group
    const productionGroup = await ProductionGroup.findOne({
      company: companyId,
      items: productId,
      isActive: true
    });
    
    const groupId = productionGroup ? productionGroup._id : null;
    console.log(`🔗 Product ${groupId ? 'IS' : 'IS NOT'} part of a production group: ${groupId}`);

    // Create multiple ProductionBatch entries based on produceBatches count
    const batchEntries = [];
    
    for (let i = 0; i < produceBatches; i++) {
      const currentBatchNumber = nextBatchNumber + i;
      const paddedBatchNumber = String(currentBatchNumber).padStart(2, '0');
      const batchNo = `BATNO${paddedBatchNumber}`;
      
      const batchEntry = {
        companyId,
        itemId: productId,
        groupId, // Optional - will be null for ungrouped items
        batchNumber: currentBatchNumber,
        batchNo,
        productionDate: today,
        qtyPerBatch: qtyPerBatch, // Use original qtyPerBatch for each batch (don't divide)
        qtyAchieved: qtyPerBatch, // Start with full quantity achieved
        productionLoss: 0,
        status: 'pending', // Start with pending status
        mouldingTime: null,
        unloadingTime: null,
        createdBy: approvedBy,
        notes: `Created by unit manager approval for ${produceBatches} batches`
      };
      
      batchEntries.push(batchEntry);
      console.log(`📦 Prepared batch ${i + 1}/${produceBatches}: ${batchNo} with qty ${qtyPerBatch}`);
    }
    
    // Insert all batch entries at once
    const createdBatches = await ProductionBatch.insertMany(batchEntries);
    console.log(`✅ Successfully created ${createdBatches.length} ProductionBatch entries`);
    
    // Log the created batch numbers for verification
    const createdBatchNos = createdBatches.map(batch => batch.batchNo);
    console.log(`🏷️ Created batch numbers: ${createdBatchNos.join(', ')}`);
    
    return createdBatches;
    
  } catch (error) {
    console.error('❌ Error creating ProductionBatch entries:', error);
    // Don't throw - this is a supplementary feature, main functionality should continue
    console.error('⚠️ ProductionBatch creation failed but product approval will continue');
    return [];
  }
};