const mongoose = require('mongoose');
require('dotenv').config();

async function checkUngroupedItems() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to database');
  
  const UngroupedItemProduction = mongoose.model('UngroupedItemProduction', {
    itemId: String,
    batchNo: String,
    batchNumber: Number,
    name: String,
    unitSize: String,
    unitPrice: Number,
    mouldingTime: Date,
    unloadingTime: Date,
    qtyAchieved: Number,
    status: String
  });
  
  // Get all ungrouped items for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('Searching for items between:', today, 'and', tomorrow);
  
  const items = await UngroupedItemProduction.find({
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ batchNo: 1 });
  
  console.log(`Found ${items.length} ungrouped items for today:`);
  
  items.forEach((item, index) => {
    console.log(`${index + 1}. ID: ${item._id}, batchNo: ${item.batchNo}, name: ${item.name}, status: ${item.status || 'pending'}`);
  });
  
  // Check for duplicates
  const batchNos = items.map(item => item.batchNo);
  const duplicates = batchNos.filter((item, index) => batchNos.indexOf(item) !== index);
  if (duplicates.length > 0) {
    console.log('⚠️ Found duplicate batch numbers:', [...new Set(duplicates)]);
  } else {
    console.log('✅ All batch numbers are unique');
  }
  
  mongoose.disconnect();
}

checkUngroupedItems().catch(console.error);