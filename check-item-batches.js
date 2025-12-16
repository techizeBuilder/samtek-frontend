// Check which specific items have batches in database
import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';
import { Item } from './server/models/Inventory.js';
import dotenv from 'dotenv';

dotenv.config();

const checkItemBatches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const companyId = '6914090118cf85f80ad856bc';
    
    console.log('🏢 Checking items with batches for company:', companyId);
    
    const batches = await ProductionBatch.find({
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow }
    }).populate('itemId', 'name code').lean();
    
    console.log(`📦 Found ${batches.length} items with batches:`);
    
    for (const batch of batches) {
      console.log(`  - ${batch.batchNo} (Number: ${batch.batchNumber}): ${batch.itemId?.name || 'Unknown item'} (ID: ${batch.itemId?._id || batch.itemId})`);
    }
    
    // Also show some items without batches for comparison
    const allItems = await Item.find({}).select('name code _id').limit(5).lean();
    console.log(`\n📋 Sample items in database:`);
    allItems.forEach(item => {
      console.log(`  - ${item.name} (ID: ${item._id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkItemBatches();