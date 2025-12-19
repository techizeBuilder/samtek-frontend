const config = require('./server/config/config.js');
const mongoose = require('mongoose');
const PackingSheet = require('./server/models/Packing.js').default;

async function testPackingLossStorage() {
  try {
    console.log('🧪 Testing packing loss storage...');
    
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the existing packing sheet from the attachment
    const packingSheet = await PackingSheet.findOne({
      _id: "6944f013d7679464e4366fc"
    });
    
    if (!packingSheet) {
      console.log('❌ Packing sheet not found');
      return;
    }
    
    console.log('📋 Current packing sheet structure:');
    console.log('Main sheet packingLoss:', packingSheet.packingLoss);
    console.log('Items count:', packingSheet.items.length);
    
    if (packingSheet.items.length > 0) {
      const firstItem = packingSheet.items[0];
      console.log('\n🎯 First item structure:');
      console.log('Product ID:', firstItem.productId);
      console.log('Product Name:', firstItem.productName);
      console.log('Produced Qty:', firstItem.producedQty);
      console.log('Packed Qty:', firstItem.packedQty);
      console.log('Has packingLoss property:', 'packingLoss' in firstItem);
      if ('packingLoss' in firstItem) {
        console.log('Item packingLoss:', firstItem.packingLoss);
      }
      console.log('Notes:', firstItem.notes);
    }
    
    await mongoose.disconnect();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error testing packing loss storage:', error);
    await mongoose.disconnect();
  }
}

testPackingLossStorage();