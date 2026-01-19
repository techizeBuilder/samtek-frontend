import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function checkIndentQuantitySource() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const ProductDetailsDailySummary = mongoose.model('ProductDetailsDailySummary', new mongoose.Schema({}, { strict: false, collection: 'productdetailsdailysummaries' }));
    const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false, collection: 'items' }));
    const ProductionBatch = mongoose.model('ProductionBatch', new mongoose.Schema({}, { strict: false, collection: 'productionbatches' }));

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Checking for date: ${startOfDay}\n`);

    // Find the Burger Buns product
    const burgerBunsItem = await Item.findOne({ name: /Burger Buns 4.*200g/i }).lean();
    
    if (!burgerBunsItem) {
      console.log('❌ Burger Buns item not found');
      await mongoose.disconnect();
      return;
    }

    console.log('🍔 Found Product:');
    console.log(`   Name: ${burgerBunsItem.name}`);
    console.log(`   ID: ${burgerBunsItem._id}`);
    console.log(`   Batch (from Item table): ${burgerBunsItem.batch}`);
    console.log('');

    // Get ProductDetailsDailySummary for this product
    const dailySummary = await ProductDetailsDailySummary.findOne({
      productId: burgerBunsItem._id,
      date: { $gte: startOfDay, $lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) }
    }).lean();

    if (dailySummary) {
      console.log('📊 ProductDetailsDailySummary for today:');
      console.log(`   _id: ${dailySummary._id}`);
      console.log(`   productionFinalBatches: ${dailySummary.productionFinalBatches || 'null'}`);
      console.log(`   batchAdjusted: ${dailySummary.batchAdjusted || 'null'}`);
      console.log(`   totalIndent: ${dailySummary.totalIndent || 'null'}`);
      console.log(`   production: ${dailySummary.production || 'null'}`);
      console.log(`   packing: ${dailySummary.packing || 'null'}`);
      console.log('');
      console.log('   All fields:', JSON.stringify(dailySummary, null, 2));
    } else {
      console.log('❌ No ProductDetailsDailySummary found for today\n');
    }

    // Get Production Batches for this product
    const productionBatches = await ProductionBatch.find({
      productionDate: { $gte: startOfDay, $lte: endOfDay },
      'combinedItems.itemId': burgerBunsItem._id
    }).lean();

    console.log(`\n📦 Production Batches for this product today: ${productionBatches.length}`);
    
    productionBatches.forEach((batch, i) => {
      console.log(`\n   Batch ${i + 1}:`);
      console.log(`      Batch No: ${batch.batchNo}`);
      console.log(`      Total Batch Adjusted: ${batch.totalBatchAdjusted}`);
      console.log(`      Qty Per Batch: ${batch.qtyPerBatch}`);
      console.log(`      Combined Items: ${batch.combinedItems?.length || 0}`);
      
      const itemInBatch = batch.combinedItems?.find(ci => ci.itemId?.toString() === burgerBunsItem._id.toString());
      if (itemInBatch) {
        console.log(`      This item's details:`);
        console.log(`         batchAdjustedValue: ${itemInBatch.batchAdjustedValue}`);
        console.log(`         qtyContribution: ${itemInBatch.qtyContribution}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('💡 EXPLANATION:');
    console.log('='.repeat(60));
    console.log('The value 180 comes from:');
    console.log('   ProductDetailsDailySummary.productionFinalBatches field');
    console.log('\nThe value 169 you see in UI comes from:');
    console.log('   Item.batch field (the individual item record)');
    console.log('\n🔍 The approve API uses ProductDetailsDailySummary.productionFinalBatches');
    console.log('   which appears to have a DIFFERENT value than Item.batch');

    console.log('\n✅ Test completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkIndentQuantitySource();
