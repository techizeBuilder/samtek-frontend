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

const checkAllBATNO03 = async () => {
  await connectDB();
  
  try {
    // Find ALL BATNO03 entries
    const allBatch03 = await ProductionBatch.find({
      batchNo: 'BATNO03'
    });
    
    console.log(`🔍 Found ${allBatch03.length} BATNO03 entries:`);
    
    allBatch03.forEach((batch, index) => {
      console.log(`  Entry ${index + 1}:`);
      console.log(`    _id: ${batch._id}`);
      console.log(`    batchNo: ${batch.batchNo}`);
      console.log(`    status: ${batch.status}`);
      console.log(`    itemId: ${batch.itemId}`);
      console.log(`    productionDate: ${batch.productionDate}`);
      console.log(`    updatedAt: ${batch.updatedAt}`);
    });
    
    // Update ALL BATNO03 to completed
    const updateResult = await ProductionBatch.updateMany(
      { batchNo: 'BATNO03' },
      { 
        $set: { 
          status: 'completed',
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`\n✅ Updated ${updateResult.modifiedCount} BATNO03 records to completed`);
    
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

checkAllBATNO03();