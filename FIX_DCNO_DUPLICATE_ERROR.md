# DC Number Duplicate Issue Fix

## Problem
When creating a direct dispatch with multiple products, all products should share the same DC number (e.g., DC006), but a unique index in MongoDB is preventing this, causing the error:
```
E11000 duplicate key error collection: production-erp.dispatches index: dcno_1 dup key: { dcno: "DC006" }
```

## Root Cause
The `dispatches` collection has a **unique index** on the `dcno` field that was created in an earlier version of the system. This prevents multiple dispatch entries from having the same DC number, which is incorrect behavior.

**Correct Behavior:** Multiple products in the same dispatch should all have the **same DC number**.

## Solution

### Step 1: Run the Fix Script
Run this command in your terminal:

```bash
node fix-dcno-unique-index.js
```

This script will:
1. Connect to your MongoDB database
2. Check for the unique index on `dcno` field
3. Drop the unique index if it exists
4. Create a non-unique sparse index instead
5. Show before/after index configuration

### Step 2: Verify the Fix
The script will show output like:
```
📋 Current indexes on dispatches collection:
  - dcno_1: {"dcno":1} (UNIQUE)    ← Problem: This should NOT be unique

⚠️  Found unique index on dcno field: dcno_1
   Dropping this index...
✅ Dropped unique index: dcno_1

📌 Creating non-unique index on dcno...
✅ Created non-unique sparse index on dcno

📋 Final indexes on dispatches collection:
  - dcno_1: {"dcno":1}              ← Fixed: No longer unique
```

### Step 3: Test
After running the script, test creating a dispatch with multiple products:

**Request:**
```json
{
    "salesPersonId": "...",
    "customerId": "...",
    "orderDate": "2026-01-22",
    "products": [
        {"productId": "...", "quantity": 2, "unitPrice": 42},
        {"productId": "...", "quantity": 2, "unitPrice": 42}
    ],
    "autoDispatch": true
}
```

**Expected Result:**
- ✅ Order created successfully
- ✅ Both products dispatched with **same DC number** (e.g., DC007)
- ✅ No duplicate key error

## What Changed in the Code

### 1. Dispatch Model (`server/models/Dispatch.js`)
- ✅ Simplified `generateNextDCno()` - removed unnecessary duplicate checks
- ✅ Added comment about not having unique index on dcno

### 2. Error Handling (`server/controllers/dispatchController.js`)
- ✅ Better error messages for duplicate key errors
- ✅ HTTP 409 status for conflicts

### 3. Database Fix Script
- ✅ Created `fix-dcno-unique-index.js` to fix the database schema

## Why This Happens

When you dispatch an order with multiple products:
```
Order ORD-0001
  ├─ Product A (qty: 2)  → Dispatch Entry 1: DC007
  └─ Product B (qty: 2)  → Dispatch Entry 2: DC007 ← Should have SAME DC number
```

**Correct:** Both products share DC007
**Incorrect (old behavior):** System tries to give different DC numbers, or crashes

## Manual Fix (Alternative)

If you can't run the script, connect to MongoDB directly:

```javascript
// MongoDB Shell
use production-erp;

// Check current indexes
db.dispatches.getIndexes();

// Drop the unique index on dcno
db.dispatches.dropIndex("dcno_1");

// Create non-unique index
db.dispatches.createIndex({ dcno: 1 }, { name: "dcno_1", sparse: true });

// Verify
db.dispatches.getIndexes();
```

## Prevention

To prevent this issue in the future:
- ✅ Never create unique index on `dcno` field
- ✅ Use compound unique indexes if needed (e.g., `dcno + productId`)
- ✅ Regular database schema validation

## Summary

**Before Fix:**
- ❌ Multiple products cannot share DC number
- ❌ Duplicate key error when dispatching orders
- ❌ Unique index on dcno field

**After Fix:**
- ✅ Multiple products share same DC number
- ✅ No duplicate key errors
- ✅ Non-unique index on dcno field
- ✅ Proper dispatch behavior
