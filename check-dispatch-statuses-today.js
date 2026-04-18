import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI);

const DispatchModule = await import('./server/models/Dispatch.js');
const Dispatch = DispatchModule.default;

// Get unique statuses
const statuses = await Dispatch.distinct('status');
console.log('📊 All statuses in database:', statuses);

// Get today's date range (UTC)
const today = new Date();
const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

console.log('\n📅 Today\'s UTC date range:');
console.log('   Start:', startOfDay);
console.log('   End:', endOfDay);

// Count by status for today
console.log('\n📊 Dispatch count by status for TODAY (UTC):');
for (const status of statuses) {
  const count = await Dispatch.countDocuments({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: status
  });
  console.log(`   ${status}: ${count}`);
}

// Count what getTodaysProducts would return
const getTodaysProductsStatuses = ['pending', 'updated', 'approved', 'dispatched'];
const count = await Dispatch.countDocuments({
  date: { $gte: startOfDay, $lte: endOfDay },
  status: { $in: getTodaysProductsStatuses }
});

console.log(`\n✅ getTodaysProducts would return: ${count} items (statuses: ${getTodaysProductsStatuses.join(', ')})`);

// Count all regardless of status
const countAll = await Dispatch.countDocuments({
  date: { $gte: startOfDay, $lte: endOfDay }
});
console.log(`📊 Total dispatches today (all statuses): ${countAll}`);

// Get excluded statuses
const excludedStatuses = statuses.filter(s => !getTodaysProductsStatuses.includes(s));
if (excludedStatuses.length > 0) {
  console.log(`\n⚠️ Statuses NOT included in getTodaysProducts: ${excludedStatuses.join(', ')}`);
  for (const status of excludedStatuses) {
    const count = await Dispatch.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: status
    });
    console.log(`   ${status}: ${count}`);
  }
}

await mongoose.disconnect();
