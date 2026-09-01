import React from 'react';
import { Cog } from 'lucide-react';
import QCChecklistModule from '@/components/qc/QCChecklistModule';

// Thin config wrapper around the shared QC checklist implementation — see
// QCChecklistModule.jsx. Same scoping as MotorMaster.jsx's own item list:
// type:Product + productKind:Motor.
export default function MotorMasterQC() {
  return (
    <QCChecklistModule
      module="motorMaster"
      featureKey="qcMotorMaster"
      title="Motor Master QC"
      description="Select which QC checks apply to each motor, from one shared checklist"
      icon={Cog}
      itemsEndpoint="/api/items?type=Product&productKind=Motor&limit=1000"
    />
  );
}
