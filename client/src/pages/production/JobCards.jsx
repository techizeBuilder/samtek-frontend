import React, { useState } from 'react';
import { useProduction, useProductionOrdersList, PROCESS_STEPS } from '@/contexts/ProductionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Printer, Search, CheckCircle, Clock, Play, AlertTriangle, X, Factory } from 'lucide-react';

const statusBadge = {
  'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'QC Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const priorityBadge = {
  'Urgent': 'bg-red-100 text-red-700 border-red-200',
  'Normal': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function JobCards() {
  const { teams, getTeamById } = useProduction();
  const [search, setSearch] = useState('');
  const [filterStep, setFilterStep] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [printCard, setPrintCard] = useState(null);
  const [page, setPage] = useState(1);

  const changeSearch = (value) => { setSearch(value); setPage(1); };

  // Job cards are one-per-(order × process) — printable historical ERP
  // records, so unlike the board pages this needs full order history, not
  // just active work. Backed by the same paginated/searchable orders list
  // the Orders page uses (search matches orderId/machineCode/machineName);
  // step/status below are then applied client-side on top of this page's
  // cards, so the pagination boundary is per order-batch, not per exact
  // card count.
  const { data: ordersListData, isLoading: ordersLoading } = useProductionOrdersList({
    page, limit: 20, search,
  });
  const orders = ordersListData?.data?.orders || [];
  const pagination = ordersListData?.data?.pagination || {};

  // Flatten this page's job cards: one per (order × process)
  const allCards = orders.flatMap(order =>
    order.processes.map((proc, idx) => ({
      cardId: `JC-${order.orderId || order.id}-${idx + 1}`,
      orderId: order.orderId || order.id,
      machineName: order.machineName,
      machineCode: order.machineCode,
      priority: order.priority,
      deliveryDate: order.deliveryDate,
      stepNumber: idx + 1,
      step: proc.step,
      type: proc.type,
      status: proc.status,
      assignedTeam: proc.assignedTeam,
      startDate: proc.startDate,
      endDate: proc.endDate,
      qcStatus: proc.qcStatus,
      qcBy: proc.qcBy,
      qcDate: proc.qcDate,
      notes: proc.notes,
      reworks: proc.reworks,
      materials: order.materialDemands,
    }))
  );

  // Fixed list (not derived from the current page) so the filter buttons
  // don't shift around depending on which order page happens to be loaded.
  const steps = ['All', ...PROCESS_STEPS];
  const statuses = ['All', 'Pending', 'In Progress', 'QC Pending', 'Completed'];

  const filtered = allCards.filter(c => {
    const matchStep = filterStep === 'All' || c.step === filterStep;
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchStep && matchStatus;
  });

  const stats = {
    total: allCards.length,
    pending: allCards.filter(c => c.status === 'Pending').length,
    inProgress: allCards.filter(c => c.status === 'In Progress').length,
    qcPending: allCards.filter(c => c.status === 'QC Pending').length,
    completed: allCards.filter(c => c.status === 'Completed').length,
  };

  const handlePrint = (card) => {
    setPrintCard(card);
    setTimeout(() => window.print(), 300);
  };

  const team = printCard ? getTeamById(printCard.assignedTeam) : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" /> Job Cards
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">One job card per process step — printable ERP records</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span>Job cards are auto-generated from orders. To create new cards, add an order in <strong>Order Management</strong>.</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Cards (this page)', value: stats.total, color: 'text-slate-800' },
          { label: 'Pending', value: stats.pending, color: 'text-slate-500' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600' },
          { label: 'QC Pending', value: stats.qcPending, color: 'text-amber-600' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label} className="border-none shadow-sm bg-white">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by Order ID or Machine..." className="pl-9" value={search} onChange={e => changeSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center">Process:</span>
            {steps.map(s => (
              <button key={s} onClick={() => setFilterStep(s)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${filterStep === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center">Status:</span>
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>{s}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Cards Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Card ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Process</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Team</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Start</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">End</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Print</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading job cards...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No job cards match your filters.</td></tr>
                ) : filtered.map(card => {
                  const cardTeam = card.assignedTeam ? getTeamById(card.assignedTeam) : null;
                  return (
                    <tr key={card.cardId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-700">{card.cardId}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{card.orderId}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900 text-xs">{card.machineName}</div>
                        <div className="text-xs text-slate-400">{card.machineCode}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 text-xs">{card.step}</div>
                        <div className="text-xs text-slate-400">{card.type}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{cardTeam ? cardTeam.name : <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{card.startDate || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{card.endDate || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge[card.status]}`}>{card.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPrintCard(card)}>
                          <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Order page {pagination.page} of {pagination.pages} ({pagination.total} orders)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print / View Job Card Dialog */}
      <Dialog open={!!printCard} onOpenChange={() => setPrintCard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Job Card — {printCard?.cardId}</span>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {printCard && (
            <div className="space-y-5 py-2 print:p-8" id="job-card-print">
              {/* Header */}
              <div className="border-2 border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Factory className="h-8 w-8 text-blue-600" />
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg">SAMTEK</h2>
                      <p className="text-xs text-slate-500">Production Job Card</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-blue-700">{printCard.cardId}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityBadge[printCard.priority]}`}>{printCard.priority}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Order ID</p>
                    <p className="font-bold text-slate-900">{printCard.orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Machine</p>
                    <p className="font-bold text-slate-900">{printCard.machineName} ({printCard.machineCode})</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Process Name</p>
                    <p className="font-bold text-slate-900">Step {printCard.stepNumber}: {printCard.step}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Work Type</p>
                    <p className="font-bold text-slate-900">{printCard.type}</p>
                  </div>
                </div>
              </div>

              {/* Team & Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Assigned Team</h3>
                  {printCard.assignedTeam ? (() => {
                    const t = getTeamById(printCard.assignedTeam);
                    return t ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-bold text-slate-900">{t.name}</p>
                        <p className="text-slate-600">Supervisor: {t.supervisor}</p>
                        <p className="text-slate-500 text-xs">Members: {t.members.join(', ')}</p>
                      </div>
                    ) : <p className="text-slate-400 text-sm">—</p>;
                  })() : <p className="text-slate-400 text-sm">Not assigned</p>}
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Timing</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Start Date:</span><strong>{printCard.startDate || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">End Date:</span><strong>{printCard.endDate || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Delivery:</span><strong>{printCard.deliveryDate}</strong></div>
                  </div>
                </div>
              </div>

              {/* Materials */}
              {printCard.materials.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Material Details</h3>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500">Code</th>
                        <th className="text-left px-3 py-2 text-slate-500">Material</th>
                        <th className="text-left px-3 py-2 text-slate-500">Qty</th>
                        <th className="text-left px-3 py-2 text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printCard.materials.map(m => (
                        <tr key={m.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-blue-700">{m.materialCode}</td>
                          <td className="px-3 py-2 font-medium">{m.materialName}</td>
                          <td className="px-3 py-2">{m.quantity} {m.fabricationCategory ? 'pcs' : m.unit}</td>
                          <td className="px-3 py-2">{m.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* QC Section */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">QC Approval</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">QC Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      printCard.qcStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'}`}>{printCard.qcStatus}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Approved By</p>
                    <p className="font-bold text-slate-900">{printCard.qcBy || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">QC Date</p>
                    <p className="font-bold text-slate-900">{printCard.qcDate || '—'}</p>
                  </div>
                </div>
                {printCard.reworks.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                    <strong>Rework History:</strong>
                    {printCard.reworks.map((r, i) => <div key={i}>{r.date}: {r.reason} (by {r.rejectedBy})</div>)}
                  </div>
                )}
              </div>

              {/* Notes & Signature */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Notes</h3>
                  <p className="text-sm text-slate-700 min-h-[48px]">{printCard.notes || 'No notes'}</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Supervisor Signature</h3>
                  <div className="border-b border-slate-400 mt-8 mb-1" />
                  <p className="text-xs text-slate-400">Name & Date</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
