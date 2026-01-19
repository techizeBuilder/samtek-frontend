import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function testTodaysProductsAPI() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));
    const PackingSheet = mongoose.model('PackingSheet', new mongoose.Schema({}, { strict: false, collection: 'packingsheets' }));
    const ProductionBatch = mongoose.model('ProductionBatch', new mongoose.Schema({}, { strict: false, collection: 'productionbatches' }));

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log('📅 Today\'s date range:');
    console.log(`   Start: ${startOfDay}`);
    console.log(`   End: ${endOfDay}\n`);

    // Step 1: Check all dispatches
    const allDispatches = await Dispatch.countDocuments();
    console.log(`📊 Total Dispatches in DB: ${allDispatches}\n`);

    if (allDispatches === 0) {
      console.log('❌ No dispatches found in database at all!');
      await mongoose.disconnect();
      return;
    }

    // Step 2: Check dispatches for today (any status)
    const todayDispatches = await Dispatch.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    console.log(`📊 Dispatches for today (any status): ${todayDispatches.length}`);
    
    if (todayDispatches.length === 0) {
      // Check last 7 days
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      
      const recentDispatches = await Dispatch.find({
        date: { $gte: last7Days }
      }).sort({ date: -1 }).limit(5).lean();

      console.log(`\n📊 Recent dispatches (last 7 days): ${recentDispatches.length}`);
      recentDispatches.forEach((d, i) => {
        console.log(`   ${i + 1}. Date: ${d.date}, Status: ${d.status}, Group: ${d.productGroup}`);
      });
      
      console.log('\n❌ No dispatches found for today! Check the date field in your dispatch records.');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📋 Today\'s Dispatch Details:');
    todayDispatches.forEach((d, i) => {
      console.log(`   ${i + 1}. Status: ${d.status}, Group: ${d.productGroup}, PackingSheet: ${d.packingSheetId || 'null'}, Product: ${d.productName || 'N/A'}`);
    });

    // Step 3: Check by status
    const statusCounts = {};
    todayDispatches.forEach(d => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });
    
    console.log('\n📊 Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Step 4: Check with API filters
    const apiStatuses = ['pending', 'updated', 'approved', 'dispatched'];
    const filteredByStatus = todayDispatches.filter(d => apiStatuses.includes(d.status));
    
    console.log(`\n📊 Dispatches matching API status filter: ${filteredByStatus.length}`);
    
    if (filteredByStatus.length === 0) {
      console.log('⚠️ No dispatches match the API status filter!');
      console.log(`   API expects statuses: ${apiStatuses.join(', ')}`);
      console.log(`   Your data has statuses: ${Object.keys(statusCounts).join(', ')}`);
      await mongoose.disconnect();
      return;
    }

    // Step 5: Check packing sheets
    console.log('\n🔍 Checking Packing Sheets...');
    const packingSheetIds = [...new Set(filteredByStatus.map(d => d.packingSheetId?.toString()).filter(Boolean))];
    console.log(`   Unique packing sheet IDs: ${packingSheetIds.length}`);
    
    for (const psId of packingSheetIds.slice(0, 3)) {
      const ps = await PackingSheet.findById(psId).lean();
      if (ps) {
        console.log(`   ✅ PackingSheet ${psId}: productionGroup = ${ps.productionGroup}`);
        
        // Check production batches
        const batches = await ProductionBatch.find({ groupId: ps.productionGroup }).lean();
        console.log(`      Production batches for this group: ${batches.length}`);
        
        if (batches.length > 0) {
          batches.forEach((b, i) => {
            console.log(`      Batch ${i + 1}: ${b.batchNo}, combinedItems: ${b.combinedItems?.length || 0}`);
          });
        }
      } else {
        console.log(`   ❌ PackingSheet ${psId} NOT FOUND`);
      }
    }

    // Step 6: Check ungrouped items
    const ungrouped = filteredByStatus.filter(d => !d.packingSheetId);
    console.log(`\n📦 Ungrouped dispatches (no packing sheet): ${ungrouped.length}`);
    if (ungrouped.length > 0) {
      ungrouped.slice(0, 3).forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.productGroup} - ${d.productName || 'N/A'}`);
      });
    }

    // Step 7: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Total dispatches in DB: ${allDispatches}`);
    console.log(`✅ Dispatches for today: ${todayDispatches.length}`);
    console.log(`✅ Matching API status filter: ${filteredByStatus.length}`);
    console.log(`✅ With packing sheets: ${packingSheetIds.length}`);
    console.log(`✅ Without packing sheets (ungrouped): ${ungrouped.length}`);
    
    if (filteredByStatus.length > 0) {
      console.log('\n✅ API should return data! If it returns empty, check:');
      console.log('   1. Company ID filter in API');
      console.log('   2. Server logs for errors during processing');
      console.log('   3. Packing sheet and production batch population');
    }

    console.log('\n✅ Test completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

testTodaysProductsAPI();
