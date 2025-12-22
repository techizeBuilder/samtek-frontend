import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

async function testPackingAPI() {
  try {
    // Test the actual API endpoint
    const testData = {
      "productionGroupId": "6932a5536784326262ad93f7",
      "productionGroupName": "group v",
      "packingStartTime": "2025-12-22T11:56:05.392Z",
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

    console.log('🚀 Testing packing sheet creation API...');
    console.log('📊 Request data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:5000/api/packing/sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'username': 'admin',
        'password': 'admin123'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('📋 API Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Packing sheet created successfully!');
      
      // Now test the production groups API
      console.log('\n🔍 Testing production groups API...');
      
      const groupsResponse = await fetch('http://localhost:5000/api/packing/production-groups', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'username': 'admin',
          'password': 'admin123'
        }
      });

      const groupsResult = await groupsResponse.json();
      
      if (groupsResult.success && groupsResult.data && groupsResult.data.length > 0) {
        console.log('✅ Production groups API working!');
        
        // Check if any batch has packing sheets
        let foundBatchWithSheets = false;
        groupsResult.data.forEach(group => {
          group.items?.forEach(item => {
            item.batchDetails?.forEach(batch => {
              if (batch.packingSheets && batch.packingSheets.length > 0) {
                console.log(`🎯 Found batch with packing sheets: ${batch.batchNo}`);
                console.log('   Packing sheets count:', batch.packingSheets.length);
                console.log('   First sheet:', {
                  id: batch.packingSheets[0]._id,
                  status: batch.packingSheets[0].status,
                  startTime: batch.packingSheets[0].packingStartTime
                });
                foundBatchWithSheets = true;
              }
            });
          });
        });
        
        if (foundBatchWithSheets) {
          console.log('✅ SUCCESS: Individual batch packing sheets are working!');
        } else {
          console.log('⚠️ No batches found with packing sheets');
        }
      } else {
        console.log('❌ Production groups API failed:', groupsResult.message);
      }
    } else {
      console.log('❌ Packing sheet creation failed:', result.message);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testPackingAPI();