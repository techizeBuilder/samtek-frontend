import mongoose from 'mongoose';

// Define schemas
const ProductionBatchSchema = new mongoose.Schema({
  itemId: mongoose.Schema.Types.ObjectId,
  groupId: mongoose.Schema.Types.ObjectId,
  batchNo: String,
  batchNumber: Number,
  qtyPlanned: Number,
  qtyAchieved: Number,
  qtyPerBatch: Number,
  batchWeight: Number,
  totalBatchAdjusted: Number,
  productionLoss: Number,
  status: String,
  productionDate: Date,
  isGrouped: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  shiftId: mongoose.Schema.Types.ObjectId,
  companyId: mongoose.Schema.Types.ObjectId,
  combinedItems: [{
    itemId: mongoose.Schema.Types.ObjectId,
    DailyProductionId: mongoose.Schema.Types.ObjectId,
    batchAdjustedValue: Number,
    qtyContribution: Number
  }],
  mouldingTime: Date,
  unloadingTime: Date,
  approvedBy: String,
  createdBy: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'productionbatches' });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);

async function testDuplicateBatchCreation() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manufacturing-erp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    console.log('🧪 Testing duplicate batch creation scenario...\n');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Testing for date:', today.toDateString());
    console.log('');
    
    // Scenario 1: Check for duplicate batch numbers
    console.log('═'.repeat(80));
    console.log('📊 SCENARIO 1: Checking for duplicate batch numbers created today');
    console.log('═'.repeat(80) + '\n');
    
    const allBatchesToday = await ProductionBatch.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ batchNo: 1, createdAt: 1 });
    
    console.log(`Total batches created today: ${allBatchesToday.length}\n`);
    
    // Group by batchNo
    const batchNumberMap = new Map();
    allBatchesToday.forEach(batch => {
      if (!batchNumberMap.has(batch.batchNo)) {
        batchNumberMap.set(batch.batchNo, []);
      }
      batchNumberMap.get(batch.batchNo).push(batch);
    });
    
    let duplicatesFound = 0;
    for (const [batchNo, batches] of batchNumberMap.entries()) {
      if (batches.length > 1) {
        duplicatesFound++;
        console.log(`🔴 DUPLICATE FOUND: ${batchNo}`);
        console.log(`   Total entries: ${batches.length}`);
        batches.forEach((batch, idx) => {
          console.log(`   Entry ${idx + 1}:`);
          console.log(`     - ID: ${batch._id}`);
          console.log(`     - Created: ${batch.createdAt}`);
          console.log(`     - GroupID: ${batch.groupId}`);
          console.log(`     - ItemID: ${batch.itemId}`);
          console.log(`     - Combined Items: ${batch.combinedItems?.length || 0}`);
          console.log(`     - Status: ${batch.status}`);
          console.log(`     - Approved: ${batch.isApproved}`);
          console.log(`     - Grouped: ${batch.isGrouped}`);
        });
        console.log('');
      }
    }
    
    if (duplicatesFound === 0) {
      console.log('✅ No duplicate batch numbers found\n');
    } else {
      console.log(`⚠️  Found ${duplicatesFound} sets of duplicate batch numbers\n`);
    }
    
    // Scenario 2: Check batches by groupId
    console.log('═'.repeat(80));
    console.log('📊 SCENARIO 2: Checking batches by production group');
    console.log('═'.repeat(80) + '\n');
    
    const batchesByGroup = new Map();
    allBatchesToday.forEach(batch => {
      const groupKey = batch.groupId ? batch.groupId.toString() : 'ungrouped';
      if (!batchesByGroup.has(groupKey)) {
        batchesByGroup.set(groupKey, []);
      }
      batchesByGroup.get(groupKey).push(batch);
    });
    
    console.log(`Total groups/ungrouped: ${batchesByGroup.size}\n`);
    
    for (const [groupKey, batches] of batchesByGroup.entries()) {
      if (groupKey === 'ungrouped') {
        console.log(`📦 Ungrouped batches: ${batches.length}`);
      } else {
        console.log(`📦 Group ${groupKey}: ${batches.length} batches`);
        
        // Check for duplicate batch numbers within same group
        const groupBatchNos = new Map();
        batches.forEach(batch => {
          if (!groupBatchNos.has(batch.batchNo)) {
            groupBatchNos.set(batch.batchNo, []);
          }
          groupBatchNos.get(batch.batchNo).push(batch);
        });
        
        for (const [batchNo, groupBatches] of groupBatchNos.entries()) {
          if (groupBatches.length > 1) {
            console.log(`   ⚠️  ${batchNo}: ${groupBatches.length} duplicates in same group!`);
          } else {
            console.log(`   ✅ ${batchNo}: 1 batch`);
          }
        }
      }
      console.log('');
    }
    
    // Scenario 3: Check timing - batches created within seconds of each other
    console.log('═'.repeat(80));
    console.log('📊 SCENARIO 3: Checking for batches created in rapid succession');
    console.log('═'.repeat(80) + '\n');
    
    // Sort all batches by creation time
    const sortedByTime = [...allBatchesToday].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    let rapidCreations = [];
    for (let i = 1; i < sortedByTime.length; i++) {
      const prev = sortedByTime[i - 1];
      const curr = sortedByTime[i];
      const timeDiff = curr.createdAt.getTime() - prev.createdAt.getTime();
      
      // If batches created within 5 seconds of each other
      if (timeDiff < 5000) {
        rapidCreations.push({
          batch1: prev.batchNo,
          batch2: curr.batchNo,
          timeDiffMs: timeDiff,
          sameGroup: prev.groupId?.toString() === curr.groupId?.toString()
        });
      }
    }
    
    if (rapidCreations.length > 0) {
      console.log(`⚠️  Found ${rapidCreations.length} pairs of batches created within 5 seconds:\n`);
      rapidCreations.forEach(rapid => {
        console.log(`   ${rapid.batch1} → ${rapid.batch2}: ${rapid.timeDiffMs}ms apart (Same group: ${rapid.sameGroup})`);
      });
    } else {
      console.log('✅ No rapid batch creations detected\n');
    }
    
    // Scenario 4: Final summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total batches created today: ${allBatchesToday.length}`);
    console.log(`Unique batch numbers: ${batchNumberMap.size}`);
    console.log(`Duplicate batch number sets: ${duplicatesFound}`);
    console.log(`Groups with batches: ${batchesByGroup.size - (batchesByGroup.has('ungrouped') ? 1 : 0)}`);
    console.log(`Ungrouped batches: ${batchesByGroup.get('ungrouped')?.length || 0}`);
    console.log(`Rapid creation pairs: ${rapidCreations.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

testDuplicateBatchCreation();
