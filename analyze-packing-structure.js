import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Import models
import PackingSheet from './server/models/Packing.js';
import ProductionBatch from './server/models/ProductionBatch.js';

async function analyzePackingSheetStructure() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');

    // Get all packing sheets
    const packingSheets = await PackingSheet.find({}).lean();
    console.log(`\n📋 Found ${packingSheets.length} packing sheets`);

    if (packingSheets.length > 0) {
      console.log('\n🔍 Analyzing packing sheet structure:');
      
      packingSheets.forEach((sheet, index) => {
        console.log(`\n📋 Packing Sheet ${index + 1}:`);
        console.log('   ID:', sheet._id);
        console.log('   Status:', sheet.status);
        console.log('   Packing Date:', sheet.packingDate);
        console.log('   Company:', sheet.company);
        console.log('   Production Group:', sheet.productionGroup);
        console.log('   Items count:', sheet.items?.length || 0);
        
        if (sheet.items && sheet.items.length > 0) {
          console.log('   📦 Items in this sheet:');
          sheet.items.forEach((item, itemIndex) => {
            console.log(`      Item ${itemIndex + 1}:`, {
              productId: item.productId,
              batchId: item.batchId,
              batchNo: item.batchNo,
              packedQty: item.packedQty,
              packingLoss: item.packingLoss,
              notes: item.notes
            });
          });
        }
      });

      // Get completed batches
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const completedBatches = await ProductionBatch.find({
        productionDate: { $gte: today, $lte: endOfDay },
        status: 'completed'
      }).lean();

      console.log(`\n🔍 Matching batches to packing sheets:`);
      completedBatches.slice(0, 3).forEach(batch => {
        console.log(`\n   Batch: ${batch.batchNo} (${batch._id})`);
        
        // Find packing sheets that contain this batch
        const matchingSheets = packingSheets.filter(sheet => 
          sheet.items?.some(item => 
            item.batchId?.toString() === batch._id.toString() ||
            item.batchNo === batch.batchNo
          )
        );
        
        console.log(`   Found in ${matchingSheets.length} packing sheets`);
        
        if (matchingSheets.length > 0) {
          matchingSheets.forEach(sheet => {
            const matchingItem = sheet.items.find(item => 
              item.batchId?.toString() === batch._id.toString() ||
              item.batchNo === batch.batchNo
            );
            console.log(`      Sheet ${sheet._id}: Item data:`, {
              batchId: matchingItem.batchId,
              batchNo: matchingItem.batchNo,
              packedQty: matchingItem.packedQty,
              packingLoss: matchingItem.packingLoss
            });
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

analyzePackingSheetStructure();