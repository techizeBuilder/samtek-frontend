import mongoose from 'mongoose';
import PackingSheet from './server/models/Packing.js';
import connectDB from './server/config/database.js';

async function checkPackingSheetItems() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');
    
    const packingSheetId = '694665b13913ba651f2abd4e';
    console.log('🔍 Checking packing sheet:', packingSheetId);
    
    const packingSheet = await PackingSheet.findById(packingSheetId);
    
    if (!packingSheet) {
      console.log('❌ Packing sheet not found');
      process.exit(1);
    }
    
    console.log('🏭 Production Group:', packingSheet.productionGroupName);
    console.log('📦 Number of Items:', packingSheet.items ? packingSheet.items.length : 0);
    console.log('✅ Status:', packingSheet.status);
    console.log('📅 Date:', packingSheet.packingDate);
    
    console.log('\n📋 Items in this packing sheet:');
    if (packingSheet.items && packingSheet.items.length > 0) {
      packingSheet.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName}`);
        console.log(`     - Product ID: ${item.productId}`);
        console.log(`     - Indent Qty: ${item.indentQty}`);
        console.log(`     - Produced Qty: ${item.producedQty}`);
        console.log(`     - Packed Qty: ${item.packedQty}`);
        console.log('');
      });
    }
    
    console.log('\n💡 EXPLANATION:');
    console.log('🔸 The current logic creates ONE dispatch console entry per packing sheet');
    console.log('🔸 This packing sheet has ' + (packingSheet.items?.length || 0) + ' different products');
    console.log('🔸 All quantities are aggregated into a single dispatch console entry');
    console.log('🔸 If you expect multiple dispatch entries, we need to modify the logic');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPackingSheetItems();