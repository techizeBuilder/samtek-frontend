import React from 'react';
import ChildPartInventoryTab from '@/components/inventory/ChildPartInventoryTab';

// Read-only view of Child Part Inventory for Store — same underlying data
// (GET /api/rd/sub-child-part-inventory) as R&D's own tab, but no Manage
// Stock / Discontinue actions. Store just needs visibility into stock,
// Material Flow, and each Child Part's Used In / Composition.
export default function ChildPartTab() {
  return <ChildPartInventoryTab readOnly />;
}
