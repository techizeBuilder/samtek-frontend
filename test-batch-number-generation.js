import mongoose from 'mongoose';
import UngroupedItemProduction from './server/models/UngroupedItemProduction.js';
import Item from './server/models/Item.js';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';
import ProductDailySummary from './server/models/ProductDailySummary.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBatchNumberGeneration() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Test the batch number generation logic
    console.log('\n🧪 Testing Batch Number Generation Logic');
    console.log('==========================================');

    // Find a test company
    const testCompany = await mongoose.model('Company').findOne().lean();
    if (!testCompany) {
      console.log('❌ No company found in database');
      return;
    }

    console.log(`🏢 Using company: ${testCompany.name} (${testCompany._id})`);

    // Check current highest batch number
    const lastBatch = await UngroupedItemProduction.findOne({
      companyId: testCompany._id
    }).sort({ batchNumber: -1 }).limit(1);

    let nextBatchNumber = 1;
    if (lastBatch && lastBatch.batchNumber) {
      nextBatchNumber = lastBatch.batchNumber + 1;
    }

    console.log(`\n📊 Current State:`);
    console.log(`  - Last batch in DB: ${lastBatch ? `${lastBatch.batchNo} (${lastBatch.batchNumber})` : 'None'}`);
    console.log(`  - Next batch number: ${nextBatchNumber}`);
    console.log(`  - Next batch ID: BATNO${nextBatchNumber.toString().padStart(2, '0')}`);

    // Check how many ungrouped items would get batch numbers
    const items = await Item.find({ store: testCompany._id }).lean();
    console.log(`\n📦 Total items in company: ${items.length}`);

    // Check today's ProductDetailsDailySummary for items with batchAdjusted > 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemsWithBatchAdjusted = await ProductDetailsDailySummary.find({
      companyId: testCompany._id,
      date: { $gte: today, $lt: tomorrow },
      batchAdjusted: { $gt: 0 }
    }).lean();

    console.log(`📊 Items with batchAdjusted > 0 today: ${itemsWithBatchAdjusted.length}`);

    // Simulate the batch entries creation
    let simulatedBatchCounter = nextBatchNumber;
    let totalBatchEntries = 0;

    for (const itemSummary of itemsWithBatchAdjusted) {
      const totalBatches = Math.ceil(itemSummary.batchAdjusted);
      console.log(`  - Item ${itemSummary.productId}: ${itemSummary.batchAdjusted} → ${totalBatches} batches`);
      
      for (let i = 1; i <= totalBatches; i++) {
        const batchNo = `BATNO${simulatedBatchCounter.toString().padStart(2, '0')}`;
        console.log(`    Batch ${i}: ${batchNo} (${simulatedBatchCounter})`);
        simulatedBatchCounter++;
        totalBatchEntries++;
      }
    }

    console.log(`\n✅ Simulation Results:`);
    console.log(`  - Total batch entries to be created: ${totalBatchEntries}`);
    console.log(`  - Final batch number would be: ${simulatedBatchCounter - 1}`);
    console.log(`  - Final batch ID would be: BATNO${(simulatedBatchCounter - 1).toString().padStart(2, '0')}`);

    // Show existing UngroupedItemProduction entries
    const existingEntries = await UngroupedItemProduction.find({
      companyId: testCompany._id
    }).sort({ batchNumber: 1 }).lean();

    console.log(`\n📋 Existing UngroupedItemProduction entries: ${existingEntries.length}`);
    if (existingEntries.length > 0) {
      console.log('Recent entries:');
      existingEntries.slice(-5).forEach(entry => {
        console.log(`  - ${entry.batchNo} (${entry.batchNumber}): Item ${entry.itemId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testBatchNumberGeneration();