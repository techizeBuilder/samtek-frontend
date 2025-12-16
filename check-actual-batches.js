// Check actual batch numbers in database
import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';
import dotenv from 'dotenv';

dotenv.config();

const checkBatches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 Checking batches for today: ${today.toDateString()}`);
    
    // Get all batches from today
    const todayBatches = await ProductionBatch.find({
      productionDate: { $gte: today, $lt: tomorrow }
    }).sort({ batchNumber: 1 }).lean();
    
    console.log(`🔢 Found ${todayBatches.length} batches for today:`);
    todayBatches.forEach((batch, index) => {
      console.log(`  ${index + 1}. Batch: ${batch.batchNo} (Number: ${batch.batchNumber}), Company: ${batch.companyId}, Item: ${batch.itemId}`);
    });
    
    // Get the highest batch number
    const lastBatch = await ProductionBatch.findOne({
      productionDate: { $gte: today, $lt: tomorrow }
    }).sort({ batchNumber: -1 }).limit(1);
    
    console.log(`\n📊 Highest batch number for today: ${lastBatch?.batchNumber || 'None'} (${lastBatch?.batchNo || 'None'})`);
    console.log(`✅ Next batch should be: ${(lastBatch?.batchNumber || 0) + 1}`);
    
    // Check all batches (not just today)
    const allBatches = await ProductionBatch.find({}).sort({ batchNumber: -1 }).limit(10).lean();
    console.log(`\n📋 Last 10 batches in database (all time):`);
    allBatches.forEach((batch, index) => {
      console.log(`  ${index + 1}. ${batch.batchNo} (${batch.batchNumber}) - ${new Date(batch.productionDate).toDateString()}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkBatches();