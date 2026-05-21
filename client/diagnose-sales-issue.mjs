import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://***:***@cluster0.by2qy6x.mongodb.net/production-erp';

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

async function diagnoseIssue() {
  try {
    console.log('🔍 DIAGNOSING SALES TREND ISSUE\n');
    
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to database\n');
    }

    // Get date range for current month (Feb 2026)
    const today = new Date('2026-02-17');
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log('📅 DATE RANGE FOR CURRENT-MONTH:');
    console.log('═'.repeat(70));
    console.log(`Start Date (Local): ${startDate.toString()}`);
    console.log(`End Date (Local): ${endDate.toString()}`);
    console.log(`Start Date (UTC): ${startDate.toUTCString()}`);
    console.log(`End Date (UTC): ${endDate.toUTCString()}\n`);

    // Query with this date range
    console.log('🔎 QUERYING ORDERS WITH THIS DATE RANGE:');
    console.log('═'.repeat(70));
    
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    console.log(`Found: ${orders.length} orders\n`);

    if (orders.length === 0) {
      console.log('⚠️  NO ORDERS FOUND! Checking what dates exist in database...\n');
      
      const allOrders = await Order.find().sort({ createdAt: -1 }).limit(10).lean();
      console.log('📋 Last 10 orders in database:');
      allOrders.forEach((order, idx) => {
        console.log(`${idx + 1}. Created: ${order.createdAt} | Amount: ${order.totalAmount} | Status: ${order.status}`);
      });
      
      return;
    }

    // If orders found, calculate sales trend like the backend does
    console.log('✅ ORDERS FOUND! Calculating sales trend...\n');

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const salesTrendData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const dayOrders = orders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= dayStart && oDate < dayEnd;
      });

      const daySalesTotal = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      salesTrendData.push({
        day: days[new Date(date).getDay()],
        date: date.toISOString().split('T')[0],
        orders: dayOrders.length,
        sales: daySalesTotal,
        salesInLakhs: Math.round((daySalesTotal / 100000) * 100) / 100
      });

      if (dayOrders.length > 0) {
        console.log(`${date.toISOString().split('T')[0]} (${days[new Date(date).getDay()]}): ${dayOrders.length} orders | ₹${daySalesTotal}`);
      } else {
        console.log(`${date.toISOString().split('T')[0]} (${days[new Date(date).getDay()]}): 0 orders | ₹0`);
      }
    }

    console.log('\n📊 FINAL SALES TREND DATA:');
    console.log('═'.repeat(70));
    console.log(JSON.stringify(salesTrendData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

diagnoseIssue();
