import mongoose from 'mongoose';

// Import the model schema
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

async function debugDateFiltering() {
  try {
    await mongoose.connect('mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manuerp');
    console.log('Connected to database');
    
    // Current date logic from the controller
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    console.log('📅 Date filtering debug:');
    console.log('Current date/time:', new Date());
    console.log('Today (start of day UTC):', today);
    console.log('End of day (UTC):', endOfDay);
    console.log('Today ISO:', today.toISOString());
    console.log('End of day ISO:', endOfDay.toISOString());
    
    // Check all production batches with their dates
    const allBatches = await ProductionBatch.find({}).sort({ productionDate: -1 }).limit(20);
    console.log('\n📊 Recent production batches:');
    allBatches.forEach((batch, idx) => {
      console.log(`${idx + 1}. Batch ${batch.batchNo} - Date: ${batch.productionDate?.toISOString()} - Status: ${batch.status}`);
    });
    
    // Check batches for today
    const todayBatches = await ProductionBatch.find({
      productionDate: { 
        $gte: today, 
        $lte: endOfDay 
      }
    });
    
    console.log(`\n🎯 Batches found for today (${today.toDateString()}):`);
    console.log(`Total: ${todayBatches.length}`);
    todayBatches.forEach((batch, idx) => {
      console.log(`${idx + 1}. Batch ${batch.batchNo} - Date: ${batch.productionDate?.toISOString()} - Status: ${batch.status} - Achieved: ${batch.qtyAchieved}`);
    });
    
    // Check completed batches for today
    const completedTodayBatches = await ProductionBatch.find({
      productionDate: { 
        $gte: today, 
        $lte: endOfDay 
      },
      status: 'completed'
    });
    
    console.log(`\n✅ Completed batches for today:`);
    console.log(`Total: ${completedTodayBatches.length}`);
    completedTodayBatches.forEach((batch, idx) => {
      console.log(`${idx + 1}. Batch ${batch.batchNo} - Date: ${batch.productionDate?.toISOString()} - Achieved: ${batch.qtyAchieved}`);
    });
    
    // Check yesterday's date to see if that's where the data is
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setUTCHours(23, 59, 59, 999);
    
    console.log(`\n📅 Yesterday date range:`);
    console.log('Yesterday start:', yesterday.toISOString());
    console.log('Yesterday end:', endOfYesterday.toISOString());
    
    const yesterdayBatches = await ProductionBatch.find({
      productionDate: { 
        $gte: yesterday, 
        $lte: endOfYesterday 
      }
    });
    
    console.log(`\n📊 Batches found for yesterday (${yesterday.toDateString()}):`);
    console.log(`Total: ${yesterdayBatches.length}`);
    yesterdayBatches.forEach((batch, idx) => {
      console.log(`${idx + 1}. Batch ${batch.batchNo} - Date: ${batch.productionDate?.toISOString()} - Status: ${batch.status} - Achieved: ${batch.qtyAchieved}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugDateFiltering();