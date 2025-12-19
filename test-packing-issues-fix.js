import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testPackingIssues() {
  console.log('🧪 Testing Packing Issues Fix...\n');
  
  try {
    // Read token
    const token = fs.readFileSync('token.txt', 'utf8').trim();
    
    console.log('1️⃣ Testing GET /api/packing/production-groups (should return packing sheets)');
    const getResponse = await fetch(`${BASE_URL}/api/packing/production-groups`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const getResult = await getResponse.json();
      console.log('✅ GET API working');
      console.log('📊 Production Groups found:', getResult.data?.productionGroups?.length || 0);
      
      // Check for ungrouped items and their packing sheets
      const ungroupedGroup = getResult.data?.productionGroups?.find(g => g._id === 'ungrouped-items');
      if (ungroupedGroup) {
        console.log('📦 Ungrouped Items found with packing sheets:', ungroupedGroup.packingSheets?.length || 0);
        if (ungroupedGroup.packingSheets?.length > 0) {
          console.log('✅ Packing sheets properly loaded for ungrouped items');
          ungroupedGroup.packingSheets.forEach((sheet, index) => {
            console.log(`   Sheet ${index + 1}: ID=${sheet._id}, Status=${sheet.status}`);
          });
        } else {
          console.log('⚠️ No packing sheets found for ungrouped items');
        }
      }
      
      // Check ungrouped packing sheets separately
      if (getResult.data?.ungroupedPackingSheets) {
        console.log('📋 Separate ungrouped packing sheets:', getResult.data.ungroupedPackingSheets.length);
      }
    } else {
      const errorText = await getResponse.text();
      console.log('❌ GET API failed:', errorText);
    }
    
    console.log('\n2️⃣ Testing duplicate prevention');
    
    // Create the same packing sheet multiple times to test duplicate prevention
    const samplePackingData = {
      productionGroupId: 'ungrouped-items',
      productionGroupName: 'Ungrouped Items',
      packingStartTime: new Date().toISOString(),
      status: 'in_progress',
      items: [
        {
          productId: '693928b054dc840409006933',
          productName: 'Everyday Cream bun - Strawberry',
          indentQty: 468,
          producedQty: 296,
          packedQty: 0,
          packingLoss: 0,
          notes: 'Test duplicate prevention'
        }
      ]
    };
    
    // First creation
    console.log('📝 Creating first packing sheet...');
    const firstResponse = await fetch(`${BASE_URL}/api/packing/sheets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(samplePackingData)
    });
    
    if (firstResponse.ok) {
      const firstResult = await firstResponse.json();
      console.log('✅ First packing sheet created:', firstResult.data?._id);
      
      // Wait a moment then create another
      setTimeout(async () => {
        console.log('📝 Creating second packing sheet (should replace first)...');
        const secondResponse = await fetch(`${BASE_URL}/api/packing/sheets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...samplePackingData,
            status: 'completed' // Different status to verify replacement
          })
        });
        
        if (secondResponse.ok) {
          const secondResult = await secondResponse.json();
          console.log('✅ Second packing sheet created:', secondResult.data?._id);
          
          // Check if it's different from first
          if (firstResult.data?._id !== secondResult.data?._id) {
            console.log('✅ Duplicate prevention working - different IDs');
          } else {
            console.log('❌ Same ID returned - might be an issue');
          }
          
          // Now verify GET API shows the updated data
          console.log('\n3️⃣ Verifying GET API shows updated packing sheet');
          const verifyResponse = await fetch(`${BASE_URL}/api/packing/production-groups`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            const ungroupedGroup = verifyResult.data?.productionGroups?.find(g => g._id === 'ungrouped-items');
            if (ungroupedGroup && ungroupedGroup.packingSheets?.length > 0) {
              console.log('✅ Updated packing sheet visible in GET API');
              console.log('📊 Current packing sheets:', ungroupedGroup.packingSheets.length);
              ungroupedGroup.packingSheets.forEach((sheet, index) => {
                console.log(`   Sheet ${index + 1}: Status=${sheet.status}, ID=${sheet._id}`);
              });
            } else {
              console.log('❌ No packing sheets visible in GET API after creation');
            }
          }
          
        } else {
          const errorText = await secondResponse.text();
          console.log('❌ Second POST failed:', errorText);
        }
      }, 1000);
      
    } else {
      const errorText = await firstResponse.text();
      console.log('❌ First POST failed:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

console.log('🚀 Packing Issues Fix Test');
console.log('==========================\n');

testPackingIssues().then(() => {
  setTimeout(() => {
    console.log('\n✨ Test completed!');
  }, 2000);
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});