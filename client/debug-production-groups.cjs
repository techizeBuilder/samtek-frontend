const axios = require('axios');

// Test to check production groups availability
async function testProductionGroups() {
  console.log('🧪 Testing Production Groups API...\n');
  
  try {
    // You need to replace this with a valid token
    const token = 'YOUR_JWT_TOKEN_HERE'; // Get this from browser dev tools localStorage
    
    console.log('1️⃣ Testing: Get production groups API');
    const response = await axios.get('http://localhost:5000/api/unit-manager/production-groups', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        search: ''
      }
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data?.groups) {
      console.log('\n📦 Production Groups Found:');
      response.data.data.groups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.groupName} (ID: ${group._id})`);
        console.log(`      Items: ${group.items?.length || 0}`);
        console.log(`      Company: ${group.company}`);
        console.log('');
      });
      
      if (response.data.data.groups.length === 0) {
        console.log('⚠️ No production groups found!');
        console.log('💡 You may need to create production groups first.');
      }
    } else {
      console.log('❌ No groups found in response');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('📋 Error Data:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n💡 Authentication error - please:');
        console.log('   1. Login to the application');
        console.log('   2. Open browser dev tools (F12)');
        console.log('   3. Go to Application -> Local Storage');
        console.log('   4. Copy the "token" value');
        console.log('   5. Replace YOUR_JWT_TOKEN_HERE in this script');
      }
    } else {
      console.log('❌ Network Error:', error.message);
      console.log('\n💡 Make sure:');
      console.log('   1. Server is running on port 5000');
      console.log('   2. Database connection is working');
    }
  }
}

console.log('🚀 Production Groups Test');
console.log('=========================\n');

testProductionGroups().then(() => {
  console.log('\n✨ Test completed!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});