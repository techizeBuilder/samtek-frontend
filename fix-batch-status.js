import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manuerp');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixBatchStatus = async () => {
  await connectDB();
  
  try {
    // Find BATNO03 which should be completed but shows as in_progress
    const batchToFix = await ProductionBatch.findOne({
      batchNo: 'BATNO03'
    });
    
    if (!batchToFix) {
      console.log('❌ BATNO03 not found');
      return;
    }
    
    console.log('🔍 Found BATNO03:');
    console.log(`  Current status: ${batchToFix.status}`);
    console.log(`  qtyAchieved: ${batchToFix.qtyAchieved}`);
    console.log(`  productionLoss: ${batchToFix.productionLoss}`);
    console.log(`  productionEndTime: ${batchToFix.productionEndTime}`);
    
    // Update status to completed
    const result = await ProductionBatch.updateOne(
      { batchNo: 'BATNO03' },
      { 
        $set: { 
          status: 'completed',
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('\n✅ Update result:', result);
    
    // Verify the update
    const updatedBatch = await ProductionBatch.findOne({
      batchNo: 'BATNO03'
    });
    
    console.log('\n🔍 Updated BATNO03:');
    console.log(`  New status: ${updatedBatch.status}`);
    
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

fixBatchStatus();