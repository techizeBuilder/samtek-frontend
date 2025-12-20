import Dispatch from '../models/Dispatch.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import PackingSheet from '../models/Packing.js';
import { USER_ROLES } from '../../shared/schema.js';

export const getDispatches = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, unit, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.user.role !== USER_ROLES.SUPER_USER) {
      query.unit = req.user.unit;
    } else if (unit) {
      query.unit = unit;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productGroup: { $regex: search, $options: 'i' } },
        { batchNo: { $regex: search, $options: 'i' } }
      ];
    }

    const dispatches = await Dispatch.find(query)
      .populate('packingSheetId', 'slNo productionGroupName status')
      .populate('productId', 'name code category unit')
      .populate('lastUpdatedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Dispatch.countDocuments(query);

    res.json({
      dispatches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get dispatches error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDispatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const dispatch = await Dispatch.findById(id)
      .populate('packingSheetId', 'slNo productionGroupName status totalPackedQty')
      .populate('productId', 'name code category unit')
      .populate('lastUpdatedBy', 'username fullName')
      .populate('verifiedBy', 'username fullName');

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    if (req.user.role !== USER_ROLES.SUPER_USER && dispatch.unit !== req.user.unit) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ dispatch });
  } catch (error) {
    console.error('Get dispatch by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDispatch = async (req, res) => {
  try {
    const {
      order,
      customer,
      items,
      expectedDeliveryDate,
      transporterName,
      vehicleNumber,
      driverName,
      driverContact,
      shippingAddress,
      notes
    } = req.body;

    if (!order || !customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order, customer, and items are required' });
    }

    // Validate order and customer exist
    const [orderDoc, customerDoc] = await Promise.all([
      Order.findById(order),
      Customer.findById(customer)
    ]);

    if (!orderDoc) {
      return res.status(400).json({ message: 'Order not found' });
    }

    if (!customerDoc) {
      return res.status(400).json({ message: 'Customer not found' });
    }

    const dispatchData = {
      order,
      customer,
      items,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date(),
      transporterName,
      vehicleNumber,
      driverName,
      driverContact,
      shippingAddress: shippingAddress || customerDoc.address,
      unit: req.user.role === USER_ROLES.SUPER_USER ? req.body.unit : req.user.unit,
      notes
    };

    const dispatch = await Dispatch.create(dispatchData);
    await dispatch.populate([
      { path: 'packingSheetId', select: 'slNo productionGroupName status' },
      { path: 'productId', select: 'name code category unit' },
      { path: 'lastUpdatedBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      message: 'Dispatch created successfully',
      dispatch
    });
  } catch (error) {
    console.error('Create dispatch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      actualDeliveryDate,
      transporterName,
      vehicleNumber,
      driverName,
      driverContact,
      trackingNumber,
      assignedTo,
      shippingAddress,
      notes
    } = req.body;

    const dispatch = await Dispatch.findById(id);

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    if (req.user.role !== USER_ROLES.SUPER_USER && dispatch.unit !== req.user.unit) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = {};

    if (status) {
      updateData.status = status;
      if (status === 'Delivered') {
        updateData.actualDeliveryDate = actualDeliveryDate ? new Date(actualDeliveryDate) : new Date();
      }
    }

    if (transporterName) updateData.transporterName = transporterName;
    if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
    if (driverName) updateData.driverName = driverName;
    if (driverContact) updateData.driverContact = driverContact;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (shippingAddress) updateData.shippingAddress = shippingAddress;
    if (notes) updateData.notes = notes;

    const updatedDispatch = await Dispatch.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate([
      { path: 'packingSheetId', select: 'slNo productionGroupName status' },
      { path: 'productId', select: 'name code category unit' },
      { path: 'lastUpdatedBy', select: 'username fullName' }
    ]);

    res.json({
      message: 'Dispatch updated successfully',
      dispatch: updatedDispatch
    });
  } catch (error) {
    console.error('Update dispatch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDispatch = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await Dispatch.findById(id);

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    if (req.user.role !== USER_ROLES.SUPER_USER && dispatch.unit !== req.user.unit) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (['In Transit', 'Delivered'].includes(dispatch.status)) {
      return res.status(400).json({ message: 'Cannot delete dispatch that is in transit or delivered' });
    }

    await Dispatch.findByIdAndDelete(id);

    res.json({ message: 'Dispatch deleted successfully' });
  } catch (error) {
    console.error('Delete dispatch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDispatchStats = async (req, res) => {
  try {
    const { unit } = req.query;
    let query = {};

    if (req.user.role !== USER_ROLES.SUPER_USER) {
      query.unit = req.user.unit;
    } else if (unit) {
      query.unit = unit;
    }

    const stats = await Dispatch.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalDispatches = await Dispatch.countDocuments(query);
    const onTimeDeliveries = await Dispatch.countDocuments({
      ...query,
      status: 'Delivered',
      $expr: { $lte: ['$actualDeliveryDate', '$expectedDeliveryDate'] }
    });

    res.json({
      stats,
      totalDispatches,
      onTimeDeliveryRate: totalDispatches > 0 ? (onTimeDeliveries / totalDispatches) * 100 : 0
    });
  } catch (error) {
    console.error('Get dispatch stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get dispatch dashboard data for console view
export const getDispatchDashboardData = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    console.log('📊 Fetching dispatch console data for company:', req.user.companyId);

    // Get dispatch console entries for today with full relations
    const dispatchConsoleData = await Dispatch.find({
      company: req.user.companyId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate({
      path: 'packingSheetId',
      select: 'slNo productionGroupName batchNo totalPackedQty packingDate status items createdBy',
      populate: {
        path: 'createdBy',
        select: 'username fullName'
      }
    })
    .populate('lastUpdatedBy', 'username fullName')
    .populate('company', 'name location')
    .sort({ createdAt: -1 });

    // Get summary statistics
    const totalPacked = dispatchConsoleData.reduce((sum, entry) => sum + (entry.packedQuantityReadyForDispatch || 0), 0);
    const totalIndent = dispatchConsoleData.reduce((sum, entry) => sum + (entry.totalIndentQuantityOrdersForTheDay || 0), 0);
    const totalAvailable = dispatchConsoleData.reduce((sum, entry) => sum + (entry.totalAvailableStock || 0), 0);
    const totalDispatched = dispatchConsoleData.reduce((sum, entry) => sum + (entry.dispatchedQuantitySentToday || 0), 0);
    const totalExcessShortage = dispatchConsoleData.reduce((sum, entry) => sum + (entry.excessShortage || 0), 0);

    // Get approved packing sheets that don't have dispatch entries yet
    const PackingSheet = (await import('../models/Packing.js')).default;
    const approvedPackingSheetsWithoutDispatch = await PackingSheet.find({
      company: req.user.companyId,
      status: 'approved',
      approvedAt: { $gte: startOfDay, $lte: endOfDay },
      _id: { $nin: dispatchConsoleData.map(d => d.packingSheetId?._id).filter(Boolean) }
    })
    .populate('createdBy', 'username fullName')
    .populate('approvedBy', 'username fullName')
    .select('slNo productionGroupName batchNo totalPackedQty approvedAt createdBy approvedBy');

    console.log('📊 Dashboard data summary:', {
      dispatchEntries: dispatchConsoleData.length,
      orphanedPackingSheets: approvedPackingSheetsWithoutDispatch.length,
      totalPacked,
      totalIndent,
      totalAvailable,
      totalDispatched
    });

    // Format response data
    const formattedData = dispatchConsoleData.map(entry => ({
      id: entry._id,
      packingSheetId: entry.packingSheetId?._id,
      packingSheetSlNo: entry.packingSheetId?.slNo,
      packingSheetBatchNo: entry.packingSheetId?.batchNo,
      packingDate: entry.packingSheetId?.packingDate,
      productGroup: entry.productGroup,
      
      // Main dispatch console columns
      packedQuantityReadyForDispatch: entry.packedQuantityReadyForDispatch || 0,
      previousClosingStockYesterdayBalance: entry.previousClosingStockYesterdayBalance || 0,
      returnQuantityYesterdayReturns: entry.returnQuantityYesterdayReturns || 0,
      totalAvailableStock: entry.totalAvailableStock || 0,
      totalIndentQuantityOrdersForTheDay: entry.totalIndentQuantityOrdersForTheDay || 0,
      excessShortage: entry.excessShortage || 0,
      dispatchedQuantitySentToday: entry.dispatchedQuantitySentToday || 0,
      closingStockEndOfDayBalance: entry.closingStockEndOfDayBalance || 0,
      physicalStockEntryManualVerification: entry.physicalStockEntryManualVerification || 0,
      overallLoss: entry.overallLoss || 0,
      
      // Additional tracking info
      batchNo: entry.batchNo,
      status: entry.status,
      date: entry.date,
      lastUpdatedBy: entry.lastUpdatedBy,
      company: entry.company,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      
      // Packing sheet creator info
      packingSheetCreator: entry.packingSheetId?.createdBy
    }));

    res.json({
      success: true,
      data: {
        dispatchConsoleEntries: formattedData,
        orphanedPackingSheets: approvedPackingSheetsWithoutDispatch,
        summary: {
          totalEntries: dispatchConsoleData.length,
          totalPackedQuantity: totalPacked,
          totalIndentQuantity: totalIndent,
          totalAvailableStock: totalAvailable,
          totalDispatchedQuantity: totalDispatched,
          totalExcessShortage: totalExcessShortage,
          averageExcessShortage: dispatchConsoleData.length > 0 ? totalExcessShortage / dispatchConsoleData.length : 0,
          orphanedSheets: approvedPackingSheetsWithoutDispatch.length
        },
        meta: {
          date: today.toISOString().split('T')[0],
          companyId: req.user.companyId,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dispatch dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispatch dashboard data',
      error: error.message
    });
  }
};

// Update manual stock entry for dispatch
export const updateManualStock = async (req, res) => {
  try {
    const { 
      packingSheetId,
      productId, // Add productId to identify specific product in dispatch console
      productGroup, 
      packedQuantityReadyForDispatch,
      previousClosingStockYesterdayBalance,
      returnQuantityYesterdayReturns,
      totalIndentQuantityOrdersForTheDay,
      dispatchedQuantitySentToday,
      closingStockEndOfDayBalance,
      physicalStockEntryManualVerification
    } = req.body;

    console.log('📝 Updating dispatch console with data:', {
      packingSheetId,
      productId,
      productGroup,
      physicalStockEntryManualVerification,
      dispatchedQuantitySentToday
    });

    if (!packingSheetId) {
      return res.status(400).json({
        success: false,
        message: 'Packing sheet ID is required'
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Build the query - if productId is provided, update specific product entry
    let query = {
      packingSheetId: packingSheetId,
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (productId) {
      query.productId = productId;
    }

    // Build the update object - only update fields that are provided
    let updateFields = {
      status: 'updated',
      lastUpdatedBy: req.user._id
    };

    if (productGroup !== undefined) updateFields.productGroup = productGroup;
    if (packedQuantityReadyForDispatch !== undefined) updateFields.packedQuantityReadyForDispatch = packedQuantityReadyForDispatch;
    if (previousClosingStockYesterdayBalance !== undefined) updateFields.previousClosingStockYesterdayBalance = previousClosingStockYesterdayBalance;
    if (returnQuantityYesterdayReturns !== undefined) updateFields.returnQuantityYesterdayReturns = returnQuantityYesterdayReturns;
    if (totalIndentQuantityOrdersForTheDay !== undefined) updateFields.totalIndentQuantityOrdersForTheDay = totalIndentQuantityOrdersForTheDay;
    if (dispatchedQuantitySentToday !== undefined) updateFields.dispatchedQuantitySentToday = dispatchedQuantitySentToday;
    if (closingStockEndOfDayBalance !== undefined) updateFields.closingStockEndOfDayBalance = closingStockEndOfDayBalance;
    if (physicalStockEntryManualVerification !== undefined) updateFields.physicalStockEntryManualVerification = physicalStockEntryManualVerification;

    // Always set the company
    updateFields.company = req.user.companyId;

    // Update or create dispatch console entry
    const dispatchEntry = await Dispatch.findOneAndUpdate(
      query,
      { $set: updateFields },
      {
        upsert: true,
        new: true
      }
    );

    console.log('✅ Dispatch console updated successfully:', {
      query,
      updateFields,
      dispatchEntryId: dispatchEntry._id,
      status: dispatchEntry.status
    });

    res.json({
      success: true,
      message: 'Dispatch console updated successfully',
      data: {
        id: dispatchEntry._id,
        packingSheetId,
        productGroup,
        packedQuantityReadyForDispatch: dispatchEntry.packedQuantityReadyForDispatch,
        totalAvailableStock: dispatchEntry.totalAvailableStock,
        excessShortage: dispatchEntry.excessShortage,
        overallLoss: dispatchEntry.overallLoss,
        status: dispatchEntry.status,
        updatedAt: dispatchEntry.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating dispatch console:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dispatch console',
      error: error.message
    });
  }
};

// Get dispatch history with pagination and filters
export const getDispatchHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status, vehicleId, customerId } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📊 Fetching dispatch history with params:', { page, limit, startDate, endDate, status, vehicleId, customerId, userCompanyId });

    // Build filter object - using correct field names for Dispatch model
    const filter = {
      company: userCompanyId  // Assuming Dispatch uses 'company' field
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

    // Add vehicle filter (if applicable - using productGroup as vehicle equivalent)
    if (vehicleId && vehicleId !== 'all') {
      filter.productGroup = { $regex: vehicleId, $options: 'i' };
    }

    // Add product filter (using productName)
    if (customerId && customerId !== 'all') {
      filter.productName = { $regex: customerId, $options: 'i' };
    }

    console.log('🔍 Query filter:', JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get paginated dispatch history with populated details
    const dispatchHistory = await Dispatch.find(filter)
      .populate({
        path: 'packingSheetId',
        select: 'slNo productionGroupName status totalPackedQty items'
      })
      .populate({
        path: 'productId',
        select: 'name code category unit'
      })
      .populate({
        path: 'company',
        select: 'companyName'
      })
      .populate({
        path: 'lastUpdatedBy',
        select: 'username fullName'
      })
      .populate({
        path: 'verifiedBy',
        select: 'username fullName'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`📋 Found ${dispatchHistory.length} dispatch records`);

    // Get total count for pagination
    const totalCount = await Dispatch.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Calculate summary statistics
    const summaryStats = await Dispatch.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDispatches: { $sum: 1 },
          verifiedDispatches: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
          },
          dispatchedDispatches: {
            $sum: { $cond: [{ $eq: ['$status', 'dispatched'] }, 1, 0] }
          },
          completedDispatches: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingDispatches: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalPackedQty: { $sum: '$packedQuantityReadyForDispatch' },
          totalDispatchedQty: { $sum: '$dispatchedQuantitySentToday' }
        }
      }
    ]);

    const stats = summaryStats[0] || {
      totalDispatches: 0,
      verifiedDispatches: 0,
      dispatchedDispatches: 0,
      completedDispatches: 0,
      pendingDispatches: 0,
      totalPackedQty: 0,
      totalDispatchedQty: 0
    };

    console.log('📊 Summary stats:', stats);

    // Format the dispatch history data to match frontend expectations
    const formattedData = dispatchHistory.map(dispatch => ({
      id: dispatch._id,
      dispatchId: dispatch._id,
      packingSheet: {
        id: dispatch.packingSheetId?._id,
        slNo: dispatch.packingSheetId?.slNo || 'N/A',
        productGroup: dispatch.packingSheetId?.productionGroupName || dispatch.productGroup || 'N/A',
        status: dispatch.packingSheetId?.status || 'N/A'
      },
      product: {
        id: dispatch.productId?._id,
        name: dispatch.productName || dispatch.productId?.name || 'N/A',
        code: dispatch.productId?.code || '',
        category: dispatch.productId?.category || '',
        unit: dispatch.productId?.unit || ''
      },
      quantities: {
        packedQty: dispatch.packedQuantityReadyForDispatch || 0,
        previousClosing: dispatch.previousClosingStockYesterdayBalance || 0,
        returns: dispatch.returnQuantityYesterdayReturns || 0,
        totalAvailable: dispatch.totalAvailableStock || 0,
        totalIndent: dispatch.totalIndentQuantityOrdersForTheDay || 0,
        dispatched: dispatch.dispatchedQuantitySentToday || 0,
        closingStock: dispatch.closingStockEndOfDayBalance || 0,
        physicalStock: dispatch.physicalStockEntryManualVerification || 0
      },
      calculations: {
        excessShortage: dispatch.excessShortage || 0,
        overallLoss: dispatch.overallLoss || 0
      },
      status: dispatch.status || 'pending',
      date: dispatch.date,
      batchNo: dispatch.batchNo || '',
      remarks: dispatch.remarks || '',
      verifiedBy: dispatch.verifiedBy?.username || dispatch.verifiedBy?.fullName || null,
      verifiedAt: dispatch.verifiedAt,
      lastUpdatedBy: dispatch.lastUpdatedBy?.username || dispatch.lastUpdatedBy?.fullName || 'Unknown',
      createdAt: dispatch.createdAt,
      updatedAt: dispatch.updatedAt
    }));

    console.log(`✅ Formatted ${formattedData.length} dispatch history records`);

    res.json({
      success: true,
      message: 'Dispatch history retrieved successfully',
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
          vehicleId,
          customerId,
          companyId: filter.company
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dispatch history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispatch history',
      error: error.message
    });
  }
};

// Check if dispatch entry already exists for a packing sheet
export const checkExistingDispatch = async (req, res) => {
  try {
    const { packingSheetId } = req.body;

    if (!packingSheetId) {
      return res.status(400).json({ message: 'Packing sheet ID is required' });
    }

    // Check by packing sheet ID in notes field
    const existingDispatch = await Dispatch.findOne({ 
      notes: { $regex: packingSheetId, $options: 'i' }
    }).select('_id dispatchNumber status createdAt');

    return res.status(200).json({
      success: true,
      exists: !!existingDispatch,
      dispatch: existingDispatch
    });

  } catch (error) {
    console.error('Error checking existing dispatch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check existing dispatch',
      error: error.message
    });
  }
};

// Create dispatch entry from approved packing sheet
export const createDispatchFromPacking = async (req, res) => {
  try {
    const { packingSheetId } = req.body;

    if (!packingSheetId) {
      return res.status(400).json({ message: 'Packing sheet ID is required' });
    }

    // Get the approved packing sheet with full details
    const PackingSheet = (await import('../models/Packing.js')).default;
    
    const packingSheet = await PackingSheet.findById(packingSheetId)
      .populate({
        path: 'productionGroup',
        select: 'name description items',
        populate: {
          path: 'items',
          select: 'name code category unit'
        }
      })
      .populate('company', 'name')
      .lean();

    if (!packingSheet) {
      return res.status(404).json({ message: 'Packing sheet not found' });
    }

    if (packingSheet.status !== 'approved') {
      return res.status(400).json({ message: 'Packing sheet must be approved first' });
    }

    // Check if dispatch already exists for this packing sheet
    const existingDispatch = await Dispatch.findOne({ 
      notes: { $regex: packingSheetId, $options: 'i' } 
    });

    if (existingDispatch) {
      return res.status(400).json({ 
        message: 'Dispatch already exists for this packing sheet',
        existingDispatch: existingDispatch.dispatchNumber 
      });
    }

    // Prepare dispatch items from packed quantities (only items with packedQty > 0)
    const dispatchItems = packingSheet.items
      .filter(item => item.packedQty > 0)
      .map(item => ({
        productName: item.productName,
        quantity: item.packedQty, // Use actual packed quantity
        batchNumber: `BATCH-${packingSheet.productionGroupName}-${Date.now()}`
      }));

    if (dispatchItems.length === 0) {
      return res.status(400).json({ message: 'No items with packed quantities to dispatch' });
    }

    // Create dispatch entry with proper structure matching dashboard
    const dispatchData = {
      // Auto-generate dispatch number
      dispatchNumber: `DISP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      
      // Company info
      company: packingSheet.company._id,
      unit: req.user?.unit || 'default',
      
      // Items to dispatch
      items: dispatchItems,
      
      // Dates
      dispatchDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      
      // Status
      status: 'PENDING',
      
      // Tracking info
      assignedTo: req.user?._id,
      
      // Reference to source packing sheet
      notes: `Auto-created from approved packing sheet: ${packingSheet.productionGroupName} (ID: ${packingSheetId})`,
      
      // Additional metadata for tracking
      sourcePackingSheetId: packingSheetId,
      sourceProductionGroup: packingSheet.productionGroupName
    };

    // Create the dispatch record
    const newDispatch = new Dispatch(dispatchData);
    const savedDispatch = await newDispatch.save();

    console.log('✅ Successfully created dispatch from packing sheet:', {
      dispatchNumber: savedDispatch.dispatchNumber,
      packingSheetId: packingSheetId,
      itemsCount: dispatchItems.length,
      totalQuantity: dispatchItems.reduce((sum, item) => sum + item.quantity, 0)
    });

    return res.status(201).json({
      success: true,
      message: 'Dispatch entry created successfully from approved packing sheet',
      data: {
        dispatch: savedDispatch,
        packingSheet: {
          id: packingSheet._id,
          productionGroup: packingSheet.productionGroupName,
          totalPackedQty: packingSheet.totalPackedQty,
          packingLoss: packingSheet.packingLoss
        }
      }
    });

  } catch (error) {
    console.error('Error creating dispatch from packing sheet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create dispatch from packing sheet',
      error: error.message
    });
  }
};
