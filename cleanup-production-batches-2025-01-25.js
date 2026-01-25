import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manufacturing-erp';
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Delete all ProductionBatch records for 2026-01-25
const cleanupBatches = async () => {
  try {
    // Set date range for 2026-01-25
    const targetDate = new Date('2026-01-25');
    targetDate.setUTCHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    console.log(`\n🗑️ Deleting ProductionBatch records for date: ${targetDate.toISOString()}`);
    console.log(`   Date range: ${targetDate.toISOString()} to ${nextDate.toISOString()}\n`);
    
    // Find and delete all batches for this date
    const result = await ProductionBatch.deleteMany({
      productionDate: {
        $gte: targetDate,
        $lt: nextDate
      }
    });
    
    console.log(`✅ DELETED: ${result.deletedCount} ProductionBatch records`);
    console.log(`\n📊 Deletion Summary:`);
    console.log(`   - Total deleted: ${result.deletedCount}`);
    console.log(`   - Date: 2026-01-25`);
    console.log(`   - Status: SUCCESS`);
    
    // Verify deletion
    const remaining = await ProductionBatch.countDocuments({
      productionDate: {
        $gte: targetDate,
        $lt: nextDate
      }
    });
    
    console.log(`\n✅ Verification: ${remaining} batches remaining for this date`);
    
    if (remaining === 0) {
      console.log(`\n🎉 CLEANUP COMPLETE - All records for 2026-01-25 have been deleted!`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ProductionBatch Cleanup Script - Date: 2026-01-25        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  await connectDB();
  await cleanupBatches();
  
  // Close connection
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  console.log('✅ Script completed successfully\n');
  
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
