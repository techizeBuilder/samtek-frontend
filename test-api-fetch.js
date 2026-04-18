// Test the todays-products API
const token = 'YOUR_TOKEN_HERE'; // You'll need to get this from the login

async function testTodaysProducts() {
  try {
    const response = await fetch('http://localhost:5000/api/dispatches/todays-products', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 Total products returned:', data.data?.products?.length || 0);
    
    if (data.data?.products) {
      console.log('\n📋 Products:');
      data.data.products.forEach((p, i) => {
        console.log(`${i+1}. ${p.productGroup || p.productName}`);
        console.log(`   - Items: ${p.items?.length || 0}`);
        console.log(`   - Status: ${p.status}`);
        console.log(`   - Date: ${p.date}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run test
testTodaysProducts();
