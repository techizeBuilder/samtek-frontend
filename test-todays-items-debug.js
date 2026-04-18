import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

// Connect to DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise_inventory';
await mongoose.connect(MONGODB_URI);

const { Dispatch } = await import('./server/models/Dispatch.js');

// Check today's data (UTC)
const today = new Date();
console.log('\n📅 Today\'s date (local):', today);
console.log('📅 Today\'s date (UTC):', new Date(today.toISOString()));

// UTC time calculation
const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

console.log('📅 Start of day (UTC):', startOfDay);
console.log('📅 End of day (UTC):', endOfDay);

// Local time calculation (OLD - wrong way)
const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

console.log('📅 Start of day (LOCAL):', startOfDayLocal);
console.log('📅 End of day (LOCAL):', endOfDayLocal);

// Get company from environment or use default
const testCompanyId = 'ManuERP'; // Update if needed

// Query with UTC
console.log('\n🔍 Querying dispatches with UTC time range...');
const dispatchesUTC = await Dispatch.find({
  date: { $gte: startOfDay, $lte: endOfDay },
  company: testCompanyId
}).select('date productName status company dcno').lean();

console.log(`✅ Found ${dispatchesUTC.length} dispatches with UTC time range`);
if (dispatchesUTC.length > 0) {
  console.log('📋 Sample dispatches:');
  dispatchesUTC.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.productName} - ${d.date} - Status: ${d.status}`);
  });
}

// Query with local time (old way)
console.log('\n🔍 Querying dispatches with LOCAL time range (old way)...');
const dispatchesLocal = await Dispatch.find({
  date: { $gte: startOfDayLocal, $lte: endOfDayLocal },
  company: testCompanyId
}).select('date productName status company dcno').lean();

console.log(`✅ Found ${dispatchesLocal.length} dispatches with LOCAL time range`);
if (dispatchesLocal.length > 0) {
  console.log('📋 Sample dispatches:');
  dispatchesLocal.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.productName} - ${d.date} - Status: ${d.status}`);
  });
}

// Check yesterday's data
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStart = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0, 0));
const yesterdayEnd = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59, 999));

console.log('\n🔍 Querying dispatches for YESTERDAY...');
const dispatchesYesterday = await Dispatch.find({
  date: { $gte: yesterdayStart, $lte: yesterdayEnd },
  company: testCompanyId
}).select('date productName status company dcno').lean();

console.log(`✅ Found ${dispatchesYesterday.length} dispatches for yesterday`);

// Comparison
console.log('\n📊 SUMMARY:');
console.log(`   Today (UTC): ${dispatchesUTC.length} dispatches`);
console.log(`   Today (LOCAL): ${dispatchesLocal.length} dispatches`);
console.log(`   Yesterday: ${dispatchesYesterday.length} dispatches`);
console.log(`   Difference (UTC vs LOCAL): ${dispatchesUTC.length - dispatchesLocal.length}`);

// Check all statuses
const allStatuses = await Dispatch.find({ company: testCompanyId })
  .select('status date').lean();
const statusCounts = {};
allStatuses.forEach(d => {
  statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
});
console.log('\n📊 Status distribution for company:');
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`   ${status}: ${count}`);
});

await mongoose.disconnect();
console.log('\n✅ Done!');
