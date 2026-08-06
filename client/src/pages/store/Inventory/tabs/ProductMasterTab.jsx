import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, Package } from 'lucide-react';

// Read-only view of Product Master for Store — same underlying data
// (GET /api/rd/machines) and classification filters R&D uses, but no
// create/edit/discontinue/BOM actions. Store just needs visibility into
// what finished-goods machines exist.
const categoryOptionsFor = (pTypeVal, masterOptions) =>
  (masterOptions.Category || []).filter(o => o.parentValue === pTypeVal);
const pSourceOptionsFor = (categoryVal, masterOptions) =>
  (masterOptions.PSourceType || []).filter(o => o.parentValue === categoryVal);

const designStatusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Testing: 'bg-amber-100 text-amber-700 border-amber-200',
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
};
const releaseStatusBadge = (status) => status === 'Released'
  ? 'bg-blue-100 text-blue-700 border-blue-200'
  : 'bg-slate-100 text-slate-500 border-slate-200';

export default function ProductMasterTab() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRelease, setFilterRelease] = useState('All');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [filterPType, setFilterPType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPSourceType, setFilterPSourceType] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterRelease, showDiscontinued, filterPType, filterCategory, filterPSourceType]);

  const { data: optionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const masterOptions = optionsResponse?.data || {};

  const { data: machinesListResponse, isLoading } = useQuery({
    queryKey: ['store-rd-machines', 'list', { page, search, filterStatus, filterRelease, showDiscontinued, filterPType, filterCategory, filterPSourceType }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        designStatus: filterStatus,
        releaseStatus: filterRelease,
        discontinued: showDiscontinued ? 'true' : 'false',
      });
      if (search) params.set('search', search);
      if (filterPType) params.set('pType', filterPType);
      if (filterCategory) params.set('category', filterCategory);
      if (filterPSourceType) params.set('pSourceType', filterPSourceType);
      return apiRequest('GET', `/api/rd/machines?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const machines = machinesListResponse?.data || [];
  const pagination = machinesListResponse?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, code or category..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['All', 'Draft', 'Testing', 'Approved', 'Rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {['All', 'Released', 'Not Released'].map(s => (
                <button key={s} onClick={() => setFilterRelease(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterRelease === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>{s}</button>
              ))}
            </div>
            <button onClick={() => setShowDiscontinued(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiscontinued ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
              {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 flex-shrink-0">Classification:</span>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterPType}
              onChange={e => { setFilterPType(e.target.value); setFilterCategory(''); setFilterPSourceType(''); }}
            >
              <option value="">All Categories</option>
              {(masterOptions.PType || []).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              value={filterCategory}
              disabled={!filterPType}
              onChange={e => { setFilterCategory(e.target.value); setFilterPSourceType(''); }}
            >
              <option value="">{filterPType ? 'All Sub Categories' : 'Select Category first'}</option>
              {categoryOptionsFor(filterPType, masterOptions).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              value={filterPSourceType}
              disabled={!filterCategory}
              onChange={e => setFilterPSourceType(e.target.value)}
            >
              <option value="">{filterCategory ? 'All Product Source Types' : 'Select Sub Category first'}</option>
              {pSourceOptionsFor(filterCategory, masterOptions).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            {(filterPType || filterCategory || filterPSourceType) && (
              <button
                onClick={() => { setFilterPType(''); setFilterCategory(''); setFilterPSourceType(''); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                Clear
              </button>
            )}
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Design Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Release</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
                ) : machines.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No machines found matching the filters.</td></tr>
                ) : machines.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/30">{m.code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{m.name}</div>
                      {m.isDiscontinued && <span className="text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{[m.pType, m.category].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${designStatusBadge(m.designStatus)}`}>{m.designStatus}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${releaseStatusBadge(m.releaseStatus)}`}>{m.releaseStatus}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.qty ?? 0} {m.unit || ''}</td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600" onClick={() => { setSelected(m); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-mono text-blue-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Design Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${designStatusBadge(selected.designStatus)}`}>{selected.designStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Release Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${releaseStatusBadge(selected.releaseStatus)}`}>{selected.releaseStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Machine Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.machineType || 'Standard'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Sub Category</p>
                  <p className="text-sm font-medium text-slate-800">{selected.category || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Product Source Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pSourceType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Model Number</p>
                  <p className="text-sm font-medium text-slate-800">{selected.modelNumber || 'N/A'}</p>
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

              {Array.isArray(selected.specifications) && selected.specifications.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-900 mb-3">Specifications</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.specifications.map((s, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-slate-500">{s.key}: </span>
                        <span className="text-slate-800 font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
