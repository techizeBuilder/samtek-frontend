import { useState } from 'react';
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
  Stamp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { showSmartToast, showSuccessToast } from '@/lib/toast-utils';
import { apiRequest } from '@/lib/queryClient';
import { api } from '@/services/api';
import CompanyForm from '@/components/companies/CompanyForm';
import CompanyDetails from '@/components/companies/CompanyDetails';
import DeleteConfirmDialog from '@/components/inventory/DeleteConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, company: null });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['/api/companies', { city: cityFilter, unitName: unitFilter, name: searchTerm }],
    queryFn: () => {
      const params = {};
      if (cityFilter !== 'all') params.city = cityFilter;
      if (unitFilter !== 'all') params.unitName = unitFilter;
      if (searchTerm) params.name = searchTerm;
      return api.get(`/companies?${new URLSearchParams(params).toString()}`);
    }
  });

  const companies = companiesData?.companies || [];

  // Upload stamp helper
  const uploadStamp = async (companyId, uploadFn) => {
    if (typeof uploadFn === 'function') {
      await uploadFn(companyId);
      // Refetch companies to show updated stamp status
      queryClient.invalidateQueries(['/api/companies']);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: ({ data, uploadFn }) => api.post('/companies', data),
    onSuccess: async (result, { data, uploadFn }) => {
      const companyId = result?.company?._id || result?._id;
      if (companyId && uploadFn) {
        try {
          await uploadStamp(companyId, uploadFn);
        } catch (e) {
          toast({
            title: 'Warning',
            description: 'Company created but stamp upload failed. Please edit company to upload stamp.',
            variant: 'destructive',
          });
        }
      }
      queryClient.invalidateQueries(['/api/companies']);
      setShowForm(false);
      setEditingCompany(null);
      showSuccessToast('Success', 'Company created successfully');
    },
    onError: (error) => {
      // Show proper validation error message
      if (error.status === 400 && error.message) {
        toast({
          title: "Create Company: Validation Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        showSmartToast(error, 'Create Company');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, uploadFn }) => api.put(`/companies/${id}`, data),
    onSuccess: async (result, { id, uploadFn }) => {
      if (uploadFn) {
        try {
          await uploadStamp(id, uploadFn);
        } catch (e) {
          toast({
            title: 'Warning',
            description: 'Company updated but stamp upload failed.',
            variant: 'destructive',
          });
        }
      }
      queryClient.invalidateQueries(['/api/companies']);
      setShowForm(false);
      setEditingCompany(null);
      showSuccessToast('Success', 'Company updated successfully');
    },
    onError: (error) => {
      // Show proper validation error message
      if (error.status === 400 && error.message) {
        toast({
          title: "Update Company: Validation Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        showSmartToast(error, 'Update Company');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/companies']);
      setDeleteConfirm({ isOpen: false, company: null });
      showSuccessToast('Success', 'Company deleted successfully');
    },
    onError: (error) => {
      showSmartToast(error, 'Delete Company');
    }
  });

  // handleFormSubmit receives (data, uploadFn) from CompanyForm
  const handleFormSubmit = (data, uploadFn) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany._id, data, uploadFn });
    } else {
      createMutation.mutate({ data, uploadFn });
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleView = (company) => {
    setViewingCompany(company);
  };

  const handleDelete = (company) => {
    setDeleteConfirm({ isOpen: true, company });
  };

  const confirmDelete = () => {
    if (deleteConfirm.company) {
      deleteMutation.mutate(deleteConfirm.company._id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries(['/api/companies']);
  };

  // Get unique cities and units for filters
  const cities = [...new Set(companies.map(c => c.city))].sort();
  const units = [...new Set(companies.map(c => c.unitName))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-semibold">Companies</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search companies by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Details</TableHead>
                  <TableHead>Unit & Location</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Legal Info</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Stamp className="h-4 w-4" />
                      Stamp
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No companies found. Add your first company to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {company.name}
                          </div>
                          {company.legalName && (
                            <div className="text-xs text-gray-500">
                              Legal: {company.legalName}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {company.address}
                          </div>
                          {company.companyType && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {company.companyType}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {company.unitName}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {company.city}, {company.state}
                          </div>
                          <div className="text-xs text-gray-500">
                            PIN: {company.locationPin}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {company.mobile}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {company.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {company.pan && (
                            <div className="text-sm font-medium">
                              PAN: {company.pan}
                            </div>
                          )}
                          <div className="text-sm font-medium">
                            GST: {company.gst}
                          </div>
                        </div>
                      </TableCell>
                      {/* Stamp Status Column */}
                      <TableCell className="text-center">
                        {company.stampUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-[10px] text-green-600 font-medium">Uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <AlertCircle className="h-5 w-5 text-amber-400" />
                            <span className="text-[10px] text-amber-500 font-medium">Missing</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(company)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(company)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Company
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(company)}
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
        </CardContent>
      </Card>

      {/* Company Form Modal */}
      <CompanyForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Company Details Modal */}
      <CompanyDetails
        isOpen={!!viewingCompany}
        onClose={() => setViewingCompany(null)}
        company={viewingCompany}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, company: null })}
        onConfirm={confirmDelete}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        itemName={deleteConfirm.company?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}