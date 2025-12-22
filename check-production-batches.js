import mongoose from 'mongoose';

// Import the model
const ProductionBatchSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionGroup' },
  batchNo: { type: String, required: true },
  qtyPlanned: { type: Number, required: true },
  qtyAchieved: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
  productionDate: { type: Date, required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionShift' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  startTime: Date,
  endTime: Date,
  efficiency: Number,
  loss: Number,
  remarks: String,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);

async function checkBatches() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sunrise-inventory');
    console.log('Connected to database');
    
    // Check all production batches
    const allBatches = await ProductionBatch.find({}).limit(10);
    console.log('Total production batches:', await ProductionBatch.countDocuments({}));
    console.log('Sample batches:', allBatches.map(b => ({
      id: b._id,
      itemId: b.itemId, 
      groupId: b.groupId,
      batchNo: b.batchNo,
      status: b.status,
      productionDate: b.productionDate,
      qtyAchieved: b.qtyAchieved
    })));
    
    // Check today's batches
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const todayBatches = await ProductionBatch.find({
      productionDate: { 
        $gte: today, 
        $lte: endOfDay 
      }
    });
    
    console.log('Today batches count:', todayBatches.length);
    console.log('Today date filter:', today, 'to', endOfDay);
    
    // Check completed batches
    const completedBatches = await ProductionBatch.find({ status: 'completed' });
    console.log('Completed batches count:', completedBatches.length);
    
    // Check all statuses
    const statuses = await ProductionBatch.distinct('status');
    console.log('Available statuses:', statuses);
    
    // Check recent batches
    const recentBatches = await ProductionBatch.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('Recent batches:', recentBatches.map(b => ({
      id: b._id,
      batchNo: b.batchNo,
      status: b.status,
      productionDate: b.productionDate,
      createdAt: b.createdAt
    })));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBatches();