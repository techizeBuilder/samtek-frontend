import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixDCnoIndex = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('dispatches');

    console.log('\n📋 Current indexes on dispatches collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    // Check if dcno_1 unique index exists
    const dcnoIndex = indexes.find(idx => idx.name === 'dcno_1' && idx.unique === true);
    
    if (dcnoIndex) {
      console.log('\n⚠️  Found unique index on dcno field: dcno_1');
      console.log('   This index prevents multiple products from having the same DC number.');
      console.log('   Dropping this index...');
      
      await collection.dropIndex('dcno_1');
      console.log('✅ Dropped unique index: dcno_1');
      
      // Create non-unique index instead
      console.log('\n📌 Creating non-unique index on dcno...');
      await collection.createIndex({ dcno: 1 }, { name: 'dcno_1', sparse: true });
      console.log('✅ Created non-unique sparse index on dcno');
    } else {
      console.log('\n✅ No unique index found on dcno field. Database is correct.');
    }

    console.log('\n📋 Final indexes on dispatches collection:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    console.log('\n✅ DC number index fix completed successfully!');
    console.log('   Multiple products can now share the same DC number.');

  } catch (error) {
    console.error('❌ Error fixing DC number index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

fixDCnoIndex();
