import fetch from 'node-fetch';

async function testDashboard() {
  const baseURL = 'http://localhost:5000';
  
  try {
    // Step 1: Login to get a valid token
    console.log('📝 Logging in...');
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'jashir_unit_head',
        password: '12345678'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login data:', loginData);
    
    if (!loginData.token) {
      console.log('❌ Failed to get token');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Got token:', token.substring(0, 20) + '...');
    
    // Step 2: Test dashboard API
    console.log('\n🔍 Testing dashboard API...');
    const dashboardResponse = await fetch(`${baseURL}/api/unit-head/dashboard?period=current-month`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard response status:', dashboardResponse.status);
    console.log('Dashboard data:', JSON.stringify(dashboardData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDashboard();
