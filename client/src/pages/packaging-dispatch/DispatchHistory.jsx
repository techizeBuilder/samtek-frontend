import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, CheckCircle2, Truck, MapPin, Clock, Eye } from 'lucide-react';
import DocumentViewerModal from '@/components/DocumentViewerModal';

const statusColor = {
  Delivered: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-500',
};

export default function DispatchHistoryPage() {
  const { dispatchOrders, dispatchOrdersLoading } = usePackagingDispatch();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewingDocsFor, setViewingDocsFor] = useState(null);

  const historyStatuses = ['Delivered', 'Closed'];

  const filtered = dispatchOrders.filter(d => {
    const inHistory = historyStatuses.includes(d.status);
    const matchFilter = filter === 'all' || d.status === filter;
    const matchSearch = !search ||
      d.dispatchId?.toLowerCase().includes(search.toLowerCase()) ||
      d.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      d.machineCode?.toLowerCase().includes(search.toLowerCase()) ||
      d.trackingId?.toLowerCase().includes(search.toLowerCase());
    return inHistory && matchFilter && matchSearch;
  });

  const counts = {
    all: dispatchOrders.filter(d => historyStatuses.includes(d.status)).length,
    Delivered: dispatchOrders.filter(d => d.status === 'Delivered').length,
    Closed: dispatchOrders.filter(d => d.status === 'Closed').length,
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dispatch History</h1>
        <p className="text-slate-500 text-sm mt-0.5">Delivered and closed dispatch records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by Dispatch ID, Order ID, customer, tracking..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white max-w-md"
        />
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'Delivered', label: 'Delivered' },
            { key: 'Closed', label: 'Closed' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label} ({counts[f.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {dispatchOrdersLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No records found</p>
          <p className="text-slate-400 text-sm mt-1">Completed dispatches will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* One row per ORDER, not per machine — the underlying per-machine
              DispatchOrder records (with their own SN/dates) are listed
              inside instead of repeating the whole row per machine. */}
          {Object.values(
            filtered.reduce((acc, d) => {
              if (!acc[d.orderId]) acc[d.orderId] = { orderId: d.orderId, jobs: [] };
              acc[d.orderId].jobs.push(d);
              return acc;
            }, {})
          ).map(group => {
            const rep = group.jobs[0];
            const allClosed = group.jobs.every(d => d.status === 'Closed');
            const groupStatus = allClosed ? 'Closed' : 'Delivered';
            const docsJob = group.jobs.find(d => d.deliveryDocs?.noc || d.deliveryDocs?.ewayBill || d.deliveryDocs?.invoice);
            return (
              <Card key={group.orderId} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${groupStatus === 'Closed' ? 'bg-slate-100' : 'bg-emerald-50'}`}>
                        {groupStatus === 'Closed'
                          ? <BarChart3 className="h-5 w-5 text-slate-500" />
                          : <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800">{rep.orderId}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[groupStatus]}`}>
                            {groupStatus}
                          </span>
                          <span className="text-xs text-slate-400">{group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {group.jobs.map(d => (
                            <p key={d._id} className="text-sm text-slate-500">
                              {d.machineName} ({d.machineCode}) · SN: {d.serialNumber}
                              {d.status !== groupStatus && (
                                <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor[d.status] || 'bg-slate-100 text-slate-500'}`}>{d.status}</span>
                              )}
                            </p>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                          {rep.customerName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {rep.customerName}
                            </span>
                          )}
                          {rep.trackingId && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              <span className="font-mono">{rep.trackingId}</span>
                            </span>
                          )}
                          {rep.actualDispatchDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Dispatched: {new Date(rep.actualDispatchDate).toLocaleDateString('en-IN')}
                            </span>
                          )}
                          {rep.actualDeliveryDate && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Delivered: {new Date(rep.actualDeliveryDate).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 text-right flex-shrink-0 flex flex-col items-end gap-2">
                      <div>
                        <p>{rep.transportType}</p>
                        {rep.vehicleNumber && <p>{rep.vehicleNumber}</p>}
                        {rep.invoiceNumber && <p>Inv: {rep.invoiceNumber}</p>}
                      </div>
                      {docsJob && (
                        <Button size="sm" variant="outline" onClick={() => setViewingDocsFor(docsJob)}>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Documents
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewingDocsFor && (
        <DocumentViewerModal
          title={`${viewingDocsFor.dispatchId} — Delivery Documents`}
          documents={[
            { label: 'NOC (No Objection Certificate)', path: viewingDocsFor.deliveryDocs?.noc },
            { label: 'E-Way Bill', path: viewingDocsFor.deliveryDocs?.ewayBill },
            { label: 'Invoice', path: viewingDocsFor.deliveryDocs?.invoice },
          ]}
          onClose={() => setViewingDocsFor(null)}
        />
      )}
    </div>
  );
}
