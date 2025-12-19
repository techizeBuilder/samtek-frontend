// Debug API Test for Unit Manager Returns
console.log('🔍 Testing Unit Manager Returns API...');

// Test the returns API endpoint
async function testReturnsAPI() {
  try {
    console.log('🔄 Testing /api/unit-manager/returns...');
    
    const response = await fetch('http://localhost:5000/api/unit-manager/returns', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers if needed
      },
      credentials: 'include' // Include cookies
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error body:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    console.log('📊 Data type:', typeof data);
    console.log('📊 Data length:', Array.isArray(data?.data) ? data.data.length : 'Not array');
    
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    console.error('❌ Full error:', error);
  }
}

// Test sales persons API
async function testSalesPersonsAPI() {
  try {
    console.log('🔄 Testing /api/unit-manager/sales-persons...');
    
    const response = await fetch('http://localhost:5000/api/unit-manager/sales-persons', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('📡 Sales persons status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Sales persons response not OK:', response.status);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Sales persons response:', data);
    
  } catch (error) {
    console.error('❌ Sales persons error:', error.message);
  }
}

// Test authentication
async function testAuth() {
  try {
    console.log('🔄 Testing authentication...');
    
    const response = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('🔐 Auth status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Auth failed:', response.status);
      return;
    }
    
    const user = await response.json();
    console.log('✅ Current user:', user);
    console.log('👤 User role:', user?.role);
    console.log('🏢 User company:', user?.companyId);
    
  } catch (error) {
    console.error('❌ Auth error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting API debug tests...');
  
  await testAuth();
  await testSalesPersonsAPI();
  await testReturnsAPI();
  
  console.log('✅ Debug tests completed');
}

// Run the tests
runAllTests();