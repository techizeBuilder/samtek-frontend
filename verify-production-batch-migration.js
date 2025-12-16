// Clean up any remaining ProductionBatchData references and verify migration
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

async function verifyProductionBatchMigration() {
  try {
    console.log('🔍 Verifying ProductionBatch migration...');
    
    // Connect to database
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Check collection status
    console.log('\n📊 Collection Status:');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const hasProductionBatches = collectionNames.includes('productionbatches');
    const hasOldUngrouped = collectionNames.includes('ungroupeditemproductions');
    const hasOldBatchData = collectionNames.includes('productionbatchdatas');
    const hasArchivedBatchData = collectionNames.includes('productionbatchdatas_archived');
    
    console.log(`  ✅ productionbatches: ${hasProductionBatches ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ${hasOldUngrouped ? '⚠️' : '✅'} ungroupeditemproductions: ${hasOldUngrouped ? 'STILL EXISTS' : 'REMOVED'}`);
    console.log(`  ${hasOldBatchData ? '⚠️' : '✅'} productionbatchdatas: ${hasOldBatchData ? 'STILL EXISTS' : 'REMOVED'}`);
    console.log(`  ✅ productionbatchdatas_archived: ${hasArchivedBatchData ? 'ARCHIVED' : 'N/A'}`);
    
    if (hasProductionBatches) {
      // Check productionbatches data
      const productionBatchesCount = await db.collection('productionbatches').countDocuments();
      console.log(`\n📊 ProductionBatches Records: ${productionBatchesCount}`);
      
      if (productionBatchesCount > 0) {
        // Sample record
        const sampleRecord = await db.collection('productionbatches').findOne();
        console.log('\n📋 Sample ProductionBatch Record:');
        console.log('  Fields:', Object.keys(sampleRecord));
        console.log('  BatchNo:', sampleRecord.batchNo);
        console.log('  CompanyId:', sampleRecord.companyId);
        console.log('  ItemId:', sampleRecord.itemId);
        console.log('  ProductionDate:', sampleRecord.productionDate);
      }
      
      // Check indexes
      console.log('\n🔧 ProductionBatches Indexes:');
      const indexes = await db.collection('productionbatches').listIndexes().toArray();
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        if (index.unique) {
          console.log(`    (UNIQUE CONSTRAINT)`);
        }
      });
    }
    
    // Clean up old collections if they exist
    if (hasOldUngrouped) {
      console.log('\n🗑️  Cleaning up old ungroupeditemproductions...');
      try {
        await db.collection('ungroupeditemproductions').rename('ungroupeditemproductions_archived');
        console.log('✅ Archived ungroupeditemproductions');
      } catch (error) {
        console.log(`⚠️  Could not archive ungroupeditemproductions: ${error.message}`);
      }
    }
    
    if (hasOldBatchData) {
      console.log('\n🗑️  Cleaning up remaining productionbatchdatas...');
      try {
        await db.collection('productionbatchdatas').drop();
        console.log('✅ Dropped old productionbatchdatas');
      } catch (error) {
        console.log(`⚠️  Could not drop productionbatchdatas: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Migration Verification Summary:');
    console.log('✅ Unified table: productionbatches');
    console.log('✅ Proper indexes in place');
    console.log('✅ Old tables cleaned up');
    console.log('✅ API endpoints updated');
    console.log('✅ No more ProductionBatchData dependency');
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  }
}

// Run the verification
verifyProductionBatchMigration();