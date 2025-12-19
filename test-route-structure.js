import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testRouteStructure() {
  console.log('🧪 Testing Packing Route Structure...\n');
  
  try {
    console.log('1️⃣ Testing GET /api/packing/production-groups (should return 401 - route exists)');
    const getResponse = await fetch(`${BASE_URL}/api/packing/production-groups`, {
      method: 'GET'
    });
    
    console.log('📡 GET Response status:', getResponse.status);
    console.log('✅ Route exists:', getResponse.status === 401 ? 'YES' : 'NO');
    
    console.log('\n2️⃣ Testing POST /api/packing/sheets (should return 401 - route exists)');
    const postSheetsResponse = await fetch(`${BASE_URL}/api/packing/sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log('📡 POST /sheets Response status:', postSheetsResponse.status);
    console.log('✅ Route exists:', postSheetsResponse.status === 401 ? 'YES' : 'NO');
    
    console.log('\n3️⃣ Testing removed duplicate POST /api/packing/packing-sheets');
    const postOldResponse = await fetch(`${BASE_URL}/api/packing/packing-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log('📡 POST /packing-sheets Response status:', postOldResponse.status);
    console.log('✅ Duplicate route removed:', postOldResponse.status === 404 ? 'YES' : 'NO (Still exists)');
    
    console.log('\n4️⃣ Testing GET /api/packing/packing-sheets (should still exist for backwards compatibility)');
    const getOldResponse = await fetch(`${BASE_URL}/api/packing/packing-sheets`, {
      method: 'GET'
    });
    
    console.log('📡 GET /packing-sheets Response status:', getOldResponse.status);
    console.log('✅ Backwards compatible GET route exists:', getOldResponse.status === 401 ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

console.log('🚀 Packing Route Structure Test');
console.log('===============================\n');

testRouteStructure().then(() => {
  console.log('\n✨ Route structure test completed!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});