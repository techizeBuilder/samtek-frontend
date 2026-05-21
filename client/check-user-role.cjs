const BASE_URL = 'http://localhost:5000';
const PHONE = '9700552003';
const PASSWORD = '9700552003';

// Simple JWT decoder (doesn't verify signature, just decodes)
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

async function checkUserRole() {
  try {
    console.log('🔐 Logging in to check user role...\n');
    
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: PHONE, password: PASSWORD })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed - ${loginRes.status} ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    const user = loginData.user;
    
    console.log('✅ User Information:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Company: ${user.company?.name || user.companyId}`);
    console.log(`   User ID: ${user.id}\n`);

    console.log('📋 Required Roles for Accounts/Sales API:');
    const requiredRoles = ['Unit Manager', 'Unit Head', 'Sales Person', 'Super Admin', 'Admin', 'Accountant'];
    requiredRoles.forEach(r => console.log(`   • ${r}`));
    
    const userRole = user.role;
    console.log(`\n✅ User Role: "${userRole}"`);
    
    if (requiredRoles.includes(userRole)) {
      console.log(`✅ USER HAS ACCESS to Accounts API`);
    } else {
      console.log(`❌ USER DOES NOT HAVE ACCESS to Accounts API`);
      console.log(`\n⚠️  User needs one of these roles: ${requiredRoles.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserRole();
