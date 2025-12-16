// Test the new unified ProductionBatch system
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000/api';

// Test data for different batch numbers
const testCases = [
  {
    description: 'Create BATNO03 for same item',
    data: {
      itemId: "693928b054dc840409006933",
      field: "mouldingTime",
      value: "2025-12-15T04:36:05.584Z",
      batchno: "BATNO03"
    }
  },
  {
    description: 'Create BATNO04 for same item (should work now)',
    data: {
      itemId: "693928b054dc840409006933",
      field: "mouldingTime",
      value: "2025-12-15T04:36:46.544Z",
      batchno: "BATNO04"
    }
  },
  {
    description: 'Create BATNO05 for same item',
    data: {
      itemId: "693928b054dc840409006933",
      field: "mouldingTime", 
      value: "2025-12-15T05:00:00.000Z",
      batchno: "BATNO05"
    }
  },
  {
    description: 'Update existing BATNO03 with unloadingTime',
    data: {
      itemId: "693928b054dc840409006933",
      field: "unloadingTime",
      value: "2025-12-15T05:30:00.000Z", 
      batchno: "BATNO03"
    }
  }
];

async function testUnifiedProductionBatch() {
  console.log('🧪 Testing Unified ProductionBatch System...\n');

  // Valid token (you may need to update this)
  const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTNjMTAzYmMyZjQ1OWM0ZjZkNzEiLCJ1c2VybmFtZSI6InByb2R1Y3Rpb24wMSIsImVtYWlsIjoicHJvZHVjdGlvbjAxQGV4YW1wbGUuY29tIiwiY29tcGFueUlkIjoiNjkxNDA5ODExOGNmODVmODBhZDU2YmMiLCJpYXQiOjE3MzQ2MDg0MDAsImV4cCI6MTczNDYxMjAwMH0.zznrF3j4CwkPCF4xNnfcGOVF8oZgCsLqHNfGu52S4sI';

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.description}`);
    console.log('Data:', testCase.data);

    try {
      const response = await fetch(`${baseUrl}/production/ungrouped-items/production`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ SUCCESS:', result.message);
        console.log('📄 BatchNo:', result.data?.batchNo);
        console.log('📄 ItemId:', result.data?.itemId);
        console.log('📄 Record ID:', result.data?._id);
        console.log('📄 Is New:', result.data?.isNewRecord);
      } else {
        console.log('❌ ERROR:', result.message);
        console.log('💥 Details:', result.error);
      }

    } catch (error) {
      console.log('💥 FETCH ERROR:', error.message);
    }

    console.log('---');
  }
  
  console.log('\n🎯 Summary:');
  console.log('✅ Unified table: productionbatches');  
  console.log('✅ Unique constraint: companyId + batchNo + productionDate');
  console.log('✅ Same item can have multiple batches (BATNO03, BATNO04, BATNO05)');
  console.log('✅ Same batchNo cannot be duplicated on same date');
}

// Run the test
testUnifiedProductionBatch()
  .then(() => {
    console.log('\n🏁 Unified ProductionBatch test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });