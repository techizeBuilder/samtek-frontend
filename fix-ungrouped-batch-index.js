#!/usr/bin/env node

/**
 * Fix UngroupedItemProduction index to allow same item with different batch numbers
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UngroupedItemProduction from './server/models/UngroupedItemProduction.js';

dotenv.config();

async function fixIndex() {
  try {
    console.log('🔧 Starting UngroupedItemProduction index fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.db.collection('ungroupeditemproductions');

    // Drop the old unique index that includes itemId
    try {
      console.log('🗑️ Dropping old unique index...');
      await collection.dropIndex({ companyId: 1, itemId: 1, batchNo: 1, productionDate: 1 });
      console.log('✅ Old index dropped successfully');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️ Old index not found - it may have already been dropped');
      } else {
        console.error('❌ Error dropping old index:', error.message);
        throw error;
      }
    }

    // Create the new unique index that doesn't include itemId
    console.log('🔨 Creating new unique index...');
    await collection.createIndex(
      { companyId: 1, batchNo: 1, productionDate: 1 }, 
      { unique: true, name: 'companyId_1_batchNo_1_productionDate_1' }
    );
    console.log('✅ New index created successfully');

    // List all indexes to verify
    console.log('📋 Current indexes:');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`    ✓ UNIQUE`);
    });

    console.log('🎉 Index fix completed successfully!');
    console.log('📖 New behavior:');
    console.log('   - Same item can have multiple batch numbers (BATNO01, BATNO02, etc.)');
    console.log('   - Each batch number is unique per company per day');
    console.log('   - This fixes the duplicate entry error');

  } catch (error) {
    console.error('❌ Error fixing index:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixIndex().catch(console.error);