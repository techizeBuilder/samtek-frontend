import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';

const MONGODB_URI = 'mongodb+srv://manuerp:manuerp@cluster0.by2xv6x.mongodb.net/manuerp';

const debugUngroupedBatches = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Get today's date range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Date filter:', {
      from: today.toISOString(),
      to: tomorrow.toISOString()
    });

    // Company ID from your MongoDB data
    const companyId = new mongoose.Types.ObjectId('691409118cf85f08ad585bc');

    console.log('\n🔍 Checking all ProductionBatches for company...');
    const allBatches = await ProductionBatch.find({
      companyId: companyId
    }).lean();
    
    console.log(`📊 Total batches for company: ${allBatches.length}`);
    allBatches.forEach((batch, index) => {
      console.log(`${index + 1}. BatchNo: ${batch.batchNo}, Date: ${batch.productionDate?.toISOString()}, GroupId: ${batch.groupId}`);
    });

    console.log('\n🔍 Checking today\'s batches...');
    const todayBatches = await ProductionBatch.find({
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow }
    }).lean();
    
    console.log(`📊 Today's batches: ${todayBatches.length}`);
    todayBatches.forEach((batch, index) => {
      console.log(`${index + 1}. BatchNo: ${batch.batchNo}, GroupId: ${batch.groupId}, ItemId: ${batch.itemId}`);
    });

    console.log('\n🔍 Checking ungrouped batches...');
    const ungroupedBatches = await ProductionBatch.find({
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow },
      $or: [
        { groupId: { $exists: false } },
        { groupId: null }
      ]
    }).lean();
    
    console.log(`📦 Ungrouped batches: ${ungroupedBatches.length}`);
    ungroupedBatches.forEach((batch, index) => {
      console.log(`${index + 1}. BatchNo: ${batch.batchNo}, ItemId: ${batch.itemId}, Status: ${batch.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

debugUngroupedBatches();