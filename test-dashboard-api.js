import fetch from 'node-fetch';

const baseURL = 'http://localhost:5000';

async function testDashboard() {
  try {
    // First, try to login with a unit head user
    console.log('🔐 Step 1: Logging in...');

    // Try different unit head usernames
    const testUsers = [
      { username: 'admin', password: 'admin123' },
      { username: 'unithead', password: 'unit123' },
      { username: 'jashir_unit_head', password: '12345678' },
      { username: 'unit_head', password: '12345678' },
      { username: 'unitHead', password: '12345678' }
    ];

    let token = null;
    
    for (const user of testUsers) {
      try {
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });

        if (loginResponse.ok) {
          const result = await loginResponse.json();
          token = result.token;
          console.log(`✅ Login successful with user: ${user.username}`);
          console.log('Token:', token?.substring(0, 50) + '...');
          break;
        } else {
          const errorData = await loginResponse.text();
          console.log(`❌ Login failed for ${user.username}: ${loginResponse.status} - ${errorData.substring(0, 100)}`);
        }
      } catch (e) {
        console.log(`❌ Login error for ${user.username}:`, e.message);
      }
    }

    if (!token) {
      console.log('❌ Could not login with any unit head user');
      return;
    }

    // Now test the dashboard endpoints with different periods
    console.log('\n📊 Step 2: Testing Dashboard API...');
    
    for (const period of ['current-month', 'current-quarter', 'current-year']) {
      console.log(`\n📈 Testing period: ${period}`);
      
      const dashboardRes = await fetch(
        `${baseURL}/api/unit-head/dashboard?period=${period}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      console.log(`Response Status: ${dashboardRes.status}`);
      
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        
        if (data.data) {
          const d = data.data;
          console.log('✅ Dashboard data received:');
          console.log(`  - Monthly Orders: ${d.monthlyOrders}`);
          console.log(`  - Monthly Revenue: ₹${d.monthlyRevenue}`);
          console.log(`  - Today's Indent: ${d.todayIndentValue}`);
          console.log(`  - Dispatch Value: ${d.dispatchValue}`);
          console.log(`  - Dispatch Packs: ${d.dispatchPacks}`);
          console.log(`  - Damage Returns: ₹${d.damageReturnsValue}`);
          
          if (d._debug) {
            console.log('\n🔍 Debug info:');
            console.log(`  - Orders Count: ${d._debug.ordersCount}`);
            console.log(`  - Dispatches Count: ${d._debug.dispatchesCount}`);
            console.log(`  - Production Batches Count: ${d._debug.productionBatchesCount}`);
            console.log(`  - Damage Returns Count: ${d._debug.damageReturnsCount}`);
          }
          
          if (d.finishedGoodsItems?.length > 0) {
            console.log(`\n📦 Finished Goods Items: ${d.finishedGoodsItems.length}`);
          } else {
            console.log('⚠️  No finished goods items found');
          }
        } else {
          console.log('❌ No data in response:', JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await dashboardRes.text();
        console.log('❌ Error response:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testDashboard();
