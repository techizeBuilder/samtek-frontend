import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Eye, Download, CheckCircle2 } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { KIND_LABEL, StageChips, BlockersPanel } from './approvalShared';
import PrototypePanel from './PrototypePanel';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const fileExt = (url) => (url || '').split('.').pop()?.toLowerCase().split('?')[0] || '';

function Stage({ step, title, hint, children }) {
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{step}</span>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Everything R&D does to ONE item, in pipeline order: Design -> BOM -> QC
// List -> (Machine only) Prototype -> Release. A Purchase Machine shows only
// QC List and Release. Server refusals ("approve these first") come back with
// a `blockers` list, shown at the top.
export default function ApprovalManageDialog({ itemId, open, onClose }) {
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('rnd', 'designApproval', 'edit');
  const [busy, setBusy] = useState(false);
  const [blockers, setBlockers] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['approval-item', itemId],
    queryFn: () => apiRequest('GET', `/api/rd/approval/items/${itemId}`),
    enabled: open && !!itemId,
  });
  const item = data?.data;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['approval-item', itemId] });
    qc.invalidateQueries({ queryKey: ['approval-items'] });
    qc.invalidateQueries({ queryKey: ['rd-machines'] });
  };

  const run = async (path, body, success) => {
    setBusy(true);
    setBlockers([]);
    try {
      await apiRequest('PUT', `/api/rd/approval/items/${itemId}/${path}`, body);
      if (success) showSuccessToast(success, `${item?.code} — ${item?.name}`);
      refresh();
    } catch (e) {
      setBlockers(e?.responseData?.blockers || []);
      showSmartToast(e, 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setBlockers([]); onClose(); };
  const purchase = item?.purchaseMachine;
  const isMachine = item?.productKind === 'Machine';
  const release = item?.releaseReadiness;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {item ? `${item.code} — ${item.name}` : 'Loading...'}
              {item && <span className="ml-2 text-xs font-normal text-slate-500">{KIND_LABEL[item.productKind]}{purchase ? ' · Purchase Machine' : ''}</span>}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !item ? (
            <p className="py-10 text-center text-slate-400">Loading...</p>
          ) : (
            <div className="space-y-3 py-1">
              <StageChips item={item} />
              <BlockersPanel blockers={blockers} />

              {purchase && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                  Purchase Machine — only the <strong>QC List</strong> needs approval before release. Design, BOM and Prototype don't apply.
                </div>
              )}

              {!purchase && (
                <Stage step={1} title="Design" hint="Includes every part underneath — a parent can't be approved until its parts are.">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-700">{item.designStatus === 'Approved' ? 'Design approved' : 'Not approved yet'}</span>
                    {canEdit && (
                      item.designStatus === 'Approved'
                        ? <Button size="sm" variant="outline" disabled={busy} onClick={() => run('design', { approved: false }, 'Design approval revoked')}>Revoke</Button>
                        : <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => run('design', { approved: true }, 'Design approved')}>Approve Design</Button>
                    )}
                  </div>
                  {item.designReadiness && !item.designReadiness.ok && (
                    <BlockersPanel
                      title={item.designStatus === 'Approved' ? 'A part underneath is no longer design-approved' : 'Approve these first — not design-approved underneath'}
                      blockers={item.designReadiness.blockers.filter(b => b._id !== item._id)}
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Design files</p>
                    {item.designFiles?.length ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {item.designFiles.map(f => (
                          <div key={f._id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-md">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm text-slate-700 truncate">{f.name}</span>
                              {f.source === 'BOM Part' ? <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">BOM Part</span> : f.version && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{f.version}</span>}
                            </div>
                            {f.fileUrl && <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => setPreviewFile(f)}><Eye className="h-3.5 w-3.5" /></Button>}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400 italic">No design files attached.</p>}
                  </div>
                </Stage>
              )}

              {!purchase && (
                <Stage step={2} title="BOM Approved" hint="Separate from 'Lock BOM' in BOM Management — locking freezes edits, approving is R&D's sign-off on the BOM.">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700">{item.bomApproved ? 'BOM approved' : 'Not approved yet'}</span>
                    {canEdit && (
                      item.bomApproved
                        ? <Button size="sm" variant="outline" disabled={busy} onClick={() => run('bom', { approved: false }, 'BOM approval revoked')}>Revoke</Button>
                        : <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => run('bom', { approved: true }, 'BOM approved')}>Approve BOM</Button>
                    )}
                  </div>
                </Stage>
              )}

              <Stage step={purchase ? 1 : 3} title="QC List Approved" hint="R&D's sign-off on the QC checklist configured for this item. Editing the checklist afterwards resets this.">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-700">{item.qcListApproved ? 'QC list approved' : 'Not approved yet'}</span>
                  {canEdit && (
                    item.qcListApproved
                      ? <Button size="sm" variant="outline" disabled={busy} onClick={() => run('qc', { approved: false }, 'QC List approval revoked')}>Revoke</Button>
                      : <Button size="sm" disabled={busy || !item.qcReadiness?.ok} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => run('qc', { approved: true }, 'QC List approved')}>Approve QC List</Button>
                  )}
                </div>
                {!item.qcListApproved && item.qcReadiness && !item.qcReadiness.ok && (
                  <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5 list-disc list-inside">
                    {item.qcReadiness.problems.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </Stage>

              {isMachine && !purchase && (
                <Stage step={4} title="Prototype" hint="Performance, Output and Durability tests.">
                  <PrototypePanel machine={item} onChanged={refresh} />
                </Stage>
              )}

              <Stage step={purchase ? 2 : isMachine ? 5 : 4} title="Release" hint={isMachine ? 'Releasing makes this machine sellable and lets its automatic orders run.' : "Releasing lets this part's automatic orders (low-stock reorder and parent cascades) run, and lets it count as released inside a parent."}>
                {item.releaseStatus === 'Released' ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-semibold"><CheckCircle2 className="h-4 w-4" /> Released</span>
                    {canEdit && <Button size="sm" variant="outline" disabled={busy} onClick={() => run('release', { status: 'Not Released' }, 'Release withdrawn')}>Pull back</Button>}
                  </div>
                ) : (
                  <>
                    {release && !release.ready && (
                      <ul className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-0.5 list-disc list-inside">
                        {release.missing.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    )}
                    {release?.blockers?.length > 0 && <BlockersPanel title="Parts that need attention first" blockers={release.blockers} />}
                    {canEdit && (
                      <Button size="sm" disabled={busy || !release?.ready} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => run('release', { status: 'Released' }, 'Released')}>
                        Release
                      </Button>
                    )}
                  </>
                )}
              </Stage>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={close}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
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
                    <a href={previewFile.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5 mr-1.5" /> Open File</a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPreviewFile(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
