// Test script to verify the packing sheets date filtering fix
console.log('🧪 Testing packing sheets date filtering fix...');

const testUrls = [
  'http://localhost:5000/api/packing/production-groups',
  'http://localhost:5000/api/packing/production-groups?date=2025-12-23',  // Today
  'http://localhost:5000/api/packing/production-groups?date=2025-12-22'   // Yesterday  
];

async function testDateFiltering() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
    'username': 'admin',
    'password': 'admin123'
  };

  console.log('📅 Current date: December 23, 2025');
  console.log('');

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    const testName = i === 0 ? 'Default (Today)' : i === 1 ? 'Explicit Today' : 'Yesterday';
    
    console.log(`🔍 Test ${i + 1}: ${testName}`);
    console.log(`URL: ${url}`);
    
    try {
      const response = await fetch(url, { 
        method: 'GET', 
        headers 
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.productionGroups) {
          const groups = data.data.productionGroups;
          console.log(`✅ Found ${groups.length} production groups`);
          
          // Check dates in packing sheets
          let packingSheetsFound = 0;
          let packingSheetDates = [];
          
          groups.forEach(group => {
            if (group.items) {
              group.items.forEach(item => {
                if (item.batchDetails) {
                  item.batchDetails.forEach(batch => {
                    if (batch.packingSheets && batch.packingSheets.length > 0) {
                      packingSheetsFound += batch.packingSheets.length;
                      batch.packingSheets.forEach(sheet => {
                        const createdDate = new Date(sheet.createdAt).toDateString();
                        const startDate = new Date(sheet.packingStartTime).toDateString();
                        packingSheetDates.push({
                          id: sheet._id,
                          created: createdDate,
                          started: startDate,
                          status: sheet.status
                        });
                      });
                    }
                  });
                }
              });
            }
          });
          
          console.log(`📦 Found ${packingSheetsFound} packing sheets`);
          if (packingSheetDates.length > 0) {
            console.log('📅 Packing sheet dates:');
            packingSheetDates.forEach((sheet, idx) => {
              console.log(`   ${idx + 1}. ${sheet.id}: Created ${sheet.created}, Started ${sheet.started}, Status: ${sheet.status}`);
            });
          }
          
          // Expected results
          const expectedDate = i === 2 ? 'Mon Dec 22 2025' : 'Tue Dec 23 2025';
          const hasCorrectDate = packingSheetDates.some(sheet => 
            sheet.created === expectedDate || sheet.started === expectedDate
          );
          const hasIncorrectDate = packingSheetDates.some(sheet => 
            (i === 2 && (sheet.created === 'Tue Dec 23 2025' || sheet.started === 'Tue Dec 23 2025')) ||
            (i !== 2 && (sheet.created === 'Mon Dec 22 2025' || sheet.started === 'Mon Dec 22 2025'))
          );
          
          if (packingSheetDates.length === 0) {
            console.log(`ℹ️ No packing sheets found for this date`);
          } else if (hasCorrectDate && !hasIncorrectDate) {
            console.log(`✅ CORRECT: All packing sheets are from expected date (${expectedDate})`);
          } else if (hasIncorrectDate) {
            console.log(`❌ ERROR: Found packing sheets from wrong dates!`);
            console.log(`Expected: ${expectedDate}`);
          } else {
            console.log(`⚠️ Mixed results - please check manually`);
          }
          
        } else {
          console.log(`⚠️ Unexpected response structure: ${data.message || 'Unknown'}`);
        }
      } else {
        console.log(`❌ Request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

console.log('📋 Instructions:');
console.log('1. Start the server: npm run dev');
console.log('2. Run this test: node test-packing-date-fix.js');
console.log('3. Check that packing sheets show correct dates');
console.log('');

// If running in Node.js environment with fetch available
if (typeof fetch !== 'undefined') {
  testDateFiltering();
} else {
  console.log('💡 Please run this in a browser console or with a fetch polyfill');
}