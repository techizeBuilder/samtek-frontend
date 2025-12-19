// Check authentication status in browser
console.log('🔍 Checking authentication status...');

// Check token in localStorage
const token = localStorage.getItem('token');
console.log('🎫 Token exists:', token ? 'Yes' : 'No');
console.log('🎫 Token value:', token ? token.substring(0, 50) + '...' : 'None');

// Check if user is logged in
const userString = localStorage.getItem('user');
console.log('👤 User data exists:', userString ? 'Yes' : 'No');

if (userString) {
  try {
    const user = JSON.parse(userString);
    console.log('👤 User data:', user);
    console.log('👤 User role:', user.role);
    console.log('👤 User company:', user.companyId);
  } catch (e) {
    console.error('❌ Failed to parse user data:', e);
  }
}

// Test authenticated API call
async function testWithToken() {
  if (!token) {
    console.log('❌ No token available - user needs to login');
    return;
  }
  
  try {
    console.log('🔄 Testing authenticated API call...');
    
    const response = await fetch('http://localhost:5000/api/unit-manager/returns', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.status === 401) {
      console.log('❌ Token is invalid or expired - user needs to re-login');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Authenticated API call successful:', data);
    } else {
      console.log('⚠️ Other error:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWithToken();