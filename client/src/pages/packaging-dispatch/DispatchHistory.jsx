import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BarChart3, CheckCircle2, Package, Truck, MapPin, Clock } from 'lucide-react';

const statusColor = {
  Delivered: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-500',
};

export default function DispatchHistoryPage() {
  const { dispatchOrders, dispatchOrdersLoading } = usePackagingDispatch();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

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
          {filtered.map(d => (
            <Card key={d._id} className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${d.status === 'Closed' ? 'bg-slate-100' : 'bg-emerald-50'}`}>
                      {d.status === 'Closed'
                        ? <BarChart3 className="h-5 w-5 text-slate-500" />
                        : <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{d.dispatchId}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[d.status]}`}>
                          {d.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{d.machineName} ({d.machineCode}) · {d.orderId}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                        {d.customerName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {d.customerName}
                          </span>
                        )}
                        {d.trackingId && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            <span className="font-mono">{d.trackingId}</span>
                          </span>
                        )}
                        {d.actualDispatchDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Dispatched: {new Date(d.actualDispatchDate).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        {d.actualDeliveryDate && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Delivered: {new Date(d.actualDeliveryDate).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        {d.serialNumber && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" /> SN: {d.serialNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 text-right flex-shrink-0">
                    <p>{d.transportType}</p>
                    {d.vehicleNumber && <p>{d.vehicleNumber}</p>}
                    {d.invoiceNumber && <p>Inv: {d.invoiceNumber}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
