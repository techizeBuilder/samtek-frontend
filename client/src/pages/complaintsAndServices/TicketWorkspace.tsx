import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Required for role-based button
import { useSupportTickets, useServicemen } from '@/hooks/useComplaints';
import { Search, Eye, AlertCircle, Clock, CheckCircle2, Calendar } from 'lucide-react';
import TicketDetailModal from '@/components/support/TicketDetailModal';
import TicketCreationForm from '@/components/support/TicketCreationForm';

export default function TicketWorkspace() {
  const { user } = useAuth() as any;

  // 1. Page & Modal States
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // 2. All Filter States
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState('');
  const [isBreachedFilter, setIsBreachedFilter] = useState(''); // 'true', 'false', or ''
  const [technicianFilter, setTechnicianFilter] = useState(''); // ID or 'unassigned'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 3. Fetch Technicians for the dropdown
  const { data: servicemenRes } = useServicemen();
  const technicians = servicemenRes?.data || [];

  // 4. Fetch Tickets with ALL filters applied
  const { data: response, isLoading, isError } = useSupportTickets({
    page,
    limit: 10,
    search: searchTerm,
    status: statusFilter,
    priority: priorityFilter,
    issueType: issueTypeFilter,
    isBreached: isBreachedFilter !== '' ? isBreachedFilter : undefined,
    technicianId: technicianFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const tickets = response?.data || [];
  const pagination = response?.pagination;

  // Define who is allowed to create support tickets
  const canCreateTicket = user && (
    ['Company Admin', 'Super Admin', 'Admin', 'Complaint Management Head'].includes(user.role)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><CheckCircle2 size={12}/> {status}</span>;
      case 'Pending':
      case 'In Progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><Clock size={12}/> {status}</span>;
      case 'Reopened':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><AlertCircle size={12}/> {status}</span>;
      case 'Unassigned':
      case 'Cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><AlertCircle size={12}/> {status}</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium w-max">{status}</span>;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      
      {/* PAGE HEADER WITH ACTION BUTTON */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ticket Workspace</h1>
          <p className="text-sm text-gray-500">Manage customer complaints, assign technicians, and track SLAs.</p>
        </div>

        {canCreateTicket && (
          <button 
            onClick={() => setIsCreateFormOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 transition font-medium"
          >
            + Create Ticket
          </button>
        )}
      </div>

      <div className="space-y-4">
        
        {/* FILTER BAR - Upgraded to 2 Rows */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          
          {/* Top Row: Search & Date Range */}
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by Ticket ID or Customer..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            
            {/* Date Filters */}
            <div className="flex gap-2 w-full md:w-auto items-center">
               <Calendar className="text-gray-400 hidden md:block" size={18} />
               <input 
                  type="date" 
                  className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 text-sm"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  title="Start Date"
               />
               <span className="text-gray-400">-</span>
               <input 
                  type="date" 
                  className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 text-sm"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  title="End Date"
               />
            </div>
          </div>

          {/* Bottom Row: 5 Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm"
              value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Reopened">Reopened</option>
            </select>

            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm"
              value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Issue Type */}
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm"
              value={issueTypeFilter} onChange={(e) => { setIssueTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Issue Types</option>
              <option value="Breakdown">Breakdown</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Installation">Installation</option>
              <option value="Training">Training</option>
            </select>

            {/* SLA Status */}
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm"
              value={isBreachedFilter} onChange={(e) => { setIsBreachedFilter(e.target.value); setPage(1); }}
            >
              <option value="">All SLA Status</option>
              <option value="false">On Time</option>
              <option value="true">SLA Breached</option>
            </select>

            {/* Assignee (Dynamic) */}
            <select 
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm truncate"
              value={technicianFilter} onChange={(e) => { setTechnicianFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {technicians.map((tech: any) => (
                <option key={tech._id} value={tech._id}>{tech.name || tech.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Ticket ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading tickets...</td></tr>
                ) : isError ? (
                   <tr><td colSpan={7} className="px-6 py-8 text-center text-red-400">Failed to load tickets.</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No tickets found matching your filters.</td></tr>
                ) : (
                  tickets.map((ticket: any) => (
                    <tr key={ticket._id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedTicketId(ticket._id)}>
                      <td className="px-6 py-4 font-semibold text-indigo-600">{ticket.tokenId}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{ticket.customer.name}</div>
                        <div className="text-xs text-gray-400">{ticket.customer.mobileNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{ticket.issue.issueType}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">{ticket.machine.machineType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.priority.level === 'High' ? 'bg-red-50 text-red-600' :
                          ticket.priority.level === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {ticket.priority.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                      <td className="px-6 py-4">
                        {ticket.assignment?.technicianId ? (
                          <div className="text-sm font-medium text-gray-800">{ticket.assignment.technicianId.fullName || ticket.assignment.technicianId.username || 'Employee'}</div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setSelectedTicketId(ticket._id); }}
                           className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition"
                           title="View Details"
                         >
                           <Eye size={18} />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
               <span className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</span>
               <div className="flex gap-2">
                 <button disabled={page === 1} onClick={() => setPage(prev => prev - 1)} className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                 <button disabled={page === pagination.totalPages} onClick={() => setPage(prev => prev + 1)} className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
               </div>
            </div>
          )}
        </div>

        {/* TICKET CREATION MODAL */}
        {isCreateFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"> 
                  <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Register New Complaint</h2>
                        <p className="text-sm text-gray-500">Log a new service request or machine breakdown</p>
                      </div>
                      <button onClick={() => setIsCreateFormOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                    <TicketCreationForm onClose={() => setIsCreateFormOpen(false)} />
                  </div>
              </div>
          </div>
        )}

        {/* DETAIL VIEW MODAL */}
        {selectedTicketId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
             <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                   <h2 className="text-xl font-bold text-gray-800">Ticket Details</h2>
                   <button onClick={() => setSelectedTicketId(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                   <TicketDetailModal ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}