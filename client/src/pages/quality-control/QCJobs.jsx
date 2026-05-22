import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQC } from '@/contexts/QCContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Factory, ShoppingCart, Package } from 'lucide-react';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

const statusIcon = {
  Pending: Clock,
  'In Progress': AlertTriangle,
  Approved: CheckCircle2,
  Rejected: XCircle,
};

const sourceIcon = { Purchase: ShoppingCart, Production: Factory, Store: Package };

export default function QCJobs() {
  const { jobs, jobsLoading } = useQC();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const statuses = ['all', 'Pending', 'In Progress', 'Approved', 'Rejected'];
  const sources = ['all', 'Purchase', 'Production', 'Store'];

  const filtered = jobs.filter(j => {
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    const matchSource = sourceFilter === 'all' || j.source === sourceFilter;
    const matchSearch = !search ||
      j.qcJobId?.toLowerCase().includes(search.toLowerCase()) ||
      j.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      j.sourceRefId?.toLowerCase().includes(search.toLowerCase()) ||
      j.inspector?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSource && matchSearch;
  });

  const counts = statuses.reduce((acc, s) => {
    acc[s] = s === 'all' ? jobs.length : jobs.filter(j => j.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QC Jobs</h1>
          <p className="text-slate-500 text-sm mt-0.5">All quality control inspection jobs</p>
        </div>
        <Link href="/qc/inward">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New QC Entry
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input
          placeholder="Search Job ID, item, order ref, inspector..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All' : s} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {sources.map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sourceFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All Sources' : s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {jobsLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No QC jobs found</p>
          <p className="text-slate-400 text-sm mt-1">Create a new QC entry to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const SrcIcon = sourceIcon[job.source] || Package;
            const StatusIcon = statusIcon[job.status] || Clock;
            const total = job.checklist?.length || 0;
            const done = job.checklist?.filter(c => c.status !== 'Pending').length || 0;
            return (
              <Link key={job._id} href={`/qc/jobs/${job._id}`}>
                <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-2.5 rounded-lg flex-shrink-0">
                        <SrcIcon className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800">{job.qcJobId}</p>
                          <span className="text-slate-300">·</span>
                          <p className="text-slate-700 truncate">{job.itemName}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-500">
                          <span>{job.source}</span>
                          <span>·</span>
                          <span>{job.category}</span>
                          {job.sourceRefId && <><span>·</span><span>{job.sourceRefId}</span></>}
                          {job.inspector && <><span>·</span><span>Inspector: {job.inspector}</span></>}
                          <span>·</span>
                          <span>{new Date(job.receivedDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {total > 0 && (
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400">Checklist</p>
                            <p className="text-sm font-semibold text-slate-700">{done}/{total}</p>
                          </div>
                        )}
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[job.status]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
