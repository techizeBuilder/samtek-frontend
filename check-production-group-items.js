import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function checkProductionGroupItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const ProductionGroup = mongoose.model('ProductionGroup', new mongoose.Schema({}, { strict: false, collection: 'productiongroups' }));
    const ProductionBatch = mongoose.model('ProductionBatch', new mongoose.Schema({}, { strict: false, collection: 'productionbatches' }));
    const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false, collection: 'items' }));

    // Find the Brown group
    const brownGroup = await ProductionGroup.findOne({ name: /Brown/i }).lean();
    
    if (!brownGroup) {
      console.log('❌ Brown group not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📦 Found Production Group:');
    console.log(`   ID: ${brownGroup._id}`);
    console.log(`   Name: ${brownGroup.name}`);
    console.log(`   Items: ${brownGroup.items?.length || 0}\n`);

    // Get items from the production group
    if (brownGroup.items && brownGroup.items.length > 0) {
      console.log('📋 Items in Production Group:');
      for (let i = 0; i < brownGroup.items.length; i++) {
        const itemId = brownGroup.items[i];
        const item = await Item.findById(itemId).select('name code batch').lean();
        if (item) {
          console.log(`   ${i + 1}. ${item.name} (ID: ${itemId}, Batch: ${item.batch})`);
        } else {
          console.log(`   ${i + 1}. Item not found (ID: ${itemId})`);
        }
      }
    }

    // Get production batches for this group
    console.log('\n📦 Production Batches for this group:');
    const batches = await ProductionBatch.find({ 
      groupId: brownGroup._id 
    }).lean();

    console.log(`   Total batches: ${batches.length}\n`);

    // Check combined items in each batch
    for (const batch of batches) {
      console.log(`   Batch: ${batch.batchNo} (Date: ${batch.productionDate})`);
      if (batch.combinedItems && batch.combinedItems.length > 0) {
        console.log(`      Combined Items: ${batch.combinedItems.length}`);
        for (const ci of batch.combinedItems) {
          const item = await Item.findById(ci.itemId).select('name').lean();
          console.log(`         - ${item?.name || 'Unknown'} (ID: ${ci.itemId})`);
        }
      } else {
        console.log(`      Combined Items: 0 (empty)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check completed!');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkProductionGroupItems();
