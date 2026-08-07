import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useStartTest, useSubmitTest, useModuleTestInfo } from '../../hooks/useTraining';

export default function QuizRunner() {
  const params = useParams();
  const moduleId = params?.moduleId || '';
  const [, setLocation] = useLocation();

  // --- 1. API WIRING ---
  const { mutate: startTest, data: testData, isPending: isStarting, isError: isStartError, error: startErrorObj } = useStartTest();
  const { mutate: submitTest, isPending: isSubmitting } = useSubmitTest();
  // Just for the "Ready to begin?" text below — start-test hasn't been
  // called yet at that point, so there's no testData.durationSeconds yet.
  const { data: testInfo } = useModuleTestInfo(moduleId);
  const preStartDurationMinutes = testInfo?.testDurationMinutes || 20;

  const questions = testData?.questions || [];
  const testAttemptId = testData?.testAttemptId;
  const attemptNumber = testData?.attemptNumber;
  const isTestActive = !!testData && questions.length > 0;
  // Set per-module by whoever authored it (Create/Edit Module Info), sent
  // back from start-test — falls back to the old fixed 20 minutes for safety.
  const durationSeconds = testData?.durationSeconds || 1200;

  // --- 2. QUIZ & SUBMISSION STATE ---
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [warnings, setWarnings] = useState<number>(0);

  // 🔥 NEW: State to hold the backend response for the Review Screen
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const MAX_WARNINGS = 3;

  // --- 3. THE TIMER ---
  useEffect(() => {
    // Stop the timer if the test is submitted
    if (submissionResult) return; 

    if (isTestActive && timeLeft === 0 && !answersMap['timer_started']) {
      setTimeLeft(durationSeconds);
      setAnswersMap(prev => ({ ...prev, timer_started: 'true' }));
    }

    if (!isTestActive || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleForceSubmit("⏱️ Time's up! Your exam has been auto-submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isTestActive, timeLeft, answersMap, submissionResult, durationSeconds]);

  // --- 4. FORMAT SUBMISSION PAYLOAD ---
  const formatAnswersForBackend = () => {
    return Object.entries(answersMap)
      .filter(([key]) => key !== 'timer_started') 
      .map(([qId, oId]) => ({
        questionId: qId,
        selectedOption: oId
      }));
  };

  // --- 5. ANTI-CHEAT MECHANISMS ---
  const handleForceSubmit = useCallback((reason: string) => {
    if (!testAttemptId) return;

    submitTest({ testAttemptId, answers: formatAnswersForBackend() }, {
      onSuccess: (data: any) => {
        const response = data?.data || data;
        setSubmissionResult(response);
        alert(reason); // Notify them why it was force submitted
      },
      onError: () => setLocation('/lms/training')
    });
  }, [answersMap, testAttemptId, submitTest, setLocation]);

  useEffect(() => {
    // Disable anti-cheat if the test isn't active or if it's already submitted
    if (!isTestActive || submissionResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => {
          const newWarnings = prev + 1;
          if (newWarnings >= MAX_WARNINGS) {
            handleForceSubmit("You have switched tabs too many times. Your exam has been terminated and auto-submitted.");
          } else {
            alert(`WARNING (${newWarnings}/${MAX_WARNINGS}): Please do not leave the exam window. Doing so again will terminate your test.`);
          }
          return newWarnings;
        });
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "If you close this page, your attempt will be lost and counted as a failure.";
      return e.returnValue;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTestActive, handleForceSubmit, submissionResult]);

  // --- 6. USER ACTIONS ---
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswersMap(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleManualSubmit = () => {
    if (!testAttemptId) return; 
    
    const unanswered = questions.length - (Object.keys(answersMap).length - 1); 
    
    if (unanswered > 0) {
      if (!window.confirm(`You still have ${unanswered} unanswered questions. Are you sure you want to submit?`)) return;
    } else {
      if (!window.confirm("Are you ready to submit your exam?")) return;
    }

    submitTest({ testAttemptId, answers: formatAnswersForBackend() }, {
      onSuccess: (data: any) => {
        const response = data?.data || data; 
        // 🔥 THE FIX: Instead of alerting and leaving, we set the result to trigger Render 3!
        setSubmissionResult(response);
      },
      onError: (err: any) => {
        const errorMsg = err?.response?.data?.message || err.message || "Failed to submit.";
        alert(`Server Error: ${errorMsg}\n\nRedirecting you back to the dashboard...`);
        setLocation('/lms/training');
      }
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // RENDER 3: THE REVIEW SCREEN (Shows after submission)
  // ==========================================
  if (submissionResult) {
    const { isPassed, scorePercentage, timeTakenFormatted, reviewData } = submissionResult;
    const correctCount = reviewData?.filter((r: any) => r.isCorrect).length || 0;
    const totalCount = reviewData?.length || 0;

    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          
          {/* Summary Header */}
          <div className={`p-8 rounded-xl shadow-sm border mb-6 text-center ${isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h1 className={`text-4xl font-black mb-2 ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
              {isPassed ? '🎉 Assessment Passed!' : '❌ Assessment Failed'}
            </h1>
            <p className="text-gray-600 mb-6 font-medium">
              {isPassed 
                ? 'Congratulations! You have successfully completed this module.' 
                : 'You did not meet the 80% passing requirement.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white px-6 py-4 rounded-lg shadow-sm border font-bold">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Score</div>
                <div className={`text-2xl ${isPassed ? 'text-green-600' : 'text-red-600'}`}>{scorePercentage}%</div>
              </div>
              <div className="bg-white px-6 py-4 rounded-lg shadow-sm border font-bold">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Result</div>
                <div className="text-2xl text-gray-800">{correctCount} / {totalCount} Correct</div>
              </div>
              <div className="bg-white px-6 py-4 rounded-lg shadow-sm border font-bold">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time Taken</div>
                <div className="text-2xl text-gray-800">{timeTakenFormatted || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Detailed Review</h2>
            <button 
              onClick={() => setLocation('/lms/training')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>

          {/* Granular Question Review List */}
          <div className="space-y-4">
            {reviewData?.map((item: any, index: number) => (
              <div key={index} className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${item.isCorrect ? 'border-l-green-500 border-gray-200' : 'border-l-red-500 border-gray-200'}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex gap-3">
                  <span className={`shrink-0 ${item.isCorrect ? 'text-green-600' : 'text-red-600'}`}>Q{index + 1}.</span>
                  <span className="min-w-0 break-words">{item.questionText}</span>
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border ${item.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <span className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-70">
                      {item.isCorrect ? 'Your Correct Answer' : 'Your Incorrect Answer'}
                    </span>
                    <span className="font-medium break-words">{item.selectedAnswerText}</span>
                  </div>

                  {!item.isCorrect && (
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <span className="text-xs font-bold uppercase text-blue-800 tracking-wider block mb-1">
                        Correct Answer
                      </span>
                      <span className="font-medium text-blue-900 break-words">{item.correctAnswerText}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 1: THE ENTRY SCREEN
  // ==========================================
  if (!isTestActive) {
    const serverErrorMessage = (startErrorObj as any)?.response?.data?.message || "Cannot start test. You may have reached your maximum attempts or the test is locked.";

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-gray-200 p-10 rounded-xl max-w-lg text-center shadow-sm w-full">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Ready to begin?</h2>
          <p className="text-gray-600 mb-6">
            You will have <span className="font-bold text-gray-900">{preStartDurationMinutes} minute{preStartDurationMinutes === 1 ? '' : 's'}</span> to complete this assessment. Do not close or switch tabs once you start.
          </p>
          
          {isStartError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium mb-6 border border-red-100 text-left">
              <span className="font-bold text-red-800 block mb-1">❌ Test Unavailable:</span>
              {serverErrorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => startTest(moduleId)}
              disabled={isStarting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {isStarting ? 'Setting up Exam...' : 'Start Assessment Now'}
            </button>
            <button 
              onClick={() => setLocation('/lms/training')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition-colors"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: THE SECURE EXAM ROOM
  // ==========================================
  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()} 
      onCopy={(e) => e.preventDefault()}        
      onPaste={(e) => e.preventDefault()}       
    >
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Module Assessment</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-red-500 font-bold tracking-wide uppercase">
              🔒 Secure Mode Active
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">
              Attempt {attemptNumber} of 2
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {warnings > 0 && (
            <div className="text-red-600 font-bold text-sm bg-red-50 px-3 py-1 rounded border border-red-200 animate-pulse">
              Warnings: {warnings}/{MAX_WARNINGS}
            </div>
          )}
          
          <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-lg border ${timeLeft < 300 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          
          <button 
            onClick={handleManualSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Grading...' : 'Finish & Submit'}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-6 pb-24 mt-4">
        <div className="space-y-6">
          {questions.map((q: any, index: number) => (
            <div key={q._id} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex gap-3">
                <span className="text-blue-600 shrink-0">{index + 1}.</span>
                <span className="min-w-0 break-words">{q.questionText}</span>
              </h3>

              <div className="space-y-3">
                {q.options.map((option: any) => {
                  const isSelected = answersMap[q._id] === option._id;
                  return (
                    <label
                      key={option._id}
                      className={`flex items-start p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${q._id}`}
                        value={option._id}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(q._id, option._id)}
                        className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      <span className={`ml-3 text-sm min-w-0 break-words ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                        {option.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}