import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testPackingAPIs() {
  console.log('🧪 Testing Packing API Fixes...\n');
  
  try {
    // Read token
    const token = fs.readFileSync('token.txt', 'utf8').trim();
    
    console.log('1️⃣ Testing GET /api/packing/production-groups (should include packing sheet data)');
    const getResponse = await fetch(`${BASE_URL}/api/packing/production-groups`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 GET Response status:', getResponse.status);
    
    if (getResponse.ok) {
      const getResult = await getResponse.json();
      console.log('✅ GET API working');
      console.log('📊 Production Groups found:', getResult.data?.productionGroups?.length || 0);
      
      if (getResult.data?.productionGroups?.length > 0) {
        const group = getResult.data.productionGroups[0];
        console.log('📦 Sample group:', group.name);
        console.log('📋 Group has packing sheets:', group.packingSheets ? group.packingSheets.length : 'No packingSheets field');
        
        if (group.packingSheets) {
          console.log('✅ Packing sheet relationships working');
        } else {
          console.log('⚠️ No packing sheet relationships in response');
        }
      }
    } else {
      const errorText = await getResponse.text();
      console.log('❌ GET API failed:', errorText);
    }
    
    console.log('\n2️⃣ Testing POST /api/packing/sheets (should not create duplicates)');
    
    // Test creating a packing sheet
    const samplePackingData = {
      productionGroupId: 'ungrouped-items',
      productionGroupName: 'Ungrouped Items',
      packingStartTime: new Date().toISOString(),
      status: 'in_progress',
      items: [
        {
          productId: '693928b054dc840409006933',
          productName: 'Test Product',
          indentQty: 100,
          producedQty: 90,
          packedQty: 0,
          packingLoss: 0,
          notes: 'Test note'
        }
      ]
    };
    
    console.log('📝 Creating packing sheet with data:', JSON.stringify(samplePackingData, null, 2));
    
    const postResponse = await fetch(`${BASE_URL}/api/packing/sheets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(samplePackingData)
    });
    
    console.log('📡 POST Response status:', postResponse.status);
    
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      console.log('✅ POST API working - Packing sheet created');
      console.log('📋 Created sheet ID:', postResult.data?._id);
      
      // Test creating the same packing sheet again to check for duplicates
      console.log('\n3️⃣ Testing duplicate prevention - Creating same packing sheet again');
      
      const duplicateResponse = await fetch(`${BASE_URL}/api/packing/sheets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(samplePackingData)
      });
      
      console.log('📡 Duplicate POST Response status:', duplicateResponse.status);
      
      if (duplicateResponse.ok) {
        const duplicateResult = await duplicateResponse.json();
        console.log('✅ No duplicate entry - Old sheet was replaced');
        console.log('📋 New sheet ID:', duplicateResult.data?._id);
        console.log('🔍 Different from first ID?', duplicateResult.data?._id !== postResult.data?._id ? 'Yes' : 'No');
      } else {
        const errorText = await duplicateResponse.text();
        console.log('❌ Duplicate POST failed:', errorText);
      }
      
    } else {
      const errorText = await postResponse.text();
      console.log('❌ POST API failed:', errorText);
    }
    
    console.log('\n4️⃣ Testing removed duplicate route');
    
    // Test the old duplicate route that should no longer exist for POST
    const oldRouteResponse = await fetch(`${BASE_URL}/api/packing/packing-sheets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(samplePackingData)
    });
    
    console.log('📡 Old route POST Response status:', oldRouteResponse.status);
    
    if (oldRouteResponse.status === 404) {
      console.log('✅ Duplicate POST route successfully removed');
    } else {
      console.log('⚠️ Old duplicate route still exists, status:', oldRouteResponse.status);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

console.log('🚀 Packing API Fixes Test');
console.log('========================\n');

testPackingAPIs().then(() => {
  console.log('\n✨ Test completed!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});