const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const PHONE = '9700552003';
const PASSWORD = '9700552003';

async function testDashboard() {
  try {
    console.log('🔐 Step 1: Login with credentials...\n');
    
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      phone: PHONE,
      password: PASSWORD
    });

    const { token, user } = loginResponse.data.data;
    console.log('✅ Login successful!');
    console.log(`   User: ${user.username} (${user.phone})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   CompanyId: ${user.companyId}\n`);

    console.log('📊 Step 2: Fetching Dashboard Data...\n');
    
    // Get dashboard data
    const dashboardResponse = await axios.get(
      `${BASE_URL}/api/unit-head/dashboard?period=current-month`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = dashboardResponse.data.data;

    console.log('✅ Dashboard API Response received!\n');

    // Log all key metrics
    console.log('📈 KEY METRICS:');
    console.log('═'.repeat(70));
    console.log(`Monthly Orders: ${data.monthlyOrders}`);
    console.log(`Monthly Revenue: ₹${data.monthlyRevenue}`);
    console.log(`Monthly Revenue (Formatted): ${data.monthlyRevenueFormatted}`);
    console.log(`Today Indent: ₹${data.todayIndentValue}`);
    console.log(`Dispatch Value: ₹${data.dispatchValue}`);
    console.log(`Total Customers: ${data.totalCustomers}`);
    console.log(`Active Sales Persons: ${data.activeSalesPersons}\n`);

    // Log Sales Trend Data specifically
    console.log('💹 SALES TREND DATA (Last 7 Days):');
    console.log('═'.repeat(70));
    console.log(`Array Length: ${data.salesTrendData.length}\n`);

    if (data.salesTrendData && data.salesTrendData.length > 0) {
      console.log('Full Data:');
      data.salesTrendData.forEach((item, idx) => {
        console.log(`[${idx}] ${item.day} (${item.date})`);
        console.log(`    Orders: ${item.orders}`);
        console.log(`    Sales: ₹${item.sales}`);
        console.log(`    Sales (Lakhs): ${item.salesInLakhs}\n`);
      });
    } else {
      console.log('❌ salesTrendData is empty!\n');
    }

    // Log debug info
    if (data._debug) {
      console.log('🔍 DEBUG INFO:');
      console.log('═'.repeat(70));
      console.log(JSON.stringify(data._debug, null, 2));
      console.log();
    }

    // Log inventory counts
    console.log('📦 INVENTORY COUNTS:');
    console.log('═'.repeat(70));
    console.log(`Finished Goods Items: ${data.finishedGoodsItems?.length || 0}`);
    console.log(`Low Stock Items: ${data.lowStockItems?.length || 0}`);
    console.log(`Raw Material Items: ${data.rawMaterialItems?.length || 0}`);
    console.log(`Packing Material Items: ${data.packingMaterialItems?.length || 0}`);
    console.log(`Orders in response: ${data.orders?.length || 0}\n`);

    // Log first order details if available
    if (data.orders && data.orders.length > 0) {
      console.log('📋 SAMPLE ORDER (First in response):');
      console.log('═'.repeat(70));
      console.log(JSON.stringify(data.orders[0], null, 2));
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:');
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.message || error.response.statusText}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testDashboard();
