// Fix database indexes - Drop old conflicting index
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manuerp';

async function fixDatabaseIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('ungroupeditemproductions');

    // Check existing indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Drop the problematic old index
    const oldIndexName = 'companyId_1_itemId_1_productionDate_1';
    
    try {
      console.log(`\n🗑️ Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('✅ Old index dropped successfully');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️ Old index not found (already dropped)');
      } else {
        console.error('❌ Error dropping old index:', error.message);
      }
    }

    // Ensure the new correct index exists
    const newIndexSpec = { companyId: 1, batchNo: 1, productionDate: 1 };
    const newIndexOptions = { 
      unique: true,
      name: 'companyId_1_batchNo_1_productionDate_1'
    };

    try {
      console.log('\n🆕 Creating new index: companyId_1_batchNo_1_productionDate_1');
      await collection.createIndex(newIndexSpec, newIndexOptions);
      console.log('✅ New index created successfully');
    } catch (error) {
      if (error.codeName === 'IndexOptionsConflict' || error.message.includes('already exists')) {
        console.log('ℹ️ New index already exists (good)');
      } else {
        console.error('❌ Error creating new index:', error.message);
      }
    }

    // Verify final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    console.log('\n✅ Index fix completed successfully!');
    console.log('🎯 Now your API should work with different batch numbers for the same item');

  } catch (error) {
    console.error('💥 Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the fix
fixDatabaseIndexes();