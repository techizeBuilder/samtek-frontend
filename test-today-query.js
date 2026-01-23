import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './server/models/Order.js';

dotenv.config();

const testTodayQuery = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const salesPersonId = '69368e1ff437ad03e60df715';
    const customerId = '6959e6f24024449be43063ca';

    // Get today's date in YYYY-MM-DD format (same as updated API)
    const todayString = new Date().toISOString().split('T')[0];
    
    // Create date range for today in UTC
    const todayStart = new Date(todayString + 'T00:00:00.000Z');
    const todayEnd = new Date(todayString + 'T23:59:59.999Z');

    console.log('\n📅 Today:', todayString);
    console.log('📅 Date range (UTC):', { from: todayStart, to: todayEnd });

    // Find today's orders
    const orders = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId,
      orderDate: {
        $gte: todayStart,
        $lte: todayEnd
      }
    })
    .select('orderDate createdAt')
    .populate({
      path: 'products.product',
      select: 'name code category unit batch salePrice'
    })
    .lean();

    console.log('\n✅ Orders found for today:', orders.length);
    
    orders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log('  orderDate:', order.orderDate);
      console.log('  createdAt:', order.createdAt);
      console.log('  products:', order.products?.length || 0);
    });

    // Show all orders to compare
    const allOrders = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId
    })
    .select('orderDate createdAt')
    .sort({ orderDate: -1 })
    .lean();

    console.log('\n📦 All orders for this combination:');
    allOrders.forEach((order, index) => {
      const dateStr = new Date(order.orderDate).toISOString().split('T')[0];
      const isToday = dateStr === todayString;
      console.log(`  ${index + 1}. ${dateStr} ${isToday ? '👈 TODAY' : ''}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testTodayQuery();
