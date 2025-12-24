import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  Package,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  CheckCheck,
  Minus,
  ChevronDown,
  ChevronRight,
  Settings
} from "lucide-react";

export default function UnitManagerReturns() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Check permissions
  const canView = hasFeatureAccess('unitManager', 'returns', 'view');
  const canAdd = hasFeatureAccess('unitManager', 'returns', 'add');
  const canEdit = hasFeatureAccess('unitManager', 'returns', 'edit');
  const canDelete = hasFeatureAccess('unitManager', 'returns', 'delete');
  const canApprove = hasFeatureAccess('unitManager', 'returns', 'alter');

  // Fetch sales persons for dropdown
  const { data: salesPersonsData = [] } = useQuery({
    queryKey: ['unitManager', 'salesPersons'],
    queryFn: async () => {
      console.log('🔄 Fetching sales persons...');
      const response = await fetch('/api/unit-manager/sales-persons', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Sales persons response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch sales persons');
      }
      
      return data.data || [];
    },
    enabled: !!user && !!localStorage.getItem('token')
  });

  // Fetch returns list
  const { 
    data: returnsData = [], 
    isLoading: returnsLoading, 
    error: returnsError,
    refetch: refetchReturns 
  } = useQuery({
    queryKey: ['unitManager', 'returns', selectedSalesPerson, statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      console.log('🔄 Fetching returns...');
      const params = new URLSearchParams();
      if (selectedSalesPerson && selectedSalesPerson !== "all") {
        params.append('salesPersonId', selectedSalesPerson);
      }
      if (statusFilter && statusFilter !== "all") {
        params.append('status', statusFilter);
      }
      if (typeFilter && typeFilter !== "all") {
        params.append('type', typeFilter);
      }
      
      const response = await fetch(`/api/unit-manager/returns?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Returns response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch returns');
      }
      
      return data.data || [];
    },
    enabled: !!user && !!localStorage.getItem('token')
  });

  // Fetch customers for modal
  const { data: customersData = [] } = useQuery({
    queryKey: ['unitManager', 'customers'],
    queryFn: async () => {
      console.log('🔄 Fetching customers...');
      const response = await fetch('/api/unit-manager/customers', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Customers response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch customers');
      }
      
      return data.data || [];
    },
    enabled: !!user && !!localStorage.getItem('token') && (isAddModalOpen || isEditModalOpen)
  });

  // Fetch items for modal
  const { data: itemsData = [] } = useQuery({
    queryKey: ['unitManager', 'items'],
    queryFn: async () => {
      console.log('🔄 Fetching items...');
      const response = await fetch('/api/unit-manager/items', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Items response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch items');
      }
      
      return data.data || data.items || [];
    },
    enabled: !!user && !!localStorage.getItem('token') && (isAddModalOpen || isEditModalOpen)
  });

  // Filter returns based on search
  const filteredReturns = useMemo(() => {
    if (!returnsData || returnsData.length === 0) return [];
    
    return returnsData.filter(returnItem => {
      const matchesSearch = !searchTerm || 
        (returnItem.customerName && returnItem.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (returnItem.reason && returnItem.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (returnItem.salesPersonName && returnItem.salesPersonName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [returnsData, searchTerm]);

  // Group items by category for modal
  const groupedItems = useMemo(() => {
    if (!itemsData || itemsData.length === 0) return {};
    return itemsData.reduce((grouped, item) => {
      const categoryName = item.category || "Uncategorized";
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push({
        _id: item._id,
        name: item.name,
        price: item.salePrice || item.stdCost || 0,
        image: item.image || null,
        category: categoryName,
        stock: item.qty || 0,
        unit: item.unit || "pcs",
        code: item.code || "",
      });
      return grouped;
    }, {});
  }, [itemsData]);

  // CRUD Operations
  const handleCreateReturn = async (formData) => {
    try {
      console.log('🔄 Creating return:', formData);
      const response = await fetch('/api/unit-manager/create-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      console.log('✅ Create return response:', data);
      
      toast({
        title: "Success",
        description: "Return created successfully",
      });
      
      queryClient.invalidateQueries(['unitManager', 'returns']);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("❌ Error creating return:", error);
      toast({
        title: "Error",
        description: "Failed to create return: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateReturn = async (formData) => {
    try {
      console.log('🔄 Updating return:', selectedReturn._id, 'with formData:', formData);
      const response = await fetch(`/api/unit-manager/update-return/${selectedReturn._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      console.log('✅ Update return response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update return');
      }
      
      toast({
        title: "Success",
        description: "Return updated successfully",
      });
      
      queryClient.invalidateQueries(['unitManager', 'returns']);
      setIsEditModalOpen(false);
      setSelectedReturn(null);
    } catch (error) {
      console.error("❌ Error updating return:", error);
      toast({
        title: "Error",
        description: "Failed to update return: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteReturn = async (returnId) => {
    if (!confirm("Are you sure you want to delete this return?")) return;
    
    try {
      console.log('🔄 Deleting return:', returnId);
      const response = await fetch(`/api/unit-manager/delete-return/${returnId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('✅ Delete return response:', data);
      
      toast({
        title: "Success",
        description: "Return deleted successfully",
      });
      
      queryClient.invalidateQueries(['unitManager', 'returns']);
    } catch (error) {
      console.error("❌ Error deleting return:", error);
      toast({
        title: "Error",
        description: "Failed to delete return: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateReturnStatus = async (returnId, newStatus) => {
    try {
      console.log('🔄 Updating return status:', returnId, newStatus);
      const response = await fetch(`/api/unit-manager/update-return-status/${returnId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      console.log('✅ Update status response:', data);
      
      toast({
        title: "Success",
        description: `Return status updated to ${newStatus}`,
      });
      
      queryClient.invalidateQueries(['unitManager', 'returns']);
      setIsStatusModalOpen(false);
      setSelectedReturn(null);
    } catch (error) {
      console.error("❌ Error updating return status:", error);
      toast({
        title: "Error",
        description: "Failed to update return status: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleApproveReturn = async (returnId) => {
    try {
      console.log('🔄 Approving return:', returnId);
      const response = await fetch(`/api/unit-manager/approve-return/${returnId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('✅ Approve return response:', data);
      
      toast({
        title: "Success",
        description: "Return approved successfully",
      });
      
      queryClient.invalidateQueries(['unitManager', 'returns']);
    } catch (error) {
      console.error("❌ Error approving return:", error);
      toast({
        title: "Error",
        description: "Failed to approve return: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  // Check permissions
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to view returns & damage
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            Returns & Damage Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and approve returns and damage from sales persons
          </p>
        </div>
        {canAdd && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
            Add Return/Damage
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Sales Persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Persons</SelectItem>
                {salesPersonsData.map((sp) => (
                  <SelectItem key={sp._id} value={sp._id}>
                    {sp.fullName || sp.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={refetchReturns}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {returnsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
              <span className="ml-2">Loading returns...</span>
            </div>
          ) : returnsError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Error Loading Returns
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {returnsError.message || "Failed to load returns data"}
              </p>
              <Button onClick={refetchReturns} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No returns found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>CUSTOMER</TableHead>
                    <TableHead>RETURN DATE</TableHead>
                    <TableHead>SALES PERSON</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead>ITEMS</TableHead>
                    <TableHead>TOTAL AMOUNT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((returnItem) => (
                    <TableRow key={returnItem._id}>
                      <TableCell className="font-medium">
                        {returnItem.customerName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {returnItem.salesPersonName || returnItem.salesPerson?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`font-semibold text-xs px-3 py-1 rounded-full ${
                            returnItem.type === 'damage' 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {(returnItem.type || 'refund').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {returnItem.items ? returnItem.items.length : 0} items
                      </TableCell>
                      <TableCell>
                        ₹{returnItem.items ? returnItem.items.reduce((sum, item) => 
                          sum + (item.pricePerUnit * item.quantity), 0
                        ).toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`font-semibold text-xs px-3 py-1 rounded-full ${
                            returnItem.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                            returnItem.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                            returnItem.status === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            returnItem.status === 'completed' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}
                        >
                          {(returnItem.status || 'pending').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem);
                              setIsViewModalOpen(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem);
                              setIsStatusModalOpen(true);
                            }}
                            title="Update Status"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReturn(returnItem);
                                setIsEditModalOpen(true);
                              }}
                              title="Edit Return/Damage"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canApprove && returnItem.status !== 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveReturn(returnItem._id)}
                              title="Approve Return"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReturn(returnItem._id)}
                              title="Delete Return"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {isAddModalOpen && (
        <AddReturnModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateReturn}
          salesPersons={salesPersonsData}
          customers={customersData}
          groupedItems={groupedItems}
        />
      )}

      {isEditModalOpen && selectedReturn && (
        <EditReturnModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleUpdateReturn}
          returnData={selectedReturn}
          salesPersons={salesPersonsData}
          customers={customersData}
          groupedItems={groupedItems}
        />
      )}

      {isViewModalOpen && selectedReturn && (
        <ViewReturnModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedReturn(null);
          }}
          returnData={selectedReturn}
        />
      )}

      {isStatusModalOpen && selectedReturn && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleUpdateReturnStatus}
          returnData={selectedReturn}
        />
      )}
    </div>
  );
}

// Add Return/Damage Modal Component
const AddReturnModal = ({ isOpen, onClose, onSubmit, salesPersons, customers, groupedItems }) => {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    salesPersonId: "",
    customerId: "",
    customerName: "",
    returnDate: new Date().toISOString().split('T')[0],
    reason: "",
    type: "refund",
    items: []
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.salesPersonId || formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields and select at least one item",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData);
  };

  const addItem = (item) => {
    const existingItem = formData.items.find(i => i.productId === item._id);
    if (existingItem) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.productId === item._id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          productId: item._id,
          productName: item.name,
          categoryName: item.category,
          pricePerUnit: item.price,
          quantity: 1,
          unit: item.unit
        }]
      }));
    }
  };

  const removeItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.productId !== productId)
    }));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.productId === productId 
          ? { ...i, quantity }
          : i
      )
    }));
  };

  const totalAmount = formData.items.reduce((sum, item) => 
    sum + (item.pricePerUnit * item.quantity), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-600">Add New Return/Damage</DialogTitle>
          <DialogDescription>
            Create a new return entry by selecting products and specifying details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salesPersonId">Sales Person *</Label>
              <Select 
                value={formData.salesPersonId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, salesPersonId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  {salesPersons.map((sp) => (
                    <SelectItem key={sp._id} value={sp._id}>
                      {sp.fullName || sp.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="returnDate">Return Date *</Label>
              <Input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => {
                  const customer = customers.find(c => c._id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    customerId: value,
                    customerName: customer?.name || ""
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search and select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              placeholder="Enter reason for return..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          {/* Category-wise Item Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Items</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg">
              {Object.entries(groupedItems).map(([category, items]) => {
                const isExpanded = expandedCategories[category] || false;
                
                const toggleCategory = () => {
                  setExpandedCategories(prev => ({
                    ...prev,
                    [category]: !prev[category]
                  }));
                };
                
                return (
                  <div key={category} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={toggleCategory}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {category} ({items.length} items)
                        </span>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="pb-2">
                        {items.map((item) => {
                          const selectedItem = formData.items.find(i => i.productId === item._id);
                          const quantity = selectedItem?.quantity || 0;
                          
                          return (
                            <div key={item._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-t">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {item.name}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  ₹{(item.price || 0).toFixed(0)} per pieces
                                </p>
                                <p className="text-xs text-gray-400">
                                  Stock: {item.stock || 0} pieces
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 0;
                                    if (newQuantity === 0) {
                                      // Remove item if quantity is 0
                                      setFormData(prev => ({
                                        ...prev,
                                        items: prev.items.filter(i => i.productId !== item._id)
                                      }));
                                    } else {
                                      // Update or add item
                                      const existingItem = formData.items.find(i => i.productId === item._id);
                                      if (existingItem) {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: prev.items.map(i => 
                                            i.productId === item._id 
                                              ? { ...i, quantity: newQuantity }
                                              : i
                                          )
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: [...prev.items, {
                                            productId: item._id,
                                            productName: item.name,
                                            categoryName: item.category,
                                            pricePerUnit: item.price || 0,
                                            quantity: newQuantity,
                                            unit: item.unit || 'pieces'
                                          }]
                                        }));
                                      }
                                    }
                                  }}
                                  className="w-16 h-8 text-center"
                                  min="0"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Total Items: {formData.items.length}</span>
                <span className="font-bold text-xl text-gray-600">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.customerId || !formData.salesPersonId || formData.items.length === 0}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Create Return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Return/Damage Modal Component
const EditReturnModal = ({ isOpen, onClose, onSubmit, returnData, salesPersons, customers, groupedItems }) => {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    salesPersonId: "",
    customerId: "",
    customerName: "",
    returnDate: new Date().toISOString().split('T')[0],
    reason: "",
    type: "refund",
    items: []
  });

  useEffect(() => {
    if (returnData && customers && customers.length > 0) {
      console.log('🔄 EditReturnModal - Loading returnData:', returnData);
      console.log('🔄 EditReturnModal - Customers available:', customers.length);
      
      // Map existing items properly
      const mappedItems = returnData.items?.map(item => ({
        productId: item.productId || item._id,
        productName: item.productName || item.name,
        categoryName: item.categoryName || item.category,
        pricePerUnit: item.pricePerUnit || item.price || 0,
        quantity: item.quantity || 1,
        unit: item.unit || 'pieces'
      })) || [];

      console.log('🔄 EditReturnModal - Mapped items:', mappedItems);

      // Debug customer data mapping - comprehensive logging
      console.log('🔍 FULL RETURN DATA:', JSON.stringify(returnData, null, 2));
      console.log('🔍 CUSTOMERS LIST:', JSON.stringify(customers, null, 2));

      // Try multiple ways to find the customer ID
      let customerId = "";
      let customerName = "";

      // Method 1: Direct customer object
      if (returnData.customer && returnData.customer._id) {
        customerId = typeof returnData.customer._id === 'object' ? returnData.customer._id._id || returnData.customer._id.id : returnData.customer._id;
        customerName = typeof returnData.customer.name === 'object' ? returnData.customer.name.name : returnData.customer.name || returnData.customerName;
        console.log('✅ Method 1 - Found customer via returnData.customer');
      }
      // Method 2: Direct customerId
      else if (returnData.customerId) {
        customerId = typeof returnData.customerId === 'object' ? returnData.customerId._id || returnData.customerId.id : returnData.customerId;
        customerName = typeof returnData.customerName === 'object' ? returnData.customerName.name : returnData.customerName;
        console.log('✅ Method 2 - Found customer via returnData.customerId');
      }
      // Method 3: Find by customerName in customers list
      else if (returnData.customerName && customers) {
        const customerNameStr = typeof returnData.customerName === 'object' ? returnData.customerName.name : returnData.customerName;
        const foundCustomer = customers.find(c => 
          c.name === customerNameStr || 
          c.name.toLowerCase() === customerNameStr.toLowerCase()
        );
        if (foundCustomer) {
          customerId = foundCustomer._id;
          customerName = foundCustomer.name;
          console.log('✅ Method 3 - Found customer by name match');
        }
      }
      // Method 4: Try any ID field that might exist
      else if (returnData._customer || returnData.customerData) {
        const customerData = returnData._customer || returnData.customerData;
        customerId = typeof customerData._id === 'object' ? customerData._id._id || customerData._id.id : customerData._id || customerData.id;
        customerName = typeof customerData.name === 'object' ? customerData.name.name : customerData.name || returnData.customerName;
        console.log('✅ Method 4 - Found customer via alternate field');
      }

      console.log('🔍 FINAL CUSTOMER RESULT:', {
        customerId,
        customerName,
        foundInCustomersList: customers?.find(c => c._id === customerId)
      });

      const formDataToSet = {
        salesPersonId: returnData.salesPerson?._id || returnData.salesPersonId || "",
        customerId: customerId,
        customerName: customerName,
        returnDate: returnData.returnDate ? new Date(returnData.returnDate).toISOString().split('T')[0] : "",
        reason: returnData.reason || "",
        type: returnData.type || "refund",
        items: mappedItems
      };

      console.log('🔄 EditReturnModal - Setting form data:', formDataToSet);
      console.log('🔍 Final customer mapping:', {
        customerId: formDataToSet.customerId,
        customerName: formDataToSet.customerName,
        customerExists: customers?.find(c => c._id === formDataToSet.customerId)
      });
      setFormData(formDataToSet);

      // Auto-expand categories that have selected items
      const categoriesWithItems = [...new Set(mappedItems.map(item => item.categoryName))];
      const expansionState = {};
      categoriesWithItems.forEach(category => {
        if (category) expansionState[category] = true;
      });
      setExpandedCategories(expansionState);
    }
  }, [returnData, customers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('🔍 EditReturnModal handleSubmit - Current formData:', formData);
    console.log('🔍 Validation check:', {
      customerId: formData.customerId,
      salesPersonId: formData.salesPersonId,
      itemsLength: formData.items.length,
      hasCustomerId: !!formData.customerId,
      hasSalesPersonId: !!formData.salesPersonId,
      hasItems: formData.items.length > 0
    });
    
    if (!formData.customerId) {
      console.log('❌ Customer not selected');
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (!formData.salesPersonId) {
      console.log('❌ Sales Person not selected');
      toast({
        title: "Error", 
        description: "Please select a sales person",
        variant: "destructive",
      });
      return;
    }

    if (formData.items.length === 0) {
      console.log('❌ No items selected');
      toast({
        title: "Error",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validation passed, submitting...');
    onSubmit(formData);
  };

  const totalAmount = formData.items.reduce((sum, item) => 
    sum + (item.pricePerUnit * item.quantity), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-600">Edit Return/Damage</DialogTitle>
          <DialogDescription>
            Update the return details and information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salesPersonId">Sales Person *</Label>
              <Select 
                value={formData.salesPersonId} 
                onValueChange={(value) => {
                  console.log('🔄 EditModal - Sales Person selected:', value);
                  setFormData(prev => ({ ...prev, salesPersonId: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  {salesPersons.map((sp) => (
                    <SelectItem key={sp._id} value={sp._id}>
                      {sp.fullName || sp.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select 
                key={`customer-${typeof formData.customerId === 'object' ? formData.customerId?._id : formData.customerId}`}
                value={typeof formData.customerId === 'object' ? formData.customerId?._id || "" : formData.customerId || ""} 
                onValueChange={(value) => {
                  const customer = customers.find(c => c._id === value);
                  console.log('🔄 Customer selected:', { value, customer });
                  console.log('🔍 Available customers:', customers);
                  setFormData(prev => ({ 
                    ...prev, 
                    customerId: value,
                    customerName: customer?.name || ""
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer">
                    {typeof formData.customerName === 'object' ? formData.customerName?.name : formData.customerName || "Select customer"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="returnDate">Return Date *</Label>
              <Input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              placeholder="Enter reason for return..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          {/* Category-wise Item Selection for Edit Modal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Items</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg">
              {Object.entries(groupedItems).map(([category, items]) => {
                const isExpanded = expandedCategories[category] || false;
                
                const toggleCategory = () => {
                  setExpandedCategories(prev => ({
                    ...prev,
                    [category]: !prev[category]
                  }));
                };
                
                return (
                  <div key={category} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={toggleCategory}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {category} ({items.length} items)
                        </span>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="pb-2">
                        {items.map((item) => {
                          const selectedItem = formData.items.find(i => i.productId === item._id);
                          const quantity = selectedItem?.quantity || 0;
                          
                          return (
                            <div key={item._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-t">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {item.name}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  ₹{(item.price || 0).toFixed(0)} per pieces
                                </p>
                                <p className="text-xs text-gray-400">
                                  Stock: {item.stock || 0} pieces
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 0;
                                    if (newQuantity === 0) {
                                      // Remove item if quantity is 0
                                      setFormData(prev => ({
                                        ...prev,
                                        items: prev.items.filter(i => i.productId !== item._id)
                                      }));
                                    } else {
                                      // Update or add item
                                      const existingItem = formData.items.find(i => i.productId === item._id);
                                      if (existingItem) {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: prev.items.map(i => 
                                            i.productId === item._id 
                                              ? { ...i, quantity: newQuantity }
                                              : i
                                          )
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: [...prev.items, {
                                            productId: item._id,
                                            productName: item.name,
                                            categoryName: item.category,
                                            pricePerUnit: item.price || 0,
                                            quantity: newQuantity,
                                            unit: item.unit || 'pieces'
                                          }]
                                        }));
                                      }
                                    }
                                  }}
                                  className="w-16 h-8 text-center"
                                  min="0"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Total Items: {formData.items.length}</span>
                <span className="font-bold text-xl text-gray-600">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-xl text-gray-600">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gray-500 hover:bg-gray-600">
              Update Return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// View Return/Damage Modal Component
const ViewReturnModal = ({ isOpen, onClose, returnData }) => {
  if (!returnData) return null;

  const totalAmount = returnData.items?.reduce((sum, item) => 
    sum + (item.pricePerUnit * item.quantity), 0
  ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-600">Return/Damage Details</DialogTitle>
          <DialogDescription>
            View detailed information about this return/damage entry.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <p className="font-medium">{returnData.customerName || 'N/A'}</p>
            </div>
            <div>
              <Label>Sales Person</Label>
              <p className="font-medium">{returnData.salesPersonName || returnData.salesPerson?.fullName || 'N/A'}</p>
            </div>
            <div>
              <Label>Return Date</Label>
              <p className="font-medium">
                {returnData.returnDate ? new Date(returnData.returnDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <Label>Type</Label>
              <Badge 
                className={`font-semibold text-xs px-3 py-1 rounded-full ${
                  returnData.type === 'damage' 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {(returnData.type || 'refund').toUpperCase()}
              </Badge>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Badge 
              variant={
                returnData.status === 'approved' ? 'success' : 
                returnData.status === 'rejected' ? 'destructive' : 'secondary'
              }
            >
              {returnData.status || 'pending'}
            </Badge>
          </div>

          <div>
            <Label>Reason</Label>
            <p className="font-medium">{returnData.reason || 'N/A'}</p>
          </div>

          <div>
            <Label>Items ({returnData.items?.length || 0})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {returnData.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-gray-500">₹{item.pricePerUnit} × {item.quantity}</p>
                  </div>
                  <span className="font-medium">
                    ₹{(item.pricePerUnit * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-semibold text-lg text-gray-600">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Status Update Modal Component
const StatusUpdateModal = ({ isOpen, onClose, onSubmit, returnData }) => {
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (returnData) {
      setSelectedStatus(returnData.status || 'pending');
    }
  }, [returnData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedStatus) {
      onSubmit(returnData._id, selectedStatus);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-600 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Update Return Status
          </DialogTitle>
          <DialogDescription>
            Change the status of return for {returnData?.customerName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Current Status</Label>
            <div className="mt-2">
              <Badge 
                variant={
                  returnData?.status === 'approved' ? 'success' : 
                  returnData?.status === 'rejected' ? 'destructive' : 'secondary'
                }
                className="text-sm"
              >
                {returnData?.status || 'pending'}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Select New Status *</Label>
            <div className="mt-3 space-y-2">
              {statusOptions.map((status) => (
                <div key={status.value} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={status.value}
                    name="status"
                    value={status.value}
                    checked={selectedStatus === status.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                  />
                  <label htmlFor={status.value} className="flex items-center gap-2 cursor-pointer">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Return Details:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Customer:</strong> {returnData?.customerName}</p>
              <p><strong>Sales Person:</strong> {returnData?.salesPersonName}</p>
              <p><strong>Date:</strong> {returnData?.returnDate ? new Date(returnData.returnDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Items:</strong> {returnData?.items?.length || 0}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gray-500 hover:bg-gray-600"
              disabled={!selectedStatus || selectedStatus === returnData?.status}
            >
              <Settings className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
