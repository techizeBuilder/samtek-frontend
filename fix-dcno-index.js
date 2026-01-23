import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixDcnoIndex = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('dispatches');

    // Get all existing indexes
    console.log('\n📋 Checking existing indexes on dispatches collection...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Check if dcno_1 index exists
    const dcnoIndex = indexes.find(idx => idx.name === 'dcno_1');
    
    if (dcnoIndex) {
      console.log('\n🔍 Found dcno_1 index:', JSON.stringify(dcnoIndex, null, 2));
      
      // Check if it's unique
      if (dcnoIndex.unique) {
        console.log('\n⚠️  PROBLEM FOUND: dcno_1 is a UNIQUE index!');
        console.log('This prevents multiple NULL values in dcno field.');
        console.log('\n🔨 Dropping unique dcno_1 index...');
        
        await collection.dropIndex('dcno_1');
        console.log('✅ Dropped unique dcno_1 index');
        
        // Create a new NON-UNIQUE, SPARSE index
        console.log('\n📝 Creating new sparse (non-unique) index on dcno...');
        await collection.createIndex(
          { dcno: 1 }, 
          { 
            name: 'dcno_1',
            sparse: true,  // Allows multiple nulls
            unique: false  // NOT unique
          }
        );
        console.log('✅ Created new sparse index on dcno');
      } else if (!dcnoIndex.sparse) {
        console.log('\n⚠️  Index is not unique but also not sparse.');
        console.log('Recreating as sparse index...');
        
        await collection.dropIndex('dcno_1');
        console.log('✅ Dropped dcno_1 index');
        
        await collection.createIndex(
          { dcno: 1 }, 
          { 
            name: 'dcno_1',
            sparse: true,
            unique: false
          }
        );
        console.log('✅ Created new sparse index on dcno');
      } else {
        console.log('\n✅ Index is already correct (sparse and non-unique)');
      }
    } else {
      console.log('\n📝 No dcno_1 index found. Creating sparse index...');
      await collection.createIndex(
        { dcno: 1 }, 
        { 
          name: 'dcno_1',
          sparse: true,
          unique: false
        }
      );
      console.log('✅ Created new sparse index on dcno');
    }

    // Verify final state
    console.log('\n📋 Final indexes after fix:');
    const finalIndexes = await collection.indexes();
    const finalDcnoIndex = finalIndexes.find(idx => idx.name === 'dcno_1');
    console.log('dcno_1 index:', JSON.stringify(finalDcnoIndex, null, 2));

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Multiple NULL values in dcno field: ✅ ALLOWED');
    console.log('   - Unique dcno values: ❌ NOT ENFORCED (as intended)');
    console.log('   - Index type: SPARSE (ignores null values)');
    console.log('\n🎯 Packing approval will now work correctly with multiple null dcno values!');

  } catch (error) {
    console.error('❌ Error fixing dcno index:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

fixDcnoIndex();
