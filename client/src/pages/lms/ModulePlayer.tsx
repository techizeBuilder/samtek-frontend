import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'wouter'; 
import { useModuleLearningView, useMarkContentCompleted } from '../../hooks/useTraining';

const getFullMediaUrl = (filePath: string) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace('/api', '');
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  return `${baseUrl}/${cleanPath}`;
};

export default function ModulePlayer() {
  const params = useParams();
  const moduleId = params?.moduleId || '';
  const [, setLocation] = useLocation();
  
  const { data: response, isLoading, isError, error } = useModuleLearningView(moduleId);
  const { mutate: markCompleted } = useMarkContentCompleted();

  const moduleData = response?.module;
  const progressData = response?.progress;
  const contents = moduleData?.contents || [];
  const completedContentIds = progressData?.completedContents || [];
  const isTestUnlocked = progressData?.isTestUnlocked || false;

  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Once the required watch time is reached, the video keeps playing (it's
  // usually longer than the minimum) with nothing pushing the trainee
  // forward — this flips true so a "Skip" button can appear instead of
  // making them manually drag the scrubber to the end.
  const [canSkipVideo, setCanSkipVideo] = useState(false);

  useEffect(() => {
    if (contents.length > 0 && !activeContentId) {
      const firstPending = contents.find((c: any) => !completedContentIds.includes(c._id));
      setActiveContentId(firstPending ? firstPending._id : contents[0]._id);
    }
  }, [contents, completedContentIds, activeContentId]);

  // Reset the skip flag whenever the active item changes — a fresh video
  // must satisfy its own minWatchTime before it can be skipped.
  useEffect(() => {
    setCanSkipVideo(false);
  }, [activeContentId]);

  const activeContent = contents.find((c: any) => c._id === activeContentId);

  const handleContentComplete = (contentId: string) => {
    if (!completedContentIds.includes(contentId) && moduleId) {
      markCompleted({ moduleId, contentId });
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !activeContent) return;
    const currentTime = videoRef.current.currentTime;
    const requiredTime = activeContent.minWatchTime || 0;

    if (currentTime >= requiredTime && requiredTime > 0) {
      handleContentComplete(activeContent._id);
      if (!canSkipVideo) setCanSkipVideo(true);
    }
  };

  const handleVideoEnded = () => {
    if (activeContent) handleContentComplete(activeContent._id);
  };

  // Moves to the next playlist item (or just stops here if this was the
  // last one) — the trainee has already satisfied the watch requirement,
  // so there's nothing left to gate on.
  const handleSkipVideo = () => {
    if (!activeContent) return;
    handleContentComplete(activeContent._id);
    if (videoRef.current) videoRef.current.pause();
    const idx = contents.findIndex((c: any) => c._id === activeContent._id);
    const next = contents[idx + 1];
    if (next) setActiveContentId(next._id);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Classroom...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.message || axiosError?.message || "Unknown network error occurred.";
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-8 rounded-xl max-w-lg text-center shadow-sm w-full">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Failed to load module</h2>
          
          <div className="bg-white p-4 rounded-lg border border-red-100 mt-4 text-left">
            <p className="text-sm text-gray-500 mb-1">Server Reason:</p>
            <p className="text-red-600 font-mono text-sm break-words font-bold">{errorMsg}</p>
          </div>

          <button 
            onClick={() => setLocation('/lms/training')} // 🔥 UPDATED
            className="mt-6 font-bold text-red-700 hover:text-red-800 hover:underline flex items-center justify-center w-full gap-2"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return <div className="p-10 text-center text-gray-500">No module data was returned from the server.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <button onClick={() => setLocation('/lms/training')} // 🔥 UPDATED
            className="text-blue-600 hover:underline text-sm font-medium mb-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900">{moduleData.title}</h1>
        </div>
        
        <div>
          {isTestUnlocked ? (
            <button 
              onClick={() => setLocation(`/lms/my-training/${moduleId}/quiz`)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors animate-bounce"
            >
              Proceed to Assessment →
            </button>
          ) : (
            <div className="relative group">
              <button disabled className="bg-gray-200 text-gray-400 font-bold py-2 px-6 rounded-lg cursor-not-allowed">
                Assessment Locked 🔒
              </button>
              <div className="absolute top-full mt-2 right-0 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                You must complete all materials in the playlist to unlock the final test.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full p-4 gap-6">
        
        <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-lg flex flex-col relative min-h-[500px]">
          {activeContent ? (
            <>
              {activeContent.contentType === 'Video' ? (
                <video 
                  ref={videoRef}
                  key={getFullMediaUrl(activeContent.mediaUrl)} 
                  controls
                  controlsList="nodownload" 
                  className="w-full h-full object-contain bg-black"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                >
                  <source src={getFullMediaUrl(activeContent.mediaUrl)} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : activeContent.contentType === 'PDF' ? (
                <div className="w-full h-full flex flex-col bg-gray-100">
                  <iframe 
                    src={`${getFullMediaUrl(activeContent.mediaUrl)}#toolbar=0`} 
                    className="w-full flex-1 border-none"
                    title="PDF Viewer"
                  />
                  {!completedContentIds.includes(activeContent._id) && (
                     <div className="bg-white p-4 text-center border-t border-gray-200 shrink-0">
                       <p className="text-sm text-gray-600 mb-2">Please read the document carefully.</p>
                       <button 
                         onClick={() => handleContentComplete(activeContent._id)}
                         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                       >
                         Mark as Read
                       </button>
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white">Unsupported Media Type</div>
              )}
              
              {completedContentIds.includes(activeContent._id) && (
                <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm flex items-center gap-1">
                  <span>✓</span> Completed
                </div>
              )}

              {activeContent.contentType === 'Video' &&
                (canSkipVideo || (activeContent.minWatchTime || 0) === 0 || completedContentIds.includes(activeContent._id)) && (
                <button
                  onClick={handleSkipVideo}
                  className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  Skip {contents[contents.findIndex((c: any) => c._id === activeContent._id) + 1] ? 'to Next' : ''} <span>⏭</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <span className="text-4xl mb-4">📺</span>
              <p>Select an item from the playlist to begin learning.</p>
            </div>
          )}
        </div>

        <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Course Playlist</h3>
            <p className="text-xs text-gray-500 mt-1">
              {completedContentIds.length} of {contents.length} completed
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {contents.map((item: any, index: number) => {
              const isComplete = completedContentIds.includes(item._id);
              const isActive = activeContentId === item._id;
              
              return (
                <button
                  key={item._id}
                  onClick={() => setActiveContentId(item._id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    isActive 
                      ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isComplete ? '✓' : (item.contentType === 'Video' ? '▶' : '📄')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                      {index + 1}. {item.contentType} Material
                    </p>
                    {item.contentType === 'Video' && item.minWatchTime > 0 && !isComplete && (
                      <p className="text-xs text-gray-400">Min watch: {formatTime(item.minWatchTime)}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}