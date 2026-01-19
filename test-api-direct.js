async function testTodaysProductsAPI() {
  try {
    console.log('🔍 Calling todays-products API...\n');
    
    const url = 'http://localhost:5000/api/dispatches/todays-products';
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NGJiZDVlY2JjNTI2NjYxNjMyMjVhZCIsInJvbGUiOiJTdXBlciBBZG1pbiIsImNvbXBhbnlJZCI6bnVsbCwiaWF0IjoxNzMzMTU3NjgzLCJleHAiOjE3MzMxNjQ4ODN9.SV98VGiVoY8LWIvhKZ9Ol3Y5wNQ4OTQvC5dCXb_hnY4';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const products = await response.json();
    console.log('Response status:', response.status);
    console.log('Response type:', typeof products);
    console.log('Is Array?', Array.isArray(products));
    
    if (!response.ok) {
      console.error('❌ API Error:', products);
      return;
    }
    
    if (!Array.isArray(products)) {
      console.error('❌ Unexpected response format:', products);
      return;
    }
    
    console.log(`✅ Received ${products.length} products\n`);
    
    // Find ungrouped items
    const ungroupedItems = products.filter(p => p.isUngrouped === true);
    console.log(`📋 Found ${ungroupedItems.length} ungrouped items:\n`);
    
    ungroupedItems.forEach((item, index) => {
      console.log(`\n🔹 Ungrouped Item ${index + 1}:`);
      console.log(`   Product Group: ${item.productGroup}`);
      console.log(`   Product Name: ${item.productName}`);
      console.log(`   Product ID: ${item.productId}`);
      console.log(`   Total Item Batch: ${item.totalItemBatch}`);
      console.log(`   Indent Qty: ${item.indentQty}`);
      console.log(`   Items Array Length: ${item.items?.length || 0}`);
      
      if (item.items && item.items.length > 0) {
        item.items.forEach((i, idx) => {
          console.log(`     Item ${idx + 1}:`);
          console.log(`       - Product Name: ${i.productName}`);
          console.log(`       - Batch: ${i.batch}`);
          console.log(`       - Stock: ${i.stock}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTodaysProductsAPI();
