import React, { useState } from 'react';
import {
  useTicketDetails,
  useServicemen,
  useAssignTicket,
  useSendVerificationEmail,
  useCancelTicket
} from '@/hooks/useComplaints';
import { User, MapPin, Monitor, FileText, CheckCircle2, AlertCircle, Wrench, Play, X, Phone, Briefcase, Map, Mail, Loader2, XCircle, Clock } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_BASE.replace('/api', '');

export default function TicketDetailModal({ ticketId, onClose }: { ticketId: string, onClose: () => void }) {
  const { data: response, isLoading, isError } = useTicketDetails(ticketId);
  const ticket = response?.data;

  const { hasFeatureAccess } = usePermissions();
  const canAssign = hasFeatureAccess('complaints', 'technicians', 'edit');
  const canCancel = hasFeatureAccess('complaints', 'supportManagement', 'edit');
  const canVerify = hasFeatureAccess('complaints', 'dealVerifications', 'edit');

  const { data: servicemenRes } = useServicemen();
  const technicians = servicemenRes?.data || [];

  // Mutations
  const { mutate: assignTech, isPending: isAssigning } = useAssignTicket();
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendVerificationEmail();
  const { mutate: cancelTicket, isPending: isCancelling } = useCancelTicket();

  // States
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: string } | null>(null);

  // Cancel States
  const [cancelView, setCancelView] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const getFullMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${FILE_BASE}${cleanPath}`;
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading deep ticket data...</div>;
  if (isError || !ticket) return <div className="p-10 text-center text-red-500">Failed to load ticket details.</div>;

  const handleAssign = () => {
    if (!selectedTech) return;
    assignTech({ id: ticket._id, payload: { technicianId: selectedTech } });
  };

  const handleSendVerification = () => {
    if (!ticket.customer.email) {
      alert("This customer does not have an email address on file.");
      return;
    }
    sendEmail(ticket._id);
  };

  const handleCancel = () => {
    cancelTicket({ id: ticket._id, payload: { reason: cancelReason } }, {
      onSuccess: () => {
        setCancelView(false);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': case 'Closed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending Approval': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Pending': case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Reopened': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Main Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Issue Description Box */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${getStatusColor(ticket.status).split(' ')[0]}`}></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle size={16} className="text-indigo-500" /> Issue Details: {ticket.issue.issueType}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100">
              {ticket.issue.description || "No specific description provided by the customer."}
            </p>
          </div>

          {/* Customer & Machine Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Customer Info
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><span className="font-medium text-gray-800">Name:</span> {ticket.customer.name}</p>
                <p><span className="font-medium text-gray-800">Mobile:</span> {ticket.customer.mobileNumber}</p>
                <p><span className="font-medium text-gray-800">Email:</span> {ticket.customer.email || <span className="text-red-400 italic">Missing</span>}</p>
                <p className="flex items-start gap-1">
                  <MapPin size={16} className="text-gray-400 mt-0.5 min-w-[16px]" />
                  <span>{ticket.customer.address}</span>
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <Monitor size={16} className="text-orange-500" /> Machine Details
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><span className="font-medium text-gray-800">Type:</span> {ticket.machine.machineType}</p>
                <p><span className="font-medium text-gray-800">Model:</span> {ticket.machine.model || 'N/A'}</p>
                <p><span className="font-medium text-gray-800">Serial No:</span> {ticket.machine.serialNumber || 'N/A'}</p>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p><span className="font-medium text-gray-800">Warranty:</span> <span className={ticket.machine.warrantyStatus?.startsWith('Active') ? 'text-green-600 font-medium' : ''}>{ticket.machine.warrantyStatus || 'Unknown'}</span></p>
                  <p><span className="font-medium text-gray-800">AMC:</span> {ticket.machine.amcStatus || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visit History */}
          {ticket.visitHistory && ticket.visitHistory.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                <Wrench size={16} className="text-emerald-500" /> Technician Visit History
              </h3>
              <div className="space-y-4">
                {ticket.visitHistory.map((visit: any, index: number) => (
                  <div key={index} className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-sm">
                    <div className="flex justify-between font-medium text-gray-800 mb-2">
                      <span>Visit by: {visit.technicianName || 'Technician'}</span>
                      <span className={visit.visitStatus === 'Completed' ? 'text-green-600' : 'text-yellow-600'}>
                        {visit.visitStatus}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2"><span className="font-medium">Work Done:</span> {visit.workDoneDetails || 'In progress...'}</p>

                    {visit.partsUsed && visit.partsUsed.length > 0 && (
                      <div className="mb-3">
                        <span className="font-medium text-gray-800 text-xs uppercase tracking-wide">Parts Replaced:</span>
                        <ul className="mt-2 space-y-1.5">
                          {visit.partsUsed.map((partObj: any, pIndex: number) => (
                            <li key={pIndex} className="text-xs text-gray-600 flex justify-between items-center bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                              <span>{partObj.item?.name || 'Unknown Part'} <span className="text-gray-400 ml-1">({partObj.item?.code || 'N/A'})</span></span>
                              <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[10px]">Qty: {partObj.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ATTACHMENTS GALLERY */}
                    {visit.media && visit.media.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attachments</p>
                        <div className="flex flex-wrap gap-2">
                          {visit.media.map((file: any, mIndex: number) => {
                            const fullUrl = getFullMediaUrl(file.url);
                            return (
                              <button key={mIndex} onClick={() => setSelectedMedia({ url: fullUrl, type: file.type })} type="button" className="block relative overflow-hidden rounded-md border border-gray-200 hover:shadow-md transition bg-gray-200 hover:ring-2 hover:ring-indigo-500 focus:outline-none">
                                {file.type === 'video' ? (
                                  <div className="h-16 w-16 bg-gray-800 flex items-center justify-center text-white"><Play size={20} fill="currentColor" /></div>
                                ) : (
                                  <img src={fullUrl} alt="Service attachment" className="h-16 w-16 object-cover hover:scale-110 transition duration-300" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image' }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Assignment, Cancel, & Closing Flow */}
        <div className="space-y-6">

          {/* Priority & SLA Block */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Priority & SLA
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Priority Level</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${ticket.priority?.level === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                    ticket.priority?.level === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-green-50 text-green-700 border-green-200'
                  }`}>
                  {ticket.priority?.level || 'Low'}
                </span>
              </div>

              {ticket.sla?.resolutionDeadline ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Resolution Deadline</span>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{new Date(ticket.sla.resolutionDeadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {ticket.sla.isBreached && <p className="text-[10px] text-red-500 font-bold mt-0.5 uppercase">SLA Breached</p>}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Resolution Deadline</span>
                  <span className="text-gray-400 italic">Stopped</span>
                </div>
              )}
            </div>
          </div>

          {/* State 1: Needs Assignment */}
          {['Unassigned', 'Pending', 'In Progress', 'Reopened'].includes(ticket.status) && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">Assignment</h3>

              {/* 🔥 ENHANCED ASSIGNED TECHNICIAN BLOCK */}
              {ticket.assignment?.technicianId ? (
                <div className="mb-4 text-sm bg-white p-4 rounded-lg border border-indigo-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-full"><User size={16} className="text-indigo-500" /></div>
                    <div>
                      <p className="font-semibold text-gray-800">{ticket.assignment.technicianId.fullName || ticket.assignment.technicianId.username}</p>
                      <p className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {ticket.assignment.technicianId.mobile || 'No phone listed'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-indigo-50 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Map size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">Zone:</span>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 text-xs font-semibold">
                        {ticket.assignment.technicianId.serviceZone || 'All'}
                      </span>
                    </div>

                    {ticket.assignment.technicianId.technicianSkills && ticket.assignment.technicianId.technicianSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ticket.assignment.technicianId.technicianSkills.map((skill: string) => (
                          <span
                            key={skill}
                            className="px-2 py-1 text-[10px] bg-gray-50 text-gray-600 border border-gray-200 rounded-full font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500 font-medium mb-3 flex items-center gap-1"><AlertCircle size={14} /> Currently Unassigned</p>
              )}

              <div className="space-y-3 bg-white p-3 rounded-lg border border-indigo-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Technician</label>
                  <select className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 px-3 py-2 border bg-gray-50" value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}>
                    <option value="">Choose...</option>
                    {technicians.map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name || t.username}</option>
                    ))}
                  </select>
                </div>

                {selectedTech && (
                  (() => {
                    const techDetails = technicians.find((t: any) => t._id === selectedTech);
                    if (!techDetails) return null;
                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-md p-3 text-xs space-y-2">
                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                          <span className="font-bold text-indigo-900">{techDetails.name}</span>
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${techDetails.currentStatus === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{techDetails.currentStatus || 'Unknown'}</span>
                        </div>
                        <div className="flex flex-col gap-2.5 text-indigo-800">
                          <p className="flex items-center gap-1"><Briefcase size={12} className="opacity-60" /> <span className="font-semibold">Role:</span> {techDetails.role}</p>
                          <p className="flex items-center gap-1"><Map size={12} className="opacity-60" /> <span className="font-semibold">Zone:</span> {techDetails.serviceZone}</p>
                          <p className="col-span-2"><span className="font-semibold text-gray-500">Contact:</span> {techDetails.contact}</p>
                          <p className="col-span-2 leading-tight"><span className="font-semibold text-gray-500 block mb-0.5">Skills:</span> {techDetails.skills?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                    );
                  })()
                )}

                {canAssign && (
                  <button onClick={handleAssign} disabled={!selectedTech || isAssigning} className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition mt-2">
                    {isAssigning ? 'Assigning...' : (ticket.status === 'Reopened' ? 'Re-Assign Ticket' : 'Assign Ticket')}
                  </button>
                )}
              </div>

              {/* CANCEL TICKET TRIGGER */}
              {!cancelView && canCancel && (
                <div className="text-center mt-4 pt-4 border-t border-indigo-100/50">
                  <button onClick={() => setCancelView(true)} className="text-[11px] text-red-500 hover:text-red-700 hover:underline font-bold uppercase tracking-wider">
                    Cancel This Ticket?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CANCEL TICKET FORM */}
          {cancelView && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wide flex items-center gap-2">
                <XCircle size={16} /> Cancel Ticket
              </h3>
              <p className="text-xs text-red-700 mb-3">Are you sure? This immediately stops SLA timers and removes it from the technician's queue.</p>

              <textarea
                className="w-full text-sm border border-red-200 rounded-md px-3 py-2 bg-white mb-3 focus:ring-2 focus:ring-red-400 outline-none"
                rows={2}
                placeholder="Reason for cancellation (optional)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />

              <div className="flex gap-2">
                <button onClick={() => setCancelView(false)} className="flex-1 bg-white text-gray-600 border border-gray-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition">Back</button>
                <button onClick={handleCancel} disabled={isCancelling} className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition flex justify-center items-center gap-2 disabled:opacity-50">
                  {isCancelling ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* State 2 & 3: Resolved & Pending Approval */}
          {(ticket.status === 'Resolved' || ticket.status === 'Pending Approval') && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 shadow-sm text-center">
              <Mail size={32} className="mx-auto text-purple-500 mb-3" />
              <h3 className="text-sm font-bold text-purple-900 mb-2 uppercase tracking-wide">Customer Verification</h3>

              {ticket.status === 'Resolved' ? (
                <>
                  <p className="text-xs text-purple-700 mb-4 px-2">The technician marked this as resolved. Send a verification link to the customer for final closure.</p>
                  {canVerify && (
                    <button onClick={handleSendVerification} disabled={isSendingEmail || !ticket.customer.email} className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                      {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : 'Send Link to Customer'}
                    </button>
                  )}
                  {!ticket.customer.email && <p className="text-xs text-red-500 mt-2 font-medium">Missing customer email.</p>}
                </>
              ) : (
                <>
                  <p className="text-xs text-purple-700 mb-4 px-2 font-medium">Verification link sent to customer. Awaiting their response to seal the ticket.</p>
                  {canVerify && (
                    <button onClick={handleSendVerification} disabled={isSendingEmail} className="w-full bg-white text-purple-600 border border-purple-200 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-50 transition flex items-center justify-center gap-2">
                      {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : 'Resend Link'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* State 4: Closed */}
          {ticket.status === 'Closed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
              <h3 className="text-sm font-bold text-green-900 mb-2 uppercase tracking-wide">Ticket Sealed</h3>

              <div className="inline-flex items-center justify-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full mb-3 border border-green-200">
                <span className="text-xs font-bold uppercase tracking-wider">Customer Satisfied</span>
              </div>

              {ticket.closure?.feedbackComments && ticket.closure.feedbackComments !== 'Customer was satisfied with the service.' && (
                <p className="text-xs italic text-gray-600 bg-white p-3 rounded-lg border border-green-100 shadow-sm mt-1 text-left">
                  <span className="font-bold block mb-1 not-italic text-gray-800 text-[10px] uppercase">Customer Comment:</span>
                  "{ticket.closure.feedbackComments}"
                </p>
              )}
            </div>
          )}

          {/* State 5: Cancelled */}
          {ticket.status === 'Cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm text-center">
              <XCircle size={32} className="mx-auto text-red-500 mb-3" />
              <h3 className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wide">Ticket Cancelled</h3>
              <p className="text-xs text-red-700 font-medium">This ticket was cancelled and is no longer active.</p>
            </div>
          )}

          {/* Audit Log Timeline */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-gray-500" /> Audit Trail
            </h3>
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
              {ticket.auditLog?.map((log: any, i: number) => (
                <div key={i} className="pl-6 relative">
                  <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <p className="text-sm font-medium text-gray-800 leading-tight">{log.action}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                    <span className="font-bold text-gray-600">{log.performedBy?.userId?.fullName || log.performedBy?.role || 'System'}</span>
                    <span className="text-gray-300">•</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PDF DOWNLOAD BUTTON (Only available when the ticket is Closed) */}
          {ticket.status === 'Closed' && (
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                fetch(`${API_BASE}/complaints/tickets/${ticket._id}/invoice`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                  .then(res => {
                    if (!res.ok) throw new Error("Failed to generate PDF");
                    return res.blob();
                  })
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice-${ticket.tokenId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(err => {
                    console.error(err);
                    alert("Could not download the invoice.");
                  });
              }}
              className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition shadow-sm flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Download Service Invoice
            </button>
          )}

        </div>
      </div>

      {/* FULL SCREEN LIGHTBOX OVERLAY */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <button onClick={() => setSelectedMedia(null)} className="absolute top-6 right-6 text-white hover:text-red-400 transition bg-black/50 p-2 rounded-full z-50 focus:outline-none">
            <X size={28} />
          </button>
          {selectedMedia.type === 'video' ? (
            <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl shadow-2xl outline-none" />
          ) : (
            <img src={selectedMedia.url} alt="Full size attachment" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Failed' }} />
          )}
        </div>
      )}
    </>
  );
}