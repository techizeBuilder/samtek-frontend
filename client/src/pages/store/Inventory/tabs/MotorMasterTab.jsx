import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, Cog } from 'lucide-react';

// Read-only view of Motor Master for Store — same underlying data
// (GET /api/items?type=Product&productKind=Motor) Motor Master itself uses,
// but no create/edit/discontinue actions. Store just needs visibility into
// what motors exist.
export default function MotorMasterTab() {
  const [search, setSearch] = useState('');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const { data: motorsResponse, isLoading } = useQuery({
    queryKey: ['store-motor-master', 'list', { search, showDiscontinued }],
    queryFn: () => {
      const params = new URLSearchParams({ type: 'Product', productKind: 'Motor', limit: '100' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/items?${params.toString()}`);
    },
  });
  const allMotors = motorsResponse?.items || motorsResponse?.data || [];
  const motors = allMotors.filter(m => showDiscontinued ? m.isDiscontinued : !m.isDiscontinued);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name or code..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowDiscontinued(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiscontinued ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
              {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motor Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motor Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motor Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HP</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
                ) : motors.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No motors found.</td></tr>
                ) : motors.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-amber-700 bg-amber-50/30">{m.code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{m.name}</div>
                      {m.isDiscontinued && <span className="text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.motorDetails?.motorType || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.motorDetails?.hp ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.qty ?? 0} {m.unit || ''}</td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600" onClick={() => { setSelected(m); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5 text-amber-600" />
              <span className="font-mono text-amber-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Motor Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.motorType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Model No.</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.modelNumber || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Version</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.version || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">HP</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.hp ?? 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">KWH</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.kwh ?? 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">RPM</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.rpm ?? 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Pole</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.pole || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Phase</p>
                  <p className="text-sm font-medium text-slate-800">{selected.motorDetails?.phase || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Sale Price</p>
                  <p className="text-sm font-medium text-slate-800">₹{selected.salePrice || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Available Stock</p>
                  <p className="text-sm font-medium text-slate-800">{selected.qty ?? 0} {selected.unit || ''}</p>
                </div>
              </div>

              {selected.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{selected.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
