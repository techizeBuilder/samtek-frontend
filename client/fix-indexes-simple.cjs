/**
 * Simple migration script to fix UngroupedItemProduction indexes
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('ungrouppeditemproductions');

    console.log('Getting existing indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the old index if it exists
    try {
      await collection.dropIndex('companyId_1_itemId_1_productionDate_1');
      console.log('Dropped old index: companyId_1_itemId_1_productionDate_1');
    } catch (error) {
      console.log('Old index not found or already dropped:', error.message);
    }

    // Create the new index
    try {
      await collection.createIndex(
        { 
          companyId: 1, 
          itemId: 1, 
          batchNumber: 1, 
          productionDate: 1 
        }, 
        { unique: true }
      );
      console.log('Created new index: companyId_1_itemId_1_batchNumber_1_productionDate_1');
    } catch (error) {
      console.log('Index creation error:', error.message);
    }

    console.log('Getting updated indexes...');
    const newIndexes = await collection.listIndexes().toArray();
    console.log('Updated indexes:', newIndexes.map(idx => idx.name));

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

fixIndexes();