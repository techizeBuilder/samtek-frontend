// Test the updated API with date parameter
console.log('Testing production groups API with date parameters...');

// Test for today (should show 2 completed + pending batches)
console.log('\n1. Testing for today (December 23, 2025):');
console.log('URL: http://localhost:5000/api/packing/production-groups');

// Test for yesterday (should show 6 completed batches)
console.log('\n2. Testing for yesterday (December 22, 2025):');
console.log('URL: http://localhost:5000/api/packing/production-groups?date=2025-12-22');

// Instructions for testing
console.log('\n📋 How to test:');
console.log('1. Start the server with: npm run dev');
console.log('2. Use Postman or browser to test these URLs:');
console.log('   - Today: http://localhost:5000/api/packing/production-groups');
console.log('   - Yesterday: http://localhost:5000/api/packing/production-groups?date=2025-12-22');
console.log('');
console.log('💡 Changes made:');
console.log('   - Now includes both "completed" and "in_progress" batches (not just completed)');
console.log('   - Added optional date query parameter (?date=YYYY-MM-DD)');
console.log('   - If no date is provided, defaults to today');
console.log('');
console.log('📊 Expected results:');
console.log('   - Today: Should show groups with 2 completed + 12 in_progress batches');
console.log('   - Yesterday: Should show groups with 6 completed batches');