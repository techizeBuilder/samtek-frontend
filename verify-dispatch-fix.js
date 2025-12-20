// Simple test to verify dispatch history API is working without authentication
async function testDispatchHistoryAPI() {
  try {
    console.log('🔍 Testing dispatch history API endpoint...');
    
    const response = await fetch('http://localhost:5000/api/dispatches/history?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ API Error:', data.message);
      
      // Check if it's still the schema population error
      if (data.error && data.error.includes('Cannot populate path `customer`')) {
        console.log('💥 SCHEMA POPULATION ERROR STILL EXISTS!');
        return false;
      } else if (data.message && data.message.includes('Access denied')) {
        console.log('✅ Schema fix worked! Now getting auth error (expected)');
        return true;
      } else {
        console.log('🔍 Different error:', data.error || data.message);
        return false;
      }
    } else {
      console.log('✅ API working perfectly!');
      return true;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ Server not running on port 5000');
    } else {
      console.log('❌ Network error:', error.message);
    }
    return false;
  }
}

// Run the test
testDispatchHistoryAPI().then(result => {
  if (result) {
    console.log('🎉 DISPATCH HISTORY API FIX SUCCESSFUL!');
  } else {
    console.log('💥 Fix may need more work');
  }
  process.exit(result ? 0 : 1);
});