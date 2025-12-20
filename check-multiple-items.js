import mongoose from 'mongoose';
import PackingSheet from './server/models/Packing.js';
import connectDB from './server/config/database.js';

async function checkMultipleItemSheets() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');
    
    console.log('🔍 Checking for packing sheets with multiple items...');
    const sheets = await PackingSheet.find({}).limit(20);
    
    console.log('📊 Sample packing sheets:');
    sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. Group: ${sheet.productionGroupName} - Items: ${sheet.items?.length || 0} - Status: ${sheet.status}`);
      if (sheet.items && sheet.items.length > 1) {
        console.log('   🔸 Multiple items found:');
        sheet.items.forEach(item => {
          console.log(`     - ${item.productName} (Packed: ${item.packedQty})`);
        });
      }
    });
    
    // Check specifically for approved sheets with multiple items
    console.log('\n🔍 Looking for approved sheets with multiple items:');
    const approvedSheets = await PackingSheet.find({status: 'approved'});
    console.log(`Found ${approvedSheets.length} approved sheets`);
    
    approvedSheets.forEach((sheet, index) => {
      if (sheet.items && sheet.items.length > 1) {
        console.log(`\n✅ Approved sheet with ${sheet.items.length} items:`);
        console.log(`   Group: ${sheet.productionGroupName}`);
        console.log(`   Sheet ID: ${sheet._id}`);
        sheet.items.forEach(item => {
          console.log(`     - ${item.productName} (Packed: ${item.packedQty})`);
        });
      }
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMultipleItemSheets();