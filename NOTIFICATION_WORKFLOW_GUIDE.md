# Notification Workflow System - Implementation Guide

## Overview
Location-based and role-based notification system with step-by-step workflow.

---

## Workflow Steps

### 1. SALES → Unit Manager + Unit Head
**When:** Sales creates/updates/deletes orders or adds customers

```javascript
// In orderController.js, customerController.js
await notificationService.triggerSalesNotification({
  action: 'order_created', // or 'order_updated', 'order_deleted', 'customer_added'
  orderData: {
    _id: order._id,
    orderCode: order.orderCode,
    customerName: order.customer.name
  },
  customerData: { // Only for customer_added action
    _id: customer._id,
    name: customer.name
  },
  targetUnit: req.user.unit,
  targetCompanyId: req.user.companyId,
  userId: req.user._id
});
```

**Notifies:**
- ✅ Unit Manager (same location)
- ✅ Unit Head (same location)
- ✅ Super Admin (all locations)

---

### 2. UNIT MANAGER → Production
**When:** Unit Manager sends order to production

```javascript
// In unitManagerController.js - when assigning to production
await notificationService.triggerUnitManagerToProduction({
  action: 'production_request',
  orderData: {
    _id: order._id,
    orderCode: order.orderCode
  },
  productionData: {
    _id: productionGroup._id
  },
  targetUnit: req.user.unit,
  targetCompanyId: req.user.companyId
});
```

**Notifies:**
- ✅ Production (same location)
- ✅ Super Admin

---

### 3. PRODUCTION (Approve) → Unit Manager + Package
**When:** Production approves batch

```javascript
// In productionController.js - when approving batch
await notificationService.triggerProductionApproval({
  productionData: {
    _id: productionBatch._id,
    batchNo: productionBatch.batchNo
  },
  orderData: {
    _id: order._id
  },
  targetUnit: req.user.unit,
  targetCompanyId: req.user.companyId
});
```

**Notifies:**
- ✅ Unit Manager (same location)
- ✅ Package/Packing (same location)
- ✅ Super Admin

---

### 4. PACKAGE → Dispatch
**When:** Packing completes package

```javascript
// In packingController.js - when package is ready
await notificationService.triggerPackageToDispatch({
  packageData: {
    _id: package._id,
    dcno: package.dcno
  },
  targetUnit: req.user.unit,
  targetCompanyId: req.user.companyId
});
```

**Notifies:**
- ✅ Dispatch (same location)
- ✅ Unit Manager (same location)
- ✅ Super Admin

---

### 5. PRODUCTION GROUP (Return/Damage) → Unit Manager + Unit Head
**When:** Production records return or damage

```javascript
// In productionGroupController.js - when recording damage/return
await notificationService.triggerProductionGroupUpdate({
  action: 'return', // or 'damage'
  groupData: {
    _id: productionGroup._id,
    name: productionGroup.name
  },
  targetUnit: req.user.unit,
  targetCompanyId: req.user.companyId
});
```

**Notifies:**
- ✅ Unit Manager (same location)
- ✅ Unit Head (same location)
- ✅ Super Admin

---

## Implementation Checklist

### ✅ Controllers to Update

1. **orderController.js** - Already updated ✓
   - ✅ Create order → triggerSalesNotification
   - ⏳ Update order → triggerSalesNotification (action: 'order_updated')
   - ⏳ Delete order → triggerSalesNotification (action: 'order_deleted')

2. **customerController.js** - Already updated ✓
   - ✅ Add customer → triggerSalesNotification (action: 'customer_added')

3. **unitManagerController.js** - Needs update
   - ⏳ Assign to production → triggerUnitManagerToProduction

4. **productionController.js** - Needs update
   - ⏳ Approve batch → triggerProductionApproval

5. **packingController.js** - Needs update
   - ⏳ Complete package → triggerPackageToDispatch

6. **productionGroupController.js** - Needs update
   - ⏳ Record damage/return → triggerProductionGroupUpdate

---

## Location Filtering

Notifications are automatically filtered by:
- **targetUnit**: User's unit/department
- **targetCompanyId**: User's company/location

**Example:**
```javascript
// User from Mumbai location will ONLY see notifications for:
- targetCompanyId: mumbai_company_id
- targetUnit: null (global for that role)
```

**Super Admin sees ALL notifications regardless of location.**

---

## Role Mapping

```javascript
const NOTIFICATION_ROLES = {
  'Sales': 'Sales',
  'Unit Manager': 'Unit Manager',
  'Unit Head': 'Unit Head',
  'Production': 'Production',
  'Packing': 'Packing',
  'Package': 'Packing', // Same as Packing
  'Dispatch': 'Dispatch',
  'Super Admin': 'Super Admin'
};
```

---

## Next Steps

1. Update remaining controllers with notification triggers
2. Test workflow: Sales → Unit Manager → Production → Package → Dispatch
3. Verify location-based filtering
4. Test Super Admin sees all notifications

---

## Testing

### Test Scenario 1: Sales Order Flow
1. **Sales** creates order → Check Unit Manager + Unit Head receive notification
2. **Unit Manager** assigns to production → Check Production receives notification
3. **Production** approves → Check Unit Manager + Package receive notification
4. **Package** completes → Check Dispatch receives notification

### Test Scenario 2: Location Filtering
1. Create order from Mumbai location
2. Verify only Mumbai Unit Manager gets notification
3. Verify Delhi Unit Manager does NOT get notification
4. Verify Super Admin gets notification

### Test Scenario 3: Multi-Location
1. Sales person in Location A creates order
2. Only Unit Manager/Head in Location A get notification
3. Production in Location A gets notification when assigned
4. Package in Location A gets notification when approved

---

## API Usage

### Frontend Notification Hook
```javascript
const { notifications, unreadCount } = useNotifications();

// Notifications are automatically filtered by user's role and location
```

The existing notification system will automatically apply location and role filters.
