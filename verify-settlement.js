import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
// In a real environment, you'd need a valid token. 
// For this verification, we are checking if the code compiles and if the fields are present in the logic.
// This script is to be run manually if a token is available, or used as a template.

async function verifySettlementAPI() {
    console.log('🧪 Verifying Salesman Settlement API Aggregation...\n');

    try {
        // Note: Since this requires authentication, we'll check if the controller logic is sound
        // by looking for the new fields in a mock response or by running a trial request if possible.

        // For now, let's assume we can get a token from the environment or similar.
        const TOKEN = process.env.AUTH_TOKEN || 'placeholder_token';

        const response = await fetch(`${BASE_URL}/api/accounts/sales-persons`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        const data = await response.json();

        if (data.success) {
            const sp = data.data.salesPersons[0];
            console.log('✅ API Request Successful');
            console.log('Checking settlement fields on first salesman:');
            console.log('- totalGrossSales:', sp.totalGrossSales);
            console.log('- totalReturns:', sp.totalReturns);
            console.log('- netReceivable:', sp.netReceivable);
            console.log('- totalCollected:', sp.totalCollected);
            console.log('- settlementStatus:', sp.settlementStatus);

            const expectedNet = sp.totalGrossSales - sp.totalReturns;
            if (sp.netReceivable === expectedNet) {
                console.log('\n✨ Net Receivable calculation is correct!');
            } else {
                console.log('\n❌ Net Receivable calculation mismatch!');
            }
        } else {
            console.log('⚠️ Could not fetch data (Auth required). Manual check recommended.');
        }
    } catch (err) {
        console.log('Error during verification:', err.message);
    }
}

console.log('Verification script created. Run with valid TOKEN if possible.');
// verifySettlementAPI(); 
