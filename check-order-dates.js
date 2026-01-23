import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './server/models/Order.js';

dotenv.config();

const checkOrderDates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const salesPersonId = '69368e1ff437ad03e60df715';
    const customerId = '6959e6f24024449be43063ca';

    // Find orders for this sales person + customer
    const orders = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId
    })
    .select('orderDate createdAt')
    .lean();

    console.log('\n📦 Found orders:', orders.length);
    console.log('\n🔍 Order dates:');
    
    orders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log('  orderDate:', order.orderDate);
      console.log('  orderDate type:', typeof order.orderDate);
      console.log('  orderDate instanceof Date:', order.orderDate instanceof Date);
      console.log('  createdAt:', order.createdAt);
      console.log('  createdAt type:', typeof order.createdAt);
    });

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('\n📅 Today\'s date range:');
    console.log('  From:', today);
    console.log('  To:', tomorrow);

    // Try the query
    const todayOrders = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId,
      orderDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .select('orderDate createdAt')
    .lean();

    console.log('\n✅ Orders matching today\'s date query:', todayOrders.length);

    // Try with string format
    const todayString = today.toISOString().split('T')[0];
    console.log('\n📅 Today as string:', todayString);

    const ordersWithString = await Order.find({
      salesPerson: salesPersonId,
      customer: customerId,
      orderDate: todayString
    })
    .select('orderDate createdAt')
    .lean();

    console.log('✅ Orders matching today\'s string query:', ordersWithString.length);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkOrderDates();
