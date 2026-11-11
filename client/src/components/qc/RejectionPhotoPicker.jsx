import React, { useEffect, useMemo } from 'react';
import { Camera, X } from 'lucide-react';

// Photos of the rejected material (2026-10-30, client) — picked in a QC
// Review when rejecting / sending to rework or scrap. Up to 5 JPG / PNG / WEBP,
// 10 MB each (the server checks too). `files` = File[]; `required` marks a
// purchase rejection (at least one photo).
export const QC_PHOTO_MAX = 5;
const MAX_MB = 10;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function RejectionPhotoPicker({ files, onChange, required = false, onError }) {
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  const add = (list) => {
    const picked = [...list];
    const bad = picked.find(f => !TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024);
    if (bad) { onError?.(`"${bad.name}": photos only (JPG, PNG, WEBP), up to ${MAX_MB} MB each.`); return; }
    const next = [...files, ...picked];
    if (next.length > QC_PHOTO_MAX) onError?.(`Attach up to ${QC_PHOTO_MAX} photos.`);
    onChange(next.slice(0, QC_PHOTO_MAX));
  };

  return (
    <div>
      <label className={`text-xs mb-1 block ${required ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
        Photos of the rejected material{required ? ' *' : ' (optional)'} <span className="font-normal text-slate-400">· up to {QC_PHOTO_MAX}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="relative h-16 w-16 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
            <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} title="Remove"
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white/90 text-slate-600 hover:text-red-600 flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {files.length < QC_PHOTO_MAX && (
          <label className={`h-16 w-16 rounded-md border border-dashed flex flex-col items-center justify-center text-[10px] cursor-pointer ${required && !files.length ? 'border-red-300 text-red-600 bg-red-50/40' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
            <Camera className="h-4 w-4 mb-0.5" /> Add
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) add(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
    </div>
  );
}

// A decision with photos goes as multipart: the photos + the JSON as "payload".
export function decisionBody(payload, files) {
  if (!files?.length) return payload;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(payload));
  files.forEach(f => fd.append('photos', f));
  return fd;
}
