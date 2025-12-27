// Check products with batchAdjusted: 0.1 specifically

const analyzePointOneProducts = () => {
  console.log('🔍 Analyzing Products with batchAdjusted: 0.1...\n');

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

  // Find all products with batchAdjusted: 0.1
  const pointOneProducts = [];
  
  productSummaries.forEach((product, index) => {
    if (product.batchAdjusted === 0.1) {
      pointOneProducts.push({
        index: index + 1,
        productName: product.productName,
        batchAdjusted: product.batchAdjusted
      });
    }
  });

  console.log(`📊 PRODUCTS WITH batchAdjusted: 0.1`);
  console.log('═'.repeat(60));
  console.log(`Total Count: ${pointOneProducts.length} products\n`);

  pointOneProducts.forEach((product, i) => {
    console.log(`${i + 1}. Product ${product.index}: ${product.productName}`);
    console.log(`   batchAdjusted: ${product.batchAdjusted}`);
    
    // Calculate what would happen with different logic
    const currentLogic = product.batchAdjusted >= 1 ? Math.ceil(product.batchAdjusted) : 0;
    const ceilLogic = Math.ceil(product.batchAdjusted); // Always use Math.ceil
    
    console.log(`   Current Logic (≥1 required): ${currentLogic} batches (REJECTED)`);
    console.log(`   If Math.ceil applied: ${ceilLogic} batches (would create 1 batch)`);
    console.log('');
  });

  console.log(`🎯 SUMMARY FOR batchAdjusted: 0.1 Products:`);
  console.log(`Total Products: ${pointOneProducts.length}`);
  console.log(`Current Behavior: All REJECTED (0 batch entries)`);
  console.log(`If changed to allow 0.1: ${pointOneProducts.length} batch entries (1 each)`);
  console.log('');
  
  console.log('📋 SPECIFIC PRODUCTS:');
  pointOneProducts.forEach((product, i) => {
    console.log(`  ${i + 1}. ${product.productName}`);
  });

  console.log('\n🔧 POTENTIAL CHANGES:');
  console.log('Option 1: Keep current logic (reject < 1) → 0 additional batches');
  console.log(`Option 2: Allow 0.1 and round up with Math.ceil → +${pointOneProducts.length} additional batches`);
  console.log(`Option 3: Treat 0.1 as minimum 1 batch → +${pointOneProducts.length} additional batches`);
};

analyzePointOneProducts();