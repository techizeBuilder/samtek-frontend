const mongoose = require('mongoose');

const mongoURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise_app';

async function testDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURL);
    
    const db = mongoose.connection.db;
    
    // Collections to check
    const collections = ['orders', 'dispatchconsoles', 'productionbatches', 'returns', 'items'];
    
    for (const collName of collections) {
      try {
        const count = await db.collection(collName).countDocuments();
        console.log(`\n${collName}: ${count} documents`);
        
        if (count > 0) {
          const sample = await db.collection(collName).findOne();
          console.log('Sample document keys:', Object.keys(sample));
          
          // Log specific fields we care about
          if (collName === 'orders') {
            console.log('  - companyId:', sample.companyId);
            console.log('  - totalAmount:', sample.totalAmount);
            console.log('  - createdAt:', sample.createdAt);
          } else if (collName === 'dispatchconsoles') {
            console.log('  - company:', sample.company);
            console.log('  - companyId:', sample.companyId);
            console.log('  - date:', sample.date);
            console.log('  - dispatchedQuantitySentToday:', sample.dispatchedQuantitySentToday);
            console.log('  - totalIndentQuantityOrdersForTheDay:', sample.totalIndentQuantityOrdersForTheDay);
          } else if (collName === 'productionbatches') {
            console.log('  - companyId:', sample.companyId);
            console.log('  - productionDate:', sample.productionDate);
            console.log('  - qtyAchieved:', sample.qtyAchieved);
            console.log('  - createdAt:', sample.createdAt);
          } else if (collName === 'returns') {
            console.log('  - type:', sample.type);
            console.log('  - returnDate:', sample.returnDate);
            console.log('  - createdAt:', sample.createdAt);
          } else if (collName === 'items') {
            console.log('  - category:', sample.category);
            console.log('  - qty:', sample.qty);
            console.log('  - minStock:', sample.minStock);
          }
        }
      } catch (e) {
        console.log(`Error checking ${collName}:`, e.message);
      }
    }
    
    await mongoose.disconnect();
    console.log('\nDone.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDB();
