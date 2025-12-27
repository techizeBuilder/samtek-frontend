// Test script to calculate expected batch entries from your JSON data

const productData = [
  { productName: "Everyday Kova Buns 250g", batchAdjusted: 1 },
  { productName: "Everyday Milk buns 350g", batchAdjusted: 0.1 },
  { productName: "Everyday Cream Bun 12pc", batchAdjusted: 2 },
  { productName: "Everyday Cream bun - Chocolate", batchAdjusted: 1 },
  { productName: "Everyday Cream bun - Vanilla", batchAdjusted: 1 },
  { productName: "Everyday Popular Milk 250g", batchAdjusted: 1 },
  { productName: "Every Day Bombay PAV 200g", batchAdjusted: 1 },
  { productName: "Every Day Bombay PAV 200g (RRL)", batchAdjusted: 1 },
  { productName: "Every Day Burger Buns 4\" - 200g", batchAdjusted: 1 },
  { productName: "Everyday PremiumSoft Milk Bread 400g (RRL)", batchAdjusted: 1 },
  { productName: "Every Day Pizza base 7\"", batchAdjusted: 1 },
  { productName: "Everyday Cream bun - Strawberry", batchAdjusted: 1 },
  { productName: "Everyday Osmania biscuits", batchAdjusted: 0.1 },
  { productName: "Everyday Premium Brown Bread", batchAdjusted: 1 },
  { productName: "Everyday Premium Sandwich bread 400g", batchAdjusted: 0.1 },
  { productName: "Everyday Premium Sandwich bread 400g (RRL) -", batchAdjusted: 1 },
  { productName: "Everyday Premium Whole Wheat Bread", batchAdjusted: 1 },
  { productName: "Everyday PremiumSoft Milk Bread 400g", batchAdjusted: 1 },
  { productName: "Everyday PremiumSoft Milk Bread 400g DM)", batchAdjusted: 1 },
  { productName: "Everyday Sandwich Jumbo Slice Bread 800g", batchAdjusted: 1 }
];

console.log('🧮 EXPECTED BATCH CALCULATION RESULTS:\n');

let totalBatchesToCreate = 0;
let approvedProducts = 0;
let rejectedProducts = 0;

productData.forEach((product, index) => {
  const { productName, batchAdjusted } = product;
  
  // Apply the same validation logic as the backend
  const isValid = batchAdjusted && batchAdjusted >= 1 && batchAdjusted !== 0;
  
  if (isValid) {
    // Use the same calculation as backend: Math.max(Math.ceil(batchAdjusted), 1)
    const batchesToCreate = Math.max(Math.ceil(batchAdjusted), 1);
    totalBatchesToCreate += batchesToCreate;
    approvedProducts++;
    
    console.log(`✅ ${index + 1}. ${productName.substring(0, 30)}... | batchAdjusted: ${batchAdjusted} → ${batchesToCreate} batches`);
  } else {
    rejectedProducts++;
    console.log(`❌ ${index + 1}. ${productName.substring(0, 30)}... | batchAdjusted: ${batchAdjusted} → REJECTED (< 1)`);
  }
});

console.log('\n📊 SUMMARY:');
console.log(`Total products in request: ${productData.length}`);
console.log(`Products approved: ${approvedProducts}`);
console.log(`Products rejected: ${rejectedProducts}`);
console.log(`Expected batch entries created: ${totalBatchesToCreate}`);
console.log(`Your result (6 entries): ${totalBatchesToCreate === 6 ? '✅ MATCHES' : '❌ MISMATCH'}`);

console.log('\n🔍 ANALYSIS:');
console.log('Products with batchAdjusted >= 1:', productData.filter(p => p.batchAdjusted >= 1).length);
console.log('Products with batchAdjusted < 1:', productData.filter(p => p.batchAdjusted < 1).length);
console.log('Products with batchAdjusted = 2:', productData.filter(p => p.batchAdjusted === 2).length, '(should create 2 batches each)');

if (totalBatchesToCreate !== 6) {
  console.log('\n⚠️ DISCREPANCY DETECTED!');
  console.log(`Expected: ${totalBatchesToCreate} batches, but you got: 6 batches`);
  console.log('Possible causes:');
  console.log('1. Frontend is still sending batchAdjusted: 1 as default');
  console.log('2. Backend validation is working but database has old data');
  console.log('3. Some products are failing validation for other reasons');
  console.log('4. API response might be different from this JSON');
}

console.log('\n🔧 FIXED ISSUES:');
console.log('✅ Frontend now defaults batchAdjusted to 0 instead of 1');
console.log('✅ Backend validation strengthened to prevent 0-batch entries');
console.log('✅ Multiple safety checks added in batch creation functions');