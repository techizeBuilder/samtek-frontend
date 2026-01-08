import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';
import ProductionGroup from './server/models/ProductionGroup.js';
import { Item } from './server/models/Inventory.js';

dotenv.config();

async function testUngroupedLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const companyId = '6914090118cf85f80ad856bc';
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    console.log('🔍 SIMULATING API CALL WITH CORRECT COMPANY ID\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Step 1: Get ProductDetailsDailySummary
    console.log('Step 1: Querying ProductDetailsDailySummary...');
    const productDetailsSummary = await ProductDetailsDailySummary.find({
      companyId: companyId,
      date: today
    })
    .populate('productId', 'name code category subCategory qty unit price image description')
    .lean();
    
    console.log(`✅ Found ${productDetailsSummary.length} records\n`);
    
    // Step 2: Get assigned items
    console.log('Step 2: Getting assigned items from ProductionGroup...');
    const assignedGroups = await ProductionGroup.find({
      company: companyId,
      isActive: true
    }).select('items');
    
    const assignedItemIds = assignedGroups.flatMap(group => 
      group.items.map(item => item.toString())
    );
    
    console.log(`✅ ${assignedItemIds.length} items are assigned to groups\n`);
    
    // Step 3: Filter ungrouped items with batchAdjusted > 0
    console.log('Step 3: Filtering ungrouped items with batchAdjusted > 0...');
    const ungroupedItems = productDetailsSummary.filter(item => {
      const hasProduct = item.productId;
      const isNotAssigned = !assignedItemIds.includes(item.productId?._id.toString());
      const hasBatches = (item.batchAdjusted || 0) > 0;
      
      if (hasProduct && isNotAssigned) {
        console.log(`   • ${item.productId.name}: batchAdjusted=${item.batchAdjusted || 0} → ${hasBatches ? '✅ INCLUDE' : '❌ EXCLUDE'}`);
      }
      
      return hasProduct && isNotAssigned && hasBatches;
    });
    
    console.log(`\n✅ ${ungroupedItems.length} ungrouped items with batches > 0\n`);
    
    // Step 4: Format items
    console.log('Step 4: Formatting items for API response...\n');
    const formattedItems = ungroupedItems.map(item => {
      const { productId, batchAdjusted, productionFinalBatches } = item;
      const batchCount = batchAdjusted || 0;
      
      return {
        _id: productId._id,
        name: productId.name || 'Unnamed Item',
        code: productId.code || 'No Code',
        noOfBatchesForProduction: batchCount,
        batchAdjusted: batchCount,
        productionFinalBatches: productionFinalBatches || 0
      };
    });
    
    console.log('📊 FINAL API RESPONSE DATA:\n');
    formattedItems.forEach(item => {
      console.log(`   ${item.name}:`);
      console.log(`      noOfBatchesForProduction: ${item.noOfBatchesForProduction}`);
      console.log(`      batchAdjusted: ${item.batchAdjusted}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ API will return ${formattedItems.length} items`);
    
    if (formattedItems.length === 0) {
      console.log('\n❌ PROBLEM: 0 items returned!');
      console.log('   Check if user is logged in with companyId: ' + companyId);
    } else {
      console.log('\n✅ SUCCESS: Items will be shown with correct batch values!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testUngroupedLogic();
