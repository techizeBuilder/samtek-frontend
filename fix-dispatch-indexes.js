import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DispatchSchema = new mongoose.Schema({}, { strict: false, collection: 'dispatches' });
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const indexes = await Dispatch.collection.getIndexes();
    console.log('\n📋 Indexes on dispatches collection:\n');
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the problematic index
    console.log('\n🗑️  Dropping unique_packing_sheet_per_day index...');
    try {
      await Dispatch.collection.dropIndex('unique_packing_sheet_per_day');
      console.log('✅ Index dropped successfully');
    } catch (error) {
      console.log('⚠️  Index may not exist or already dropped:', error.message);
    }

    // Verify
    const indexesAfter = await Dispatch.collection.getIndexes();
    console.log('\n📋 Indexes after dropping:\n');
    console.log(JSON.stringify(indexesAfter, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkIndexes();
