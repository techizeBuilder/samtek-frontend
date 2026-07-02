import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Clock,
  FileText,
  Stamp,
  Upload,
  X,
  Image,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

const SuperAdminCompanies = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    state: '',
    isActive: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10
  });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companiesData, isLoading, error, refetch } = useQuery({
    queryKey: ['companies', filters, pagination],
    queryFn: () => api.getCompanies({ ...filters, ...pagination }),
  });

  // Fetch company stats
  const { data: statsData } = useQuery({
    queryKey: ['company-stats'],
    queryFn: () => api.getCompanyStats(),
  });

  // Track admin creation error to show inside modal
  const [adminCreateError, setAdminCreateError] = useState('');

  // Stamp upload handler
  const handleStampUpload = async () => {
    if (!stampFile || !selectedCompany) return;
    setIsUploadingStamp(true);
    try {
      const result = await api.uploadCompanyStamp(selectedCompany._id, stampFile);
      queryClient.invalidateQueries(['companies']);
      toast({ title: '✅ Stamp Uploaded', description: 'Company stamp saved successfully.' });
      setIsStampModalOpen(false);
      setStampFile(null);
      setStampPreview(null);
      setSelectedCompany(null);
    } catch (err) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingStamp(false);
    }
  };

  // Track pending stamp upload for after company creation
  const [pendingStampUpload, setPendingStampUpload] = useState(null);

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: (data) => api.createCompany(data),
    onSuccess: async (result) => {
      queryClient.invalidateQueries(['companies']);
      queryClient.invalidateQueries(['company-stats']);

      // Auto-upload stamp if one was selected
      const companyId = result?.company?._id;
      if (companyId && pendingStampUpload) {
        try {
          await api.uploadCompanyStamp(companyId, pendingStampUpload);
          queryClient.invalidateQueries(['companies']);
        } catch (stampErr) {
          toast({ title: 'Warning', description: 'Company created but stamp upload failed. Use Upload Stamp from menu.', variant: 'destructive' });
        }
        setPendingStampUpload(null);
      }

      if (result.adminError) {
        // Keep modal open so user can fix the admin fields
        setAdminCreateError(`⚠️ Company saved! But admin creation failed: ${result.adminError}`);
        toast({
          title: "Company Created — Admin Failed",
          description: result.adminError,
          variant: "destructive",
        });
      } else {
        setIsCreateModalOpen(false);
        setAdminCreateError('');
        toast({
          title: "✅ Success",
          description: "Company and Company Admin created successfully!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      queryClient.invalidateQueries(['company-stats']);
      setIsEditModalOpen(false);
      setSelectedCompany(null);
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => api.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      queryClient.invalidateQueries(['company-stats']);
      setIsDeleteModalOpen(false);
      setSelectedCompany(null);
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const companies = companiesData?.companies || [];
  const paginationInfo = companiesData?.pagination || {};
  const filterOptions = companiesData?.filters || {};
  const stats = statsData || {};

  const handleFilterChange = (key, value) => {
    // Convert display values back to API values
    let apiValue = value;
    if (key === 'isActive') {
      if (value === 'active') apiValue = 'true';
      else if (value === 'inactive') apiValue = 'false';
      else if (value === 'all') apiValue = '';
    } else if (value === 'all') {
      apiValue = '';
    }

    setFilters(prev => ({ ...prev, [key]: apiValue }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 flex-1 min-w-[200px]" />
              <Skeleton className="h-10 w-[150px]" />
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-[120px]" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent>
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-5 gap-4 py-3 border-b">
                {['Company', 'Location', 'Contact', 'Status', 'Actions'].map((header, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>

              {/* Table Rows */}
              {[...Array(5)].map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-4 py-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading companies</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Company Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all companies across different locations
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <CompanyForm
              onSubmit={(data, stampFile) => {
                setPendingStampUpload(stampFile || null);
                createCompanyMutation.mutate(data);
              }}
              isLoading={createCompanyMutation.isPending}
              onCancel={() => { setIsCreateModalOpen(false); setAdminCreateError(''); setPendingStampUpload(null); }}
              serverError={adminCreateError}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          // Loading skeleton for stats
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          </>
        ) : stats.success ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cities</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byCity?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unit Types</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byUnit?.length || 0}</div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select
              value={filters.city || 'all'}
              onValueChange={(value) => handleFilterChange('city', value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filterOptions.cities?.filter(city => city && city.trim() !== '').map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.isActive === 'true' ? 'active' : filters.isActive === 'false' ? 'inactive' : 'all'}
              onValueChange={(value) => handleFilterChange('isActive', value)}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({ search: '', city: '', state: '', companyType: '', isActive: '' });
                setPagination({ page: 1, limit: 10 });
              }}
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[750px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Company ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Stamp className="h-3.5 w-3.5" /> Stamp
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-3">
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">No companies found</p>
                          <p className="text-xs text-muted-foreground">
                            Try adjusting your filters or create a new company
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company._id}>
                      <TableCell className="min-w-[200px]">
                        <div>
                          <div className="font-medium text-sm sm:text-base">{company.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{company.unitName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="font-mono text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded border">
                          {company._id}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{company.city}, {company.state}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs sm:text-sm">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{company.mobile}</span>
                          </div>
                          <div className="flex items-center text-xs sm:text-sm">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{company.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {company.companyAdmin ? (
                          <div className="space-y-1">
                            <div className="font-medium text-xs sm:text-sm text-gray-900">{company.companyAdmin.fullName}</div>
                            <div className="text-[11px] text-muted-foreground">{company.companyAdmin.email}</div>
                            <div className="text-[11px] text-muted-foreground">{company.companyAdmin.mobile}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No Admin</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        <Badge variant={company.isActive ? "default" : "secondary"} className="text-xs">
                          {company.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center min-w-[70px]">
                        {company.stampUrl ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-[10px] text-green-600 font-medium">Uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            <span className="text-[10px] text-amber-500 font-medium">Missing</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right min-w-[60px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company);
                                setStampPreview(company.stampUrl ? `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${company.stampUrl}` : null);
                                setStampFile(null);
                                setIsStampModalOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2 text-orange-500" />
                              Upload Stamp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                navigate(`/super-admin/companies/${company._id}/report`);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Company Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {paginationInfo.total > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {((paginationInfo.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(paginationInfo.current * pagination.limit, paginationInfo.count)} of{' '}
                {paginationInfo.count} companies
              </div>
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current - 1)}
                  disabled={!paginationInfo.hasPrev}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {paginationInfo.current} of {paginationInfo.total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current + 1)}
                  disabled={!paginationInfo.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCompany && (
            <CompanyForm
              company={selectedCompany}
              onSubmit={async (data, stampFile) => {
                updateCompanyMutation.mutate({ id: selectedCompany._id, data });
                // If a new stamp was picked, upload it immediately
                if (stampFile) {
                  try {
                    await api.uploadCompanyStamp(selectedCompany._id, stampFile);
                    queryClient.invalidateQueries(['companies']);
                  } catch (e) {
                    toast({ title: 'Warning', description: 'Company updated but stamp upload failed.', variant: 'destructive' });
                  }
                }
              }}
              isLoading={updateCompanyMutation.isPending}
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedCompany(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedCompany && <CompanyViewDetails company={selectedCompany} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCompany?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedCompany(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCompanyMutation.mutate(selectedCompany._id)}
              disabled={deleteCompanyMutation.isPending}
            >
              {deleteCompanyMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stamp Upload Modal */}
      <Dialog open={isStampModalOpen} onOpenChange={(open) => { setIsStampModalOpen(open); if (!open) { setStampFile(null); setStampPreview(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Company Stamp — {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription>
              Upload the official company stamp/seal image (JPG, PNG, WEBP). This stamp will appear on all quotations generated by this company's team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current stamp preview */}
            {stampPreview && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stamp</p>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50 w-full flex justify-center">
                  <img
                    src={stampPreview}
                    alt="Company Stamp"
                    className="max-h-36 object-contain"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                </div>
              </div>
            )}

            {/* Upload new stamp */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {stampPreview ? 'Replace Stamp' : 'Upload Stamp'} <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setStampFile(file);
                    setStampPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <p className="text-xs text-slate-400">Max 5MB. JPG, PNG, or WEBP only.</p>
            </div>

            {/* New file preview */}
            {stampFile && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-semibold text-emerald-600">✓ New stamp selected: {stampFile.name}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsStampModalOpen(false); setStampFile(null); setStampPreview(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleStampUpload}
              disabled={!stampFile || isUploadingStamp}
            >
              {isUploadingStamp ? 'Uploading...' : 'Save Stamp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Company Form Component
const CompanyForm = ({ company, onSubmit, isLoading, onCancel, serverError }) => {
  const stampInputRef = React.useRef(null);
  const [stampFile, setStampFile] = React.useState(null);
  const [stampPreview, setStampPreview] = React.useState(null);
  const [stampError, setStampError] = React.useState('');

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  const existingStampUrl = company?.stampUrl ? `${API_BASE}${company.stampUrl}` : null;
  const currentStampSrc = stampPreview || existingStampUrl;

  const handleStampChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setStampError('Only JPG, PNG, WEBP allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { setStampError('Max file size is 5MB'); return; }
    setStampError('');
    setStampFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setStampPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeStamp = () => {
    setStampFile(null);
    setStampPreview(null);
    setStampError('');
    if (stampInputRef.current) stampInputRef.current.value = '';
  };

  const [formData, setFormData] = useState({
    unitName: company?.unitName || '',
    name: company?.name || '',
    legalName: company?.legalName || '',
    companyType: company?.companyType || '',
    mobile: company?.mobile || '',
    email: company?.email || '',
    address: company?.address || '',
    locationPin: company?.locationPin || '',
    city: company?.city || '',
    state: company?.state || '',
    pan: company?.pan || '',
    gst: company?.gst || '',
    isActive: true,
    createAdmin: true, // Always create admin for new company
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: ''
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};
    const requiredFields = ['unitName', 'name', 'locationPin', 'city', 'state', 'gst'];

    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Stamp required for new company
    if (!company && !stampFile) {
      setStampError('Company Stamp is required');
      return;
    }

    // PAN validation (if provided)
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
      newErrors.pan = 'PAN must be in format ABCDE1234F';
    }

    // GST validation (if provided)
    if (formData.gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(formData.gst)) {
      newErrors.gst = 'Please provide a valid GST number';
    }

    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // PIN code validation
    if (formData.locationPin && !/^[1-9][0-9]{5}$/.test(formData.locationPin)) {
      newErrors.locationPin = 'Please enter a valid 6-digit PIN code';
    }

    // Company Admin validation — always required when creating a new company
    if (!company) {
      if (!formData.adminName?.trim()) newErrors.adminName = "Admin name is required";
      if (!formData.adminEmail?.trim()) newErrors.adminEmail = "Admin email is required";
      else if (!/^\S+@\S+\.\S+$/.test(formData.adminEmail)) newErrors.adminEmail = "Invalid admin email";
      if (!formData.adminPassword?.trim()) newErrors.adminPassword = "Admin password is required";
      else if (formData.adminPassword.length < 6) newErrors.adminPassword = "Password must be at least 6 characters";
      if (!formData.adminPhone?.trim()) newErrors.adminPhone = "Admin phone is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Pass stampFile as second arg so parent can upload it after company creation
    onSubmit(formData, stampFile || null);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        <DialogDescription>
          {company ? 'Update company information' : 'Fill in the details to create a new company'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {/* Company Information Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Company Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitName">Unit Name *</Label>
              <Input
                id="unitName"
                value={formData.unitName}
                onChange={(e) => handleChange('unitName', e.target.value)}
                placeholder="Enter unit name"
                className={errors.unitName ? 'border-red-500' : ''}
              />
              {errors.unitName && <p className="text-sm text-red-500">{errors.unitName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter company name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                placeholder="Enter legal name"
                className={errors.legalName ? 'border-red-500' : ''}
              />
              {errors.legalName && <p className="text-sm text-red-500">{errors.legalName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyType">Company Type</Label>
              <select
                id="companyType"
                value={formData.companyType}
                onChange={(e) => handleChange('companyType', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select company type</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="LLP">LLP</option>
                <option value="Partnership">Partnership</option>
                <option value="Proprietorship">Proprietorship</option>
                <option value="OPC">OPC (One Person Company)</option>
                <option value="Other">Other</option>
              </select>
              {errors.companyType && <p className="text-sm text-red-500">{errors.companyType}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                placeholder="+91-9876543210"
                className={errors.mobile ? 'border-red-500' : ''}
              />
              {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="company@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* Location Information Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Location Information</h4>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter complete address"
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Enter city"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="Enter state"
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationPin">PIN Code *</Label>
              <Input
                id="locationPin"
                value={formData.locationPin}
                onChange={(e) => handleChange('locationPin', e.target.value)}
                placeholder="123456"
                className={errors.locationPin ? 'border-red-500' : ''}
              />
              {errors.locationPin && <p className="text-sm text-red-500">{errors.locationPin}</p>}
            </div>
          </div>
        </div>

        {/* Legal Information Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Legal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number</Label>
              <Input
                id="pan"
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className={errors.pan ? 'border-red-500' : ''}
              />
              {errors.pan && <p className="text-sm text-red-500">{errors.pan}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst">GST Number *</Label>
              <Input
                id="gst"
                value={formData.gst}
                onChange={(e) => handleChange('gst', e.target.value.toUpperCase())}
                placeholder="07AABCT1234H1Z5"
                className={errors.gst ? 'border-red-500' : ''}
              />
              {errors.gst && <p className="text-sm text-red-500">{errors.gst}</p>}
            </div>
          </div>
        </div>

        {/* Company Admin Section — always shown for new company */}
        {!company && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Company Admin Account</h4>
              <p className="text-xs text-muted-foreground mt-0.5">This admin account will be used to manage this company's HRMS data.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 border border-blue-100 p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Full Name *</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => handleChange('adminName', e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className={errors.adminName ? 'border-red-500' : ''}
                />
                {errors.adminName && <p className="text-sm text-red-500">{errors.adminName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email (Login ID) *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleChange('adminEmail', e.target.value)}
                  placeholder="admin@company.com"
                  className={errors.adminEmail ? 'border-red-500' : ''}
                />
                {errors.adminEmail && <p className="text-sm text-red-500">{errors.adminEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPhone">Admin Phone *</Label>
                <Input
                  id="adminPhone"
                  value={formData.adminPhone}
                  onChange={(e) => handleChange('adminPhone', e.target.value)}
                  placeholder="+91-9876543210"
                  className={errors.adminPhone ? 'border-red-500' : ''}
                />
                {errors.adminPhone && <p className="text-sm text-red-500">{errors.adminPhone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => handleChange('adminPassword', e.target.value)}
                  placeholder="Min 6 characters"
                  className={errors.adminPassword ? 'border-red-500' : ''}
                />
                {errors.adminPassword && <p className="text-sm text-red-500">{errors.adminPassword}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Company Stamp Section ── */}
        <div className={`space-y-3 pt-4 border-t ${stampError ? 'border-red-300' : ''}`}>
          <div className="flex items-center gap-2">
            <Stamp className="h-4 w-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Company Stamp
              {!company && <span className="text-red-500 ml-1">*</span>}
            </h4>
            {company?.stampUrl && !stampFile && (
              <span className="ml-auto text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            This stamp will appear on all Customer & Dealer Quotations generated by this company's salespersons.
            Accepted: JPG, PNG, WEBP (max 5MB)
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Preview */}
            <div className="flex-shrink-0">
              {currentStampSrc ? (
                <div className="relative w-36 h-28 border-2 border-orange-200 rounded-lg overflow-hidden bg-orange-50 flex items-center justify-center shadow-sm">
                  <img
                    src={currentStampSrc}
                    alt="Stamp Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {stampFile && (
                    <button
                      type="button"
                      onClick={removeStamp}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-36 h-28 border-2 border-dashed border-orange-300 rounded-lg flex flex-col items-center justify-center bg-orange-50 gap-1">
                  <Image className="w-7 h-7 text-orange-300" />
                  <span className="text-[11px] text-orange-400 text-center">No stamp</span>
                </div>
              )}
            </div>

            {/* Upload control */}
            <div className="flex-1 space-y-2">
              <input
                ref={stampInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleStampChange}
                className="hidden"
                id="stamp-file-input"
              />
              <label
                htmlFor="stamp-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-300 text-orange-700 rounded-md cursor-pointer hover:bg-orange-100 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                {stampFile ? 'Change Stamp' : company?.stampUrl ? 'Replace Stamp' : 'Choose Stamp Image'}
              </label>

              {stampFile && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  <Image className="w-3 h-3" />
                  <span>{stampFile.name} ({(stampFile.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" onClick={removeStamp} className="ml-auto text-red-500 hover:text-red-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {company?.stampUrl && !stampFile && (
                <p className="text-xs text-slate-500 italic">Upload a new image to replace the existing stamp.</p>
              )}

              {stampError && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{stampError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Server-side error banner */}
      {serverError && (
        <div className="mx-0 mb-2 p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-700 font-medium">
          {serverError}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (company ? 'Update' : 'Create')}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Company View Details Component
const CompanyViewDetails = ({ company }) => {
  return (
    <div>
      <DialogHeader>
        <DialogTitle>{company.name}</DialogTitle>
        <DialogDescription>{company.unitName}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <div className="mt-1">
              <Badge variant={company.isActive ? 'default' : 'secondary'}>
                {company.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
          <p className="mt-1">{company.fullAddress || `${company.address}, ${company.city}, ${company.state} - ${company.locationPin}`}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Contact Details</Label>
            <div className="mt-1 space-y-1">
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                <span className="text-sm">{company.mobile}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                <span className="text-sm">{company.email}</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Business Hours</Label>
            <div className="mt-1 flex items-center">
              <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
              <span className="text-sm">
                {company.businessHours?.opening || '09:00'} - {company.businessHours?.closing || '18:00'}
              </span>
            </div>
          </div>
        </div>

        {company.companyAdmin && (
          <div className="border-t pt-3">
            <Label className="text-sm font-semibold text-gray-900">Company Admin Details</Label>
            <div className="mt-1.5 space-y-1 bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm">
              <div><span className="font-medium text-slate-700">Name:</span> {company.companyAdmin.fullName}</div>
              <div><span className="font-medium text-slate-700">Email:</span> {company.companyAdmin.email}</div>
              <div><span className="font-medium text-slate-700">Phone:</span> {company.companyAdmin.mobile}</div>
            </div>
          </div>
        )}

        {/* Company Stamp */}
        <div className="border-t pt-3">
          <Label className="text-sm font-semibold text-gray-900">Company Stamp</Label>
          {company.stampUrl ? (
            <div className="mt-2 border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50 inline-block">
              <img
                src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api','')}${company.stampUrl}`}
                alt="Company Stamp"
                className="max-h-28 object-contain"
                onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
              />
              <p className="hidden text-xs text-slate-400 italic">Stamp image unavailable</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400 italic">No stamp uploaded yet. Use "Upload Stamp" from the company menu.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminCompanies;