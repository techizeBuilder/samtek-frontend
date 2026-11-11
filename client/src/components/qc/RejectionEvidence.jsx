import React, { useState } from 'react';
import { Download, ImageOff } from 'lucide-react';
import { fileHref } from '@/components/accounts/vendor/vendorUi';
import { fmtWhen } from './QcCheckRow';

// What a QC rejection carries (2026-10-30, client): the checks that failed
// (with QC's remark and who checked them) and QC's photos of the rejected
// material — each opens full size and can be downloaded to share with the
// vendor. Used in QC History, Purchase's QC Rejections and Production.
// failedChecks: [{ parameter, standardValue, actualValue, remarks, checkedBy, checkedAt }]
// — or plain strings (a Production rework entry keeps "name — remark").
// photos: [{ url, name }] or url strings.

async function downloadPhoto(url, name) {
  const res = await fetch(fileHref(url));
  if (!res.ok) throw new Error('The photo could not be downloaded.');
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = href;
  a.download = name || url.split('/').pop();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export default function RejectionEvidence({ failedChecks = [], photos = [], downloadName = 'qc-photo', showEmpty = false, compact = false }) {
  const [busy, setBusy] = useState(null);
  const list = (photos || []).map((p, i) => (typeof p === 'string' ? { url: p, name: '' } : p)).map((p, i) => ({
    ...p, fileName: `${downloadName}-${i + 1}${(p.url.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0]}`,
  }));
  const checks = failedChecks || [];
  if (!list.length && !checks.length) {
    return showEmpty ? <p className="text-[11px] text-slate-400 flex items-center gap-1"><ImageOff className="h-3 w-3" /> No photos or failed checks recorded.</p> : null;
  }
  const getOne = async (p) => {
    setBusy(p.url);
    try { await downloadPhoto(p.url, p.fileName); } catch { window.open(fileHref(p.url), '_blank', 'noopener'); } finally { setBusy(null); }
  };
  const getAll = async () => { for (const p of list) await getOne(p); };
  const size = compact ? 'h-12 w-12' : 'h-16 w-16';

  return (
    <div className="space-y-1.5">
      {checks.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-red-700">Failed checks</p>
          <ul className="text-[11px] text-slate-700 list-disc pl-4 space-y-0.5">
            {checks.map((c, i) => (typeof c === 'string' ? <li key={i}>{c}</li> : (
              <li key={i}>
                <span className="font-medium">{c.parameter}</span>
                {c.standardValue && c.standardValue.toLowerCase() !== 'checkbox' ? <span className="text-slate-400"> (std {c.standardValue}{c.actualValue ? `, found ${c.actualValue}` : ''})</span> : c.actualValue ? <span className="text-slate-400"> (found {c.actualValue})</span> : null}
                {c.remarks ? ` — ${c.remarks}` : ''}
                {c.checkedBy && <span className="text-slate-400"> · {c.checkedBy}{c.checkedAt ? `, ${fmtWhen(c.checkedAt)}` : ''}</span>}
              </li>
            )))}
          </ul>
        </div>
      )}
      {list.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-slate-600">Photos ({list.length})</p>
            {list.length > 1 && (
              <button type="button" onClick={getAll} className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
                <Download className="h-3 w-3" /> Download all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {list.map(p => (
              <div key={p.url} className="flex flex-col items-center gap-0.5">
                <a href={fileHref(p.url)} target="_blank" rel="noreferrer" title="Open full size"
                  className={`${size} rounded-md overflow-hidden border border-slate-200 bg-slate-50 block`}>
                  <img src={fileHref(p.url)} alt={p.name || 'QC photo'} className="h-full w-full object-cover" />
                </a>
                <button type="button" onClick={() => getOne(p)} disabled={busy === p.url} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                  <Download className="h-2.5 w-2.5" /> {busy === p.url ? '…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
