const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// You need a valid token - replace with your actual token from login
const TOKEN = 'your_auth_token_here'; // Get this from login response

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing Unit Head Dashboard API...\n');
    console.log(`📍 Endpoint: ${BASE_URL}/api/unit-head/dashboard?period=current-month\n`);

    const response = await axios.get(`${BASE_URL}/api/unit-head/dashboard?period=current-month`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const { data: dashboardData } = response.data;

    console.log('✅ API Response received successfully!\n');

    // Log the sales trend data specifically
    console.log('📊 SALES TREND DATA:');
    console.log('════════════════════════════════════════');
    if (dashboardData.salesTrendData && dashboardData.salesTrendData.length > 0) {
      console.log(`Total entries: ${dashboardData.salesTrendData.length}\n`);
      
      dashboardData.salesTrendData.forEach((item, idx) => {
        console.log(`[${idx}] ${item.day} (${item.date})`);
        console.log(`    Orders: ${item.orders}`);
        console.log(`    Sales: ₹${item.sales}`);
        console.log(`    Sales (Lakhs): ${item.salesInLakhs}\n`);
      });
    } else {
      console.log('❌ No salesTrendData found or empty array!\n');
    }

    // Log other key metrics for comparison
    console.log('\n📈 OTHER METRICS:');
    console.log('════════════════════════════════════════');
    console.log(`Monthly Orders: ${dashboardData.monthlyOrders}`);
    console.log(`Monthly Revenue: ₹${dashboardData.monthlyRevenue}`);
    console.log(`Monthly Revenue (Formatted): ${dashboardData.monthlyRevenueFormatted}\n`);

    // Log debug info if available
    if (dashboardData._debug) {
      console.log('🔍 DEBUG INFO:');
      console.log('════════════════════════════════════════');
      console.log(JSON.stringify(dashboardData._debug, null, 2));
    }

    // Full response structure
    console.log('\n📦 FULL RESPONSE STRUCTURE:');
    console.log('════════════════════════════════════════');
    console.log(JSON.stringify(dashboardData, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('❌ No response received:');
      console.error('Request:', error.request);
    } else {
      console.error('❌ Error:', error.message);
    }
    
    if (error.message.includes('401')) {
      console.error('\n⚠️  Authentication failed. Please provide a valid token.');
      console.error('Get a token by:');
      console.error('1. Login through the app');
      console.error('2. Check browser DevTools > Application > Cookies');
      console.error('3. Or check localStorage for the auth token');
      console.error('4. Replace TOKEN variable in this script');
    }
  }
}

// First, let's try to get a list of what the API returns without testing the exact token
async function quickCheck() {
  try {
    console.log('Quick check - testing API structure without authentication...\n');
    
    // Try without token to see what happens
    const response = await axios.get(`${BASE_URL}/api/unit-head/dashboard?period=current-month`)
      .catch(err => {
        if (err.response?.status === 401) {
          console.log('Expected: API requires authentication (401)');
          console.log('Please update the TOKEN variable and run testDashboardAPI()');
          return null;
        }
        throw err;
      });

    if (response) {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('Connection check result:', error.message);
  }
}

console.log('🚀 Unit Head Dashboard API Test Script\n');
console.log('Instructions:');
console.log('1. Open your browser DevTools while logged in');
console.log('2. Go to Application > Cookies or localStorage');
console.log('3. Find the auth token (usually named "token" or "authToken")');
console.log('4. Replace "your_auth_token_here" with your actual token');
console.log('5. Run: node test-api-response.js\n');
console.log('─'.repeat(50));

quickCheck();
