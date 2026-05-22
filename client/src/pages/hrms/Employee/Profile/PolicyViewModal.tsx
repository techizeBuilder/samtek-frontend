/** @format */

import { X, Download, CheckCircle } from "lucide-react";

interface Props {
  policy: any;
  onClose: () => void;
}

export default function PolicyViewModal({ policy, onClose }: Props) {
  if (!policy) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-hidden animate-fadeIn">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{policy.title}</h2>
            <p className="text-sm text-gray-500">
              Last updated: {policy.updatedAt}
            </p>
          </div>
          <button onClick={onClose}>
            <X className="text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">{policy.description}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            📄 This policy document is applicable to all employees of the
            organization. Please read carefully.
          </div>

          {policy.mandatory && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <CheckCircle size={16} />
              Mandatory Policy
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <a
            href={policy.pdfUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download size={16} />
            Download PDF
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
