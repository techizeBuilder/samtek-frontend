const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://***:***@cluster0.by2qy6x.mongodb.net/production-erp';

// Order schema similar to the actual model
const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function checkOrderStructure() {
  try {
    console.log('🔍 CHECKING ORDER DOCUMENT STRUCTURE\n');
    
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to database\n');
    }

    // Get the most recent order
    const recentOrder = await Order.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!recentOrder) {
      console.log('❌ No orders found in database!');
      return;
    }

    console.log('📄 RECENT ORDER DOCUMENT STRUCTURE:');
    console.log('═'.repeat(60));
    console.log(JSON.stringify(recentOrder, null, 2));

    // Check specific fields
    console.log('\n✅ FIELD VERIFICATION:');
    console.log('═'.repeat(60));
    
    const fieldsToCheck = ['_id', 'createdAt', 'totalAmount', 'total', 'grandTotal', 'amount', 'quantity', 'itemsCount', 'companyId', 'company', 'status', 'products'];
    
    fieldsToCheck.forEach(field => {
      const value = recentOrder[field];
      const status = value !== undefined ? '✅' : '❌';
      const type = typeof value;
      console.log(`${status} ${field.padEnd(15)} | Type: ${type.padEnd(10)} | Value: ${value}`);
    });

    // Get 5 orders to check for consistency
    console.log('\n\n📊 CHECKING 5 RECENT ORDERS FOR FIELD CONSISTENCY:');
    console.log('═'.repeat(60));
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentOrders.forEach((order, idx) => {
      console.log(`\n[${idx + 1}] Order: ${order._id || order.orderCode || 'N/A'}`);
      console.log(`    createdAt: ${order.createdAt}`);
      console.log(`    totalAmount: ${order.totalAmount}`);
      console.log(`    total: ${order.total}`);
      console.log(`    grandTotal: ${order.grandTotal}`);
      console.log(`    amount: ${order.amount}`);
      console.log(`    companyId: ${order.companyId}`);
      console.log(`    company: ${order.company}`);
      console.log(`    status: ${order.status}`);
    });

    // Check where orders from Feb 16 are stored
    console.log('\n\n📅 CHECKING ORDERS FROM 2026-02-16:');
    console.log('═'.repeat(60));
    
    const feb16start = new Date('2026-02-16T00:00:00Z');
    const feb16end = new Date('2026-02-16T23:59:59Z');

    const feb16Orders = await Order.find({
      createdAt: { $gte: feb16start, $lte: feb16end }
    }).lean();

    console.log(`Found ${feb16Orders.length} orders on 2026-02-16\n`);

    feb16Orders.forEach((order, idx) => {
      console.log(`[${idx + 1}] ${order._id || order.orderCode}`);
      console.log(`    totalAmount: ${order.totalAmount}`);
      console.log(`    createdAt: ${order.createdAt}`);
      console.log(`    status: ${order.status}\n`);
    });

    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkOrderStructure();
