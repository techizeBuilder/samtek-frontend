import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manuerp');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const debugBatchStructure = async () => {
  await connectDB();
  
  try {
    console.log('🔍 Checking ProductionBatch collection structure...');
    
    // Get the first few batches
    const batches = await ProductionBatch.find().limit(3).lean();
    
    console.log(`📦 Found ${batches.length} batches`);
    
    if (batches.length > 0) {
      console.log('\n🔍 Sample batch data structure:');
      console.log('Keys in first batch:', Object.keys(batches[0]));
      console.log('\nFull first batch data:');
      console.log(JSON.stringify(batches[0], null, 2));
      
      // Check if specific fields exist
      const firstBatch = batches[0];
      console.log('\n🔍 Field availability check:');
      console.log(`_id: ${firstBatch._id}`);
      console.log(`companyId: ${firstBatch.companyId}`);
      console.log(`itemId: ${firstBatch.itemId}`);
      console.log(`groupId: ${firstBatch.groupId}`);
      console.log(`batchNo: ${firstBatch.batchNo}`);
      console.log(`qtyAchieved: ${firstBatch.qtyAchieved}`);
      console.log(`productionLoss: ${firstBatch.productionLoss}`);
      console.log(`productionDate: ${firstBatch.productionDate}`);
      console.log(`status: ${firstBatch.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('\nDatabase disconnected');
  }
};

debugBatchStructure();