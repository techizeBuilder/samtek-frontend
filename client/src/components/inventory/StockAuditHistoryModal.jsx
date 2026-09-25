import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { History } from 'lucide-react';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Read-only list of past auditStock actions for one item — the history
// counterpart to StockAuditModal.jsx. Same Store-Head-only gate on the
// backend (getStockAuditHistory), so this is only ever opened from a place
// the "Verify Stock" button already shows.
export default function StockAuditHistoryModal({ item, open, onOpenChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-audit-history', item?.id],
    queryFn: () => apiRequest('GET', `/api/items/${item.id}/stock-audit`),
    enabled: open && !!item?.id,
  });

  const history = data?.history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Stock Audit History
          </DialogTitle>
          <DialogDescription>
            {item?.name} {item?.code ? `(${item.code})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No stock audits recorded yet for this item.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h._id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">{fmtDT(h.createdAt)}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      h.variance === 0 ? 'bg-slate-100 text-slate-600'
                        : h.variance > 0 ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {h.variance > 0 ? '+' : ''}{h.variance} {h.unit || ''}
                    </span>
                  </div>
                  {h.variantLabel && (
                    <p className="text-xs text-blue-700 font-medium mt-1">Size: {h.variantLabel}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    System Qty: <span className="font-semibold text-gray-800">{h.systemQty}</span>
                    {'  →  '}
                    Counted Qty: <span className="font-semibold text-gray-800">{h.countedQty}</span>
                    {h.unit ? ` ${h.unit}` : ''}
                  </p>
                  <p className="text-xs text-gray-700 mt-1.5">{h.reason}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    By {h.auditedBy?.fullName || h.auditedBy?.username || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
