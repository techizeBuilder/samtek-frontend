import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRD } from '@/contexts/RDContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Trash2, Download, Eye, ChevronDown, Package, Upload, FolderOpen, Puzzle } from 'lucide-react';

const DOC_TYPES = ['Design Files', 'BOM', 'Process Sheet', 'QC Checklist', 'User Manual', 'Test Report', 'Other'];

const typeConfig = {
  'Design Files': { color: 'bg-blue-100 text-blue-700', icon: FileText },
  'BOM': { color: 'bg-purple-100 text-purple-700', icon: FileText },
  'Process Sheet': { color: 'bg-orange-100 text-orange-700', icon: FileText },
  'QC Checklist': { color: 'bg-teal-100 text-teal-700', icon: FileText },
  'User Manual': { color: 'bg-emerald-100 text-emerald-700', icon: FileText },
  'Test Report': { color: 'bg-amber-100 text-amber-700', icon: FileText },
  'Other': { color: 'bg-slate-100 text-slate-700', icon: FileText },
};

const emptyForm = { type: 'Design Files', name: '', version: 'v1.0', notes: '' };

export default function Documentation() {
  const { machines, getDocumentsForMachine, addDocument, deleteDocument } = useRD();
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const activeMachines = machines.filter(m => !m.isDiscontinued);
  const selectedMachine = activeMachines.find(m => String(m._id) === selectedMachineId);

  // Child Part documents/images (uploaded from BOM Management → Child Part
  // Creation) aren't stored as RDDocument rows — they're pulled in live here
  // and shown under Design Files, tagged with the child part's name, so
  // there's no duplicate copy to keep in sync.
  const { data: childPartsResp } = useQuery({
    queryKey: ['rd-child-parts-for-docs', selectedMachineId],
    queryFn: () => apiRequest('GET', `/api/rd/child-parts?productId=${selectedMachineId}`),
    enabled: !!selectedMachineId,
    retry: false,
  });
  const childPartDocs = (childPartsResp?.data || [])
    .filter(cp => cp.image)
    .map(cp => {
      const ext = (cp.image.split('.').pop() || '').toUpperCase();
      return {
        _id: `child-part-${cp._id}`,
        name: `${cp.name} (${cp.code})`,
        type: 'Design Files',
        size: '',
        uploadedAt: (cp.updatedAt || cp.createdAt || '').split('T')[0],
        uploadedBy: 'Child Part Creation',
        fileUrl: cp.image,
        originalName: `${cp.name}.${ext.toLowerCase() || 'file'}`,
        isChildPartFile: true,
      };
    });

  const allDocs = selectedMachineId ? [...getDocumentsForMachine(selectedMachineId), ...childPartDocs] : [];
  const docs = filterType === 'All' ? allDocs : allDocs.filter(d => d.type === filterType);

  const typeCounts = DOC_TYPES.reduce((acc, t) => ({ ...acc, [t]: allDocs.filter(d => d.type === t).length }), {});

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!form.name) setForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }));
  };

  const handleUpload = () => {
    if (!selectedFile || !form.type) return;
    setUploading(true);
    addDocument({
      machineId: selectedMachineId,
      type: form.type,
      name: form.name || selectedFile.name,
      version: form.version,
      notes: form.notes,
      file: selectedFile,
    });
    setForm(emptyForm);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
    setUploadOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-blue-600" /> Documentation
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Each machine has attached documents — Production can access these directly from ERP</p>
      </div>

      {/* Machine Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Machine</label>
          <div className="relative max-w-sm">
            <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8" value={selectedMachineId} onChange={e => { setSelectedMachineId(e.target.value); setFilterType('All'); }}>
              <option value="">-- Select a machine --</option>
              {activeMachines.map(m => <option key={m._id} value={m._id}>{m.code} — {m.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedMachineId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a machine to view and manage its documentation</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Machine Info + Upload */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedMachine?.code}</span>
              <span className="font-semibold text-slate-800">{selectedMachine?.name}</span>
              <span className="text-xs text-slate-400">{allDocs.length} documents</span>
            </div>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Upload className="h-4 w-4 mr-2" /> Upload Document
            </Button>
          </div>

          {/* Document Type Summary Cards */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {DOC_TYPES.map(type => {
              const cfg = typeConfig[type];
              const count = typeCounts[type] || 0;
              return (
                <button key={type} onClick={() => setFilterType(filterType === type ? 'All' : type)} className={`p-3 rounded-xl border text-center transition-all ${filterType === type ? 'border-blue-400 shadow-md bg-blue-50' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}>
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${cfg.color}`}>{count}</div>
                  <p className="text-[11px] text-slate-600 leading-tight font-medium">{type}</p>
                </button>
              );
            })}
          </div>

          {/* Documents Table */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  {filterType === 'All' ? 'All Documents' : filterType}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
              </div>
              {filterType !== 'All' && (
                <Button size="sm" variant="outline" onClick={() => setFilterType('All')} className="text-xs">Show All</Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No {filterType !== 'All' ? filterType : ''} documents uploaded yet.</p>
                  <p className="text-xs mt-1">Click "Upload Document" to add files.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Name</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">By</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(doc => {
                        const cfg = typeConfig[doc.type] || typeConfig.Other;
                        const extSource = doc.fileUrl || doc.name;
                        const ext = (extSource.split('.').pop() || '').toUpperCase();
                        return (
                          <tr key={doc._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{ext}</span>
                                <span className="font-medium text-slate-900">{doc.name}</span>
                                {doc.isChildPartFile && (
                                  <span title="From BOM Management → Child Part Creation" className="inline-flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-semibold">
                                    <Puzzle className="h-3 w-3" /> Child Part
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>{doc.type}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">{doc.size}</td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">{doc.uploadedAt}</td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">{doc.uploadedBy}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1">
                                {doc.fileUrl ? (
                                  <>
                                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500 hover:text-blue-600 gap-1">
                                        <Eye className="h-3.5 w-3.5" /> View
                                      </Button>
                                    </a>
                                    <a href={doc.fileUrl} download={doc.originalName || doc.name}>
                                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600 gap-1">
                                        <Download className="h-3.5 w-3.5" /> Download
                                      </Button>
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-300 px-2">No file</span>
                                )}
                                {!doc.isChildPartFile && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setDeleteDoc(doc)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required Documents Checklist */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Required Documentation Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['Design Files', 'BOM', 'Process Sheet', 'QC Checklist', 'User Manual'].map(type => {
                  const hasDoc = allDocs.some(d => d.type === type);
                  return (
                    <div key={type} className={`rounded-lg p-3 border text-center ${hasDoc ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`text-lg font-bold ${hasDoc ? 'text-emerald-600' : 'text-red-500'}`}>{hasDoc ? '✓' : '✗'}</div>
                      <p className={`text-[11px] font-semibold ${hasDoc ? 'text-emerald-700' : 'text-red-600'}`}>{type}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setSelectedFile(null); setForm(emptyForm); if (fileInputRef.current) fileInputRef.current.value = ''; } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Document Type *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Select File *</label>
              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.dwg,.dxf" onChange={handleFileSelect} />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-6 w-6 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-blue-700">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500 font-medium">Click to browse or drop a file</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP, DWG — max 100 MB</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Document Name</label>
              <Input placeholder={`e.g. ${selectedMachine?.code || 'CM-001'}_Design_v1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <p className="text-[11px] text-slate-400 mt-0.5">Leave blank to use the filename</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Version</label>
              <Input placeholder="v1.0" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Document</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Remove <strong>{deleteDoc?.name}</strong> from the records?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { deleteDocument(deleteDoc._id); setDeleteDoc(null); }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
