/**
 * Migration script to fix UngroupedItemProduction collection:
 * 1. Add batchNumber: 1 to existing documents
 * 2. Drop the old index
 * 3. Keep the new batch-aware index
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUngroupedItems() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('ungroupeditemproductions');

    // Step 1: Add batchNumber: 1 to documents that don't have it
    console.log('\nStep 1: Adding batchNumber to existing documents...');
    const updateResult = await collection.updateMany(
      { batchNumber: { $exists: false } },
      { $set: { batchNumber: 1 } }
    );
    console.log(`Updated ${updateResult.modifiedCount} documents with batchNumber: 1`);

    // Step 2: Drop the old index
    console.log('\nStep 2: Dropping old index...');
    try {
      await collection.dropIndex('companyId_1_itemId_1_productionDate_1');
      console.log('Successfully dropped old index: companyId_1_itemId_1_productionDate_1');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('Old index not found (already dropped)');
      } else {
        console.log('Error dropping old index:', error.message);
      }
    }

    // Step 3: Verify the new index exists
    console.log('\nStep 3: Verifying new index...');
    const indexes = await collection.listIndexes().toArray();
    const batchIndex = indexes.find(idx => idx.name === 'companyId_1_itemId_1_batchNumber_1_productionDate_1');
    if (batchIndex) {
      console.log('✓ New batch-aware index exists and is working');
    } else {
      console.log('⚠ Creating new batch-aware index...');
      await collection.createIndex(
        { 
          companyId: 1, 
          itemId: 1, 
          batchNumber: 1, 
          productionDate: 1 
        }, 
        { unique: true }
      );
      console.log('✓ New batch-aware index created');
    }

    // Step 4: Final verification
    console.log('\nStep 4: Final verification...');
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('Final indexes:');
    finalIndexes.forEach(idx => {
      console.log(`- ${idx.name}:`, JSON.stringify(idx.key, null, 2));
      if (idx.unique) console.log('  (UNIQUE)');
    });

    const finalCount = await collection.countDocuments({ batchNumber: { $exists: false } });
    console.log(`\nDocuments without batchNumber: ${finalCount}`);
    
    if (finalCount === 0) {
      console.log('✓ All documents now have batchNumber');
    } else {
      console.log('⚠ Some documents still missing batchNumber');
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateUngroupedItems();