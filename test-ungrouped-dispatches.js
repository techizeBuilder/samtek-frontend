import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function checkUngroupedDispatches() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Today: ${startOfDay}\n`);

    // Find dispatches without packing sheet
    const ungroupedDispatches = await Dispatch.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      $or: [
        { packingSheetId: null },
        { packingSheetId: { $exists: false } }
      ]
    }).lean();

    console.log(`📊 Total ungrouped dispatches for today: ${ungroupedDispatches.length}\n`);

    if (ungroupedDispatches.length === 0) {
      console.log('✅ No ungrouped dispatches found');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Ungrouped Dispatches:');
    ungroupedDispatches.forEach((d, i) => {
      console.log(`\n${i + 1}. Dispatch ID: ${d._id}`);
      console.log(`   Product Group: ${d.productGroup}`);
      console.log(`   Product Name: ${d.productName}`);
      console.log(`   Product ID: ${d.productId}`);
      console.log(`   Status: ${d.status}`);
      console.log(`   Indent Qty: ${d.totalIndentQuantityOrdersForTheDay || d.indentQty}`);
    });

    // Check if they share the same productGroup
    const groupNames = ungroupedDispatches.map(d => d.productGroup);
    const uniqueGroups = [...new Set(groupNames)];
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total dispatches: ${ungroupedDispatches.length}`);
    console.log(`   Unique product groups: ${uniqueGroups.length}`);
    uniqueGroups.forEach(g => {
      const count = groupNames.filter(name => name === g).length;
      console.log(`      "${g}": ${count} items`);
    });

    console.log('\n✅ Test completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkUngroupedDispatches();
