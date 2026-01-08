import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';
import ProductionBatch from './server/models/ProductionBatch.js';
import ProductionGroup from './server/models/ProductionGroup.js';
import { Item } from './server/models/Inventory.js';

dotenv.config();

async function checkApprovalIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const companyId = '6914090118cf85f80ad856bc';
    
    console.log('🔍 CHECKING APPROVAL PROCESS FOR ISSUES\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check 1: ProductDetailsDailySummary - Check for items with 0 or negative values
    console.log('📊 Check 1: ProductDetailsDailySummary with ZERO or NEGATIVE batches\n');
    
    const allDetails = await ProductDetailsDailySummary.find({
      companyId: companyId,
      date: today
    }).populate('productId', 'name code').lean();
    
    console.log(`Total records: ${allDetails.length}\n`);
    
    const zeroProductionFinal = allDetails.filter(d => !d.productionFinalBatches || d.productionFinalBatches <= 0);
    const zeroBatchAdjusted = allDetails.filter(d => !d.batchAdjusted || d.batchAdjusted <= 0);
    
    console.log(`❌ Items with productionFinalBatches = 0: ${zeroProductionFinal.length}`);
    if (zeroProductionFinal.length > 0) {
      zeroProductionFinal.forEach(item => {
        console.log(`   • ${item.productId?.name || 'Unknown'} - productionFinalBatches: ${item.productionFinalBatches || 0}`);
      });
    }
    console.log('');
    
    console.log(`❌ Items with batchAdjusted = 0: ${zeroBatchAdjusted.length}`);
    if (zeroBatchAdjusted.length > 0) {
      zeroBatchAdjusted.forEach(item => {
        console.log(`   • ${item.productId?.name || 'Unknown'} - batchAdjusted: ${item.batchAdjusted || 0}`);
      });
    }
    console.log('');
    
    // Check 2: ProductionBatch - Check for approved batches
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Check 2: ProductionBatch (Approved Batches) Status\n');
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const allBatches = await ProductionBatch.find({
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow }
    }).populate('itemId', 'name code').lean();
    
    console.log(`Total ProductionBatch records for today: ${allBatches.length}\n`);
    
    if (allBatches.length === 0) {
      console.log('⚠️  WARNING: NO ProductionBatch records found!');
      console.log('   This means the BUILD/APPROVE process has NOT been run yet.\n');
      console.log('   ProductDetailsDailySummary has data but no approved batches exist in ProductionBatch.\n');
    } else {
      const zeroQtyBatches = allBatches.filter(b => !b.qtyPerBatch || b.qtyPerBatch <= 0);
      
      console.log(`❌ Approved batches with qtyPerBatch = 0: ${zeroQtyBatches.length}`);
      if (zeroQtyBatches.length > 0) {
        zeroQtyBatches.forEach(batch => {
          console.log(`   • ${batch.itemId?.name || 'Unknown'} (${batch.batchNo}) - qtyPerBatch: ${batch.qtyPerBatch || 0}`);
        });
      }
      console.log('');
      
      // Show batch status breakdown
      const statusBreakdown = allBatches.reduce((acc, batch) => {
        acc[batch.status || 'unknown'] = (acc[batch.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Batch Status Breakdown:');
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log('');
    }
    
    // Check 3: Compare ProductDetailsDailySummary vs ProductionBatch
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Check 3: Data Sync between Tables\n');
    
    // Get production groups
    const groups = await ProductionGroup.find({
      company: companyId,
      isActive: true
    }).select('items').lean();
    
    const assignedItemIds = groups.flatMap(g => g.items.map(i => i.toString()));
    
    // Find ungrouped items in ProductDetailsDailySummary
    const ungroupedInDetails = allDetails.filter(d => 
      d.productId && !assignedItemIds.includes(d.productId._id.toString())
    );
    
    console.log(`Ungrouped items in ProductDetailsDailySummary: ${ungroupedInDetails.length}`);
    ungroupedInDetails.forEach(item => {
      console.log(`   • ${item.productId?.name || 'Unknown'}`);
      console.log(`     productionFinalBatches: ${item.productionFinalBatches || 0}`);
      console.log(`     batchAdjusted: ${item.batchAdjusted || 0}`);
    });
    console.log('');
    
    // Find ungrouped items in ProductionBatch
    const ungroupedInBatch = allBatches.filter(b => !b.groupId);
    
    console.log(`Ungrouped items in ProductionBatch: ${ungroupedInBatch.length}`);
    ungroupedInBatch.forEach(batch => {
      console.log(`   • ${batch.itemId?.name || 'Unknown'} (${batch.batchNo})`);
      console.log(`     qtyPerBatch: ${batch.qtyPerBatch || 0}`);
      console.log(`     status: ${batch.status}`);
    });
    console.log('');
    
    // Check 4: Root Cause Analysis
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🎯 ROOT CAUSE ANALYSIS:\n');
    
    if (allBatches.length === 0 && ungroupedInDetails.length > 0) {
      console.log('❌ ISSUE FOUND:');
      console.log(`   • ProductDetailsDailySummary has ${ungroupedInDetails.length} ungrouped items`);
      console.log('   • ProductionBatch has 0 records (NOT APPROVED YET)');
      console.log('');
      console.log('📝 EXPLANATION:');
      console.log('   The /api/production/ungrouped-items endpoint shows 0 items because:');
      console.log('   1. It filters by productionFinalBatches > 0');
      console.log('   2. Items with productionFinalBatches = 0 are excluded');
      console.log('');
      console.log('✅ SOLUTION:');
      console.log('   You need to APPROVE/BUILD the production batches first!');
      console.log('   This will create entries in ProductionBatch table.');
      console.log('');
    } else if (ungroupedInBatch.length === 0 && ungroupedInDetails.length > 0) {
      console.log('⚠️  ISSUE FOUND:');
      console.log(`   • ProductDetailsDailySummary has ${ungroupedInDetails.length} ungrouped items`);
      console.log(`   • ProductionBatch has ${allBatches.length} records but 0 ungrouped`);
      console.log('');
      console.log('📝 EXPLANATION:');
      console.log('   All batches are assigned to groups. No ungrouped batches approved.');
      console.log('');
    } else {
      console.log('✅ Data looks synchronized between tables.');
      console.log(`   • Ungrouped in ProductDetailsDailySummary: ${ungroupedInDetails.length}`);
      console.log(`   • Ungrouped in ProductionBatch: ${ungroupedInBatch.length}`);
    }
    
    // Check if items with 0 batches should be shown
    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('🔍 Should items with 0 batches be shown?\n');
    
    const itemsWith0Batches = ungroupedInDetails.filter(d => 
      (!d.productionFinalBatches || d.productionFinalBatches === 0)
    );
    
    if (itemsWith0Batches.length > 0) {
      console.log(`Found ${itemsWith0Batches.length} ungrouped items with 0 batches:`);
      itemsWith0Batches.forEach(item => {
        console.log(`   • ${item.productId?.name || 'Unknown'}`);
      });
      console.log('');
      console.log('❓ QUESTION: Should these be shown in the ungrouped-items API?');
      console.log('   Current behavior: NO (filtered out by productionFinalBatches > 0)');
      console.log('   If you want to show them: Remove or modify the filter in the code');
    } else {
      console.log('✅ All ungrouped items have batches > 0');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkApprovalIssues();
