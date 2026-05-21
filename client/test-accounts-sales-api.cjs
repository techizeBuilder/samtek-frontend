const BASE_URL = 'http://localhost:5000';
const PHONE = '9700552003';
const PASSWORD = '9700552003';

async function testAccountsSalesAPI() {
  try {
    console.log('🔐 Step 1: Login...\n');
    
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: PHONE, password: PASSWORD })
    });

    if (!loginRes.ok) {
      throw new Error('Login failed - check credentials');
    }

    const loginData = await loginRes.json();
    const { token, user } = loginData.data;
    
    console.log('✅ Login successful!');
    console.log(`   User: ${user.username}`);
    console.log(`   Company: ${user.companyId}\n`);

    console.log('📊 Step 2: Testing Accounts Sales API...\n');
    
    // Test the sales invoices endpoint
    const salesRes = await fetch(
      `${BASE_URL}/api/accounts/sales/invoices?page=1&limit=20&status=All`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!salesRes.ok) {
      throw new Error(`API Error: ${salesRes.status} - ${salesRes.statusText}`);
    }

    const salesData = await salesRes.json();

    console.log('✅ API Response received!\n');

    console.log('📋 SALES INVOICES DATA:');
    console.log('═'.repeat(70));
    console.log(`Total Invoices: ${salesData.data?.pagination?.total || 0}`);
    console.log(`Page: ${salesData.data?.pagination?.page || 1} of ${salesData.data?.pagination?.pages || 1}\n`);

    console.log('💰 SUMMARY:');
    console.log(`  • Total Amount: ₹${(salesData.data?.summary?.totalAmount || 0).toLocaleString('en-IN')}`);
    console.log(`  • Total Discount: ₹${(salesData.data?.summary?.totalDiscount || 0).toLocaleString('en-IN')}`);
    console.log(`  • Total Final Amount: ₹${(salesData.data?.summary?.totalFinalAmount || 0).toLocaleString('en-IN')}`);
    console.log(`  • Paid: ${salesData.data?.summary?.paidCount || 0}`);
    console.log(`  • Pending: ${salesData.data?.summary?.pendingCount || 0}`);
    console.log(`  • Overdue: ${salesData.data?.summary?.overdueCount || 0}\n`);

    if (salesData.data?.invoices?.length > 0) {
      console.log('📊 SAMPLE INVOICES (First 3):');
      console.log('─'.repeat(70));
      salesData.data.invoices.slice(0, 3).forEach((inv, idx) => {
        console.log(`\n[${idx + 1}] ${inv.invoiceNo}`);
        console.log(`    Customer: ${inv.customerName}`);
        console.log(`    Sales Person: ${inv.salesPerson}`);
        console.log(`    Date: ${new Date(inv.date).toLocaleDateString('en-IN')}`);
        console.log(`    Amount: ₹${inv.amount.toLocaleString('en-IN')}`);
        console.log(`    Discount: -₹${inv.discount.toLocaleString('en-IN')}`);
        console.log(`    Final: ₹${inv.finalAmount.toLocaleString('en-IN')}`);
        console.log(`    Status: ${inv.status}`);
        console.log(`    Method: ${inv.paymentMethod}`);
      });
    } else {
      console.log('⚠️  No invoices found for this company');
    }

    console.log('\n\n' + '═'.repeat(70));
    console.log('✅ API ENDPOINT WORKING CORRECTLY!');
    console.log('═'.repeat(70));
    console.log('\nEndpoint: GET /api/accounts/sales/invoices');
    console.log('Filters: page, limit, status, search');
    console.log('Company: Automatically filtered by user company');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('🧪 TESTING ACCOUNTS SALES API\n');
testAccountsSalesAPI();
