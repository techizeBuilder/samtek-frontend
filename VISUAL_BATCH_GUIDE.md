# 📊 Visual Guide: Batch Entry Creation

## How Many Entries Should Be Created?

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                      BATCH ENTRY CREATION RULES                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  INPUT: batchAdjusted value                                               ║
║  OUTPUT: Number of batch entries                                          ║
║                                                                            ║
║  RULE 1: Full batches (integer part) → Separate entries                  ║
║  RULE 2: Fractional batches (decimal part) → Combine when possible       ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 Example 1: batchAdjusted = 5.2

```
Input: 5.2
       ↓
Split: 5 (full) + 0.2 (fractional)
       ↓
Create:
  ┌──────────────────────────────────────┐
  │ BATNO01  [████████████████████] 1.0  │ ← Full batch #1
  ├──────────────────────────────────────┤
  │ BATNO02  [████████████████████] 1.0  │ ← Full batch #2
  ├──────────────────────────────────────┤
  │ BATNO03  [████████████████████] 1.0  │ ← Full batch #3
  ├──────────────────────────────────────┤
  │ BATNO04  [████████████████████] 1.0  │ ← Full batch #4
  ├──────────────────────────────────────┤
  │ BATNO05  [████████████████████] 1.0  │ ← Full batch #5
  ├──────────────────────────────────────┤
  │ BATNO06  [████] 0.2                  │ ← Partial batch (can combine with others)
  └──────────────────────────────────────┘

Result: ✅ 6 entries total
```

---

## 📊 Example 2: batchAdjusted = 2.3

```
Input: 2.3
       ↓
Split: 2 (full) + 0.3 (fractional)
       ↓
Create:
  ┌──────────────────────────────────────┐
  │ BATNO01  [████████████████████] 1.0  │ ← Full batch #1
  ├──────────────────────────────────────┤
  │ BATNO02  [████████████████████] 1.0  │ ← Full batch #2
  ├──────────────────────────────────────┤
  │ BATNO03  [██████] 0.3                │ ← Partial batch
  └──────────────────────────────────────┘

Result: ✅ 3 entries total
```

---

## 📊 Example 3: Combining Multiple Fractional Batches

### Scenario: Three items with fractional batches

```
Item A: batchAdjusted = 0.6
Item B: batchAdjusted = 0.3
Item C: batchAdjusted = 0.3

       ↓
Combine: 0.6 + 0.3 + 0.3 = 1.2
       ↓
Create ONE combined batch:

  ┌────────────────────────────────────────────────┐
  │ BATNO01 - Combined Batch (Total: 1.2)         │
  ├────────────────────────────────────────────────┤
  │  Item A [████████████] 0.6  (50%)             │
  │  Item B [██████] 0.3        (25%)             │
  │  Item C [██████] 0.3        (25%)             │
  └────────────────────────────────────────────────┘

Result: ✅ 1 entry total
```

---

## 📊 Example 4: Mixed Full and Fractional Batches

### Scenario: Multiple items with mixed values

```
Item A: batchAdjusted = 2.3
Item B: batchAdjusted = 1.0
Item C: batchAdjusted = 0.6
Item D: batchAdjusted = 0.3

Step 1: Process Full Batches
  ┌──────────────────────────────────────┐
  │ BATNO01  Item A [████████████] 1.0   │ ← Full batch
  ├──────────────────────────────────────┤
  │ BATNO02  Item A [████████████] 1.0   │ ← Full batch
  ├──────────────────────────────────────┤
  │ BATNO03  Item B [████████████] 1.0   │ ← Full batch
  └──────────────────────────────────────┘

Step 2: Collect Fractional Remainders
  Item A: 0.3 (remainder)
  Item C: 0.6
  Item D: 0.3

Step 3: Combine Fractional Batches (0.3 + 0.6 + 0.3 = 1.2)
  ┌────────────────────────────────────────────────┐
  │ BATNO04 - Combined (Total: 1.2)               │
  ├────────────────────────────────────────────────┤
  │  Item C [████████████] 0.6    (50%)           │
  │  Item A [██████] 0.3          (25%)           │
  │  Item D [██████] 0.3          (25%)           │
  └────────────────────────────────────────────────┘

Result: ✅ 4 entries total (3 full + 1 combined)
```

---

## 🎯 Quick Reference Table

| batchAdjusted | Full Batches | Fractional | Total Entries | Visual |
|---------------|--------------|------------|---------------|--------|
| **5.2**       | 5            | 0.2        | **6**         | ████████████ ██ |
| **2.3**       | 2            | 0.3        | **3**         | ████████ ███ |
| **1.3**       | 1            | 0.3        | **2**         | ████ ███ |
| **1.0**       | 1            | 0          | **1**         | ████ |
| **0.6**       | 0            | 0.6        | **1*** (if alone) | ██████ |
| **0.3 + 0.3** | 0            | 0.6 total  | **1**         | ██████ |
| **0.6 + 0.3 + 0.3** | 0     | 1.2 total  | **1**         | ████████████ |

*Note: Single fractional batches can be combined with other fractional batches

---

## 💡 Smart Combining Logic

```
Algorithm: Bin Packing for Fractional Batches

1. Sort fractional batches by size (largest first)
   [0.6, 0.3, 0.3, 0.2, 0.1]

2. Try to fill each "bin" (batch) to ~1.0
   Bin 1: 0.6 + 0.3 = 0.9 ✅ (close to 1.0)
   Bin 2: 0.3 + 0.2 + 0.1 = 0.6 ✅ (acceptable partial)

3. Create batch entries for each bin
   BATNO01: Combined (0.9 weight)
   BATNO02: Combined (0.6 weight)

Maximum efficiency: Minimize number of partial batches
```

---

## 🎬 Production Team View

### What Production Team Sees:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📋 Today's Production Sheet - Jan 12, 2026              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                          ┃
┃  ✅ BATNO01 - Item A (Full Batch)                       ┃
┃     Qty: 234 units | Status: Pending                    ┃
┃     [Start] [Complete]                                  ┃
┃                                                          ┃
┃  ✅ BATNO02 - Item A (Full Batch)                       ┃
┃     Qty: 234 units | Status: Pending                    ┃
┃     [Start] [Complete]                                  ┃
┃                                                          ┃
┃  ⚠️  BATNO03 - Combined Batch (1.2x)                     ┃
┃     ├─ Item C: 140 units (0.6)                          ┃
┃     ├─ Item A: 70 units (0.3)                           ┃
┃     └─ Item D: 70 units (0.3)                           ┃
┃     Total: 280 units | Status: Pending                  ┃
┃     [Start] [Complete]                                  ┃
┃                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## ✅ Summary

### **The Golden Rule:**

```
batchAdjusted = X.Y

Where:
  X = Number of full batch entries (integer part)
  Y = Fractional part (combine with other fractionals)

Total Entries = X + (number of combined fractional batches)
```

### **Examples:**
- `5.2` = 5 full + 1 partial = **6 entries**
- `2.3` = 2 full + 1 partial = **3 entries**
- `0.3 + 0.3 + 0.6` = 0 full + 1 combined = **1 entry**

### **Key Insight:**
The system is **smart** - it combines fractional batches to minimize partial batches and make production more efficient!

🚀 **This is the best practice for production management!**
