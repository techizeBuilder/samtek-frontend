import React from 'react';
import SubChildPartMasterInventoryTab from '@/components/inventory/SubChildPartMasterInventoryTab';

// Read-only view of the new Sub Child Part Inventory for Store — same
// underlying data (GET /api/rd/sub-child-parts) as R&D's own tab, but no
// Manage Stock / Discontinue actions.
export default function SubChildPartMasterTab() {
  return <SubChildPartMasterInventoryTab readOnly />;
}
