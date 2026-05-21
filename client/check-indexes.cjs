/**
 * Check indexes on ungroupeditemproductions collection
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('ungroupeditemproductions');

    console.log('Getting existing indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:');
    indexes.forEach(idx => {
      console.log(`- ${idx.name}:`, JSON.stringify(idx.key, null, 2));
      if (idx.unique) {
        console.log('  (UNIQUE)');
      }
    });

    // Get a sample document to see current structure
    console.log('\nSample document structure:');
    const sample = await collection.findOne();
    console.log(JSON.stringify(sample, null, 2));

    // Check how many documents don't have batchNumber
    const withoutBatch = await collection.countDocuments({ batchNumber: { $exists: false } });
    const withBatch = await collection.countDocuments({ batchNumber: { $exists: true } });
    
    console.log(`\nBatch number status:`);
    console.log(`- Documents without batchNumber: ${withoutBatch}`);
    console.log(`- Documents with batchNumber: ${withBatch}`);

  } catch (error) {
    console.error('Index check error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

checkIndexes();