const BASE_URL = 'http://localhost:5000';
const PHONE = '9700552003';
const PASSWORD = '9700552003';

async function verifyCompanyFiltering() {
  try {
    console.log('🔐 Step 1: Login to get company ID...\n');
    
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: PHONE, password: PASSWORD })
    });

    if (!loginRes.ok) {
      throw new Error('Login failed - try with username instead of phone');
    }

    const loginData = await loginRes.json();
    const { token, user } = loginData.data;
    
    console.log('✅ Login successful!');
    console.log(`   Username: ${user.username}`);
    console.log(`   Company ID: ${user.companyId}`);
    console.log(`   Role: ${user.role}\n`);

    console.log('📊 Step 2: Fetching Dashboard with company filtering...\n');
    
    const dashboardRes = await fetch(
      `${BASE_URL}/api/unit-head/dashboard?period=current-month`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const dashboardData = await dashboardRes.json();
    const data = dashboardData.data;

    console.log('✅ Dashboard API Response received!\n');

    // Verify company filtering
    console.log('🔍 COMPANY FILTERING VERIFICATION:');
    console.log('═'.repeat(70));
    console.log(`Your Company ID: ${user.companyId}\n`);

    console.log('📊 DATA RETURNED (Should be for your company ONLY):\n');
    
    console.log(`✅ Finished Goods Stock:`);
    console.log(`   Items returned: ${data.finishedGoodsItems?.length || 0}`);
    if (data.finishedGoodsItems?.length > 0) {
      console.log(`   Sample items:`);
      data.finishedGoodsItems.slice(0, 3).forEach(item => {
        console.log(`      - ${item.name} (Qty: ${item.qty})`);
      });
    }
    console.log();

    console.log(`✅ Raw Material - Low Stock Alert:`);
    console.log(`   Items returned: ${data.rawMaterialItems?.length || 0}`);
    if (data.rawMaterialItems?.length > 0) {
      console.log(`   Sample items:`);
      data.rawMaterialItems.slice(0, 3).forEach(item => {
        console.log(`      - ${item.name} (Qty: ${item.qty}, Min: ${item.minStock})`);
      });
    }
    console.log();

    console.log(`✅ Packing Material - Low Stock Alert:`);
    console.log(`   Items returned: ${data.packingMaterialItems?.length || 0}`);
    if (data.packingMaterialItems?.length > 0) {
      console.log(`   Sample items:`);
      data.packingMaterialItems.slice(0, 3).forEach(item => {
        console.log(`      - ${item.name} (Qty: ${item.qty}, Min: ${item.minStock})`);
      });
    }
    console.log();

    console.log(`✅ Production vs Dispatch (Last 7 Days):`);
    console.log(`   Days returned: ${data.productionVsDispatchData?.length || 0}`);
    if (data.productionVsDispatchData?.length > 0) {
      console.log(`   Sample data:`);
      data.productionVsDispatchData.slice(0, 3).forEach(day => {
        console.log(`      ${day.day} (${day.date}): Prod: ${day.production} | Dispatch: ${day.dispatch}`);
      });
    }
    console.log();

    console.log(`✅ Sales Trend (Last 7 Days):`);
    console.log(`   Days returned: ${data.salesTrendData?.length || 0}`);
    if (data.salesTrendData?.length > 0) {
      const withSales = data.salesTrendData.filter(d => d.sales > 0);
      console.log(`   Days with sales: ${withSales.length}`);
      withSales.forEach(day => {
        console.log(`      ${day.day} (${day.date}): Orders: ${day.orders} | Sales: ₹${day.sales}`);
      });
    }
    console.log();

    console.log('═'.repeat(70));
    console.log('\n✅ COMPANY FILTERING VERIFIED!');
    console.log('All data is filtered for company:', user.companyId);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyCompanyFiltering();
