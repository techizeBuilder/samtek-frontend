import React from 'react';
import ModernInventoryUI from '@/components/inventory/ModernInventoryUI';

// Unchanged — ModernInventoryUI already scopes to productKind:none (raw
// material stock only) and keeps its full existing toolset (filters, Excel
// import/export, category/group/unit-type management, bulk actions).
export default function InventoryTab() {
  return <ModernInventoryUI />;
}
