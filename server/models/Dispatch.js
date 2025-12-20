import mongoose from 'mongoose';

const dispatchConsoleSchema = new mongoose.Schema({
  // Tracking fields
  packingSheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackingSheet',
    required: true,
    index: true
  },
  
  // Individual product tracking (NEW FIELDS)
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: false, // Will be null for aggregated entries, populated for individual product entries
    index: true
  },
  productName: {
    type: String,
    required: false, // Will be null for aggregated entries, populated for individual product entries
    trim: true
  },
  
  productGroup: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date();
      return new Date(today.setHours(0, 0, 0, 0));
    },
    index: true
  },
  
  // Dispatch Console Columns (matching dispatch console UI)
  packedQuantityReadyForDispatch: {
    type: Number,
    default: 0,
    min: [0, 'Packed quantity cannot be negative']
  },
  previousClosingStockYesterdayBalance: {
    type: Number,
    default: 0,
    min: [0, 'Previous closing stock cannot be negative']
  },
  returnQuantityYesterdayReturns: {
    type: Number,
    default: 0,
    min: [0, 'Return quantity cannot be negative']
  },
  totalAvailableStock: {
    type: Number,
    default: 0,
    min: [0, 'Total available stock cannot be negative']
    // Auto-calculated: packing + closing + returns
  },
  totalIndentQuantityOrdersForTheDay: {
    type: Number,
    default: 0,
    min: [0, 'Total indent quantity cannot be negative']
  },
  excessShortage: {
    type: Number,
    default: 0
    // Auto-calculated: available - indent (can be negative for shortage)
  },
  dispatchedQuantitySentToday: {
    type: Number,
    default: 0,
    min: [0, 'Dispatched quantity cannot be negative']
  },
  closingStockEndOfDayBalance: {
    type: Number,
    default: 0,
    min: [0, 'Closing stock cannot be negative']
  },
  physicalStockEntryManualVerification: {
    type: Number,
    default: 0,
    min: [0, 'Physical stock entry cannot be negative']
  },
  overallLoss: {
    type: Number,
    default: 0
    // Auto-calculated: closing - physical (can be negative)
  },
  
  // Additional tracking fields
  batchNo: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['pending', 'updated', 'verified', 'dispatched', 'completed'],
    default: 'pending',
    index: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
dispatchConsoleSchema.index({ packingSheetId: 1, date: 1 }, { unique: true, name: 'unique_packing_sheet_per_day' });
dispatchConsoleSchema.index({ company: 1, date: 1 }, { name: 'company_date_index' });
dispatchConsoleSchema.index({ productGroup: 1, date: 1 }, { name: 'product_group_date_index' });
dispatchConsoleSchema.index({ status: 1, date: 1 }, { name: 'status_date_index' });

// Virtual field to check if entry is editable
dispatchConsoleSchema.virtual('isEditable').get(function() {
  return ['pending', 'updated'].includes(this.status);
});

// Virtual field to check if entry is verified
dispatchConsoleSchema.virtual('isVerified').get(function() {
  return ['verified', 'dispatched', 'completed'].includes(this.status);
});

// Auto-calculate dependent fields before saving
dispatchConsoleSchema.pre('save', function(next) {
  // Calculate totalAvailableStock = packing + closing + returns
  this.totalAvailableStock = 
    (this.packedQuantityReadyForDispatch || 0) + 
    (this.previousClosingStockYesterdayBalance || 0) + 
    (this.returnQuantityYesterdayReturns || 0);
  
  // Calculate excessShortage = available - indent  
  this.excessShortage = 
    (this.totalAvailableStock || 0) - 
    (this.totalIndentQuantityOrdersForTheDay || 0);
  
  // Calculate closingStockEndOfDayBalance = totalAvailableStock - dispatchedQuantity
  this.closingStockEndOfDayBalance = 
    (this.totalAvailableStock || 0) - 
    (this.dispatchedQuantitySentToday || 0);
  
  // Calculate overallLoss = closingStock - physicalStock
  this.overallLoss = 
    (this.closingStockEndOfDayBalance || 0) - 
    (this.physicalStockEntryManualVerification || 0);
  
  next();
});

// Auto-calculate fields when updating
dispatchConsoleSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.$set) {
    // Recalculate dependent fields if relevant fields are being updated
    const relevantFields = [
      'packedQuantityReadyForDispatch',
      'previousClosingStockYesterdayBalance', 
      'returnQuantityYesterdayReturns',
      'totalIndentQuantityOrdersForTheDay',
      'dispatchedQuantitySentToday',
      'physicalStockEntryManualVerification'
    ];
    
    const hasRelevantUpdates = relevantFields.some(field => update.$set[field] !== undefined);
    
    if (hasRelevantUpdates) {
      const packing = update.$set.packedQuantityReadyForDispatch || 0;
      const closing = update.$set.previousClosingStockYesterdayBalance || 0;
      const returns = update.$set.returnQuantityYesterdayReturns || 0;
      const indent = update.$set.totalIndentQuantityOrdersForTheDay || 0;
      const dispatched = update.$set.dispatchedQuantitySentToday || 0;
      const physical = update.$set.physicalStockEntryManualVerification || 0;
      
      // Calculate dependent fields
      const totalAvailable = packing + closing + returns;
      update.$set.totalAvailableStock = totalAvailable;
      update.$set.excessShortage = totalAvailable - indent;
      
      // Calculate closingStockEndOfDayBalance = totalAvailableStock - dispatchedQuantity
      const closingStock = totalAvailable - dispatched;
      update.$set.closingStockEndOfDayBalance = closingStock;
      
      // Calculate overallLoss = closingStock - physicalStock  
      update.$set.overallLoss = closingStock - physical;
    }
  }
  
  next();
});

// Static method to get dispatch summary for a date range
dispatchConsoleSchema.statics.getDispatchSummary = async function(companyId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        company: companyId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$productGroup',
        totalPacked: { $sum: '$packedQuantityReadyForDispatch' },
        totalDispatched: { $sum: '$dispatchedQuantitySentToday' },
        totalClosing: { $sum: '$closingStockEndOfDayBalance' },
        totalLoss: { $sum: '$overallLoss' },
        count: { $sum: 1 },
        avgExcessShortage: { $avg: '$excessShortage' }
      }
    },
    {
      $sort: { totalPacked: -1 }
    }
  ]);
};

// Compound indexes for efficient queries
dispatchConsoleSchema.index({ packingSheetId: 1, productId: 1, date: 1 }); // Remove unique constraint temporarily
dispatchConsoleSchema.index({ company: 1, date: 1 }); // For daily dashboard queries
dispatchConsoleSchema.index({ productGroup: 1, date: 1 }); // For group-wise reporting

export default mongoose.model('Dispatch', dispatchConsoleSchema);
