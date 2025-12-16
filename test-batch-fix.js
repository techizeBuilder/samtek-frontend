#!/usr/bin/env node

/**
 * Test the fixed batch number handling using fetch instead of axios
 */

async function testBatchNumberFix() {
  try {
    console.log('🧪 Testing batch number fix...');

    // Test data - same itemId but different batch numbers
    const testRequests = [
      {
        itemId: "693928b054dc840409006933",
        field: "mouldingTime",
        value: "2025-12-15T04:16:38.180Z",
        batchno: "BATNO03"
      },
      {
        itemId: "693928b054dc840409006933", // Same item
        field: "mouldingTime",
        value: "2025-12-15T04:17:04.226Z",
        batchno: "BATNO04" // Different batch
      }
    ];

    // First, try to get a valid token
    console.log('🔑 Getting authentication token...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'production@01',
        password: 'test123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Got authentication token');

    // Test both requests
    for (let i = 0; i < testRequests.length; i++) {
      console.log(`\n📦 Testing request ${i + 1}: ${testRequests[i].batchno}`);
      
      try {
        const response = await fetch('http://localhost:5000/api/production/ungrouped-items/production', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testRequests[i])
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`✅ Request ${i + 1} SUCCESS:`, {
            batchNo: responseData.data.batchNo,
            itemId: responseData.data.itemId,
            field: testRequests[i].field,
            isNewRecord: responseData.data.isNewRecord
          });
        } else {
          const errorData = await response.json();
          console.error(`❌ Request ${i + 1} FAILED:`, {
            batchno: testRequests[i].batchno,
            status: response.status,
            message: errorData?.message || response.statusText,
            error: errorData?.error
          });
        }
        
      } catch (error) {
        console.error(`❌ Request ${i + 1} FAILED:`, {
          batchno: testRequests[i].batchno,
          error: error.message
        });
      }
    }

    console.log('\n🎯 Test Summary:');
    console.log('Expected behavior:');
    console.log('✅ Both requests should succeed');
    console.log('✅ Each should create a separate record with different batchNo');
    console.log('✅ No duplicate entry errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('401')) {
      console.log('💡 Try checking if the server is running and credentials are correct');
    }
  }
}

testBatchNumberFix();