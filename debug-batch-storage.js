// Debug script to test batchId and batchNo storage in packing sheets
import mongoose from 'mongoose';
import PackingSheet from './server/models/Packing.js';

async function testBatchStorage() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/sunrise-production-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('📡 Connected to MongoDB');

    // Find the most recent packing sheet
    const recentSheet = await PackingSheet.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    if (!recentSheet) {
      console.log('❌ No packing sheets found');
      return;
    }
    
    console.log('🔍 Most recent packing sheet:');
    console.log('ID:', recentSheet._id);
    console.log('Group Name:', recentSheet.productionGroupName);
    console.log('Items:', recentSheet.items.length);
    
    // Check each item for batchId and batchNo
    recentSheet.items.forEach((item, index) => {
      console.log(`\n📦 Item ${index + 1}:`);
      console.log('  Product Name:', item.productName);
      console.log('  Batch ID:', item.batchId);
      console.log('  Batch No:', item.batchNo);
      console.log('  Produced Qty:', item.producedQty);
      console.log('  Packed Qty:', item.packedQty);
    });
    
    // Test if we can create a new sheet with batchId and batchNo
    const testData = {
      slNo: 9999,
      productionGroupName: 'Test Group',
      items: [{
        productId: new mongoose.Types.ObjectId(),
        productName: 'Test Product',
        batchId: new mongoose.Types.ObjectId(),
        batchNo: 'TEST_BATCH_001',
        indentQty: 10,
        producedQty: 10,
        packedQty: 10,
        packingLoss: 0,
        notes: 'Test item'
      }],
      company: recentSheet.company,
      createdBy: recentSheet.createdBy,
      lastUpdatedBy: recentSheet.lastUpdatedBy,
      packingDate: new Date(),
      isActive: true
    };
    
    console.log('\n🧪 Creating test packing sheet...');
    const testSheet = new PackingSheet(testData);
    const savedSheet = await testSheet.save();
    
    console.log('✅ Test sheet created with ID:', savedSheet._id);
    console.log('🔍 Saved item batchId:', savedSheet.items[0].batchId);
    console.log('🔍 Saved item batchNo:', savedSheet.items[0].batchNo);
    
    // Clean up test data
    await PackingSheet.deleteOne({ _id: savedSheet._id });
    console.log('🧹 Test sheet cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

testBatchStorage();