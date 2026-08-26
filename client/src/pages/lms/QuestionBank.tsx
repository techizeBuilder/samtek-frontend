import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useModules,
  useQuestions, 
  useAddQuestion, 
  useUpdateQuestion, 
  useDeleteQuestion
} from '../../hooks/useTraining'; // Adjust path if needed
import { usePermissions } from '../../hooks/usePermissions';

// --- TYPES ---
interface Option {
  label?: string;
  text: string;
  _id?: string;
}

interface Question {
  _id: string;
  questionText: string;
  options: Option[];
  correctOption: string; 
}

export default function QuestionBank() {
  // --- ROUTER HOOKS ---
  const { moduleId: urlModuleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { hasAnyModuleFeatureAccess } = usePermissions();
  const canAdd = hasAnyModuleFeatureAccess('lms', 'add');
  const canEdit = hasAnyModuleFeatureAccess('lms', 'edit');
  const canDelete = hasAnyModuleFeatureAccess('lms', 'delete');

  // --- STATE ---
  const [activeModuleId, setActiveModuleId] = useState<string | null>(urlModuleId || null);
  const [page, setPage] = useState(1); 
  
  // Department Filter State
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']); 
  const [correctOption, setCorrectOption] = useState<string>('A'); 

  // --- API HOOKS ---
  const { data: modulesResponse, isLoading: isLoadingModules } = useModules({ status: 'Active' });
  const modules = modulesResponse?.data || [];

  const { data: response, isLoading: isLoadingQuestions, isError } = useQuestions(activeModuleId || '', { 
    page, 
    limit: 10 
  });
  
  const { mutate: addQuestion, isPending: isAdding } = useAddQuestion();
  const { mutate: updateQuestion, isPending: isUpdating } = useUpdateQuestion();
  const { mutate: deleteQuestion, isPending: isDeleting } = useDeleteQuestion();

  const questions: Question[] = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalQuestions = response?.total || 0;

  // --- DERIVED DEPARTMENT & MODULE LISTS ---
  const departments = useMemo(() => {
    const deps = modules.map((m: any) => m.department || 'General');
    return Array.from(new Set(deps)).sort(); 
  }, [modules]);

  const filteredModules = useMemo(() => {
    if (departmentFilter === 'All') return modules;
    return modules.filter((m: any) => (m.department || 'General') === departmentFilter);
  }, [modules, departmentFilter]);

  // --- AUTO-SELECT LOGIC ---
  useEffect(() => {
    if (filteredModules.length > 0) {
      const activeExists = filteredModules.some((m: any) => m._id === activeModuleId);
      if (!activeExists) {
        setActiveModuleId(filteredModules[0]._id);
        setPage(1);
      }
    } else if (filteredModules.length === 0) {
        setActiveModuleId(null);
    }
  }, [filteredModules, activeModuleId]);

  useEffect(() => {
    if (urlModuleId) {
      setActiveModuleId(urlModuleId);
      setPage(1); 
      const targetModule = modules.find((m: any) => m._id === urlModuleId);
      if (targetModule) {
        setDepartmentFilter(targetModule.department || 'General');
      }
    }
  }, [urlModuleId, modules]);

  // --- HANDLERS ---
  const resetForm = () => {
    setEditingId(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectOption('A'); 
  };

  const handleTabSwitch = (id: string) => {
    setActiveModuleId(id);
    setPage(1); 
    resetForm();
  };

  const handleEditClick = (q: Question) => {
    setEditingId(q._id);
    setQuestionText(q.questionText);
    setOptions(q.options.map(opt => opt.text));
    setCorrectOption(String(q.correctOption)); 
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question?")) {
      deleteQuestion(id);
      if (editingId === id) resetForm();
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId) return;

    if (options.some(opt => opt.trim() === '')) {
      alert("Please fill out all 4 options.");
      return;
    }

    const formattedOptions = options.map((text, idx) => ({
      label: String.fromCharCode(65 + idx), 
      text: text.trim()
    }));

    const payload = {
      questionText: questionText.trim(),
      options: formattedOptions,
      correctOption 
    };

    if (editingId) {
      updateQuestion(
        { questionId: editingId, payload },
        { onSuccess: () => resetForm() }
      );
    } else {
      addQuestion(
        { moduleId: activeModuleId, payload },
        { onSuccess: () => resetForm() }
      );
    }
  };

  const isBusy = isAdding || isUpdating || isDeleting;

  if (!isLoadingModules && modules.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Training Modules Found</h2>
        <p className="text-gray-500 mb-4">You need to create a training module before you can add questions to it.</p>
        <button onClick={() => navigate('/hrms/lms/modules')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Go to Course Library
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          {urlModuleId && (
            <button 
              onClick={() => navigate('/hrms/lms/modules')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 transition-colors"
            >
              ← Back to Course Library
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Manage Question Bank</h1>
          <p className="text-sm text-gray-500">Select a module below to edit its mandatory quiz questions.</p>
        </div>
        
        {/* Total Questions Badge stays on the right */}
        <div className="bg-blue-50 text-blue-800 font-bold px-4 py-2 rounded-lg border border-blue-200">
          Total Questions: {totalQuestions}
        </div>
      </div>

      {/* --- DEPARTMENT FILTER & TABS --- */}
      <div className="mb-6 shrink-0 flex flex-col gap-3">
        
        {/* 🔥 THE FIX: Dropdown moved to the left, just above the tabs */}
        {departments.length > 1 && (
          <div className="w-64">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Filter by Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Departments</option>
              {departments.map((dept: any) => (
                <option key={dept} value={dept}>{dept} Department</option>
              ))}
            </select>
          </div>
        )}

        {/* Horizontal Scrollable Module Tabs */}
        <div className="border-b border-gray-200 pb-2 flex overflow-x-auto gap-2 items-center custom-scrollbar">
          {isLoadingModules ? (
            <span className="text-sm text-gray-500 italic px-2">Loading modules...</span>
          ) : filteredModules.length === 0 ? (
            <span className="text-sm text-gray-500 italic px-2">No modules found for this department.</span>
          ) : (
            filteredModules.map((mod: any) => (
              <button
                key={mod._id}
                onClick={() => handleTabSwitch(mod._id)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border border-b-0 ${
                  activeModuleId === mod._id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200'
                }`}
              >
                {mod.title}
              </button>
            ))
          )}
        </div>
      </div>

      {/* --- MAIN LAYOUT (Two Columns) --- */}
      {activeModuleId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* LEFT COLUMN: Question List & Pagination */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
              <span className="font-bold text-gray-700 uppercase tracking-wider text-xs">
                Current Question Bank
              </span>
              <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">
                {modules.find((m: any) => m._id === activeModuleId)?.title}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingQuestions && <p className="text-gray-500 animate-pulse">Loading questions...</p>}
              {isError && <p className="text-red-500">Failed to load questions.</p>}
              
              {!isLoadingQuestions && !isError && questions.length === 0 && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                  No questions exist for this module yet. Use the form to add your first!
                </div>
              )}

              {/* RENDER QUESTIONS */}
              {!isLoadingQuestions && questions.map((q, index) => (
                <div key={q._id} className={`border rounded-lg p-4 transition-colors shadow-sm ${editingId === q._id ? 'border-orange-400 bg-orange-50/30' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className="font-semibold text-gray-900 text-sm min-w-0 flex-1">
                      <span className="text-blue-600 mr-2">Q{(page - 1) * 10 + index + 1}.</span>
                      <span className="break-words">{q.questionText}</span>
                    </h3>
                    <div className="flex gap-2 shrink-0">
                      {canEdit && (
                        <button onClick={() => handleEditClick(q)} disabled={isBusy} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50">Edit</button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDeleteClick(q._id)} disabled={isBusy} className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50">Delete</button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, idx) => {
                      const optLabel = opt.label || String.fromCharCode(65 + idx);
                      const isCorrect = String(q.correctOption) === optLabel;

                      return (
                        <div
                          key={opt._id || idx}
                          className={`text-xs p-2.5 rounded-md border flex justify-between items-start gap-2 transition-colors ${
                            isCorrect
                              ? 'bg-green-50 border-green-400 font-semibold text-green-900'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          <div className="flex-1 min-w-0 break-words">
                            <span className={`mr-2 font-bold ${isCorrect ? 'text-green-700' : 'text-gray-400'}`}>
                              {optLabel}.
                            </span>
                            {opt.text}
                          </div>

                          {isCorrect && (
                            <span className="text-green-600 flex items-center shrink-0">
                               <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                               </svg>
                               Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>

            {/* PAGINATION CONTROLS */}
            {!isLoadingQuestions && totalPages > 1 && (
              <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: The Sticky Builder Form */}
          {(canAdd || canEdit) && (
          <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
            <div className={`p-4 border-b font-bold tracking-wider text-xs uppercase ${editingId ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-gray-50 text-gray-700'}`}>
              {editingId ? '✏️ Edit Existing Question' : '✨ Add New Question'}
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
              
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea 
                  value={questionText} 
                  onChange={(e) => setQuestionText(e.target.value)}
                  required 
                  rows={3} 
                  placeholder="E.g., What is the first step in the safety SOP?"
                  className="w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Multiple Choice Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options & Correct Answer</label>
                <p className="text-xs text-gray-500 mb-3">Type the choices below and select the radio button next to the correct one.</p>
                
                <div className="space-y-3">
                  {options.map((opt, idx) => {
                    const optLabel = String.fromCharCode(65 + idx); 
                    
                    return (
                      <div key={idx} className={`flex items-start gap-3 p-2 border rounded-md transition-colors ${correctOption === optLabel ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>

                        <input
                          type="radio"
                          name="correctOption"
                          checked={correctOption === optLabel}
                          onChange={() => setCorrectOption(optLabel)}
                          className="w-4 h-4 mt-1.5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer shrink-0"
                        />

                        <span className="text-sm font-bold text-gray-400 w-4 mt-1">
                          {optLabel}
                        </span>
                        
                        <textarea
                          ref={(el) => {
                            // Auto-grow to fit content — re-runs on every
                            // render (typing or an Edit-click prefill), so
                            // the box always matches the current text.
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          required
                          rows={1}
                          className="flex-1 border-none focus:ring-0 p-1 bg-transparent text-sm resize-none overflow-hidden leading-normal"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="mt-auto pt-6 border-t flex flex-col gap-2">
                <button 
                  type="submit" 
                  disabled={isBusy || !questionText.trim()}
                  className={`w-full py-2.5 px-4 rounded-md text-white font-medium shadow-sm transition-colors ${
                    isBusy ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isBusy ? 'Saving...' : (editingId ? 'Update Question' : 'Save & Add Question')}
                </button>
                
                {editingId && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    disabled={isBusy}
                    className="w-full py-2 px-4 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

            </form>
          </div>
          )}

        </div>
      )}
    </div>
  );
}