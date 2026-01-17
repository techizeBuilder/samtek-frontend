const mongoose = require('mongoose');
require('dotenv').config();

const ProductionBatch = require('./server/models/ProductionBatch');

async function fixBatchQtyAchieved() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all batches where qtyAchieved equals qtyPerBatch (indicating old incorrect calculation)
    const batches = await ProductionBatch.find({});
    
    console.log(`\n📊 Found ${batches.length} total batches to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const batch of batches) {
      const correctQtyAchieved = batch.qtyPerBatch * batch.totalBatchAdjusted;
      const roundedCorrect = Math.round(correctQtyAchieved * 100) / 100;
      const roundedCurrent = Math.round(batch.qtyAchieved * 100) / 100;
      
      // Check if qtyAchieved needs updating (allowing for small rounding differences)
      if (Math.abs(roundedCurrent - roundedCorrect) > 0.01) {
        console.log(`\n🔧 Fixing ${batch.batchNo}:`);
        console.log(`   qtyPerBatch: ${batch.qtyPerBatch}`);
        console.log(`   totalBatchAdjusted: ${batch.totalBatchAdjusted}`);
        console.log(`   Current qtyAchieved: ${batch.qtyAchieved}`);
        console.log(`   Correct qtyAchieved: ${correctQtyAchieved.toFixed(2)}`);
        
        batch.qtyAchieved = correctQtyAchieved;
        await batch.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updatedCount} batches`);
    console.log(`   Already correct: ${skippedCount} batches`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBatchQtyAchieved();
