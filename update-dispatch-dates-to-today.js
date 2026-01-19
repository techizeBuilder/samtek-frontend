import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise';

async function updateDispatchDates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Dispatch = mongoose.model('Dispatch', new mongoose.Schema({}, { strict: false, collection: 'dispatches' }));

    // Get today's date (start of day)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

    console.log(`📅 Today's date: ${todayStart}\n`);

    // Find all recent dispatches (last 7 days)
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const recentDispatches = await Dispatch.find({
      date: { $gte: last7Days }
    }).lean();

    console.log(`📊 Found ${recentDispatches.length} dispatches in last 7 days\n`);

    if (recentDispatches.length === 0) {
      console.log('❌ No recent dispatches to update');
      await mongoose.disconnect();
      return;
    }

    // Show what will be updated
    console.log('📋 Dispatches to be updated:');
    recentDispatches.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.productGroup} - Current date: ${d.date}`);
    });

    console.log(`\n🔄 Updating all ${recentDispatches.length} dispatches to today (${todayStart})...\n`);

    // Update all to today
    const result = await Dispatch.updateMany(
      { date: { $gte: last7Days } },
      { $set: { date: todayStart } }
    );

    console.log('✅ Update completed!');
    console.log(`   Modified: ${result.modifiedCount} dispatches`);
    console.log(`   Matched: ${result.matchedCount} dispatches\n`);

    // Verify
    const todayDispatches = await Dispatch.countDocuments({
      date: todayStart
    });

    console.log(`✅ Verification: ${todayDispatches} dispatches now set to today's date\n`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

updateDispatchDates();
