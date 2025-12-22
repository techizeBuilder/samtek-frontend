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

const fixNegativeQtyAchieved = async () => {
  await connectDB();
  
  try {
    console.log('🔍 Finding batches with negative qtyAchieved values...');
    
    // Find all batches with negative qtyAchieved
    const negativeBatches = await ProductionBatch.find({
      qtyAchieved: { $lt: 0 }
    });
    
    console.log(`📦 Found ${negativeBatches.length} batches with negative qtyAchieved:`);
    
    if (negativeBatches.length === 0) {
      console.log('✅ No batches with negative qtyAchieved found');
      mongoose.connection.close();
      return;
    }
    
    // Log the problematic batches
    negativeBatches.forEach((batch, index) => {
      console.log(`  Batch ${index + 1}:`);
      console.log(`    _id: ${batch._id}`);
      console.log(`    batchNo: ${batch.batchNo}`);
      console.log(`    qtyAchieved: ${batch.qtyAchieved} (NEGATIVE!)`);
      console.log(`    qtyPerBatch: ${batch.qtyPerBatch}`);
      console.log(`    productionLoss: ${batch.productionLoss}`);
      console.log(`    status: ${batch.status}`);
    });
    
    // Fix: Set negative qtyAchieved to 0 or calculate properly
    console.log('\n🔧 Fixing negative qtyAchieved values...');
    
    const updatePromises = negativeBatches.map(async (batch) => {
      // Calculate proper qtyAchieved: qtyPerBatch - productionLoss (minimum 0)
      const properQtyAchieved = Math.max(0, (batch.qtyPerBatch || 0) - (batch.productionLoss || 0));
      
      console.log(`📊 Batch ${batch.batchNo}: ${batch.qtyAchieved} → ${properQtyAchieved}`);
      
      return ProductionBatch.updateOne(
        { _id: batch._id },
        { 
          $set: { 
            qtyAchieved: properQtyAchieved,
            updatedAt: new Date()
          } 
        }
      );
    });
    
    const results = await Promise.all(updatePromises);
    
    console.log('\n✅ Update results:');
    results.forEach((result, index) => {
      console.log(`  Batch ${index + 1}: ${result.modifiedCount} document(s) modified`);
    });
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const remainingNegative = await ProductionBatch.find({
      qtyAchieved: { $lt: 0 }
    });
    
    if (remainingNegative.length === 0) {
      console.log('✅ All negative qtyAchieved values have been fixed!');
    } else {
      console.log(`❌ Still ${remainingNegative.length} batches with negative qtyAchieved`);
    }
    
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

fixNegativeQtyAchieved();