# Smart Batch Reuse Strategy 🎯

## Problem
When approving items with small `batchAdjusted` values like **0.1, 0.3, 0.5**, the current system creates a **NEW batch** for each item. This leads to many inefficient partial batches.

### Example Issue:
```
Approve Item A (0.1) → BATNO01: 0.1
Approve Item B (0.3) → BATNO02: 0.3  
Approve Item C (0.5) → BATNO03: 0.5
Result: 3 partial batches (wasteful!)
```

---

## Solution: REUSE Existing Partial Batches

### Strategy:
**Before creating a new batch, check if existing PENDING batches have space available.**

### Algorithm:
```javascript
function approveItem(itemId, batchAdjusted, companyId, groupId) {
  // Step 1: Find existing PENDING partial batches in same group
  const existingBatches = await ProductionBatch.find({
    companyId,
    groupId,
    status: 'pending',
    totalBatchAdjusted: { $lt: 1.0 } // Has space
  }).sort({ createdAt: 1 }); // Oldest first (FIFO)
  
  // Step 2: Try to fit in existing batch
  for (const batch of existingBatches) {
    const availableSpace = 1.0 - batch.totalBatchAdjusted;
    
    if (batchAdjusted <= availableSpace) {
      // ✅ FITS! Add to this batch
      batch.combinedItems.push({
        itemId,
        batchAdjustedValue: batchAdjusted,
        qtyContribution: qtyPerBatch
      });
      batch.totalBatchAdjusted += batchAdjusted;
      await batch.save();
      return batch; // Done!
    }
  }
  
  // Step 3: No space found → Create new batch
  return await createNewBatch(itemId, batchAdjusted);
}
```

---

## Implementation in `createProductionBatchEntries`

### Updated Function:
```javascript
const createProductionBatchEntries = async ({
  productId,
  companyId,
  date,
  qtyPerBatch,
  batchAdjusted,
  groupId,
  approvedBy,
  dailyDetailsId
}) => {
  const today = new Date(date);
  today.setUTCHours(0, 0, 0, 0);
  
  // 🎯 SMART REUSE: Check if existing partial batches can accommodate this item
  const existingPartialBatches = await ProductionBatch.find({
    companyId,
    groupId: groupId || null, // Match groupId (null for ungrouped)
    productionDate: today,
    status: 'pending',
    totalBatchAdjusted: { $lt: 1.0 } // Has available space
  }).sort({ createdAt: 1 }); // Oldest first (FIFO)
  
  console.log(`🔍 Found ${existingPartialBatches.length} existing partial batches with space`);
  
  // Try to add to existing batch first
  for (const existingBatch of existingPartialBatches) {
    const availableSpace = parseFloat((1.0 - existingBatch.totalBatchAdjusted).toFixed(2));
    
    if (batchAdjusted <= availableSpace) {
      // ✅ FITS! Add to existing batch
      console.log(`✅ Adding to existing ${existingBatch.batchNo}: ${batchAdjusted} + ${existingBatch.totalBatchAdjusted} = ${existingBatch.totalBatchAdjusted + batchAdjusted}`);
      
      existingBatch.combinedItems.push({
        itemId: productId,
        DailyProductionId: dailyDetailsId || null,
        batchAdjustedValue: batchAdjusted,
        qtyContribution: qtyPerBatch
      });
      
      existingBatch.totalBatchAdjusted = parseFloat(
        (existingBatch.totalBatchAdjusted + batchAdjusted).toFixed(2)
      );
      
      await existingBatch.save();
      
      console.log(`🎉 Successfully added to existing batch ${existingBatch.batchNo}`);
      return [existingBatch]; // Return the updated batch
    }
  }
  
  // No existing batch can fit → Create new batch
  console.log(`📦 No existing batch can fit ${batchAdjusted}, creating new batch...`);
  
  // Get next batch number
  const existingBatches = await ProductionBatch.find({
    companyId,
    productionDate: today
  }).select('batchNumber').sort({ batchNumber: -1 }).limit(1);
  
  const nextBatchNumber = existingBatches.length > 0 ? existingBatches[0].batchNumber + 1 : 1;
  const batchNo = `BATNO${String(nextBatchNumber).padStart(2, '0')}`;
  
  const newBatch = await ProductionBatch.create({
    companyId,
    groupId: groupId || null,
    batchNumber: nextBatchNumber,
    batchNo,
    productionDate: today,
    qtyPerBatch,
    qtyAchieved: qtyPerBatch,
    productionLoss: 0,
    status: 'pending',
    totalBatchAdjusted: batchAdjusted,
    combinedItems: [{
      itemId: productId,
      DailyProductionId: dailyDetailsId || null,
      batchAdjustedValue: batchAdjusted,
      qtyContribution: qtyPerBatch
    }],
    createdBy: approvedBy,
    notes: `Created with batch value ${batchAdjusted}`
  });
  
  console.log(`✅ Created new batch ${batchNo} with value ${batchAdjusted}`);
  return [newBatch];
};
```

---

## Benefits

### Before (Wasteful):
```
Item A (0.1) → BATNO01: 0.1 ❌
Item B (0.3) → BATNO02: 0.3 ❌
Item C (0.5) → BATNO03: 0.5 ❌
Item D (0.2) → BATNO04: 0.2 ❌
Total: 4 batches (all partial)
```

### After (Efficient):
```
Item A (0.1) → BATNO01: 0.1
Item B (0.3) → BATNO01: 0.4 (0.1 + 0.3) ✅
Item C (0.5) → BATNO01: 0.9 (0.4 + 0.5) ✅
Item D (0.2) → BATNO02: 0.2 (doesn't fit in BATNO01)
Total: 2 batches (optimized!)
```

---

## Important Rules

1. **Only reuse PENDING batches** - Don't touch `in_progress` or `completed` batches
2. **Match groupId** - Only combine items from same production group
3. **Max 1.0 weight** - Never exceed this limit
4. **FIFO order** - Fill oldest batches first
5. **Same date** - Only combine batches from same production date

---

## Testing

### Test Case 1: Multiple Small Values
```javascript
Approve items: 0.1, 0.2, 0.3, 0.4
Expected: 2 batches
- BATNO01: 0.1 + 0.2 + 0.3 + 0.4 = 1.0 ✅
```

### Test Case 2: Mixed Values
```javascript
Approve items: 0.8, 0.3, 0.5
Expected: 2 batches
- BATNO01: 0.8
- BATNO02: 0.3 + 0.5 = 0.8 ✅
```

### Test Case 3: Values > 1.0
```javascript
Approve items: 1.5, 0.3
Expected: 2 batches
- BATNO01: 1.0 (from 1.5)
- BATNO02: 0.5 + 0.3 = 0.8 ✅
```

---

## Next Steps

1. Update `createProductionBatchEntries` function with smart reuse logic
2. Test with your production data (0.1, 1.3, 1, 2.3, 0.3)
3. Verify batch count is optimized
4. Ensure no code breaks or existing functionality affected

**This strategy ensures efficient batch utilization while maintaining code stability!** 🎉
