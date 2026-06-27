import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { leadApi } from '@/api/leadService';
import { orderApi } from '@/api/orderService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  User,
  Target,
  ChevronRight,
  ChevronLeft,
  X,
  History,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Briefcase,
  Globe,
  MapPin,
  FileText,
  TrendingUp,
  AlertTriangle,
  Users,
  Mic,
  Volume2,
  Upload,
  FileDown,
  Pencil,
  Star,
  ThumbsUp,
  ThumbsDown,
  Settings,
  RefreshCw,
  Play,
  Square,
  PhoneCall,
  Handshake,
  Download
} from 'lucide-react';

import { cn } from '@/lib/utils';

const Leads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiSettings = user?.company?.apiSettings || null;
  const { hasFeatureAccess } = usePermissions();
  const [location, setLocation] = useLocation();

  // States
  const [activeTab, setActiveTab] = useState('All Active Leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Initial check, 2: Basic info, 3: Company details
  
  // Modal States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isBuyerTypeModalOpen, setIsBuyerTypeModalOpen] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Dialpad Modal State
  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const [dialpadLead, setDialpadLead] = useState(null);
  const [dialpadInput, setDialpadInput] = useState('');

  // API Settings modal state (now just shows redirect info to Super Admin)
  const [isApiSettingsModalOpen, setIsApiSettingsModalOpen] = useState(false);

  // ─── Meeting Modal State ────────────────────────────────────────
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingLead, setMeetingLead] = useState(null);
  const [meetingFormData, setMeetingFormData] = useState({
    meetingType: 'Visit',
    meetingDate: '',
    startTime: '',
    endTime: '',
    assignedTo: '',
    meetingWith: '',
    purpose: 'Sales',
    venue: '',
    onlineMeetingUrl: '',
    remarks: '',
    sendInviteEmail: false
  });
  const existingMeetingRef = useRef(null); // ref for sync access in submit handler

  // Form State for Contact Person
  const [contactFormData, setContactFormData] = useState({
    contactPerson: '',
    designation: '',
    department: '',
    email: '',
    mobile: '',
    alternateEmail: '',
    alternateMobile: '',
    address: '',
    country: 'India',
    state: '',
    city: '',
    pincode: '',
    gstNumber: '',
    dob: '',
    anniversary: ''
  });

  // State for Document Upload
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState(null);
  
  // Advanced Filter State
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [limit, setLimit] = useState("20");
  const [sortBy, setSortBy] = useState("date");
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    source: '',
    customerType: '',
    enquiryDateFrom: '',
    enquiryDateTo: '',
    nextFollowUpDateFrom: '',
    nextFollowUpDateTo: '',
    assignedTo: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    productRequired: '',
    source: 'Direct Visit',
    describeRequirements: '',
    contactPerson: '',
    companyName: '',
    country: 'India',
    assignedTo: '',
    state: '',
    city: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    designation: '',
    alternateMobile: '',
    phone: { areaCode: '+91', number: '' },
    alternatePhone: { areaCode: '+91', number: '' },
    alternateEmail: '',
    address: '',
    pincode: '',
    customerType: '',
    gstNumber: '',
    pan: '',
    iec: '',
    tan: '',
    cin: '',
    website: '',
    profile: '',
    reference: ''
  });

  const [isEditBuyerModalOpen, setIsEditBuyerModalOpen] = useState(false);
  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [existingLead, setExistingLead] = useState(null);

  // Constants
  const STAGES = [
    "Call Not Picked",
    "Contacted",
    "Product Qualified",
    "Budget Qualified",
    "Bank Funding",
    "Self Funding",
    "Sent Marketing Data",
    "Quatation Sent",
    "Visit Scheduled",
    "Visited",
    "Deal Closing",
    "Deal Won"
  ];

  const STATUSES = [
    "Hot",
    "Warm",
    "Cold",
    "Pending",
    "Star Lead",
    "Followup"
  ];

  // Pipeline stages for the progress timeline (read-only display)
  const PIPELINE_STAGES = [
    "Call Not Picked",
    "Contacted",
    "Product Qualified",
    "Budget Qualified",
    "Bank Funding",
    "Self Funding",
    "Sent Marketing Data",
    "Quatation Sent",
    "Visit Scheduled",
    "Visited",
    "Deal Closing",
    "Deal Won",
    "Service Verified",
    "Service Rejected"
  ];

  const DISQUALIFY_REASONS = [
    "Payment Term Is Out Of Scope",
    "Freight Charged Are High",
    "Client Is Not Responding",
    "Client Dropped His Purchase Requirement",
    "Quoted Price Is High",
    "Purchased From Local Vendor",
    "Irrelevant Product Enquiry",
    "Low/ Retail Quantity",
    "Delivery Location Is Out Of Scope",
    "Legal Issue",
    "Junk Enquiry",
    "Payment Not Received",
    "Duplicate Leads",
    "Quoted But Delaying Decision",
    "Invalid Contact Number",
    "Not Potential"
  ];

  // Helper Functions
  const formatHistoryDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const formatNoteDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
    return `${day}-${monthName}-${year} ${strTime}`;
  };

  const getVisitedStages = (lead) => {
    const stagesFromHistory = lead.history
      ?.filter(h => h.action === 'Lead Stage Updated')
      ?.map(h => {
        const match = h.notes?.match(/to '([^']+)'/);
        return match ? match[1] : null;
      })
      ?.filter(Boolean) || [];

    const uniqueStages = [...new Set([...stagesFromHistory, lead.stage])];
    return uniqueStages.filter(s => PIPELINE_STAGES.includes(s));
  };

  // Popup / Modal States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusLead, setStatusLead] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [stageLead, setStageLead] = useState(null);
  const [selectedStage, setSelectedStage] = useState('');

  const [isDisqualifyModalOpen, setIsDisqualifyModalOpen] = useState(false);
  const [disqualifyLead, setDisqualifyLead] = useState(null);
  const [selectedDisqualify, setSelectedDisqualify] = useState('');

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notesLead, setNotesLead] = useState(null);
  const [newNoteContent, setNewNoteContent] = useState('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('All');

  // Popup Handlers
  const handleOpenStatusModal = (lead) => {
    setStatusLead(lead);
    setSelectedStatus(lead.status || 'New');
    setIsStatusModalOpen(true);
  };

  const handleOpenStageModal = (lead) => {
    setStageLead(lead);
    // Pre-select current stage (Hot/Warm/Cold/Pending/Star Lead/Followup)
    setSelectedStage(lead.stage && STAGES.includes(lead.stage) ? lead.stage : '');
    setIsStageModalOpen(true);
  };

  const handleOpenDisqualifyModal = (lead) => {
    setDisqualifyLead(lead);
    setSelectedDisqualify('');
    setIsDisqualifyModalOpen(true);
  };

  const handleOpenNotesModal = (lead) => {
    setNotesLead(lead);
    setNewNoteContent('');
    setIsNotesModalOpen(true);
  };

  const handleOpenHistoryModal = (lead) => {
    setHistoryLead(lead);
    setHistoryFilter('All');
    setIsHistoryModalOpen(true);
  };

  // ─── Meeting Handlers ──────────────────────────────────────────
  const handleOpenMeetingModal = (lead) => {
    const defaultAssignedTo = lead.assignedTo?._id || lead.assignedTo || user?._id || '';
    existingMeetingRef.current = null;
    setMeetingLead(lead);
    setMeetingFormData({
      meetingType: 'Visit',
      meetingDate: '',
      startTime: '',
      endTime: '',
      assignedTo: defaultAssignedTo,
      meetingWith: lead.contactPerson || '',
      purpose: 'Sales',
      venue: '',
      onlineMeetingUrl: '',
      remarks: '',
      sendInviteEmail: false
    });
    setIsMeetingModalOpen(true);
  };

  const handleMeetingSubmit = () => {
    if (!meetingLead) return;
    if (!meetingFormData.meetingDate || !meetingFormData.startTime) {
      toast({ title: 'Required', description: 'Meeting date and start time are required', variant: 'destructive' });
      return;
    }
    saveMeetingMutation.mutate({
      leadId: meetingLead._id,
      data: meetingFormData,
      isUpdate: !!existingMeetingRef.current
    });
  };

  const handleStatusSubmit = () => {
    if (!statusLead) return;
    updateLeadMutation.mutate(
      {
        id: statusLead._id,
        data: { status: selectedStatus }
      },
      {
        onSuccess: (data) => {
          // Invalidate and refetch leads data for real-time sync
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.refetchQueries({ queryKey: ['leads'] });
          toast({ title: "Success", description: "Status updated successfully" });
          setIsStatusModalOpen(false);
        }
      }
    );
  };

  const handleStageSubmit = () => {
    if (!stageLead || !selectedStage) return;
    // Stage stores Hot/Warm/Cold/Pending/Star Lead/Followup in lead.stage field
    // Never overwrite system status (Won, New, etc.)
    updateLeadMutation.mutate(
      {
        id: stageLead._id,
        data: { stage: selectedStage }
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.refetchQueries({ queryKey: ['leads'] });
          toast({ title: "Success", description: "Stage updated successfully" });
          setIsStageModalOpen(false);
        }
      }
    );
  };

  const handleDisqualifySubmit = () => {
    if (!disqualifyLead || !selectedDisqualify) {
      toast({ title: "Required", description: "Please select a reason", variant: "destructive" });
      return;
    }
    updateLeadMutation.mutate(
      {
        id: disqualifyLead._id,
        data: { status: selectedDisqualify }
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Lead disqualified successfully" });
          setIsDisqualifyModalOpen(false);
        }
      }
    );
  };

  const handleNoteSubmit = () => {
    if (!notesLead || !newNoteContent.trim()) {
      toast({ title: "Required", description: "Note content cannot be empty", variant: "destructive" });
      return;
    }
    const newNote = {
      content: newNoteContent.trim(),
      userName: user?.fullName || user?.username || 'System User',
      userId: user?._id,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...(notesLead.notes || []), newNote];
    updateLeadMutation.mutate(
      {
        id: notesLead._id,
        data: { notes: updatedNotes }
      },
      {
        onSuccess: (data) => {
          toast({ title: "Success", description: "Note added successfully" });
          setNewNoteContent('');
          const updatedLead = data?.lead || { ...notesLead, notes: updatedNotes };
          setNotesLead(updatedLead);
        }
      }
    );
  };

  // Closure Date / Deal Value Modal
  const [isClosureDealModalOpen, setIsClosureDealModalOpen] = useState(false);
  const [closureDealFormData, setClosureDealFormData] = useState({
    closureDate: '',
    dealValue: '',
    currency: 'INR'
  });
  
  const [reqFormData, setReqFormData] = useState({
    productRequired: '',
    describeRequirements: ''
  });

  // View Checklist Modal (for Sales Employee to see verification status)
  const [isViewChecklistModalOpen, setIsViewChecklistModalOpen] = useState(false);
  const [viewingChecklistOrder, setViewingChecklistOrder] = useState(null);
  const [viewingChecklistLoading, setViewingChecklistLoading] = useState(false);

  const handleViewChecklistStatus = async (lead) => {
    setViewingChecklistLoading(true);
    setIsViewChecklistModalOpen(true);
    setViewingChecklistOrder(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/by-lead/${lead._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.order) {
        setViewingChecklistOrder(data.order);
      } else {
        toast({
          title: "Not Found",
          description: data.message || "No order associated with this deal was found.",
          variant: "destructive"
        });
        setIsViewChecklistModalOpen(false);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to fetch checklist details.",
        variant: "destructive"
      });
      setIsViewChecklistModalOpen(false);
    } finally {
      setViewingChecklistLoading(false);
    }
  };

  // Won Checklist Modal
  const [isWonChecklistModalOpen, setIsWonChecklistModalOpen] = useState(false);
  const [wonChecklistLead, setWonChecklistLead] = useState(null);
  const [salesChecklist, setSalesChecklist] = useState({
    advancePayment: { checked: true, value: 0 },
    installationCharge: { checked: false, value: '' },
    warranty: { checked: false, value: '' },
    boardingLodging: { checked: false, value: '' },
    backupGenerator: { checked: false, value: '' },
    operatorErrorClause: { checked: false }
  });

  const handleOpenWonChecklistModal = (lead) => {
    setWonChecklistLead(lead);
    setSalesChecklist({
      advancePayment: { checked: true, value: lead.advancedPaymentAmount || 0 },
      installationCharge: { checked: false, value: '' },
      warranty: { checked: false, value: '' },
      boardingLodging: { checked: false, value: '' },
      backupGenerator: { checked: false, value: '' },
      operatorErrorClause: { checked: false }
    });
    setIsWonChecklistModalOpen(true);
  };

  const handleWonChecklistSubmit = () => {
    if (!wonChecklistLead) return;
    markAsWonMutation.mutate({
      id: wonChecklistLead._id,
      salesChecklist
    }, {
      onSuccess: () => {
        setIsWonChecklistModalOpen(false);
        setWonChecklistLead(null);
      }
    });
  };

  const handleOpenClosureDealModal = (lead) => {
    setEditingLeadId(lead._id);
    setClosureDealFormData({
      closureDate: lead.closureDate
        ? new Date(lead.closureDate).toISOString().split('T')[0]
        : '',
      dealValue: lead.dealValue || '',
      currency: 'INR'
    });
    setIsClosureDealModalOpen(true);
  };

  const handleSaveClosureDeal = () => {
    if (!editingLeadId) return;
    updateLeadMutation.mutate(
      {
        id: editingLeadId,
        data: {
          closureDate: closureDealFormData.closureDate || null,
          dealValue: closureDealFormData.dealValue
            ? Number(closureDealFormData.dealValue)
            : 0
        }
      },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Closure date & deal value updated' });
          setIsClosureDealModalOpen(false);
        }
      }
    );
  };

  // Tabs for status filtering — Cruncher sees Unassigned Leads tab
  const isCruncher = user?.designationId?.name === 'Cruncher' || user?.designation === 'Cruncher';
  const isSalesHead = ['Sales Head', 'Manager', 'Super Admin', 'Superadmin'].includes(user?.role);

  const tabs = [
    'All Active Leads',
    ...(isCruncher || isSalesHead ? ['Unassigned Leads'] : []),
    'New Leads',
    'Today\'s Follow-up',
    'Pending Follow-up',
    'Upcoming Follow-up',
    'Lead Observer',
    'Customer',
    'Dealer'
  ];

  // Fetch assignable users
  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => leadApi.getUsers(),
  });

const assignableUsers = (usersData?.users || []).filter(
  (user) =>
    user.role === "Sales Head" ||
    user.role === "Sales Employee"
);

  // Fetch items for product selection
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['sales-items'],
    queryFn: () => leadApi.getItems(),
  });

  const availableItems = itemsData?.items || [];

  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['leads', activeTab, searchTerm, limit, sortBy, appliedFilters],
    queryFn: () => leadApi.getAll({
      status: activeTab,
      search: searchTerm,
      limit,
      sortBy,
      ...appliedFilters
    }),
  });

  const leads = leadsData?.leads || [];
  console.log("Leads Data",leads);

  // Fetch Call Logs for the selected lead
  const { data: callLogsData, isLoading: callLogsLoading } = useQuery({
    queryKey: ['call-logs', selectedLead?._id],
    queryFn: () => leadApi.getCallLogs(selectedLead?._id),
    enabled: !!selectedLead?._id && isRecordingModalOpen
  });

  const callLogs = callLogsData?.callLogs || [];

  // ─── Meeting Query (cached per lead) ─────────────────────────
  const { data: meetingQueryData, isLoading: meetingFetching } = useQuery({
    queryKey: ['meeting', meetingLead?._id],
    queryFn: () => leadApi.getMeeting(meetingLead._id),
    enabled: !!meetingLead?._id && isMeetingModalOpen,
    staleTime: 30 * 1000, // 30s cache — instant on re-open
  });

  // Populate form when meeting data arrives
  useEffect(() => {
    if (!isMeetingModalOpen || !meetingLead) return;
    const m = meetingQueryData?.meeting;
    const defaultAssignedTo = meetingLead.assignedTo?._id || meetingLead.assignedTo || user?._id || '';
    if (m) {
      existingMeetingRef.current = m;
      setMeetingFormData({
        meetingType: m.meetingType || 'Visit',
        meetingDate: m.meetingDate ? new Date(m.meetingDate).toISOString().split('T')[0] : '',
        startTime: m.startTime || '',
        endTime: m.endTime || '',
        assignedTo: m.assignedTo?._id || m.assignedTo || defaultAssignedTo,
        meetingWith: m.meetingWith || meetingLead.contactPerson || '',
        purpose: m.purpose || 'Sales',
        venue: m.venue || '',
        onlineMeetingUrl: m.onlineMeetingUrl || '',
        remarks: m.remarks || '',
        sendInviteEmail: false
      });
    } else if (!meetingFetching) {
      // Query done, no meeting exists — keep blank form
      existingMeetingRef.current = null;
    }
  }, [meetingQueryData, meetingFetching, isMeetingModalOpen]);

  // ─── Meeting Save/Update Mutation ─────────────────────────────
  const saveMeetingMutation = useMutation({
    mutationFn: ({ leadId, data, isUpdate }) =>
      isUpdate ? leadApi.updateMeeting(leadId, data) : leadApi.scheduleMeeting(leadId, data),
    onSuccess: (_, { isUpdate }) => {
      toast({ title: 'Success', description: isUpdate ? 'Meeting updated successfully' : 'Meeting scheduled successfully' });
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingLead?._id] });
      setIsMeetingModalOpen(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err?.message || 'Failed to save meeting', variant: 'destructive' });
    }
  });

  // IndiaMart Sync Mutation
  const syncIndiamartMutation = useMutation({
    mutationFn: leadApi.syncIndiamart,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "IndiaMart Sync Success",
        description: res.message || "Leads synchronized successfully."
      });
    },
    onError: (error) => {
      const is400 = error?.status === 400 || error?.message?.includes('not configured') || error?.message?.includes('disabled');
      toast({
        title: "IndiaMart Sync Failed",
        description: is400
          ? "IndiaMART API configured nahi hai. Super Admin → API Settings se configure karein."
          : error?.message || "Could not sync leads.",
        variant: "destructive"
      });
    }
  });

  // IVR Sync Mutation — kept for manual sync if needed
  const syncIvrMutation = useMutation({
    mutationFn: leadApi.syncIvr,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "IVR Sync Success",
        description: res.message || "Leads synchronized successfully."
      });
    },
    onError: (error) => {
      const is400 = error?.status === 400 || error?.message?.includes('not configured') || error?.message?.includes('disabled');
      toast({
        title: "IVR Sync Failed",
        description: is400
          ? "Acefone IVR API configured nahi hai. Super Admin → API Settings se configure karein."
          : error?.message || "Could not sync leads.",
        variant: "destructive"
      });
    }
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: leadApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Success", description: "Lead created successfully" });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create lead",
        variant: "destructive"
      });
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => leadApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Success", description: "Buyer details updated successfully" });
      setIsEditBuyerModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update details",
        variant: "destructive"
      });
    }
  });

  const markAsWonMutation = useMutation({
    mutationFn: ({ id, salesChecklist }) => leadApi.markAsWon(id, salesChecklist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Success", description: "Lead converted to Customer and Order created successfully!" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark lead as won",
        variant: "destructive"
      });
    }
  });

  const requestPaymentCheckMutation = useMutation({
    mutationFn: (id) => leadApi.requestPaymentCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Success", description: "Payment check requested successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to request payment check",
        variant: "destructive"
      });
    }
  });

  // Go to Account Modal States
  const [isGoToAccountModalOpen, setIsGoToAccountModalOpen] = useState(false);
  const [goToAccountLead, setGoToAccountLead] = useState(null);
  const [goToAccountFiles, setGoToAccountFiles] = useState({ po: null, paymentProof: null, quotation: null });

  const handleOpenGoToAccountModal = (lead) => {
    setGoToAccountLead(lead);
    setGoToAccountFiles({ po: null, paymentProof: null, quotation: null });
    setIsGoToAccountModalOpen(true);
  };

  const goToAccountMutation = useMutation({
    mutationFn: (id) => leadApi.sendToAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Success", description: "Lead sent to Account successfully" });
      setIsGoToAccountModalOpen(false);
      setGoToAccountLead(null);
      setGoToAccountFiles({ po: null, paymentProof: null, quotation: null });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send lead to account",
        variant: "destructive"
      });
    }
  });

  const uploadLeadDocsMutation = useMutation({
    mutationFn: ({ id, files }) => leadApi.uploadLeadDocuments(id, files),
    onSuccess: (_, { id }) => {
      // After docs uploaded, send lead to account
      goToAccountMutation.mutate(id);
    },
    onError: (error) => {
      toast({
        title: "Upload Error",
        description: error?.message || "Failed to upload documents",
        variant: "destructive"
      });
    }
  });

  // Mutation for adding a single document in Manage Document List modal
  const addDocumentMutation = useMutation({
    mutationFn: ({ id, docType, file }) => leadApi.addLeadDocument(id, docType, file),
    onSuccess: (data) => {
      // Update selectedLead state with new documents list so UI refreshes immediately
      setSelectedLead(prev => ({ ...prev, documents: data.documents }));
      // Also invalidate leads query so the data is fresh on next open
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDocType('');
      setDocFile(null);
      toast({ title: 'Success', description: 'Document uploaded successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Upload Error',
        description: error?.message || 'Failed to upload document',
        variant: 'destructive'
      });
    }
  });

  const handleGoToAccountSubmit = () => {
    if (!goToAccountLead) return;
    // Quotation and Payment Proof are required
    if (!goToAccountFiles.quotation) {
      toast({ title: "Required", description: "Please upload Quotation before sending to Account.", variant: "destructive" });
      return;
    }
    if (!goToAccountFiles.paymentProof) {
      toast({ title: "Required", description: "Please upload Payment Proof / Screenshot before sending to Account.", variant: "destructive" });
      return;
    }
    // PO is optional — always upload (at least quotation + paymentProof are present)
    uploadLeadDocsMutation.mutate({ id: goToAccountLead._id, files: goToAccountFiles });
  };  const handleEditBuyerClick = (lead) => {
    setEditingLeadId(lead._id);
    setFormData({
      ...formData,
      email: lead.email || '',
      mobile: lead.mobile || '',
      contactPerson: lead.contactPerson || '',
      companyName: lead.companyName || '',
      country: lead.country || 'India',
      state: lead.state || '',
      city: lead.city || '',
      designation: lead.designation || '',
      alternateMobile: lead.alternateMobile || '',
      address: lead.address || '',
      pincode: lead.pincode || '',
      website: lead.website || '',
      gstNumber: lead.gstNumber || '',
      pan: lead.pan || '',
      customerType: lead.customerType || '',
      productRequired: lead.productRequired || '',
      source: lead.source || 'Direct Visit',
      assignedTo: lead.assignedTo?._id || lead.assignedTo || user?._id || ''
    });
    setIsEditBuyerModalOpen(true);
  };

  const handleEditReqClick = (lead) => {
    setEditingLeadId(lead._id);
    setReqFormData({
      productRequired: lead.productRequired || '',
      describeRequirements: lead.describeRequirements || ''
    });
    setIsEditReqModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setStep(1);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setStep(1);
    setFormData({
      email: '',
      mobile: '',
      productRequired: '',
      source: 'Direct Visit',
      describeRequirements: '',
      contactPerson: '',
      companyName: '',
      country: 'India',
      assignedTo: '',
      state: '',
      city: '',
      enquiryDate: new Date().toISOString().split('T')[0],
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      designation: '',
      alternateMobile: '',
      phone: { areaCode: '+91', number: '' },
      alternatePhone: { areaCode: '+91', number: '' },
      alternateEmail: '',
      address: '',
      pincode: '',
      customerType: '',
      gstNumber: '',
      pan: '',
      iec: '',
      tan: '',
      cin: '',
      website: '',
      profile: '',
      reference: ''
    });
    setExistingLead(null);
  };

  // ─── Validation Helpers ────────────────────────────────────────
  const isValidEmail = (email) => {
    if (!email) return true; // optional unless mobile also empty
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const isValidMobile = (mobile) => {
    if (!mobile) return true; // optional unless email also empty
    return /^[0-9]{10}$/.test(mobile.trim());
  };

  const isTextOnly = (value) => {
    return /^[a-zA-Z\s\-'.(),&]*$/.test(value);
  };

  const isNumbersOnly = (value) => {
    return /^[0-9]*$/.test(value);
  };

  const handleInitialCheck = async () => {
    if (!formData.email && !formData.mobile) {
      toast({ title: "Required", description: "Email ya Mobile number mein se ek zaroor enter karein", variant: "destructive" });
      return;
    }
    if (formData.email && !isValidEmail(formData.email)) {
      toast({ title: "Invalid Email", description: "Sahi email format enter karein (e.g. user@example.com)", variant: "destructive" });
      return;
    }
    if (formData.mobile && !isValidMobile(formData.mobile)) {
      toast({ title: "Invalid Mobile", description: "Mobile number sirf 10 digits ka hona chahiye (sirf numbers)", variant: "destructive" });
      return;
    }

    try {
      const response = await leadApi.checkExisting({
        email: formData.email,
        mobile: formData.mobile
      });

      if (response.exists) {
        setExistingLead(response.lead);
        toast({
          title: "Lead Exists",
          description: `This lead already exists (ID: ${response.lead.leadCode})`,
        });
      } else {
        setStep(2);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to check lead", variant: "destructive" });
    }
  };

  const handleNextStep = () => {
    if (step === 2) {
      // Required fields check
      if (!formData.productRequired) {
        toast({ title: "Required", description: "Product / Service Required field fill karein", variant: "destructive" });
        return;
      }
      if (!formData.contactPerson) {
        toast({ title: "Required", description: "Contact Person fill karein", variant: "destructive" });
        return;
      }
      if (!formData.companyName) {
        toast({ title: "Required", description: "Company Name fill karein", variant: "destructive" });
        return;
      }
      if (!formData.assignedTo) {
        toast({ title: "Required", description: "Assign To field select karein", variant: "destructive" });
        return;
      }
      if (!formData.enquiryDate) {
        toast({ title: "Required", description: "Enquiry Received Date fill karein", variant: "destructive" });
        return;
      }
      if (!formData.nextFollowUpDate) {
        toast({ title: "Required", description: "Next Follow Up Date fill karein", variant: "destructive" });
        return;
      }
      // Text-only fields
      if (formData.contactPerson && !isTextOnly(formData.contactPerson)) {
        toast({ title: "Invalid Input", description: "Contact Person mein sirf text enter karein (numbers allowed nahi)", variant: "destructive" });
        return;
      }
      if (formData.state && !/^[a-zA-Z\s\-'.]*$/.test(formData.state)) {
        toast({ title: "Invalid Input", description: "State mein sirf text enter karein", variant: "destructive" });
        return;
      }
      if (formData.city && !/^[a-zA-Z\s\-'.]*$/.test(formData.city)) {
        toast({ title: "Invalid Input", description: "City mein sirf text enter karein", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Step 3 final submit validation
    if (!formData.productRequired) {
      toast({ title: "Required", description: "Product / Service Required field fill karein", variant: "destructive" });
      return;
    }
    if (!formData.contactPerson) {
      toast({ title: "Required", description: "Contact Person fill karein", variant: "destructive" });
      return;
    }
    if (!formData.companyName) {
      toast({ title: "Required", description: "Company Name fill karein", variant: "destructive" });
      return;
    }
    // Text-only fields validation
    if (formData.contactPerson && !isTextOnly(formData.contactPerson)) {
      toast({ title: "Invalid Input", description: "Contact Person mein sirf text enter karein", variant: "destructive" });
      return;
    }
    if (formData.designation && !isTextOnly(formData.designation)) {
      toast({ title: "Invalid Input", description: "Designation mein sirf text enter karein", variant: "destructive" });
      return;
    }
    if (formData.state && !/^[a-zA-Z\s\-'.]*$/.test(formData.state)) {
      toast({ title: "Invalid Input", description: "State mein sirf text enter karein", variant: "destructive" });
      return;
    }
    if (formData.city && !/^[a-zA-Z\s\-'.]*$/.test(formData.city)) {
      toast({ title: "Invalid Input", description: "City mein sirf text enter karein", variant: "destructive" });
      return;
    }
    // Alternate mobile validation
    if (formData.alternateMobile && !isValidMobile(formData.alternateMobile)) {
      toast({ title: "Invalid Alternate Mobile", description: "Alternate Mobile sirf 10 digits ka hona chahiye", variant: "destructive" });
      return;
    }
    // Alternate email validation
    if (formData.alternateEmail && !isValidEmail(formData.alternateEmail)) {
      toast({ title: "Invalid Alternate Email", description: "Sahi alternate email format enter karein", variant: "destructive" });
      return;
    }
    // Pincode validation — max 6 digits, numbers only
    if (formData.pincode && !/^[0-9]{1,6}$/.test(formData.pincode)) {
      toast({ title: "Invalid Pincode", description: "Pincode mein sirf numbers enter karein (max 6 digits)", variant: "destructive" });
      return;
    }
    // GST format
    if (formData.gstNumber && !/^[0-9A-Z]{15}$/.test(formData.gstNumber.toUpperCase())) {
      toast({ title: "Invalid GST", description: "GST Number 15 characters ka hona chahiye (alphanumeric)", variant: "destructive" });
      return;
    }
    // PAN format
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) {
      toast({ title: "Invalid PAN", description: "PAN format sahi nahi hai (e.g. ABCDE1234F)", variant: "destructive" });
      return;
    }
    // Website validation
    if (formData.website && !/^(https?:\/\/)?([\w\-]+\.)+[\w]{2,}(\/.*)?$/.test(formData.website)) {
      toast({ title: "Invalid Website", description: "Website ka sahi URL enter karein (e.g. https://www.example.com)", variant: "destructive" });
      return;
    }
    // Profile text only
    if (formData.profile && !isTextOnly(formData.profile)) {
      toast({ title: "Invalid Input", description: "Profile mein sirf text enter karein", variant: "destructive" });
      return;
    }
    createLeadMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // ─── Live Input Restrictions ────────────────────────────────
    // Mobile fields: sirf numbers, max 10 digits
    if (name === 'mobile') {
      if (!/^[0-9]*$/.test(value)) return; // only digits
      if (value.length > 10) return;       // max 10
    }
    if (name === 'alternateMobile') {
      if (!/^[0-9]*$/.test(value)) return;
      if (value.length > 10) return;
    }
    // Pincode: sirf numbers, max 6
    if (name === 'pincode') {
      if (!/^[0-9]*$/.test(value)) return;
      if (value.length > 6) return;
    }
    // Text-only fields: no numbers allowed
    if (['contactPerson', 'state', 'city', 'designation', 'profile'].includes(name)) {
      if (value !== '' && !/^[a-zA-Z\s\-'.,()&]*$/.test(value)) return;
    }
    // GST: alphanumeric uppercase, max 15
    if (name === 'gstNumber') {
      if (!/^[0-9a-zA-Z]*$/.test(value)) return;
      if (value.length > 15) return;
    }
    // PAN: alphanumeric uppercase, max 10
    if (name === 'pan') {
      if (!/^[0-9a-zA-Z]*$/.test(value)) return;
      if (value.length > 10) return;
    }
    // TAN: alphanumeric, max 10
    if (name === 'tan') {
      if (!/^[0-9a-zA-Z]*$/.test(value)) return;
      if (value.length > 10) return;
    }
    // IEC: alphanumeric, max 10
    if (name === 'iec') {
      if (!/^[0-9a-zA-Z]*$/.test(value)) return;
      if (value.length > 10) return;
    }
    // CIN/LLPIN: alphanumeric, max 21
    if (name === 'cin') {
      if (!/^[0-9a-zA-Z]*$/.test(value)) return;
      if (value.length > 21) return;
    }
    // ─────────────────────────────────────────────────────────────

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setIsFilterDialogOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters = {
      state: '',
      city: '',
      source: '',
      customerType: '',
      enquiryDateFrom: '',
      enquiryDateTo: '',
      nextFollowUpDateFrom: '',
      nextFollowUpDateTo: '',
      assignedTo: ''
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setIsFilterDialogOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manage Leads</h1>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "bg-white border-blue-200 text-blue-600 hover:bg-blue-50",
              Object.values(appliedFilters).some(v => v) && "bg-blue-50 border-blue-400"
            )}
            onClick={() => setIsFilterDialogOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters {Object.values(appliedFilters).filter(v => v).length > 0 && `(${Object.values(appliedFilters).filter(v => v).length})`}
          </Button>

          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Leads
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 font-medium"
            onClick={() => syncIndiamartMutation.mutate()}
            disabled={syncIndiamartMutation.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncIndiamartMutation.isPending && "animate-spin")} />
            Sync IndiaMart
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Show Result</span>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue placeholder="20" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-gray-500">Sort by</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Select One" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="value">Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {tabs.map((tab) => (
            <div
              key={tab}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveTab(tab)}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                activeTab === tab ? "border-blue-600" : "border-gray-300"
              )}>
                {activeTab === tab && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <span className={cn(
                "text-sm font-medium",
                activeTab === tab ? "text-blue-600" : "text-gray-600"
              )}>
                {tab}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leads List Section */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
            <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Leads Found</h3>
            <p className="text-gray-400 mt-2">Start adding leads to manage your sales pipeline.</p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Lead
            </Button>
          </div>
        ) : (
          leads.map((lead) => (
    
            <Card key={lead._id} className="shadow-sm border-gray-100 hover:border-blue-200 transition-colors">
              <CardContent className="p-0">
                {/* Main Card Content */}
                <div className="flex flex-col lg:flex-row p-4 gap-6">
                  {/* Left Section - Core Details */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-4">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Lead ID</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-blue-600">#{lead.leadCode}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Lead Date</span>
                        <span className="text-gray-700">{new Date(lead.leadDate).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          Closure Date
                          <Pencil
                            className="h-3 w-3 cursor-pointer text-blue-500 hover:text-blue-700 transition-colors"
                            onClick={() => handleOpenClosureDealModal(lead)}
                          />
                        </span>
                        <span className="text-gray-700">{lead.closureDate ? new Date(lead.closureDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          Deal Value
                          <Pencil
                            className="h-3 w-3 cursor-pointer text-blue-500 hover:text-blue-700 transition-colors"
                            onClick={() => handleOpenClosureDealModal(lead)}
                          />
                        </span>
                        <span className="text-gray-700">{lead.dealValue ? `₹${lead.dealValue}` : 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Quotation</span>
                        <div className="flex items-center h-5">
                          {lead.hasQuotation ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-blue-600 hover:bg-blue-50 text-[10px] -ml-2"
                              onClick={async () => {
                                // Open window FIRST (must be synchronous during click event)
                                // so the browser doesn't block it as a popup
                                const win = window.open('', '_blank');
                                if (!win) {
                                  toast({ title: "Popup Blocked", description: "Please allow popups for this site and try again.", variant: "destructive" });
                                  return;
                                }
                                win.document.write(`<!DOCTYPE html><html><head><title>Loading Quotation...</title><style>body{display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;background:#f9f9f9;}</style></head><body><p>⏳ Loading quotation, please wait...</p></body></html>`);
                                try {
                                  const token = localStorage.getItem('token');
                                  const res = await fetch(`/api/leads/${lead._id}/quotation`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  if (!res.ok) throw new Error(`Server error: ${res.status}`);
                                  const data = await res.json();
                                  let base64String = data.quotation;
                                  if (!base64String) throw new Error('No quotation data returned');
                                  // Ensure it has the proper data URI prefix
                                  if (!base64String.startsWith('data:')) {
                                    base64String = `data:application/pdf;base64,${base64String}`;
                                  }
                                  win.document.open();
                                  win.document.write(`<!DOCTYPE html><html><head><title>Quotation - ${lead.leadCode}</title><style>*{margin:0;padding:0;box-sizing:border-box}body,html{height:100%;overflow:hidden}</style></head><body><iframe src="${base64String}" frameborder="0" style="width:100%;height:100vh;border:none;display:block;"></iframe></body></html>`);
                                  win.document.close();
                                } catch (error) {
                                  console.error("Failed to load quotation", error);
                                  win.document.open();
                                  win.document.write(`<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:red;"><p>❌ Failed to load quotation. Please close this tab and try again.</p></body></html>`);
                                  win.document.close();
                                  toast({ title: "Error", description: "Failed to load quotation. Please try again.", variant: "destructive" });
                                }
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Icons Row */}
                    <div className="flex items-center gap-4 mt-2 mb-3 px-1 border-b border-gray-100 pb-2">
                      {/* Star Button - Active when status has been changed */}
                      <button 
                        onClick={() => handleOpenStatusModal(lead)} 
                        className={cn(
                          "transition-colors",
                          (lead.status === 'Star Lead' || lead.status === 'Hot') 
                            ? "text-yellow-500 animate-none" 
                            : lead.status && lead.status !== 'New' 
                              ? "text-yellow-400 hover:text-yellow-500" 
                              : "text-gray-400 hover:text-yellow-500 animate-pulse"
                        )}
                        title="Change Status"
                      >
                        <Star className={cn(
                          "h-5 w-5", 
                          (lead.status === 'Star Lead' || lead.status === 'Hot') 
                            ? "fill-yellow-500 text-yellow-500" 
                            : lead.status && lead.status !== 'New'
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400"
                        )} />
                      </button>
                      
                      {/* Thumbs Up Button - Active when stage/status has been set */}
                      <button 
                        onClick={() => handleOpenStageModal(lead)} 
                        className={cn(
                          "transition-colors",
                          lead.stage && STAGES.includes(lead.stage)
                            ? "text-green-600 hover:text-green-700"
                            : "text-gray-400 hover:text-green-600"
                        )}
                        title="Change Stage"
                      >
                        <ThumbsUp className={cn(
                          "h-5 w-5",
                          lead.stage && STAGES.includes(lead.stage)
                            ? "fill-green-600 text-green-600"
                            : "text-gray-400"
                        )} />
                      </button>
                      
                      {/* Thumbs Down Button - Active when lead is disqualified */}
                      <button 
                        onClick={() => handleOpenDisqualifyModal(lead)} 
                        className={cn(
                          "transition-colors",
                          DISQUALIFY_REASONS.includes(lead.status)
                            ? "text-red-600 hover:text-red-700"
                            : "text-gray-400 hover:text-red-600"
                        )}
                        title="Disqualify Lead"
                      >
                        <ThumbsDown className={cn(
                          "h-5 w-5",
                          DISQUALIFY_REASONS.includes(lead.status)
                            ? "fill-red-600 text-red-600"
                            : "text-gray-400"
                        )} />
                      </button>
                      
                      {/* Notes Button with green badge */}
                      <button 
                        onClick={() => handleOpenNotesModal(lead)} 
                        className={cn(
                          "relative transition-colors",
                          lead.notes?.length > 0
                            ? "text-blue-500 hover:text-blue-600"
                            : "text-gray-400 hover:text-blue-500"
                        )}
                        title="Notes"
                      >
                        <MessageSquare className="h-5 w-5" />
                        {lead.notes?.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-md border-2 border-white">
                            {lead.notes.length}
                          </span>
                        )}
                      </button>
                      
                      {/* Message Button (unclickable) */}
                      <button disabled className="text-gray-200 cursor-not-allowed" title="Message (Disabled)">
                        <Mail className="h-5 w-5" />
                      </button>
                      
                      {/* Lead History Button */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2.5 text-xs bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 rounded-md flex items-center"
                        onClick={() => handleOpenHistoryModal(lead)}
                      >
                        <History className="h-3.5 w-3.5 mr-1" />
                        Lead History
                      </Button>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-blue-600 font-bold text-lg flex items-center">
                        {lead.productRequired}
                        <Edit 
                          className="h-4 w-4 ml-2 cursor-pointer text-gray-400 hover:text-blue-600" 
                          onClick={() => handleEditReqClick(lead)}
                        />
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-bold">Product Required:</span> {lead.productRequired}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {lead.describeRequirements || "I'm interested in buying this product. Kindly send us the details."}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Contact & Icons */}
                  <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6 flex flex-col">
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">From: {lead.contactPerson}</p>
                          <p className="text-xs text-gray-500 mt-1">Mobile: {lead.mobile}</p>
                          <p className="text-xs text-gray-500">Email: {lead.email}</p>
                          <p className="text-xs text-gray-500">Location: {lead.city}, {lead.state}, {lead.country}</p>
                          <p className="text-xs text-gray-500">Buyer Type: {lead.customerType || 'N/A'}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 text-xs bg-red-50 text-red-600 border-red-100"
                          onClick={() => handleEditBuyerClick(lead)}
                        >
                          Edit <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        title="Company Details"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsCompanyModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        title="Documents"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDocumentModalOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        title="Add Contact"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsAddContactModalOpen(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        title="Buyer Type"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsBuyerTypeModalOpen(true);
                        }}
                      >
                        <Briefcase className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600"
                        title="Recordings"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsRecordingModalOpen(true);
                        }}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Progress timeline — full width below left+right sections */}
                {lead.stage && lead.stage !== 'N/A' && PIPELINE_STAGES.includes(lead.stage) && (
                  <div className="px-4 pb-3 border-t border-gray-50 overflow-x-auto scrollbar-thin">
                    <div className="flex items-center min-w-max gap-0 py-2 px-1">
                      {getVisitedStages(lead).map((stageName, index, arr) => {
                        const isCurrent = stageName === lead.stage;
                        const isRejected = stageName === 'Service Rejected';
                        const isVerified = stageName === 'Service Verified';
                        return (
                          <React.Fragment key={stageName}>
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm",
                                isRejected ? "bg-red-500" :
                                  isVerified ? "bg-teal-500" :
                                    "bg-green-500"
                              )}>
                                {isCurrent ? "..." : isRejected ? "✗" : "✓"}
                              </div>
                              <span className={cn(
                                "text-[9px] font-semibold uppercase mt-1.5 tracking-wide whitespace-nowrap",
                                isRejected ? "text-red-500" :
                                  isVerified ? "text-teal-600" :
                                    "text-gray-500"
                              )}>
                                {stageName}
                              </span>
                            </div>
                            {index < arr.length - 1 && (
                              <div className={cn(
                                "h-[2px] flex-1 min-w-[50px] max-w-[100px] mx-2",
                                isRejected ? "bg-red-400" : "bg-green-500"
                              )} style={{ marginTop: '-14px' }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-50 bg-white">
                  <Button variant="outline" size="sm" className="h-8 text-xs bg-gray-50">Email Reply</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full">Call Attempts</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full">Meeting Attempts</Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 text-xs rounded-full bg-blue-600"
                      onClick={() => setLocation(`/sales/quotation?lead_id=${lead._id}`)}
                      disabled={lead.status === 'Won'}
                    >
                      {lead.hasQuotation  ? 'Update Quotation' : 'Send Quotation'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs rounded-full bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                      onClick={() => {
                        if (!lead.hasQuotation) {
                          toast({ title: "Required", description: "Please send a quotation first.", variant: "destructive" });
                          return;
                        }
                        requestPaymentCheckMutation.mutate(lead._id);
                      }}
                      disabled={requestPaymentCheckMutation.isPending && requestPaymentCheckMutation.variables === lead._id}
                    >
                      {lead.paymentCheckStatus === 'Pending' ? 'Verification Pending' :
                       lead.paymentCheckStatus === 'Paid' ? 'Payment Verified' :
                       lead.paymentCheckStatus === 'Partially Paid' ? 'Partial Payment Verified' :
                       'Check Payment'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs rounded-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      onClick={() => handleOpenGoToAccountModal(lead)}
                      disabled={lead.sentToAccount || goToAccountMutation.isPending || uploadLeadDocsMutation.isPending}
                    >
                      <Briefcase className="h-3 w-3 mr-1" />
                      {lead.sentToAccount ? 'Sent to Account' : 'Go to Account'}
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-8 text-xs rounded-full",
                        lead.status === 'Won' 
                          ? "bg-green-600 text-white border-green-600 hover:bg-green-700" 
                          : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      )}
                      onClick={() => {
                        if (lead.status !== 'Won') {
                          if (!lead.hasQuotation) {
                            toast({
                              title: "Quotation Required",
                              description: "Please send a quotation before marking the deal as Won.",
                              variant: "destructive"
                            });
                            return;
                          }
                          handleOpenWonChecklistModal(lead);
                        }
                      }}
                      disabled={(markAsWonMutation.isPending && markAsWonMutation.variables?.id === lead._id) || lead.status === 'Won'}
                    >
                      {lead.status === 'Won' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Deal Won
                        </span>
                      ) : (
                        (markAsWonMutation.isPending && markAsWonMutation.variables?.id === lead._id) ? 'Processing...' : 'Deal Won'
                      )}
                    </Button>

                    {(lead.status === 'Won' || lead.stage === 'Service Verified') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] rounded-full bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold"
                        onClick={() => handleViewChecklistStatus(lead)}
                        title="View Checklist Status"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Checklist
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bottom Bar - Stats */}
                <div className="bg-gray-50 p-2 border-t border-gray-100 grid grid-cols-2 md:grid-cols-8 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Next Follow-up</span>
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <span>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'dd-mm-yyyy'}</span>
                      <Calendar className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned to</span>
                    {/* Cruncher / Sales Head: inline quick-assign dropdown */}
                    {(isCruncher || isSalesHead) ? (
                      <select
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 mt-0.5 bg-white text-gray-700 cursor-pointer hover:border-blue-400 focus:outline-none focus:border-blue-500 max-w-[130px]"
                        value={lead.assignedTo?._id || lead.assignedTo || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLeadMutation.mutate(
                            { id: lead._id, data: { assignedTo: val || null } },
                            {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['leads'] });
                                toast({ title: 'Assigned', description: val ? 'Lead assigned successfully' : 'Lead unassigned' });
                              }
                            }
                          );
                        }}
                      >
                        <option value="">— Unassigned —</option>
                        {assignableUsers.map(u => (
                          <option key={u._id} value={u._id}>{u.fullName || u.username}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium mt-0.5 ${lead.assignedTo ? 'text-gray-700' : 'text-amber-600'}`}>
                        {lead.assignedTo?.fullName || '⚠ Unassigned'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stage</span>
                    <span className={cn(
                      "text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full w-fit",
                      lead.stage?.toLowerCase() === 'hot' ? "bg-red-100 text-red-700" :
                        lead.stage?.toLowerCase() === 'warm' ? "bg-orange-100 text-orange-700" :
                          lead.stage?.toLowerCase() === 'cold' ? "bg-sky-100 text-sky-700" :
                            lead.stage?.toLowerCase() === 'star lead' ? "bg-yellow-100 text-yellow-700" :
                              lead.stage?.toLowerCase() === 'followup' ? "bg-violet-100 text-violet-700" :
                                lead.stage?.toLowerCase() === 'pending' ? "bg-amber-100 text-amber-700" :
                                  lead.stage === 'Service Verified' ? "bg-teal-100 text-teal-700" :
                                    lead.stage === 'Service Rejected' ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                    )}>
                      {lead.stage || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</span>
                    <span className={cn(
                      "text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full w-fit",
                      lead.status?.toLowerCase() === 'hot' ? "bg-red-100 text-red-700" :
                        lead.status?.toLowerCase() === 'warm' ? "bg-orange-100 text-orange-700" :
                          lead.status?.toLowerCase() === 'cold' ? "bg-sky-100 text-sky-700" :
                            lead.status?.toLowerCase() === 'star lead' ? "bg-yellow-100 text-yellow-700" :
                              lead.status?.toLowerCase() === 'followup' ? "bg-violet-100 text-violet-700" :
                                lead.status?.toLowerCase() === 'pending' ? "bg-amber-100 text-amber-700" :
                                  lead.status?.toLowerCase() === 'won' ? "bg-green-100 text-green-700" :
                                    "bg-blue-100 text-blue-700"
                    )}>
                      {lead.status || 'New'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Source</span>
                    <span className="text-xs text-gray-700 line-clamp-1">{lead.source}</span>
                  </div>
                  <div className="flex flex-col col-span-2 md:col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Observer</span>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{lead.observer?.fullName || 'N/A'}</span>
                      <div className="flex items-center bg-white border border-gray-200 rounded shadow-sm overflow-hidden ml-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-600"
                          onClick={() => {
                            setDialpadLead(lead);
                            setDialpadInput(lead.mobile || '');
                            setIsDialpadOpen(true);
                          }}
                          title="Call Lead"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-green-50 text-green-600"
                          onClick={() => window.open(`https://wa.me/${lead.mobile?.replace(/\D/g, '')}`)}
                          title="WhatsApp Message"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-700"
                          onClick={() => window.open(`mailto:${lead.email}`)}
                          title="Send Email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-8 rounded-none hover:bg-purple-50 text-purple-600"
                          title="Schedule Meeting"
                          onClick={() => handleOpenMeetingModal(lead)}
                        >
                          <Handshake className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Multi-step Add Lead Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className={cn(
          "transition-all duration-300 overflow-hidden p-0",
          step === 1 ? "max-w-md" : "max-w-6xl"
        )}>
          {/* Progress Indicator for Step 2 and 3 */}
          {step > 1 && (
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{step === 2 ? "Add A New Leads" : "Buyer's Company Details"}</h2>
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-12 rounded-full", step >= 2 ? "bg-white" : "bg-blue-400")} />
                <div className={cn("h-2 w-12 rounded-full", step >= 3 ? "bg-white" : "bg-blue-400")} />
                <button onClick={handleCloseModal} className="ml-4 hover:bg-blue-700 p-1 rounded">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}

          <div className="p-6 overflow-y-auto max-h-[85vh]">
            {/* Step 1: Mandatory Check */}
            {step === 1 && (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Add New Lead</DialogTitle>
                  <button onClick={handleCloseModal} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </DialogHeader>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-blue-700 text-sm font-medium">
                  Buyer's Email ID or Mobile number is mandatory to add a new lead
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter email (e.g. user@example.com)"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="font-bold">Mobile</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      maxLength={10}
                      inputMode="numeric"
                    />
                    {formData.mobile && formData.mobile.length > 0 && formData.mobile.length < 10 && (
                      <p className="text-xs text-amber-600">{10 - formData.mobile.length} aur digits chahiye</p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold"
                  onClick={handleInitialCheck}
                >
                  Save & Proceed
                </Button>
              </div>
            )}

            {/* Step 2: Basic Lead Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2 relative">
                    <Label className="font-bold">Product / Service Required <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        name="productRequired"
                        placeholder="Search Product..."
                        value={formData.productRequired}
                        onChange={(e) => {
                          handleInputChange(e);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        onBlur={() => {
                          // Delay hiding to allow click event on dropdown items
                          setTimeout(() => setShowProductDropdown(false), 200);
                        }}
                        className="border-gray-300"
                        autoComplete="off"
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>

                    {showProductDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {itemsLoading ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
                            Loading items...
                          </div>
                        ) : availableItems.filter(item =>
                          item.name.toLowerCase().includes(formData.productRequired.toLowerCase()) ||
                          item.code.toLowerCase().includes(formData.productRequired.toLowerCase())
                        ).length > 0 ? (
                          availableItems
                            .filter(item =>
                              item.name.toLowerCase().includes(formData.productRequired.toLowerCase()) ||
                              item.code.toLowerCase().includes(formData.productRequired.toLowerCase())
                            )
                            .map((item) => (
                              <div
                                key={item._id}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                                onMouseDown={(e) => {
                                  // Prevent input from losing focus immediately
                                  e.preventDefault();
                                  setFormData(prev => ({ ...prev, productRequired: item.name }));
                                  setShowProductDropdown(false);
                                }}
                              >
                                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-4 bg-gray-50">{item.code}</Badge>
                                  <span className="text-[10px] text-gray-500">{item.category}</span>
                                  {item.salePrice && <span className="text-[10px] text-blue-600 font-bold ml-auto">₹{item.salePrice}</span>}
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {formData.productRequired ? `No products found matching "${formData.productRequired}"` : "No products available"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select Source <span className="text-red-500">*</span></Label>
                    <Select value={formData.source} onValueChange={(val) => setFormData(p => ({ ...p, source: val }))}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="-- Select Source --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct Visit">Direct Visit</SelectItem>
                        <SelectItem value="IndiaMART">IndiaMART</SelectItem>
                        <SelectItem value="TradeIndia">TradeIndia</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Describe Requirements</Label>
                    <textarea
                      name="describeRequirements"
                      className="w-full min-h-[100px] border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter detailed requirements..."
                      value={formData.describeRequirements}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Attach File (if any)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" className="cursor-pointer border-gray-300" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Email ID</Label>
                    <Input value={formData.email} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Mobile</Label>
                    <Input value={formData.mobile} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Contact Person <span className="text-red-500">*</span></Label>
                    <Input
                      name="contactPerson"
                      placeholder="Contact Person (sirf text)"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Company Name <span className="text-red-500">*</span></Label>
                    <Input
                      name="companyName"
                      placeholder="Company Name"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select Country <span className="text-red-500">*</span></Label>
                    <Select value={formData.country} onValueChange={(val) => setFormData(p => ({ ...p, country: val }))}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="-- Select Country --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Assign To <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.assignedTo}
                      onValueChange={(val) => setFormData(p => ({ ...p, assignedTo: val }))}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="-- Select User --" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map(u => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.fullName} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select State</Label>
                    <Input
                      name="state"
                      placeholder="Enter State (sirf text)"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select City</Label>
                    <Input
                      name="city"
                      placeholder="Enter City (sirf text)"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Enquiry Received Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      name="enquiryDate"
                      value={formData.enquiryDate}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Next Follow Up Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      name="nextFollowUpDate"
                      value={formData.nextFollowUpDate}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button variant="outline" onClick={handlePrevStep}>Back</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 px-8 font-bold" onClick={handleNextStep}>
                    Add Lead & Proceed
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Buyer's Company Details */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Success Message Header */}
                <div className="bg-green-50 border border-green-200 p-3 rounded-md text-green-700 text-sm flex items-center gap-2 mb-6">
                  <CheckCircle2 className="h-5 w-5" />
                  A new lead has been added successfully and the lead id is {formData.leadCode || "TEMP"}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Company Name</Label>
                    <Input name="companyName" value={formData.companyName} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select Country <span className="text-red-500">*</span></Label>
                    <Input value={formData.country} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Contact Person <span className="text-red-500">*</span></Label>
                    <Input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Designation</Label>
                    <Input name="designation" placeholder="Designation (sirf text)" value={formData.designation} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Mobile</Label>
                    <Input value={formData.mobile} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Alternate Mobile</Label>
                    <Input
                      name="alternateMobile"
                      placeholder="10-digit Alternate Mobile"
                      value={formData.alternateMobile}
                      onChange={handleInputChange}
                      className="border-gray-300"
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>

                  {/* Phone Fields */}
                  {/* <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="font-bold">Phone</Label>
                      <Input value="+91" disabled className="bg-gray-100 border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Area</Label>
                      <Input name="phone.areaCode" placeholder="Area" value={formData.phone.areaCode} onChange={handleInputChange} className="border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Phone</Label>
                      <Input name="phone.number" placeholder="Phone" value={formData.phone.number} onChange={handleInputChange} className="border-gray-300" />
                    </div>
                  </div> */}

                  {/* Alt Phone Fields */}
                  {/* <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="font-bold">Alternate Phone</Label>
                      <Input value="+91" disabled className="bg-gray-100 border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Area</Label>
                      <Input name="alternatePhone.areaCode" placeholder="Area" value={formData.alternatePhone.areaCode} onChange={handleInputChange} className="border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Alt. Phone</Label>
                      <Input name="alternatePhone.number" placeholder="Alt. Phone" value={formData.alternatePhone.number} onChange={handleInputChange} className="border-gray-300" />
                    </div>
                  </div> */}

                  <div className="space-y-2">
                    <Label className="font-bold">Email</Label>
                    <Input value={formData.email} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Alternate Email</Label>
                    <Input name="alternateEmail" placeholder="Alternate Email" value={formData.alternateEmail} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Address</Label>
                    <textarea
                      name="address"
                      className="w-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select State</Label>
                    <Input name="state" value={formData.state} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select City</Label>
                    <Input name="city" value={formData.city} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">PIN / ZIP Code</Label>
                    <Input name="pincode" placeholder="6-digit Pincode" value={formData.pincode} onChange={handleInputChange} className="border-gray-300" type="tel" maxLength={6} inputMode="numeric" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Customer Type</Label>
                    <Select value={formData.customerType} onValueChange={(val) => setFormData(p => ({ ...p, customerType: val }))}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Distributor">Distributor</SelectItem>
                        <SelectItem value="Retailer">Retailer</SelectItem>
                        <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                        <SelectItem value="End User">End User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">GST Number</Label>
                    <Input name="gstNumber" placeholder="GST Number (15 characters)" value={formData.gstNumber} onChange={handleInputChange} className="border-gray-300" maxLength={15} style={{ textTransform: 'uppercase' }} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">PAN</Label>
                    <Input name="pan" placeholder="PAN (e.g. ABCDE1234F)" value={formData.pan} onChange={handleInputChange} className="border-gray-300" maxLength={10} style={{ textTransform: 'uppercase' }} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">IEC</Label>
                    <Input name="iec" placeholder="IEC (10 characters)" value={formData.iec} onChange={handleInputChange} className="border-gray-300" maxLength={10} style={{ textTransform: 'uppercase' }} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">TAN</Label>
                    <Input name="tan" placeholder="TAN (10 characters)" value={formData.tan} onChange={handleInputChange} className="border-gray-300" maxLength={10} style={{ textTransform: 'uppercase' }} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">CIN / LLPIN</Label>
                    <Input name="cin" placeholder="CIN/LLPIN (max 21 characters)" value={formData.cin} onChange={handleInputChange} className="border-gray-300" maxLength={21} style={{ textTransform: 'uppercase' }} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Website (E.g. https://www.lmsbaba.com)</Label>
                    <Input name="website" placeholder="Type Website" value={formData.website} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Source <span className="text-red-500">*</span></Label>
                    <Input value={formData.source} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Profile</Label>
                    <Input name="profile" placeholder="Profile" value={formData.profile} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Reference</Label>
                    <Input name="reference" placeholder="Reference" value={formData.reference} onChange={handleInputChange} className="border-gray-300" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <Button variant="outline" onClick={handlePrevStep}>Back</Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 px-8 font-bold"
                    onClick={handleSubmit}
                    disabled={createLeadMutation.isPending}
                  >
                    {createLeadMutation.isPending ? "Saving..." : "Save Details"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Buyer Details Modal */}
      <Dialog open={isEditBuyerModalOpen} onOpenChange={setIsEditBuyerModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-xl">
          <DialogTitle className="sr-only">Edit Buyer Details</DialogTitle>
          <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit Buyer Details</h2>
              <p className="text-gray-500 text-xs mt-0.5">Update contact and company information</p>
            </div>
            <button onClick={() => setIsEditBuyerModalOpen(false)} className="hover:bg-gray-100 p-2 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Personal Details</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Contact Person Name</Label>
                    <Input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="h-9" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Designation</Label>
                    <Input name="designation" value={formData.designation} onChange={handleInputChange} className="h-9" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase">Mobile Number</Label>
                      <Input name="mobile" value={formData.mobile} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase">Alt. Mobile</Label>
                      <Input name="alternateMobile" value={formData.alternateMobile} onChange={handleInputChange} className="h-9" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Email ID</Label>
                    <Input name="email" value={formData.email} onChange={handleInputChange} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Assign To</Label>
                    <Select
                      value={formData.assignedTo}
                      onValueChange={(val) => setFormData(p => ({ ...p, assignedTo: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select User" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map(u => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.fullName} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Company Details</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Company Name</Label>
                    <Input name="companyName" value={formData.companyName} onChange={handleInputChange} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Website</Label>
                    <Input name="website" value={formData.website} onChange={handleInputChange} className="h-9" placeholder="https://..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase">GST Number</Label>
                      <Input name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase">PAN Number</Label>
                      <Input name="pan" value={formData.pan} onChange={handleInputChange} className="h-9" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase">Customer Type</Label>
                    <Select value={formData.customerType} onValueChange={(val) => setFormData(p => ({ ...p, customerType: val }))}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="Trader">Trader</SelectItem>
                        <SelectItem value="End User">End User</SelectItem>
                        <SelectItem value="Distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Location Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase">Full Address</Label>
                  <textarea 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange}
                    className="w-full min-h-[60px] border border-gray-200 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Street, Landmark, etc."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase">City</Label>
                  <Input name="city" value={formData.city} onChange={handleInputChange} className="h-9" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase">State</Label>
                  <Input name="state" value={formData.state} onChange={handleInputChange} className="h-9" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase">Pincode</Label>
                  <Input name="pincode" value={formData.pincode} onChange={handleInputChange} className="h-9" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-gray-100 mt-6">
              <Button variant="outline" onClick={() => setIsEditBuyerModalOpen(false)} className="h-9 px-6 text-xs font-bold uppercase tracking-wider">
                Cancel
              </Button>
              <Button 
                onClick={() => updateLeadMutation.mutate({ id: editingLeadId, data: formData })} 
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-10 text-xs font-bold uppercase tracking-wider shadow-sm"
                disabled={updateLeadMutation.isPending}
              >
                {updateLeadMutation.isPending ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Lead Title & Description Modal */}
      <Dialog open={isEditReqModalOpen} onOpenChange={setIsEditReqModalOpen}>
        <DialogContent className="max-w-md p-0 border-none shadow-xl overflow-hidden rounded-xl">
          <DialogTitle className="sr-only">Edit Lead Title & Description</DialogTitle>
          <div className="bg-white p-5 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Edit Lead Title & Description</h2>
            <button onClick={() => setIsEditReqModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Lead Title:</Label>
              <Input 
                value={reqFormData.productRequired} 
                onChange={(e) => setReqFormData(p => ({ ...p, productRequired: e.target.value }))}
                className="h-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Product name or lead title"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Describe Requirements <span className="text-red-500">*</span>:</Label>
              <textarea 
                value={reqFormData.describeRequirements} 
                onChange={(e) => setReqFormData(p => ({ ...p, describeRequirements: e.target.value }))}
                className="w-full min-h-[120px] border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Describe detailed requirements here..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <Button variant="ghost" onClick={() => setIsEditReqModalOpen(false)} className="h-10 px-6 font-medium text-gray-500 hover:bg-gray-100">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  updateLeadMutation.mutate(
                    { id: editingLeadId, data: reqFormData },
                    { onSuccess: () => setIsEditReqModalOpen(false) }
                  );
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-8 font-bold shadow-sm transition-all active:scale-95"
                disabled={updateLeadMutation.isPending}
              >
                {updateLeadMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>Filter leads by multiple criteria</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Input 
                placeholder="Search state..." 
                value={filters.state} 
                onChange={(e) => handleFilterChange('state', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                placeholder="Search city..." 
                value={filters.city} 
                onChange={(e) => handleFilterChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={filters.source} onValueChange={(val) => handleFilterChange('source', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct Visit">Direct Visit</SelectItem>
                  <SelectItem value="IndiaMART">IndiaMART</SelectItem>
                  <SelectItem value="TradeIndia">TradeIndia</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select value={filters.customerType} onValueChange={(val) => handleFilterChange('customerType', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={filters.assignedTo} onValueChange={(val) => handleFilterChange('assignedTo', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map(u => (
                    <SelectItem key={u._id} value={u._id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Enquiry Date From</Label>
              <Input 
                type="date" 
                value={filters.enquiryDateFrom} 
                onChange={(e) => handleFilterChange('enquiryDateFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Enquiry Date To</Label>
              <Input 
                type="date" 
                value={filters.enquiryDateTo} 
                onChange={(e) => handleFilterChange('enquiryDateTo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date From</Label>
              <Input 
                type="date" 
                value={filters.nextFollowUpDateFrom} 
                onChange={(e) => handleFilterChange('nextFollowUpDateFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date To</Label>
              <Input 
                type="date" 
                value={filters.nextFollowUpDateTo} 
                onChange={(e) => handleFilterChange('nextFollowUpDateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={applyFilters}>Show Result</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Company Details Modal */}
      <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Company Details
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Lead ID</span>
                <span className="text-sm font-semibold">{selectedLead.leadCode}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Company Name</span>
                <span className="text-sm font-semibold">{selectedLead.companyName}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Contact Person</span>
                <span className="text-sm font-semibold">{selectedLead.contactPerson}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Country</span>
                <span className="text-sm font-semibold">{selectedLead.country}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">State</span>
                <span className="text-sm font-semibold">{selectedLead.state || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">City</span>
                <span className="text-sm font-semibold">{selectedLead.city || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Email</span>
                <span className="text-sm font-semibold">{selectedLead.email}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Mobile</span>
                <span className="text-sm font-semibold">{selectedLead.mobile}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2 md:col-span-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Source</span>
                <span className="text-sm font-semibold">{selectedLead.source}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsCompanyModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Document List Modal */}
      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manage Document List</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label className="font-bold">Type <span className="text-red-500">*</span></Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                    <SelectItem value="Gst Registration Certificate">Gst Registration Certificate</SelectItem>
                    <SelectItem value="Indiamart Pns Calls">Indiamart Pns Calls</SelectItem>
                    <SelectItem value="Ivr">Ivr</SelectItem>
                    <SelectItem value="Non Discloser Agreement">Non Discloser Agreement</SelectItem>
                    <SelectItem value="Pan">Pan</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Document <span className="text-red-500">*</span></Label>
                <Input type="file" onChange={(e) => setDocFile(e.target.files[0])} className="bg-white" />
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 md:col-span-2 w-fit"
                disabled={addDocumentMutation.isPending}
                onClick={() => {
                  if (!docType || !docFile) {
                    toast({ title: "Required", description: "Please select type and file", variant: "destructive" });
                    return;
                  }
                  addDocumentMutation.mutate({
                    id: selectedLead._id,
                    docType,
                    file: docFile
                  });
                }}
              >
                {addDocumentMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : 'Save Document'}
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Uploaded On</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLead?.documents?.length > 0 ? (
                    selectedLead.documents.map((doc, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{doc.type}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(doc.uploadedAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            title="Download document"
                            onClick={() => {
                              if (!doc.url || doc.url === '#') {
                                toast({ title: 'Not Available', description: 'Yeh document purana hai aur download ke liye available nahi hai. Naya document upload karein.', variant: 'destructive' });
                                return;
                              }
                              // Normalize URL — strip full origin if present, keep only /uploads/... path
                              let relativeUrl = doc.url;
                              try {
                                const parsed = new URL(doc.url);
                                relativeUrl = parsed.pathname;
                              } catch {
                                // Already a relative path like /uploads/...
                              }
                              // Static files are served without auth — use direct anchor download
                              const a = document.createElement('a');
                              a.href = relativeUrl;
                              a.download = doc.name || `document-${doc.type}`;
                              a.target = '_blank';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            }}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No records found!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contact Person Modal */}
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Contact Person</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Contact Person <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Contact Person" 
                value={contactFormData.contactPerson}
                onChange={(e) => setContactFormData(p => ({ ...p, contactPerson: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Designation</Label>
              <Input 
                placeholder="Designation" 
                value={contactFormData.designation}
                onChange={(e) => setContactFormData(p => ({ ...p, designation: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Department <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Department" 
                value={contactFormData.department}
                onChange={(e) => setContactFormData(p => ({ ...p, department: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Email <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Email" 
                value={contactFormData.email}
                onChange={(e) => setContactFormData(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Mobile <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Mobile" 
                value={contactFormData.mobile}
                onChange={(e) => setContactFormData(p => ({ ...p, mobile: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Alt. Email</Label>
              <Input 
                placeholder="Alt. Email" 
                value={contactFormData.alternateEmail}
                onChange={(e) => setContactFormData(p => ({ ...p, alternateEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Alt. Mobile</Label>
              <Input 
                placeholder="Alt. Mobile" 
                value={contactFormData.alternateMobile}
                onChange={(e) => setContactFormData(p => ({ ...p, alternateMobile: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Address</Label>
              <Input 
                placeholder="Address" 
                value={contactFormData.address}
                onChange={(e) => setContactFormData(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Country</Label>
              <Select value={contactFormData.country} onValueChange={(val) => setContactFormData(p => ({ ...p, country: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Country --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">State</Label>
              <Input 
                placeholder="State" 
                value={contactFormData.state}
                onChange={(e) => setContactFormData(p => ({ ...p, state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">City</Label>
              <Input 
                placeholder="City" 
                value={contactFormData.city}
                onChange={(e) => setContactFormData(p => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">PIN / ZIP Code</Label>
              <Input 
                placeholder="Zip Code" 
                value={contactFormData.pincode}
                onChange={(e) => setContactFormData(p => ({ ...p, pincode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">GST Number</Label>
              <Input 
                placeholder="GST Number" 
                value={contactFormData.gstNumber}
                onChange={(e) => setContactFormData(p => ({ ...p, gstNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Date of Birth</Label>
              <Input 
                type="date" 
                value={contactFormData.dob}
                onChange={(e) => setContactFormData(p => ({ ...p, dob: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Marriage Anniversary</Label>
              <Input 
                type="date" 
                value={contactFormData.anniversary}
                onChange={(e) => setContactFormData(p => ({ ...p, anniversary: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsAddContactModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (!contactFormData.contactPerson || !contactFormData.department || !contactFormData.email || !contactFormData.mobile) {
                  toast({ title: "Required", description: "Please fill all mandatory fields (*)", variant: "destructive" });
                  return;
                }
                updateLeadMutation.mutate({
                  id: selectedLead._id,
                  data: { contacts: [...(selectedLead.contacts || []), contactFormData] }
                });
                setIsAddContactModalOpen(false);
                setContactFormData({
                  contactPerson: '', designation: '', department: '', email: '', mobile: '', alternateEmail: '', alternateMobile: '', address: '', country: 'India', state: '', city: '', pincode: '', gstNumber: '', dob: '', anniversary: ''
                });
              }}
            >
              Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Buyer Type Modal */}
      <Dialog open={isBuyerTypeModalOpen} onOpenChange={setIsBuyerTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Change Buyer Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Select Buyer Type</Label>
              <Select 
                value={selectedLead?.customerType || ''} 
                onValueChange={(val) => {
                  updateLeadMutation.mutate({
                    id: selectedLead._id,
                    data: { customerType: val }
                  });
                  setIsBuyerTypeModalOpen(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Type --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsBuyerTypeModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recordings Modal */}
      <Dialog open={isRecordingModalOpen} onOpenChange={setIsRecordingModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-blue-600" />
                Call Logs & Recordings
              </span>
              {selectedLead && (
                <span className="text-xs text-gray-500 font-normal">
                  Lead: #{selectedLead.leadCode} ({selectedLead.contactPerson})
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              View Acefone IVR calls linked with this lead's mobile number ({selectedLead?.mobile}).
            </DialogDescription>
          </DialogHeader>

          {callLogsLoading ? (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="h-8 w-8 mx-auto text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Fetching call logs...</p>
            </div>
          ) : callLogs.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <Volume2 className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 font-medium">No Call Logs Found!</p>
              <p className="text-xs text-gray-400">Calls received or made through Acefone will show up here.</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4 my-2">
              {callLogs.map((log) => (
                <div key={log._id} className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100/50 transition-colors border-gray-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {log.direction === 'inbound' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium rounded-full text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Inbound Call
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-medium rounded-full text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Outbound Call
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(log.callDate || log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn(
                      "font-semibold text-[10px] rounded-full",
                      log.status?.toLowerCase() === 'answered' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {log.status || 'Completed'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                    <div>
                      <span className="text-gray-400">Agent:</span> <span className="font-medium">{log.agentName || 'System'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span> <span className="font-medium">{Math.floor(log.callDuration / 60)}m {Math.round(log.callDuration % 60)}s</span>
                    </div>
                  </div>

                  {log.recordingUrl ? (
                    <div className="pt-2">
                      <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                        <Play className="h-3 w-3 text-blue-500" /> Play Recording
                      </p>
                      <audio src={log.recordingUrl} controls className="w-full h-8 rounded bg-white" />
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic pt-1">No recording file for this call.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsRecordingModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialpad Modal ─────────────────────────────────── */}
      <Dialog open={isDialpadOpen} onOpenChange={(open) => { setIsDialpadOpen(open); if (!open) setDialpadInput(''); }}>
        <DialogContent className="max-w-xs p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogTitle className="sr-only">Dialpad</DialogTitle>

          {/* Header — contact info */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-700 px-5 pt-5 pb-4 text-white text-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-base leading-tight">{dialpadLead?.contactPerson || 'Unknown'}</p>
            <p className="text-blue-200 text-xs mt-0.5">{dialpadLead?.companyName}</p>
            {/* IVR mode badge */}
            {apiSettings?.ivr?.enabled && (
              <span className="inline-block mt-1.5 bg-emerald-500/30 text-emerald-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                📞 Acefone Click-to-Call
              </span>
            )}
            {/* Editable number display */}
            <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-lg font-mono tracking-widest flex-1 text-center">{dialpadInput || '—'}</span>
              {dialpadInput.length > 0 && (
                <button
                  onClick={() => setDialpadInput(prev => prev.slice(0, -1))}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  ⌫
                </button>
              )}
            </div>
          </div>

          {/* Dialpad keys */}
          <div className="bg-white px-4 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
                ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
                ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
                ['*', ''], ['0', '+'], ['#', ''],
              ].map(([digit, sub]) => (
                <button
                  key={digit}
                  onClick={() => setDialpadInput(prev => (prev + digit).slice(0, 15))}
                  className="flex flex-col items-center justify-center h-14 rounded-xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 transition-colors border border-gray-100"
                >
                  <span className="text-lg font-semibold text-gray-800 leading-none">{digit}</span>
                  {sub && <span className="text-[9px] text-gray-400 mt-0.5 tracking-widest">{sub}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Call / Close */}
          <div className="px-4 pb-4 bg-white flex items-center gap-3">
            <button
              onClick={() => { setIsDialpadOpen(false); setDialpadInput(''); }}
              className="flex-1 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>

            {apiSettings?.ivr?.enabled ? (
              /* ── Acefone Click-to-Call ── */
              <button
                className="flex-1 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center gap-2 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                disabled={!dialpadInput}
                onClick={async () => {
                  try {
                    await leadApi.clickToCall(dialpadInput);
                    toast({ title: "📞 Call Initiated", description: "Aapke phone pe pehle ring aayegi, phir customer se connect hoga." });
                    setIsDialpadOpen(false);
                  } catch (err) {
                    toast({ title: "Call Failed", description: err?.message || "Acefone se call nahi ho paya.", variant: "destructive" });
                  }
                }}
              >
                <Phone className="h-4 w-4" />
                Call via IVR
              </button>
            ) : (
              /* ── Normal tel: link ── */
              <a
                href={`tel:${dialpadInput}`}
                className="flex-1 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2 text-white font-semibold text-sm transition-colors"
                onClick={() => setTimeout(() => setIsDialpadOpen(false), 300)}
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
          </div>

          {/* Info line */}
          {!apiSettings?.ivr?.enabled && (
            <p className="text-center text-[10px] text-gray-400 pb-3 -mt-1">
              Acefone IVR enable karo desktop calling ke liye
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Schedule Meeting Modal ──────────────────────────────── */}
      <Dialog open={isMeetingModalOpen} onOpenChange={setIsMeetingModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Handshake className="h-5 w-5 text-purple-600" />
              {existingMeetingRef.current ? 'Update Meeting' : 'Schedule New Meeting'}
            </DialogTitle>
            <button
              onClick={() => setIsMeetingModalOpen(false)}
              className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {meetingFetching ? (
              // Skeleton loader — only on first fetch (cached after that)
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-gray-100 rounded-md w-1/2" />
                <div className="h-10 bg-gray-100 rounded-md" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-10 bg-gray-100 rounded-md" />
                  <div className="h-10 bg-gray-100 rounded-md" />
                </div>
                <div className="h-10 bg-gray-100 rounded-md" />
                <div className="h-10 bg-gray-100 rounded-md" />
                <div className="h-10 bg-gray-100 rounded-md" />
                <div className="h-10 bg-gray-100 rounded-md" />
              </div>
            ) : (
            <>
                {/* Meeting Type Tabs */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</Label>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setMeetingFormData(p => ({ ...p, meetingType: 'Visit' }))}
                      className={cn(
                        'px-5 py-1.5 rounded-md text-sm font-semibold border transition-all',
                        meetingFormData.meetingType === 'Visit'
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      )}
                    >
                      Visit
                    </button>
                    <button
                      onClick={() => setMeetingFormData(p => ({ ...p, meetingType: 'Online' }))}
                      className={cn(
                        'px-5 py-1.5 rounded-md text-sm font-semibold border transition-all',
                        meetingFormData.meetingType === 'Online'
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      )}
                    >
                      Online
                    </button>
                  </div>
                </div>

                {/* Meeting Date */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Meeting Date</Label>
                  <div
                    className="relative w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                    onClick={() => document.getElementById('meeting-date-picker').showPicker?.()}
                  >
                    <span className={meetingFormData.meetingDate ? 'text-gray-700' : 'text-gray-400'}>
                      {meetingFormData.meetingDate
                        ? (() => { const [y,m,d] = meetingFormData.meetingDate.split('-'); return `${d}-${m}-${y}`; })()
                        : 'dd-mm-yyyy'}
                    </span>
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="meeting-date-picker"
                      type="date"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={meetingFormData.meetingDate}
                      onChange={(e) => setMeetingFormData(p => ({ ...p, meetingDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Start Time / End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Start Time</Label>
                    <div
                      className="relative w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                      onClick={() => document.getElementById('meeting-start-time').showPicker?.()}
                    >
                      <span className={meetingFormData.startTime ? 'text-gray-700' : 'text-gray-400'}>
                        {meetingFormData.startTime || '--:--'}
                      </span>
                      <input
                        id="meeting-start-time"
                        type="time"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={meetingFormData.startTime}
                        onChange={(e) => setMeetingFormData(p => ({ ...p, startTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">End Time</Label>
                    <div
                      className="relative w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                      onClick={() => document.getElementById('meeting-end-time').showPicker?.()}
                    >
                      <span className={meetingFormData.endTime ? 'text-gray-700' : 'text-gray-400'}>
                        {meetingFormData.endTime || '--:--'}
                      </span>
                      <input
                        id="meeting-end-time"
                        type="time"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={meetingFormData.endTime}
                        onChange={(e) => setMeetingFormData(p => ({ ...p, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Meeting Assigned To (Sales Employee dropdown) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Meeting Assigned To</Label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                    value={meetingFormData.assignedTo}
                    onChange={(e) => setMeetingFormData(p => ({ ...p, assignedTo: e.target.value }))}
                  >
                    <option value="">— Select Sales Employee —</option>
                    {(assignableUsers || []).map(u => (
                      <option key={u._id} value={u._id}>{u.fullName || u.username}</option>
                    ))}
                  </select>
                </div>

                {/* Meeting With (Contact Person — read only) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Meeting With</Label>
                  <Input
                    value={meetingFormData.meetingWith}
                    readOnly
                    className="bg-gray-50 text-gray-700 border-gray-200"
                  />
                </div>

                {/* Purpose */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Purpose</Label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                    value={meetingFormData.purpose}
                    onChange={(e) => setMeetingFormData(p => ({ ...p, purpose: e.target.value }))}
                  >
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                {/* Venue (Visit only) or Online Meeting URL (Online only) */}
                {meetingFormData.meetingType === 'Visit' ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Venue</Label>
                    <Input
                      placeholder="Enter meeting venue / location"
                      value={meetingFormData.venue}
                      onChange={(e) => setMeetingFormData(p => ({ ...p, venue: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Online Meeting URL</Label>
                    <Input
                      placeholder="https://meet.google.com/... or Zoom link"
                      value={meetingFormData.onlineMeetingUrl}
                      onChange={(e) => setMeetingFormData(p => ({ ...p, onlineMeetingUrl: e.target.value }))}
                    />
                  </div>
                )}

                {/* Remarks */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Remarks</Label>
                  <textarea
                    className="w-full min-h-[72px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Any additional notes..."
                    value={meetingFormData.remarks}
                    onChange={(e) => setMeetingFormData(p => ({ ...p, remarks: e.target.value }))}
                  />
                </div>

                {/* Send Invite on Email */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="sendInviteEmail"
                    checked={meetingFormData.sendInviteEmail}
                    onChange={(e) => setMeetingFormData(p => ({ ...p, sendInviteEmail: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="sendInviteEmail" className="text-sm text-gray-700 cursor-pointer">
                    Send Invite on Email
                    {meetingLead?.email && (
                      <span className="ml-1 text-xs text-gray-400">({meetingLead.email})</span>
                    )}
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-3 bg-white border-t flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 px-8 py-2.5 text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
              onClick={handleMeetingSubmit}
              disabled={saveMeetingMutation.isPending || meetingFetching}
            >
              {saveMeetingMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {existingMeetingRef.current ? 'Updating...' : 'Saving...'}
                </>
              ) : existingMeetingRef.current ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Handshake className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Settings moved to Super Admin → API Settings page */}
      <Dialog open={isApiSettingsModalOpen} onOpenChange={setIsApiSettingsModalOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              API Settings
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <p className="text-gray-600 text-sm">
              API Settings (IndiaMART, Acefone IVR, Website Webhook) are now managed by <strong>Super Admin</strong>.
            </p>
            <p className="text-gray-500 text-xs">
              Super Admin → API Settings se API Key, Caller ID, aur IndiaMART Seller Mobile configure karein.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsApiSettingsModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expected Closure Date / Deal Value Modal */}
      <Dialog open={isClosureDealModalOpen} onOpenChange={setIsClosureDealModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Expected Closure Date / Deal Value
            </DialogTitle>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Closure Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Closure Date</Label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                value={closureDealFormData.closureDate}
                onChange={(e) =>
                  setClosureDealFormData((prev) => ({ ...prev, closureDate: e.target.value }))
                }
              />
            </div>

            {/* Deal Value */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Deal Value</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter Deal Value"
                  className="flex-1"
                  value={closureDealFormData.dealValue}
                  onChange={(e) =>
                    setClosureDealFormData((prev) => ({ ...prev, dealValue: e.target.value }))
                  }
                />
                <Select
                  value={closureDealFormData.currency}
                  onValueChange={(val) =>
                    setClosureDealFormData((prev) => ({ ...prev, currency: val }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 pb-5">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold"
              onClick={handleSaveClosureDeal}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Change status
            </DialogTitle>
            <button onClick={() => setIsStatusModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {STATUSES.map((statusOption) => (
              <div 
                key={statusOption} 
                className="flex items-center gap-3 py-1 cursor-pointer"
                onClick={() => setSelectedStatus(statusOption)}
              >
                <input
                  type="radio"
                  id={`status-${statusOption}`}
                  name="leadStatus"
                  value={statusOption}
                  checked={selectedStatus === statusOption}
                  onChange={() => setSelectedStatus(statusOption)}
                  className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label 
                  htmlFor={`status-${statusOption}`} 
                  className="text-sm font-semibold text-gray-700 cursor-pointer flex-1"
                >
                  {statusOption}
                </label>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 pt-2 bg-white flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 px-8 py-2.5 text-sm font-bold rounded-lg shadow-md transition-all"
              onClick={handleStatusSubmit}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Stage Modal */}
      <Dialog open={isStageModalOpen} onOpenChange={setIsStageModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Change Stage
            </DialogTitle>
            <button onClick={() => setIsStageModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {STAGES.map((stageOption) => (
              <div 
                key={stageOption} 
                className="flex items-center gap-3 py-1 cursor-pointer"
                onClick={() => setSelectedStage(stageOption)}
              >
                <input
                  type="radio"
                  id={`stage-${stageOption}`}
                  name="leadStage"
                  value={stageOption}
                  checked={selectedStage === stageOption}
                  onChange={() => setSelectedStage(stageOption)}
                  className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label 
                  htmlFor={`stage-${stageOption}`} 
                  className="text-sm font-semibold text-gray-700 cursor-pointer flex-1"
                >
                  {stageOption}
                </label>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 pt-2 bg-white flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 px-8 py-2.5 text-sm font-bold rounded-lg shadow-md transition-all"
              onClick={handleStageSubmit}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disqualify Lead Modal */}
      <Dialog open={isDisqualifyModalOpen} onOpenChange={setIsDisqualifyModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Disqualify Lead
            </DialogTitle>
            <button onClick={() => setIsDisqualifyModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {DISQUALIFY_REASONS.map((reasonOption) => (
              <div 
                key={reasonOption} 
                className="flex items-center gap-3 py-1 cursor-pointer"
                onClick={() => setSelectedDisqualify(reasonOption)}
              >
                <input
                  type="radio"
                  id={`disqualify-${reasonOption}`}
                  name="disqualifyReason"
                  value={reasonOption}
                  checked={selectedDisqualify === reasonOption}
                  onChange={() => setSelectedDisqualify(reasonOption)}
                  className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label 
                  htmlFor={`disqualify-${reasonOption}`} 
                  className="text-sm font-semibold text-gray-700 cursor-pointer flex-1"
                >
                  {reasonOption}
                </label>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 pt-2 bg-white flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 px-8 py-2.5 text-sm font-bold rounded-lg shadow-md transition-all"
              onClick={handleDisqualifySubmit}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Modal */}
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Notes List
            </DialogTitle>
            <button onClick={() => setIsNotesModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto bg-gray-50/50">
            {notesLead?.notes && notesLead.notes.length > 0 ? (
              notesLead.notes.map((note, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm relative">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-800">{note.userName} wrote</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{formatNoteDate(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No notes added yet.
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-white space-y-3">
            <textarea
              className="w-full min-h-[90px] border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter new note content here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsNotesModalOpen(false)} className="px-5 py-2">
                Close
              </Button>
              <Button
                className="bg-[#00acc1] hover:bg-[#00838f] text-white font-semibold border-2 border-black px-6 py-2 rounded-md shadow-sm"
                onClick={handleNoteSubmit}
                disabled={updateLeadMutation.isPending}
              >
                {updateLeadMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <DialogTitle className="text-lg font-bold text-gray-800">
              Lead History for Lead ID: {historyLead?.leadCode} (Company: {historyLead?.companyName})
            </DialogTitle>
            <button onClick={() => setIsHistoryModalOpen(false)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-3 border-b flex items-center gap-3 bg-gray-50/50">
            <Button
              variant={historyFilter === 'All' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-8 text-xs font-semibold px-3.5 py-1 rounded-md flex items-center gap-1.5",
                historyFilter === 'All' ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-200"
              )}
              onClick={() => setHistoryFilter('All')}
            >
              <Calendar className="h-3.5 w-3.5" />
              All
            </Button>
            <Button
              variant={historyFilter === 'MOM' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-8 text-xs font-semibold px-3.5 py-1 rounded-md flex items-center gap-1.5",
                historyFilter === 'MOM' ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-200"
              )}
              onClick={() => setHistoryFilter('MOM')}
            >
              <Edit className="h-3.5 w-3.5" />
              MOM
            </Button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-gray-50/30 scrollbar-thin">
            {historyLead?.history && historyLead.history.length > 0 ? (
              historyLead.history
                .filter(item => {
                  if (historyFilter === 'MOM') {
                    return item.action === 'Note Added';
                  }
                  return true;
                })
                .map((item, index) => (
                  <div key={index} className="bg-[#fffaf4] p-4 rounded-md border border-[#fed7aa] shadow-sm">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">{item.action}</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-600 font-semibold mb-3">
                      <div><span className="font-bold text-gray-700">Date:</span> {formatHistoryDate(item.timestamp)}</div>
                      <div><span className="font-bold text-gray-700">Updated By:</span> {item.performedBy?.fullName || 'System'}</div>
                      <div><span className="font-bold text-gray-700">IP:</span> 157.49.28.56</div>
                      <div><span className="font-bold text-gray-700">Source:</span> {historyLead.source || 'Website'}</div>
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed font-semibold">
                      <span className="font-bold">Comment:</span> {item.notes}
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">
                No history logs found for this lead.
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-white flex justify-end">
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)} className="px-6">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Go to Account: Document Upload Modal ─────────────────────── */}
      <Dialog open={isGoToAccountModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsGoToAccountModalOpen(false);
          setGoToAccountLead(null);
          setGoToAccountFiles({ po: null, paymentProof: null, quotation: null });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Go to Account — Upload Documents
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Uploading documents for{' '}
              <span className="font-semibold text-gray-700">{goToAccountLead?.companyName}</span>.
              {' '}Quotation and Payment Proof are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Quotation Upload — REQUIRED */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-500" />
                Quotation
                <span className="text-[11px] font-bold text-red-500 ml-1">* Required</span>
                <span className="text-xs font-normal text-gray-400 ml-1">PDF, Image, DOC</span>
              </Label>
              <div className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                goToAccountFiles.quotation
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-red-200 hover:border-purple-400 bg-red-50/30'
              }`}>
                {goToAccountFiles.quotation ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-purple-700 font-medium truncate max-w-[220px]">{goToAccountFiles.quotation.name}</span>
                    </div>
                    <button onClick={() => setGoToAccountFiles(p => ({ ...p, quotation: null }))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500">
                    <Upload className="h-4 w-4 text-purple-400" />
                    <span>Click to upload Quotation <span className="text-red-400 font-semibold">(required)</span></span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => e.target.files?.[0] && setGoToAccountFiles(p => ({ ...p, quotation: e.target.files[0] }))}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Payment Proof Upload — REQUIRED */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-green-500" />
                Payment Proof / Screenshot
                <span className="text-[11px] font-bold text-red-500 ml-1">* Required</span>
                <span className="text-xs font-normal text-gray-400 ml-1">Image, PDF</span>
              </Label>
              <div className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                goToAccountFiles.paymentProof
                  ? 'border-green-400 bg-green-50'
                  : 'border-red-200 hover:border-green-400 bg-red-50/30'
              }`}>
                {goToAccountFiles.paymentProof ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium truncate max-w-[220px]">{goToAccountFiles.paymentProof.name}</span>
                    </div>
                    <button onClick={() => setGoToAccountFiles(p => ({ ...p, paymentProof: null }))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500">
                    <Upload className="h-4 w-4 text-green-400" />
                    <span>Click to upload Payment Proof <span className="text-red-400 font-semibold">(required)</span></span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => e.target.files?.[0] && setGoToAccountFiles(p => ({ ...p, paymentProof: e.target.files[0] }))}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* PO Upload — OPTIONAL */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                Purchase Order (PO)
                <span className="text-[11px] font-normal text-gray-400 ml-1">Optional · PDF, Image, DOC</span>
              </Label>
              <div className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
                goToAccountFiles.po
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}>
                {goToAccountFiles.po ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium truncate max-w-[220px]">{goToAccountFiles.po.name}</span>
                    </div>
                    <button onClick={() => setGoToAccountFiles(p => ({ ...p, po: null }))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500">
                    <Upload className="h-4 w-4" />
                    <span>Click to upload PO (optional)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => e.target.files?.[0] && setGoToAccountFiles(p => ({ ...p, po: e.target.files[0] }))}
                    />
                  </label>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 bg-amber-50 rounded p-2 border border-amber-100 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Quotation and Payment Proof are <strong>mandatory</strong> before sending to Account. PO is optional. Uploaded documents will be visible in Lead Payments section.</span>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="px-5"
              onClick={() => {
                setIsGoToAccountModalOpen(false);
                setGoToAccountLead(null);
                setGoToAccountFiles({ po: null, paymentProof: null, quotation: null });
              }}
            >
              Cancel
            </Button>
            <Button
              className="px-5 bg-blue-600 hover:bg-blue-700"
              onClick={handleGoToAccountSubmit}
              disabled={goToAccountMutation.isPending || uploadLeadDocsMutation.isPending}
            >
              {(goToAccountMutation.isPending || uploadLeadDocsMutation.isPending) ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {uploadLeadDocsMutation.isPending ? 'Uploading...' : 'Sending...'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  Send to Account
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📋 DEAL WON CHECKLIST DIALOG */}
      <Dialog open={isWonChecklistModalOpen} onOpenChange={setIsWonChecklistModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Deal Won Checklist & Commitments
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Please declare the commitments discussed with the customer. The Service team will verify each marked point.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 1. Advanced Payment */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-adv"
                  checked={salesChecklist.advancePayment.checked}
                  onChange={(e) => setSalesChecklist(p => ({
                    ...p,
                    advancePayment: { ...p.advancePayment, checked: e.target.checked }
                  }))}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="chk-adv" className="font-semibold text-gray-800 cursor-pointer flex-1">
                  1. Advanced Payment Received/Discussed?
                </Label>
              </div>
              {salesChecklist.advancePayment.checked && (
                <div className="pl-7 space-y-1">
                  <span className="text-xs text-gray-500">Advanced Amount (INR)</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={salesChecklist.advancePayment.value === 0 || salesChecklist.advancePayment.value === "0" ? "0" : salesChecklist.advancePayment.value}
                    onFocus={(e) => {
                      if (e.target.value === "0" || e.target.value === 0) {
                        setSalesChecklist(p => ({
                          ...p,
                          advancePayment: { ...p.advancePayment, value: "" }
                        }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setSalesChecklist(p => ({
                          ...p,
                          advancePayment: { ...p.advancePayment, value: 0 }
                        }));
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setSalesChecklist(p => ({
                        ...p,
                        advancePayment: { ...p.advancePayment, value: val === "" ? "" : Number(val) }
                      }));
                    }}
                    className="h-9 border-gray-300 focus:ring-green-500"
                    placeholder="Enter amount"
                  />
                </div>
              )}
            </div>

            {/* 2. Installation Charges */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-inst"
                  checked={salesChecklist.installationCharge.checked}
                  onChange={(e) => setSalesChecklist(p => ({
                    ...p,
                    installationCharge: { ...p.installationCharge, checked: e.target.checked }
                  }))}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="chk-inst" className="font-semibold text-gray-800 cursor-pointer flex-1">
                  2. Installation Charges Discussed?
                </Label>
              </div>
              {salesChecklist.installationCharge.checked && (
                <div className="pl-7 space-y-1">
                  <span className="text-xs text-gray-500">How much installation charge is agreed?</span>
                  <Input
                    type="text"
                    value={salesChecklist.installationCharge.value}
                    onChange={(e) => setSalesChecklist(p => ({
                      ...p,
                      installationCharge: { ...p.installationCharge, value: e.target.value }
                    }))}
                    className="h-9 border-gray-300 focus:ring-green-500"
                    placeholder="e.g. ₹15,000 / Extra at actual / Included in Deal"
                  />
                </div>
              )}
            </div>

            {/* 3. Warranty Period */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-war"
                  checked={salesChecklist.warranty.checked}
                  onChange={(e) => setSalesChecklist(p => ({
                    ...p,
                    warranty: { ...p.warranty, checked: e.target.checked }
                  }))}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="chk-war" className="font-semibold text-gray-800 cursor-pointer flex-1">
                  3. Warranty Committed?
                </Label>
              </div>
              {salesChecklist.warranty.checked && (
                <div className="pl-7 space-y-1">
                  <span className="text-xs text-gray-500">Warranty duration & details</span>
                  <Input
                    type="text"
                    value={salesChecklist.warranty.value}
                    onChange={(e) => setSalesChecklist(p => ({
                      ...p,
                      warranty: { ...p.warranty, value: e.target.value }
                    }))}
                    className="h-9 border-gray-300 focus:ring-green-500"
                    placeholder="e.g. 1 Year / 6 months / 2 Years on motor"
                  />
                </div>
              )}
            </div>

            {/* 4. Boarding/Lodging */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-board"
                  checked={salesChecklist.boardingLodging.checked}
                  onChange={(e) => setSalesChecklist(p => ({
                    ...p,
                    boardingLodging: { ...p.boardingLodging, checked: e.target.checked }
                  }))}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="chk-board" className="font-semibold text-gray-800 cursor-pointer flex-1">
                  4. Installation Crew Stay/Food Arranged?
                </Label>
              </div>
              {salesChecklist.boardingLodging.checked && (
                <div className="pl-7 space-y-1">
                  <span className="text-xs text-gray-500">Boarding & Lodging arrangement details</span>
                  <Input
                    type="text"
                    value={salesChecklist.boardingLodging.value}
                    onChange={(e) => setSalesChecklist(p => ({
                      ...p,
                      boardingLodging: { ...p.boardingLodging, value: e.target.value }
                    }))}
                    className="h-9 border-gray-300 focus:ring-green-500"
                    placeholder="e.g. Under Customer Scope / Hotel by customer"
                  />
                </div>
              )}
            </div>

            {/* 5. Backup Power / Generator */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-gen"
                  checked={salesChecklist.backupGenerator.checked}
                  onChange={(e) => setSalesChecklist(p => ({
                    ...p,
                    backupGenerator: { ...p.backupGenerator, checked: e.target.checked }
                  }))}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <Label htmlFor="chk-gen" className="font-semibold text-gray-800 cursor-pointer flex-1">
                  5. Backup Power Support / DG Discussed?
                </Label>
              </div>
              {salesChecklist.backupGenerator.checked && (
                <div className="pl-7 space-y-1">
                  <span className="text-xs text-gray-500">Generator / Power fluctuation arrangement details</span>
                  <Input
                    type="text"
                    value={salesChecklist.backupGenerator.value}
                    onChange={(e) => setSalesChecklist(p => ({
                      ...p,
                      backupGenerator: { ...p.backupGenerator, value: e.target.value }
                    }))}
                    className="h-9 border-gray-300 focus:ring-green-500"
                    placeholder="e.g. Customer will provide generator for backup"
                  />
                </div>
              )}
            </div>

            {/* 6. Operator Error Clause */}
            <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-50/75 transition-all flex items-center gap-3">
              <input
                type="checkbox"
                id="chk-oper"
                checked={salesChecklist.operatorErrorClause.checked}
                onChange={(e) => setSalesChecklist(p => ({
                  ...p,
                  operatorErrorClause: { ...p.operatorErrorClause, checked: e.target.checked }
                }))}
                className="h-4.5 w-4.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="chk-oper" className="font-semibold text-gray-800 cursor-pointer flex-1">
                6. Customer agreed that damage due to operator mistake is NOT our fault?
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsWonChecklistModalOpen(false);
                setWonChecklistLead(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
              onClick={handleWonChecklistSubmit}
              disabled={markAsWonMutation.isPending}
            >
              {markAsWonMutation.isPending ? 'Saving...' : 'Save & Mark as Won'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📋 VIEW CHECKLIST STATUS DIALOG FOR SALES EMPLOYEE */}
      <Dialog open={isViewChecklistModalOpen} onOpenChange={setIsViewChecklistModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-700">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              Sales Commitments Verification Status
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Current verification status of commitments by the Service Team.
            </DialogDescription>
          </DialogHeader>

          {viewingChecklistLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : viewingChecklistOrder ? (() => {
            const checklist = viewingChecklistOrder.salesChecklist || {};
            const checklistConfig = [
              { key: 'advancePayment', label: '1. Advanced Payment', type: 'number' },
              { key: 'installationCharge', label: '2. Installation Charges', type: 'text' },
              { key: 'warranty', label: '3. Warranty Period', type: 'text' },
              { key: 'boardingLodging', label: '4. Installation Team Stay/Food', type: 'text' },
              { key: 'backupGenerator', label: '5. Backup Power / DG', type: 'text' },
              { key: 'operatorErrorClause', label: '6. Operator Error Clause', type: 'boolean' }
            ];

            return (
              <div className="space-y-4 py-3">
                {/* Service Verification Header info */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">Service Verification Status</span>
                    <p className="font-bold text-sm text-blue-900 mt-0.5 capitalize">
                      {viewingChecklistOrder.serviceVerification?.status || 'Pending'}
                    </p>
                  </div>
                  <Badge className={cn(
                    "font-bold px-2 py-0.5 rounded text-xs text-white",
                    viewingChecklistOrder.serviceVerification?.status === 'verified' ? "bg-green-600" :
                    viewingChecklistOrder.serviceVerification?.status === 'rejected' ? "bg-red-600" :
                    "bg-yellow-600"
                  )}>
                    {viewingChecklistOrder.serviceVerification?.status === 'verified' ? 'Approved by Service' :
                     viewingChecklistOrder.serviceVerification?.status === 'rejected' ? 'Rejected by Service' :
                     'Pending Service Check'}
                  </Badge>
                </div>

                {/* Checklist items list */}
                <div className="space-y-3">
                  {checklistConfig.map((cfg) => {
                    const item = checklist[cfg.key] || { checked: false, value: '', verified: false };
                    return (
                      <div 
                        key={cfg.key} 
                        className={cn(
                          "p-3 rounded-lg border flex items-center justify-between transition-all",
                          item.checked 
                            ? (item.verified ? "bg-green-50/40 border-green-200" : "bg-orange-50/40 border-orange-200")
                            : "bg-gray-50/40 border-gray-150 opacity-60"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{cfg.label}</p>
                          {item.checked ? (
                            <p className="text-xs text-gray-600 mt-1">
                              Agreed: <strong className="text-blue-700">{cfg.type === 'number' ? `₹${item.value}` : (cfg.type === 'boolean' ? 'Agreed' : item.value || 'N/A')}</strong>
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">Not discussed with customer</p>
                          )}
                        </div>

                        <div>
                          {item.checked ? (
                            item.verified ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold flex items-center gap-1">
                                <Clock className="h-3 w-3 text-orange-600 animate-pulse" />
                                Pending Check
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">N/A</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {viewingChecklistOrder.serviceVerification?.remarks && (
                  <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-600 space-y-1">
                    <span className="font-bold text-gray-700">Service Team Remarks:</span>
                    <p className="italic">"{viewingChecklistOrder.serviceVerification.remarks}"</p>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="text-center py-8 text-gray-455">
              No order data found.
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              className="px-5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsViewChecklistModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
