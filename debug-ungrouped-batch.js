import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function debugUngroupedItemBatch() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));
    const PackingSheet = mongoose.model('PackingSheet', new mongoose.Schema({}, { strict: false, collection: 'packingsheets' }));
    const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false, collection: 'items' }));

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Today: ${startOfDay}\n`);

    // Find the Burger Buns dispatch
    const burgerDispatch = await Dispatch.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      productGroup: /Burger Buns/i
    }).lean();

    if (!burgerDispatch) {
      console.log('❌ Burger Buns dispatch not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📦 Burger Buns Dispatch:');
    console.log(`   _id: ${burgerDispatch._id}`);
    console.log(`   productGroup: ${burgerDispatch.productGroup}`);
    console.log(`   productName: ${burgerDispatch.productName}`);
    console.log(`   productId: ${burgerDispatch.productId}`);
    console.log(`   packingSheetId: ${burgerDispatch.packingSheetId}`);
    console.log(`   batchNo: ${burgerDispatch.batchNo}`);
    console.log(`   indentQty: ${burgerDispatch.indentQty}`);
    console.log(`   totalIndentQuantityOrdersForTheDay: ${burgerDispatch.totalIndentQuantityOrdersForTheDay}`);
    console.log('');

    // Check packing sheet
    if (burgerDispatch.packingSheetId) {
      const packingSheet = await PackingSheet.findById(burgerDispatch.packingSheetId).lean();
      if (packingSheet) {
        console.log('📄 Packing Sheet:');
        console.log(`   _id: ${packingSheet._id}`);
        console.log(`   productionGroup: ${packingSheet.productionGroup}`);
        console.log(`   batchNo: ${packingSheet.batchNo}`);
        console.log(`   items: ${packingSheet.items?.length || 0}`);
        console.log('');
      }
    }

    // Check item details
    if (burgerDispatch.productId) {
      const item = await Item.findById(burgerDispatch.productId).select('name batch stock qty').lean();
      if (item) {
        console.log('🍔 Item Details:');
        console.log(`   _id: ${item._id}`);
        console.log(`   name: ${item.name}`);
        console.log(`   batch: ${item.batch}`);
        console.log(`   stock: ${item.stock}`);
        console.log(`   qty: ${item.qty}`);
        console.log('');
        
        console.log('📊 Expected values in API:');
        console.log(`   totalItemBatch should be: ${item.batch}`);
        console.log(`   items[0].batch should be: ${item.batch}`);
      } else {
        console.log('❌ Item not found in database');
      }
    } else {
      console.log('❌ Dispatch has no productId!');
    }

    console.log('\n✅ Debug completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

debugUngroupedItemBatch();
