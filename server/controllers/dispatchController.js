import Dispatch from '../models/Dispatch.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import PackingSheet from '../models/Packing.js';
import { USER_ROLES } from '../../shared/schema.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { Item } from '../models/Inventory.js';

// Helper function to convert number to words (Indian numbering system)
const convertNumberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const convertTwoDigit = (n) => {
    if (n < 10) return ones[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };

  const convertThreeDigit = (n) => {
    if (n < 100) return convertTwoDigit(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertTwoDigit(n % 100) : '');
  };

  if (num < 1000) return convertThreeDigit(num);

  let crores = Math.floor(num / 10000000);
  let lakhs = Math.floor((num % 10000000) / 100000);
  let thousands = Math.floor((num % 100000) / 1000);
  let remainder = num % 1000;

  let words = '';
  if (crores > 0) words += convertTwoDigit(crores) + ' Crore ';
  if (lakhs > 0) words += convertTwoDigit(lakhs) + ' Lakh ';
  if (thousands > 0) words += convertTwoDigit(thousands) + ' Thousand ';
  if (remainder > 0) words += convertThreeDigit(remainder);

  return words.trim();
};

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
    // Support optional date range filters from query params
    const today = new Date();
    const { startDate, endDate } = req.query;

    let startOfDay, endOfDay;
    if (startDate || endDate) {
      // If provided, use provided dates (normalize times)
      if (startDate) {
        const s = new Date(startDate);
        startOfDay = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      }
      if (endDate) {
        const e = new Date(endDate);
        endOfDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
      }
      // If only one bound provided, default the other to the same day
      if (!startOfDay && endOfDay) startOfDay = new Date(endOfDay.getFullYear(), endOfDay.getMonth(), endOfDay.getDate(), 0, 0, 0, 0);
      if (!endOfDay && startOfDay) endOfDay = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate(), 23, 59, 59, 999);
    } else {
      // Default to today's range when no explicit dates provided
      startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    }

    console.log('📊 Fetching dispatch console data for company:', req.user.companyId);

    // Build base query with date range
    let baseQuery = { date: { $gte: startOfDay, $lte: endOfDay } };

    // If user is not super user, limit to their company
    if (req.user.role !== USER_ROLES.SUPER_USER) {
      baseQuery.company = req.user.companyId;
    } else {
      // For super users, allow optional location filter to select companies by location
      const { location } = req.query;
      if (location) {
        const Company = (await import('../models/Company.js')).default;
        const matchingCompanies = await Company.find({ location: { $regex: `^${location}$`, $options: 'i' } }).select('_id');
        const companyIds = matchingCompanies.map(c => c._id);
        if (companyIds.length > 0) baseQuery.company = { $in: companyIds };
      } else {
        baseQuery.company = req.user.companyId;
      }
    }

    // Get dispatch console entries with full relations
    const dispatchConsoleData = await Dispatch.find(baseQuery)
      .populate({
        path: 'packingSheetId',
        select: 'slNo productionGroupName batchNo totalPackedQty packingDate status items createdBy',
        populate: {
          path: 'createdBy',
          select: 'username fullName'
        }
      })
      .populate('productId', 'name code category batch unit') // Populate product details
      .populate('lastUpdatedBy', 'username fullName')
      .populate('company', 'name location')
      .sort({ createdAt: -1 });

    // Get approved packing sheets that don't have dispatch entries yet
    const PackingSheet = (await import('../models/Packing.js')).default;
    // For packing sheets, apply same company filter as dispatch query
    const packingQuery = {
      status: 'approved',
      approvedAt: { $gte: startOfDay, $lte: endOfDay },
      _id: { $nin: dispatchConsoleData.map(d => d.packingSheetId?._id).filter(Boolean) }
    };
    if (baseQuery.company) packingQuery.company = baseQuery.company;

    const approvedPackingSheetsWithoutDispatch = await PackingSheet.find(packingQuery)
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName')
      .select('slNo productionGroupName batchNo totalPackedQty approvedAt createdBy approvedBy');

    console.log('📊 Dashboard data summary:', {
      dispatchEntries: dispatchConsoleData.length,
      orphanedPackingSheets: approvedPackingSheetsWithoutDispatch.length
    });

    // Format response data
    const formattedData = dispatchConsoleData.map(entry => {
      // Calculate values on-the-fly (in case database has old 0 values)
      const packedQty = entry.packedQuantityReadyForDispatch || 0;
      const previousClosing = entry.previousClosingStockYesterdayBalance || 0;
      const returns = entry.returnQuantityYesterdayReturns || 0;
      const totalIndent = entry.totalIndentQuantityOrdersForTheDay || 0;
      const dispatched = entry.dispatchedQuantitySentToday || 0;
      const physicalStock = entry.physicalStockEntryManualVerification || 0;

      // Calculate totalAvailableStock = Packed + Previous Closing + Returns
      const calculatedTotalAvailable = packedQty + previousClosing + returns;

      // Calculate excessShortage = Total Indent - Total Available (positive = shortage, negative = excess)
      const calculatedExcessShortage = totalIndent - calculatedTotalAvailable;

      // Calculate overallLoss = Total Available - Dispatched - Physical Stock
      const calculatedOverallLoss = calculatedTotalAvailable - dispatched - physicalStock;

      console.log(`🧮 Calculating for ${entry.productGroup}:`, {
        packed: packedQty,
        previousClosing: previousClosing,
        returns: returns,
        calculated_total: calculatedTotalAvailable,
        stored_total: entry.totalAvailableStock,
        totalIndent: totalIndent,
        excessShortage: calculatedExcessShortage
      });

      return {
        id: entry._id,
        packingSheetId: entry.packingSheetId?._id,
        packingSheetSlNo: entry.packingSheetId?.slNo,
        packingSheetBatchNo: entry.packingSheetId?.batchNo,
        packingDate: entry.packingSheetId?.packingDate,
        productGroup: entry.productGroup,
        productId: entry.productId?._id,
        productName: entry.productName || entry.productId?.name || entry.productGroup, // Show product name if available
        productCode: entry.productId?.code,
        productCategory: entry.productId?.category,

        // Main dispatch console columns - use calculated values
        packedQuantityReadyForDispatch: packedQty,
        previousClosingStockYesterdayBalance: previousClosing,
        returnQuantityYesterdayReturns: returns,
        totalAvailableStock: calculatedTotalAvailable, // ✅ Now calculated!
        totalIndentQuantityOrdersForTheDay: totalIndent,
        excessShortage: calculatedExcessShortage, // ✅ Now calculated!
        dispatchedQuantitySentToday: dispatched,
        closingStockEndOfDayBalance: entry.closingStockEndOfDayBalance || 0,
        physicalStockEntryManualVerification: physicalStock,
        overallLoss: calculatedOverallLoss, // ✅ Now calculated!

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
      };
    });

    // Get summary statistics using calculated values from formattedData
    const totalPacked = formattedData.reduce((sum, entry) => sum + (entry.packedQuantityReadyForDispatch || 0), 0);
    const totalIndent = formattedData.reduce((sum, entry) => sum + (entry.totalIndentQuantityOrdersForTheDay || 0), 0);
    const totalAvailable = formattedData.reduce((sum, entry) => sum + (entry.totalAvailableStock || 0), 0);
    const totalDispatched = formattedData.reduce((sum, entry) => sum + (entry.dispatchedQuantitySentToday || 0), 0);
    const totalExcessShortage = formattedData.reduce((sum, entry) => sum + (entry.excessShortage || 0), 0);

    console.log('📊 Dashboard summary calculations completed:', {
      totalPacked,
      totalIndent,
      totalAvailable,
      totalDispatched,
      totalExcessShortage,
      entriesCount: formattedData.length
    });

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
          startDate: startOfDay ? startOfDay.toISOString().split('T')[0] : null,
          endDate: endOfDay ? endOfDay.toISOString().split('T')[0] : null,
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

// Update manual stock entry for dispatch - ONLY updates physical stock field
export const updateManualStock = async (req, res) => {
  try {
    const {
      packingSheetId,
      productId,
      productGroup,
      physicalStockEntryManualVerification,
      dispatchedQuantitySentToday
    } = req.body;

    console.log('📝 Updating stock entry:', {
      packingSheetId,
      productId,
      productGroup,
      physicalStockEntryManualVerification,
      dispatchedQuantitySentToday
    });

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Build the query to find the specific dispatch entry
    let query = {
      date: { $gte: startOfDay, $lte: endOfDay },
      company: req.user.companyId
    };

    // Add optional filters
    if (packingSheetId) {
      query.packingSheetId = packingSheetId;
    }

    if (productId) {
      query.productId = productId;
    }

    if (productGroup) {
      query.productGroup = productGroup;
    }

    console.log('🔍 Finding dispatch entry:', JSON.stringify(query, null, 2));

    // Find the existing dispatch record
    const existingDispatch = await Dispatch.findOne(query);

    if (!existingDispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch entry not found for today'
      });
    }

    // Update fields based on what was provided
    if (physicalStockEntryManualVerification !== undefined && physicalStockEntryManualVerification !== null) {
      existingDispatch.physicalStockEntryManualVerification = physicalStockEntryManualVerification;

      // Recalculate overallLoss = Closing Stock - Physical Stock
      existingDispatch.overallLoss = existingDispatch.closingStockEndOfDayBalance - physicalStockEntryManualVerification;
    }

    if (dispatchedQuantitySentToday !== undefined && dispatchedQuantitySentToday !== null) {
      existingDispatch.dispatchedQuantitySentToday = dispatchedQuantitySentToday;
      existingDispatch.qtyIssued = dispatchedQuantitySentToday;

      // Recalculate closing stock
      const totalAvailableStock =
        (existingDispatch.packedQuantityReadyForDispatch || 0) +
        (existingDispatch.previousClosingStockYesterdayBalance || 0) +
        (existingDispatch.returnQuantityYesterdayReturns || 0);

      existingDispatch.closingStockEndOfDayBalance = totalAvailableStock - dispatchedQuantitySentToday;
    }

    existingDispatch.lastUpdatedBy = req.user._id;
    existingDispatch.updatedAt = new Date();

    // Save the updated dispatch entry
    await existingDispatch.save();

    console.log('✅ Stock updated successfully:', {
      dispatchId: existingDispatch._id,
      dispatchedQuantitySentToday: existingDispatch.dispatchedQuantitySentToday,
      physicalStock: existingDispatch.physicalStockEntryManualVerification,
      closingStock: existingDispatch.closingStockEndOfDayBalance
    });

    res.json({
      success: true,
      message: 'Physical stock updated successfully',
      data: {
        id: existingDispatch._id,
        dispatchedQuantitySentToday: existingDispatch.dispatchedQuantitySentToday,
        qtyIssued: existingDispatch.qtyIssued,
        physicalStockEntryManualVerification: existingDispatch.physicalStockEntryManualVerification,
        closingStockEndOfDayBalance: existingDispatch.closingStockEndOfDayBalance,
        overallLoss: existingDispatch.overallLoss,
        updatedAt: existingDispatch.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
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
        path: 'customer',
        select: 'name phone email address city'
      })
      .populate({
        path: 'salesPerson',
        select: 'username fullName'
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
      customer: dispatch.customer ? {
        id: dispatch.customer._id,
        name: dispatch.customer.name || 'Unknown',
        phone: dispatch.customer.phone || '',
        email: dispatch.customer.email || '',
        address: dispatch.customer.address || '',
        city: dispatch.customer.city || ''
      } : null,
      salesPerson: dispatch.salesPerson ? {
        id: dispatch.salesPerson._id,
        username: dispatch.salesPerson.username || '',
        fullName: dispatch.salesPerson.fullName || ''
      } : null,
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
      deliveryDate: dispatch.approvedAt || null,
      dcno: dispatch.dcno || '',
      batchNo: dispatch.batchNo || '',
      remarks: dispatch.remarks || '',
      vehicleNumber: dispatch.vehicleNumber || '',
      transporterName: dispatch.transporterName || '',
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

// Update dispatch delivery date and qty issued
export const updateDispatchDelivery = async (req, res) => {
  try {
    const { dispatchId } = req.params;
    const { deliveryDate, qtyIssued } = req.body;
    const userCompanyId = req.user.companyId;

    console.log('📝 Updating dispatch delivery:', { dispatchId, deliveryDate, qtyIssued, userCompanyId });

    // Validate dispatch ID
    if (!dispatchId || !mongoose.Types.ObjectId.isValid(dispatchId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid dispatch ID is required'
      });
    }

    // Find dispatch and verify company access
    const dispatch = await Dispatch.findOne({
      _id: dispatchId,
      company: userCompanyId
    });

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found or access denied'
      });
    }

    // Build update object
    const updateData = {
      lastUpdatedBy: req.user.id,
      updatedAt: new Date()
    };

    if (deliveryDate) {
      updateData.deliveryDate = new Date(deliveryDate);
      updateData.approvedAt = new Date(deliveryDate); // Set approvedAt as delivery date
    }

    if (qtyIssued !== undefined && qtyIssued !== null) {
      updateData.qtyIssued = parseFloat(qtyIssued);
    }

    // Update dispatch
    const updatedDispatch = await Dispatch.findByIdAndUpdate(
      dispatchId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name phone email')
      .populate('salesPerson', 'username fullName')
      .populate('productId', 'name code category unit')
      .lean();

    console.log('✅ Dispatch updated successfully:', updatedDispatch._id);

    res.json({
      success: true,
      message: 'Dispatch updated successfully',
      data: updatedDispatch
    });

  } catch (error) {
    console.error('❌ Error updating dispatch delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dispatch',
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

// Get delivery challan data - simplified API for Product/Product Group and Indent Qty only
export const getDeliveryChallanData = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    console.log('📋 Fetching delivery challan data for company:', req.user.companyId);

    // Get dispatch console entries for today with minimal data needed for delivery challan
    const deliveryChallanData = await Dispatch.find({
      company: req.user.companyId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate({
        path: 'packingSheetId',
        select: 'productionGroupName batchNo'
      })
      .populate('company', 'name')
      .select('productGroup productName totalIndentQuantityOrdersForTheDay batchNo packingSheetId dcno qtyIssued status indentQty')
      .sort({ productGroup: 1, productName: 1 });

    console.log('📋 Found delivery challan entries:', deliveryChallanData.length);

    // Format data to include DCno, Product/Product Group, Indent Qty and Qty Issued
    const formattedData = deliveryChallanData.map(entry => ({
      id: entry._id,
      dcno: entry.dcno || 'N/A',
      productGroup: entry.productGroup,
      productName: entry.productName || entry.productGroup, // Fallback to productGroup if productName not available
      indentQty: entry.indentQty || entry.totalIndentQuantityOrdersForTheDay || 0,
      qtyIssued: entry.qtyIssued || 0,
      status: entry.status || 'pending',
      batchNo: entry.batchNo || entry.packingSheetId?.batchNo || 'N/A'
    }));

    // Group by product group for better organization
    const groupedData = formattedData.reduce((acc, item) => {
      const group = item.productGroup;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {});

    // Calculate totals
    const totalIndentQty = formattedData.reduce((sum, item) => sum + item.indentQty, 0);
    const totalProducts = formattedData.length;
    const totalGroups = Object.keys(groupedData).length;

    console.log('📋 Delivery challan summary:', {
      totalProducts,
      totalGroups,
      totalIndentQty
    });

    res.json({
      success: true,
      data: {
        products: formattedData,
        groupedProducts: groupedData,
        summary: {
          totalProducts,
          totalGroups,
          totalIndentQty
        },
        meta: {
          date: today.toISOString().split('T')[0],
          companyId: req.user.companyId,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching delivery challan data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery challan data',
      error: error.message
    });
  }
};

// Update Qty Issued for Delivery Challan
export const updateQtyIssued = async (req, res) => {
  try {
    const { dcNo, qtyIssued, dispatchId, indentQty, forceUpdate } = req.body;

    if ((!dcNo && !dispatchId) || qtyIssued === undefined) {
      return res.status(400).json({
        success: false,
        message: 'DC No or Dispatch ID and Qty Issued are required'
      });
    }

    let dispatch;

    // Find dispatch by ID or DC No
    if (dispatchId) {
      dispatch = await Dispatch.findById(dispatchId);
    } else if (dcNo) {
      dispatch = await Dispatch.findOne({ dcno: dcNo });
    }

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found'
      });
    }

    // Check if qty exceeds indent qty (if indent qty > 0).
    // NOTE: We no longer block or require confirmation when qtyIssued exceeds indentQty.
    //       This value is kept only for information/logging.
    const exceedsIndent = indentQty && indentQty > 0 && qtyIssued > indentQty;

    // Check if already dispatched or approved - require confirmation unless forceUpdate is true
    const isFinalStatus = dispatch.status === 'dispatched' || dispatch.status === 'approved';

    if (isFinalStatus && !forceUpdate) {
      const message = `This item is already ${dispatch.status}. Updating Qty Issued for dispatched items may affect stock calculations. Do you want to proceed?`;

      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        message: message,
        currentStatus: dispatch.status,
        currentQtyIssued: dispatch.qtyIssued,
        newQtyIssued: qtyIssued,
        indentQty: indentQty,
        exceedsIndent: exceedsIndent
      });
    }

    // Previously we validated qtyIssued against available item.batch inventory
    // and blocked when requested quantity was greater than available.
    // Business requirement: allow issuing more than available and track the
    // negative stock in closing balance, so this validation is now removed.

    // Store old qty for logging if this is a forced update
    const oldQtyIssued = dispatch.qtyIssued;

    // Update qty issued and related stock fields
    dispatch.qtyIssued = qtyIssued;
    dispatch.dispatchedQuantitySentToday = qtyIssued;

    // Recalculate all stock fields properly
    // Total Available Stock = Packed + Previous Closing + Returns
    const totalAvailableStock =
      (dispatch.packedQuantityReadyForDispatch || 0) +
      (dispatch.previousClosingStockYesterdayBalance || 0) +
      (dispatch.returnQuantityYesterdayReturns || 0);

    dispatch.totalAvailableStock = totalAvailableStock;

    // Closing Stock End of Day = Total Available - Dispatched
    // NOTE: We now allow this value to be negative so that overs-issuing
    // beyond available stock is reflected as a minus balance.
    dispatch.closingStockEndOfDayBalance = totalAvailableStock - (qtyIssued || 0);

    // Overall Loss = Closing Stock - Physical Stock Entry
    if (dispatch.physicalStockEntryManualVerification !== undefined) {
      dispatch.overallLoss = dispatch.closingStockEndOfDayBalance - (dispatch.physicalStockEntryManualVerification || 0);
    }

    dispatch.updatedAt = new Date();
    const updatedDispatch = await dispatch.save();

    // Log if this was a forced update
    if (forceUpdate && (isFinalStatus || exceedsIndent)) {
      console.log(`⚠️ Forced qty update:`, {
        dispatchId: dispatch._id,
        dcNo: dispatch.dcno,
        oldQty: oldQtyIssued,
        newQty: qtyIssued,
        indentQty: indentQty,
        exceedsIndent: exceedsIndent,
        status: dispatch.status
      });
    }

    // Populate related data
    await updatedDispatch.populate('productId', 'name code category unit');

    res.status(200).json({
      success: true,
      message: forceUpdate
        ? 'Qty issued updated successfully (with override)'
        : 'Qty issued updated successfully',
      data: updatedDispatch,
      wasForced: !!forceUpdate
    });
  } catch (error) {
    console.error('Error in updateQtyIssued:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Approve Product in Delivery Challan
export const approveProduct = async (req, res) => {
  try {
    const { dcNo } = req.body;

    if (!dcNo) {
      return res.status(400).json({
        success: false,
        message: 'DC No is required'
      });
    }

    // Find the dispatch record by DC No (note: field name is 'dcno' in DB)
    const dispatch = await Dispatch.findOne({ dcno: dcNo });

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found with DC No: ' + dcNo
      });
    }

    // Update status to approved
    dispatch.status = 'approved';
    dispatch.approvedAt = new Date();
    dispatch.approvedBy = req.user?._id;
    dispatch.updatedAt = new Date();
    const updatedDispatch = await dispatch.save();

    // Populate related data
    await updatedDispatch.populate('productId', 'name code category unit');
    await updatedDispatch.populate('customerId', 'name address phone email');

    res.status(200).json({
      success: true,
      message: 'Product approved successfully',
      data: updatedDispatch
    });
  } catch (error) {
    console.error('Error in approveProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate Invoice PDF for Delivery Challan
export const generateInvoice = async (req, res) => {
  try {
    const { dcNo } = req.body;

    if (!dcNo) {
      return res.status(400).json({
        success: false,
        message: 'DC No is required'
      });
    }

    // Import PDFKit dynamically
    const PDFDocument = (await import('pdfkit')).default;

    // Fetch delivery challan details with related data (note: field name is 'dcno' in DB)
    const dispatch = await Dispatch.findOne({ dcno: dcNo })
      .populate('productId', 'name code category unit')
      .populate('company', 'name address phone email');

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found with DC No: ' + dcNo
      });
    }

    // Check if approved or in an allowed status (case-insensitive)
    const allowedStatusesForInvoice = ['approved', 'dispatched', 'completed', 'updated', 'delivered', 'verified'];
    const dispatchStatus = (dispatch.status || '').toString().toLowerCase();
    if (!allowedStatusesForInvoice.includes(dispatchStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate invoice. Current status: ${dispatch.status}. Please approve the product before generating invoice or change status to one of: ${allowedStatusesForInvoice.join(', ')}`
      });
    }

    // Fetch customer and order information based on company and today's date
    const Order = (await import('../models/Order.js')).default;
    const Customer = (await import('../models/Customer.js')).default;

    // Find orders for today with this company and product
    const today = new Date(dispatch.date);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const orders = await Order.find({
      companyId: dispatch.company,
      orderDate: { $gte: startOfDay, $lte: endOfDay },
      'products.product': dispatch.productId
    })
      .populate('customer', 'name address phone email customerCode')
      .populate('salesPerson', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get customer info from first order or use company info
    let customerInfo = null;
    let orderCount = 0;
    let orderDetails = null;

    if (orders.length > 0) {
      customerInfo = orders[0].customer;
      orderDetails = orders[0];
      // Count total orders for this customer
      if (customerInfo) {
        orderCount = await Order.countDocuments({ customer: customerInfo._id });
      }
    }

    // If no customer found, try to get any customer associated with this company
    if (!customerInfo) {
      const anyCustomer = await Customer.findOne({ companyId: dispatch.company });
      if (anyCustomer) {
        customerInfo = anyCustomer;
      }
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${dcNo}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add company header
    doc.fontSize(22)
      .font('Helvetica-Bold')
      .text(dispatch.company?.name || 'SUNRISE BAKERY', { align: 'center' })
      .fontSize(10)
      .font('Helvetica')
      .text('Premium Quality Bakery Products', { align: 'center' });

    if (dispatch.company?.address) {
      doc.text(`Address: ${dispatch.company.address}`, { align: 'center' });
    } else {
      doc.text('Address: Your Company Address, City, State - PIN', { align: 'center' });
    }

    if (dispatch.company?.phone) {
      doc.text(`Phone: ${dispatch.company.phone} | Email: ${dispatch.company.email || 'info@sunrise.com'}`, { align: 'center' });
    } else {
      doc.text('Phone: +91 XXXXXXXXXX | Email: info@sunrise.com', { align: 'center' });
    }

    doc.text('GSTIN: XXXXXXXXXXXX', { align: 'center' })
      .moveDown(0.5);

    // Add invoice title
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('DELIVERY INVOICE', { align: 'center' })
      .moveDown(0.5);

    // Add horizontal line
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.5);

    // Invoice details - Left side
    const leftColumn = 50;
    const rightColumn = 320;
    let yPosition = doc.y;

    doc.fontSize(11)
      .font('Helvetica-Bold')
      .text('Invoice Details:', leftColumn, yPosition);

    yPosition += 18;
    doc.font('Helvetica')
      .text(`DC No: `, leftColumn, yPosition, { continued: true })
      .font('Helvetica-Bold')
      .text(`${dispatch.dcNo || dcNo}`);

    yPosition += 15;
    doc.font('Helvetica')
      .text(`Invoice Date: ${new Date().toLocaleDateString('en-IN')}`, leftColumn, yPosition);

    yPosition += 15;
    doc.text(`Dispatch Date: ${new Date(dispatch.createdAt).toLocaleDateString('en-IN')}`, leftColumn, yPosition);

    yPosition += 15;
    doc.font('Helvetica-Bold')
      .fillColor('#228B22')
      .text(`Status: ${dispatch.status.toUpperCase()}`, leftColumn, yPosition)
      .fillColor('#000000');

    if (dispatch.orderId?.orderNo) {
      yPosition += 15;
      doc.font('Helvetica')
        .text(`Order No: ${dispatch.orderId.orderNo}`, leftColumn, yPosition);
    } else if (orderDetails?.orderCode) {
      yPosition += 15;
      doc.font('Helvetica')
        .text(`Order No: ${orderDetails.orderCode}`, leftColumn, yPosition);
    }

    // Customer details - Right side
    yPosition = doc.y - 90;
    doc.font('Helvetica-Bold')
      .text('Bill To:', rightColumn, yPosition);

    yPosition += 18;
    doc.font('Helvetica-Bold')
      .fontSize(11)
      .text(`${customerInfo?.name || dispatch.company?.name || 'Walk-in Customer'}`, rightColumn, yPosition);

    yPosition += 15;
    doc.font('Helvetica')
      .fontSize(10);

    if (customerInfo?.customerCode) {
      doc.text(`Customer Code: ${customerInfo.customerCode}`, rightColumn, yPosition);
      yPosition += 15;
    }

    if (customerInfo?.address) {
      doc.text(`Address: ${customerInfo.address}`, rightColumn, yPosition, { width: 230 });
      yPosition += 25;
    }

    if (customerInfo?.phone) {
      doc.text(`Phone: ${customerInfo.phone}`, rightColumn, yPosition);
      yPosition += 15;
    }

    if (customerInfo?.email) {
      doc.text(`Email: ${customerInfo.email}`, rightColumn, yPosition);
      yPosition += 15;
    }

    // Order information
    if (orderCount > 0) {
      doc.font('Helvetica-Bold')
        .text(`Total Orders: ${orderCount}`, rightColumn, yPosition);
      yPosition += 15;
    }

    if (orders.length > 0) {
      doc.font('Helvetica')
        .text(`Today's Orders: ${orders.length}`, rightColumn, yPosition);
    }

    doc.moveDown(1);

    // Add horizontal line
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.5);

    // Product table header
    const tableTop = doc.y;
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000');

    // Table headers with borders
    doc.rect(50, tableTop - 5, 500, 20).stroke();

    doc.text('S.No', 55, tableTop, { width: 30 });
    doc.text('Product Name / Group', 100, tableTop, { width: 180 });
    doc.text('Batch No', 290, tableTop, { width: 70 });
    doc.text('Indent Qty', 370, tableTop, { width: 80, align: 'center' });
    doc.text('Issued Qty', 460, tableTop, { width: 80, align: 'center' });

    // Product details
    let productY = tableTop + 25;
    doc.fontSize(10)
      .font('Helvetica');

    // Draw row border
    doc.rect(50, productY - 5, 500, 45).stroke();

    doc.text('1', 55, productY, { width: 30 });

    const productName = dispatch.productId?.name || dispatch.productName || 'N/A';
    const productGroup = dispatch.productGroup || '';

    doc.text(productName, 100, productY, { width: 180 });
    if (productGroup) {
      doc.fontSize(8)
        .fillColor('#666666')
        .text(productGroup, 100, productY + 12, { width: 180 })
        .fillColor('#000000')
        .fontSize(10);
    }

    doc.text(dispatch.batchNo || 'N/A', 290, productY, { width: 70 });
    doc.text((dispatch.indentQty || dispatch.totalIndentQuantityOrdersForTheDay || 0).toString(), 370, productY, { width: 80, align: 'center' });
    doc.font('Helvetica-Bold')
      .text((dispatch.qtyIssued || 0).toString(), 460, productY, { width: 80, align: 'center' });

    doc.font('Helvetica');
    productY += 45;

    doc.moveDown(0.5);

    // Summary section
    const summaryY = productY + 10;
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('Summary:', leftColumn, summaryY);

    doc.font('Helvetica')
      .text(`Total Indent Quantity: ${dispatch.indentQty || dispatch.totalIndentQuantityOrdersForTheDay || 0}`, leftColumn, summaryY + 20);

    doc.font('Helvetica-Bold')
      .text(`Total Issued Quantity: ${dispatch.qtyIssued || 0}`, leftColumn, summaryY + 35);

    // Additional information
    doc.moveDown(1);
    doc.fontSize(9)
      .font('Helvetica')
      .text('Additional Information:', leftColumn, doc.y);

    doc.moveDown(0.3);

    if (dispatch.unit) {
      doc.text(`Unit: ${dispatch.unit}`, leftColumn);
    }

    if (dispatch.vehicleNumber) {
      doc.moveDown(0.3);
      doc.text(`Vehicle Number: ${dispatch.vehicleNumber}`, leftColumn);
    }

    if (dispatch.transporterName) {
      doc.moveDown(0.3);
      doc.text(`Transporter: ${dispatch.transporterName}`, leftColumn);
    }

    if (dispatch.notes) {
      doc.moveDown(0.5);
      doc.text(`Notes: ${dispatch.notes}`, leftColumn, doc.y, { width: 500 });
    }

    // Terms and conditions
    doc.moveDown(1);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Terms & Conditions:', leftColumn, doc.y);

    doc.font('Helvetica')
      .fontSize(7)
      .text('1. All goods once sold are not returnable.', leftColumn, doc.y + 8)
      .text('2. Delivery subject to availability.', leftColumn, doc.y + 13)
      .text('3. Disputes if any subject to local jurisdiction.', leftColumn, doc.y + 18);

    // Footer with signature
    doc.moveDown(1.5);

    const footerY = doc.y;

    // Authorized Signature - Left
    doc.fontSize(9)
      .font('Helvetica')
      .text('Received By:', leftColumn, footerY)
      .moveTo(leftColumn, footerY + 50)
      .lineTo(leftColumn + 150, footerY + 50)
      .stroke()
      .text('Customer Signature', leftColumn, footerY + 55);

    // Company Signature - Right
    doc.text('For Sunrise Bakery:', rightColumn + 80, footerY)
      .moveTo(rightColumn + 80, footerY + 50)
      .lineTo(rightColumn + 230, footerY + 50)
      .stroke()
      .text('Authorized Signatory', rightColumn + 80, footerY + 55);

    // Bottom border line
    doc.moveDown(1);
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    // Computer generated invoice note
    doc.moveDown(0.5);
    doc.fontSize(7)
      .font('Helvetica-Oblique')
      .fillColor('#666666')
      .text(`This is a computer generated invoice and does not require a signature. Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    // Finalize PDF
    doc.end();

    // Update invoice generated status in database
    dispatch.invoiceGenerated = true;
    dispatch.invoiceGeneratedAt = new Date();
    dispatch.updatedAt = new Date();
    await dispatch.save();

  } catch (error) {
    console.error('Error in generateInvoice:', error);

    // Check if response headers are already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate invoice',
        error: error.message
      });
    }
  }
};

// Get Next DC Number
export const getNextDCNumber = async (req, res) => {
  try {
    // Use the static method from Dispatch model to generate next DCno
    const nextDCno = await Dispatch.generateNextDCno(req.user.companyId);

    res.status(200).json({
      success: true,
      nextDCNumber: nextDCno,
      dcNo: nextDCno // Keep both for compatibility
    });
  } catch (error) {
    console.error('Error getting next DC number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate DC number',
      error: error.message
    });
  }
};

// Create Dispatch Order from Delivery Challan
export const createDispatchOrder = async (req, res) => {
  try {
    const { dcNo, salesmanId, customerId, by, to } = req.body;

    // Validate required fields
    if (!salesmanId || !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Salesman and customer are required'
      });
    }

    // Import required models
    const User = (await import('../models/User.js')).default;
    const Company = (await import('../models/Company.js')).default;

    // Verify salesman exists
    const salesman = await User.findById(salesmanId);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Find today's orders for this customer
    const orders = await Order.find({
      customer: customerId,
      orderDate: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('products.product', 'name code category productGroup')
      .populate('companyId', 'name');

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this customer today'
      });
    }

    // Generate DC number if not provided
    const finalDCNo = dcNo || await Dispatch.generateNextDCno();

    // Create dispatch entries for each product in the orders
    const dispatchEntries = [];
    for (const order of orders) {
      for (const productItem of order.products) {
        const existingDispatch = await Dispatch.findOne({
          dcno: finalDCNo,
          productId: productItem.product._id,
          company: order.companyId
        });

        if (!existingDispatch) {
          const dispatchEntry = new Dispatch({
            dcno: finalDCNo,
            dcNo: finalDCNo,
            orderId: order._id,
            productId: productItem.product._id,
            productName: productItem.product.name,
            productGroup: productItem.product.productGroup || productItem.product.category,
            company: order.companyId,
            indentQty: 0,
            totalIndentQuantityOrdersForTheDay: productItem.quantity,
            qtyIssued: productItem.quantity,
            status: 'pending',
            date: new Date(),
            salesPerson: salesmanId,
            customer: customerId,
            by: by || salesman.fullName || salesman.username,
            to: to || customer.name,
            createdBy: req.user.id,
            lastUpdatedBy: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await dispatchEntry.save();
          dispatchEntries.push(dispatchEntry);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Dispatch order created successfully with DC No: ${finalDCNo}`,
      dcNo: finalDCNo,
      dispatchCount: dispatchEntries.length,
      dispatches: dispatchEntries
    });

  } catch (error) {
    console.error('Error creating dispatch order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dispatch order',
      error: error.message
    });
  }
};

// Get today's products for a specific salesman and customer
export const getTodaysProducts = async (req, res) => {
  try {
    const { salesmanId, customerId } = req.query;

    console.log('📦 Fetching today\'s products for:', { salesmanId, customerId, companyId: req.user.companyId });

    // Get today's date range (start and end of day) - Use local time, not UTC
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log('📅 Date range:', { startOfDay, endOfDay, today });

    // First, check if ANY dispatches exist for this company
    const totalDispatches = await Dispatch.countDocuments({ company: req.user.companyId });
    console.log(`📊 Total dispatches for company: ${totalDispatches}`);

    // Check dispatches for today without status filter
    const todayDispatches = await Dispatch.countDocuments({
      company: req.user.companyId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    console.log(`📊 Dispatches for today (any status): ${todayDispatches}`);

    // Build query with optional filters
    const query = {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      company: req.user.companyId,
      status: { $in: ['pending', 'updated', 'approved', 'dispatched'] }
    };

    // Add optional filters if provided
    if (salesmanId) {
      query.salesPerson = new mongoose.Types.ObjectId(salesmanId);
      console.log('🔍 Filtering by salesPerson:', salesmanId);
    }
    if (customerId) {
      query.customer = new mongoose.Types.ObjectId(customerId);
      console.log('🔍 Filtering by customer:', customerId);
    }

    console.log('🔎 Query:', JSON.stringify(query, null, 2));

    // Find dispatch entries for today
    const dispatchProducts = await Dispatch.find(query)
      .populate('packingSheetId')
      .populate('salesPerson', 'fullName username email')
      .populate('customer', 'name customerCode address phone email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${dispatchProducts.length} dispatch products for today with filters`);

    // If no results, check what statuses exist for today
    if (dispatchProducts.length === 0 && todayDispatches > 0) {
      const todayDispatchSample = await Dispatch.find({
        company: req.user.companyId,
        date: { $gte: startOfDay, $lte: endOfDay }
      }).limit(5).select('status productGroup date');
      console.log('⚠️ Sample today dispatches with different statuses:', todayDispatchSample.map(d => ({
        status: d.status,
        productGroup: d.productGroup,
        date: d.date
      })));
    }

    // Import required models
    const PackingSheet = (await import('../models/Packing.js')).default;
    const ProductionBatch = (await import('../models/ProductionBatch.js')).default;
    const { Item } = await import('../models/Inventory.js');

    // Group dispatches by packingSheetId
    const groupedByPackingSheet = {};

    console.log(`\n🔍 DEBUG: Processing ${dispatchProducts.length} dispatches...`);

    for (const dispatch of dispatchProducts) {
      const packingSheetId = dispatch.packingSheetId?._id?.toString() || dispatch.packingSheetId?.toString();

      console.log(`\n📋 Dispatch ${dispatch._id}:`);
      console.log(`   Product: ${dispatch.productName || dispatch.productGroup}`);
      console.log(`   PackingSheetId: ${packingSheetId || 'NULL/UNDEFINED'}`);
      console.log(`   Has packingSheetId? ${!!packingSheetId}`);

      if (!packingSheetId) {
        // Handle ungrouped items (no packing sheet) - Each dispatch is a separate entry
        console.log(`   ✅ THIS IS AN UNGROUPED ITEM`);
        const key = `ungrouped_${dispatch._id}`;

        // Add item details for ungrouped item
        let itemDetails = null;
        if (dispatch.productId) {
          try {
            itemDetails = await Item.findById(dispatch.productId).select('name stock batch location qty').lean();
            console.log(`✅ Fetched ungrouped item details:`, {
              productId: dispatch.productId,
              name: itemDetails?.name,
              batch: itemDetails?.batch,
              stock: itemDetails?.stock
            });
          } catch (err) {
            console.error(`❌ Could not fetch item details for productId: ${dispatch.productId}`, err.message);
          }
        }

        // Create a separate entry for each ungrouped item (no grouping)
        groupedByPackingSheet[key] = {
          _id: dispatch._id,
          packingSheetId: null,
          productGroup: dispatch.productGroup || 'Ungrouped',
          productName: dispatch.productName || itemDetails?.name || 'Unknown',
          company: dispatch.company,
          date: dispatch.date,
          packedQuantityReadyForDispatch: dispatch.packedQuantityReadyForDispatch,
          previousClosingStockYesterdayBalance: dispatch.previousClosingStockYesterdayBalance,
          returnQuantityYesterdayReturns: dispatch.returnQuantityYesterdayReturns,
          totalAvailableStock: dispatch.totalAvailableStock,
          totalIndentQuantityOrdersForTheDay: dispatch.totalIndentQuantityOrdersForTheDay,
          excessShortage: dispatch.excessShortage,
          dispatchedQuantitySentToday: dispatch.dispatchedQuantitySentToday,
          closingStockEndOfDayBalance: dispatch.closingStockEndOfDayBalance,
          physicalStockEntryManualVerification: dispatch.physicalStockEntryManualVerification,
          overallLoss: dispatch.overallLoss,
          dcno: dispatch.dcno,
          batchNo: dispatch.batchNo,
          remarks: dispatch.remarks,
          verifiedBy: dispatch.verifiedBy,
          verifiedAt: dispatch.verifiedAt,
          salesPerson: dispatch.salesPerson ? {
            _id: dispatch.salesPerson._id,
            fullName: dispatch.salesPerson.fullName,
            username: dispatch.salesPerson.username,
            email: dispatch.salesPerson.email
          } : null,
          customer: dispatch.customer ? {
            _id: dispatch.customer._id,
            name: dispatch.customer.name,
            customerCode: dispatch.customer.customerCode,
            address: dispatch.customer.address,
            phone: dispatch.customer.phone,
            email: dispatch.customer.email
          } : null,
          orderId: dispatch.orderId,
          indentQty: dispatch.indentQty || 0,
          qtyIssued: dispatch.qtyIssued || 0,
          approvedBy: dispatch.approvedBy,
          approvedAt: dispatch.approvedAt,
          invoiceGenerated: dispatch.invoiceGenerated,
          status: dispatch.status,
          lastUpdatedBy: dispatch.lastUpdatedBy,
          // Single item data (not an array - for ungrouped items)
          items: [{
            itemId: dispatch.productId?._id || dispatch.productId,
            productName: dispatch.productName || itemDetails?.name || 'Unknown',
            batch: itemDetails?.batch || dispatch.batchNo || null,
            stock: itemDetails?.stock || itemDetails?.qty || dispatch.totalAvailableStock || 0,
            qtyIssued: dispatch.qtyIssued || 0,
            status: dispatch.status,
            totalAvailableStock: dispatch.totalAvailableStock || 0
          }],
          totalItemBatch: parseFloat(itemDetails?.batch) || 0,
          isUngrouped: true
        };
      } else {
        // Handle grouped items with packing sheet
        if (!groupedByPackingSheet[packingSheetId]) {
          groupedByPackingSheet[packingSheetId] = {
            _id: dispatch._id,
            packingSheetId: packingSheetId,
            productGroup: dispatch.productGroup,
            productId: dispatch.productId,
            productName: dispatch.productName,
            company: dispatch.company,
            date: dispatch.date,
            packedQuantityReadyForDispatch: dispatch.packedQuantityReadyForDispatch,
            previousClosingStockYesterdayBalance: dispatch.previousClosingStockYesterdayBalance,
            returnQuantityYesterdayReturns: dispatch.returnQuantityYesterdayReturns,
            totalAvailableStock: dispatch.totalAvailableStock,
            totalIndentQuantityOrdersForTheDay: dispatch.totalIndentQuantityOrdersForTheDay,
            excessShortage: dispatch.excessShortage,
            dispatchedQuantitySentToday: dispatch.dispatchedQuantitySentToday,
            closingStockEndOfDayBalance: dispatch.closingStockEndOfDayBalance,
            physicalStockEntryManualVerification: dispatch.physicalStockEntryManualVerification,
            overallLoss: dispatch.overallLoss,
            dcno: dispatch.dcno,
            batchNo: dispatch.batchNo,
            remarks: dispatch.remarks,
            verifiedBy: dispatch.verifiedBy,
            verifiedAt: dispatch.verifiedAt,
            salesPerson: dispatch.salesPerson ? {
              _id: dispatch.salesPerson._id,
              fullName: dispatch.salesPerson.fullName,
              username: dispatch.salesPerson.username,
              email: dispatch.salesPerson.email
            } : null,
            customer: dispatch.customer ? {
              _id: dispatch.customer._id,
              name: dispatch.customer.name,
              customerCode: dispatch.customer.customerCode,
              address: dispatch.customer.address,
              phone: dispatch.customer.phone,
              email: dispatch.customer.email
            } : null,
            orderId: dispatch.orderId,
            indentQty: dispatch.indentQty || 0,
            qtyIssued: dispatch.qtyIssued || 0,
            approvedBy: dispatch.approvedBy,
            approvedAt: dispatch.approvedAt,
            invoiceGenerated: dispatch.invoiceGenerated,
            status: dispatch.status,
            lastUpdatedBy: dispatch.lastUpdatedBy,
            items: []
          };
        }
      }
    }

    // For each packing sheet, get production batch details and items
    const products = [];

    console.log(`🔄 Processing ${Object.keys(groupedByPackingSheet).length} grouped packing sheets...`);

    for (const [key, group] of Object.entries(groupedByPackingSheet)) {
      if (key.startsWith('ungrouped_')) {
        // Already processed ungrouped items
        console.log(`  ✅ Adding ungrouped item: ${group.productGroup}`);
        products.push(group);
        continue;
      }

      console.log(`  🔍 Processing packing sheet: ${group.packingSheetId}`);
      try {
        // Get packing sheet details
        const packingSheet = await PackingSheet.findById(group.packingSheetId);

        if (!packingSheet) {
          console.log(`  ⚠️ Packing sheet not found: ${group.packingSheetId}, skipping...`);
          continue;
        }

        // If packing sheet has no production group, treat as ungrouped
        if (!packingSheet.productionGroup) {
          console.log(`  ⚠️ Packing sheet has no production group - UNGROUPED ITEM`);
          console.log(`  🔍 ProductId from group: ${group.productId}`);
          console.log(`  🔍 ProductId type: ${typeof group.productId}`);

          // Simple: Get batch from Item table using productId
          let batchValue = 0;
          if (group.productId) {
            try {
              console.log(`  📡 Querying Item collection for ID: ${group.productId}`);
              const item = await Item.findById(group.productId).select('name batch stock qty').lean();
              console.log(`  📦 Item query result:`, item);

              if (item) {
                if (item.batch) {
                  batchValue = parseFloat(item.batch);
                  console.log(`  ✅✅✅ SUCCESS! Found batch: ${item.batch}, parsed: ${batchValue}`);
                } else {
                  console.log(`  ❌ Item found but batch field is: ${item.batch}`);
                }
              } else {
                console.log(`  ❌ Item.findById returned null - Item not found in database!`);
              }
            } catch (err) {
              console.error(`  ❌ Error fetching item:`, err);
            }
          } else {
            console.log(`  ❌ No productId in group!`);
          }

          // Set totalItemBatch directly
          group.totalItemBatch = batchValue;
          group.indentQty = group.indentQty || 0;
          group.isUngrouped = true;

          console.log(`  ✅ FINAL UNGROUPED RESULT - totalItemBatch: ${group.totalItemBatch}, indentQty: ${group.indentQty}`);
          products.push(group);
          continue;
        }

        console.log(`  📄 Found packing sheet with productionGroup: ${packingSheet.productionGroup}`);

        // Get ALL production batches for this productionGroup for TODAY only
        const productionBatches = await ProductionBatch.find({
          groupId: packingSheet.productionGroup,
          companyId: req.user.companyId,
          productionDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate('combinedItems.itemId');

        if (!productionBatches || productionBatches.length === 0) {
          console.log(`  ⚠️ No production batches found for group: ${packingSheet.productionGroup}, skipping...`);
          continue;
        }

        console.log(`  📦 Found ${productionBatches.length} production batch(es) for packing sheet ${group.packingSheetId}`);

        // Get dispatch details for this packing sheet to get indent quantities
        const relatedDispatches = dispatchProducts.filter(d => {
          const dPackingSheetId = d.packingSheetId?._id?.toString() || d.packingSheetId?.toString();
          return dPackingSheetId === group.packingSheetId;
        });

        // Track unique items to avoid duplicates
        const addedItemIds = new Set();

        // Build items array from ALL production batches
        for (const productionBatch of productionBatches) {
          if (!productionBatch.combinedItems || productionBatch.combinedItems.length === 0) {
            console.log(`⚠️ Batch ${productionBatch.batchNo} has no combined items`);
            continue;
          }

          console.log(`  📦 Processing batch ${productionBatch.batchNo} with ${productionBatch.combinedItems.length} items`);

          for (const combinedItem of productionBatch.combinedItems) {
            const item = combinedItem.itemId;

            if (!item) {
              console.log(`  ⚠️ Item not found in combinedItems`);
              continue;
            }

            // Skip if we've already added this item
            const itemIdStr = item._id.toString();
            if (addedItemIds.has(itemIdStr)) {
              console.log(`  ⏭️ Skipping duplicate item: ${item.name}`);
              continue;
            }
            addedItemIds.add(itemIdStr);

            // Fetch fresh item details from Item collection to get current batch number
            let itemBatch = null;
            let itemStock = 0;
            try {
              const freshItem = await Item.findById(item._id).select('batch stock qty').lean();
              if (freshItem) {
                itemBatch = freshItem.batch;
                itemStock = freshItem.stock || freshItem.qty || 0;
              }
            } catch (err) {
              console.log(`  ⚠️ Could not fetch fresh item data for ${item._id}`);
            }

            // Find matching dispatch entry for this item
            const matchingDispatch = relatedDispatches.find(d =>
              d.productId?.toString() === item._id.toString()
            );

            group.items.push({
              itemId: item._id,
              productName: item.name || 'Unknown',
              batch: itemBatch || item.batch || null, // ✅ Each item's batch from Item table
              stock: itemStock || item.stock || item.qty || 0,
              qtyIssued: matchingDispatch?.qtyIssued || 0,
              status: matchingDispatch?.status || 'pending',
              totalAvailableStock: matchingDispatch?.totalAvailableStock || itemStock || 0
            });

            console.log(`  ✅ Added item: ${item.name} (Batch: ${itemBatch}, Stock: ${itemStock})`);
          }
        }

        // ✅ Keep existing indentQty from dispatch (already set from database)

        // ✅ Calculate totalItemBatch: sum of all item.batch values in this group
        const totalItemBatch = group.items.reduce((sum, item) => {
          const batchValue = parseFloat(item.batch) || 0;
          return sum + batchValue;
        }, 0);
        group.totalItemBatch = totalItemBatch;

        products.push(group);

      } catch (err) {
        console.error(`❌ Error processing packing sheet ${group.packingSheetId}:`, err);
      }
    }

    console.log(`✅ Returning ${products.length} grouped products`);

    res.json({
      success: true,
      data: {
        products: products,
        count: products.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s products',
      error: error.message
    });
  }
};

// Validate DC number uniqueness
export const validateDCNumber = async (req, res) => {
  try {
    const { dcNo } = req.query;

    console.log('🔍 Validating DC number:', dcNo);

    if (!dcNo) {
      return res.status(400).json({
        success: false,
        isUnique: false,
        message: 'DC number is required'
      });
    }

    // Check if DC number already exists
    const existingDC = await Dispatch.findOne({
      dcno: dcNo,
      company: req.user.companyId
    });

    const isUnique = !existingDC;

    console.log(`${isUnique ? '✅' : '❌'} DC number ${dcNo} is ${isUnique ? 'unique' : 'already in use'}`);

    res.json({
      success: true,
      isUnique: isUnique,
      message: isUnique ? 'DC number is available' : 'DC number already exists'
    });

  } catch (error) {
    console.error('❌ Error validating DC number:', error);
    res.status(500).json({
      success: false,
      isUnique: false,
      message: 'Failed to validate DC number',
      error: error.message
    });
  }
};

// Create a new delivery challan with all items
export const createDeliveryChallan = async (req, res) => {
  try {
    let { dcNo, salesmanId, customerId, items } = req.body;

    // Clean dcNo - remove hyphens and spaces
    if (dcNo) {
      dcNo = dcNo.toString().replace(/[-\s]/g, '').toUpperCase();
    }

    console.log('📋 Creating delivery challan:', { dcNo, salesmanId, customerId, itemsCount: items?.length });

    // Validate required fields
    if (!dcNo || !salesmanId || !customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'DC number, salesman, customer, and items are required'
      });
    }

    // Note: sequential DC number enforcement removed. Any DC format is accepted
    // here as long as it's unique per company. DC numbering (generation) is
    // still available via helper APIs if needed, but we don't enforce
    // that the provided dcNo matches the next sequential number.

    // Validate DC number uniqueness
    const existingDC = await Dispatch.findOne({
      dcno: dcNo,
      company: req.user.companyId
    });

    if (existingDC) {
      return res.status(400).json({
        success: false,
        message: 'DC number already exists. Please use a different number.'
      });
    }

    // Get salesman and customer details
    const User = (await import('../models/User.js')).default;
    const Customer = (await import('../models/Customer.js')).default;

    const salesman = await User.findById(salesmanId).select('fullName username email');
    const customer = await Customer.findById(customerId).select('name customerCode category outstandingAmount state tdsSection entityType');

    console.log('👤 Salesman lookup:', { salesmanId, found: !!salesman });
    console.log('🏢 Customer lookup:', { customerId, found: !!customer });

    if (!salesman || !customer) {
      return res.status(404).json({
        success: false,
        message: 'Salesman or customer not found',
        details: {
          salesmanFound: !!salesman,
          customerFound: !!customer
        }
      });
    }

    // Create dispatch entries for all items with the same DC number
    const dispatchEntries = [];
    const saleItems = [];
    let totalChallanAmount = 0;
    let totalTaxAmount = 0;
    let totalSubtotal = 0;
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));

    for (const item of items) {
      // PRIMARY METHOD: Frontend should pass dispatchId (_id from dispatch table)
      // This is the expected and preferred way
      let existingDispatch = null;

      if (item.dispatchId || item._id || item.id) {
        // Use dispatchId from frontend (primary method)
        const dispatchIdToUse = item.dispatchId || item._id || item.id;

        console.log(`🎯 PRIMARY: Looking for dispatch by _id: ${dispatchIdToUse}`);

        existingDispatch = await Dispatch.findOne({
          _id: dispatchIdToUse,
          company: req.user.companyId
        });

        if (existingDispatch) {
          console.log(`✅ Found dispatch record by _id: ${existingDispatch._id}`);
        } else {
          console.log(`⚠️ Dispatch _id ${dispatchIdToUse} not found in company ${req.user.companyId}`);
        }
      } else {
        // FALLBACK: If dispatchId not provided, try to find by productId and today's date
        console.log(`⚠️ No dispatchId provided for ${item.productName}, using fallback search by productId`);

        existingDispatch = await Dispatch.findOne({
          productId: item.productId,
          company: req.user.companyId,
          date: startOfDay
        });

        if (existingDispatch) {
          console.log(`✅ FALLBACK: Found dispatch by productId: ${item.productId}`);
        } else {
          console.log(`❌ FALLBACK: No dispatch found for productId: ${item.productId}`);
        }
      }

      if (existingDispatch) {
        // Check if already dispatched
        if (existingDispatch.status === 'dispatched' && existingDispatch.dcno) {
          console.log(`⚠️ Dispatch ${existingDispatch._id} already dispatched with DC: ${existingDispatch.dcno}`);
          return res.status(400).json({
            success: false,
            message: `Item "${item.productName}" has already been dispatched with DC number ${existingDispatch.dcno}. Cannot create duplicate delivery challan.`,
            alreadyDispatched: true,
            existingDC: existingDispatch.dcno,
            productName: item.productName
          });
        }

        // Update existing dispatch entry with delivery challan details
        console.log(`🔄 Updating dispatch entry ${existingDispatch._id} with DC details`);

        existingDispatch.dcno = dcNo;
        existingDispatch.qtyIssued = item.qtyIssued;
        existingDispatch.dispatchedQuantitySentToday = item.qtyIssued;
        existingDispatch.salesPerson = salesmanId;
        existingDispatch.customer = customerId;
        existingDispatch.status = 'dispatched';
        existingDispatch.lastUpdatedBy = req.user.id;
        existingDispatch.updatedAt = new Date();

        await existingDispatch.save();
        dispatchEntries.push(existingDispatch);

        console.log(`✅ Successfully updated dispatch ${existingDispatch._id} with DC ${dcNo}`);

        // Reduce item stock/batch quantity
        if (item.productId && item.qtyIssued > 0) {
          try {
            const itemToUpdate = await Item.findById(item.productId);
            if (itemToUpdate) {
              // Reduce stock quantity
              const previousStock = itemToUpdate.stock || itemToUpdate.qty || 0;
              itemToUpdate.stock = Math.max(0, previousStock - item.qtyIssued);
              itemToUpdate.qty = itemToUpdate.stock;

              // Reduce batch number (stored as string number)
              if (itemToUpdate.batch) {
                const previousBatch = parseInt(itemToUpdate.batch) || 0;
                itemToUpdate.batch = Math.max(0, previousBatch - item.qtyIssued).toString();
              }

              await itemToUpdate.save();
              console.log(`📉 Reduced inventory for ${item.productName}: stock ${previousStock} → ${itemToUpdate.stock}, batch ${itemToUpdate.batch} (dispatched: ${item.qtyIssued})`);

              // Calculate price for Account integration
              const priceObj = itemToUpdate.customerPrices?.find(p => p.category === customer.category);
              const unitPrice = priceObj ? priceObj.price : (itemToUpdate.salePrice || 0);
              const gstPercent = itemToUpdate.gst || 0;
              const itemSubtotal = unitPrice * item.qtyIssued;
              const itemTax = itemSubtotal * (gstPercent / 100);
              const itemTotal = itemSubtotal + itemTax;

              totalSubtotal += itemSubtotal;
              totalTaxAmount += itemTax;
              totalChallanAmount += itemTotal;

              saleItems.push({
                productName: item.productName,
                quantity: item.qtyIssued,
                unitPrice: unitPrice,
                totalPrice: itemSubtotal,
                tax: gstPercent
              });
            }
          } catch (err) {
            console.error(`⚠️ Could not reduce stock for productId ${item.productId}:`, err.message);
          }
        }
      } else {
        // Create new dispatch entry only if no existing record found
        console.log(`✨ Creating NEW dispatch entry for product: ${item.productName}`);

        const dispatchEntry = new Dispatch({
          dcno: dcNo,
          productId: item.productId,
          productName: item.productName,
          productGroup: item.productGroup,
          company: req.user.companyId,
          date: startOfDay,
          totalIndentQuantityOrdersForTheDay: item.indentQty || 0,
          indentQty: 0,
          qtyIssued: item.qtyIssued || 0,
          dispatchedQuantitySentToday: item.qtyIssued || 0,
          packedQuantityReadyForDispatch: item.qtyIssued || 0,
          salesPerson: salesmanId,
          customer: customerId,
          status: 'dispatched',
          lastUpdatedBy: req.user.id
        });

        await dispatchEntry.save();
        dispatchEntries.push(dispatchEntry);

        console.log(`✅ Created new dispatch entry with _id: ${dispatchEntry._id}`);

        // Reduce item stock/batch quantity
        if (item.productId && item.qtyIssued > 0) {
          try {
            const itemToUpdate = await Item.findById(item.productId);
            if (itemToUpdate) {
              // Reduce stock quantity
              const previousStock = itemToUpdate.stock || itemToUpdate.qty || 0;
              itemToUpdate.stock = Math.max(0, previousStock - item.qtyIssued);
              itemToUpdate.qty = itemToUpdate.stock;

              // Reduce batch number (stored as string number)
              if (itemToUpdate.batch) {
                const previousBatch = parseInt(itemToUpdate.batch) || 0;
                itemToUpdate.batch = Math.max(0, previousBatch - item.qtyIssued).toString();
              }

              await itemToUpdate.save();
              console.log(`📉 Reduced inventory for ${item.productName}: stock ${previousStock} → ${itemToUpdate.stock}, batch ${itemToUpdate.batch} (dispatched: ${item.qtyIssued})`);

              // Calculate price for Account integration
              const priceObj = itemToUpdate.customerPrices?.find(p => p.category === customer.category);
              const unitPrice = priceObj ? priceObj.price : (itemToUpdate.salePrice || 0);
              const gstPercent = itemToUpdate.gst || 0;
              const itemSubtotal = unitPrice * item.qtyIssued;
              const itemTax = itemSubtotal * (gstPercent / 100);
              const itemTotal = itemSubtotal + itemTax;

              totalSubtotal += itemSubtotal;
              totalTaxAmount += itemTax;
              totalChallanAmount += itemTotal;

              saleItems.push({
                productName: item.productName,
                quantity: item.qtyIssued,
                unitPrice: unitPrice,
                totalPrice: itemSubtotal,
                tax: gstPercent
              });
            }
          } catch (err) {
            console.error(`⚠️ Could not reduce stock for productId ${item.productId}:`, err.message);
          }
        }
      }
    }

    // Connect to Accounts: Create Sale record and Update Customer Outstanding
    if (totalChallanAmount > 0) {
      try {
        const Sale = (await import('../models/Sale.js')).default;
        const { Transaction, Account: LedgerAccount } = await import('../models/Account.js');
        const { Company } = await import('../models/Company.js');
        const unit = req.user.unit || 'default';
        const companyId = req.user.companyId;

        // Fetch Company to get state for GST calculation
        const company = await Company.findById(companyId);
        const companyState = (company?.state || '').toLowerCase().trim();
        const customerState = (customer?.state || '').toLowerCase().trim();
        const isSameState = companyState && customerState && (companyState === customerState);
        const gstType = isSameState ? 'CGST_SGST' : 'IGST';

        // Calculate TDS
        let tdsPercent = 0;
        let tdsAmount = 0;
        if (customer.tdsSection && customer.tdsSection !== 'None') {
          switch (customer.tdsSection) {
            case '194C':
              tdsPercent = (customer.entityType === 'Individual' || customer.entityType === 'HUF') ? 1 : 2;
              break;
            case '194J':
              tdsPercent = 10;
              break;
            case '194Q':
            case '206C_1H':
              tdsPercent = 0.1;
              break;
          }
          tdsAmount = (totalSubtotal * tdsPercent) / 100;
        }

        const netReceivable = totalChallanAmount - tdsAmount;

        // 1. Create Sale Record (Invoice)
        const sale = new Sale({
          invoiceNumber: `INV-${dcNo}`,
          customer: customerId,
          saleDate: today,
          dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          items: saleItems,
          subtotal: totalSubtotal,
          taxAmount: totalTaxAmount,
          totalAmount: netReceivable, // ✅ GRAND TOTAL should be net of TDS
          tdsAmount: tdsAmount,
          tdsPercent: tdsPercent,
          gstType: gstType,
          paidAmount: 0,
          balanceAmount: netReceivable, // Outstanding is net of TDS
          unit: unit,
          companyId: companyId,
          createdBy: req.user.id,
          dispatch: dispatchEntries[0]?._id,
          notes: `Created from Delivery Challan: ${dcNo} (TDS Section: ${customer.tdsSection || 'None'})`
        });
        await sale.save();
        console.log(`💰 Created Sale record for DC ${dcNo}, Net Receivable: ${netReceivable} (GST: ${gstType}, TDS: ${tdsAmount})`);

        // 2. Ledger Posting
        const receivableAccount = await LedgerAccount.findOne({ accountName: 'Accounts Receivable', unit });
        const salesAccount = await LedgerAccount.findOne({ accountName: 'Sales Account', unit });
        const gstAccount = await LedgerAccount.findOne({ accountName: 'Output GST', unit });
        const tdsReceivableAccount = await LedgerAccount.findOne({ accountName: 'TDS Receivable', unit });

        if (receivableAccount && salesAccount && gstAccount) {
          const entries = [
            { account: receivableAccount._id, debit: netReceivable, credit: 0 },
            { account: salesAccount._id, debit: 0, credit: totalSubtotal },
            { account: gstAccount._id, debit: 0, credit: totalTaxAmount }
          ];

          if (tdsAmount > 0 && tdsReceivableAccount) {
            entries.push({ account: tdsReceivableAccount._id, debit: tdsAmount, credit: 0 });
          }

          const txn = new Transaction({
            transactionNumber: `TXN-DSP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            description: `Sales Invoice: ${sale.invoiceNumber} to ${customer.name} (DC: ${dcNo})${tdsAmount > 0 ? ' (Includes TDS Receivable)' : ''}`,
            reference: dcNo,
            totalAmount: totalChallanAmount, // Total transaction value
            unit,
            relatedDocument: 'Sale',
            relatedDocumentId: sale._id,
            createdBy: req.user.id,
            entries
          });
          await txn.save();

          // Update ledger balances
          receivableAccount.balance += netReceivable;
          salesAccount.balance += totalSubtotal;
          gstAccount.balance += totalTaxAmount;
          if (tdsAmount > 0 && tdsReceivableAccount) {
            tdsReceivableAccount.balance += tdsAmount;
            await tdsReceivableAccount.save();
          }

          await receivableAccount.save();
          await salesAccount.save();
          await gstAccount.save();
          console.log(`📊 Posted to Ledger for DC ${dcNo}`);
        }

        // 3. Update Customer Outstanding Amount (Net Receivable)
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { outstandingAmount: netReceivable }
        });
        console.log(`✅ Updated Customer ${customer.name} outstanding by ${netReceivable}`);

        // 4. Update Dispatch records with invoiceGenerated: true
        for (const entry of dispatchEntries) {
          entry.invoiceGenerated = true;
          entry.invoiceGeneratedAt = new Date();
          await entry.save();
        }

      } catch (accErr) {
        console.error('❌ Error in Account integration:', accErr);
        // We don't fail the whole dispatch if account integration fails, but we log it
      }
    }

    console.log(`✅ Created delivery challan ${dcNo} with ${dispatchEntries.length} items`);

    res.status(201).json({
      success: true,
      message: `Delivery challan ${dcNo} created successfully`,
      data: {
        dcId: dispatchEntries[0]._id, // Return first entry ID for invoice generation
        dcNo: dcNo,
        itemsCount: dispatchEntries.length,
        dispatches: dispatchEntries
      }
    });

  } catch (error) {
    console.error('❌ Error creating delivery challan:', error);

    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed while creating delivery challan',
        errors: validationErrors,
        details: error.message
      });
    }

    // Handle duplicate DC number error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'DC number already exists. This delivery challan may have already been created.',
        error: 'Duplicate DC number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create delivery challan',
      error: error.message
    });
  }
};

// Generate invoice for a delivery challan
export const generateInvoiceForDC = async (req, res) => {
  try {
    const { dcId } = req.params;
    const requestBody = req.body || {};

    console.log('🧾 Generating invoice for DC ID:', dcId);
    console.log('📦 Request body:', requestBody);

    // Find the dispatch entry with company details
    const dispatch = await Dispatch.findById(dcId)
      .populate('productId', 'name code category unit')
      .populate('salesPerson', 'fullName username email')
      .populate('customer', 'name customerCode address phone email')
      .populate('company', 'name address phone email gstin pan city state pincode');

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found'
      });
    }

    // Get full company details
    const { Company } = await import('../models/Company.js');
    const companyDetails = await Company.findById(req.user.companyId);

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found'
      });
    }

    console.log('📋 Dispatch status:', dispatch.status);

    // Allow invoice generation for a set of statuses (case-insensitive)
    const allowedStatuses = ['dispatched', 'approved', 'completed', 'updated', 'delivered', 'verified'];
    const currentStatus = (dispatch.status || '').toString().toLowerCase();
    if (!allowedStatuses.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate invoice. Current status: ${dispatch.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
        currentStatus: dispatch.status
      });
    }

    // Use data from request body if provided, otherwise use dispatch data
    const dcNo = requestBody.dcNo || dispatch.dcno;
    const salesmanName = requestBody.salesmanName || dispatch.salesPerson?.fullName || dispatch.salesPerson?.username || 'N/A';
    const customerName = requestBody.customerName || dispatch.customer?.name || 'N/A';
    const customerCode = requestBody.customerCode || dispatch.customer?.customerCode || 'N/A';

    // If this route was called with a specific dispatch ID (dcId param),
    // always generate invoice for that single dispatch record only.
    // The `includeAll` flag is only honored when generating by DC number (legacy behavior).
    const includeAll = requestBody.includeAll === true || requestBody.includeAll === 'true';

    const singleDispatchMode = !!dcId; // true for this endpoint

    let allDCItems;
    if (singleDispatchMode || !includeAll) {
      // Use only the requested dispatch
      allDCItems = [dispatch.toObject ? dispatch.toObject() : dispatch];
    } else {
      // Fall back to previous behavior (all items with same dcno)
      allDCItems = await Dispatch.find({
        dcno: dispatch.dcno,
        company: req.user.companyId
      })
        .populate('productId', 'name code category unit price salePrice gst')
        .populate('salesPerson', 'fullName username email')
        .populate('customer', 'name customerCode address phone email')
        .populate({
          path: 'orderId',
          populate: {
            path: 'products.product',
            model: 'Item'
          }
        })
        .lean();
    }

    console.log('🔍 Found', allDCItems.length, 'items for DC:', dispatch.dcno);

    // Debug: log item product names to help diagnose duplicate rows
    try {
      const itemNames = allDCItems.map(i => i.productName || (i.productId && (i.productId.name || i.productId)) || 'Unknown');
      console.log('🔎 Invoice will include items:', itemNames);
    } catch (err) {
      console.warn('Could not log item names for invoice debug:', err.message);
    }

    // If productId populate failed but we have productId references, fetch them manually
    for (let i = 0; i < allDCItems.length; i++) {
      const item = allDCItems[i];
      if (item.productId && typeof item.productId === 'string' && !item.productId.name) {
        console.log('⚠️ Product not populated, fetching manually for productId:', item.productId);
        const product = await Item.findById(item.productId).select('name code category unit salePrice gst').lean();
        if (product) {
          allDCItems[i].productId = product;
          console.log('✅ Manually fetched product with price:', product.name, product.salePrice);
        }
      }
    }

    // Log first item details for debugging
    if (allDCItems.length > 0) {
      const firstItem = allDCItems[0];
      console.log('📦 First item details:', {
        _id: firstItem._id,
        productId: firstItem.productId?._id,
        productIdName: firstItem.productId?.name,
        productName: firstItem.productName,
        productGroup: firstItem.productGroup,
        indentQty: firstItem.indentQty,
        qtyIssued: firstItem.qtyIssued
      });
    }

    // Build items for invoice. If request provided explicit items, use them (enriched below).
    // If includeAll is false (default), generate invoice only for the specific dispatch requested.
    let items = [];

    if (requestBody.items && requestBody.items.length > 0) {
      // Client provided items; enrich them similarly to legacy behavior
      items = requestBody.items.map(i => ({ ...i }));
    } else if (!includeAll) {
      // Build a single-item invoice based strictly based on the requested dispatch
      const productRef = dispatch.productId;
      let productDetails = null;
      try {
        if (productRef) {
          productDetails = await Item.findById(productRef).select('name salePrice price gst unit').lean();
        }
      } catch (err) {
        console.error('Error fetching product details for single-dispatch invoice:', err.message);
      }

      const rate = (productDetails && (productDetails.salePrice || productDetails.price)) || 0;
      const gst = (productDetails && productDetails.gst) || 0;

      items = [{
        productName: dispatch.productName || productDetails?.name || dispatch.productGroup || 'Unknown Product',
        productGroup: dispatch.productGroup || '',
        indentQty: dispatch.indentQty || dispatch.totalIndentQuantityOrdersForTheDay || 0,
        qtyIssued: dispatch.qtyIssued || dispatch.dispatchedQuantitySentToday || 0,
        unit: (productDetails && productDetails.unit) || 'Pcs',
        rate,
        gst
      }];
    } else {
      // Legacy: include all items with same DC number
      items = allDCItems.map(item => ({
        productName: item.productId?.name || item.productName || 'Unknown Product',
        productGroup: item.productGroup || '',
        indentQty: item.indentQty || item.totalIndentQuantityOrdersForTheDay || 0,
        qtyIssued: item.qtyIssued || item.dispatchedQuantitySentToday || 0,
        unit: item.productId?.unit || 'Pcs',
        rate: (item.productId && item.productId.salePrice) || item.rate || 0,
        gst: (item.productId && item.productId.gst) || 0
      }));
    }

    // Don't update status - keep it as dispatched
    // Invoice generation should not change dispatch status

    console.log(`✅ Generating PDF invoice for DC ${dcNo} with ${items.length} items`);

    // Generate PDF using PDFKit
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${dcNo}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Modern Professional Header with Company Branding
    // Header background with gradient effect
    doc.rect(30, 30, 535, 120).fillAndStroke('#1e3a8a', '#1e3a8a');

    // Company Name - Large and Bold
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
      .text((companyDetails.name || 'SUNRISE BAKERY').toUpperCase(), 40, 50, { align: 'center' });

    // Tagline
    doc.fontSize(10).font('Helvetica').fillColor('#e0e7ff')
      .text(companyDetails.tagline || 'Premium Quality Baked Goods Since 2020', 40, 85, { align: 'center' });

    // Company Details - Left Side
    doc.fontSize(8).fillColor('#ffffff');
    const companyAddress = companyDetails.address || 'Company Address Not Set';
    const companyCity = companyDetails.city || '';
    const companyPincode = companyDetails.pincode || '';
    const fullAddress = `${companyAddress}${companyCity ? ', ' + companyCity : ''}${companyPincode ? ' - ' + companyPincode : ''}`;
    doc.text(fullAddress, 40, 105, { align: 'left', width: 350 });

    const companyPhone = companyDetails.phone || 'Not Available';
    const companyEmail = companyDetails.email || 'Not Available';
    doc.text(`${companyPhone} |${companyEmail}`, 40, 118, { align: 'left', width: 350 });

    // GST Details - Right Side
    const gstin = companyDetails.gstin || 'GSTIN Not Set';
    const pan = companyDetails.pan || 'PAN Not Set';
    doc.text(`GSTIN: ${gstin}`, 400, 105, { align: 'left' });
    doc.text(`PAN: ${pan}`, 400, 118, { align: 'left' });

    doc.fillColor('#000000');
    doc.y = 160;

    // Invoice Title Banner
    doc.rect(30, doc.y, 535, 35).fillAndStroke('#f3f4f6', '#d1d5db');
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e3a8a')
      .text('TAX INVOICE / DELIVERY CHALLAN', 40, doc.y + 10, { align: 'center' });

    doc.fillColor('#000000');
    doc.y += 45;

    // Invoice Details Section - Modern Grid Layout
    const invoiceDetailsY = doc.y;

    // Left Box - Invoice Info
    doc.rect(30, invoiceDetailsY, 260, 85).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text('Invoice Details', 40, invoiceDetailsY + 8);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Invoice No: `, 40, invoiceDetailsY + 28, { continued: true });
    doc.font('Helvetica-Bold').text(`${dcNo}`);
    doc.font('Helvetica').text(`Invoice Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 40, invoiceDetailsY + 43);
    doc.text(`Invoice Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`, 40, invoiceDetailsY + 58);
    const placeOfSupply = companyDetails.state || 'Maharashtra';
    doc.text(`Place of Supply: ${placeOfSupply}`, 40, invoiceDetailsY + 73);

    // Right Box - Payment Terms
    doc.rect(305, invoiceDetailsY, 260, 85).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text('Payment Terms', 315, invoiceDetailsY + 8);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Payment Mode: Cash`, 315, invoiceDetailsY + 28);
    doc.text(`Due Date: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}`, 315, invoiceDetailsY + 43);
    doc.text(`Terms: Payment within 7 days`, 315, invoiceDetailsY + 58);
    doc.text(`Status: `, 315, invoiceDetailsY + 73, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#059669').text('PAID');

    doc.fillColor('#000000');
    doc.y = invoiceDetailsY + 95;

    // Bill To and Ship To Section
    const partyDetailsY = doc.y;

    // Bill To - Customer Details (Left)
    doc.rect(30, partyDetailsY, 260, 120).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a')
      .text('BILL TO', 40, partyDetailsY + 8);
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text(customerName, 40, partyDetailsY + 28, { width: 240 });

    doc.fontSize(8).font('Helvetica');
    let billY = partyDetailsY + 45;
    doc.text(`Customer Code: ${customerCode}`, 40, billY);
    billY += 12;

    const customerPhone = dispatch.customer?.phone || requestBody.customerPhone || 'N/A';
    doc.text(`Phone: ${customerPhone}`, 40, billY);
    billY += 12;

    const customerEmail = dispatch.customer?.email || requestBody.customerEmail || '';
    if (customerEmail) {
      doc.text(`Email: ${customerEmail}`, 40, billY, { width: 240 });
      billY += 12;
    }

    const customerAddress = dispatch.customer?.address || requestBody.customerAddress || '';
    if (customerAddress) {
      doc.text(`Address: ${customerAddress}`, 40, billY, { width: 240 });
    }

    // Ship To - Salesman Details (Right)
    doc.rect(305, partyDetailsY, 260, 120).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a')
      .text('HANDLED BY', 315, partyDetailsY + 8);
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text(salesmanName, 315, partyDetailsY + 28, { width: 240 });

    doc.fontSize(8).font('Helvetica');
    let shipY = partyDetailsY + 45;

    const salesmanUsername = dispatch.salesPerson?.username || requestBody.salesmanUsername || '';
    if (salesmanUsername && salesmanUsername !== salesmanName) {
      doc.text(`Username: ${salesmanUsername}`, 315, shipY, { width: 240 });
      shipY += 12;
    }

    const salesmanEmail = dispatch.salesPerson?.email || requestBody.salesmanEmail || '';
    if (salesmanEmail) {
      doc.text(`Email: ${salesmanEmail}`, 315, shipY, { width: 240 });
      shipY += 12;
    }

    doc.text(`Company: ${companyDetails.name}`, 315, shipY, { width: 240 });
    shipY += 12;
    doc.text(`Role: Sales Representative`, 315, shipY, { width: 240 });

    doc.y = partyDetailsY + 130;

    doc.y = partyDetailsY + 130;

    // Items Table - Modern Professional Design
    const tableTop = doc.y;

    // Table Header with Blue Background
    doc.rect(30, tableTop, 535, 25).fillAndStroke('#1e3a8a', '#1e3a8a');

    // Column positions for professional layout with financial columns
    const slCol = 40;
    const itemCol = 80;
    const qtyCol = 260;
    const rateCol = 320;
    const amountCol = 380;
    const gstCol = 450;
    const totalCol = 500;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('S.No', slCol, tableTop + 8, { width: 30 });
    doc.text('Product Name', itemCol, tableTop + 8, { width: 170 });
    doc.text('Quantity', qtyCol, tableTop + 8, { width: 55, align: 'right' });
    doc.text('Rate', rateCol, tableTop + 8, { width: 55, align: 'right' });
    doc.text('Amount', amountCol, tableTop + 8, { width: 65, align: 'right' });
    doc.text('GST%', gstCol, tableTop + 8, { width: 45, align: 'right' });
    doc.text('Total', totalCol, tableTop + 8, { width: 65, align: 'right' });

    doc.fillColor('#000000');
    let currentY = tableTop + 25;


    // Table Rows with alternating colors
    doc.fontSize(8).font('Helvetica');
    let subtotal = 0;
    let totalGST = 0;

    items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }

      const rowHeight = 32;

      // Alternating row colors for better readability
      if (index % 2 === 0) {
        doc.rect(30, currentY, 535, rowHeight).fillAndStroke('#f9fafb', '#e5e7eb');
      } else {
        doc.rect(30, currentY, 535, rowHeight).stroke('#e5e7eb');
      }

      doc.fillColor('#000000');

      // Get quantity, rate, and GST
      const quantity = item.qtyIssued || 0;
      const rate = item.rate || item.price || 0;
      const gstRate = item.gst || 0;
      const amount = quantity * rate;
      const gstAmount = amount * (gstRate / 100);
      const totalAmount = amount + gstAmount;

      // Row data with financial columns
      doc.text(`${index + 1}`, slCol, currentY + 12, { width: 30 });
      doc.text(item.productName || 'N/A', itemCol, currentY + 10, { width: 170, ellipsis: true });
      doc.text(`${quantity}`, qtyCol, currentY + 12, { width: 55, align: 'right' });
      doc.text(`${rate.toFixed(2)}`, rateCol, currentY + 12, { width: 55, align: 'right' });
      doc.text(`${amount.toFixed(2)}`, amountCol, currentY + 12, { width: 65, align: 'right' });
      doc.text(`${gstRate}%`, gstCol, currentY + 12, { width: 45, align: 'right' });
      doc.text(`${totalAmount.toFixed(2)}`, totalCol, currentY + 12, { width: 65, align: 'right' });

      subtotal += amount;
      totalGST += gstAmount;

      currentY += rowHeight;
    });

    // Subtotal Row
    doc.rect(30, currentY, 535, 30).fillAndStroke('#e5e7eb', '#9ca3af'); // Increased height to 30
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text('SUBTOTAL:', itemCol, currentY + 10); // Offset to 10
    doc.text(`Rs. ${subtotal.toFixed(2)}`, amountCol, currentY + 10, { width: 65, align: 'right' });
    doc.text(`Rs. ${totalGST.toFixed(2)}`, gstCol, currentY + 10, { width: 45, align: 'right' });
    const grandTotal = subtotal + totalGST;
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, totalCol, currentY + 10, { width: 65, align: 'right' });

    currentY += 30;

    // Tax Calculation Section
    const taxY = currentY + 15;

    // Right side - Tax breakdown box
    doc.rect(350, taxY, 215, 100).stroke(); // Increased height to 100
    doc.fontSize(9).font('Helvetica').fillColor('#000000');

    let taxLineY = taxY + 12;
    doc.fillColor('#000000').text('Subtotal (Taxable):', 360, taxLineY);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 495, taxLineY, { width: 65, align: 'right' });

    taxLineY += 22;
    doc.fillColor('#000000').text('Total GST:', 360, taxLineY);
    doc.text(`Rs. ${totalGST.toFixed(2)}`, 495, taxLineY, { width: 65, align: 'right' });

    taxLineY += 22;
    doc.moveTo(360, taxLineY).lineTo(555, taxLineY).stroke();
    taxLineY += 10;

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Grand Total:', 360, taxLineY);
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, 495, taxLineY, { width: 65, align: 'right' });

    // Left side - Amount in words
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Amount in Words:', 40, taxY + 10);
    doc.fontSize(8).font('Helvetica').fillColor('#000000');
    const amountInWords = convertNumberToWords(Math.round(grandTotal));
    doc.text(`${amountInWords} Rupees Only`, 40, taxY + 28, { width: 290 });

    doc.y = taxY + 100;



    doc.y += 50;

    // Signature Section
    const signY = doc.y;

    // Customer Signature
    doc.fontSize(8).font('Helvetica').fillColor('#000000');
    doc.text('Received By:', 40, signY);
    doc.moveTo(40, signY + 40).lineTo(180, signY + 40).stroke();
    doc.text('Customer Signature', 40, signY + 45);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 40, signY + 58);

    // Company Stamp
    doc.text(`For ${companyDetails.name}:`, 380, signY);
    doc.moveTo(380, signY + 40).lineTo(520, signY + 40).stroke();
    doc.text('Authorized Signatory', 380, signY + 45);
    doc.text('(Company Seal)', 380, signY + 58);

    // Finalize the PDF
    doc.end();

    console.log(`✅ PDF invoice generated for DC ${dcNo}`);

  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

// Global Invoice Generation by DC Number
export const generateInvoiceByDC = async (req, res) => {
  try {
    const { dcNo, salesPersonId } = req.body;

    console.log('📄 Generating invoice for DC:', dcNo);

    if (!dcNo) {
      return res.status(400).json({
        success: false,
        message: 'DC Number is required'
      });
    }

    // Find all dispatch entries with this DC number
    const dispatches = await Dispatch.find({ dcno: dcNo })
      .populate('productId')
      .populate('customer')
      .populate('company')
      .populate('salesPerson')
      .populate({
        path: 'orderId',
        populate: {
          path: 'products.product',
          model: 'Item'
        }
      })
      .sort({ createdAt: 1 });

    console.log(`📦 Found ${dispatches.length} dispatch entries for DC ${dcNo}`);

    if (!dispatches || dispatches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No dispatches found with this DC number'
      });
    }

    // Use the first dispatch for common details
    const firstDispatch = dispatches[0];

    // Override salesperson if provided
    let salesPerson = firstDispatch.salesPerson;
    if (salesPersonId) {
      const customSalesPerson = await User.findById(salesPersonId);
      if (customSalesPerson) {
        salesPerson = customSalesPerson;
      }
    }

    const customer = firstDispatch.customer;
    const company = firstDispatch.company;

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer information not found'
      });
    }

    // Setup PDF generation
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${dcNo}_${Date.now()}.pdf"`);

    // Company details with defaults
    const companyDetails = {
      name: company?.name || 'SUNRISE BAKERY',
      tagline: company?.tagline || 'Premium Quality Baked Goods Since 2020',
      address: company?.address || 'Company Address Not Set',
      city: company?.city || '',
      pincode: company?.pincode || '',
      phone: company?.phone || 'Not Available',
      email: company?.email || 'Not Available',
      gstin: company?.gstin || 'GSTIN Not Set',
      pan: company?.pan || 'PAN Not Set'
    };

    doc.pipe(res);

    // Header
    doc.rect(30, 30, 535, 120).fillAndStroke('#1e3a8a', '#1e3a8a');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
      .text(companyDetails.name.toUpperCase(), 40, 50, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#e0e7ff')
      .text(companyDetails.tagline, 40, 85, { align: 'center' });

    doc.fontSize(8).fillColor('#ffffff');
    const fullAddress = `${companyDetails.address}${companyDetails.city ? ', ' + companyDetails.city : ''}${companyDetails.pincode ? ' - ' + companyDetails.pincode : ''}`;
    doc.text(fullAddress, 40, 105, { align: 'left', width: 350 });
    doc.text(`${companyDetails.phone} | ${companyDetails.email}`, 40, 118, { align: 'left', width: 350 });
    doc.text(`GSTIN: ${companyDetails.gstin}`, 400, 105, { align: 'left' });
    doc.text(`PAN: ${companyDetails.pan}`, 400, 118, { align: 'left' });

    doc.fillColor('#000000');
    doc.y = 160;

    // Invoice Title
    doc.rect(30, doc.y, 535, 35).fillAndStroke('#f3f4f6', '#d1d5db');
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e3a8a')
      .text('TAX INVOICE / DELIVERY CHALLAN', 40, doc.y + 10, { align: 'center' });

    doc.fillColor('#000000');
    doc.y += 45;

    // Invoice Details & Party Information Section
    const invoiceDetailsY = doc.y;

    // Left Box - Invoice Info and Sales Person
    doc.rect(30, invoiceDetailsY, 260, 120).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text('Invoice Details', 40, invoiceDetailsY + 8);
    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    doc.text(`DC No: `, 40, invoiceDetailsY + 28, { continued: true });
    doc.font('Helvetica-Bold').text(`${dcNo}`);
    doc.font('Helvetica').text(`Date: ${new Date(firstDispatch.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 40, invoiceDetailsY + 43);
    doc.text(`Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`, 40, invoiceDetailsY + 58);

    // Divider line
    doc.moveTo(40, invoiceDetailsY + 75).lineTo(280, invoiceDetailsY + 75).stroke();

    // Sales Person info
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('Sales Person', 40, invoiceDetailsY + 82);
    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    const salesPersonName = salesPerson?.fullName || salesPerson?.username || salesPerson?.name || 'N/A';
    doc.text(salesPersonName, 40, invoiceDetailsY + 98, { width: 240, ellipsis: true });

    // Right Box - Bill To (Customer Details)
    doc.rect(305, invoiceDetailsY, 260, 120).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text('Bill To', 315, invoiceDetailsY + 8);
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text(customer.name || 'N/A', 315, invoiceDetailsY + 28, { width: 240, ellipsis: true });

    doc.fontSize(8).font('Helvetica');
    let customerY = invoiceDetailsY + 45;

    const customerCode = customer.customerCode || 'N/A';
    doc.text(`Code: ${customerCode}`, 315, customerY);
    customerY += 13;

    const customerPhone = customer.phone || 'N/A';
    doc.text(`Phone: ${customerPhone}`, 315, customerY);
    customerY += 13;

    const customerAddress = customer.address || '';
    if (customerAddress && customerAddress.trim() !== '') {
      // Use text with proper wrapping
      const addressLines = doc.heightOfString(customerAddress, { width: 240 });
      if (addressLines > 26) {
        // If address is too long, truncate with ellipsis
        doc.text(customerAddress, 315, customerY, { width: 240, height: 26, ellipsis: true });
      } else {
        doc.text(customerAddress, 315, customerY, { width: 240, lineGap: 1 });
      }
    } else {
      doc.text('Address: N/A', 315, customerY);
    }

    doc.y = invoiceDetailsY + 130;

    // Items Table Header
    const tableTop = doc.y;
    doc.rect(30, tableTop, 535, 25).fillAndStroke('#1e3a8a', '#1e3a8a');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('S.No', 35, tableTop + 8, { width: 30, align: 'center' });
    doc.text('Product Name', 70, tableTop + 8, { width: 160 });
    doc.text('Quantity', 235, tableTop + 8, { width: 50, align: 'right' });
    doc.text('Rate', 290, tableTop + 8, { width: 55, align: 'right' });
    doc.text('Amount', 350, tableTop + 8, { width: 60, align: 'right' });
    doc.text('GST%', 415, tableTop + 8, { width: 40, align: 'right' });
    doc.text('Total', 460, tableTop + 8, { width: 100, align: 'right' });

    doc.fillColor('#000000');
    let yPosition = tableTop + 33;

    // Items
    let subtotal = 0;
    let totalGST = 0;

    dispatches.forEach((dispatch, index) => {
      // Get product name from populated productId or fallback to productName field
      const productName = dispatch.productId?.name || dispatch.productName || 'Unknown Product';

      // Get quantity from qtyIssued or indentQty
      const quantity = dispatch.qtyIssued || dispatch.indentQty || 0;

      // Get rate and GST
      let rate = 0;
      let gstRate = 0;

      // Try to get from the order first
      if (dispatch.orderId && dispatch.orderId.products && Array.isArray(dispatch.orderId.products)) {
        // Find the matching product in the order
        const orderProduct = dispatch.orderId.products.find(
          p => p.product && dispatch.productId &&
            p.product.toString() === dispatch.productId._id.toString()
        );

        if (orderProduct) {
          // Order stores 'price' field (not unitPrice)
          rate = orderProduct.price || 0;
          console.log(`📊 Found rate ${rate} from order for ${productName}`);
        }
      }

      // Get GST from product model (Item has 'gst' field)
      if (dispatch.productId && dispatch.productId.gst !== undefined) {
        gstRate = dispatch.productId.gst || 0;
        console.log(`📊 Found GST ${gstRate}% from product for ${productName}`);
      }

      // If no rate found in order, use product's salePrice
      if (rate === 0 && dispatch.productId) {
        rate = dispatch.productId.salePrice || dispatch.productId.price || 0;
        console.log(`📊 Using product salePrice ${rate} for ${productName}`);
      }

      const amount = quantity * rate;
      const gstAmount = (amount * gstRate) / 100;
      const total = amount + gstAmount;

      console.log(`📦 ${productName}: Qty=${quantity}, Rate=${rate}, GST=${gstRate}%, Amount=${amount.toFixed(2)}, Total=${total.toFixed(2)}`);

      subtotal += amount;
      totalGST += gstAmount;

      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(8).font('Helvetica');
      doc.text(index + 1, 35, yPosition + 4, { width: 30, align: 'center' });
      doc.text(productName, 70, yPosition + 4, { width: 160, ellipsis: true });
      doc.text(quantity.toString(), 235, yPosition + 4, { width: 50, align: 'right' });
      doc.text(rate.toFixed(2), 290, yPosition + 4, { width: 55, align: 'right' });
      doc.text(amount.toFixed(2), 350, yPosition + 4, { width: 60, align: 'right' });
      doc.text(gstRate.toFixed(0) + '%', 415, yPosition + 4, { width: 40, align: 'right' });
      doc.text(total.toFixed(2), 460, yPosition + 4, { width: 100, align: 'right' });

      yPosition += 25; // Increased height from 20 to 25
    });

    // Totals Section
    doc.moveTo(30, yPosition).lineTo(565, yPosition).stroke();
    yPosition += 15;

    const grandTotal = subtotal + totalGST;

    // Subtotal row
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Subtotal:', 380, yPosition, { width: 80, align: 'right' });
    doc.text('Rs.', 465, yPosition, { width: 25, align: 'left' });
    doc.text(subtotal.toFixed(2), 490, yPosition, { width: 70, align: 'right' });
    yPosition += 18;

    // GST row
    doc.text('GST:', 380, yPosition, { width: 80, align: 'right' });
    doc.text('Rs.', 465, yPosition, { width: 25, align: 'left' });
    doc.text(totalGST.toFixed(2), 490, yPosition, { width: 70, align: 'right' });
    yPosition += 20;

    // Grand Total box with better alignment
    doc.rect(380, yPosition - 5, 185, 28).fillAndStroke('#f3f4f6', '#1e3a8a');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a');
    doc.text('Grand', 390, yPosition + 2, { width: 40, align: 'left' });
    doc.text('Total:', 390, yPosition + 14, { width: 40, align: 'left' });
    doc.fontSize(12);
    doc.text('Rs.', 465, yPosition + 7, { width: 25, align: 'left' });
    doc.text(grandTotal.toFixed(2), 490, yPosition + 7, { width: 70, align: 'right' });

    doc.fillColor('#000000');
    yPosition += 40;

    // Amount in Words
    const amountInWords = convertNumberToWords(Math.round(grandTotal));
    doc.fontSize(9).font('Helvetica-Bold').text('Amount in Words:', 40, yPosition);
    doc.font('Helvetica').text(`${amountInWords} Rupees Only`, 40, yPosition + 15, { width: 520 });

    yPosition += 50;

    // Signature Section
    doc.fontSize(8).font('Helvetica');
    doc.text('Received By:', 40, yPosition);
    doc.moveTo(40, yPosition + 40).lineTo(180, yPosition + 40).stroke();
    doc.text('Customer Signature', 40, yPosition + 45);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 40, yPosition + 58);

    doc.text(`For ${companyDetails.name}:`, 380, yPosition);
    doc.moveTo(380, yPosition + 40).lineTo(520, yPosition + 40).stroke();
    doc.text('Authorized Signatory', 380, yPosition + 45);
    doc.text('(Company Seal)', 380, yPosition + 58);

    doc.end();

    console.log(`✅ Invoice generated for DC ${dcNo}`);

  } catch (error) {
    console.error('❌ Error generating invoice by DC:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

// Create Direct Order from Dispatch (similar to sales order creation)
export const createDirectOrder = async (req, res) => {
  try {
    const { customerId, salesPersonId, orderDate, products, notes, autoDispatch } = req.body;

    console.log('📦 Creating direct order from dispatch:', { customerId, salesPersonId, orderDate, productsCount: products?.length, autoDispatch });

    // Validation
    const errors = {};

    if (!customerId) {
      errors.customerId = 'Customer ID is required';
    } else {
      const customerExists = await Customer.findById(customerId);
      if (!customerExists) {
        errors.customerId = 'Customer not found';
      }
    }

    if (!salesPersonId) {
      errors.salesPersonId = 'Sales person ID is required';
    }

    if (!orderDate) {
      errors.orderDate = 'Order date is required';
    } else if (new Date(orderDate).toString() === 'Invalid Date') {
      errors.orderDate = 'Order date must be a valid date';
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      errors.products = 'At least one product is required';
    } else {
      // Validate each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (!product.productId) {
          errors[`products[${i}].productId`] = 'Product ID is required';
        }

        if (!product.quantity || product.quantity <= 0) {
          errors[`products[${i}].quantity`] = 'Quantity must be greater than 0';
        }

        if (!product.unitPrice || product.unitPrice < 0) {
          errors[`products[${i}].unitPrice`] = 'Unit price is required';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderProducts = [];

    for (const productItem of products) {
      const itemTotal = productItem.unitPrice * productItem.quantity;
      totalAmount += itemTotal;

      orderProducts.push({
        product: productItem.productId,
        quantity: productItem.quantity,
        price: productItem.unitPrice,
        total: itemTotal
      });
    }

    // Generate unique order code
    let orderCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const orderCount = await Order.countDocuments();
      orderCode = `ORD-${String(orderCount + 1 + attempts).padStart(4, '0')}`;

      const existingOrder = await Order.findOne({ orderCode });
      if (!existingOrder) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      orderCode = `ORD-${Date.now().toString().slice(-6)}`;
    }

    // Parse order date correctly to avoid timezone issues
    // Create UTC date to prevent timezone conversion: YYYY-MM-DD -> UTC midnight
    const parsedOrderDate = new Date(orderDate + 'T00:00:00.000Z');
    console.log('📅 Order date parsed:', { input: orderDate, parsed: parsedOrderDate });

    // Create order
    const order = new Order({
      orderCode,
      customer: customerId,
      salesPerson: salesPersonId,
      companyId: req.user.companyId,
      unit: req.user.unit,
      orderDate: parsedOrderDate,
      products: orderProducts,
      totalAmount,
      status: 'pending',
      notes,
      createdBy: req.user._id || req.user.id,
      createdByRole: 'Dispatch' // Mark that this order was created by dispatch
    });

    console.log('✅ Creating order with salesPerson:', salesPersonId, 'Created by Dispatch user:', req.user.username);

    await order.save();

    // Populate order with customer and salesperson details
    await order.populate([
      { path: 'customer', select: 'name email mobile' },
      { path: 'salesPerson', select: 'username fullName email' },
      { path: 'products.product', select: 'name code category unit' }
    ]);

    console.log('📦 Order created, now creating dispatch entries for products...');

    // Step 2: Create dispatch entries for each product in the order
    // Use the parsed order date for dispatch entries, not today's date
    const dispatchDate = new Date(parsedOrderDate);
    const dispatchStartOfDay = new Date(Date.UTC(
      dispatchDate.getUTCFullYear(),
      dispatchDate.getUTCMonth(),
      dispatchDate.getUTCDate(),
      0, 0, 0, 0
    ));
    console.log('📅 Dispatch date:', { orderDate: parsedOrderDate, dispatchDate: dispatchStartOfDay });

    // Generate DC number if auto-dispatch is requested
    let dcNumber = null;
    if (autoDispatch) {
      dcNumber = await Dispatch.generateNextDCno(req.user.companyId);
      console.log('📋 Generated DC number for auto-dispatch:', dcNumber);
    }

    const dispatchEntries = [];

    for (const orderProduct of order.products) {
      const productId = orderProduct.product._id;
      const productName = orderProduct.product.name;
      const indentQty = orderProduct.quantity;

      // Get total indent quantity for this product from all orders for today
      const totalOrderQtyForProduct = await Order.aggregate([
        {
          $match: {
            customer: customerId,
            orderDate: dispatchStartOfDay,
            status: { $ne: 'cancelled' }
          }
        },
        { $unwind: '$products' },
        {
          $match: {
            'products.product': productId
          }
        },
        {
          $group: {
            _id: null,
            totalQty: { $sum: '$products.quantity' }
          }
        }
      ]);

      const totalIndentQty = totalOrderQtyForProduct.length > 0 ? totalOrderQtyForProduct[0].totalQty : indentQty;
      console.log(`📊 Total indent qty for ${productName} from all orders today: ${totalIndentQty}`);

      // Check if there's already a dispatch entry for this product on the order date
      const existingDispatch = await Dispatch.findOne({
        productId: productId,
        company: req.user.companyId,
        date: dispatchStartOfDay
      });

      let newDispatchData;

      if (existingDispatch) {
        // Use existing dispatch data as template
        console.log(`📋 Found existing dispatch for product ${productName}, copying data...`);

        newDispatchData = {
          productId: productId,
          productName: productName,
          productGroup: existingDispatch.productGroup,
          company: req.user.companyId,
          date: dispatchStartOfDay,

          // Copy existing stock data
          packedQuantityReadyForDispatch: existingDispatch.packedQuantityReadyForDispatch || 0,
          previousClosingStockYesterdayBalance: existingDispatch.previousClosingStockYesterdayBalance || 0,
          returnQuantityYesterdayReturns: existingDispatch.returnQuantityYesterdayReturns || 0,
          totalAvailableStock: existingDispatch.totalAvailableStock || 0,
          physicalStockEntryManualVerification: existingDispatch.physicalStockEntryManualVerification || 0,

          // Add new order data
          totalIndentQuantityOrdersForTheDay: totalIndentQty,
          indentQty: 0,
          qtyIssued: indentQty,
          dispatchedQuantitySentToday: indentQty,

          // Recalculate closing stock
          closingStockEndOfDayBalance: existingDispatch.closingStockEndOfDayBalance || 0,

          // Copy other fields
          batchNo: existingDispatch.batchNo,
          packingSheetId: existingDispatch.packingSheetId,

          // New order references
          salesPerson: salesPersonId,
          customer: customerId,
          orderId: order._id,

          // Auto-dispatch fields
          dcno: autoDispatch ? dcNumber : null,
          status: autoDispatch ? 'dispatched' : 'pending',
          lastUpdatedBy: req.user._id || req.user.id,
          createdBy: req.user._id || req.user.id
        };
      } else {
        // Create new dispatch entry with basic data
        console.log(`✨ Creating new dispatch entry for product ${productName}...`);

        // Get product details for additional info
        const productDetails = await Item.findById(productId).select('category unit');

        newDispatchData = {
          productId: productId,
          productName: productName,
          productGroup: productDetails?.category || orderProduct.product.category || 'N/A',
          company: req.user.companyId,
          date: dispatchStartOfDay,

          // Basic stock data
          packedQuantityReadyForDispatch: 0,
          previousClosingStockYesterdayBalance: 0,
          returnQuantityYesterdayReturns: 0,
          totalAvailableStock: 0,
          totalIndentQuantityOrdersForTheDay: totalIndentQty,
          indentQty: 0,
          qtyIssued: indentQty,
          dispatchedQuantitySentToday: indentQty,
          closingStockEndOfDayBalance: 0,
          physicalStockEntryManualVerification: 0,

          // Order references
          salesPerson: salesPersonId,
          customer: customerId,
          orderId: order._id,

          // No packing sheet for direct orders
          packingSheetId: null,

          // Auto-dispatch fields
          dcno: autoDispatch ? dcNumber : null,
          status: autoDispatch ? 'dispatched' : 'pending',
          lastUpdatedBy: req.user._id || req.user.id,
          createdBy: req.user._id || req.user.id
        };
      }

      // Create and save the dispatch entry
      const dispatchEntry = new Dispatch(newDispatchData);
      await dispatchEntry.save();
      dispatchEntries.push(dispatchEntry);

      console.log(`✅ Created dispatch entry for ${productName} with indent qty: ${indentQty}`);
    }

    console.log(`✅ Created ${dispatchEntries.length} dispatch entries for order ${order.orderCode}`);

    // Log auto-dispatch completion
    if (autoDispatch && dcNumber) {
      console.log(`✅ Auto-dispatch completed with DC number: ${dcNumber}`);
    }

    res.status(201).json({
      success: true,
      message: autoDispatch
        ? `Order created and dispatched successfully with DC No: ${dcNumber}`
        : 'Order created successfully from dispatch.',
      order: {
        _id: order._id,
        orderCode: order.orderCode,
        customer: order.customer,
        salesPerson: order.salesPerson,
        orderDate: order.orderDate,
        products: order.products,
        totalAmount: order.totalAmount,
        status: order.status
      },
      dispatchEntries: {
        count: dispatchEntries.length,
        entries: dispatchEntries.map(d => ({
          _id: d._id,
          productName: d.productName,
          indentQty: d.indentQty,
          status: d.status
        }))
      },
      dcNo: dcNumber,
      autoDispatched: autoDispatch && dcNumber !== null
    });

  } catch (error) {
    console.error('❌ Error creating direct order from dispatch:', error);

    // Handle duplicate key error for DC number
    if (error.code === 11000 && error.message.includes('dcno')) {
      return res.status(409).json({
        success: false,
        message: 'DC Number already exists. Please try again.',
        error: 'A dispatch with this DC number has already been created. The system will generate a new number on retry.'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Failed to create order and dispatch',
      error: error.message
    });
  }
};

// Get all sales persons for dispatch order creation
export const getSalesPersonsForDispatch = async (req, res) => {
  try {
    console.log('👥 Fetching sales persons for dispatch');

    const query = { role: 'Sales', isActive: true };

    // Filter by company if user has companyId
    if (req.user.companyId) {
      query.companyId = req.user.companyId;
    }

    const salesPersons = await User.find(query)
      .select('_id username fullName email role')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: {
        salesPersons,
        count: salesPersons.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching sales persons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales persons',
      error: error.message
    });
  }
};

// Get customers for dispatch order creation - shows ALL customers regardless of salesperson
export const getCustomersForDispatch = async (req, res) => {
  try {
    console.log('👥 Fetching all customers for dispatch (no salesperson filter)');

    const query = { isActive: true };

    // Filter by company if user has companyId
    if (req.user.companyId) {
      query.companyId = req.user.companyId;
    }

    // Show ALL customers - do NOT filter by salesPersonId
    // Sales person is only used when creating/updating the dispatch entry

    const customers = await Customer.find(query)
      .select('_id name contactPerson mobile email address city state')
      .sort({ name: 1 });

    console.log('✅ Found customers:', customers.length);

    res.json({
      success: true,
      data: {
        customers,
        count: customers.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

// Get all products for dispatch order creation
export const getProductsForDispatch = async (req, res) => {
  try {
    console.log('📦 Fetching products for dispatch order creation');
    console.log('👤 User company:', req.user.companyId);

    // COMMENTED OUT: Previous logic that filtered only dispatched products
    // Step 1: Get all unique product IDs from dispatches collection filtered by company
    // const query = {};
    // if (req.user.companyId) {
    //   query.company = req.user.companyId;
    // }

    // const allDispatches = await Dispatch.find(query).select('productId').lean();
    // console.log('📦 Total dispatch records for company:', allDispatches.length);

    // const dispatchedProductIds = [...new Set(allDispatches.map(d => d.productId?.toString()).filter(Boolean))];
    // console.log('📦 Unique dispatched product IDs:', dispatchedProductIds.length);

    // NEW LOGIC: Return ALL items for the company by default
    let products = [];

    // Always fetch all items filtered by store (company)
    console.log('✅ Fetching ALL items for company store');

    const itemQuery = {};
    if (req.user.companyId) {
      // Filter by store field which contains company ID
      itemQuery.store = req.user.companyId.toString();
      console.log('🔍 Filtering items by store (companyId):', req.user.companyId);
    }

    products = await Item.find(itemQuery)
      .select('_id name code category unit salePrice purchasePrice stock store batch')
      .sort({ name: 1 })
      .lean();

    console.log('📦 Found ALL items for company store:', products.length);

    // COMMENTED OUT: Previous logic for dispatched products only
    // if (dispatchedProductIds.length === 0) {
    //   // No dispatched products found - return items filtered by store (company)
    //   console.log('⚠️ No dispatched products found - fetching items by store (company)');
    //   
    //   const itemQuery = {};
    //   if (req.user.companyId) {
    //     // Filter by store field which contains company ID
    //     itemQuery.store = req.user.companyId.toString();
    //     console.log('🔍 Filtering items by store (companyId):', req.user.companyId);
    //   }
    //   
    //   products = await Item.find(itemQuery)
    //     .select('_id name code category unit salePrice purchasePrice stock store batch')
    //     .sort({ name: 1 })
    //     .lean();
    //   
    //   console.log('📦 Found items for company store:', products.length);
    // } else {
    //   // Step 2: Get those products from Item collection, filtered by store (company)
    //   const itemQuery = {
    //     _id: { $in: dispatchedProductIds }
    //   };
    //   
    //   if (req.user.companyId) {
    //     // Also filter by store to ensure items belong to this company
    //     itemQuery.store = req.user.companyId.toString();
    //     console.log('🔍 Filtering dispatched items by store (companyId):', req.user.companyId);
    //   }
    //   
    //   products = await Item.find(itemQuery)
    //     .select('_id name code category unit salePrice purchasePrice stock store batch')
    //     .sort({ name: 1 })
    //     .lean();

    //   console.log('📦 Found dispatched products for company store:', products.length);
    // }

    if (products.length > 0) {
      console.log('📦 Sample product:', products[0]);
    }

    res.json({
      success: true,
      data: {
        products: products.map(p => ({
          _id: p._id,
          name: p.name,
          code: p.code,
          category: p.category,
          unit: p.unit,
          price: p.salePrice,
          salePrice: p.salePrice,
          stock: p.stock || 0,
          store: p.store || 'N/A',
          batch: p.batch || null
        })),
        count: products.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};
/**
 * Get today's order items for selected sales person and customer
 * GET /api/dispatches/today-order-items?salesPersonId=xxx&customerId=xxx
 */
export const getTodayOrderItems = async (req, res) => {
  try {
    const { salesPersonId, customerId } = req.query;

    console.log('📦 Fetching today\'s order items');
    console.log('👤 Sales Person:', salesPersonId);
    console.log('👥 Customer:', customerId);

    // Validation
    if (!salesPersonId || !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Sales Person ID and Customer ID are required'
      });
    }

    // Get today's date in YYYY-MM-DD format
    const todayString = new Date().toISOString().split('T')[0];

    // Create date range for today in UTC (since orderDate is stored as Date at 00:00:00 UTC)
    const todayStart = new Date(todayString + 'T00:00:00.000Z');
    const todayEnd = new Date(todayString + 'T23:59:59.999Z');

    console.log('📅 Today:', todayString);
    console.log('📅 Date range (UTC):', { from: todayStart, to: todayEnd });

    // Find today's orders for this sales person + customer
    const orders = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId,
      orderDate: {
        $gte: todayStart,
        $lte: todayEnd
      }
    })
      .populate({
        path: 'products.product',
        select: 'name code category unit batch salePrice'
      })
      .lean();

    console.log('📦 Found orders:', orders.length);

    if (orders.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          count: 0,
          message: 'No orders found for today'
        }
      });
    }

    // Aggregate items from all orders
    const itemsMap = new Map();

    orders.forEach(order => {
      order.products.forEach(orderProduct => {
        const product = orderProduct.product;
        if (!product) return;

        const productId = product._id.toString();

        if (itemsMap.has(productId)) {
          // Add to existing item
          const existing = itemsMap.get(productId);
          existing.indentQty += orderProduct.quantity;
          existing.orderValue += orderProduct.total;
        } else {
          // Create new item entry
          itemsMap.set(productId, {
            _id: product._id,
            name: product.name,
            code: product.code,
            category: product.category,
            unit: product.unit,
            batch: product.batch || null,
            price: orderProduct.price,
            indentQty: orderProduct.quantity,
            orderValue: orderProduct.total
          });
        }
      });
    });

    const items = Array.from(itemsMap.values());

    console.log('📦 Aggregated items:', items.length);
    items.forEach(item => {
      console.log(`   - ${item.name}: Qty=${item.indentQty}, Value=${item.orderValue}, Batch=${item.batch}`);
    });

    res.json({
      success: true,
      data: {
        items: items,
        count: items.length,
        totalOrders: orders.length,
        totalValue: items.reduce((sum, item) => sum + item.orderValue, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s order items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s order items',
      error: error.message
    });
  }
};