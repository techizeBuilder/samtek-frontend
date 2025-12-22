import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Import models
import PackingSheet from './server/models/Packing.js';
import ProductionBatch from './server/models/ProductionBatch.js';

async function testPackingSheetAvailability() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connected');

    console.log('\n🔍 Checking packing sheet availability...');
    
    // Get today's date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Get all completed batches for today
    const completedBatches = await ProductionBatch.find({
      productionDate: { $gte: today, $lte: endOfDay },
      status: 'completed'
    }).lean();

    console.log(`\n📦 Found ${completedBatches.length} completed batches today`);

    if (completedBatches.length > 0) {
      // Check the specific batch from the screenshot
      const targetBatchId = "6948ed12c6189bc00cbca297";
      const targetBatch = completedBatches.find(b => b._id.toString() === targetBatchId);
      
      if (targetBatch) {
        console.log(`\n🎯 Found target batch: ${targetBatch.batchNo}`);
        console.log('   Item ID:', targetBatch.itemId);
        console.log('   Company ID:', targetBatch.companyId);
        console.log('   Qty Achieved:', targetBatch.qtyAchieved);
      }

      // Check all packing sheets in the database
      const allPackingSheets = await PackingSheet.find({}).lean();
      console.log(`\n📋 Total packing sheets in database: ${allPackingSheets.length}`);

      // Check packing sheets for today
      const todaysPackingSheets = await PackingSheet.find({
        createdAt: { $gte: today, $lte: endOfDay }
      }).lean();
      console.log(`📅 Packing sheets created today: ${todaysPackingSheets.length}`);

      // Check different ways to find packing sheets for batches
      console.log('\n🔍 Testing different query methods:');

      for (let i = 0; i < Math.min(3, completedBatches.length); i++) {
        const batch = completedBatches[i];
        console.log(`\n   Batch ${i + 1}: ${batch.batchNo} (${batch._id})`);

        // Method 1: Direct batchId query
        const directQuery = await PackingSheet.find({
          batchId: batch._id
        }).lean();
        console.log(`     Method 1 (direct batchId): ${directQuery.length} sheets`);

        // Method 2: String batchId query
        const stringQuery = await PackingSheet.find({
          batchId: batch._id.toString()
        }).lean();
        console.log(`     Method 2 (string batchId): ${stringQuery.length} sheets`);

        // Method 3: Query by items array
        const itemsQuery = await PackingSheet.find({
          'items.batchId': batch._id
        }).lean();
        console.log(`     Method 3 (items.batchId): ${itemsQuery.length} sheets`);

        // Method 4: Query by items array with string
        const itemsStringQuery = await PackingSheet.find({
          'items.batchId': batch._id.toString()
        }).lean();
        console.log(`     Method 4 (items.batchId string): ${itemsStringQuery.length} sheets`);

        // Method 5: Query with company filter
        const companyQuery = await PackingSheet.find({
          batchId: batch._id,
          company: batch.companyId
        }).lean();
        console.log(`     Method 5 (with company filter): ${companyQuery.length} sheets`);

        // Method 6: Check if batch ID exists anywhere in packing sheets
        const anywhereQuery = await PackingSheet.find({
          $or: [
            { batchId: batch._id },
            { batchId: batch._id.toString() },
            { 'items.batchId': batch._id },
            { 'items.batchId': batch._id.toString() }
          ]
        }).lean();
        console.log(`     Method 6 (anywhere): ${anywhereQuery.length} sheets`);

        if (anywhereQuery.length > 0) {
          console.log('     📋 Found packing sheet:', {
            id: anywhereQuery[0]._id,
            status: anywhereQuery[0].status,
            packingDate: anywhereQuery[0].packingDate,
            company: anywhereQuery[0].company,
            items: anywhereQuery[0].items?.length || 0
          });
        }
      }

      // Check the exact query used in the controller
      console.log('\n🎯 Testing controller query logic:');
      for (let i = 0; i < Math.min(2, completedBatches.length); i++) {
        const batch = completedBatches[i];
        console.log(`\n   Testing for batch: ${batch.batchNo}`);
        
        const controllerQuery = await PackingSheet.find({
          batchId: batch._id,
          companyId: batch.companyId  // Using companyId as in controller
        }).lean();
        console.log(`   Controller query result: ${controllerQuery.length} sheets`);

        if (controllerQuery.length === 0) {
          // Try alternative field names
          const altQuery1 = await PackingSheet.find({
            batchId: batch._id,
            company: batch.companyId  // Try 'company' instead of 'companyId'
          }).lean();
          console.log(`   Alternative query 1 (company field): ${altQuery1.length} sheets`);
        }
      }

      // Show packing sheet schema structure
      if (allPackingSheets.length > 0) {
        console.log('\n📝 Packing Sheet Schema Structure (first record):');
        const firstSheet = allPackingSheets[0];
        console.log('   Fields:', Object.keys(firstSheet));
        console.log('   Sample record:', {
          _id: firstSheet._id,
          status: firstSheet.status,
          batchId: firstSheet.batchId,
          company: firstSheet.company,
          companyId: firstSheet.companyId,
          packingDate: firstSheet.packingDate,
          items: firstSheet.items?.length || 0
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

// Run the test
testPackingSheetAvailability();