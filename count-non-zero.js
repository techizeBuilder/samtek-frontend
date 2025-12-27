// Count all products where batchAdjusted is NOT 0

const countNonZeroBatchAdjusted = () => {
  console.log('🔢 Counting Products with batchAdjusted NOT equal to 0...\n');

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

  console.log('📋 Products with batchAdjusted NOT equal to 0:');
  console.log('═'.repeat(60));

  const nonZeroProducts = [];
  
  productSummaries.forEach((product, index) => {
    if (product.batchAdjusted !== 0) {
      nonZeroProducts.push({
        index: index + 1,
        productName: product.productName,
        batchAdjusted: product.batchAdjusted
      });
      
      console.log(`${nonZeroProducts.length}. Product ${index + 1}: ${product.productName}`);
      console.log(`   batchAdjusted: ${product.batchAdjusted}`);
      console.log('');
    }
  });

  console.log('📊 SUMMARY:');
  console.log('═'.repeat(40));
  console.log(`Total Products: ${productSummaries.length}`);
  console.log(`Products with batchAdjusted = 0: ${productSummaries.length - nonZeroProducts.length}`);
  console.log(`Products with batchAdjusted ≠ 0: ${nonZeroProducts.length}`);
  
  console.log('\n🔢 VALUES BREAKDOWN:');
  const valueCounts = {};
  nonZeroProducts.forEach(product => {
    const value = product.batchAdjusted;
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  Object.keys(valueCounts).sort().forEach(value => {
    console.log(`   batchAdjusted = ${value}: ${valueCounts[value]} products`);
  });
  
  console.log(`\n✅ ANSWER: ${nonZeroProducts.length} products have batchAdjusted ≠ 0`);
  
  return nonZeroProducts.length;
};

countNonZeroBatchAdjusted();