import mongoose from 'mongoose';

// Define ProductionBatch schema
const ProductionBatchSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionGroup' },
  batchNo: String,
  qtyPlanned: Number,
  qtyAchieved: Number,
  qtyPerBatch: Number,
  batchWeight: Number,
  productionLoss: Number,
  status: String,
  productionDate: Date,
  isGrouped: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  shiftId: mongoose.Schema.Types.ObjectId,
  companyId: mongoose.Schema.Types.ObjectId,
  mouldingTime: Date,
  unloadingTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'productionbatches' });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);

async function checkProductionBatchDuplicatesToday() {
  try {
    // Connect to database (from .env)
    const MONGODB_URI = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manufacturing-erp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    console.log('🔍 Checking for duplicate entries in productionbatches collection (Today)...\n');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Date Range:', today.toLocaleString(), 'to', tomorrow.toLocaleString());
    console.log('');

    // Get all production batches created today
    const todayBatches = await ProductionBatch.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ batchNo: 1, createdAt: -1 });

    console.log(`📊 Total entries created today: ${todayBatches.length}\n`);

    if (todayBatches.length === 0) {
      console.log('✅ No entries found for today');
      return;
    }

    // Group by batchNo to find duplicates
    const batchGroups = {};
    todayBatches.forEach(batch => {
      if (!batchGroups[batch.batchNo]) {
        batchGroups[batch.batchNo] = [];
      }
      batchGroups[batch.batchNo].push(batch);
    });

    // Find duplicates
    const duplicates = Object.entries(batchGroups).filter(([batchNo, batches]) => batches.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate batch numbers found for today');
      console.log('\n📋 All unique batches:');
      Object.keys(batchGroups).forEach(batchNo => {
        console.log(`   - ${batchNo}`);
      });
    } else {
      console.log(`⚠️  Found ${duplicates.length} duplicate batch numbers:\n`);
      
      duplicates.forEach(([batchNo, batches]) => {
        console.log(`🔴 BATCH NO: ${batchNo} (${batches.length} entries)`);
        console.log('─'.repeat(80));
        
        batches.forEach((batch, index) => {
          console.log(`\n  Entry #${index + 1}:`);
          console.log(`    ID: ${batch._id}`);
          console.log(`    Batch No: ${batch.batchNo}`);
          console.log(`    Item ID: ${batch.itemId}`);
          console.log(`    Production Loss: ${batch.productionLoss}`);
          console.log(`    Qty Per Batch: ${batch.qtyPerBatch}`);
          console.log(`    Batch Weight: ${batch.batchWeight}`);
          console.log(`    Qty Planned: ${batch.qtyPlanned}`);
          console.log(`    Qty Achieved: ${batch.qtyAchieved}`);
          console.log(`    Grouped: ${batch.isGrouped}`);
          console.log(`    Group ID: ${batch.groupId}`);
          console.log(`    Approved: ${batch.isApproved}`);
          console.log(`    Status: ${batch.status}`);
          console.log(`    Created At: ${batch.createdAt}`);
          console.log(`    Updated At: ${batch.updatedAt}`);
        });
        
        console.log('\n' + '='.repeat(80) + '\n');
      });

      // Summary
      console.log('\n📊 SUMMARY:');
      console.log(`   Total duplicate sets: ${duplicates.length}`);
      console.log(`   Total duplicate entries: ${duplicates.reduce((sum, [, batches]) => sum + batches.length, 0)}`);
      console.log(`   Extra entries (to be cleaned): ${duplicates.reduce((sum, [, batches]) => sum + batches.length - 1, 0)}`);
    }

    // Check for ungrouped items
    console.log('\n\n🔍 Checking ungrouped items from today...\n');
    const ungrouped = todayBatches.filter(b => !b.isGrouped);
    
    console.log(`📊 Ungrouped items: ${ungrouped.length}`);
    
    if (ungrouped.length > 0) {
      console.log('\nUngrouped Batches:');
      ungrouped.forEach(batch => {
        console.log(`  - ${batch.batchNo} (ID: ${batch._id}, ItemID: ${batch.itemId}, Approved: ${batch.isApproved})`);
      });
    }

    // Check for approved items
    console.log('\n\n🔍 Checking approved items from today...\n');
    const approved = todayBatches.filter(b => b.isApproved);
    
    console.log(`📊 Approved items: ${approved.length}`);
    
    if (approved.length > 0) {
      console.log('\nApproved Batches:');
      approved.forEach(batch => {
        console.log(`  - ${batch.batchNo} (ID: ${batch._id}, ItemID: ${batch.itemId}, Grouped: ${batch.isGrouped})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

checkProductionBatchDuplicatesToday();
