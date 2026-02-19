import mongoose from 'mongoose';
import Order from './server/models/Order.js';
import connectDB from './server/config/database.js';

async function debugSalesTrend() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Get current date and set date range for current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    console.log('\n📅 Date Range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // 1. Get ALL orders in the period
    const allOrders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('orderCode totalAmount createdAt companyId company status').lean();

    console.log('\n📊 All Orders in Period:', allOrders.length);
    allOrders.forEach(order => {
      console.log(`  - ${order.orderCode}: ₹${order.totalAmount}, Date: ${order.createdAt.toISOString().split('T')[0]}, companyId: ${order.companyId}, status: ${order.status}`);
    });

    // 2. Group by date and calculate daily totals
    const dailyTotals = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    allOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          day: days[new Date(order.createdAt).getDay()],
          date: dateKey,
          orders: 0,
          sales: 0,
          orderDetails: []
        };
      }
      dailyTotals[dateKey].orders += 1;
      dailyTotals[dateKey].sales += order.totalAmount;
      dailyTotals[dateKey].orderDetails.push({
        code: order.orderCode,
        amount: order.totalAmount,
        status: order.status
      });
    });

    console.log('\n💰 Daily Sales Breakdown:');
    Object.keys(dailyTotals).sort().forEach(date => {
      const daily = dailyTotals[date];
      console.log(`\n  📈 ${daily.day} (${daily.date}):`);
      console.log(`     Orders: ${daily.orders}`);
      console.log(`     Total Sales: ₹${daily.sales}`);
      console.log(`     In Lakhs: ${(daily.sales / 100000).toFixed(2)}L`);
      daily.orderDetails.forEach(od => {
        console.log(`       - ${od.code}: ₹${od.amount} (${od.status})`);
      });
    });

    // 3. Generate last 7 days sales trend (like the API)
    console.log('\n\n📊 Last 7 Days Sales Trend:');
    const salesTrendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dayOrders = allOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= dayStart && oDate < dayEnd;
      });

      const daySalesTotal = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const salesInLakhs = Math.round((daySalesTotal / 100000) * 100) / 100;

      salesTrendData.push({
        day: days[date.getDay()],
        date: date.toISOString().split('T')[0],
        orders: dayOrders.length,
        sales: daySalesTotal,
        salesInLakhs: salesInLakhs
      });

      console.log(`  ${days[date.getDay()]} (${date.toISOString().split('T')[0]}): ${dayOrders.length} orders, ₹${daySalesTotal} (${salesInLakhs}L)`);
    }

    console.log('\n✅ Sales Trend Data (JSON):');
    console.log(JSON.stringify(salesTrendData, null, 2));

    // 4. Check company filtering
    console.log('\n\n🏢 Company Check:');
    const companyIds = new Set(allOrders.map(o => o.companyId?.toString()).filter(Boolean));
    console.log(`  Unique company IDs: ${Array.from(companyIds).join(', ')}`);

    // 5. Check order statuses
    console.log('\n📋 Order Status Breakdown:');
    const statusCounts = {};
    allOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n✅ Debug complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugSalesTrend();
