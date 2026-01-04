import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
const Order = mongoose.model('Order', OrderSchema);

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    // Get all orders for today with their items
    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['approved', 'confirmed'] }
    });

    console.log(`\n📋 Total orders for today: ${orders.length}\n`);

    // Build a map of productId -> [{salesPerson, customer, quantity}]
    const productOrdersMap = {};

    orders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const productId = item.productId?._id || item.productId;
          if (!productId) return;

          const key = productId.toString();
          if (!productOrdersMap[key]) {
            productOrdersMap[key] = [];
          }

          productOrdersMap[key].push({
            salesPerson: order.salesPerson,
            customer: order.customer,
            quantity: item.quantity,
            productName: item.productName || item.productId?.name
          });
        });
      }
    });

    console.log('📦 Product-wise breakdown by salesperson and customer:\n');
    
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
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debug();
