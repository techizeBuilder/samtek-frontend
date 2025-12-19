// Test API call to update notes in packing sheet
import fetch from 'node-fetch';

async function testNotesAPI() {
  try {
    const packingSheetId = '6944f7daad27fd1b476cf8b3'; // From your data
    const apiUrl = `http://localhost:5000/api/packing/sheets/${packingSheetId}/item`;
    
    const requestData = {
      productId: "693928b054dc840409006933",
      notes: "dfsfsfsf"
    };

    console.log('🚀 Testing API call to update notes...');
    console.log('📝 Request data:', requestData);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Replace with actual token if needed
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNotesAPI();