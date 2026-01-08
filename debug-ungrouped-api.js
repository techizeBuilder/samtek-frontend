import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductDetailsDailySummary from './server/models/ProductDetailsDailySummary.js';

dotenv.config();

async function debugUngroupedAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    console.log('🔍 DEBUGGING WHY API RETURNS 0 ITEMS\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Test 1: Check total records for today (NO FILTER)
    console.log('📊 Test 1: Total ProductDetailsDailySummary records for today (NO COMPANY FILTER)');
    const allTodayRecords = await ProductDetailsDailySummary.find({
      date: today
    }).lean();
    console.log(`   Result: ${allTodayRecords.length} records found`);
    console.log('');
    
    // Test 2: Group by companyId
    console.log('📊 Test 2: Records grouped by companyId');
    const grouped = await ProductDetailsDailySummary.aggregate([
      { $match: { date: today } },
      { 
        $group: { 
          _id: '$companyId',
          count: { $sum: 1 }
        } 
      }
    ]);
    grouped.forEach(g => {
      console.log(`   Company ID: ${g._id || 'NULL'} → ${g.count} records`);
    });
    console.log('');
    
    // Test 3: Check with each possible companyId
    const companyIds = grouped.map(g => g._id);
    
    console.log('📊 Test 3: Testing API query with each company ID\n');
    
    for (const companyId of companyIds) {
      console.log(`   Testing with companyId: ${companyId || 'NULL'}`);
      
      const query = {
        date: today
      };
      
      if (companyId) {
        query.companyId = companyId;
      } else {
        // If companyId is null, we need to check for null/undefined
        query.companyId = { $in: [null, undefined] };
      }
      
      const records = await ProductDetailsDailySummary.find(query).lean();
      console.log(`   → Query result: ${records.length} records`);
      
      if (records.length > 0) {
        console.log(`   → Sample items:`);
        records.slice(0, 3).forEach(r => {
          console.log(`      • ${r.productName || 'Unknown'} - productionFinalBatches: ${r.productionFinalBatches || 0}`);
        });
      }
      console.log('');
    }
    
    // Test 4: Show what the API is actually filtering
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n🎯 THE ISSUE:\n');
    console.log('The API endpoint uses this query:');
    console.log('```javascript');
    console.log('ProductDetailsDailySummary.find({');
    console.log('  companyId: req.user.companyId,  // ← THIS IS THE FILTER');
    console.log('  date: today');
    console.log('})');
    console.log('```\n');
    
    console.log('❌ If req.user.companyId is:');
    console.log('   • NULL or undefined → Query returns 0 records');
    console.log('   • Different from the actual data → Query returns 0 records');
    console.log('   • Not authenticated → Error or 0 records\n');
    
    console.log('✅ SOLUTION:');
    console.log('   You must login with a user that has:');
    console.log(`   companyId = "${companyIds[0]}" (the company with ${grouped[0].count} records)\n`);
    
    // Test 5: Check if there are any NULL companyIds
    const nullCompanyRecords = await ProductDetailsDailySummary.find({
      date: today,
      $or: [
        { companyId: null },
        { companyId: { $exists: false } }
      ]
    }).lean();
    
    if (nullCompanyRecords.length > 0) {
      console.log('⚠️  WARNING:');
      console.log(`   Found ${nullCompanyRecords.length} records with NULL companyId`);
      console.log('   These records will NEVER show up in the API!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

debugUngroupedAPI();
