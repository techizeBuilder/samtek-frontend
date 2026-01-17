import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test credentials - update these with valid credentials
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

async function testTodaysProducts(token, salesmanId = null, customerId = null) {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (salesmanId) params.append('salesmanId', salesmanId);
    if (customerId) params.append('customerId', customerId);
    
    const queryString = params.toString();
    const url = `${BASE_URL}/api/dispatches/todays-products${queryString ? '?' + queryString : ''}`;
    
    console.log('\n📡 Testing API:', url);
    console.log('━'.repeat(80));

    const response = await fetch(url, {
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

    console.log('\n✅ API Response Received');
    console.log('━'.repeat(80));
    
    console.log('\n📊 Summary:');
    console.log(`  Total Groups: ${data.data.count}`);
    console.log(`  Products Array Length: ${data.data.products.length}`);
    
    // Analyze each group
    data.data.products.forEach((product, index) => {
      console.log('\n' + '═'.repeat(80));
      console.log(`📦 GROUP ${index + 1}:`);
      console.log('═'.repeat(80));
      
      console.log(`  _id: ${product._id}`);
      console.log(`  packingSheetId: ${product.packingSheetId || 'null (ungrouped)'}`);
      console.log(`  productGroup: ${product.productGroup}`);
      
      // Dispatch fields
      console.log('\n  📋 Dispatch Fields:');
      console.log(`    company: ${product.company}`);
      console.log(`    date: ${product.date}`);
      console.log(`    packedQuantityReadyForDispatch: ${product.packedQuantityReadyForDispatch}`);
      console.log(`    previousClosingStockYesterdayBalance: ${product.previousClosingStockYesterdayBalance}`);
      console.log(`    returnQuantityYesterdayReturns: ${product.returnQuantityYesterdayReturns}`);
      console.log(`    totalAvailableStock: ${product.totalAvailableStock}`);
      console.log(`    totalIndentQuantityOrdersForTheDay: ${product.totalIndentQuantityOrdersForTheDay}`);
      console.log(`    excessShortage: ${product.excessShortage}`);
      console.log(`    dispatchedQuantitySentToday: ${product.dispatchedQuantitySentToday}`);
      console.log(`    closingStockEndOfDayBalance: ${product.closingStockEndOfDayBalance}`);
      console.log(`    physicalStockEntryManualVerification: ${product.physicalStockEntryManualVerification}`);
      console.log(`    overallLoss: ${product.overallLoss}`);
      console.log(`    batchNo: ${product.batchNo}`);
      console.log(`    dcno: ${product.dcno || 'null'}`);
      console.log(`    status: ${product.status}`);
      console.log(`    invoiceGenerated: ${product.invoiceGenerated}`);
      
      // Sales person
      if (product.salesPerson) {
        console.log('\n  👤 Sales Person:');
        console.log(`    _id: ${product.salesPerson._id}`);
        console.log(`    fullName: ${product.salesPerson.fullName}`);
        console.log(`    username: ${product.salesPerson.username}`);
        console.log(`    email: ${product.salesPerson.email}`);
      } else {
        console.log('\n  👤 Sales Person: null');
      }
      
      // Customer
      if (product.customer) {
        console.log('\n  🏢 Customer:');
        console.log(`    _id: ${product.customer._id}`);
        console.log(`    name: ${product.customer.name}`);
        console.log(`    customerCode: ${product.customer.customerCode}`);
        console.log(`    address: ${product.customer.address}`);
        console.log(`    phone: ${product.customer.phone}`);
        console.log(`    email: ${product.customer.email}`);
      } else {
        console.log('\n  🏢 Customer: null');
      }
      
      // Items
      console.log(`\n  📦 Items in this group: ${product.items.length}`);
      
      product.items.forEach((item, itemIndex) => {
        console.log(`\n    ┌─ Item ${itemIndex + 1}:`);
        console.log(`    │  itemId: ${item.itemId}`);
        console.log(`    │  productName: ${item.productName}`);
        console.log(`    │  indentQty: ${item.indentQty}`);
        console.log(`    │  qtyIssued: ${item.qtyIssued}`);
        console.log(`    │  status: ${item.status}`);
        console.log(`    │  stock: ${item.stock}`);
        console.log(`    │  batchNo: ${item.batchNo}`);
        console.log(`    │  totalAvailableStock: ${item.totalAvailableStock}`);
        console.log(`    └─`);
      });
    });
    
    // Full JSON response
    console.log('\n\n' + '═'.repeat(80));
    console.log('📄 FULL JSON RESPONSE:');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  console.log('🧪 Testing Today\'s Products API (Grouped Response)');
  console.log('━'.repeat(80));
  
  // Step 1: Login
  const token = await login();
  if (!token) {
    console.error('❌ Cannot proceed without authentication token');
    return;
  }
  
  // Step 2: Test API without filters
  console.log('\n\n📋 TEST 1: All products (no filters)');
  await testTodaysProducts(token);
  
  // Step 3: Test with filters (optional - uncomment and add IDs if needed)
  // console.log('\n\n📋 TEST 2: Filtered by salesman');
  // await testTodaysProducts(token, 'SALESMAN_ID_HERE', null);
  
  // console.log('\n\n📋 TEST 3: Filtered by customer');
  // await testTodaysProducts(token, null, 'CUSTOMER_ID_HERE');
  
  console.log('\n\n✅ All tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
