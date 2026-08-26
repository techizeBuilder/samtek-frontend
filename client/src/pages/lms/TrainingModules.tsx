import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModules, useDeactivateModule } from '../../hooks/useTraining';
import CreateModuleModal from '../../components/lms/CreateModuleModal';
import EditModuleInfoModal from '../../components/lms/EditModuleInfoModal';
import ManageMediaModal from '../../components/lms/ManageMediaModal';
import { usePermissions } from '../../hooks/usePermissions';

// Define the TypeScript Interface based on our Mongoose Schema
interface ModuleContent {
  _id: string;
  contentType: 'Video' | 'PDF' | 'PPT';
  mediaUrl: string;
  minWatchTime: number;
}

interface TrainingModule {
  _id: string;
  title: string;
  description: string;
  department: string;
  category: string;
  sequenceOrder: number;
  contents: ModuleContent[];
  isActive: boolean;
}

const TOP_LEVEL_ADMINS = ['HR-Admin', 'Super Admin', 'Admin', 'Company Admin'];

export default function TrainingModules() {
  const navigate = useNavigate();

  // --- ROLE CHECKS ---
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isTopAdmin = currentUser && TOP_LEVEL_ADMINS.includes(currentUser.role);
  const { hasAnyModuleFeatureAccess } = usePermissions();
  const canAdd = hasAnyModuleFeatureAccess('lms', 'add');
  const canEdit = hasAnyModuleFeatureAccess('lms', 'edit');
  const canDelete = hasAnyModuleFeatureAccess('lms', 'delete');

  // --- UI STATE ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<TrainingModule | null>(null);
  const [moduleToManageMedia, setModuleToManageMedia] = useState<TrainingModule | null>(null);

  // --- FILTER STATE ---
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // --- FETCH DATA ---
  const { data: response, isLoading, isError } = useModules({
    page,
    limit: 12,
    ...(departmentFilter && { department: departmentFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(searchTerm && { search: searchTerm })
  });
  const { mutate: deactivateModule } = useDeactivateModule();

  const modules: TrainingModule[] = response?.data || [];
  const totalPages: number = response?.pagination?.pages || 1;
  const totalModules: number = response?.pagination?.total ?? modules.length;

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  // --- HANDLERS ---
  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to archive the module "${title}"? This will hide it from new trainees.`)) {
      deactivateModule(id);
    }
  };

  // --- UI FORMATTING HELPER ---
  const formatDeptName = (dept: string) => {
    if (!dept) return 'General';
    const map: Record<string, string> = {
      'Research & Development': 'R&D',
      'Quality Control': 'QC',
      'Store': 'Store'
    };
    return map[dept] || dept;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Course Library</h1>
          <p className="text-sm text-gray-500">Manage the educational content, videos, and SOPs for your company.</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition-colors"
          >
            + Create New Module
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4 flex-wrap">

        {/* SEARCH BOX */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <input
            type="text"
            placeholder="Module title..."
            value={searchTerm}
            onChange={handleFilterChange(setSearchTerm)}
            className="rounded-md border-gray-300 shadow-sm p-2 border text-sm w-48"
          />
        </div>

        {/* 🔥 UPDATED DYNAMIC DEPARTMENT FILTER */}
        {isTopAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Department:</label>
            <select
              value={departmentFilter}
              onChange={handleFilterChange(setDepartmentFilter)}
              className="rounded-md border-gray-300 shadow-sm p-2 border text-sm w-48"
            >
              <option value="">All Departments</option>
              <option value="Production">Production</option>
              <option value="Packing">Packing</option>
              <option value="Dispatch">Dispatch</option>
              <option value="Accounts">Accounts</option>
              <option value="Sales">Sales</option>
              <option value="Research & Development">R&D</option>
              <option value="Store">Store</option>
              <option value="QC">QC</option>
              <option value="General">General / All</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-75">
            <label className="text-sm font-medium text-gray-700">Department:</label>
            <div className="rounded-md border border-gray-200 bg-gray-50 shadow-sm p-2 text-sm w-48 font-semibold text-gray-600 cursor-not-allowed truncate">
              Locked: {formatDeptName(currentUser?.role.replace(/(Head|Manager|Employee)/gi, '').trim()) || 'Your Department'}
            </div>
          </div>
        )}

        {/* STATUS FILTER DROPDOWN */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            className="rounded-md border-gray-300 shadow-sm p-2 border text-sm w-36"
          >
            <option value="Active">Active Only</option>
            <option value="Archived">Archived Only</option>
            <option value="All">Show All</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          Total Modules: <span className="font-semibold text-gray-900">{totalModules}</span>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && <p className="text-gray-500 animate-pulse">Loading training modules...</p>}
      {isError && <p className="text-red-500 bg-red-50 p-4 rounded-md">Error loading modules. Please try again.</p>}

      {/* Module Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">No training modules found.</p>
              {canAdd && (
                <button onClick={() => setIsCreateModalOpen(true)} className="text-blue-600 hover:underline font-medium">
                  Create your first module
                </button>
              )}
            </div>
          ) : (
            modules.map((module) => (
              <div
                key={module._id}
                className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${!module.isActive ? 'opacity-75 border-gray-300' : 'border-gray-200'}`}
              >
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">

                    {/* 🔥 NEW: DEPARTMENT & CATEGORY TAGS */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        {formatDeptName(module.department)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                        {module.category}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      {!module.isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                          Archived
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        Seq: {module.sequenceOrder}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mt-1" title={module.title}>{module.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2" title={module.description}>
                    {module.description || 'No description provided.'}
                  </p>
                </div>

                <div className="p-5 flex-1 bg-gray-50/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Course Contents</p>
                  <div className="flex gap-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      {module.contents.filter(c => c.contentType === 'Video').length} Videos
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                      {module.contents.filter(c => c.contentType === 'PDF').length} PDFs
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        <button onClick={() => setModuleToEdit(module)} className="text-xs font-medium text-gray-600 hover:text-blue-600 px-2 py-1 rounded transition-colors">Edit Info</button>
                        <button onClick={() => setModuleToManageMedia(module)} className="text-xs font-medium text-gray-600 hover:text-blue-600 px-2 py-1 rounded transition-colors">Manage Media</button>
                      </>
                    )}
                    <button onClick={() => navigate(`/lms/question-bank/${module._id}`)} className="text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded transition-colors">Manage Quiz</button>
                  </div>
                  {module.isActive && canDelete && (
                    <button onClick={() => handleDelete(module._id, module.title)} className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 transition-colors">Archive</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isLoading && !isError && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <CreateModuleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <EditModuleInfoModal module={moduleToEdit} onClose={() => setModuleToEdit(null)} />
      <ManageMediaModal module={moduleToManageMedia} onClose={() => setModuleToManageMedia(null)} />
    </div>
  );
}