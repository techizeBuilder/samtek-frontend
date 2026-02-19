import mongoose from 'mongoose';

const mongoURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise_app';

async function checkCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURL);
    
    const db = mongoose.connection;
    const itemsCollection = db.collection('items');
    
    console.log('\n📊 Checking Item Categories in Database...\n');
    
    // Get distinct categories
    const categories = await itemsCollection.distinct('category');
    console.log('✅ Categories found:', categories);
    
    // Count items per category
    for (const cat of categories) {
      const count = await itemsCollection.countDocuments({ category: cat });
      console.log(`  - "${cat}": ${count} items`);
    }
    
    // Show a few items from each category
    console.log('\n📦 Sample items per category:');
    for (const cat of categories) {
      const items = await itemsCollection.find({ category: cat }).limit(2).toArray();
      console.log(`\n  Category: "${cat}"`);
      items.forEach(item => {
        console.log(`    - ${item.name} (${item.code}): qty=${item.qty}, minStock=${item.minStock}`);
      });
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCategories();
