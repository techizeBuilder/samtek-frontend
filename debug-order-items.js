import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
const Order = mongoose.model('Order', OrderSchema);

const OrderItemSchema = new mongoose.Schema({}, { strict: false, collection: 'orderitems' });
const OrderItem = mongoose.model('OrderItem', OrderItemSchema);

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    // Get all orders for today
    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['approved', 'confirmed'] }
    }).lean();

    console.log(`\n📋 Total orders for today: ${orders.length}\n`);

    if (orders.length > 0) {
      console.log('📦 First order structure:', JSON.stringify(orders[0], null, 2));
    }

    // Check order items
    const orderIds = orders.map(o => o._id);
    const orderItems = await OrderItem.find({
      orderId: { $in: orderIds }
    }).lean();

    console.log(`\n\n📦 Total order items: ${orderItems.length}`);
    if (orderItems.length > 0) {
      console.log('\n📦 First order item structure:', JSON.stringify(orderItems[0], null, 2));
    }

    // Build product map
    const productOrdersMap = {};
    
    for (const orderItem of orderItems) {
      const order = orders.find(o => o._id.toString() === orderItem.orderId.toString());
      if (!order) continue;

      const productId = orderItem.productId?.toString();
      if (!productId) continue;

      if (!productOrdersMap[productId]) {
        productOrdersMap[productId] = [];
      }

      productOrdersMap[productId].push({
        salesPerson: order.salesPerson,
        customer: order.customer,
        quantity: orderItem.quantity,
        productName: orderItem.productName
      });
    }

    console.log('\n\n📦 Product-wise breakdown by salesperson and customer:\n');
    
    Object.entries(productOrdersMap).forEach(([productId, entries]) => {
      console.log(`\n🔷 Product ID: ${productId}`);
      console.log(`   Product Name: ${entries[0].productName}`);
      console.log(`   Total orders: ${entries.length}`);
      
      const totalQty = entries.reduce((sum, e) => sum + e.quantity, 0);
      console.log(`   Total Indent Quantity: ${totalQty}`);
      
      entries.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. Salesperson: ${entry.salesPerson}, Customer: ${entry.customer}, Qty: ${entry.quantity}`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

debug();
