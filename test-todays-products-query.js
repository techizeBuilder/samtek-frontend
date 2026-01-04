import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DispatchSchema = new mongoose.Schema({}, { strict: false, collection: 'dispatches' });
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const salesmanId = '692eb4fa6d45dd9362c79e39';
    const customerId = '693f88f99dfbeecd8d37e3ae';

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    console.log('\n📅 Testing with date range:');
    console.log('Start:', startOfDay);
    console.log('End:', endOfDay);

    // Test the actual query that getTodaysProducts uses
    const query = {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'updated', 'approved', 'dispatched'] }
    };

    if (salesmanId) {
      query.salesPerson = new mongoose.Types.ObjectId(salesmanId);
    }
    if (customerId) {
      query.customer = new mongoose.Types.ObjectId(customerId);
    }

    console.log('\n🔍 Query:', JSON.stringify(query, null, 2));

    const results = await Dispatch.find(query)
      .sort({ createdAt: -1 });

    console.log(`\n✅ Found ${results.length} results`);

    if (results.length > 0) {
      console.log('\n📦 First result:', {
        _id: results[0]._id,
        productName: results[0].productName,
        salesPerson: results[0].salesPerson,
        customer: results[0].customer,
        indentQty: results[0].totalIndentQuantityOrdersForTheDay,
        qtyIssued: results[0].qtyIssued,
        status: results[0].status
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testQuery();
