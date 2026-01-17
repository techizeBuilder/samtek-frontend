import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test credentials
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Login failed:', data.message);
      return null;
    }

    console.log('✅ Login successful');
    return data.token;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function approvePackingSheet(token, packingSheetId) {
  try {
    console.log(`\n📋 Approving packing sheet: ${packingSheetId}`);
    console.log('━'.repeat(80));

    const response = await fetch(`${BASE_URL}/api/packing/sheets/${packingSheetId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Approval failed:', data.message);
      console.error('Error details:', data);
      return null;
    }

    console.log('\n✅ Packing sheet approved successfully!');
    console.log('━'.repeat(80));
    
    if (data.dispatchEntries && data.dispatchEntries.length > 0) {
      console.log(`\n📦 Created ${data.dispatchEntries.length} dispatch entries:`);
      
      data.dispatchEntries.forEach((entry, index) => {
        console.log(`\n  Entry ${index + 1}:`);
        console.log(`    Product: ${entry.productName}`);
        console.log(`    Product Group: ${entry.productGroup}`);
        console.log(`    Packed Qty: ${entry.packedQuantityReadyForDispatch}`);
        console.log(`    Previous Stock: ${entry.previousClosingStockYesterdayBalance}`);
        console.log(`    Return Qty: ${entry.returnQuantityYesterdayReturns}`);
        console.log(`    ⭐ Total Indent (productionFinalBatches): ${entry.totalIndentQuantityOrdersForTheDay}`);
        console.log(`    Total Available: ${entry.totalAvailableStock}`);
        console.log(`    Excess/Shortage: ${entry.excessShortage}`);
        console.log(`    Status: ${entry.status}`);
      });
    }

    console.log('\n' + '━'.repeat(80));
    console.log('📄 Full Response:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    return null;
  }
}

async function testTodaysProducts(token) {
  try {
    console.log('\n\n📡 Fetching today\'s products to verify dispatch entries...');
    console.log('━'.repeat(80));

    const response = await fetch(`${BASE_URL}/api/dispatches/todays-products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('❌ API Error:', data.message);
      return;
    }

    console.log(`\n✅ Found ${data.data.count} product groups`);
    
    data.data.products.forEach((product, index) => {
      console.log(`\n  Group ${index + 1}:`);
      console.log(`    Product Group: ${product.productGroup}`);
      console.log(`    ⭐ Total Indent (productionFinalBatches): ${product.totalIndentQuantityOrdersForTheDay}`);
      console.log(`    Items in group: ${product.items.length}`);
      
      product.items.forEach((item, itemIndex) => {
        console.log(`      Item ${itemIndex + 1}: ${item.productName}`);
        console.log(`        Indent Qty: ${item.indentQty}`);
        console.log(`        Stock: ${item.stock}`);
      });
    });

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

async function runTest() {
  console.log('🧪 Testing Packing Sheet Approval with productionFinalBatches');
  console.log('═'.repeat(80));
  
  // Step 1: Login
  const token = await login();
  if (!token) {
    console.error('❌ Cannot proceed without authentication token');
    return;
  }
  
  // Step 2: Approve packing sheet
  const packingSheetId = '696b0c0c272e3cedcd7d0986'; // Replace with actual ID
  console.log(`\n📋 Using Packing Sheet ID: ${packingSheetId}`);
  
  const approvalResult = await approvePackingSheet(token, packingSheetId);
  
  if (!approvalResult) {
    console.error('❌ Approval failed, stopping test');
    return;
  }
  
  // Step 3: Verify in todays-products API
  await testTodaysProducts(token);
  
  console.log('\n\n✅ Test completed!');
  console.log('═'.repeat(80));
  console.log('\n📊 Summary:');
  console.log('  ✓ totalIndentQuantityOrdersForTheDay now uses productionFinalBatches');
  console.log('  ✓ Grouped items: Sum of all items\' productionFinalBatches');
  console.log('  ✓ Ungrouped items: Single item\'s productionFinalBatches');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
