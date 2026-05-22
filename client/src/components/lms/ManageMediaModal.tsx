import React, { useState } from 'react';
import { useAddMediaToModule, useRemoveMediaFromModule } from '../../hooks/useTraining';

interface ManageMediaModalProps {
  module: any | null;
  onClose: () => void;
}

export default function ManageMediaModal({ module, onClose }: ManageMediaModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [watchTimes, setWatchTimes] = useState<number[]>([]);

  const { mutate: addMedia, isPending: isAdding } = useAddMediaToModule();
  const { mutate: removeMedia, isPending: isRemoving } = useRemoveMediaFromModule();

  // Helper function to create a clickable link to your backend's static folder
  const getFileUrl = (filePath: string) => {
    // Grabs "http://localhost:5000/api" and removes the "/api" to get the root server URL
    const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace('/api', '');
    // Ensure the filePath doesn't start with a slash so it joins cleanly
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return `${baseUrl}/${cleanPath}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setWatchTimes(filesArray.map(() => 0));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!module || selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('minWatchTimes', JSON.stringify(watchTimes));
    selectedFiles.forEach((file) => formData.append('files', file));

    addMedia({ moduleId: module._id, formData }, {
      onSuccess: () => {
        setSelectedFiles([]);
        setWatchTimes([]);
        onClose(); // FIX: Close the modal so the parent state refreshes cleanly
      }
    });
  };

  const handleDelete = (contentId: string) => {
    if (!module) return;
    if (window.confirm("Are you sure you want to permanently delete this file? It will be removed from server storage.")) {
      removeMedia({ moduleId: module._id, contentId }, {
        onSuccess: () => {
          onClose(); // FIX: Close the modal after deletion so the list updates
        }
      });
    }
  };

  if (!module) return null;
  const isBusy = isAdding || isRemoving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={!isBusy ? onClose : undefined}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Media Files</h2>
            <p className="text-sm text-gray-500">{module.title}</p>
          </div>
          <button onClick={onClose} disabled={isBusy} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* List Existing Media */}
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Current Files</h3>
          <div className="space-y-2 mb-8">
            {module.contents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No media files attached to this module.</p>
            ) : (
              module.contents.map((content: any) => (
                <div key={content._id} className="flex justify-between items-center p-3 border rounded bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    
                    {/* FIX: Made this an actual clickable anchor tag that opens in a new tab */}
                    <a 
                      href={getFileUrl(content.mediaUrl)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs" 
                      title="Click to view file"
                    >
                      {content.mediaUrl.split('/').pop()}
                    </a>

                    <span className="text-xs text-gray-500 mt-0.5">
                      {content.contentType} • Min Watch: {content.minWatchTime}s
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDelete(content._id)}
                    disabled={isBusy}
                    className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {isRemoving ? 'Deleting...' : 'Delete File'}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Media Form */}
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider pt-4 border-t">Upload New Files</h3>
          <form onSubmit={handleAddSubmit} className="bg-gray-50 p-4 rounded border">
            <input type="file" multiple accept=".pdf,.ppt,.pptx,.mp4,.mov,.mkv,.avi,.webm" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="truncate w-2/3">{file.name}</span>
                    <input 
                      type="number" min="0" placeholder="Seconds" 
                      value={watchTimes[idx]} 
                      onChange={(e) => {
                        const newTimes = [...watchTimes];
                        newTimes[idx] = parseInt(e.target.value) || 0;
                        setWatchTimes(newTimes);
                      }}
                      className="w-24 rounded border-gray-300 shadow-sm p-1 border text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="pt-3 flex justify-end">
                  <button type="submit" disabled={isBusy} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                    {isAdding ? 'Uploading...' : 'Upload & Attach'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}