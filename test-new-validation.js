// Test new validation logic allowing batchAdjusted > 0

const testNewValidation = () => {
  console.log('🧪 Testing NEW validation logic (batchAdjusted > 0)...\n');

  const productSummaries = [
    { productName: "Everyday Kova Buns 250g", batchAdjusted: 1 },
    { productName: "Everyday Milk buns 350g", batchAdjusted: 0.1 },
    { productName: "Everyday Cream Bun 12pc", batchAdjusted: 2 },
    { productName: "Everyday Cream bun - Chocolate", batchAdjusted: 1 },
    { productName: "Everyday Cream bun - Vanilla", batchAdjusted: 1 },
    { productName: "Everyday Popular Milk 250g", batchAdjusted: 0 },
    { productName: "Every Day Bombay PAV 200g", batchAdjusted: 0 },
    { productName: "Every Day Bombay PAV 200g (RRL)", batchAdjusted: 0 },
    { productName: "Every Day Burger Buns 4\" - 200g", batchAdjusted: 0 },
    { productName: "Everyday PremiumSoft Milk Bread 400g (RRL)", batchAdjusted: 0 },
    { productName: "Every Day Pizza base 7\"", batchAdjusted: 0 },
    { productName: "Everyday Cream bun - Strawberry", batchAdjusted: 1 },
    { productName: "Everyday Osmania biscuits", batchAdjusted: 0.1 },
    { productName: "Everyday Premium Brown Bread", batchAdjusted: 0 },
    { productName: "Everyday Premium Sandwich bread 400g", batchAdjusted: 0.1 },
    { productName: "Everyday Premium Sandwich bread 400g (RRL)", batchAdjusted: 0 },
    { productName: "Everyday Premium Whole Wheat Bread", batchAdjusted: 0 },
    { productName: "Everyday PremiumSoft Milk Bread 400g", batchAdjusted: 0 },
    { productName: "Everyday PremiumSoft Milk Bread 400g DM)", batchAdjusted: 0 },
    { productName: "Everyday Sandwich Jumbo Slice Bread 800g", batchAdjusted: 0 }
  ];

  let validProducts = [];
  let rejectedProducts = [];
  let totalBatches = 0;

  console.log('📋 NEW VALIDATION RESULTS (batchAdjusted > 0):');
  console.log('═'.repeat(60));

  productSummaries.forEach((product, index) => {
    const { productName, batchAdjusted } = product;
    
    // NEW validation logic: batchAdjusted > 0
    const isValid = batchAdjusted && batchAdjusted > 0;
    
    if (isValid) {
      const batchesToCreate = Math.max(Math.ceil(batchAdjusted), 1);
      totalBatches += batchesToCreate;
      
      validProducts.push({
        index: index + 1,
        productName: productName.substring(0, 30) + '...',
        batchAdjusted,
        batchesToCreate,
        status: 'APPROVED'
      });
      
      console.log(`✅ Product ${index + 1}: ${productName.substring(0, 35)}...`);
      console.log(`   batchAdjusted: ${batchAdjusted} → Creates ${batchesToCreate} batch(es)`);
      
    } else {
      rejectedProducts.push({
        index: index + 1,
        productName: productName.substring(0, 30) + '...',
        batchAdjusted,
        reason: batchAdjusted <= 0 ? 'batchAdjusted ≤ 0' : 'invalid value',
        status: 'REJECTED'
      });
      
      console.log(`❌ Product ${index + 1}: ${productName.substring(0, 35)}...`);
      console.log(`   batchAdjusted: ${batchAdjusted} → REJECTED (≤ 0)`);
    }
    console.log('');
  });

  console.log('📊 NEW VALIDATION SUMMARY:');
  console.log('═'.repeat(50));
  console.log(`Total Products: ${productSummaries.length}`);
  console.log(`Valid Products (approved): ${validProducts.length}`);
  console.log(`Rejected Products: ${rejectedProducts.length}`);
  console.log(`Expected Total Batch Entries: ${totalBatches}`);
  console.log('');

  console.log('🎯 BATCH CREATION BREAKDOWN:');
  const batchBreakdown = {};
  validProducts.forEach(product => {
    const value = product.batchAdjusted;
    if (!batchBreakdown[value]) {
      batchBreakdown[value] = { count: 0, batches: 0 };
    }
    batchBreakdown[value].count++;
    batchBreakdown[value].batches += product.batchesToCreate;
  });

  Object.keys(batchBreakdown).sort((a,b) => parseFloat(a) - parseFloat(b)).forEach(value => {
    const data = batchBreakdown[value];
    console.log(`  batchAdjusted = ${value}: ${data.count} products → ${data.batches} batches`);
  });

  console.log('\n🏁 FINAL ANSWER:');
  console.log(`Expected ProductionBatch entries: ${totalBatches}`);
  console.log('');
  
  console.log('🔄 COMPARISON:');
  console.log(`OLD Logic (≥ 1): 6 batches`);
  console.log(`NEW Logic (> 0): ${totalBatches} batches`);
  console.log(`Difference: +${totalBatches - 6} additional batches`);
};

testNewValidation();