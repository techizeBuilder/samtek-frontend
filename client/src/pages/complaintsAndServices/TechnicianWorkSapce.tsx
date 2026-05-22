import React, { useState, useEffect } from 'react';
import { useMyTickets } from '@/hooks/useComplaints';
import { MapPin, Phone, ChevronRight, Wrench, CheckCircle2, ArrowLeft, ArrowRight, Search, Calendar, X } from 'lucide-react';
import TechnicianActionModal from '../../components/support/TechnicianActionModal';

export default function TechnicianWorkspace() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Reset page to 1 whenever a tab or filter changes
  useEffect(() => {
    setPage(1);
    setStatusFilter('');
  }, [activeTab, searchTerm, startDate, endDate]);

  // Pass all parameters to the hook
  const { data: response, isLoading, isError } = useMyTickets({ 
    view: activeTab, 
    page, 
    limit: 10,
    search: searchTerm,
    startDate,
    status: statusFilter,
    endDate
  });
  
  const tickets = response?.data || [];
  const pagination = response?.pagination;

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-[calc(100vh-80px)] pb-20 flex flex-col">
      
      {/* Mobile App Header */}
      <div className="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-md shrink-0">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-indigo-200 text-sm mt-1">Check your route and update tickets.</p>
      </div>

      {/* Modern Tab Switcher */}
      <div className="flex p-4 pb-2 gap-2 shrink-0">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'active' ? 'bg-white shadow-sm text-indigo-700 border border-indigo-100' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <Wrench size={16} /> To-Do
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-green-700 border border-green-100' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <CheckCircle2 size={16} /> Completed
        </button>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="px-4 pb-4 space-y-2 shrink-0">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Name, Phone, Ticket ID..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {(searchTerm || startDate || endDate) && (
            <button 
              onClick={clearFilters} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-100 p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        
        
        {/* Date Range Picker */}
        <div className="flex gap-2">

          {/*  NEW STATUS DROPDOWN */}
          <div className="relative flex-1">
            <select
              className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {activeTab === 'active' ? (
                <>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Reopened">Reopened</option>
                </>
              ) : (
                <>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancelled">Cancelled</option>
                </>
              )}
            </select>
          </div>
          <div className="relative flex-1">
             <Calendar size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input 
               type="date" 
               className="w-full pl-8 pr-2 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
             />
          </div>
          <div className="relative flex-1">
             <Calendar size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input 
               type="date" 
               className="w-full pl-8 pr-2 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
             />
          </div>
        </div>
      </div>

      {/* Ticket List Area */}
      <div className="px-4 space-y-4 flex-1">
        {isLoading ? (
          <p className="text-center text-gray-400 py-10 animate-pulse">Loading schedule...</p>
        ) : isError ? (
          <p className="text-center text-red-400 py-10">Failed to load tickets.</p>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <CheckCircle2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No tickets found.</p>
            <p className="text-xs text-gray-400 mt-1">
              {(searchTerm || startDate || endDate) ? 'Try adjusting your search filters.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          tickets.map((ticket: any) => (
            <div 
              key={ticket._id} 
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-300 transition active:scale-95 cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute left-0 top-0 w-1.5 h-full ${ticket.status === 'In Progress' ? 'bg-amber-500' : ticket.status === 'Pending' ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
              
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : ticket.status === 'Pending' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                  {ticket.status}
                </span>
                <span className="text-xs text-gray-400 font-medium">{ticket.tokenId}</span>
              </div>

              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{ticket.customer.name}</h3>
              <p className="text-indigo-600 font-medium text-sm mb-4">{ticket.issue.issueType} • {ticket.machine.machineType}</p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin size={14} className="text-gray-400 min-w-[14px]"/> 
                  <span className="truncate">{ticket.customer.address}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                   <div className="flex items-center gap-2 text-gray-600 text-sm">
                     <Phone size={14} className="text-gray-400"/> {ticket.customer.mobileNumber}
                   </div>
                   <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-6 mt-4 flex items-center justify-between shrink-0">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)} 
            className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 active:bg-gray-50 transition shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          
          <span className="text-sm font-bold text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          
          <button 
            disabled={!pagination.hasMore} 
            onClick={() => setPage(p => p + 1)} 
            className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 disabled:opacity-40 active:bg-gray-50 transition shadow-sm"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* Action Modal */}
      {selectedTicket && (
        <TechnicianActionModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}