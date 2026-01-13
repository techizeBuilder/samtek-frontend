# 🎯 Batch Entry Creation Logic

## Problem Statement
When `batchAdjusted` has values like **5.2**, **2.3**, **1.3**, **0.3**, how many batch entries should be created?

---

## ✅ **SOLUTION: Smart Batch Splitting & Combining**

### **Core Rules:**

1. **Full batches (integer part)**: Create **separate entries** for each full batch
2. **Fractional batches (decimal part)**: **Combine multiple fractional batches** into one entry when their sum ≈ 1.0

---

## 📊 **Examples Breakdown**

### **Example 1: batchAdjusted = 5.2 → 6 entries**

**Breakdown:**
- Full batches: 5 (integer part)
- Fractional: 0.2 (decimal part)

**Entries Created:**
1. **BATNO01** - Item A: 1.0 batch (full)
2. **BATNO02** - Item A: 1.0 batch (full)
3. **BATNO03** - Item A: 1.0 batch (full)
4. **BATNO04** - Item A: 1.0 batch (full)
5. **BATNO05** - Item A: 1.0 batch (full)
6. **BATNO06** - Item A: 0.2 batch (partial) ← Can combine with other fractional batches

**Total: 6 entries**

---

### **Example 2: batchAdjusted = 2.3 → 3 entries**

**Breakdown:**
- Full batches: 2
- Fractional: 0.3

**Entries Created:**
1. **BATNO01** - Item B: 1.0 batch (full)
2. **BATNO02** - Item B: 1.0 batch (full)
3. **BATNO03** - Item B: 0.3 batch (partial)

**Total: 3 entries**

---

### **Example 3: batchAdjusted = 1.3 → 2 entries**

**Breakdown:**
- Full batches: 1
- Fractional: 0.3

**Entries Created:**
1. **BATNO01** - Item C: 1.0 batch (full)
2. **BATNO02** - Item C: 0.3 batch (partial) ← Can combine with other 0.3

**Total: 2 entries**

---

### **Example 4: Combining Fractional Batches**

**Scenario:** You have multiple items with fractional batches:
- Item D: batchAdjusted = 0.3
- Item E: batchAdjusted = 0.3
- Item F: batchAdjusted = 0.6

**Smart Combining:**

#### **Option 1: Combine 0.3 + 0.3 = 0.6**
- **BATNO01** - Combined: Item D (0.3) + Item E (0.3) = 0.6 total
- **BATNO02** - Item F: 0.6 batch

#### **Option 2: Combine 0.6 + 0.3 = 0.9**
- **BATNO01** - Combined: Item F (0.6) + Item D (0.3) = 0.9 total
- **BATNO02** - Item E: 0.3 batch

#### **Option 3: Combine all three 0.3 + 0.3 + 0.6 = 1.2**
- **BATNO01** - Combined: Item D (0.3) + Item E (0.3) + Item F (0.6) = 1.2 total

**Best Practice:** Try to get as close to 1.0 as possible per batch

---

## 💡 **Algorithm: Batch Entry Creation**

```javascript
function createBatchEntries(approvedItems) {
  const batches = [];
  let currentBatchNumber = 1;
  
  // Step 1: Separate items into full batches and fractional remainders
  const fullBatchItems = [];
  const fractionalBatchItems = [];
  
  for (const item of approvedItems) {
    const fullBatches = Math.floor(item.batchAdjusted);
    const fractional = item.batchAdjusted % 1;
    
    // Create entries for full batches
    for (let i = 0; i < fullBatches; i++) {
      batches.push({
        batchNo: `BATNO${String(currentBatchNumber++).padStart(2, '0')}`,
        items: [{
          itemId: item.itemId,
          itemName: item.itemName,
          batchFraction: 1.0,
          qtyContribution: item.qtyPerBatch * 1.0
        }],
        totalWeight: 1.0,
        status: 'pending'
      });
    }
    
    // Collect fractional remainders
    if (fractional > 0) {
      fractionalBatchItems.push({
        itemId: item.itemId,
        itemName: item.itemName,
        batchFraction: fractional,
        qtyPerBatch: item.qtyPerBatch
      });
    }
  }
  
  // Step 2: Combine fractional batches
  fractionalBatchItems.sort((a, b) => b.batchFraction - a.batchFraction); // Sort descending
  
  let currentCombinedBatch = {
    items: [],
    totalWeight: 0
  };
  
  for (const fractionalItem of fractionalBatchItems) {
    // Check if adding this item exceeds 1.0 (or reasonable threshold like 1.2)
    if (currentCombinedBatch.totalWeight + fractionalItem.batchFraction <= 1.2) {
      currentCombinedBatch.items.push({
        itemId: fractionalItem.itemId,
        itemName: fractionalItem.itemName,
        batchFraction: fractionalItem.batchFraction,
        qtyContribution: fractionalItem.qtyPerBatch * fractionalItem.batchFraction
      });
      currentCombinedBatch.totalWeight += fractionalItem.batchFraction;
    } else {
      // Current batch is full, save it and start new one
      if (currentCombinedBatch.items.length > 0) {
        batches.push({
          batchNo: `BATNO${String(currentBatchNumber++).padStart(2, '0')}`,
          items: currentCombinedBatch.items,
          totalWeight: currentCombinedBatch.totalWeight,
          status: 'pending'
        });
      }
      
      // Start new combined batch
      currentCombinedBatch = {
        items: [{
          itemId: fractionalItem.itemId,
          itemName: fractionalItem.itemName,
          batchFraction: fractionalItem.batchFraction,
          qtyContribution: fractionalItem.qtyPerBatch * fractionalItem.batchFraction
        }],
        totalWeight: fractionalItem.batchFraction
      };
    }
  }
  
  // Add last combined batch if it has items
  if (currentCombinedBatch.items.length > 0) {
    batches.push({
      batchNo: `BATNO${String(currentBatchNumber++).padStart(2, '0')}`,
      items: currentCombinedBatch.items,
      totalWeight: currentCombinedBatch.totalWeight,
      status: 'pending'
    });
  }
  
  return batches;
}
```

---

## 📋 **Complete Example: Mixed Scenario**

**Input:**
- Item A: batchAdjusted = 2.3
- Item B: batchAdjusted = 1.0
- Item C: batchAdjusted = 0.6
- Item D: batchAdjusted = 0.3

**Step 1: Create Full Batches**
1. **BATNO01** - Item A: 1.0
2. **BATNO02** - Item A: 1.0
3. **BATNO03** - Item B: 1.0

**Step 2: Collect Fractional Remainders**
- Item A: 0.3
- Item C: 0.6
- Item D: 0.3

**Step 3: Combine Fractional Batches**
- Sort: [0.6, 0.3, 0.3]
- Combine: 0.6 + 0.3 + 0.3 = 1.2 (acceptable, close to 1.0)

4. **BATNO04** - Combined:
   - Item C: 0.6 (contributes 60% of batch)
   - Item A: 0.3 (contributes 30% of batch)
   - Item D: 0.3 (contributes 30% of batch)
   - Total: 1.2 (120% of standard batch)

**Total: 4 batch entries created**

---

## 🎯 **Database Structure for Combined Batches**

```json
{
  "_id": "...",
  "batchNo": "BATNO04",
  "batchNumber": 4,
  "companyId": "...",
  "productionDate": "2026-01-12T00:00:00.000Z",
  "qtyPerBatch": 234,
  "totalWeight": 1.2,
  "status": "pending",
  "itemContributions": [
    {
      "itemId": "item_c_id",
      "itemName": "Product C",
      "batchFraction": 0.6,
      "qtyContribution": 140.4,
      "percentage": 50
    },
    {
      "itemId": "item_a_id",
      "itemName": "Product A",
      "batchFraction": 0.3,
      "qtyContribution": 70.2,
      "percentage": 25
    },
    {
      "itemId": "item_d_id",
      "itemName": "Product D",
      "batchFraction": 0.3,
      "qtyContribution": 70.2,
      "percentage": 25
    }
  ],
  "notes": "Combined batch from 3 items with total weight 1.2"
}
```

---

## ✅ **Benefits of This Approach**

1. ✅ **Efficient**: Minimizes number of partial batches
2. ✅ **Clear**: Each batch shows exactly what items contributed
3. ✅ **Flexible**: Handles any batchAdjusted value (0.1, 5.7, 10.0, etc.)
4. ✅ **Traceable**: Can see which items were combined
5. ✅ **Production-Friendly**: Production team works on batches, not individual fractional items

---

## 🚀 **Implementation Steps**

1. ✅ Update `ProductionBatch` model with `itemContributions` array
2. ✅ Implement `createBatchEntries()` function with combining logic
3. ✅ Update approval endpoint to use this logic
4. ✅ Display combined batches clearly in UI
5. ✅ Allow production team to process each batch independently

---

## 📊 **UI Display Example**

```
╔══════════════════════════════════════════════════════════╗
║  BATNO04 - Combined Batch (1.2x standard)               ║
╠══════════════════════════════════════════════════════════╣
║  Item C (0.6) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  50%        ║
║  Item A (0.3) ━━━━━━━━━━━  25%                          ║
║  Item D (0.3) ━━━━━━━━━━━  25%                          ║
║                                                          ║
║  Expected Qty: 280.8 units                              ║
║  Status: ⏳ Pending                                      ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🎯 **Summary**

| batchAdjusted | Full Batches | Fractional | Total Entries | Notes |
|---------------|--------------|------------|---------------|-------|
| 5.2           | 5            | 0.2        | 6             | 5 full + 1 partial |
| 2.3           | 2            | 0.3        | 3             | 2 full + 1 partial |
| 1.3           | 1            | 0.3        | 2             | 1 full + 1 partial |
| 0.3           | 0            | 0.3        | 1 (combined)  | Combine with others |
| 1.0           | 1            | 0          | 1             | Exactly 1 full batch |

**Key Rule:** Full batches = separate entries, Fractional batches = combine when possible!

This approach gives you maximum flexibility while keeping production manageable! 🚀
