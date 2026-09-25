import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Stage 3d (2026-09-24) — generalized per-step twin of ProcessExecution.jsx's
// own inline "Fabrication Materials — per unit" table (Sub Child Part/Child
// Part's own legacy, 'Fabrication'-named-only special case). Same table
// shape, reused deliberately rather than rebuilt, but driven by ANY step's
// own materialRefs (server/controllers/productionMfgController.js's
// resolveStepMaterialLines / getStepMaterialStatusController) instead of one
// hardcoded step name — works for Child Part and Machine both. Mounted on
// every step card that has materialRefs, regardless of that step's own
// status (Pending/Locked included) — Production wants to see ahead of time
// whether the NEXT unit will have enough, not just while a step is actively
// being worked. Unlike the legacy Fabrication table, this one never claims
// Start is blocked on "Ready" — the only real gate today is the simpler
// "material must be Issued" check (productionMfgController.js's
// assignTeam/startProcess), not a stricter on-the-floor-sufficiency one; see
// the discussion doc's own note on why that stricter version stays deferred.
export default function StepMaterialStatus({ orderId, unitNumber, stepIndex }) {
  const { data } = useQuery({
    queryKey: ['step-material-status', orderId, unitNumber, stepIndex],
    queryFn: () => apiRequest('GET', `/api/production-mfg/orders/${orderId}/processes/${stepIndex}/material-status?unit=${unitNumber}`),
    enabled: !!orderId,
  });
  const materials = data?.data?.materials || [];
  if (!materials.length) return null;

  const fmt = (n) => Number.isInteger(n) ? n : Number(n).toFixed(2);

  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-100">
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Materials for this step — per unit
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase">
              <th className="px-3 py-1.5 text-left font-semibold">Material</th>
              <th className="px-3 py-1.5 text-right font-semibold">Need / unit</th>
              <th className="px-3 py-1.5 text-right font-semibold">On floor</th>
              <th className="px-3 py-1.5 text-right font-semibold">Consumed</th>
              <th className="px-3 py-1.5 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.demandKey} className="border-t border-slate-100">
                <td className="px-3 py-1.5">
                  <span className="text-slate-700">{m.name}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-blue-600">{m.code}</span>
                </td>
                <td className="px-3 py-1.5 text-right text-slate-600">{fmt(m.perUnitNeed)} {m.unit}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{fmt(m.onFloor)}</td>
                <td className="px-3 py-1.5 text-right text-slate-400">{fmt(m.consumedByUnit)}</td>
                <td className="px-3 py-1.5 text-right">
                  {/* Ready/Short is a forward-looking "is there enough on
                      floor for a build starting now" check — meaningless
                      (and misleading) once this unit already drew its own
                      share; consumedByUnit > 0 is the same signal
                      resolveStepMaterialLines derives it from (this unit's
                      own step already left 'Pending'), so once true this
                      unit's own row is done, not short (2026-09-24, found
                      live: a Completed step's card showed "Short" once On
                      Floor for everyone else hit 0, reading as if something
                      was currently wrong). */}
                  {m.consumedByUnit > 0
                    ? <span className="text-slate-500 font-semibold">Consumed</span>
                    : m.enough
                      ? <span className="text-emerald-600 font-semibold">Ready</span>
                      : <span className="text-amber-600 font-semibold">Short</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
