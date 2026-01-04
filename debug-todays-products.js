import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DispatchSchema = new mongoose.Schema({}, { strict: false, collection: 'dispatches' });
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

const CustomerSchema = new mongoose.Schema({}, { strict: false, collection: 'customers' });
const Customer = mongoose.model('Customer', CustomerSchema);

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const salesmanId = '692eb4fa6d45dd9362c79e39';
    const customerId = '693f88f99dfbeecd8d37e3ae';

    console.log('\n🔍 Checking parameters:');
    console.log('salesmanId:', salesmanId);
    console.log('customerId:', customerId);

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    console.log('\n👤 Customer found:', customer ? {
      _id: customer._id,
      name: customer.name,
      salesperson: customer.salesperson
    } : 'NOT FOUND');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    console.log('\n📅 Today\'s date range:');
    console.log('Start:', startOfDay);
    console.log('End:', endOfDay);

    // Check all dispatch records for today
    const allTodayDispatches = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).limit(10);

    console.log(`\n📦 Total dispatches for today: ${allTodayDispatches.length}`);
    if (allTodayDispatches.length > 0) {
      console.log('Sample dispatch:', {
        _id: allTodayDispatches[0]._id,
        date: allTodayDispatches[0].date,
        salesPerson: allTodayDispatches[0].salesPerson,
        customer: allTodayDispatches[0].customer,
        status: allTodayDispatches[0].status,
        productName: allTodayDispatches[0].productName,
        company: allTodayDispatches[0].company
      });
    }

    // Check with just salesmanId
    const withSalesman = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      salesPerson: salesmanId
    });
    console.log(`\n👨‍💼 Dispatches with salesmanId: ${withSalesman.length}`);

    // Check with just customerId
    const withCustomer = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      customer: customerId
    });
    console.log(`\n👤 Dispatches with customerId: ${withCustomer.length}`);

    // Check with both
    const withBoth = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      salesPerson: salesmanId,
      customer: customerId
    });
    console.log(`\n👥 Dispatches with both: ${withBoth.length}`);

    // Check status distribution for today
    const statusCounts = await Dispatch.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('\n📊 Status distribution for today:', statusCounts);

    // Check all unique salesPerson IDs for today
    const uniqueSalespeople = await Dispatch.distinct('salesPerson', {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    console.log('\n👔 Unique salespeople today:', uniqueSalespeople);

    // Check all unique customer IDs for today
    const uniqueCustomers = await Dispatch.distinct('customer', {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    console.log('\n🏢 Unique customers today:', uniqueCustomers);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debug();
