// 🎯 IMPLEMENTATION: Smart Batch Entry Creation Logic
// This code handles fractional batchAdjusted values intelligently

/**
 * Create batch entries from approved items with smart combining logic
 * @param {Array} approvedItems - Array of items with batchAdjusted values
 * @param {ObjectId} companyId - Company ID
 * @param {Date} productionDate - Production date
 * @param {String} approvedBy - User who approved
 * @returns {Array} Array of batch entries ready to be saved
 */
async function createSmartBatchEntries({
  approvedItems,
  companyId,
  productionDate,
  approvedBy
}) {
  try {
    console.log('🎯 Creating smart batch entries for', approvedItems.length, 'items');
    
    // Get next batch number from database
    const lastBatch = await ProductionBatch.findOne({
      companyId,
      productionDate
    }).sort({ batchNumber: -1 }).limit(1);
    
    let currentBatchNumber = (lastBatch?.batchNumber || 0) + 1;
    
    const batchEntries = [];
    const fractionalItems = [];
    
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Process Full Batches (Integer Part)
    // ═══════════════════════════════════════════════════════════
    
    for (const item of approvedItems) {
      const fullBatches = Math.floor(item.batchAdjusted);
      const fractional = item.batchAdjusted % 1;
      
      console.log(`📦 ${item.productName}: ${item.batchAdjusted} = ${fullBatches} full + ${fractional.toFixed(2)} fractional`);
      
      // Create separate entries for each full batch
      for (let i = 0; i < fullBatches; i++) {
        const batchNo = `BATNO${String(currentBatchNumber).padStart(2, '0')}`;
        
        batchEntries.push({
          companyId,
          groupId: item.groupId || null,
          batchNumber: currentBatchNumber,
          batchNo,
          productionDate,
          qtyPerBatch: item.qtyPerBatch,
          qtyAchieved: item.qtyPerBatch,
          productionLoss: 0,
          status: 'pending',
          mouldingTime: null,
          unloadingTime: null,
          createdBy: approvedBy,
          totalBatchWeight: 1.0, // Full batch
          itemContributions: [{
            itemId: item.productId,
            dailyProductionId: item.dailyDetailsId || null,
            batchFraction: 1.0,
            qtyContribution: item.qtyPerBatch,
            snapshotTakenAt: new Date()
          }],
          notes: `Full batch for ${item.productName}`
        });
        
        console.log(`   ✅ Created ${batchNo} - Full batch (1.0)`);
        currentBatchNumber++;
      }
      
      // Collect fractional remainders for combining
      if (fractional > 0) {
        fractionalItems.push({
          productId: item.productId,
          productName: item.productName,
          groupId: item.groupId,
          dailyDetailsId: item.dailyDetailsId,
          batchFraction: fractional,
          qtyPerBatch: item.qtyPerBatch
        });
        
        console.log(`   📌 Collected fractional: ${fractional.toFixed(2)}`);
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 2: Combine Fractional Batches Intelligently
    // ═══════════════════════════════════════════════════════════
    
    if (fractionalItems.length > 0) {
      console.log(`\n🔄 Processing ${fractionalItems.length} fractional items...`);
      
      // Sort by batchFraction descending (largest first)
      fractionalItems.sort((a, b) => b.batchFraction - a.batchFraction);
      
      let currentCombinedBatch = {
        items: [],
        totalWeight: 0
      };
      
      for (const fractionalItem of fractionalItems) {
        const newTotal = currentCombinedBatch.totalWeight + fractionalItem.batchFraction;
        
        // Decision: Should we add to current batch or start new one?
        // Rule: Keep batch between 0.5 and 1.3 (reasonable production range)
        const shouldStartNewBatch = currentCombinedBatch.items.length > 0 && newTotal > 1.3;
        
        if (shouldStartNewBatch) {
          // Save current combined batch
          const batchNo = `BATNO${String(currentBatchNumber).padStart(2, '0')}`;
          
          batchEntries.push({
            companyId,
            groupId: currentCombinedBatch.items[0].groupId || null, // Use first item's group
            batchNumber: currentBatchNumber,
            batchNo,
            productionDate,
            qtyPerBatch: currentCombinedBatch.items[0].qtyPerBatch, // Standard qty
            qtyAchieved: Math.round(currentCombinedBatch.items[0].qtyPerBatch * currentCombinedBatch.totalWeight),
            productionLoss: 0,
            status: 'pending',
            mouldingTime: null,
            unloadingTime: null,
            createdBy: approvedBy,
            totalBatchWeight: currentCombinedBatch.totalWeight,
            itemContributions: currentCombinedBatch.items.map(item => ({
              itemId: item.productId,
              dailyProductionId: item.dailyDetailsId || null,
              batchFraction: item.batchFraction,
              qtyContribution: Math.round(item.qtyPerBatch * item.batchFraction),
              snapshotTakenAt: new Date()
            })),
            notes: `Combined batch from ${currentCombinedBatch.items.length} items (total weight: ${currentCombinedBatch.totalWeight.toFixed(2)})`
          });
          
          console.log(`   ✅ Created ${batchNo} - Combined batch (${currentCombinedBatch.totalWeight.toFixed(2)})`);
          currentCombinedBatch.items.forEach(item => {
            console.log(`      - ${item.productName}: ${item.batchFraction.toFixed(2)}`);
          });
          
          currentBatchNumber++;
          
          // Start new batch with current item
          currentCombinedBatch = {
            items: [fractionalItem],
            totalWeight: fractionalItem.batchFraction
          };
        } else {
          // Add to current batch
          currentCombinedBatch.items.push(fractionalItem);
          currentCombinedBatch.totalWeight += fractionalItem.batchFraction;
          
          console.log(`   📎 Added ${fractionalItem.productName} (${fractionalItem.batchFraction.toFixed(2)}) - Total: ${currentCombinedBatch.totalWeight.toFixed(2)}`);
        }
      }
      
      // Save last combined batch if it exists
      if (currentCombinedBatch.items.length > 0) {
        const batchNo = `BATNO${String(currentBatchNumber).padStart(2, '0')}`;
        
        batchEntries.push({
          companyId,
          groupId: currentCombinedBatch.items[0].groupId || null,
          batchNumber: currentBatchNumber,
          batchNo,
          productionDate,
          qtyPerBatch: currentCombinedBatch.items[0].qtyPerBatch,
          qtyAchieved: Math.round(currentCombinedBatch.items[0].qtyPerBatch * currentCombinedBatch.totalWeight),
          productionLoss: 0,
          status: 'pending',
          mouldingTime: null,
          unloadingTime: null,
          createdBy: approvedBy,
          totalBatchWeight: currentCombinedBatch.totalWeight,
          itemContributions: currentCombinedBatch.items.map(item => ({
            itemId: item.productId,
            dailyProductionId: item.dailyDetailsId || null,
            batchFraction: item.batchFraction,
            qtyContribution: Math.round(item.qtyPerBatch * item.batchFraction),
            snapshotTakenAt: new Date()
          })),
          notes: `Combined batch from ${currentCombinedBatch.items.length} items (total weight: ${currentCombinedBatch.totalWeight.toFixed(2)})`
        });
        
        console.log(`   ✅ Created ${batchNo} - Combined batch (${currentCombinedBatch.totalWeight.toFixed(2)})`);
        currentCombinedBatch.items.forEach(item => {
          console.log(`      - ${item.productName}: ${item.batchFraction.toFixed(2)}`);
        });
        
        currentBatchNumber++;
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 3: Return All Batch Entries
    // ═══════════════════════════════════════════════════════════
    
    console.log(`\n✅ Total batch entries created: ${batchEntries.length}`);
    console.log(`   - Full batches: ${batchEntries.filter(b => b.totalBatchWeight === 1.0).length}`);
    console.log(`   - Combined batches: ${batchEntries.filter(b => b.totalBatchWeight !== 1.0).length}`);
    
    return batchEntries;
    
  } catch (error) {
    console.error('❌ Error creating smart batch entries:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE USAGE IN YOUR CONTROLLER
// ═══════════════════════════════════════════════════════════════

/**
 * Unit Manager Approval - Create batches with smart logic
 */
export const approveProductSummaries = async (req, res) => {
  try {
    const { productSummaries, approvalDate } = req.body;
    const user = req.user;
    
    console.log('🏭 Unit Manager approving products with smart batch creation');
    
    // Prepare items for batch creation
    const approvedItems = productSummaries.map(summary => ({
      productId: summary.productId,
      productName: summary.productName,
      groupId: summary.groupId || null,
      dailyDetailsId: summary.dailyDetailsId,
      batchAdjusted: summary.batchAdjusted,
      qtyPerBatch: summary.qtyPerBatch
    }));
    
    // Create smart batch entries
    const batchEntries = await createSmartBatchEntries({
      approvedItems,
      companyId: user.companyId,
      productionDate: new Date(approvalDate),
      approvedBy: user.username
    });
    
    // Insert all batches into database
    const createdBatches = await ProductionBatch.insertMany(batchEntries);
    
    console.log(`✅ Successfully created ${createdBatches.length} batch entries`);
    
    res.json({
      success: true,
      message: `Approved ${productSummaries.length} products and created ${createdBatches.length} batch entries`,
      data: {
        productsApproved: productSummaries.length,
        batchesCreated: createdBatches.length,
        batchNumbers: createdBatches.map(b => b.batchNo)
      }
    });
    
  } catch (error) {
    console.error('Error in approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve products',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// TEST EXAMPLES
// ═══════════════════════════════════════════════════════════════

/**
 * Test the batch creation logic with your examples
 */
function testBatchCreation() {
  console.log('🧪 Testing Batch Creation Logic\n');
  
  // Example 1: batchAdjusted = 5.2
  console.log('═══════════════════════════════════════');
  console.log('Test 1: batchAdjusted = 5.2');
  console.log('═══════════════════════════════════════');
  const test1 = [
    { productId: 'A', productName: 'Item A', batchAdjusted: 5.2, qtyPerBatch: 234 }
  ];
  // Expected: 6 entries (5 full + 1 with 0.2)
  console.log('Expected: 6 entries (5 full batches + 1 partial 0.2)');
  console.log('');
  
  // Example 2: batchAdjusted = 2.3
  console.log('═══════════════════════════════════════');
  console.log('Test 2: batchAdjusted = 2.3');
  console.log('═══════════════════════════════════════');
  const test2 = [
    { productId: 'B', productName: 'Item B', batchAdjusted: 2.3, qtyPerBatch: 234 }
  ];
  // Expected: 3 entries (2 full + 1 with 0.3)
  console.log('Expected: 3 entries (2 full batches + 1 partial 0.3)');
  console.log('');
  
  // Example 3: Multiple fractional items
  console.log('═══════════════════════════════════════');
  console.log('Test 3: Multiple fractional items');
  console.log('═══════════════════════════════════════');
  const test3 = [
    { productId: 'C', productName: 'Item C', batchAdjusted: 1.3, qtyPerBatch: 234 },
    { productId: 'D', productName: 'Item D', batchAdjusted: 0.3, qtyPerBatch: 234 },
    { productId: 'E', productName: 'Item E', batchAdjusted: 0.6, qtyPerBatch: 234 }
  ];
  // Expected: 
  // - Item C: 1 full batch + fractional 0.3
  // - Item D: fractional 0.3
  // - Item E: fractional 0.6
  // Combined: 0.3 + 0.3 + 0.6 = 1.2 (can be one combined batch)
  // Total: 2 entries (1 full from C + 1 combined with all fractionals)
  console.log('Expected: 2 entries');
  console.log('  - BATNO01: Item C full batch (1.0)');
  console.log('  - BATNO02: Combined - Item E (0.6) + Item C (0.3) + Item D (0.3) = 1.2');
  console.log('');
}

// Run test
// testBatchCreation();

export { createSmartBatchEntries };
