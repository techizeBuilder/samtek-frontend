import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';
import ProductionGroup from './server/models/ProductionGroup.js';
import { Item } from './server/models/Inventory.js';

dotenv.config();

async function checkUngroupedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get today's date (same logic as in the controller)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    console.log('📅 Today:', today.toISOString().split('T')[0]);
    console.log('');

    // Check 1: Total ProductDetailsDailySummary records for today
    const allTodayRecords = await ProductDetailsDailySummary.find({
      date: today
    }).populate('productId', 'name code').lean();
    
    console.log(`📊 Total ProductDetailsDailySummary records for today: ${allTodayRecords.length}`);
    console.log('');
    
    if (allTodayRecords.length > 0) {
      console.log('Sample records:');
      allTodayRecords.slice(0, 5).forEach(record => {
        console.log(`  - ${record.productId?.name || 'Unknown'} (${record.productId?.code || 'No Code'})`);
        console.log(`    productionFinalBatches: ${record.productionFinalBatches || 0}`);
        console.log(`    packing: ${record.packing || 0}`);
        console.log(`    physicalStock: ${record.physicalStock || 0}`);
        console.log(`    companyId: ${record.companyId || 'None'}`);
      });
      console.log('');
    }

    // Check 2: Check production groups
    const productionGroups = await ProductionGroup.find({ isActive: true });
    console.log(`📦 Active production groups: ${productionGroups.length}`);
    
    if (productionGroups.length > 0) {
      const assignedItemIds = productionGroups.flatMap(group => 
        group.items.map(item => item.toString())
      );
      console.log(`📌 Total items assigned to groups: ${assignedItemIds.length}`);
      console.log('');
      
      // Check 3: Find ungrouped items
      const ungroupedRecords = allTodayRecords.filter(record => {
        return record.productId && 
               !assignedItemIds.includes(record.productId._id.toString());
      });
      
      console.log(`🔍 Ungrouped items in ProductDetailsDailySummary: ${ungroupedRecords.length}`);
      
      if (ungroupedRecords.length > 0) {
        console.log('\nUngrouped items:');
        ungroupedRecords.forEach(record => {
          console.log(`  - ${record.productId?.name || 'Unknown'} (${record.productId?.code || 'No Code'})`);
          console.log(`    productionFinalBatches: ${record.productionFinalBatches || 0}`);
          console.log(`    companyId: ${record.companyId || 'None'}`);
        });
      }
    } else {
      console.log('⚠️  No active production groups found - all items should be ungrouped');
      console.log('');
    }

    // Check 4: Check if there are any items in the Item collection
    const totalItems = await Item.countDocuments();
    console.log(`\n📦 Total items in Item collection: ${totalItems}`);
    
    // Check 5: Check different company IDs in the data
    const companies = await ProductDetailsDailySummary.distinct('companyId', { date: today });
    console.log(`\n🏢 Companies with production data today: ${companies.length}`);
    if (companies.length > 0) {
      console.log('Company IDs:', companies.map(c => c?.toString() || 'null').join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUngroupedData();
