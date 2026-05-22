import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { leadApi } from '@/api/leadService';
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
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Leads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    assignedTo: user?._id || '',
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
  
  const [reqFormData, setReqFormData] = useState({
    productRequired: '',
    describeRequirements: ''
  });

  // Tabs for status filtering
  const tabs = [
    'All Active Leads',
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

  const assignableUsers = usersData?.users || [];

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

  const handleEditBuyerClick = (lead) => {
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
      assignedTo: user?._id || '',
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

  const handleInitialCheck = async () => {
    if (!formData.email && !formData.mobile) {
      toast({
        title: "Required",
        description: "Please enter email or mobile number",
        variant: "destructive"
      });
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
      // Validate step 2 fields
      if (!formData.productRequired || !formData.contactPerson || !formData.companyName) {
        toast({ title: "Required", description: "Please fill all mandatory fields (*)", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    createLeadMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
                    <div>
                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-4">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Lead ID</span>
                        <span className="font-semibold text-blue-600">#{lead.leadCode}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Lead Date</span>
                        <span className="text-gray-700">{new Date(lead.leadDate).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs flex items-center">
                          Closure Date <Edit className="h-3 w-3 ml-1 cursor-pointer" />
                        </span>
                        <span className="text-gray-700">{lead.closureDate ? new Date(lead.closureDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs flex items-center">
                          Deal Value <Edit className="h-3 w-3 ml-1 cursor-pointer" />
                        </span>
                        <span className="text-gray-700">{lead.dealValue ? `₹${lead.dealValue}` : 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">Quotation</span>
                        <span className="text-blue-600 cursor-pointer">{lead.quotation || 'N/A'}</span>
                      </div>
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
                    >
                      Send Quotation
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full bg-green-50 text-green-700 border-green-200">Deal Won</Button>
                  </div>
                </div>

                {/* Bottom Bar - Stats */}
                <div className="bg-gray-50 p-2 border-t border-gray-100 grid grid-cols-2 md:grid-cols-7 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Next Follow-up</span>
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <span>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'dd-mm-yyyy'}</span>
                      <Calendar className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned to</span>
                    <span className="text-xs text-gray-700">{lead.assignedTo?.fullName || 'Unassigned'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stage</span>
                    <span className={cn(
                      "text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full w-fit",
                      lead.stage?.toLowerCase() === 'hot' ? "bg-red-100 text-red-700" :
                        lead.stage?.toLowerCase() === 'warm' ? "bg-orange-100 text-orange-700" :
                          "bg-blue-100 text-blue-700"
                    )}>
                      {lead.stage}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</span>
                    <span className="text-xs text-gray-700 font-medium">{lead.status}</span>
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
                        <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-600">
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-green-50 text-green-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-700">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-8 rounded-none hover:bg-purple-50 text-purple-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
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
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="font-bold">Mobile</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      placeholder="Enter mobile number"
                      value={formData.mobile}
                      onChange={handleInputChange}
                    />
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
                      placeholder="Contact Person"
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
                      placeholder="Enter State"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Select City</Label>
                    <Input
                      name="city"
                      placeholder="Enter City"
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
                    <Input name="designation" placeholder="Designation" value={formData.designation} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Mobile</Label>
                    <Input value={formData.mobile} disabled className="bg-gray-100 border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Alternate Mobile</Label>
                    <Input name="alternateMobile" placeholder="Alternate Mobile" value={formData.alternateMobile} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  {/* Phone Fields */}
                  <div className="grid grid-cols-3 gap-2">
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
                  </div>

                  {/* Alt Phone Fields */}
                  <div className="grid grid-cols-3 gap-2">
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
                  </div>

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
                    <Input name="pincode" placeholder="Zip code" value={formData.pincode} onChange={handleInputChange} className="border-gray-300" />
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
                    <Input name="gstNumber" placeholder="GST Number" value={formData.gstNumber} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">PAN</Label>
                    <Input name="pan" placeholder="type PAN" value={formData.pan} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">IEC</Label>
                    <Input name="iec" placeholder="Type IEC" value={formData.iec} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">TAN</Label>
                    <Input name="tan" placeholder="Type TAN" value={formData.tan} onChange={handleInputChange} className="border-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">CIN / LLPIN</Label>
                    <Input name="cin" placeholder="Type CIN/LLPIN" value={formData.cin} onChange={handleInputChange} className="border-gray-300" />
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
                onClick={() => {
                  if (!docType || !docFile) {
                    toast({ title: "Required", description: "Please select type and file", variant: "destructive" });
                    return;
                  }
                  const newDoc = {
                    type: docType,
                    name: docFile.name,
                    url: '#', // In real app, upload to S3/Cloudinary first
                    uploadedAt: new Date().toISOString()
                  };
                  updateLeadMutation.mutate({
                    id: selectedLead._id,
                    data: { documents: [...(selectedLead.documents || []), newDoc] }
                  });
                  setDocType('');
                  setDocFile(null);
                }}
              >
                Save Document
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              Recordings
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center space-y-4">
            <Volume2 className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500 font-medium">No Recordings Found!</p>
            <p className="text-xs text-gray-400">Call recordings will appear here once available.</p>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsRecordingModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;
