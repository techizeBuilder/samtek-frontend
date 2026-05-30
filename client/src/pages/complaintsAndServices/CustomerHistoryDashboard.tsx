import React, { useState } from 'react';
import { useCustomerHistory } from '@/hooks/useComplaints';
import {
    Search, User, Phone, MapPin, Mail, Shield, AlertCircle,
    History, Monitor, FileText, Download, CheckCircle2, XCircle, Loader2, Eye, X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_BASE.replace('/api', ''); // Helper for local files

export default function CustomerHistoryDashboard() {
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [viewingAmc, setViewingAmc] = useState<string | null>(null);

    const { data: historyRes, isFetching, isError } = useCustomerHistory(activeSearch);
    const history = historyRes?.data;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanNumber = searchInput.replace(/\D/g, '');
        if (cleanNumber.length === 10) {
            setActiveSearch(cleanNumber);
        } else {
            alert("Please enter a valid 10-digit mobile number.");
        }
    };

    // Format URL just in case it's a local path
    const getFullFileUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${FILE_BASE}${cleanPath}`;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">

            {/* HEADER & SEARCH BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="text-indigo-600" /> Customer & AMC Records
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Search by mobile number to view complete asset and service history.</p>
                </div>

                <form onSubmit={handleSearch} className="w-full md:w-96 relative">
                    <input
                        type="text"
                        maxLength={10}
                        placeholder="Enter 10-digit mobile number..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 transition"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={isFetching}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition disabled:opacity-50"
                    >
                        {isFetching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                </form>
            </div>

            {/* ERROR / EMPTY STATES */}
            {isError && (
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center flex flex-col items-center justify-center">
                    <AlertCircle size={32} className="mb-2 opacity-80" />
                    <h3 className="font-bold text-lg">No Records Found</h3>
                    <p className="text-sm">We couldn't find any history for the number +91 {activeSearch}.</p>
                </div>
            )}

            {!activeSearch && !isFetching && !isError && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-10 rounded-2xl text-center flex flex-col items-center justify-center text-indigo-400">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p className="font-medium text-indigo-800">Search for a customer to display their dashboard.</p>
                </div>
            )}

            {/* DASHBOARD CONTENT */}
            {history && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">

                    {/* LEFT COLUMN: Customer Profile & Complaints */}
                    <div className="space-y-6">

                        {/* Customer Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer Profile</h3>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-2xl">
                                    {history.customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{history.customerName}</h2>
                                    <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-bold uppercase">
                                        Verified Client
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm text-gray-600">
                                <p className="flex items-center gap-3"><Phone size={16} className="text-gray-400" /> +91 {history.mobileNumber}</p>
                                <p className="flex items-center gap-3"><Mail size={16} className="text-gray-400" /> {history.email || 'No email on file'}</p>
                                <p className="flex items-start gap-3"><MapPin size={16} className="text-gray-400 mt-0.5 min-w-[16px]" /> {history.address || 'No address provided'}</p>
                            </div>
                        </div>

                        {/* Service History Timeline */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <History size={16} className="text-indigo-400" /> Recent Service Requests
                            </h3>

                            <div className="space-y-4">
                                {history.previousComplaints?.length > 0 ? (
                                    history.previousComplaints.map((ticket: any, index: number) => (
                                        <div key={index} className="relative pl-4 border-l-2 border-gray-100">
                                            <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-1.5 ring-4 ring-white"></div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm text-gray-800">{ticket.tokenId}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-gray-600">{ticket.issue?.issueType}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg text-center">No service complaints filed yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Registered Assets & AMC Documents */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Monitor className="text-indigo-600" /> Registered Machines & AMC Status
                                </h3>
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">
                                    Total Assets: {history.pastPurchases?.length || 0}
                                </span>
                            </div>

                            {history.pastPurchases?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {history.pastPurchases.map((machine: any, index: number) => {

                                        const isWarrantyActive = machine.warrantyStatus === 'Active';
                                        const hasAmc = machine.amcStatus !== 'Not Subscribed' && machine.amcStatus !== 'Unknown';
                                        const isAmcExpired = machine.amcStatus === 'Expired';
                                        const fileUrl = getFullFileUrl(machine.amcDocumentUrl);

                                        return (
                                            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white flex flex-col">

                                                {/* Machine Header */}
                                                <div className="bg-gray-50 p-4 border-b border-gray-100">
                                                    <h4 className="font-bold text-gray-900 text-sm">{machine.machineType}</h4>
                                                    <p className="text-xs text-gray-500 font-medium">Model: {machine.model}</p>
                                                    <p className="text-xs text-gray-500 font-medium">S/N: {machine.serialNumber}</p>
                                                </div>

                                                {/* Status Tags */}
                                                <div className="p-4 flex-1 space-y-4">
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                                        <span className="text-xs text-gray-500 uppercase font-bold">Warranty</span>
                                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${isWarrantyActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                            {isWarrantyActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {machine.warrantyStatus}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                                        <span className="text-xs text-gray-500 uppercase font-bold">AMC Status</span>
                                                        <span className={`text-xs font-bold ${hasAmc && !isAmcExpired ? 'text-indigo-600' :
                                                                isAmcExpired ? 'text-red-500' : 'text-gray-400'
                                                            }`}>
                                                            {machine.amcStatus}
                                                        </span>
                                                    </div>

                                                    {/* 📄 AMC DOCUMENT DISPLAY */}
                                                    <div className="pt-2">
                                                        {hasAmc && fileUrl ? (
                                                            <div className={`p-3 rounded-lg border flex items-center justify-between ${isAmcExpired ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <Shield size={20} className={isAmcExpired ? 'text-red-400' : 'text-indigo-500'} />
                                                                    <div>
                                                                        <p className={`text-xs font-bold uppercase ${isAmcExpired ? 'text-red-800' : 'text-indigo-900'}`}>
                                                                            {isAmcExpired ? 'AMC Expired' : 'Active AMC Contract'}
                                                                        </p>
                                                                        <p className={`text-[10px] ${isAmcExpired ? 'text-red-600' : 'text-indigo-600'}`}>
                                                                            Official PDF Document
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* View & Download Buttons */}
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={() => setViewingAmc(fileUrl)}
                                                                        className={`p-2 rounded-md hover:shadow transition flex items-center gap-1 ${isAmcExpired ? 'text-red-700 bg-red-100 hover:bg-red-200' : 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200'}`}
                                                                        title="View Document"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <a
                                                                        href={fileUrl}
                                                                        download={`AMC_${machine.serialNumber}.pdf`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`p-2 rounded-md hover:shadow transition text-white ${isAmcExpired ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                                        title="Download Document"
                                                                    >
                                                                        <Download size={14} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-center gap-3">
                                                                <FileText size={20} className="text-gray-300" />
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-500 uppercase">No AMC Document</p>
                                                                    <p className="text-[10px] text-gray-400">Not uploaded to system</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-10 bg-gray-50 rounded-xl border border-gray-100">
                                    <Monitor size={32} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-sm font-bold text-gray-600">No Assets Registered</p>
                                    <p className="text-xs text-gray-400 mt-1">This customer does not have any machines on record.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* 🔥 PDF LIGHTBOX OVERLAY */}
            {viewingAmc && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl flex justify-end mb-4">
                        <button
                            onClick={() => setViewingAmc(null)}
                            className="text-white hover:text-red-400 transition bg-white/10 hover:bg-white/20 p-2 rounded-full flex items-center gap-2 text-sm font-bold pr-4"
                        >
                            <X size={20} /> Close Viewer
                        </button>
                    </div>

                    <div className="w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                        {/* The iframe handles natively rendering the PDF in the browser */}
                        <iframe
                            src={viewingAmc}
                            className="w-full h-full border-none"
                            title="AMC Document Viewer"
                        />
                    </div>
                </div>
            )}

        </div>
    );
}