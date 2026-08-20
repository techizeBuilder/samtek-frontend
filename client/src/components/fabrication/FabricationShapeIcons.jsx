import React, { useId } from 'react';

// Small pseudo-3D metallic tile icons for the "Select Category" grid (Modal
// 1) — one per FABRICATION_CATEGORY_GROUPS key from fabricationCategories.js.
// No image assets exist anywhere in this repo, so these are hand-drawn inline
// SVGs styled to read as brushed steel (gradient fill + darker side/outline),
// not a pixel copy of any external screenshot.
export function ShapeTileIcon({ group, className = 'h-12 w-12' }) {
  const uid = useId();
  const g = `sg-${uid}`;
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="60%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      {renderTileShape(group, g)}
    </svg>
  );
}

const stroke = { stroke: '#475569', strokeWidth: 1.4, strokeLinejoin: 'round' };

function renderTileShape(group, g) {
  const fill = `url(#${g})`;
  switch (group) {
    case 'round_bar':
      return (
        <>
          <rect x="16" y="21" width="62" height="22" rx="11" fill={fill} {...stroke} />
          <ellipse cx="16" cy="32" rx="6.5" ry="11" fill="#cbd5e1" {...stroke} />
        </>
      );
    case 'pipe':
      return (
        <>
          <rect x="16" y="21" width="62" height="22" rx="11" fill={fill} {...stroke} />
          <ellipse cx="16" cy="32" rx="6.5" ry="11" fill="#cbd5e1" {...stroke} />
          <ellipse cx="16" cy="32" rx="2.6" ry="5" fill="#eef2f7" stroke="#64748b" strokeWidth="1" />
        </>
      );
    case 'square_bar':
      return (
        <>
          <polygon points="24,22 24,44 62,44 62,22" fill={fill} {...stroke} />
          <polygon points="24,22 36,10 74,10 62,22" fill="#e2e8f0" {...stroke} />
          <polygon points="62,22 74,10 74,32 62,44" fill="#64748b" {...stroke} />
        </>
      );
    case 'hex_bar':
      return (
        <>
          <polygon points="26,33 34,20 54,20 62,33 54,46 34,46" fill={fill} {...stroke} />
          <polygon points="34,20 42,10 62,10 54,20" fill="#e2e8f0" {...stroke} />
          <polygon points="54,20 62,10 70,23 62,33" fill="#64748b" {...stroke} />
        </>
      );
    case 'square_tubing':
      return (
        <>
          <polygon points="22,20 22,46 58,46 58,20" fill={fill} {...stroke} />
          <polygon points="22,20 33,10 69,10 58,20" fill="#e2e8f0" {...stroke} />
          <polygon points="58,20 69,10 69,36 58,46" fill="#64748b" {...stroke} />
          <rect x="30" y="28" width="20" height="10" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
        </>
      );
    case 'beam':
      return (
        <path
          d="M20 14 H68 V22 H50 V42 H68 V50 H20 V42 H38 V22 H20 Z"
          fill={fill}
          {...stroke}
        />
      );
    case 't_bar':
      return <path d="M18 14 H70 V24 H50 V50 H38 V24 H18 Z" fill={fill} {...stroke} />;
    case 'channel':
      return <path d="M26 12 H62 V22 H38 V42 H62 V52 H26 Z" fill={fill} {...stroke} />;
    case 'angle':
      return <path d="M22 12 H32 V42 H62 V52 H22 Z" fill={fill} {...stroke} />;
    case 'flat_bar':
      return <rect x="14" y="24" width="72" height="14" rx="2" fill={fill} {...stroke} />;
    case 'sheet':
    default:
      return (
        <>
          <polygon points="16,38 40,26 84,26 60,38" fill="#e2e8f0" {...stroke} />
          <polygon points="16,38 16,44 40,32 40,26" fill="#94a3b8" {...stroke} />
          <polygon points="40,32 84,32 84,26 40,26" fill="#cbd5e1" {...stroke} />
          <polygon points="16,44 40,32 84,32 60,44" fill={fill} {...stroke} />
        </>
      );
  }
}

// Simple black-line-on-white cross-section diagrams with dimension arrows —
// the boxed "D" diagram style from the Dimension Calculator screenshot.
// `category` is a FABRICATION_CATEGORIES entry; `values` (optional) are the
// draft values keyed by field.key, shown live next to each letter label.
export function ShapeDiagram({ category, values = {}, className = 'h-40 w-full' }) {
  const group = category?.group;
  const v = (key) => {
    const val = values?.[key];
    return val !== undefined && val !== null && val !== '' ? String(val) : '';
  };
  const hasField = (key) => (category?.fields || []).some((f) => f.key === key);

  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true">
      <rect x="1" y="1" width="158" height="138" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      {renderDiagram(group, hasField, v)}
    </svg>
  );
}

const line = { stroke: '#0f172a', strokeWidth: 1.6, fill: 'none' };
const dim = { stroke: '#334155', strokeWidth: 1 };
const label = { fontSize: 10, fill: '#1e293b', fontWeight: 600, fontFamily: 'ui-sans-serif, system-ui' };

// Horizontal dimension line with end-ticks, centered under a shape, labelled "K = v".
const HDim = ({ x1, x2, y, k, val }) => (
  <>
    <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} {...dim} />
    <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} {...dim} />
    <line x1={x1} y1={y} x2={x2} y2={y} {...dim} />
    <text x={(x1 + x2) / 2} y={y + 14} textAnchor="middle" {...label}>{k}{val ? ` = ${val}` : ''}</text>
  </>
);

// Vertical dimension line with end-ticks, labelled to the left/right, "K = v".
const VDim = ({ y1, y2, x, k, val, side = 'left' }) => (
  <>
    <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} {...dim} />
    <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} {...dim} />
    <line x1={x} y1={y1} x2={x} y2={y2} {...dim} />
    <text x={side === 'left' ? x - 8 : x + 8} y={(y1 + y2) / 2 + 3} textAnchor={side === 'left' ? 'end' : 'start'} {...label}>{k}{val ? ` = ${val}` : ''}</text>
  </>
);

function renderDiagram(group, hasField, v) {
  switch (group) {
    case 'round_bar':
      return (
        <>
          <circle cx="80" cy="60" r="38" {...line} />
          <HDim x1={42} x2={118} y={104} k="D" val={v('diameter')} />
        </>
      );
    case 'pipe':
      return (
        <>
          <circle cx="80" cy="58" r="38" {...line} />
          <circle cx="80" cy="58" r="26" stroke="#94a3b8" strokeWidth="1.4" fill="none" strokeDasharray="3 2" />
          <HDim x1={42} x2={118} y={102} k="D" val={v('od')} />
          <line x1="80" y1="20" x2="80" y2="32" {...dim} />
          <text x="86" y="26" {...label}>t{v('wallThickness') ? ` = ${v('wallThickness')}` : ''}</text>
        </>
      );
    case 'square_bar':
      return (
        <>
          <rect x="42" y="22" width="76" height="76" {...line} />
          <HDim x1={42} x2={118} y={108} k="A" val={v('side')} />
        </>
      );
    case 'hex_bar':
      return (
        <>
          <polygon points="46,60 63,26 97,26 114,60 97,94 63,94" {...line} />
          <HDim x1={46} x2={114} y={106} k="AF" val={v('af')} />
        </>
      );
    case 'square_tubing': {
      const rectangular = hasField('width') && hasField('height');
      const outerW = 76, outerH = rectangular ? 56 : 76;
      const x0 = 80 - outerW / 2, y0 = 60 - outerH / 2;
      return (
        <>
          <rect x={x0} y={y0} width={outerW} height={outerH} {...line} />
          <rect x={x0 + 10} y={y0 + 10} width={outerW - 20} height={outerH - 20} stroke="#94a3b8" strokeWidth="1.4" fill="none" strokeDasharray="3 2" />
          <HDim x1={x0} x2={x0 + outerW} y={y0 + outerH + 14} k={rectangular ? 'W' : 'A'} val={v(rectangular ? 'width' : 'side')} />
          {rectangular && <VDim y1={y0} y2={y0 + outerH} x={x0 - 12} k="H" val={v('height')} />}
          <text x={x0 + outerW + 8} y={y0 + 14} {...label}>t{v('wallThickness') ? ` = ${v('wallThickness')}` : ''}</text>
        </>
      );
    }
    case 'beam':
      return (
        <>
          <path d="M46 26 H114 V42 H88 V78 H114 V94 H46 V78 H72 V42 H46 Z" {...line} />
          <VDim y1={26} y2={94} x={36} k="A" val={v('sideA')} />
          <HDim x1={46} x2={114} y={106} k="B" val={v('sideB')} />
          <text x="92" y="36" {...label}>S{v('thicknessS') ? ` = ${v('thicknessS')}` : ''}</text>
          <text x="92" y="62" {...label}>T{v('thicknessT') ? ` = ${v('thicknessT')}` : ''}</text>
        </>
      );
    case 't_bar':
      return (
        <>
          <path d="M40 26 H120 V42 H90 V94 H70 V42 H40 Z" {...line} />
          <HDim x1={40} x2={120} y={20} k="W" val={v('width')} />
          <VDim y1={26} y2={94} x={30} k="H" val={v('height')} />
          <text x="96" y="60" {...label}>t{v('thickness') ? ` = ${v('thickness')}` : ''}</text>
        </>
      );
    case 'channel':
      return (
        <>
          <path d="M56 24 H108 V40 H72 V80 H108 V96 H56 Z" {...line} />
          <VDim y1={24} y2={96} x={46} k="A" val={v('sideA')} />
          <HDim x1={56} x2={108} y={108} k="B" val={v('sideB')} />
          <text x="78" y="34" {...label}>S{v('thicknessS') ? ` = ${v('thicknessS')}` : ''}</text>
          <text x="62" y="64" {...label}>T{v('thicknessT') ? ` = ${v('thicknessT')}` : ''}</text>
        </>
      );
    case 'angle': {
      const equal = hasField('legLength');
      return (
        <>
          <path d="M40 20 H56 V80 H100 V96 H40 Z" {...line} />
          <HDim x1={40} x2={100} y={106} k={equal ? 'A' : 'A'} val={v(equal ? 'legLength' : 'legA')} />
          {!equal && <VDim y1={20} y2={80} x={30} k="B" val={v('legB')} />}
          <text x="62" y="70" {...label}>t{v('thickness') ? ` = ${v('thickness')}` : ''}</text>
        </>
      );
    }
    case 'flat_bar':
      return (
        <>
          <rect x="30" y="52" width="100" height="18" {...line} />
          <HDim x1={30} x2={130} y={84} k="W" val={v('width')} />
          <VDim y1={52} y2={70} x={20} k="t" val={v('thickness')} />
        </>
      );
    case 'sheet':
    default:
      return (
        <>
          <rect x="34" y="48" width="92" height="26" {...line} />
          <HDim x1={34} x2={126} y={86} k="W" val={v('width')} />
          <VDim y1={48} y2={74} x={24} k="t" val={v('thickness')} />
        </>
      );
  }
}
