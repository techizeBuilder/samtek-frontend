import mongoose from 'mongoose';

// Production Batch Schema
const ProductionBatchSchema = new mongoose.Schema({
  itemId: mongoose.Schema.Types.ObjectId,
  groupId: mongoose.Schema.Types.ObjectId,
  batchNo: String,
  batchNumber: Number,
  qtyPerBatch: Number,
  qtyAchieved: Number,
  totalBatchAdjusted: Number,
  productionLoss: Number,
  status: String,
  productionDate: Date,
  companyId: mongoose.Schema.Types.ObjectId,
  combinedItems: Array,
  mouldingTime: Date,
  unloadingTime: Date,
  createdBy: String,
  updatedBy: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'productionbatches' });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);

async function cleanupDuplicateBatches() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manufacturing-erp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    console.log('🧹 CLEANING UP DUPLICATE PRODUCTION BATCHES\n');
    console.log('═'.repeat(80));
    
    // Get all batches
    const allBatches = await ProductionBatch.find({}).sort({ batchNo: 1, createdAt: 1 });
    
    console.log(`📊 Total batches in database: ${allBatches.length}\n`);
    
    // Group by batchNo + companyId + productionDate (logical unique key)
    const batchGroups = new Map();
    
    allBatches.forEach(batch => {
      const dateStr = batch.productionDate.toISOString().split('T')[0]; // Just date part
      const key = `${batch.batchNo}|${batch.companyId}|${dateStr}`;
      
      if (!batchGroups.has(key)) {
        batchGroups.set(key, []);
      }
      batchGroups.get(key).push(batch);
    });
    
    console.log(`📊 Unique batch groups (by batchNo + company + date): ${batchGroups.size}\n`);
    
    // Find duplicates
    const duplicateGroups = [];
    for (const [key, batches] of batchGroups.entries()) {
      if (batches.length > 1) {
        duplicateGroups.push({ key, batches });
      }
    }
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found! Database is clean.\n');
      return;
    }
    
    console.log(`⚠️  Found ${duplicateGroups.length} groups with duplicates:\n`);
    
    let totalDuplicates = 0;
    let toDelete = [];
    
    for (const group of duplicateGroups) {
      const [batchNo, companyId, dateStr] = group.key.split('|');
      console.log(`🔴 ${batchNo} (${dateStr}) - ${group.batches.length} duplicates`);
      
      // Sort by:
      // 1. Has mouldingTime (keep records with data)
      // 2. Has unloadingTime
      // 3. Latest createdAt
      group.batches.sort((a, b) => {
        // Prioritize records with moulding time
        if (a.mouldingTime && !b.mouldingTime) return -1;
        if (!a.mouldingTime && b.mouldingTime) return 1;
        
        // Then by unloading time
        if (a.unloadingTime && !b.unloadingTime) return -1;
        if (!a.unloadingTime && b.unloadingTime) return 1;
        
        // Then by status (completed > in_progress > pending)
        const statusOrder = { completed: 0, in_progress: 1, pending: 2 };
        const aOrder = statusOrder[a.status] ?? 99;
        const bOrder = statusOrder[b.status] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Finally by creation date (keep oldest)
        return a.createdAt - b.createdAt;
      });
      
      // Keep the first (best) record, mark others for deletion
      const keepRecord = group.batches[0];
      const deleteRecords = group.batches.slice(1);
      
      console.log(`   ✅ KEEP: ${keepRecord._id} (created: ${keepRecord.createdAt}, status: ${keepRecord.status}, has moulding: ${!!keepRecord.mouldingTime})`);
      
      deleteRecords.forEach(record => {
        console.log(`   ❌ DELETE: ${record._id} (created: ${record.createdAt}, status: ${record.status}, has moulding: ${!!record.mouldingTime})`);
        toDelete.push(record._id);
      });
      
      totalDuplicates += deleteRecords.length;
      console.log('');
    }
    
    console.log('═'.repeat(80));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total duplicate records to delete: ${totalDuplicates}`);
    console.log(`   Records to keep: ${duplicateGroups.length}`);
    console.log('═'.repeat(80));
    
    // Ask for confirmation (simulate with a flag)
    const DRY_RUN = false; // Set to false to actually delete
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN MODE - No records will be deleted');
      console.log('   Set DRY_RUN = false in the script to actually delete duplicates\n');
    } else {
      console.log('\n⚠️  PROCEEDING WITH DELETION...\n');
      
      if (toDelete.length > 0) {
        const deleteResult = await ProductionBatch.deleteMany({
          _id: { $in: toDelete }
        });
        
        console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate records\n`);
      } else {
        console.log('✅ No records to delete\n');
      }
    }
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...\n');
    
    const remainingBatches = await ProductionBatch.find({});
    const remainingGroups = new Map();
    
    remainingBatches.forEach(batch => {
      const dateStr = batch.productionDate.toISOString().split('T')[0];
      const key = `${batch.batchNo}|${batch.companyId}|${dateStr}`;
      
      if (!remainingGroups.has(key)) {
        remainingGroups.set(key, 0);
      }
      remainingGroups.set(key, remainingGroups.get(key) + 1);
    });
    
    let stillHasDuplicates = false;
    for (const [key, count] of remainingGroups.entries()) {
      if (count > 1) {
        console.log(`⚠️  Still has ${count} duplicates: ${key}`);
        stillHasDuplicates = true;
      }
    }
    
    if (!stillHasDuplicates) {
      console.log('✅ All duplicates cleaned up successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

cleanupDuplicateBatches();
