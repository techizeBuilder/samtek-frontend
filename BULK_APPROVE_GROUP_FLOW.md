# Bulk Approve Group - Complete Data Flow ✅

## Frontend → Backend Data Flow

### 1. User Clicks Button
**Location:** Main product table, first item of each group

**Triggers:** `handleBulkApproveGroup(groupName)`

### 2. Frontend Sends Request
```javascript
POST /api/unit-manager/bulk-approve-group
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <token>'
}
Body: {
  "groupName": "broun 400",  // From getProductionGroup()
  "date": "2026-01-12"        // From selectedDate state
}
```

### 3. Backend Receives & Processes

**Step 1:** Validate user (Unit Manager or Super Admin)

**Step 2:** Find production group by name:
```javascript
ProductionGroup.findOne({
  company: userCompanyId,
  groupName: "broun 400",
  isActive: true
})
```

**Step 3:** Get all items in group:
```javascript
// For each item in productionGroup.items:
- Get ProductDailySummary (master data)
- Get ProductDetailsDailySummary (daily data)
- Extract: itemId, productName, batchAdjusted, qtyPerBatch
```

**Step 4:** Remove existing non-completed batches:
```javascript
ProductionBatch.deleteMany({
  companyId,
  groupId: productionGroup._id,
  productionDate: today,
  status: { $ne: 'completed' }
})
```

**Step 5:** Create optimal batches:
```javascript
// Example with broun 400 group:
Items: [
  { name: "Brown Bread", batchAdjusted: 0.1 },
  { name: "Sandwich", batchAdjusted: 1.3 },
  { name: "Whole Wheat", batchAdjusted: 1.0 },
  { name: "Soft Milk", batchAdjusted: 2.3 },
  { name: "Soft Milk DM", batchAdjusted: 0.3 }
]

// Smart algorithm combines them:
BATNO01: 1.0 (from 2.3)
BATNO02: 1.0 (from 2.3)
BATNO03: 0.3 (from 2.3) + 0.3 (from DM) + 0.1 (from Brown) = 0.7
BATNO04: 1.0 (from 1.3)
BATNO05: 0.3 (from 1.3) + 1.0 (from Wheat) = 1.0 ← Wait, this exceeds!

Actually:
BATNO01: 1.0 (from 2.3)
BATNO02: 1.0 (from 2.3)
BATNO03: 0.3 (from 2.3) + 0.3 (from DM) + 0.1 (from Brown) + 0.3 (from 1.3) = 1.0
BATNO04: 1.0 (from 1.3)
BATNO05: 1.0 (from Wheat)
```

**Step 6:** Update all items to 'approved' status

**Step 7:** Return response:
```javascript
{
  "success": true,
  "message": "Successfully approved 5 items in group 'broun 400'",
  "data": {
    "groupName": "broun 400",
    "itemsApproved": 5,
    "batchesCreated": 5,
    "batches": [
      { "batchNo": "BATNO01", "totalBatchAdjusted": 1.0, "itemCount": 1 },
      { "batchNo": "BATNO02", "totalBatchAdjusted": 1.0, "itemCount": 1 },
      { "batchNo": "BATNO03", "totalBatchAdjusted": 1.0, "itemCount": 4 },
      { "batchNo": "BATNO04", "totalBatchAdjusted": 1.0, "itemCount": 1 },
      { "batchNo": "BATNO05", "totalBatchAdjusted": 1.0, "itemCount": 1 }
    ],
    "items": [
      { "productName": "Brown Bread", "batchAdjusted": 0.1 },
      { "productName": "Sandwich", "batchAdjusted": 1.3 },
      { "productName": "Whole Wheat", "batchAdjusted": 1.0 },
      { "productName": "Soft Milk", "batchAdjusted": 2.3 },
      { "productName": "Soft Milk DM", "batchAdjusted": 0.3 }
    ]
  }
}
```

### 4. Frontend Receives Response

**Success Actions:**
1. Show toast notification with approval summary
2. Auto-refresh production data: `refreshProductionData(selectedDate)`
3. Reload summary status: `loadSummaryStatusData()`
4. Remove loading state from button

**UI Updates:**
- All items in group change to "approved" status
- Status badges update to green "approved"
- Button returns to normal state

---

## Data Objects Passed

### Frontend → Backend
```javascript
{
  groupName: string,     // e.g., "broun 400"
  date: string          // e.g., "2026-01-12"
}
```

### Backend Processing
```javascript
{
  productionGroup: {
    _id: ObjectId,
    groupName: "broun 400",
    company: ObjectId,
    items: [ObjectId, ObjectId, ...],  // All item IDs in group
    isActive: true
  },
  
  itemsWithData: [{
    itemId: ObjectId,
    productName: "Brown Bread",
    batchAdjusted: 0.1,
    qtyPerBatch: 234,
    dailyDetails: {
      _id: ObjectId,
      date: Date,
      productId: ObjectId,
      companyId: ObjectId,
      batchAdjusted: 0.1,
      status: "pending" → "approved"
    }
  }, ...]
}
```

### Backend → Frontend
```javascript
{
  success: boolean,
  message: string,
  data: {
    groupName: string,
    itemsApproved: number,
    batchesCreated: number,
    batches: [{
      batchNo: string,
      totalBatchAdjusted: number,
      itemCount: number
    }],
    items: [{
      productName: string,
      batchAdjusted: number
    }]
  }
}
```

---

## Verification Checklist

✅ **Frontend sends correct data:**
- groupName: From `getProductionGroup().groupName`
- date: From `selectedDate` state

✅ **Backend finds group:**
- Searches by groupName + companyId
- Returns 404 if not found

✅ **Backend gets all items:**
- Loops through `productionGroup.items`
- Gets master data + daily details for each
- Filters items with batchAdjusted > 0

✅ **Backend creates optimal batches:**
- Sorts descending by batchAdjusted
- Uses bin packing algorithm
- Max 1.0 per batch

✅ **Backend updates status:**
- All items → status: 'approved'
- Saves changes to database

✅ **Frontend refreshes:**
- Calls refreshProductionData()
- Calls loadSummaryStatusData()
- UI updates automatically

---

## Testing

**Test Case:** Click "Bulk Approve Group" on broun 400

**Expected Result:**
1. Button shows "Approving..." with spinner
2. API call succeeds
3. Toast: "Approved 5 items in group 'broun 400' and created 5 optimal batches"
4. All 5 items show "approved" status
5. MongoDB: 5 new ProductionBatch documents created
6. Button returns to normal

**Verify in MongoDB:**
```javascript
db.productionbatches.find({
  groupId: ObjectId("...broun400GroupId"),
  productionDate: ISODate("2026-01-12T00:00:00.000Z")
})
// Should return 5 batches with optimal combinations
```

---

✅ **ALL DATA IS PROPERLY PASSED AND UPDATED!**
