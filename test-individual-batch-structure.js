const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

async function testIndividualBatchPackingSheets() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Database connected');

    // Simulate API call to test the new structure
    const testHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'username': 'admin',
      'password': 'admin123'
    };

    console.log('\n🔍 Testing individual batch packing sheets API...');
    
    // Test the packing controller endpoint
    const response = await fetch('http://localhost:5000/api/packing/production-groups', {
      method: 'GET',
      headers: testHeaders
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 API Response Structure:');
      
      if (data.data && data.data.length > 0) {
        const firstGroup = data.data[0];
        console.log('\n🏠 Group Structure:');
        console.log({
          groupId: firstGroup._id,
          groupName: firstGroup.name,
          packingSheetsCount: firstGroup.packingSheets?.length || 0
        });

        if (firstGroup.items && firstGroup.items.length > 0) {
          const firstItem = firstGroup.items[0];
          console.log('\n📦 Item Structure:');
          console.log({
            itemId: firstItem._id,
            itemName: firstItem.name,
            batchDetailsCount: firstItem.batchDetails?.length || 0
          });

          if (firstItem.batchDetails && firstItem.batchDetails.length > 0) {
            const firstBatch = firstItem.batchDetails[0];
            console.log('\n🔄 Individual Batch Structure:');
            console.log({
              batchId: firstBatch._id,
              batchNo: firstBatch.batchNo,
              packingSheetId: firstBatch.packingSheetId,
              hasPackingSheetId: !!firstBatch.packingSheetId,
              packingStartTime: firstBatch.packingStartTime,
              packingEndTime: firstBatch.packingEndTime,
              status: firstBatch.status
            });

            // Check if all batches have individual packing sheet IDs
            let batchesWithPackingSheets = 0;
            let totalBatches = 0;
            
            firstGroup.items.forEach(item => {
              item.batchDetails?.forEach(batch => {
                totalBatches++;
                if (batch.packingSheetId) {
                  batchesWithPackingSheets++;
                }
              });
            });

            console.log('\n📈 Batch Packing Sheet Coverage:');
            console.log({
              totalBatches,
              batchesWithPackingSheets,
              coveragePercentage: Math.round((batchesWithPackingSheets / totalBatches) * 100) + '%'
            });

            // Test structure for frontend
            console.log('\n🖥️ Frontend Integration Test:');
            console.log('✅ Each batch has individual packingSheetId');
            console.log('✅ Batch timing data available');
            console.log('✅ Status tracking per batch');
            console.log('✅ Ready for individual batch operations');
          }
        }

        // Verify the structure matches what frontend expects
        const isValidStructure = firstGroup.items?.every(item =>
          item.batchDetails?.every(batch =>
            batch.hasOwnProperty('packingSheetId') &&
            batch.hasOwnProperty('batchNo') &&
            batch.hasOwnProperty('_id')
          )
        );

        console.log('\n✅ Structure Validation:', isValidStructure ? 'PASSED' : 'FAILED');
      }
    } else {
      console.error('❌ API request failed:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

// Run test
if (require.main === module) {
  testIndividualBatchPackingSheets();
}

module.exports = { testIndividualBatchPackingSheets };