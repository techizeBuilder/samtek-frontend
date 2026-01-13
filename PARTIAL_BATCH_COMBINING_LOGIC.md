# 🔄 Partial Batch Combining Logic

## Problem Statement
When creating new batches, how do we:
1. **Identify** which batches are partial (not full)?
2. **Combine** new partial batches with existing old partial batches?

**Example Scenario:**
- **Old partial batch exists:** 0.5 (50% filled)
- **New approval comes:** 0.3 (30% to add)
- **Question:** Should they combine? 0.5 + 0.3 = 0.8?

---

## ✅ **Solution: Smart Partial Batch Detection & Combining**

### **Step 1: How to Identify Partial Batches**

```javascript
// A batch is PARTIAL if its totalBatchWeight < 1.0
const isPartialBatch = (batch) => {
  return batch.totalBatchWeight < 1.0 && batch.status === 'pending';
};

// Example:
const batch1 = { batchNo: 'BATNO01', totalBatchWeight: 1.0, status: 'pending' };
const batch2 = { batchNo: 'BATNO02', totalBatchWeight: 0.5, status: 'pending' };
const batch3 = { batchNo: 'BATNO03', totalBatchWeight: 0.8, status: 'in_progress' };

isPartialBatch(batch1); // ❌ false (full batch)
isPartialBatch(batch2); // ✅ true (partial, not started yet)
isPartialBatch(batch3); // ❌ false (partial but already in progress)
```

### **Key Fields in ProductionBatch Model:**

```javascript
{
  batchNo: 'BATNO01',
  totalBatchWeight: 0.5,  // ← This tells you if it's partial!
  status: 'pending',       // ← Only combine if 'pending' (not started)
  itemContributions: [     // ← List of items in this batch
    { itemId: 'A', batchFraction: 0.3 },
    { itemId: 'B', batchFraction: 0.2 }
  ]
}
```

---

## 🔄 **Step 2: Combining New Partial with Old Partial**

### **Algorithm: Find & Fill Partial Batches**

```javascript
async function createBatchesWithCombining({
  approvedItems,
  companyId,
  productionDate,
  approvedBy
}) {
  
  // ═════════════════════════════════════════════════════════════
  // STEP 1: Find existing partial batches for today
  // ═════════════════════════════════════════════════════════════
  
  const today = new Date(productionDate);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const existingPartialBatches = await ProductionBatch.find({
    companyId,
    productionDate: { $gte: today, $lt: tomorrow },
    totalBatchWeight: { $lt: 1.0 },  // ← Partial batches only
    status: 'pending'  // ← Only pending (not started yet)
  }).sort({ totalBatchWeight: -1 }); // Sort by fullness (most full first)
  
  console.log(`📦 Found ${existingPartialBatches.length} existing partial batches:`);
  existingPartialBatches.forEach(batch => {
    console.log(`   - ${batch.batchNo}: ${batch.totalBatchWeight.toFixed(2)} (${(batch.totalBatchWeight * 100).toFixed(0)}% full)`);
  });
  
  // ═════════════════════════════════════════════════════════════
  // STEP 2: Process new items - separate full batches and fractionals
  // ═════════════════════════════════════════════════════════════
  
  const newBatchEntries = [];
  const newFractionalItems = [];
  let nextBatchNumber = await getNextBatchNumber(companyId, today);
  
  for (const item of approvedItems) {
    const fullBatches = Math.floor(item.batchAdjusted);
    const fractional = item.batchAdjusted % 1;
    
    // Create full batches
    for (let i = 0; i < fullBatches; i++) {
      newBatchEntries.push(createFullBatchEntry(item, nextBatchNumber++, approvedBy, today));
    }
    
    // Collect fractional items
    if (fractional > 0) {
      newFractionalItems.push({
        productId: item.productId,
        productName: item.productName,
        batchFraction: fractional,
        qtyPerBatch: item.qtyPerBatch,
        dailyDetailsId: item.dailyDetailsId
      });
    }
  }
  
  // ═════════════════════════════════════════════════════════════
  // STEP 3: Try to fill existing partial batches with new fractionals
  // ═════════════════════════════════════════════════════════════
  
  const updatedBatches = [];
  const remainingFractionals = [...newFractionalItems];
  
  for (const partialBatch of existingPartialBatches) {
    const availableSpace = 1.3 - partialBatch.totalBatchWeight; // Allow up to 1.3x
    
    console.log(`\n🔄 Trying to fill ${partialBatch.batchNo} (current: ${partialBatch.totalBatchWeight.toFixed(2)}, space: ${availableSpace.toFixed(2)})`);
    
    // Find fractional items that can fit
    const itemsToAdd = [];
    let spaceUsed = 0;
    
    for (let i = remainingFractionals.length - 1; i >= 0; i--) {
      const fractionalItem = remainingFractionals[i];
      
      if (spaceUsed + fractionalItem.batchFraction <= availableSpace) {
        itemsToAdd.push(fractionalItem);
        spaceUsed += fractionalItem.batchFraction;
        remainingFractionals.splice(i, 1); // Remove from remaining list
        
        console.log(`   ✅ Adding ${fractionalItem.productName} (${fractionalItem.batchFraction.toFixed(2)})`);
      }
    }
    
    // Update the partial batch if we found items to add
    if (itemsToAdd.length > 0) {
      // Add new items to itemContributions array
      itemsToAdd.forEach(item => {
        partialBatch.itemContributions.push({
          itemId: item.productId,
          dailyProductionId: item.dailyDetailsId,
          batchFraction: item.batchFraction,
          qtyContribution: Math.round(item.qtyPerBatch * item.batchFraction),
          snapshotTakenAt: new Date()
        });
      });
      
      // Update total weight
      partialBatch.totalBatchWeight += spaceUsed;
      
      // Update notes
      partialBatch.notes = `${partialBatch.notes} | Updated: Added ${itemsToAdd.length} items (${spaceUsed.toFixed(2)}) on ${new Date().toLocaleString()}`;
      
      // Save updated batch
      await partialBatch.save();
      updatedBatches.push(partialBatch);
      
      console.log(`   📝 Updated ${partialBatch.batchNo}: ${(partialBatch.totalBatchWeight * 100).toFixed(0)}% full`);
    }
  }
  
  // ═════════════════════════════════════════════════════════════
  // STEP 4: Create new batches for remaining fractionals
  // ═════════════════════════════════════════════════════════════
  
  if (remainingFractionals.length > 0) {
    console.log(`\n🆕 Creating new batches for ${remainingFractionals.length} remaining fractionals`);
    
    const newCombinedBatches = combineRemainingFractionals(
      remainingFractionals,
      nextBatchNumber,
      approvedBy,
      today,
      companyId
    );
    
    newBatchEntries.push(...newCombinedBatches);
  }
  
  // ═════════════════════════════════════════════════════════════
  // STEP 5: Save all new batches
  // ═════════════════════════════════════════════════════════════
  
  let createdBatches = [];
  if (newBatchEntries.length > 0) {
    createdBatches = await ProductionBatch.insertMany(newBatchEntries);
  }
  
  return {
    newBatches: createdBatches.length,
    updatedBatches: updatedBatches.length,
    totalBatches: createdBatches.length + updatedBatches.length,
    details: {
      created: createdBatches.map(b => ({ batchNo: b.batchNo, weight: b.totalBatchWeight })),
      updated: updatedBatches.map(b => ({ batchNo: b.batchNo, weight: b.totalBatchWeight }))
    }
  };
}
```

---

## 📊 **Example Scenarios**

### **Scenario 1: Old Partial 0.5 + New Partial 0.3 = 0.8**

**Initial State:**
```
Database contains:
  BATNO01: totalBatchWeight = 0.5, status = 'pending'
    └─ Item A: 0.5
```

**New Approval:**
```
Item B: batchAdjusted = 0.3
```

**Process:**
```javascript
1. Find existing partial batches
   → Found: BATNO01 (0.5 filled, 0.5 space available)

2. Check if new 0.3 fits in 0.5 space
   → 0.3 ≤ 0.5 ✅ YES, it fits!

3. Add Item B to BATNO01
   → BATNO01 now contains:
      - Item A: 0.5
      - Item B: 0.3
      Total: 0.8

4. Update database
   → BATNO01.totalBatchWeight = 0.8
   → BATNO01.itemContributions = [Item A (0.5), Item B (0.3)]
```

**Result:**
```json
{
  "batchNo": "BATNO01",
  "totalBatchWeight": 0.8,
  "status": "pending",
  "itemContributions": [
    {
      "itemId": "item_a_id",
      "itemName": "Item A",
      "batchFraction": 0.5,
      "qtyContribution": 117
    },
    {
      "itemId": "item_b_id",
      "itemName": "Item B",
      "batchFraction": 0.3,
      "qtyContribution": 70
    }
  ],
  "notes": "Combined batch from 1 items (total weight: 0.50) | Updated: Added 1 items (0.30) on 1/12/2026"
}
```

---

### **Scenario 2: Old Partial 0.5 + New Partial 0.7 = 1.2 (exceeds)**

**Initial State:**
```
BATNO01: totalBatchWeight = 0.5, status = 'pending'
```

**New Approval:**
```
Item C: batchAdjusted = 0.7
```

**Process:**
```javascript
1. Find existing partial batches
   → Found: BATNO01 (0.5 filled, space available: 0.8 max)

2. Check if new 0.7 fits in 0.8 space
   → 0.7 ≤ 0.8 ✅ YES, it fits!

3. Add Item C to BATNO01
   → BATNO01 now contains:
      - Item A: 0.5
      - Item C: 0.7
      Total: 1.2 (120% of standard batch - acceptable!)

4. Update database
   → BATNO01.totalBatchWeight = 1.2
```

**Result:** ✅ BATNO01 updated to 1.2 (acceptable overfill)

---

### **Scenario 3: Old Partial 0.9 + New Partial 0.7 = 1.6 (too much!)**

**Initial State:**
```
BATNO01: totalBatchWeight = 0.9, status = 'pending'
```

**New Approval:**
```
Item D: batchAdjusted = 0.7
```

**Process:**
```javascript
1. Find existing partial batches
   → Found: BATNO01 (0.9 filled, space available: 0.4 max)

2. Check if new 0.7 fits in 0.4 space
   → 0.7 ≤ 0.4 ❌ NO, too big!

3. Skip BATNO01, create new batch
   → BATNO02: Item D (0.7)

4. Result:
   → BATNO01: 0.9 (unchanged)
   → BATNO02: 0.7 (newly created)
```

**Result:** ❌ Cannot combine, create new batch instead

---

## 🎯 **Decision Matrix: Should We Combine?**

```
┌─────────────────────────────────────────────────────────────────┐
│ Decision Tree: Combine Old Partial with New Partial?           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Old Partial Exists?                                           │
│  ├─ NO → Create new batch for new partial                     │
│  └─ YES → Check status                                         │
│      ├─ Status = 'in_progress' or 'completed'?               │
│      │   └─ YES → DON'T TOUCH IT! Create new batch            │
│      └─ Status = 'pending'?                                    │
│          └─ YES → Check space                                  │
│              ├─ oldWeight + newWeight ≤ 1.3?                  │
│              │   ├─ YES → ✅ COMBINE THEM!                    │
│              │   └─ NO → ❌ Create new batch                  │
│              └─ Prefer filling most-full batches first        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 **How to Check Batch Status in UI**

```javascript
// Frontend display logic
function displayBatchStatus(batch) {
  const fillPercentage = (batch.totalBatchWeight * 100).toFixed(0);
  
  if (batch.totalBatchWeight === 1.0) {
    return `🟢 Full Batch (100%)`;
  } else if (batch.totalBatchWeight > 1.0) {
    return `🟡 Overfilled (${fillPercentage}%)`;
  } else if (batch.totalBatchWeight >= 0.8) {
    return `🟠 Nearly Full (${fillPercentage}%)`;
  } else {
    return `🔴 Partial (${fillPercentage}%)`;
  }
}

// Example outputs:
// 🟢 Full Batch (100%) - totalBatchWeight = 1.0
// 🟡 Overfilled (120%) - totalBatchWeight = 1.2
// 🟠 Nearly Full (85%) - totalBatchWeight = 0.85
// 🔴 Partial (50%) - totalBatchWeight = 0.5
```

---

## 📋 **Complete Implementation Example**

```javascript
// Helper: Get next available batch number
async function getNextBatchNumber(companyId, date) {
  const lastBatch = await ProductionBatch.findOne({
    companyId,
    productionDate: date
  }).sort({ batchNumber: -1 }).limit(1);
  
  return (lastBatch?.batchNumber || 0) + 1;
}

// Helper: Create full batch entry
function createFullBatchEntry(item, batchNumber, approvedBy, productionDate) {
  return {
    companyId: item.companyId,
    groupId: item.groupId || null,
    batchNumber,
    batchNo: `BATNO${String(batchNumber).padStart(2, '0')}`,
    productionDate,
    qtyPerBatch: item.qtyPerBatch,
    qtyAchieved: item.qtyPerBatch,
    productionLoss: 0,
    status: 'pending',
    totalBatchWeight: 1.0,
    itemContributions: [{
      itemId: item.productId,
      dailyProductionId: item.dailyDetailsId,
      batchFraction: 1.0,
      qtyContribution: item.qtyPerBatch,
      snapshotTakenAt: new Date()
    }],
    createdBy: approvedBy,
    notes: `Full batch for ${item.productName}`
  };
}

// Helper: Combine remaining fractionals into new batches
function combineRemainingFractionals(fractionalItems, startBatchNumber, approvedBy, productionDate, companyId) {
  const batches = [];
  let currentBatch = { items: [], totalWeight: 0 };
  let batchNumber = startBatchNumber;
  
  // Sort by size (largest first)
  fractionalItems.sort((a, b) => b.batchFraction - a.batchFraction);
  
  for (const item of fractionalItems) {
    if (currentBatch.totalWeight + item.batchFraction <= 1.3) {
      currentBatch.items.push(item);
      currentBatch.totalWeight += item.batchFraction;
    } else {
      // Save current batch and start new one
      if (currentBatch.items.length > 0) {
        batches.push(createCombinedBatchEntry(currentBatch, batchNumber++, approvedBy, productionDate, companyId));
      }
      currentBatch = { items: [item], totalWeight: item.batchFraction };
    }
  }
  
  // Add last batch
  if (currentBatch.items.length > 0) {
    batches.push(createCombinedBatchEntry(currentBatch, batchNumber, approvedBy, productionDate, companyId));
  }
  
  return batches;
}

// Helper: Create combined batch entry
function createCombinedBatchEntry(batchData, batchNumber, approvedBy, productionDate, companyId) {
  return {
    companyId,
    groupId: batchData.items[0].groupId || null,
    batchNumber,
    batchNo: `BATNO${String(batchNumber).padStart(2, '0')}`,
    productionDate,
    qtyPerBatch: batchData.items[0].qtyPerBatch,
    qtyAchieved: Math.round(batchData.items[0].qtyPerBatch * batchData.totalWeight),
    productionLoss: 0,
    status: 'pending',
    totalBatchWeight: batchData.totalWeight,
    itemContributions: batchData.items.map(item => ({
      itemId: item.productId,
      dailyProductionId: item.dailyDetailsId,
      batchFraction: item.batchFraction,
      qtyContribution: Math.round(item.qtyPerBatch * item.batchFraction),
      snapshotTakenAt: new Date()
    })),
    createdBy: approvedBy,
    notes: `Combined batch from ${batchData.items.length} items (total weight: ${batchData.totalWeight.toFixed(2)})`
  };
}
```

---

## ✅ **Benefits of This Approach**

1. ✅ **Automatic Combining**: New fractional batches automatically fill existing partial batches
2. ✅ **Space Optimization**: Minimizes number of partial batches
3. ✅ **Production Efficiency**: Production team has fewer partial batches to manage
4. ✅ **Audit Trail**: `notes` field shows when and what was added
5. ✅ **Safety**: Never touches batches that are already in progress
6. ✅ **Flexible**: Allows slight overfill (up to 1.3x) for practical production needs

---

## 🎯 **Summary**

### **Key Points:**

1. **Identification:**
   - Partial batch: `totalBatchWeight < 1.0`
   - Full batch: `totalBatchWeight = 1.0`
   - Overfilled: `totalBatchWeight > 1.0`

2. **Combining Rules:**
   - ✅ Combine if: `oldWeight + newWeight ≤ 1.3`
   - ❌ Don't combine if: batch status is not 'pending'
   - ⚠️ Always check space before combining

3. **Process Order:**
   1. Find existing partial batches (most full first)
   2. Try to fill them with new fractionals
   3. Create new batches for what doesn't fit

This ensures **maximum efficiency** while keeping your batch management clean and traceable! 🚀
