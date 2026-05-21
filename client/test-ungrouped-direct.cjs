const mongoose = require('mongoose');
require('dotenv').config();

async function testUngroupedItems() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise-inventory');
    console.log('✅ Connected to MongoDB\n');

    // Import models (using dynamic import for ES modules)
    const { default: Dispatch } = await import('./server/models/Dispatch.js');
    const { Item } = await import('./server/models/Inventory.js');
    const { default: PackingSheet } = await import('./server/models/PackingSheet.js');

    // Get today's date range (local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Searching for dispatches from ${todayStart} to ${todayEnd}\n`);

    // Get today's dispatches
    const dispatches = await Dispatch.find({
      date: { $gte: todayStart, $lte: todayEnd }
    })
    .populate('company', 'companyName')
    .populate('productId', 'name batch stock qty')
    .lean();

    console.log(`📦 Found ${dispatches.length} dispatches for today\n`);

    // Find ungrouped items (dispatches without packing sheet having a production group)
    const ungroupedItems = [];

    for (const dispatch of dispatches) {
      if (dispatch.packingSheetId) {
        const packingSheet = await PackingSheet.findById(dispatch.packingSheetId).lean();
        
        if (packingSheet && !packingSheet.productionGroup) {
          console.log(`\n🔍 Found ungrouped item:`);
          console.log(`   Dispatch ID: ${dispatch._id}`);
          console.log(`   Product Group: ${dispatch.productGroup}`);
          console.log(`   Product ID: ${dispatch.productId?._id || dispatch.productId}`);
          console.log(`   Product Name: ${dispatch.productId?.name || 'Unknown'}`);
          console.log(`   Packing Sheet ID: ${dispatch.packingSheetId}`);
          console.log(`   Packing Sheet has productionGroup: ${packingSheet.productionGroup}`);
          
          // Get item batch directly
          const itemId = dispatch.productId?._id || dispatch.productId;
          if (itemId) {
            const item = await Item.findById(itemId).select('name batch stock qty').lean();
            if (item) {
              console.log(`   ✅ Item found in DB:`);
              console.log(`      - Name: ${item.name}`);
              console.log(`      - Batch: ${item.batch}`);
              console.log(`      - Stock: ${item.stock || item.qty || 0}`);
              
              ungroupedItems.push({
                dispatchId: dispatch._id,
                productGroup: dispatch.productGroup,
                productName: item.name,
                batch: item.batch,
                totalItemBatch: item.batch
              });
            } else {
              console.log(`   ❌ Item NOT found in DB for ID: ${itemId}`);
            }
          } else {
            console.log(`   ⚠️ No productId in dispatch`);
          }
        }
      }
    }

    console.log(`\n\n📊 SUMMARY:`);
    console.log(`Total dispatches today: ${dispatches.length}`);
    console.log(`Ungrouped items found: ${ungroupedItems.length}\n`);

    if (ungroupedItems.length > 0) {
      console.log(`Ungrouped Items Details:`);
      ungroupedItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productGroup}`);
        console.log(`   Product: ${item.productName}`);
        console.log(`   Batch: ${item.batch}`);
        console.log(`   Total Item Batch: ${item.totalItemBatch}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

testUngroupedItems();
