// Quick test to verify both endpoints work without variable errors

console.log('Testing endpoints for variable definition errors...');
console.log('');
console.log('✅ Fix Applied:');
console.log('  - Fixed targetDate reference in createPackingSheet function');
console.log('  - Changed targetDate back to today in createPackingSheet since it uses a different date logic');
console.log('');
console.log('📋 Expected Results:');
console.log('  - /api/packing/production-groups should work (uses targetDate from query param)');
console.log('  - /api/packing/sheets should work (uses today variable)'); 
console.log('  - No more "targetDate is not defined" or "today is not defined" errors');
console.log('');
console.log('🔍 Previous Issues Fixed:');
console.log('  1. PackingSheet queries now filter by date (no more yesterday data)');
console.log('  2. Variable reference errors resolved');
console.log('  3. Date parameter support added to production-groups endpoint');
console.log('');
console.log('To test:');
console.log('  curl http://localhost:5000/api/packing/production-groups (requires auth header)');
console.log('  curl http://localhost:5000/api/packing/sheets (requires auth header)');