import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePackagingDispatch, usePackagingJobsList } from '@/contexts/PackagingDispatchContext';
import { usePermissions } from '@/hooks/usePermissions';
import { adminSettingsApi } from '@/api/adminSettingsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Play, CheckCircle2, Clock, Package, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const statusColor = {
  Pending: 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Packed: 'bg-emerald-100 text-emerald-700',
  Dispatched: 'bg-blue-100 text-blue-700',
};

function JobCard({ job, checklistItems, canEdit }) {
  const { startPacking, updateChecklist, completePacking } = usePackagingDispatch();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingKeys, setUpdatingKeys] = useState({});

  const cl = job.checklist || {};
  const allChecked = checklistItems.length > 0 && checklistItems.every(item => cl[item.key]);
  const checkedCount = checklistItems.filter(item => cl[item.key]).length;

  const handleStartPacking = async () => {
    setLoading(true);
    try {
      await startPacking(job._id);
      toast({ title: 'Packing started', description: `Job ${job.jobId} is now in progress` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = async (key, checked) => {
    setUpdatingKeys(prev => ({ ...prev, [key]: true }));
    try {
      await updateChecklist(job._id, { ...cl, [key]: checked });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCompletePacking = async () => {
    setLoading(true);
    try {
      await completePacking(job._id, { photoProofUrl: photoUrl });
      toast({ title: 'Packing completed', description: `Job ${job.jobId} marked as Packed` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800">{job.jobId}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[job.status]}`}>
                {job.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{job.machineName} — {job.machineCode}</p>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-4">
          <div><span className="text-slate-400">Order:</span> {job.orderId}</div>
          <div><span className="text-slate-400">Serial:</span> {job.serialNumber}</div>
          <div><span className="text-slate-400">Packing:</span> {job.packingType}</div>
          <div><span className="text-slate-400">Checklist:</span> {checkedCount}/{checklistItems.length}</div>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="border-t border-slate-100 pt-4 space-y-4">
            {/* Checklist */}
            {(job.status === 'In Progress' || job.status === 'Packed') && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Packing Checklist</p>
                <div className="space-y-2">
                  {checklistItems.map(item => {
                    const isUpdating = !!updatingKeys[item.key];
                    return (
                      <div key={item.key} className="flex items-center gap-2.5">
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
                        ) : (
                          <Checkbox
                            id={`${job._id}-${item.key}`}
                            checked={!!cl[item.key]}
                            onCheckedChange={(v) => handleChecklistChange(item.key, !!v)}
                            disabled={!canEdit || job.status === 'Packed' || job.status === 'Dispatched'}
                          />
                        )}
                        <label
                          htmlFor={`${job._id}-${item.key}`}
                          className={`text-sm cursor-pointer ${cl[item.key] ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}
                        >
                          {item.label}
                        </label>
                        {cl[item.key] && !isUpdating && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Times */}
            {job.packingStartTime && (
              <div className="text-xs text-slate-500 space-y-1">
                {job.packingStartTime && <div>Started: {new Date(job.packingStartTime).toLocaleString('en-IN')}</div>}
                {job.packingCompleteTime && <div>Completed: {new Date(job.packingCompleteTime).toLocaleString('en-IN')}</div>}
              </div>
            )}

            {/* Complete packing form */}
            {job.status === 'In Progress' && allChecked && (
              <div className="space-y-2">
                <Label className="text-sm">Photo Proof URL (optional)</Label>
                <Input
                  placeholder="https://... or leave blank"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <p className="text-xs text-slate-500 italic">Note: {job.notes}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {job.status === 'Pending' && canEdit && (
            <Button className="flex-1" size="sm" onClick={handleStartPacking} disabled={loading}>
              <Play className="h-4 w-4 mr-1.5" />
              Start Packing
            </Button>
          )}
          {job.status === 'In Progress' && (
            <>
              {!expanded && (
                <Button variant="outline" className="flex-1" size="sm" onClick={() => setExpanded(true)}>
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  Manage Checklist
                </Button>
              )}
              {allChecked && canEdit && (
                <Button className="flex-1" size="sm" onClick={handleCompletePacking} disabled={loading}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {loading ? 'Completing...' : 'Mark Packed'}
                </Button>
              )}
            </>
          )}
          {job.status === 'Packed' && (
            <div className="flex-1 flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Ready for Dispatch
            </div>
          )}
          {job.status === 'Dispatched' && (
            <div className="flex-1 flex items-center gap-2 text-blue-600 text-sm font-medium">
              <Package className="h-4 w-4" />
              Dispatched
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PackagingJobs() {
  const { hasFeatureAccess } = usePermissions();
  const canView = hasFeatureAccess('dispatches', 'packagingJobs', 'view');
  const canEdit = hasFeatureAccess('dispatches', 'packagingJobs', 'edit');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const changeFilter = (value) => { setFilter(value); setPage(1); };
  const changeSearch = (value) => { setSearch(value); setPage(1); };

  // Checklist items are managed in Admin Settings > General > Dispatch > Manage Checklist
  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getAll(),
  });
  const checklistItems = (settingsData?.settings?.dispatchChecklist || [])
    .map(item => ({ key: item._id, label: item.label }));

  const statuses = ['all', 'Pending', 'In Progress', 'Packed', 'Dispatched'];

  const { data: jobsListData, isLoading: jobsLoading } = usePackagingJobsList({
    page, limit: 20, search, status: filter,
  }, { enabled: canView });
  const filtered = jobsListData?.data?.jobs || [];
  const pagination = jobsListData?.data?.pagination || {};
  const counts = jobsListData?.data?.summary || {};

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view Packaging Jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Packaging Jobs</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage packing operations and checklists</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by Job ID, Order ID or machine..."
          value={search}
          onChange={e => changeSearch(e.target.value)}
          className="bg-white max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => changeFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All' : s} ({counts[s] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Jobs */}
      {jobsLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No packaging jobs found</p>
          <p className="text-slate-400 text-sm mt-1">Create jobs from the Packaging Queue</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(job => <JobCard key={job._id} job={job} checklistItems={checklistItems} canEdit={canEdit} />)}
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} jobs)
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
