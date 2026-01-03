import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Plus, Search, Edit, Trash2, Eye, Handshake, Star } from 'lucide-react';
import ExcelImportExport from '@/components/inventory/ExcelImportExport';

export default function Suppliers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [supplierType, setSupplierType] = useState('');

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: [`/api/suppliers?page=${page}&limit=10&search=${search}&supplierType=${supplierType}`],
    enabled: true
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId) => api.delete(`/suppliers/${supplierId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  const getSupplierTypeColor = (type) => {
    switch (type) {
      case 'Raw Material':
        return 'bg-blue-100 text-blue-800';
      case 'Services':
        return 'bg-green-100 text-green-800';
      case 'Equipment':
        return 'bg-purple-100 text-purple-800';
      case 'Consumables':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStarRating = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating})</span>
      </div>
    );
  };

  const handleDeleteSupplier = (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplierMutation.mutate(supplierId);
    }
  };

  const suppliers = suppliersData?.suppliers || [];
  const pagination = suppliersData?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Handshake className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-semibold">Suppliers</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExcelImportExport type="suppliers" />
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={supplierType}
              onChange={(e) => setSupplierType(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Types</option>
              <option value="Raw Material">Raw Material</option>
              <option value="Services">Services</option>
              <option value="Equipment">Equipment</option>
              <option value="Consumables">Consumables</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No suppliers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Supplier Code</th>
                    <th className="text-left py-3 px-4 font-medium">Supplier Name</th>
                    <th className="text-left py-3 px-4 font-medium">Contact Person</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Rating</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{supplier.supplierCode}</td>
                      <td className="py-3 px-4">{supplier.supplierName}</td>
                      <td className="py-3 px-4">{supplier.contactPerson}</td>
                      <td className="py-3 px-4">{supplier.email}</td>
                      <td className="py-3 px-4">
                        <Badge className={getSupplierTypeColor(supplier.supplierType)}>
                          {supplier.supplierType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {renderStarRating(supplier.rating || 3)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSupplier(supplier._id)}
                            disabled={deleteSupplierMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} suppliers
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
