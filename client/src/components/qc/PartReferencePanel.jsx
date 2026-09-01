import React from 'react';
import { FileText } from 'lucide-react';
import { config } from '@/config/environment';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

// The Sub Child Part's real BOM material list + design file — the actual
// spec whoever's checking "Design"/"Material"/"Size (Amount)/Qty" needs to
// verify against, not just a bare checklist label (confirmed 2026-09-02:
// Production/QC were being asked to verify checklist items against data
// they were never actually shown). Same reference data for every row in
// this part's checklist, so it's shown once at the top rather than
// repeated per row — shared by Production's fill-in stepper and QC's
// review dialog so both look the same. Deliberately not shown on the Final
// Testing checklist (whole-machine level, doesn't map to one part's BOM).
export default function PartReferencePanel({ designFile, materials }) {
  if (!designFile && !(materials?.length > 0)) return null;
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-blue-800">BOM Reference</p>
        {designFile && (
          <a href={resolveMediaUrl(designFile)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0">
            <FileText className="h-3.5 w-3.5" /> Design File
          </a>
        )}
      </div>
      {materials?.length > 0 ? (
        <div className="space-y-0.5">
          {materials.map((m, i) => (
            <p key={i} className="text-xs text-slate-600">
              {m.item}{m.materialGrade ? ` · Grade ${m.materialGrade}` : ''}{m.brand ? ` · ${m.brand}` : ''}{m.size ? ` · ${m.size}` : ''} · {m.quantity} {m.unit}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No BOM material lines under this part.</p>
      )}
    </div>
  );
}
