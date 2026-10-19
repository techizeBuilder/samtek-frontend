import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, ListPlus } from 'lucide-react';

// Serial numbers, one per piece (2026-10-13) — for an item the vendor gave a
// warranty on, counted in pieces. Store types / pastes them one per line, or
// fills a range (prefix + from–to). The server checks the same rules.
const COUNTABLE = /^(pieces?|pcs?\.?|pc\.?|nos?\.?|numbers?|units?|sets?|each|ea)$/i;
export const isCountableUnit = (unit) => COUNTABLE.test(String(unit || '').trim());

export const keyOf = (s) => String(s || '').trim().toUpperCase();

// `spaced`: serials with a space inside — refused (real serials never have
// one; 2026-10-17). Hyphens count: TLA-01 and TLA01 are different serials.
export function parseSerials(text) {
  const serials = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const dup = new Set();
  serials.forEach(s => { const k = keyOf(s); if (seen.has(k)) dup.add(s); else seen.add(k); });
  return { serials, duplicates: [...dup], spaced: serials.filter(s => /\s/.test(s)) };
}

// "GEN-" + 0101 … 0110 → GEN-0101 … GEN-0110 (the padding follows "from").
function rangeOf(prefix, from, to) {
  const a = Number(from);
  const b = Number(to);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b - a >= 1000) return null;
  const width = String(from).trim().length;
  const out = [];
  for (let n = a; n <= b; n++) out.push(`${prefix}${String(n).padStart(width, '0')}`);
  return out;
}

export default function SerialNumbersInput({ value, onChange, expected, unitLabel }) {
  const [prefix, setPrefix] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { serials, duplicates, spaced } = parseSerials(value);
  const range = rangeOf(prefix, from, to);
  const exact = expected != null && serials.length === expected && !duplicates.length && !spaced.length;

  const addRange = () => {
    if (!range) return;
    const current = String(value || '').trim();
    onChange((current ? current + '\n' : '') + range.join('\n'));
    setFrom(''); setTo('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="line-recv-serials" className="text-xs font-semibold text-slate-700 uppercase">
        Serial Numbers — one per piece <span className="text-rose-500">*</span>
      </Label>
      <Textarea
        id="line-recv-serials"
        rows={5}
        placeholder={'One serial number per line, e.g.\nGEN-0101\nGEN-0102'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-slate-300 font-mono text-sm"
      />
      <div className="flex flex-wrap items-end gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
        <div className="space-y-1 flex-1 min-w-[90px]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Prefix</p>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="GEN-" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 w-20">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">From</p>
          <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="0101" className="h-8 text-sm" />
        </div>
        <div className="space-y-1 w-20">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">To</p>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0110" className="h-8 text-sm" />
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={!range} onClick={addRange}>
          <ListPlus className="w-3.5 h-3.5 mr-1" /> Add {range ? range.length : ''}
        </Button>
      </div>
      <div className={`flex items-start gap-1.5 text-xs font-medium ${exact ? 'text-emerald-700' : 'text-amber-700'}`}>
        {exact ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <span>
          {serials.length} of {expected ?? '?'} {unitLabel || 'pieces'} entered
          {duplicates.length > 0 && <span className="text-rose-600"> — repeated: {duplicates.slice(0, 5).join(', ')}{duplicates.length > 5 ? '…' : ''}</span>}
          {spaced.length > 0 && <span className="text-rose-600"> — no spaces inside a serial: {spaced.slice(0, 5).map(s => `"${s}"`).join(', ')}{spaced.length > 5 ? '…' : ''}</span>}
        </span>
      </div>
    </div>
  );
}
