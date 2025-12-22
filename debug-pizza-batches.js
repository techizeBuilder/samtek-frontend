import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductionBatch from './server/models/ProductionBatch.js';
import { Item } from './server/models/Inventory.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manuerp');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugPizzaBatches = async () => {
  await connectDB();
  
  try {
    // Find the Pizza base item
    const pizzaItem = await Item.findOne({
      name: { $regex: /Every Day Pizza base 7/, $options: 'i' }
    }).lean();
    
    if (!pizzaItem) {
      console.log('❌ Pizza item not found');
      return;
    }
    
    console.log('🍕 Found Pizza item:');
    console.log('  _id:', pizzaItem._id);
    console.log('  name:', pizzaItem.name);
    console.log('  code:', pizzaItem.code);
    
    // Set today's date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    console.log('\n📅 Searching for batches on:', today.toISOString());
    
    // Find all batches for this item today
    const allBatches = await ProductionBatch.find({
      itemId: pizzaItem._id,
      productionDate: { 
        $gte: today, 
        $lte: endOfDay 
      }
    }).lean();
    
    console.log(`\n📦 Found ${allBatches.length} total batches for Pizza base:`);
    allBatches.forEach((batch, index) => {
      console.log(`  Batch ${index + 1}:`);
      console.log(`    _id: ${batch._id}`);
      console.log(`    batchNo: ${batch.batchNo}`);
      console.log(`    status: ${batch.status}`);
      console.log(`    qtyAchieved: ${batch.qtyAchieved}`);
      console.log(`    productionLoss: ${batch.productionLoss}`);
    });
    
    // Filter only completed batches
    const completedBatches = allBatches.filter(batch => batch.status === 'completed');
    
    console.log(`\n✅ Found ${completedBatches.length} COMPLETED batches for Pizza base:`);
    completedBatches.forEach((batch, index) => {
      console.log(`  Completed Batch ${index + 1}:`);
      console.log(`    _id: ${batch._id}`);
      console.log(`    batchNo: ${batch.batchNo}`);
      console.log(`    status: ${batch.status}`);
      console.log(`    qtyAchieved: ${batch.qtyAchieved}`);
      console.log(`    productionLoss: ${batch.productionLoss}`);
    });
    
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

debugPizzaBatches();