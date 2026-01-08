import fetch from 'node-fetch';

async function testUngroupedAPI() {
  try {
    console.log('🔍 Testing /api/production/ungrouped-items endpoint\n');
    
    const response = await fetch('http://localhost:5000/api/production/ungrouped-items', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth cookie here if needed
      }
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('\nAPI Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.data.items) {
      console.log('\n📊 Items found:', data.data.items.length);
      data.data.items.forEach(item => {
        console.log(`\n- ${item.name}`);
        console.log(`  noOfBatchesForProduction: ${item.noOfBatchesForProduction}`);
        console.log(`  totalBatches: ${item.totalBatches}`);
        console.log(`  productionFinalBatches: ${item.productionFinalBatches}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUngroupedAPI();
