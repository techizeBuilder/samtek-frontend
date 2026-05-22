import React, { useState, useEffect } from 'react';
import { useActiveTrainees, useDeleteTraineeRecord } from '../../hooks/useTraining'; 
import StageCandidateModal from '../../components/lms/StageCandidateModal'; 
import TraineeDetailsView from '../../components/lms/TraineeDetailsView'; 

interface PopulatedUser {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    employeeId?: string;
}

interface ActiveTrainee {
    _id: string;
    user: PopulatedUser | null; 
    assignedDepartment: string;
    status: string;
    isEligible: boolean;
}

const TOP_LEVEL_ADMINS = ['HR-Admin', 'Super Admin', 'Admin', 'Company Admin'];

export default function Trainees() {
    // --- AUTH & ROLE CHECKS ---
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isTopAdmin = currentUser && TOP_LEVEL_ADMINS.includes(currentUser.role);

    // --- UI STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null); 

    // --- PAGINATION & FILTER STATE ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [eligibilityFilter, setEligibilityFilter] = useState('');

    // Fetch data dynamically with filters
    const { data: response, isLoading, isError } = useActiveTrainees({
        page,
        limit,
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(eligibilityFilter !== '' && { isEligible: eligibilityFilter }),
        ...(searchTerm && { search: searchTerm })
    });

    const { mutate: deleteTrainee } = useDeleteTraineeRecord();

    const trainees: ActiveTrainee[] = response?.data || [];
    const totalPages: number = response?.totalPages || 1;
    const totalRecords: number = response?.total || 0;

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); 
        if (window.confirm("Are you sure you want to permanently delete this candidate's training record and HRMS account?")) {
            deleteTrainee(id);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'department') setDepartmentFilter(value);
        if (name === 'status') setStatusFilter(value);
        if (name === 'eligibility') setEligibilityFilter(value);
        if (name === 'search') setSearchTerm(value);
        setPage(1);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Active Trainees Tracker</h1>
                    <p className="text-sm text-gray-500">Monitor candidates currently in the training staging area.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition-colors"
                >
                    + Assign Training
                </button>
            </div>

            {/* --- FILTER CONTROLS --- */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">

                    {/* Search Bar */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Search</label>
                        <input
                            type="text"
                            name="search"
                            placeholder="Name or Email..."
                            value={searchTerm}
                            onChange={handleFilterChange}
                            className="w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                        />
                    </div>

                    {/* Department Filter - Only visible to HR/Admins */}
                    {isTopAdmin ? (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Department</label>
                            <select
                                name="department"
                                value={departmentFilter}
                                onChange={handleFilterChange}
                                className="w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                            >
                                <option value="">All Departments</option>
                                <option value="Production">Production</option>
                                <option value="Packing">Packing</option>
                                <option value="Dispatch">Dispatch</option>
                                <option value="Accounts">Accounts</option>
                                <option value="Sales">Sales</option>
                            </select>
                        </div>
                    ) : (
                        <div className="opacity-60">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Department Access</label>
                            <div className="w-full rounded-md bg-gray-50 border border-gray-200 p-2 text-sm font-semibold text-gray-700">
                                Locked: {currentUser?.role.replace(/(Head|Manager)/gi, '').trim()}
                            </div>
                        </div>
                    )}

                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                        <select
                            name="status"
                            value={statusFilter}
                            onChange={handleFilterChange}
                            className="w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="In-Training">In-Training</option>
                            <option value="Pending_2nd_Attempt">Pending 2nd Attempt</option>
                            <option value="Passed">Passed (Awaiting Decision)</option>
                            <option value="Failed">Failed (Awaiting Decision)</option>
                            <option value="Completed_Onboarding">Completed Onboarding</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    {/* Eligibility Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Eligibility</label>
                        <select
                            name="eligibility"
                            value={eligibilityFilter}
                            onChange={handleFilterChange}
                            className="w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                        >
                            <option value="">All Candidates</option>
                            <option value="true">Eligible</option>
                            <option value="false">Not Eligible</option>
                        </select>
                    </div>

                </div>

                <div className="text-sm text-gray-500 flex justify-end">
                    Showing <span className="font-semibold mx-1">{trainees.length}</span> of <span className="font-semibold mx-1">{totalRecords}</span> matching candidates
                </div>
            </div>

            {/* Loading / Error States */}
            {isLoading && <p className="text-gray-500 animate-pulse">Loading active trainees...</p>}
            {isError && <p className="text-red-500">Error loading trainees. Please try again.</p>}

            {/* Data Table */}
            {!isLoading && !isError && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eligibility</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {trainees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No active trainees found.</td>
                                </tr>
                            ) : (
                                trainees.map((trainee: ActiveTrainee) => (
                                    <tr
                                        key={trainee._id}
                                        onClick={() => setSelectedTraineeId(trainee._id)} 
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {trainee.user?.fullName || 'Unknown User'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {trainee.user?.email || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                            {trainee.assignedDepartment}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${trainee.status === 'Passed' ? 'bg-green-100 text-green-800' :
                                                  trainee.status === 'Failed' ? 'bg-red-100 text-red-800' :
                                                  trainee.status === 'Completed_Onboarding' ? 'bg-blue-600 text-white' : 
                                                  trainee.status === 'Rejected' ? 'bg-gray-800 text-white' : 
                                                  'bg-yellow-100 text-yellow-800'}`}
                                            >
                                                {trainee.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {trainee.isEligible ? (
                                                <span className="text-green-600 font-medium">Eligible</span>
                                            ) : (
                                                <span className="text-red-600 font-medium">Not Eligible</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => handleDelete(e, trainee._id)} 
                                                className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex justify-between w-full">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-500 self-center">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <StageCandidateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <TraineeDetailsView isOpen={!!selectedTraineeId} profileId={selectedTraineeId} onClose={() => setSelectedTraineeId(null)} />
        </div>
    );
}