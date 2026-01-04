import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
const Order = mongoose.model('Order', OrderSchema);

const DispatchSchema = new mongoose.Schema({}, { strict: false, collection: 'dispatches' });
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    // Check orders for today
    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).limit(5);

    console.log(`\n📋 Orders for today: ${orders.length}`);
    if (orders.length > 0) {
      orders.forEach((order, idx) => {
        console.log(`\n📦 Order ${idx + 1}:`, {
          _id: order._id,
          orderDate: order.orderDate,
          salesPerson: order.salesPerson,
          customer: order.customer,
          status: order.status,
          items: order.items?.length || 0
        });
        if (order.items && order.items.length > 0) {
          console.log('  First item:', {
            productId: order.items[0].productId,
            productName: order.items[0].productName,
            quantity: order.items[0].quantity
          });
        }
      });
    }

    // Check dispatch entries for today
    const dispatches = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).limit(5);

    console.log(`\n\n📦 Dispatches for today: ${dispatches.length}`);
    if (dispatches.length > 0) {
      dispatches.forEach((dispatch, idx) => {
        console.log(`\n📦 Dispatch ${idx + 1}:`, {
          _id: dispatch._id,
          productId: dispatch.productId,
          productName: dispatch.productName,
          salesPerson: dispatch.salesPerson,
          customer: dispatch.customer,
          status: dispatch.status,
          totalIndentQuantityOrdersForTheDay: dispatch.totalIndentQuantityOrdersForTheDay
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debug();
