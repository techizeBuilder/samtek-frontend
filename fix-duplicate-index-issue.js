// Fix duplicate index issue - Drop old index and keep only the correct one
import mongoose from 'mongoose';
import UngroupedItemProduction from './server/models/UngroupedItemProduction.js';
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

async function fixDuplicateIndexIssue() {
  try {
    console.log('🔧 Starting index fix for UngroupedItemProduction...');
    
    // Connect to database
    await connectDB();
    
    // Get the collection
    const collection = UngroupedItemProduction.collection;
    
    // List all current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Find and drop the problematic old index
    const problematicIndexName = 'companyId_1_itemId_1_productionDate_1';
    
    try {
      console.log(`\n🗑️  Attempting to drop problematic index: ${problematicIndexName}`);
      await collection.dropIndex(problematicIndexName);
      console.log(`✅ Successfully dropped index: ${problematicIndexName}`);
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log(`ℹ️  Index ${problematicIndexName} not found (already removed)`);
      } else {
        console.error(`❌ Error dropping index: ${error.message}`);
      }
    }
    
    // Also try alternative names
    const alternativeNames = [
      'companyId_1_itemId_1_productionDate_1_dup_key',
      'companyId_itemId_productionDate_1',
      'itemId_1_companyId_1_productionDate_1'
    ];
    
    for (const indexName of alternativeNames) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Successfully dropped alternative index: ${indexName}`);
      } catch (error) {
        // Silently ignore if index doesn't exist
      }
    }
    
    // Drop any index that has the problematic combination
    console.log('\n🔍 Checking for indexes with itemId + companyId + productionDate...');
    const currentIndexes = await collection.listIndexes().toArray();
    
    for (const index of currentIndexes) {
      const keys = Object.keys(index.key);
      if (keys.includes('itemId') && keys.includes('companyId') && keys.includes('productionDate') && !keys.includes('batchNo')) {
        try {
          console.log(`🗑️  Dropping problematic index: ${index.name}`);
          await collection.dropIndex(index.name);
          console.log(`✅ Successfully dropped: ${index.name}`);
        } catch (error) {
          console.error(`❌ Error dropping ${index.name}: ${error.message}`);
        }
      }
    }
    
    // Ensure the correct index exists
    console.log('\n🔧 Ensuring correct index exists...');
    try {
      await collection.createIndex(
        { companyId: 1, batchNo: 1, productionDate: 1 },
        { unique: true, name: 'companyId_1_batchNo_1_productionDate_1' }
      );
      console.log('✅ Correct index created: companyId_1_batchNo_1_productionDate_1');
    } catch (error) {
      if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Correct index already exists');
      } else {
        console.error('❌ Error creating correct index:', error.message);
      }
    }
    
    // List final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.listIndexes().toArray();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`    (UNIQUE)`);
      }
    });
    
    console.log('\n🎉 Index fix completed successfully!');
    console.log('✅ Now you can create multiple batches for the same item on the same date');
    
  } catch (error) {
    console.error('💥 Index fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  }
}

// Run the fix
fixDuplicateIndexIssue();