import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductionBatch from './server/models/ProductionBatch.js';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';
import { Item } from './server/models/Inventory.js';

dotenv.config();

async function checkDuplicateEntries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const companyId = '6914090118cf85f80ad856bc';
    
    console.log('🔍 CHECKING DUPLICATE ENTRIES FOR EVERYDAY 5PC BUN\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Find the item
    const item = await Item.findOne({ name: 'Everyday 5Pc bun', store: companyId }).lean();
    
    if (!item) {
      console.log('❌ Item not found');
      return;
    }
    
    console.log('📦 Item Details:');
    console.log(`   Name: ${item.name}`);
    console.log(`   ID: ${item._id}`);
    console.log(`   Code: ${item.code}`);
    console.log('');
    
    // Check ProductDetailsDailySummary
    console.log('📊 ProductDetailsDailySummary for Everyday 5Pc bun:');
    const dailySummary = await ProductDetailsDailySummary.findOne({
      productId: item._id,
      companyId: companyId,
      date: today
    }).lean();
    
    if (dailySummary) {
      console.log(`   batchAdjusted: ${dailySummary.batchAdjusted || 0}`);
      console.log(`   productionFinalBatches: ${dailySummary.productionFinalBatches || 0}`);
      console.log('');
    } else {
      console.log('   ❌ No record found\n');
    }
    
    // Check ProductionBatch entries
    console.log('📋 ProductionBatch entries for Everyday 5Pc bun:');
    const batches = await ProductionBatch.find({
      itemId: item._id,
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow }
    }).sort({ batchNumber: 1 }).lean();
    
    console.log(`   Total batches created: ${batches.length}\n`);
    
    if (batches.length > 0) {
      batches.forEach((batch, index) => {
        console.log(`   Batch ${index + 1}:`);
        console.log(`      Batch No: ${batch.batchNo}`);
        console.log(`      Batch Number: ${batch.batchNumber}`);
        console.log(`      Status: ${batch.status}`);
        console.log(`      qtyPerBatch: ${batch.qtyPerBatch}`);
        console.log(`      Group ID: ${batch.groupId || 'null (ungrouped)'}`);
        console.log(`      Created By: ${batch.createdBy}`);
        console.log(`      Created At: ${batch.createdAt}`);
        console.log(`      Notes: ${batch.notes || 'none'}`);
        console.log('');
      });
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Analysis
    if (batches.length > 1 && dailySummary && dailySummary.batchAdjusted < 1) {
      console.log('❌ PROBLEM DETECTED:');
      console.log(`   batchAdjusted = ${dailySummary.batchAdjusted} (less than 1)`);
      console.log(`   But ${batches.length} batches were created!`);
      console.log('');
      console.log('🔍 This should only create 1 batch, not ' + batches.length);
      console.log('');
      console.log('💡 POSSIBLE CAUSES:');
      console.log('   1. Approval/Build process was run TWICE');
      console.log('   2. Manual creation of duplicate batch');
      console.log('   3. Bug in the batch creation logic');
      console.log('');
      
      // Check if they were created at different times
      if (batches.length === 2) {
        const timeDiff = Math.abs(new Date(batches[1].createdAt) - new Date(batches[0].createdAt));
        const secondsDiff = Math.floor(timeDiff / 1000);
        console.log(`⏱️  Time between batch creations: ${secondsDiff} seconds`);
        
        if (secondsDiff < 5) {
          console.log('   → Created almost simultaneously (same API call?)');
        } else {
          console.log('   → Created at different times (separate API calls)');
        }
      }
    } else if (batches.length === 1) {
      console.log('✅ CORRECT: Only 1 batch created for batchAdjusted < 1');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkDuplicateEntries();
