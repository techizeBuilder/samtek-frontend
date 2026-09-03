import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useRD } from '@/contexts/RDContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, FileText, Eye, Download } from 'lucide-react';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const fileExt = (url) => (url || '').split('.').pop()?.toLowerCase().split('?')[0] || '';

const STATUS_TABS = ['All', 'Draft', 'Testing', 'Approved', 'Rejected'];

const statusConfig = {
  Draft: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText, desc: 'Design created, not yet sent for testing' },
  Testing: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, desc: 'Under testing — pending R&D approval' },
  Approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, desc: 'Approved — production can proceed' },
  Rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, desc: 'Rejected — redesign required' },
};

export default function DesignApproval() {
  const { updateDesignStatus } = useRD();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('rnd', 'designApproval', 'edit');
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  // Which attached design file (if any) is open in the inline preview
  // popup — was previously a plain target="_blank" link that navigated
  // away to a whole new tab/page instead of showing it here (confirmed
  // 2026-09-03).
  const [previewFile, setPreviewFile] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  // Reset to page 1 whenever the tab/search changes so the user doesn't
  // land on a now-out-of-range page.
  useEffect(() => { setPage(1); }, [activeTab, search]);

  const { data: machinesResponse, isLoading: machinesLoading } = useQuery({
    queryKey: ['rd-machines', 'design-approval', { page, activeTab, search }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        forwardToNextPhase: 'true',
        discontinued: 'false',
        designStatus: activeTab,
        withStatusCounts: 'true',
      });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/rd/machines?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const filtered = machinesResponse?.data || [];
  const pagination = machinesResponse?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };
  const counts = machinesResponse?.statusCounts || { All: 0, Draft: 0, Testing: 0, Approved: 0, Rejected: 0 };

  const handleApprove = () => {
    updateDesignStatus(selected._id, 'Approved');
    setApproveOpen(false);
  };

  const handleReject = () => {
    if (!rejectNote.trim()) return;
    updateDesignStatus(selected._id, 'Rejected', rejectNote);
    setRejectNote('');
    setRejectOpen(false);
  };

  const handleSendToTest = () => {
    updateDesignStatus(selected._id, 'Testing');
    setSendTestOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-blue-600" /> Design Approval
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage design status workflow — only Approved designs can proceed to production</p>
      </div>

      {/* Workflow Banner */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {['Draft', 'Testing', 'Approved / Rejected'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <div className={`px-4 py-2 rounded-lg text-sm font-semibold border ${step === 'Draft' ? 'bg-slate-50 border-slate-200 text-slate-700' :
                  step === 'Testing' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>{step}</div>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
          <span className="text-xs text-slate-500 ml-2">→ Production gets access only after Approval</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Only products marked <strong>"Forward to Design &amp; Prototype"</strong> in Product Master appear here.
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search machines..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Machine Cards Grid */}
      {machinesLoading ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">Loading...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">No machines match the current filter.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const cfg = statusConfig[m.designStatus];
            const StatusIcon = cfg.icon;
            return (
              <Card key={m._id} className="border-none shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-semibold">{m.code}</p>
                      <h3 className="font-semibold text-slate-900 mt-0.5 leading-tight">{m.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{m.category}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />{m.designStatus}
                    </span>
                  </div>

                  {m.designStatus === 'Rejected' && m.rejectionNote && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
                      <p className="text-[11px] text-red-700 line-clamp-2">{m.rejectionNote}</p>
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    {/* NEW: File Count Badge */}
                    {m.designFiles?.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                        <FileText className="h-3 w-3" />
                        {m.designFiles.length} File{m.designFiles.length > 1 ? 's' : ''} Attached
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setSelected(m); setViewOpen(true); }}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      {m.designStatus === 'Draft' && canEdit && (
                        <Button size="sm" className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setSelected(m); setSendTestOpen(true); }}>
                          Send to Testing
                        </Button>
                      )}
                      {m.designStatus === 'Testing' && canEdit && (
                        <>
                          <Button size="sm" className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelected(m); setApproveOpen(true); }}>
                            Approve
                          </Button>
                          <Button size="sm" className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => { setSelected(m); setRejectOpen(true); }}>
                            Reject
                          </Button>
                        </>
                      )}
                      {m.designStatus === 'Rejected' && (
                        <Button size="sm" className="flex-1 text-xs bg-slate-600 hover:bg-slate-700 text-white" onClick={() => { setSelected(m); setSendTestOpen(true); }}>
                          Re-submit
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

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} machines)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected?.code} — {selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Design Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${statusConfig[selected.designStatus].color}`}>{selected.designStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Release</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selected.releaseStatus}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <p className="text-sm text-slate-800">{selected.category}</p>
              </div>

              {/* NEW: Attached Files Viewer */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Attached Design Files</p>
                {selected.designFiles && selected.designFiles.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selected.designFiles.map(file => (
                      <div key={file._id} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-md">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                          {file.source === 'BOM Part' ? (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">BOM Part</span>
                          ) : file.version && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{file.version}</span>
                          )}
                        </div>
                        {file.fileUrl && (
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No design files attached to this machine.</p>
                )}
              </div>

              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-800">{selected.description}</p>
                </div>
              )}
              {selected.rejectionNote && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-800">{selected.rejectionNote}</p>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                <strong>Workflow Guide:</strong> {statusConfig[selected.designStatus].desc}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Design File Preview — shows the file inline on this same page
          instead of navigating away to a new tab (confirmed 2026-09-03).
          Images/PDFs render directly; anything else (.dwg, .docx, .zip...)
          can't be shown in a browser, so it falls back to an explicit
          download link instead of a blank/broken preview. */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="truncate">{previewFile?.name}</DialogTitle></DialogHeader>
          {previewFile && (
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
              {IMAGE_EXTS.includes(fileExt(previewFile.fileUrl)) ? (
                <img src={previewFile.fileUrl} alt={previewFile.name} className="max-w-full max-h-[65vh] object-contain" />
              ) : fileExt(previewFile.fileUrl) === 'pdf' ? (
                <iframe src={previewFile.fileUrl} title={previewFile.name} className="w-full h-[65vh] border-0" />
              ) : (
                <div className="text-center py-10 px-6">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-3">This file type can't be previewed here.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewFile.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Open File
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPreviewFile(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Testing Dialog */}
      <Dialog open={sendTestOpen} onOpenChange={setSendTestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Send to Testing</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            This will move <strong>{selected?.name}</strong> from <strong>Draft</strong> to <strong>Testing</strong> status. The design will be reviewed by the R&D team before approval.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTestOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSendToTest}>Confirm — Send to Testing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-emerald-700">Approve Design</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              Approving <strong>{selected?.name}</strong> will allow production to access this design. Ensure all drawings and BOM are finalized before approving.
            </p>

            {/* NEW: File Checklist Summary */}
            {selected?.designFiles?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Files being approved:</p>
                <div className="space-y-1.5">
                  {selected.designFiles.map(f => (
                    <div key={f._id} className="text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                      {f.source === 'BOM Part' ? (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">BOM Part</span>
                      ) : f.version && <span className="text-slate-400">({f.version})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 mt-2">
              After approval, you can release this machine for production from the Production Release section.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove}>Approve Design</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-600">Reject Design</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Rejecting <strong>{selected?.name}</strong>. Please provide a detailed reason so the design team can make necessary corrections.</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Rejection Reason *</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" rows={4} placeholder="Describe specific issues that need to be addressed..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!rejectNote.trim()} onClick={handleReject}>Reject Design</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}