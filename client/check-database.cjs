/**
 * Check what collections exist in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('Existing collections:');
    collections.forEach(col => {
      console.log(' -', col.name);
    });

    // Check if there are any production-related collections
    const productionCollections = collections.filter(col => 
      col.name.toLowerCase().includes('production') || 
      col.name.toLowerCase().includes('ungrouped')
    );
    
    if (productionCollections.length > 0) {
      console.log('\nProduction-related collections:');
      for (const col of productionCollections) {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments();
        console.log(` - ${col.name}: ${count} documents`);
        
        if (count > 0) {
          const sample = await collection.findOne();
          console.log(`   Sample document:`, JSON.stringify(sample, null, 2));
        }
      }
    }

  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

checkDatabase();