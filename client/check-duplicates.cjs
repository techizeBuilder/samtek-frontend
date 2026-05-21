const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/inventory_management');

const ProductDailySummary = mongoose.model('ProductDailySummary', {
  productId: mongoose.Schema.Types.ObjectId,
  productName: String,
  date: Date,
  companyId: mongoose.Schema.Types.ObjectId,
  totalRequirements: Number,
  productionFinalBatches: Number,
  qtyPerBatch: Number
}, 'productdailysummaries');

const checkData = async () => {
  try {
    const summaries = await ProductDailySummary.find({}).sort({ date: -1 }).limit(10);
    console.log('Recent ProductDailySummary entries:');
    summaries.forEach((summary, i) => {
      console.log(`${i+1}. ${summary.productName} Date: ${summary.date.toISOString().split('T')[0]} TotalReq: ${summary.totalRequirements} ProdBatches: ${summary.productionFinalBatches}`);
    });
    
    // Check for potential duplicates (same product, same date, same company)
    const duplicates = await ProductDailySummary.aggregate([
      { $group: { 
          _id: { productId: '$productId', date: '$date', companyId: '$companyId' },
          count: { $sum: 1 },
          entries: { $push: { productName: '$productName', totalRequirements: '$totalRequirements' } }
        }},
      { $match: { count: { $gt: 1 } }},
      { $limit: 5 }
    ]);
    
    console.log('\nDuplicate entries found:', duplicates.length);
    duplicates.forEach((dup, i) => {
      console.log(`${i+1}. Product duplicates:`);
      dup.entries.forEach((entry, j) => {
        console.log(`   - ${entry.productName} TotalReq: ${entry.totalRequirements}`);
      });
    });
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.disconnect();
  }
};

checkData();