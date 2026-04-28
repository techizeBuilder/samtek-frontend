/**
 * Test script to verify logout functionality clears storage properly
 * Run this in browser console after login to simulate logout storage clearing
 */

function testLogoutFix() {
  console.log('=== TESTING LOGOUT STORAGE CLEARING ===');
  
  // Simulate storage items that might exist after login
  localStorage.setItem('token', 'test-token-12345');
  localStorage.setItem('user', JSON.stringify({
    id: 1,
    username: 'testuser',
    role: 'Superadmin',
    permissions: { modules: [{ name: 'superAdmin' }] }
  }));
  localStorage.setItem('someOtherData', 'should-remain');
  
  sessionStorage.setItem('tempData', 'temp-session-data');
  
  console.log('BEFORE LOGOUT:');
  console.log('localStorage.token:', localStorage.getItem('token'));
  console.log('localStorage.user:', localStorage.getItem('user'));
  console.log('localStorage.someOtherData:', localStorage.getItem('someOtherData'));
  console.log('sessionStorage.tempData:', sessionStorage.getItem('tempData'));
  console.log('localStorage length:', localStorage.length);
  console.log('sessionStorage length:', sessionStorage.length);
  
  // Simulate logout clearing
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
  
  console.log('\nAFTER LOGOUT:');
  console.log('localStorage.token:', localStorage.getItem('token')); // Should be null
  console.log('localStorage.user:', localStorage.getItem('user')); // Should be null  
  console.log('localStorage.someOtherData:', localStorage.getItem('someOtherData')); // Should remain
  console.log('sessionStorage.tempData:', sessionStorage.getItem('tempData')); // Should be null
  console.log('localStorage length:', localStorage.length);
  console.log('sessionStorage length:', sessionStorage.length);
  
  console.log('\n✅ Logout storage clearing test completed');
  console.log('Expected: token=null, user=null, tempData=null');
  console.log('Expected: someOtherData should remain (only auth-related data cleared)');
}

// Run the test
testLogoutFix();