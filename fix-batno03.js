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

const fixBATNO03Status = async () => {
  await connectDB();
  
  try {
    // Find BATNO03
    const batch03 = await ProductionBatch.findOne({
      batchNo: 'BATNO03'
    });
    
    if (!batch03) {
      console.log('❌ BATNO03 not found');
      return;
    }
    
    console.log('🔍 Found BATNO03:');
    console.log(`  Current status: ${batch03.status}`);
    console.log(`  qtyAchieved: ${batch03.qtyAchieved}`);
    console.log(`  productionLoss: ${batch03.productionLoss}`);
    
    // Update to completed status
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
    
    // Verify
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

fixBATNO03Status();