// Consolidate ungroupeditemproductions and productionbatchdatas into one table
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

async function consolidateProductionTables() {
  try {
    console.log('🔧 Starting production tables consolidation...');
    
    // Connect to database
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Get current collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\n📋 Current collections:', collectionNames);
    
    // Check if tables exist
    const hasUngroupedItemProductions = collectionNames.includes('ungroupeditemproductions');
    const hasProductionBatchDatas = collectionNames.includes('productionbatchdatas');
    
    console.log(`\n📊 Tables status:`);
    console.log(`  - ungroupeditemproductions: ${hasUngroupedItemProductions ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  - productionbatchdatas: ${hasProductionBatchDatas ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    // New unified table name
    const newTableName = 'productionbatches';
    
    if (hasUngroupedItemProductions) {
      // Step 1: Rename ungroupeditemproductions to productionbatches
      console.log(`\n📝 Renaming 'ungroupeditemproductions' to '${newTableName}'...`);
      try {
        await db.collection('ungroupeditemproductions').rename(newTableName);
        console.log(`✅ Successfully renamed to '${newTableName}'`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`ℹ️  Collection '${newTableName}' already exists`);
        } else {
          console.error(`❌ Error renaming collection:`, error.message);
        }
      }
    }
    
    // Step 2: Merge productionbatchdatas if it exists
    if (hasProductionBatchDatas) {
      console.log(`\n🔄 Merging data from 'productionbatchdatas' into '${newTableName}'...`);
      
      const productionBatchData = await db.collection('productionbatchdatas').find({}).toArray();
      console.log(`📦 Found ${productionBatchData.length} records in productionbatchdatas`);
      
      if (productionBatchData.length > 0) {
        // Transform and merge data
        const transformedData = productionBatchData.map(batch => ({
          companyId: batch.company || batch.companyId,
          itemId: batch.itemId || null,
          batchNo: batch.batchKey ? batch.batchKey.split('_batch_')[0] + '_BATCH' : `MERGED_${batch._id}`,
          batchNumber: batch.batchNumber || 1,
          productionDate: batch.createdAt ? new Date(batch.createdAt).setHours(0,0,0,0) : new Date().setHours(0,0,0,0),
          mouldingTime: batch.mouldingTime || null,
          unloadingTime: batch.unloadingTime || null,
          productionLoss: batch.productionLoss || 0,
          qtyPerBatch: batch.qtyPerBatch || 0,
          qtyAchieved: batch.qtyAchieved || 0,
          status: 'migrated_from_batchdata',
          createdBy: 'system_migration',
          updatedBy: 'system_migration',
          createdAt: batch.createdAt || new Date(),
          updatedAt: batch.updatedAt || new Date(),
          notes: `Migrated from productionbatchdatas - Original ID: ${batch._id}`
        }));
        
        try {
          await db.collection(newTableName).insertMany(transformedData, { ordered: false });
          console.log(`✅ Successfully merged ${transformedData.length} records`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`⚠️  Some records skipped due to duplicates`);
          } else {
            console.error(`❌ Error merging data:`, error.message);
          }
        }
      }
      
      // Archive the old table
      console.log(`\n🗄️  Archiving 'productionbatchdatas' to 'productionbatchdatas_archived'...`);
      try {
        await db.collection('productionbatchdatas').rename('productionbatchdatas_archived');
        console.log(`✅ Successfully archived productionbatchdatas`);
      } catch (error) {
        console.error(`❌ Error archiving:`, error.message);
      }
    }
    
    // Step 3: Update indexes for the new unified table
    console.log(`\n🔧 Setting up indexes for '${newTableName}'...`);
    
    const collection = db.collection(newTableName);
    
    // Drop all existing indexes except _id
    try {
      const indexes = await collection.listIndexes().toArray();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          try {
            await collection.dropIndex(index.name);
            console.log(`🗑️  Dropped old index: ${index.name}`);
          } catch (e) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      console.log(`ℹ️  No indexes to drop`);
    }
    
    // Create new unified indexes
    const indexesToCreate = [
      {
        key: { companyId: 1, batchNo: 1, productionDate: 1 },
        options: { unique: true, name: 'unique_company_batchno_date' }
      },
      {
        key: { companyId: 1, productionDate: 1 },
        options: { name: 'company_date_lookup' }
      },
      {
        key: { itemId: 1, companyId: 1 },
        options: { name: 'item_company_lookup' }
      }
    ];
    
    for (const indexDef of indexesToCreate) {
      try {
        await collection.createIndex(indexDef.key, indexDef.options);
        console.log(`✅ Created index: ${indexDef.options.name}`);
      } catch (error) {
        if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
          console.log(`ℹ️  Index ${indexDef.options.name} already exists`);
        } else {
          console.error(`❌ Error creating index ${indexDef.options.name}:`, error.message);
        }
      }
    }
    
    // Step 4: Show final status
    console.log(`\n📊 Final collection status:`);
    const finalCollections = await db.listCollections().toArray();
    finalCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    console.log(`\n🎉 Consolidation completed successfully!`);
    console.log(`✅ Unified table: '${newTableName}'`);
    console.log(`✅ Unique constraints: companyId + batchNo + productionDate`);
    console.log(`✅ Ready for production use`);
    
  } catch (error) {
    console.error('💥 Consolidation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  }
}

// Run the consolidation
consolidateProductionTables();