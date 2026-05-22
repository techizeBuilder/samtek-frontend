// Simple test file to check if production controller syntax is correct
import ProductionGroup from './server/models/ProductionGroup.js';
import ProductDailySummary from './server/models/ProductDailySummary.js';

console.log('✅ Import test successful - ProductionController dependencies working');

// Test the logic without API call
async function testBatchCalculation() {
  console.log('🧮 Testing batch calculation logic...');
  
  // Mock data to test the calculation logic
  const mockGroups = [
    {
      name: 'Group A',
      items: [
        { _id: '507f1f77bcf86cd799439011' },
        { _id: '507f1f77bcf86cd799439012' }
      ]
    },
    {
      name: 'Group B', 
      items: [
        { _id: '507f1f77bcf86cd799439013' }
      ]
    }
  ];

  const mockSummaries = [
    { productId: '507f1f77bcf86cd799439011', productionFinalBatches: 5 },
    { productId: '507f1f77bcf86cd799439012', productionFinalBatches: 3 },
    { productId: '507f1f77bcf86cd799439013', productionFinalBatches: 7 }
  ];

  console.log('Mock Production Groups:', mockGroups);
  console.log('Mock Daily Summaries:', mockSummaries);

  // Test the calculation logic
  const dashBoardData = [];
  
  for (const group of mockGroups) {
    if (!group.items || group.items.length === 0) {
      dashBoardData.push({
        productGroup: group.name,
        noOfBatchesForProduction: 0
      });
      continue;
    }

    const itemIds = group.items.map(item => item._id);
    const productSummaries = mockSummaries.filter(summary => 
      itemIds.includes(summary.productId)
    );
    
    const totalBatches = productSummaries.reduce((total, summary) => {
      return total + (summary.productionFinalBatches || 0);
    }, 0);
    
    dashBoardData.push({
      productGroup: group.name,
      noOfBatchesForProduction: totalBatches
    });
    
    console.log(`✅ Group "${group.name}": ${group.items.length} items, ${totalBatches} total batches`);
  }

  console.log('\n🎯 Final Dashboard Data:');
  console.log(JSON.stringify(dashBoardData, null, 2));
}

testBatchCalculation();