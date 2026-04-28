/**
 * Test script to debug batch update differences between Unit Head and Super Admin
 */

import fetch from 'node-fetch';

// Test data
const ITEM_ID = '69296bfd731641b478f2893d';
const NEW_BATCH_VALUE = '7777'; // Change to this value

// API endpoints
const UNIT_HEAD_API = `http://localhost:5000/api/unit-head/inventory/items/${ITEM_ID}`;
const SUPER_ADMIN_API = `http://localhost:5000/api/super-admin/inventory/items/${ITEM_ID}`;

// You'll need to get these tokens by logging in as each role
const UNIT_HEAD_TOKEN = 'your_unit_head_token_here';
const SUPER_ADMIN_TOKEN = 'your_super_admin_token_here';

async function testBatchUpdate(apiUrl, token, role) {
  try {
    console.log(`\n🧪 Testing ${role} API: ${apiUrl}`);
    
    // First, get the current item data
    const getResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      console.error(`❌ Failed to get item for ${role}:`, getResponse.status, getResponse.statusText);
      return;
    }
    
    const itemData = await getResponse.json();
    console.log(`📦 Current item data for ${role}:`, {
      name: itemData.item?.name,
      batch: itemData.item?.batch,
      store: itemData.item?.store
    });
    
    // Update the batch value
    const updateData = {
      ...itemData.item,
      batch: NEW_BATCH_VALUE
    };
    
    const updateResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      console.error(`❌ Failed to update item for ${role}:`, updateResponse.status, updateResponse.statusText);
      const errorText = await updateResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const updateResult = await updateResponse.json();
    console.log(`✅ ${role} update successful:`, {
      message: updateResult.message,
      newBatch: updateResult.item?.batch
    });
    
  } catch (error) {
    console.error(`❌ Error testing ${role}:`, error.message);
  }
}

async function main() {
  console.log('🔍 Testing batch update differences between Unit Head and Super Admin...');
  
  // Test Unit Head API
  if (UNIT_HEAD_TOKEN !== 'your_unit_head_token_here') {
    await testBatchUpdate(UNIT_HEAD_API, UNIT_HEAD_TOKEN, 'Unit Head');
  } else {
    console.log('⚠️ Please set UNIT_HEAD_TOKEN');
  }
  
  // Test Super Admin API  
  if (SUPER_ADMIN_TOKEN !== 'your_super_admin_token_here') {
    await testBatchUpdate(SUPER_ADMIN_API, SUPER_ADMIN_TOKEN, 'Superadmin');
  } else {
    console.log('⚠️ Please set SUPER_ADMIN_TOKEN');
  }
  
  console.log('\n📊 Check the server console for detailed sync logs...');
}

main().catch(console.error);