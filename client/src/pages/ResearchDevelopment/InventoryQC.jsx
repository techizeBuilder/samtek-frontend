import React from 'react';
import { Package } from 'lucide-react';
import QCChecklistModule from '@/components/qc/QCChecklistModule';

// Thin config wrapper around the shared QC checklist implementation — see
// QCChecklistModule.jsx. Same scoping as the old QualityParameters.jsx's
// "Inventory" group: plain items with no productKind.
export default function InventoryQC() {
  return (
    <QCChecklistModule
      module="inventory"
      featureKey="qcInventory"
      title="Inventory QC"
      description="Select which QC checks apply to each inventory item, from one shared checklist"
      icon={Package}
      itemsEndpoint="/api/items?productKind=none&limit=1000"
    />
  );
}
