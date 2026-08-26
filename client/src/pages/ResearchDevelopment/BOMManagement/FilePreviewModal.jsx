import React from 'react';
import { X, Download } from 'lucide-react';

// In-page file preview overlay — mirrors the established pattern already
// used elsewhere in this app (hrmsTaskManagement/TaskDetailsDrawer.tsx,
// WorkShop.tsx): full-screen backdrop, <iframe> for PDF, <img> for images,
// a "Download to View" fallback for anything else. `url` must already be a
// fully-resolved URL (config.baseURL + the stored /uploads/... path) —
// callers build that, this component doesn't guess a base.
export default function FilePreviewModal({ url, name, onClose }) {
  if (!url) return null;
  const ext = (url.split('.').pop() || '').toLowerCase().split('?')[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <button onClick={onClose} className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-black/70">
        <X size={28} />
      </button>
      <div className="w-full h-full flex flex-col items-center justify-center max-w-5xl">
        {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? (
          <img src={url} alt={name || 'Preview'} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
        ) : ext === 'pdf' ? (
          <iframe src={url} className="w-full h-[85vh] bg-white rounded-xl shadow-2xl border-none" title={name || 'PDF preview'} />
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center">
            <h3 className="text-lg font-bold mb-4 text-slate-800">{name || 'File'}</h3>
            <p className="text-sm text-slate-500 mb-4">This file type can't be previewed in-page.</p>
            <a href={url} download className="bg-indigo-600 text-white px-6 py-3 rounded-xl inline-flex items-center justify-center gap-2 hover:bg-indigo-700">
              <Download size={18} /> Download to View
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
