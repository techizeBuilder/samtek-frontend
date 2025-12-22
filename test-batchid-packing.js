import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Import models
import PackingSheet from './server/models/Packing.js';
import ProductionBatch from './server/models/ProductionBatch.js';

async function testPackingSheetWithBatchId() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Get a completed batch
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const testBatch = await ProductionBatch.findOne({
      productionDate: { $gte: today, $lte: endOfDay },
      status: 'completed'
    }).lean();

    if (!testBatch) {
      console.log('❌ No completed batch found for today');
      return;
    }

    console.log('🎯 Test batch found:', testBatch.batchNo, testBatch._id);

    // Create a test packing sheet with batchId
    const testPackingSheet = new PackingSheet({
      slNo: 999,
      productionGroupName: 'Test Group',
      packingStartTime: new Date(),
      status: 'in_progress',
      company: testBatch.companyId,
      createdBy: new mongoose.Types.ObjectId(),
      lastUpdatedBy: new mongoose.Types.ObjectId(),
      packingDate: today,
      items: [{
        productId: testBatch.itemId,
        productName: 'Test Product',
        batchId: testBatch._id,  // ✅ Include batchId
        batchNo: testBatch.batchNo,  // ✅ Include batchNo
        indentQty: testBatch.qtyAchieved,
        producedQty: testBatch.qtyAchieved,
        packedQty: testBatch.qtyAchieved,
        packingLoss: 0,
        notes: 'Test packing sheet'
      }],
      isActive: true
    });

    await testPackingSheet.save();
    console.log('✅ Test packing sheet created:', testPackingSheet._id);

    // Verify the packing sheet has the batchId
    const savedSheet = await PackingSheet.findById(testPackingSheet._id).lean();
    console.log('📋 Saved packing sheet structure:');
    console.log('   Items count:', savedSheet.items?.length);
    
    if (savedSheet.items && savedSheet.items.length > 0) {
      console.log('   First item:', {
        productId: savedSheet.items[0].productId,
        batchId: savedSheet.items[0].batchId,
        batchNo: savedSheet.items[0].batchNo,
        packedQty: savedSheet.items[0].packedQty,
        packingLoss: savedSheet.items[0].packingLoss,
        notes: savedSheet.items[0].notes
      });
    }

    // Test the query logic
    console.log('\n🔍 Testing query logic:');
    const foundSheets = await PackingSheet.find({
      $or: [
        { 'items.batchId': testBatch._id },
        { 'items.batchNo': testBatch.batchNo }
      ],
      company: testBatch.companyId
    }).lean();

    console.log(`   Found ${foundSheets.length} sheets for batch ${testBatch.batchNo}`);

    // Cleanup - remove test sheet
    await PackingSheet.deleteOne({ _id: testPackingSheet._id });
    console.log('🗑️ Test sheet cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

testPackingSheetWithBatchId();