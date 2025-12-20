import mongoose from 'mongoose';
import connectDB from './server/config/database.js';

async function cleanupDispatchCollection() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');

    const db = mongoose.connection.db;
    const dispatchCollection = db.collection('dispatches');
    
    // Get current indexes
    console.log('📋 Current indexes:');
    const indexes = await dispatchCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
    });

    // Drop problematic indexes
    try {
      await dispatchCollection.dropIndex('dispatchNumber_1');
      console.log('✅ Dropped dispatchNumber_1 index');
    } catch (error) {
      console.log('ℹ️ dispatchNumber_1 index not found or already dropped');
    }

    try {
      await dispatchCollection.dropIndex('packingSheetId_1_productId_1_date_1');
      console.log('✅ Dropped unique constraint index');
    } catch (error) {
      console.log('ℹ️ Unique constraint index not found');
    }

    // Remove duplicate dispatch entries
    console.log('🧹 Cleaning duplicate dispatch entries...');
    
    const duplicates = await dispatchCollection.aggregate([
      {
        $group: {
          _id: {
            packingSheetId: '$packingSheetId',
            productId: '$productId',
            date: '$date'
          },
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    console.log(`Found ${duplicates.length} duplicate groups`);

    for (const duplicate of duplicates) {
      // Keep the first document, delete the rest
      const docsToDelete = duplicate.docs.slice(1);
      if (docsToDelete.length > 0) {
        await dispatchCollection.deleteMany({ _id: { $in: docsToDelete } });
        console.log(`🗑️ Deleted ${docsToDelete.length} duplicate entries for group:`, duplicate._id);
      }
    }

    // Recreate proper indexes
    console.log('🔧 Creating new indexes...');
    
    await dispatchCollection.createIndex({ packingSheetId: 1, productId: 1, date: 1 });
    console.log('✅ Created compound index: packingSheetId + productId + date');
    
    await dispatchCollection.createIndex({ company: 1, date: 1 });
    console.log('✅ Created index: company + date');
    
    await dispatchCollection.createIndex({ productGroup: 1, date: 1 });
    console.log('✅ Created index: productGroup + date');

    console.log('✅ Database cleanup completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDispatchCollection();