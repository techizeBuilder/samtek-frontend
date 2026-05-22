/** @format */

import axios from "axios";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL;
const ViewAPI = API.replace("/api", "");

const UploadReceiptModal = ({ open, onClose, travel, onSuccess }: any) => {
  const token = localStorage.getItem("token");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("receiptUrl", file);

    setLoading(true);
    await axios.put(`${API}/travel-requests/${travel._id}/receipt`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {travel.receiptUrl ? "View / Update Receipt" : "Upload Receipt"}
        </h3>

        {travel.receiptUrl && (
          <a
            href={`${ViewAPI}${travel.receiptUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm underline mb-4 inline-block"
          >
            View Receipt
          </a>
        )}

        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border rounded p-2 text-sm"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded text-sm"
          >
            {loading ? "Uploading..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadReceiptModal;
