// Test script to check notes storage in packing sheet
import mongoose from 'mongoose';
import PackingSheet from './server/models/Packing.js';

async function testNotesStorage() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://manav:Manav%4012345@cluster0.ylbgi.mongodb.net/techizibuilder?retryWrites=true&w=majority');
    console.log('🔌 Connected to MongoDB');

    // Find the packing sheet to test
    const packingSheet = await PackingSheet.findOne({
      'items.productId': '693928b054dc840409006933'
    });

    if (!packingSheet) {
      console.log('❌ No packing sheet found with that productId');
      return;
    }

    console.log('📋 Current packing sheet data:');
    console.log('- packingLoss (main sheet):', packingSheet.packingLoss);
    console.log('- notes (main sheet):', packingSheet.notes);
    console.log('- items count:', packingSheet.items.length);
    
    // Check if notes field exists at main level
    console.log('\n🔍 Schema check:');
    console.log('- Has packingLoss field:', packingSheet.packingLoss !== undefined);
    console.log('- Has notes field:', packingSheet.notes !== undefined);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testNotesStorage();