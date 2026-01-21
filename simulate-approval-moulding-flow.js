import mongoose from 'mongoose';

// Production Batch Schema
const ProductionBatchSchema = new mongoose.Schema({
  itemId: mongoose.Schema.Types.ObjectId,
  groupId: mongoose.Schema.Types.ObjectId,
  batchNo: String,
  batchNumber: Number,
  qtyPerBatch: Number,
  qtyAchieved: Number,
  totalBatchAdjusted: Number,
  productionLoss: Number,
  status: String,
  productionDate: Date,
  companyId: mongoose.Schema.Types.ObjectId,
  combinedItems: Array,
  mouldingTime: Date,
  unloadingTime: Date,
  createdBy: String,
  updatedBy: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'productionbatches' });

const ProductionBatch = mongoose.model('ProductionBatch', ProductionBatchSchema);

// Item Schema (simplified)
const ItemSchema = new mongoose.Schema({
  name: String,
  batch: Number,
  qty: Number
}, { collection: 'items' });

const Item = mongoose.model('Item', ItemSchema);

async function simulateApprovalAndMoulding() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manufacturing-erp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    console.log('🧪 SIMULATING APPROVAL → START MOULDING WORKFLOW\n');
    console.log('═'.repeat(80));
    
    // Step 1: Get one of today's ungrouped batches
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const ungroupedBatches = await ProductionBatch.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      },
      $or: [
        { groupId: null },
        { groupId: { $exists: false } }
      ]
    }).limit(5);
    
    console.log(`\n📦 Found ${ungroupedBatches.length} ungrouped batches created today\n`);
    
    if (ungroupedBatches.length === 0) {
      console.log('⚠️  No ungrouped batches found to test with');
      return;
    }
    
    // Test with first ungrouped batch
    const testBatch = ungroupedBatches[0];
    console.log('🎯 Testing with batch:', {
      id: testBatch._id,
      batchNo: testBatch.batchNo,
      batchNumber: testBatch.batchNumber,
      itemId: testBatch.itemId,
      companyId: testBatch.companyId,
      productionDate: testBatch.productionDate,
      mouldingTime: testBatch.mouldingTime,
      status: testBatch.status
    });
    
    // Step 2: Simulate "Start Moulding" click
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 SIMULATING "START MOULDING" BUTTON CLICK');
    console.log('═'.repeat(80) + '\n');
    
    const itemId = testBatch.itemId;
    const batchno = testBatch.batchNo;
    const companyId = testBatch.companyId;
    const productionDate = new Date(testBatch.productionDate);
    productionDate.setHours(0, 0, 0, 0);
    
    console.log('📝 Request parameters:');
    console.log(`   itemId: ${itemId}`);
    console.log(`   batchno: ${batchno}`);
    console.log(`   companyId: ${companyId}`);
    console.log(`   productionDate: ${productionDate.toISOString()}`);
    console.log('');
    
    // Step 3: Query like the API does
    console.log('🔍 Searching for existing production record with EXACT query used in API...\n');
    
    const queryUsedInAPI = {
      itemId: itemId,
      companyId: companyId,
      productionDate: productionDate,
      batchNo: batchno
    };
    
    console.log('Query object:', JSON.stringify(queryUsedInAPI, null, 2));
    
    const foundRecord = await ProductionBatch.findOne(queryUsedInAPI);
    
    if (foundRecord) {
      console.log('\n✅ FOUND existing production record:');
      console.log(`   ID: ${foundRecord._id}`);
      console.log(`   BatchNo: ${foundRecord.batchNo}`);
      console.log(`   Status: ${foundRecord.status}`);
      console.log(`   MouldingTime: ${foundRecord.mouldingTime}`);
      console.log('\n✅ NO DUPLICATE WOULD BE CREATED - API would update this record');
    } else {
      console.log('\n❌ NOT FOUND! API would CREATE A NEW RECORD!');
      console.log('⚠️  THIS WOULD CAUSE A DUPLICATE!');
      
      // Let's investigate why it wasn't found
      console.log('\n🔍 Debugging why record wasn\'t found...\n');
      
      // Check each field separately
      console.log('Testing individual fields:');
      
      const testQueries = [
        { name: 'By _id', query: { _id: testBatch._id } },
        { name: 'By batchNo only', query: { batchNo: batchno } },
        { name: 'By itemId only', query: { itemId: itemId } },
        { name: 'By companyId only', query: { companyId: companyId } },
        { name: 'By productionDate only', query: { productionDate: productionDate } },
        { name: 'By itemId + batchNo', query: { itemId: itemId, batchNo: batchno } },
        { name: 'By itemId + companyId', query: { itemId: itemId, companyId: companyId } },
        { name: 'By itemId + companyId + batchNo', query: { itemId: itemId, companyId: companyId, batchNo: batchno } }
      ];
      
      for (const test of testQueries) {
        const result = await ProductionBatch.findOne(test.query);
        console.log(`   ${test.name}: ${result ? '✅ FOUND' : '❌ NOT FOUND'}`);
      }
      
      // Check date comparison issue
      console.log('\n🔍 Checking date comparison issue:');
      console.log(`   API productionDate: ${productionDate.toISOString()}`);
      console.log(`   Batch productionDate: ${testBatch.productionDate.toISOString()}`);
      console.log(`   Dates equal: ${productionDate.getTime() === testBatch.productionDate.getTime()}`);
    }
    
    // Step 4: Check for potential duplicates with similar batchNo
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 CHECKING FOR EXISTING DUPLICATES WITH SAME BATCHNO');
    console.log('═'.repeat(80) + '\n');
    
    const sameBatchNo = await ProductionBatch.find({
      batchNo: batchno
    });
    
    console.log(`Found ${sameBatchNo.length} records with batchNo "${batchno}":\n`);
    
    sameBatchNo.forEach((batch, idx) => {
      console.log(`   ${idx + 1}. ID: ${batch._id}`);
      console.log(`      ItemID: ${batch.itemId}`);
      console.log(`      CompanyID: ${batch.companyId}`);
      console.log(`      ProductionDate: ${batch.productionDate}`);
      console.log(`      MouldingTime: ${batch.mouldingTime || 'Not set'}`);
      console.log(`      CreatedAt: ${batch.createdAt}`);
      console.log('');
    });
    
    if (sameBatchNo.length > 1) {
      console.log('⚠️  DUPLICATES DETECTED! Multiple records with same batch number');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

simulateApprovalAndMoulding();
