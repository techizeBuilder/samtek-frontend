import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wrench, Clock, PlayCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
};

const statusIcon = { Pending: Clock, 'In Progress': PlayCircle, Completed: CheckCircle2 };

// Same fallback chain as Production Orders' "Rejected Items" tab — the real
// customer sales order code, not the internal REJ-... tracking id.
const getRealOrderId = (job) => job.orderCode || job.rejectionDetails?.originalOrderId || job.machineCode || null;

export default function RepairProduction() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [completeModal, setCompleteModal] = useState(null); // order being completed
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['repair-jobs'],
    queryFn: () => apiRequest('GET', '/api/production-mfg/repair-jobs'),
  });
  const jobs = data?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['repair-jobs'] });

  const startMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `/api/production-mfg/orders/${id}/repair/start`, {}),
    onSuccess: () => { invalidate(); toast({ title: 'Repair started' }); },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }) => apiRequest('PUT', `/api/production-mfg/orders/${id}/repair/complete`, { notes }),
    onSuccess: () => {
      invalidate();
      setCompleteModal(null);
      setNotes('');
      toast({ title: '✓ Repair complete', description: 'Item sent to QC for approval.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-purple-600" /> Repair Production
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">QC-rejected items sent for repair instead of a full rebuild</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-500">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-slate-400 text-sm">No repair jobs</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium">Qty</th>
                  <th className="p-4 font-medium">Rejection Reason</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const StIcon = statusIcon[job.repair?.status] || Clock;
                  const status = job.repair?.status || 'Pending';
                  const realOrderId = getRealOrderId(job);
                  return (
                    <tr key={job._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">
                        {realOrderId ? (
                          <>
                            <span className="font-bold text-blue-700">{realOrderId}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">{job.orderId}</span>
                          </>
                        ) : job.orderId}
                      </td>
                      <td className="p-4 text-slate-700">{job.machineName}</td>
                      <td className="p-4 text-slate-700">{job.orderQuantity || 1}</td>
                      <td className="p-4 text-slate-500 text-xs max-w-xs">
                        {job.rejectionDetails?.rejectionReason || '—'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusColor[status]}`}>
                          <StIcon className="w-3 h-3" /> {status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {status === 'Pending' && (
                          <Button size="sm" variant="outline" onClick={() => startMutation.mutate(job._id)} disabled={startMutation.isPending}>
                            Start Repair
                          </Button>
                        )}
                        {status === 'In Progress' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCompleteModal(job)}>
                            Mark Complete
                          </Button>
                        )}
                        {status === 'Completed' && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent to QC
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!completeModal} onOpenChange={(open) => !open && setCompleteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Repair</DialogTitle>
            <DialogDescription>
              {completeModal?.machineName} — {completeModal?.orderQuantity || 1} unit(s). This sends the item to QC for approval, same as a fresh production run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-slate-500">Repair Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was repaired / replaced" />
          </div>
          {startMutation.isError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {startMutation.error?.message}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCompleteModal(null)}>Cancel</Button>
            <Button
              onClick={() => completeMutation.mutate({ id: completeModal._id, notes })}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Submitting...' : 'Mark Complete & Send to QC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
