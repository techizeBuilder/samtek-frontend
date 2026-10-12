import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Upload } from 'lucide-react';
import { DOC_TYPES, fileHref, expiryBadge } from './vendorUi';

// A vendor's compliance documents (Vendor Master v2, procurement-v2). Sits
// INSIDE Vendor Master's uncontrolled <form>, so none of these inputs carry a
// `name` (they'd leak into the vendor's own FormData) and every button is
// type="button". Uploads/deletes save immediately on their own endpoint and
// hand the updated vendor back through onChange.
export default function VendorDocumentsSection({ vendor, readOnly, onChange }) {
  const { toast } = useToast();
  const [docType, setDocType] = useState('PAN Card');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const documents = vendor?.documents || [];

  const upload = async () => {
    if (!file) {
      toast({ title: 'Choose a file first', variant: 'destructive' });
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docType);
    fd.append('docNumber', docNumber);
    if (expiryDate) fd.append('expiryDate', expiryDate);
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/suppliers/${vendor._id}/documents`, fd);
      onChange?.(res.supplier);
      setDocNumber('');
      setExpiryDate('');
      setFile(null);
      setFileKey(k => k + 1);
      toast({ title: 'Document uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Remove "${doc.docType}"? The file is deleted permanently.`)) return;
    setBusy(true);
    try {
      const res = await apiRequest('DELETE', `/api/suppliers/${vendor._id}/documents/${doc._id}`);
      onChange?.(res.supplier);
    } catch (err) {
      toast({ title: 'Could not remove', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">
        Needed for approval: <b>PAN Card</b>, <b>Cancelled Cheque / Bank Proof</b>, and a <b>GST Certificate</b> if a GSTIN is entered.
        Add an expiry date where the document has one (valid through that date); Purchase and the Company Admin are reminded 30 days before.
      </p>
      <p className="text-[11px] text-slate-400 mb-2">
        Each upload or removal is saved straight away — closing or cancelling the vendor form doesn't undo it, and a removed file is deleted from the server.
      </p>
      <div className="border rounded-md divide-y mb-3">
        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">No documents uploaded yet.</p>
        ) : documents.map(doc => {
          const badge = doc.expiryDate ? expiryBadge(doc.expiryDate) : null;
          return (
            <div key={doc._id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <a href={fileHref(doc.fileUrl)} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                  {doc.docType}
                </a>
                <span className="text-xs text-slate-400 ml-2">{doc.docNumber || ''}</span>
                <span className="block text-[11px] text-slate-400 truncate">{doc.fileName}</span>
              </div>
              {badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}>{badge.text}</span>
              )}
              {!readOnly && (
                <button type="button" onClick={() => remove(doc)} disabled={busy} className="text-slate-400 hover:text-red-600 shrink-0" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="grid grid-cols-2 gap-2 items-end border rounded-md p-3 bg-slate-50">
          <div>
            <label className="text-xs font-medium">Document type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border rounded-md p-2 text-sm bg-white">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Document number (optional)</label>
            <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} className="bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium">Expiry date (if any)</label>
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium">File (PDF, image, Word — max 20 MB)</label>
            <Input key={fileKey} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={e => setFile(e.target.files?.[0] || null)} className="bg-white" />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button type="button" size="sm" onClick={upload} disabled={busy || !file}>
              <Upload className="w-4 h-4 mr-1.5" />{busy ? 'Uploading...' : 'Upload document'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
