// Test Unit Manager Items API
console.log('🔍 Testing Unit Manager Items API...');

// Test the items API endpoint
async function testItemsAPI() {
  try {
    // First check if user is logged in
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token found - user must login first');
      return;
    }
    
    console.log('🔄 Testing /api/unit-manager/items...');
    
    const response = await fetch('http://localhost:5000/api/unit-manager/items', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('📡 Items API status:', response.status);
    console.log('📡 Items API headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Items API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error body:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Items API Response:', data);
    console.log('📊 Items count:', data.data ? data.data.length : 0);
    
    if (data.data && data.data.length > 0) {
      console.log('📦 First item example:', data.data[0]);
      console.log('🏷️ Available fields:', Object.keys(data.data[0]));
    } else {
      console.log('⚠️ No items found - check if items exist in database for this company');
    }
    
  } catch (error) {
    console.error('❌ Items API fetch error:', error.message);
    console.error('❌ Full error:', error);
  }
}

// Run test
testItemsAPI();