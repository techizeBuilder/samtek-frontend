import React from 'react';
import { Eye, Download, X, FileText } from 'lucide-react';
import config from '@/config/environment';

function getFullFileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseURL}${clean}`;
}

/**
 * Reusable modal for viewing (new tab) + downloading a small set of named
 * documents (e.g. NOC / E-Way Bill / Invoice uploaded during dispatch delivery).
 * `documents` = [{ label: 'NOC', path: dispatch.deliveryDocs.noc }, ...]
 */
export default function DocumentViewerModal({ title = 'Documents', documents = [], onClose }) {
  const available = documents
    .filter(d => d.path)
    .map(d => ({ label: d.label, url: getFullFileUrl(d.path) }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 60px)' }}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-slate-800 truncate">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">View or download delivery documents</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 flex-shrink-0">
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {available.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {available.map(doc => (
                <div key={doc.label} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 truncate">{doc.label}</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      title="View in new tab"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <a
                      href={doc.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
