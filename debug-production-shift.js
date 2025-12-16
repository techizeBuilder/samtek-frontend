const axios = require('axios');

async function testProductionShift() {
  try {
    console.log('🧪 Testing Production Shift API...\n');
    
    const BASE_URL = 'http://localhost:5000';
    
    // Use the token from cookies.txt if available
    let token;
    try {
      const fs = require('fs');
      const cookieData = fs.readFileSync('./cookies.txt', 'utf8');
      const match = cookieData.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    } catch (e) {
      console.log('No cookies.txt found, will need manual token');
    }

    if (!token) {
      console.log('❌ No token found. Please login first or provide token manually.');
      return;
    }

    console.log('🔑 Using token:', token.substring(0, 20) + '...\n');

    // Test production-shift endpoint
    const response = await axios.get(`${BASE_URL}/api/production/production-shift`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Production Shift Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('\n📈 Data Summary:');
      console.log('Total Groups:', response.data.data.totalGroups);
      console.log('Total Active Groups:', response.data.data.totalActiveGroups);
      console.log('Total Ungrouped Items:', response.data.data.totalUngroupedItems);
      
      if (response.data.data.ungroupedItems) {
        console.log('\n🔢 Ungrouped Items Batch Numbers:');
        response.data.data.ungroupedItems.forEach((item, index) => {
          console.log(`${index + 1}. Item: "${item.name}" → Batch: ${item.batchNo} (Number: ${item.batchNumber})`);
        });
      }
      
      if (response.data.data.groups && response.data.data.groups.length > 0) {
        console.log('\n👥 Production Groups:');
        response.data.data.groups.forEach((group, index) => {
          console.log(`${index + 1}. Group: "${group.groupName}" - ${group.items?.length || 0} items`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error testing production shift:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
  }
}

testProductionShift();