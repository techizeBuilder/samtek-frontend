// Test the production update fix
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000/api';

// Test data
const testCases = [
  {
    description: 'Same item, different batch - BATNO03',
    data: {
      itemId: "693928b054dc840409006933",
      field: "mouldingTime",
      value: "2025-12-15T04:36:05.584Z",
      batchno: "BATNO03"
    }
  },
  {
    description: 'Same item, different batch - BATNO04',
    data: {
      itemId: "693928b054dc840409006933",
      field: "mouldingTime",
      value: "2025-12-15T04:36:46.544Z",
      batchno: "BATNO04"
    }
  },
  {
    description: 'Update existing batch - BATNO03 with unloadingTime',
    data: {
      itemId: "693928b054dc840409006933",
      field: "unloadingTime",
      value: "2025-12-15T05:00:00.000Z",
      batchno: "BATNO03"
    }
  }
];

async function testProductionUpdate() {
  console.log('🧪 Testing Production Update Fix...\n');

  // You'll need to get a valid token first
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
        console.log('📄 Data:', {
          id: result.data._id,
          batchNo: result.data.batchNo,
          itemId: result.data.itemId,
          isNewRecord: result.data.isNewRecord
        });
      } else {
        console.log('❌ ERROR:', result.message);
        console.log('💥 Details:', result.error);
      }

    } catch (error) {
      console.log('💥 FETCH ERROR:', error.message);
    }

    console.log('---');
  }
}

// Run the test
testProductionUpdate()
  .then(() => {
    console.log('\n🏁 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });