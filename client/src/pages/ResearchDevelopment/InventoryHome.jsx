import React, { useState } from 'react';
import ModernInventoryUI from '@/components/inventory/ModernInventoryUI';
import ChildPartInventoryTab from '@/components/inventory/ChildPartInventoryTab';
import SubChildPartMasterInventoryTab from '@/components/inventory/SubChildPartMasterInventoryTab';
import { Package2, Layers, Boxes } from 'lucide-react';

// Thin wrapper — everything about plain Inventory (ModernInventoryUI) stays
// completely untouched. Two more tabs sit alongside it for the corrected
// hierarchy (see bom-hierarchy-redesign-2026-09.md): Child Part Inventory
// (ChildPartInventoryTab — rebuilt 2026-09 to tell apart the OLD per-machine
// Child Part flow from the NEW standalone Child Part Master catalog) and Sub
// Child Part Inventory.
export default function InventoryHome() {
  const [tab, setTab] = useState('inventory');

  const tabs = [
    { key: 'inventory', label: 'Inventory', icon: Package2 },
    { key: 'childParts', label: 'Child Part Inventory', icon: Layers },
    { key: 'subChildParts', label: 'Sub Child Part Inventory', icon: Boxes },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === t.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'inventory' && <ModernInventoryUI />}
      {tab === 'childParts' && <ChildPartInventoryTab />}
      {tab === 'subChildParts' && <SubChildPartMasterInventoryTab />}
    </div>
  );
}
