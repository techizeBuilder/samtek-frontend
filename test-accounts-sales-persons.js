import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Replace with your actual token
const TOKEN = 'your_token_here';

async function testSalesPersonsAPI() {
  try {
    console.log('🧪 Testing Accounts Sales Persons API\n');

    // Test 1: Get all sales persons
    console.log('Test 1: Get all sales persons');
    console.log('Endpoint: GET /api/accounts/sales-persons');
    
    const response = await fetch(
      `${BASE_URL}/api/accounts/sales-persons?page=1&limit=10&sortBy=createdAt&sortOrder=desc`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.data && data.data.salesPersons) {
      console.log('\n✅ Success! Found', data.data.salesPersons.length, 'sales persons');
      if (data.data.salesPersons.length > 0) {
        console.log('First sales person:', data.data.salesPersons[0]);
      }
    } else {
      console.log('\n❌ Failed: No sales persons found');
      console.log('Response structure:', {
        success: data.success,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : []
      });
    }

    // Test 2: Debug check
    console.log('\n\nTest 2: Debug check for sales persons');
    console.log('Endpoint: GET /api/accounts/debug/check-sales-persons');
    
    const debugResponse = await fetch(
      `${BASE_URL}/api/accounts/debug/check-sales-persons`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const debugData = await debugResponse.json();
    console.log('Debug Response:', JSON.stringify(debugData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSalesPersonsAPI();
