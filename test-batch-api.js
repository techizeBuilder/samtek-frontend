// Test script to verify batchId and batchNo are properly handled in API calls
const BASE_URL = 'http://localhost:5000';

async function testPackingSheetAPI() {
  try {
    console.log('🧪 Testing Packing Sheet API with batchId and batchNo...');
    
    // Test data with batchId and batchNo
    const testData = {
      "productionGroupId": "6932a5536784326262ad93f7",
      "productionGroupName": "group v", 
      "packingStartTime": "2025-12-22T12:08:33.296Z",
      "status": "in_progress",
      "items": [
        {
          "productId": "693928af54dc84040900691b",
          "productName": "Everyday Cream Bun 12pc",
          "batchId": "6948ed12c6189bc00cbca297",
          "batchNo": "BATNO06",
          "indentQty": 34,
          "producedQty": 34,
          "packedQty": 34,
          "packingLoss": 0,
          "notes": ""
        }
      ]
    };
    
    console.log('📤 Sending POST request to create packing sheet...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    // Note: This is just a test template. 
    // In actual use, you'd need proper authentication headers
    const response = await fetch(`${BASE_URL}/api/packing/sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth token here: 'Authorization': 'Bearer your-token'
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ API call failed:', response.status, errorData);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API Response:', JSON.stringify(result, null, 2));
    
    // Check if batchId and batchNo are in the response
    if (result.data && result.data.items && result.data.items.length > 0) {
      const firstItem = result.data.items[0];
      console.log('\n🔍 Checking first item in response:');
      console.log('  batchId:', firstItem.batchId);
      console.log('  batchNo:', firstItem.batchNo);
      
      if (firstItem.batchId && firstItem.batchNo) {
        console.log('✅ SUCCESS: batchId and batchNo are properly stored!');
      } else {
        console.log('❌ ISSUE: batchId or batchNo are missing!');
      }
    }
    
    // If we got a packingSheetId, test updating it
    if (result.data && result.data._id) {
      console.log('\n🔄 Testing update API...');
      
      const updateData = {
        productId: "693928af54dc84040900691b",
        batchId: "6948ed12c6189bc00cbca297", 
        batchNo: "BATNO06_UPDATED",
        packingLoss: 1,
        notes: "Updated via API"
      };
      
      const updateResponse = await fetch(`${BASE_URL}/api/packing/sheets/${result.data._id}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add your auth token here: 'Authorization': 'Bearer your-token'
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        console.log('✅ Update Response:', JSON.stringify(updateResult, null, 2));
        
        if (updateResult.data) {
          console.log('\n🔍 Checking updated item:');
          console.log('  batchId:', updateResult.data.batchId);
          console.log('  batchNo:', updateResult.data.batchNo);
        }
      } else {
        console.log('❌ Update failed:', updateResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPackingSheetAPI();