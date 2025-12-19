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
        { dispatchNumber: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { transporterName: { $regex: search, $options: 'i' } }
      ];
    }

    const dispatches = await Dispatch.find(query)
      .populate('order', 'orderNumber')
      .populate('customer', 'customerName contactPerson phone')
      .populate('assignedTo', 'fullName')
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
      .populate('order')
      .populate('customer')
      .populate('assignedTo', 'fullName');

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
      { path: 'order', select: 'orderNumber' },
      { path: 'customer', select: 'customerName contactPerson phone' }
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
      { path: 'order', select: 'orderNumber' },
      { path: 'customer', select: 'customerName contactPerson phone' },
      { path: 'assignedTo', select: 'fullName' }
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

// Get dispatch dashboard data with approved packing sheets, production batches and related records
export const getDispatchDashboardData = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Import PackingSheet model
    const PackingSheet = (await import('../models/Packing.js')).default;
    const ProductionBatch = (await import('../models/ProductionBatch.js')).default;
    const ProductionGroup = (await import('../models/ProductionGroup.js')).default;
    
    // Get approved packing sheets from today with related data
    const approvedPackingSheets = await PackingSheet.find({
      company: req.user.companyId,
      packingDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'approved'
    })
    .populate({
      path: 'productionGroup',
      select: 'name description qtyPerBatch items',
      populate: {
        path: 'items',
        select: 'name code category unit image'
      }
    })
    .populate('createdBy', 'username fullName')
    .populate('lastUpdatedBy', 'username fullName')
    .lean();

    // Get production batches for approved packing sheets
    const productionBatchData = [];
    
    for (const packingSheet of approvedPackingSheets) {
      // Get related production batches for each item in the packing sheet
      for (const item of packingSheet.items) {
        const relatedBatches = await ProductionBatch.find({
          itemId: item.productId,
          company: req.user.companyId,
          status: 'completed',
          batchDate: { $gte: startOfDay, $lte: endOfDay }
        })
        .populate('itemId', 'name code category unit')
        .populate('groupId', 'name description')
        .lean();

        if (relatedBatches.length > 0) {
          productionBatchData.push({
            packingSheetId: packingSheet._id,
            productId: item.productId,
            productName: item.productName,
            batches: relatedBatches
          });
        }
      }
    }

    // Calculate dispatch-ready quantities
    const dispatchReadyItems = approvedPackingSheets.flatMap(sheet => 
      sheet.items.map(item => ({
        packingSheetId: sheet._id,
        productId: item.productId,
        productName: item.productName,
        packedQuantity: item.packedQty,
        indentQuantity: item.indentQty,
        packingLoss: sheet.packingLoss || 0,
        readyForDispatch: item.packedQty > 0,
        packingDate: sheet.packingDate,
        productionGroup: sheet.productionGroupName || 'Unknown Group'
      }))
    );

    // Get existing dispatch records for today to show what's already dispatched
    const todaysDispatches = await Dispatch.find({
      company: req.user.companyId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('order', 'orderNumber')
    .populate('customer', 'customerName contactPerson')
    .lean();

    // Calculate dashboard stats
    const stats = {
      totalApprovedSheets: approvedPackingSheets.length,
      totalDispatchReadyItems: dispatchReadyItems.filter(item => item.readyForDispatch).length,
      totalPackedQuantity: dispatchReadyItems.reduce((sum, item) => sum + item.packedQuantity, 0),
      totalDispatchesToday: todaysDispatches.length,
      pendingDispatchItems: dispatchReadyItems.filter(item => item.readyForDispatch && !todaysDispatches.find(d => d.productId === item.productId)).length
    };

    res.json({
      success: true,
      data: {
        stats,
        approvedPackingSheets: approvedPackingSheets.map(sheet => ({
          _id: sheet._id,
          slNo: sheet.slNo,
          productionGroupName: sheet.productionGroupName,
          status: sheet.status,
          packingStartTime: sheet.packingStartTime,
          packingEndTime: sheet.packingEndTime,
          packingLoss: sheet.packingLoss,
          totalPackedQty: sheet.totalPackedQty,
          notes: sheet.notes,
          items: sheet.items,
          createdAt: sheet.createdAt,
          createdBy: sheet.createdBy
        })),
        dispatchReadyItems,
        productionBatchData,
        todaysDispatches: todaysDispatches.map(dispatch => ({
          _id: dispatch._id,
          dispatchNumber: dispatch.dispatchNumber,
          status: dispatch.status,
          customer: dispatch.customer,
          order: dispatch.order,
          transporterName: dispatch.transporterName,
          trackingNumber: dispatch.trackingNumber,
          createdAt: dispatch.createdAt
        }))
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
    const { productGroup, packingSheetId, physicalStockEntry } = req.body;

    // You can create a separate ManualStockEntry model or add this to PackingSheet
    // For now, let's add it to the dispatch context
    const result = await PackingSheet.findByIdAndUpdate(
      packingSheetId,
      { 
        $set: { 
          physicalStockEntry: physicalStockEntry,
          lastUpdatedBy: req.user._id || req.user.id,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Packing sheet not found'
      });
    }

    res.json({
      success: true,
      message: 'Physical stock entry updated successfully',
      data: {
        productGroup,
        physicalStockEntry,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error updating manual stock entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update manual stock entry',
      error: error.message
    });
  }
};
