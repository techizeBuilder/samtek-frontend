import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function checkBurgerBunsGroup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));
    const PackingSheet = mongoose.model('PackingSheet', new mongoose.Schema({}, { strict: false, collection: 'packingsheets' }));
    const ProductionGroup = mongoose.model('ProductionGroup', new mongoose.Schema({}, { strict: false, collection: 'productiongroups' }));

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Today: ${startOfDay}\n`);

    // Find the dispatch with "Burger Buns" in the product group
    const burgerDispatches = await Dispatch.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      productGroup: /Burger Buns/i
    }).lean();

    console.log(`📊 Found ${burgerDispatches.length} Burger Buns dispatches\n`);

    for (const dispatch of burgerDispatches) {
      console.log(`📦 Dispatch: ${dispatch.productGroup}`);
      console.log(`   ID: ${dispatch._id}`);
      console.log(`   Product Name: ${dispatch.productName}`);
      console.log(`   PackingSheet ID: ${dispatch.packingSheetId || 'null'}`);
      console.log(`   Status: ${dispatch.status}`);
      
      if (dispatch.packingSheetId) {
        const ps = await PackingSheet.findById(dispatch.packingSheetId).lean();
        if (ps) {
          console.log(`   ✅ PackingSheet found: ${ps._id}`);
          console.log(`      Production Group ID: ${ps.productionGroup}`);
          
          const pg = await ProductionGroup.findById(ps.productionGroup).lean();
          if (pg) {
            console.log(`      Production Group Name: ${pg.name}`);
            console.log(`      Items in group: ${pg.items?.length || 0}`);
          } else {
            console.log(`      ⚠️ Production Group NOT FOUND`);
          }
        } else {
          console.log(`   ⚠️ PackingSheet NOT FOUND`);
        }
      } else {
        console.log(`   ℹ️ No packing sheet (ungrouped item)`);
      }
      console.log('');
    }

    console.log('✅ Test completed!');
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkBurgerBunsGroup();
