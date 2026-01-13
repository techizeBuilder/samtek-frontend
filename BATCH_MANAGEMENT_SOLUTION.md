# 🎯 BEST PRACTICE SOLUTION: Production Batch Management

## Problem Statement
When approving items for production with `batchAdjusted` values (especially fractional like 0.3, 0.6), and then updating them, the system faces:
- Complex adjustment calculations
- Difficulty tracking what was added vs removed
- Data inconsistency issues
- Hard to maintain history

## ✅ RECOMMENDED SOLUTION: Immutable Batch Snapshot Approach

### **Core Principle: "Create Once, Track Changes Separately"**

Instead of adjusting existing batch records, treat each batch as an **immutable snapshot** with a clear audit trail.

---

## 📐 **Model Structure (Improved)**

### ProductionBatch Schema (Enhanced)

```javascript
const productionBatchSchema = new mongoose.Schema({
  companyId: { type: ObjectId, ref: 'Company', required: true, index: true },
  groupId: { type: ObjectId, ref: 'ProductionGroup', default: null }, // For grouped items
  
  // Batch Identifiers
  batchNumber: { type: Number, required: true, min: 1 },
  batchNo: { type: String, required: true, trim: true }, // BATNO01, BATNO02
  productionDate: { type: Date, required: true, index: true },
  
  // Production Tracking
  mouldingTime: { type: Date, default: null },
  unloadingTime: { type: Date, default: null },
  productionLoss: { type: Number, default: 0, min: 0 },
  qtyPerBatch: { type: Number, required: true, min: 0 },
  qtyAchieved: { type: Number, default: 0 },
  
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // 🎯 KEY CHANGE: Store items as SNAPSHOT, not adjustable
  itemContributions: [{
    itemId: { type: ObjectId, ref: 'Item', required: true },
    dailyProductionId: { type: ObjectId, ref: 'ProductDetailsDailySummary' },
    
    // Snapshot of contribution at creation time (IMMUTABLE)
    batchFraction: { type: Number, required: true, min: 0 }, // 0.3, 0.6, 1, etc.
    qtyFromThisItem: { type: Number, required: true, min: 0 }, // Calculated qty
    
    // Metadata
    snapshotTakenAt: { type: Date, default: Date.now },
    approvalRef: { type: String } // Reference to approval action
  }],
  
  // Calculated total (sum of all contributions)
  totalBatchWeight: { type: Number, default: 1, min: 0 }, // Usually 1.0 for full batch
  
  // Audit Trail
  createdBy: { type: String, required: true },
  createdReason: { type: String }, // "Initial approval", "Re-approval", etc.
  
  // Change tracking (for updates, not deletions)
  changeLog: [{
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },
    field: { type: String }, // 'productionLoss', 'status', etc.
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String }
  }],
  
  notes: { type: String, default: '', maxlength: 1000 }
  
}, {
  timestamps: true,
  collection: 'productionbatches'
});

// Compound index for uniqueness
productionBatchSchema.index(
  { companyId: 1, batchNo: 1, productionDate: 1 },
  { unique: true }
);
```

---

## 🔄 **Approval & Update Flow**

### 1. **Initial Approval: Create Immutable Batches**

When Unit Manager approves items with `batchAdjusted = 0.3`:

```javascript
async function createProductionBatches(approvalData) {
  const { companyId, date, approvedItems, approvedBy } = approvalData;
  
  // Group items that should be combined in one batch
  const groupedItems = groupItemsByBatchWeight(approvedItems);
  
  const createdBatches = [];
  
  for (const group of groupedItems) {
    const nextBatchNum = await getNextBatchNumber(companyId, date);
    
    // Calculate contributions
    const itemContributions = group.items.map(item => ({
      itemId: item.productId,
      dailyProductionId: item.dailyDetailsId,
      batchFraction: item.batchAdjusted, // 0.3, 0.6, etc.
      qtyFromThisItem: item.batchAdjusted * item.qtyPerBatch,
      approvalRef: `APPROVAL_${Date.now()}`
    }));
    
    const totalWeight = group.items.reduce((sum, item) => sum + item.batchAdjusted, 0);
    
    // Create ONE batch with multiple item contributions
    const batch = await ProductionBatch.create({
      companyId,
      groupId: group.groupId || null,
      batchNumber: nextBatchNum,
      batchNo: `BATNO${String(nextBatchNum).padStart(2, '0')}`,
      productionDate: date,
      qtyPerBatch: group.items[0].qtyPerBatch, // All items should have same qtyPerBatch
      qtyAchieved: group.items[0].qtyPerBatch,
      status: 'pending',
      itemContributions,
      totalBatchWeight: totalWeight,
      createdBy: approvedBy,
      createdReason: 'Unit Manager Approval',
      notes: `Combined batch from ${group.items.length} items`
    });
    
    createdBatches.push(batch);
  }
  
  return createdBatches;
}

// Helper: Group items that should share batches
function groupItemsByBatchWeight(items) {
  // Logic to combine items with fractional batches
  // Example: 0.3 + 0.4 + 0.3 = 1.0 → one batch
  // Or: 0.6 → one batch (partial)
  // Or: 2.5 → three batches (2 full + 0.5 partial)
  
  const groups = [];
  let currentGroup = { items: [], weight: 0 };
  
  for (const item of items) {
    const fullBatches = Math.floor(item.batchAdjusted);
    const remainder = item.batchAdjusted % 1;
    
    // Create full batches for this item
    for (let i = 0; i < fullBatches; i++) {
      groups.push({
        groupId: item.groupId,
        items: [{
          ...item,
          batchAdjusted: 1 // Full batch
        }]
      });
    }
    
    // Handle remainder (fractional batch)
    if (remainder > 0) {
      if (currentGroup.weight + remainder <= 1) {
        currentGroup.items.push({ ...item, batchAdjusted: remainder });
        currentGroup.weight += remainder;
        
        if (currentGroup.weight >= 0.99) { // Close enough to 1
          groups.push({ ...currentGroup });
          currentGroup = { items: [], weight: 0 };
        }
      } else {
        // Current group is full, start new one
        if (currentGroup.items.length > 0) {
          groups.push({ ...currentGroup });
        }
        currentGroup = {
          groupId: item.groupId,
          items: [{ ...item, batchAdjusted: remainder }],
          weight: remainder
        };
      }
    }
  }
  
  // Add remaining partial batch
  if (currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}
```

---

### 2. **Re-Approval: Cancel Old, Create New**

If Unit Manager changes `batchAdjusted` from 0.3 to 0.5:

```javascript
async function reApproveProduct(productData) {
  const { productId, companyId, date, newBatchAdjusted, qtyPerBatch, approvedBy } = productData;
  
  // Step 1: Find existing non-completed batches for this product
  const existingBatches = await ProductionBatch.find({
    companyId,
    productionDate: date,
    'itemContributions.itemId': productId,
    status: { $nin: ['completed', 'in_progress'] } // Don't touch started batches
  });
  
  console.log(`Found ${existingBatches.length} pending batches to cancel`);
  
  // Step 2: Cancel old batches (DON'T DELETE - keep audit trail)
  for (const batch of existingBatches) {
    batch.status = 'cancelled';
    batch.changeLog.push({
      changedBy: approvedBy,
      field: 'status',
      oldValue: 'pending',
      newValue: 'cancelled',
      reason: 'Product re-approved with different batchAdjusted value'
    });
    await batch.save();
  }
  
  // Step 3: Create new batches with updated values
  const newBatches = await createProductionBatches({
    companyId,
    date,
    approvedItems: [{
      productId,
      batchAdjusted: newBatchAdjusted,
      qtyPerBatch,
      // ... other fields
    }],
    approvedBy
  });
  
  return {
    cancelledBatches: existingBatches.length,
    createdBatches: newBatches.length,
    newBatchNos: newBatches.map(b => b.batchNo)
  };
}
```

---

### 3. **Production Updates: Modify, Don't Recreate**

When production team updates `mouldingTime`, `unloadingTime`, `productionLoss`:

```javascript
async function updateProductionBatch(batchNo, updates, updatedBy) {
  const batch = await ProductionBatch.findOne({
    batchNo,
    status: { $in: ['pending', 'in_progress'] }
  });
  
  if (!batch) {
    throw new Error('Batch not found or already completed');
  }
  
  // Track changes
  const changes = [];
  for (const [field, newValue] of Object.entries(updates)) {
    if (batch[field] !== newValue) {
      changes.push({
        changedBy: updatedBy,
        field,
        oldValue: batch[field],
        newValue,
        reason: 'Production data update'
      });
      batch[field] = newValue;
    }
  }
  
  // Recalculate qtyAchieved
  if (updates.productionLoss !== undefined) {
    batch.qtyAchieved = Math.max(0, batch.qtyPerBatch - batch.productionLoss);
    changes.push({
      changedBy: updatedBy,
      field: 'qtyAchieved',
      oldValue: batch.qtyAchieved,
      newValue: batch.qtyAchieved,
      reason: 'Auto-calculated from production loss'
    });
  }
  
  // Update status if times are set
  if (batch.mouldingTime && batch.unloadingTime) {
    batch.status = 'completed';
  } else if (batch.mouldingTime) {
    batch.status = 'in_progress';
  }
  
  batch.changeLog.push(...changes);
  await batch.save();
  
  return batch;
}
```

---

## 📊 **Query Examples**

### Get all batches for a specific item:
```javascript
const itemBatches = await ProductionBatch.find({
  companyId: '...',
  'itemContributions.itemId': itemId,
  productionDate: { $gte: startDate, $lt: endDate },
  status: { $ne: 'cancelled' }
}).populate('itemContributions.itemId', 'name code');
```

### Get production summary for today:
```javascript
const todayBatches = await ProductionBatch.find({
  companyId: '...',
  productionDate: today,
  status: { $ne: 'cancelled' }
});

const summary = todayBatches.reduce((acc, batch) => {
  acc.totalBatches++;
  acc.pending += batch.status === 'pending' ? 1 : 0;
  acc.inProgress += batch.status === 'in_progress' ? 1 : 0;
  acc.completed += batch.status === 'completed' ? 1 : 0;
  return acc;
}, { totalBatches: 0, pending: 0, inProgress: 0, completed: 0 });
```

---

## ✅ **Key Benefits**

1. **✨ Immutable Snapshots**: Batches created once, never adjusted retroactively
2. **📜 Complete Audit Trail**: Every change tracked in `changeLog`
3. **🔄 Clean Re-Approval**: Cancel old + create new = simple logic
4. **🎯 Clear Responsibility**: Each batch knows exactly which items contributed
5. **📊 Easy Reporting**: Query by status, date, item without complex joins
6. **🛡️ Data Integrity**: No confusion about "what was adjusted when"
7. **🚀 Scalable**: Works with fractional, full, and multi-batch scenarios

---

## 🎬 **Implementation Steps**

1. ✅ Update `ProductionBatch` schema with `itemContributions` and `changeLog`
2. ✅ Implement `createProductionBatches()` with grouping logic
3. ✅ Implement `reApproveProduct()` with cancel-and-recreate pattern
4. ✅ Implement `updateProductionBatch()` with change tracking
5. ✅ Update frontend to display batch contributions clearly
6. ✅ Add reports showing cancelled vs active batches
7. ✅ Test with various scenarios (0.3, 1.5, 2.0, etc.)

---

## 📝 **Example Data After Implementation**

### Scenario: Item A (batchAdjusted = 0.3), Item B (batchAdjusted = 0.7)

**Result: ONE combined batch**

```json
{
  "_id": "...",
  "companyId": "...",
  "batchNumber": 1,
  "batchNo": "BATNO01",
  "productionDate": "2026-01-12T00:00:00.000Z",
  "qtyPerBatch": 234,
  "qtyAchieved": 234,
  "status": "pending",
  "itemContributions": [
    {
      "itemId": "item_a_id",
      "batchFraction": 0.3,
      "qtyFromThisItem": 70.2,
      "snapshotTakenAt": "2026-01-12T05:50:18.421Z"
    },
    {
      "itemId": "item_b_id",
      "batchFraction": 0.7,
      "qtyFromThisItem": 163.8,
      "snapshotTakenAt": "2026-01-12T05:50:18.421Z"
    }
  ],
  "totalBatchWeight": 1.0,
  "createdBy": "unit_manager_id",
  "createdReason": "Unit Manager Approval",
  "changeLog": [],
  "notes": "Combined batch from 2 items"
}
```

### After Re-Approval (Item A changed to 0.5):

**Old batch**: Status changed to `cancelled`
**New batch**: Created with new contributions

This keeps history clear and avoids confusing "subtraction" logic!

---

## 🎯 **Conclusion**

**This approach eliminates the need for complex "minus" operations** because:
- Batches are never modified retroactively
- Re-approvals create new batches (old ones marked cancelled)
- Change tracking is explicit and auditable
- Queries are simple and performant

**No more confusion about:**
- "Did we subtract 0.2 from this batch?"
- "Which items contributed to this batch?"
- "What was the original approval value?"

Everything is **clear, traceable, and maintainable**! 🚀
