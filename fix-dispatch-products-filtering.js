import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manufacturing-erp';

// Connect to MongoDB
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false, collection: 'items' }));
const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));
const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false, collection: 'companies' }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

console.log('\n📊 DIAGNOSTIC REPORT - Dispatch Products Filtering Issue\n');

// Step 1: Check total items
const totalItems = await Item.countDocuments({});
console.log(`1️⃣ Total Items in database: ${totalItems}`);

if (totalItems > 0) {
  const sampleItem = await Item.findOne({}).lean();
  console.log('   Sample Item:', {
    _id: sampleItem._id,
    name: sampleItem.name,
    location: sampleItem.location,
    store: sampleItem.store,
    category: sampleItem.category
  });
}

// Step 2: Check total dispatches
const totalDispatches = await Dispatch.countDocuments({});
console.log(`\n2️⃣ Total Dispatches in database: ${totalDispatches}`);

if (totalDispatches > 0) {
  const sampleDispatch = await Dispatch.findOne({}).lean();
  console.log('   Sample Dispatch:', {
    _id: sampleDispatch._id,
    productId: sampleDispatch.productId,
    productName: sampleDispatch.productName,
    company: sampleDispatch.company,
    date: sampleDispatch.date
  });
}

// Step 3: Check companies
const companies = await Company.find({}).select('_id unitName city locationPin').lean();
console.log(`\n3️⃣ Total Companies: ${companies.length}`);
companies.forEach(c => {
  console.log(`   - ${c.unitName} (${c._id}) - City: ${c.city}, Pin: ${c.locationPin}`);
});

// Step 4: Check dispatches per company
console.log('\n4️⃣ Dispatches per Company:');
for (const company of companies) {
  const dispatchCount = await Dispatch.countDocuments({ company: company._id });
  const uniqueProducts = await Dispatch.distinct('productId', { company: company._id });
  console.log(`   - ${company.unitName}: ${dispatchCount} dispatches, ${uniqueProducts.length} unique products`);
  
  if (uniqueProducts.length > 0) {
    console.log(`     Product IDs: ${uniqueProducts.slice(0, 3).map(p => p?.toString()).join(', ')}...`);
  }
}

// Step 5: Check items location field
console.log('\n5️⃣ Item Location Analysis:');
const itemsWithLocation = await Item.countDocuments({ location: { $exists: true, $ne: null, $ne: '' } });
const itemsWithStore = await Item.countDocuments({ store: { $exists: true, $ne: null, $ne: '' } });
console.log(`   - Items with location field: ${itemsWithLocation}`);
console.log(`   - Items with store field: ${itemsWithStore}`);

const locationValues = await Item.distinct('location');
const storeValues = await Item.distinct('store');
console.log(`   - Unique location values: ${locationValues.filter(Boolean).join(', ')}`);
console.log(`   - Unique store values: ${storeValues.filter(Boolean).join(', ')}`);

// Step 6: Check if items have any company reference
console.log('\n6️⃣ Checking if Items have company field:');
const itemWithCompany = await Item.findOne({ company: { $exists: true } }).lean();
if (itemWithCompany) {
  console.log('   ✅ Items have company field:', itemWithCompany.company);
} else {
  console.log('   ❌ Items do NOT have company field');
  console.log('   ⚠️ Items are shared across all companies - cannot filter by company directly');
}

// Step 7: Recommended Solution
console.log('\n📋 RECOMMENDED SOLUTION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (totalDispatches === 0) {
  console.log('⚠️  NO DISPATCHES FOUND - Cannot determine company-specific products');
  console.log('');
  console.log('Options:');
  console.log('1. Return ALL items (current behavior)');
  console.log('2. Add company field to Item model and populate it');
  console.log('3. Return empty array until first dispatch is created');
  console.log('');
  console.log('RECOMMENDED: Return ALL items when no dispatches exist');
  console.log('This allows users to create their first dispatch order');
} else {
  console.log('✅ Dispatches exist - can filter by company');
  console.log('');
  console.log('Current Logic:');
  console.log('1. Get user\'s companyId from req.user');
  console.log('2. Get all dispatches for that company');
  console.log('3. Get unique productIds from those dispatches');
  console.log('4. Return items matching those productIds');
  console.log('');
  console.log('✅ This logic is CORRECT for filtering by company');
}

console.log('\n🔧 FIX: Update getProductsForDispatch to:');
console.log('1. If user has companyId: Return items from dispatches of that company');
console.log('2. If no dispatches for company: Return ALL items (allows first order)');
console.log('3. Remove location-based filtering (location is storage, not company)');

await mongoose.disconnect();
console.log('\n✅ Done');
