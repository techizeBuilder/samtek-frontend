// Analyze the batch creation for the user's data

const analyzeUserData = () => {
  console.log('🧪 Analyzing User\'s JSON Data for Batch Creation...\n');

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

  console.log(`Total Products: ${productSummaries.length}\n`);

  let validProducts = [];
  let rejectedProducts = [];
  let totalBatches = 0;

  productSummaries.forEach((product, index) => {
    const { productName, batchAdjusted } = product;
    
    // Apply our validation logic
    const isValid = batchAdjusted && batchAdjusted >= 1 && batchAdjusted !== 0;
    
    if (isValid) {
      const batchesToCreate = Math.max(Math.ceil(batchAdjusted), 1);
      totalBatches += batchesToCreate;
      
      validProducts.push({
        index: index + 1,
        productName,
        batchAdjusted,
        batchesToCreate,
        status: 'APPROVED'
      });
      
      console.log(`✅ Product ${index + 1}: ${productName.substring(0, 30)}...`);
      console.log(`   batchAdjusted: ${batchAdjusted} → Creates ${batchesToCreate} batch(es)`);
      
    } else {
      rejectedProducts.push({
        index: index + 1,
        productName,
        batchAdjusted,
        reason: batchAdjusted < 1 ? 'batchAdjusted < 1' : 'batchAdjusted = 0',
        status: 'REJECTED'
      });
      
      console.log(`❌ Product ${index + 1}: ${productName.substring(0, 30)}...`);
      console.log(`   batchAdjusted: ${batchAdjusted} → REJECTED (${batchAdjusted < 1 ? 'less than 1' : 'equals 0'})`);
    }
    console.log('');
  });

  console.log('📊 SUMMARY:');
  console.log('═'.repeat(50));
  console.log(`Total Products: ${productSummaries.length}`);
  console.log(`Valid Products (approved): ${validProducts.length}`);
  console.log(`Rejected Products: ${rejectedProducts.length}`);
  console.log(`Expected Total Batch Entries: ${totalBatches}`);
  console.log('');

  console.log('🎯 VALID PRODUCTS BREAKDOWN:');
  validProducts.forEach(product => {
    console.log(`  ${product.index}. ${product.productName}: ${product.batchesToCreate} batch(es)`);
  });

  console.log('\n⚠️  REJECTED PRODUCTS BREAKDOWN:');
  rejectedProducts.forEach(product => {
    console.log(`  ${product.index}. ${product.productName}: ${product.reason}`);
  });

  console.log('\n🏁 CONCLUSION:');
  console.log(`You should get exactly ${totalBatches} ProductionBatch entries`);
  console.log(`If you're getting ${totalBatches}, the system is working correctly`);
  console.log(`If you're getting a different number, there's a backend issue`);
};

analyzeUserData();