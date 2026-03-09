import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
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
  Filter,
  Edit,
  Eye,
  Trash2,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  CheckCheck,
  Minus
} from "lucide-react";

export default function UnitManagerDamages() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState(null);

  // Check permissions
  const canView = hasFeatureAccess('unitManager', 'damages', 'view');
  const canAdd = hasFeatureAccess('unitManager', 'damages', 'add');
  const canEdit = hasFeatureAccess('unitManager', 'damages', 'edit');
  const canDelete = hasFeatureAccess('unitManager', 'damages', 'delete');
  const canApprove = hasFeatureAccess('unitManager', 'damages', 'alter');

  // API Queries using the correct format

  // Fetch sales persons for dropdown
  const { data: salesPersonsData = [] } = useQuery({
    queryKey: ['unitManager', 'salesPersons'],
    queryFn: async () => {
      console.log('🔄 Fetching sales persons...');
      const response = await apiRequest("GET", "/api/unit-manager/sales-persons");
      console.log('📋 Sales persons response:', response);
      return response.data || [];
    },
    enabled: !!user?.companyId
  });

  // Fetch damages list
  const {
    data: damagesData = [],
    isLoading: damagesLoading,
    error: damagesError,
    refetch: refetchDamages
  } = useQuery({
    queryKey: ['unitManager', 'damages', selectedSalesPerson, statusFilter, searchTerm],
    queryFn: async () => {
      console.log('🔄 Fetching damages...');
      const params = new URLSearchParams();
      if (selectedSalesPerson && selectedSalesPerson !== 'all') params.append('salesPersonId', selectedSalesPerson);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await apiRequest("GET", `/api/unit-manager/damages?${params.toString()}`);
      console.log('📋 Damages response:', response);
      return response.data || [];
    },
    enabled: !!user?.companyId
  });

  // Fetch customers for modal
  const { data: customersData = [] } = useQuery({
    queryKey: ['unitManager', 'customers'],
    queryFn: async () => {
      console.log('🔄 Fetching customers...');
      const response = await apiRequest("GET", "/api/unit-manager/customers");
      console.log('📋 Customers response:', response);
      return response.data || [];
    },
    enabled: !!user?.companyId && isAddModalOpen
  });

  // Fetch items for modal
  const { data: itemsData = [] } = useQuery({
    queryKey: ['unitManager', 'items'],
    queryFn: async () => {
      console.log('🔄 Fetching items...');
      const response = await apiRequest("GET", "/api/unit-manager/items");
      console.log('📋 Items response:', response);
      return response.data || response.items || [];
    },
    enabled: !!user?.companyId && isAddModalOpen
  });

  // Filter damages based on search
  const filteredDamages = useMemo(() => {
    if (!damagesData || damagesData.length === 0) return [];

    return damagesData.filter(damageItem => {
      const matchesSearch = !searchTerm ||
        (damageItem.customerName && damageItem.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (damageItem.reason && damageItem.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (damageItem.salesPersonName && damageItem.salesPersonName.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [damagesData, searchTerm]);

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
  const handleCreateDamage = async (formData) => {
    try {
      console.log('🔄 Creating damage:', formData);
      const response = await apiRequest("POST", "/api/unit-manager/create-damage", formData);
      console.log('✅ Create damage response:', response);

      toast({
        title: "Success",
        description: "Damage created successfully",
      });

      queryClient.invalidateQueries(['unitManager', 'damages']);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("❌ Error creating damage:", error);
      toast({
        title: "Error",
        description: "Failed to create damage: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateDamage = async (formData) => {
    try {
      console.log('🔄 Updating damage:', selectedDamage._id, formData);
      const response = await apiRequest("PUT", `/api/unit-manager/update-damage/${selectedDamage._id}`, formData);
      console.log('✅ Update damage response:', response);

      toast({
        title: "Success",
        description: "Damage updated successfully",
      });

      queryClient.invalidateQueries(['unitManager', 'damages']);
      setIsEditModalOpen(false);
      setSelectedDamage(null);
    } catch (error) {
      console.error("❌ Error updating damage:", error);
      toast({
        title: "Error",
        description: "Failed to update damage: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteDamage = async (damageId) => {
    if (!confirm("Are you sure you want to delete this damage?")) return;

    try {
      console.log('🔄 Deleting damage:', damageId);
      const response = await apiRequest("DELETE", `/api/unit-manager/delete-damage/${damageId}`);
      console.log('✅ Delete damage response:', response);

      toast({
        title: "Success",
        description: "Damage deleted successfully",
      });

      queryClient.invalidateQueries(['unitManager', 'damages']);
    } catch (error) {
      console.error("❌ Error deleting damage:", error);
      toast({
        title: "Error",
        description: "Failed to delete damage: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleApproveDamage = async (damageId) => {
    try {
      console.log('🔄 Approving damage:', damageId);
      const response = await apiRequest("POST", `/api/unit-manager/approve-damage/${damageId}`);
      console.log('✅ Approve damage response:', response);

      toast({
        title: "Success",
        description: "Damage approved successfully",
      });

      queryClient.invalidateQueries(['unitManager', 'damages']);
    } catch (error) {
      console.error("❌ Error approving damage:", error);
      toast({
        title: "Error",
        description: "Failed to approve damage: " + (error.message || "Unknown error"),
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to view damages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">
            Damages Management
          </h1>
          <p className="text-gray-600">
            Manage and approve damages from sales persons
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Damage
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
                  placeholder="Search damages..."
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

            <Button
              variant="outline"
              onClick={refetchDamages}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {damagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              <span className="ml-2">Loading damages...</span>
            </div>
          ) : damagesError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Damages
              </h3>
              <p className="text-gray-600 mb-4">
                {damagesError.message || "Failed to load damages data"}
              </p>
              <Button onClick={refetchDamages} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredDamages.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No damages found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CUSTOMER</TableHead>
                    <TableHead>DAMAGE DATE</TableHead>
                    <TableHead>SALES PERSON</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead>ITEMS</TableHead>
                    <TableHead>TOTAL AMOUNT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDamages.map((damageItem) => (
                    <TableRow key={damageItem._id}>
                      <TableCell className="font-medium">
                        {damageItem.customerName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {damageItem.returnDate ? new Date(damageItem.returnDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {damageItem.salesPersonName || damageItem.salesPerson?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-orange-200 text-orange-600">
                          damage
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {damageItem.items ? damageItem.items.length : 0} items
                      </TableCell>
                      <TableCell>
                        ${damageItem.items ? damageItem.items.reduce((sum, item) =>
                          sum + (item.pricePerUnit * item.quantity), 0
                        ).toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            damageItem.status === 'approved' ? 'success' :
                              damageItem.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {damageItem.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDamage(damageItem);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDamage(damageItem);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canApprove && damageItem.status !== 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveDamage(damageItem._id)}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDamage(damageItem._id)}
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
        <AddDamageModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateDamage}
          salesPersons={salesPersonsData}
          customers={customersData}
          groupedItems={groupedItems}
        />
      )}

      {isEditModalOpen && selectedDamage && (
        <EditDamageModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedDamage(null);
          }}
          onSubmit={handleUpdateDamage}
          damageData={selectedDamage}
          salesPersons={salesPersonsData}
          customers={customersData}
          groupedItems={groupedItems}
        />
      )}

      {isViewModalOpen && selectedDamage && (
        <ViewDamageModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedDamage(null);
          }}
          damageData={selectedDamage}
        />
      )}
    </div>
  );
}

// Modal Components
const AddDamageModal = ({ isOpen, onClose, onSubmit, salesPersons, customers, groupedItems }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    salesPersonId: "",
    customerId: "",
    customerName: "",
    returnDate: new Date().toISOString().split('T')[0],
    reason: "",
    type: "damage",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Add New Damage</DialogTitle>
          <DialogDescription>
            Create a new damage entry by selecting products and specifying details.
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
              <Label htmlFor="returnDate">Damage Date *</Label>
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
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              placeholder="Enter reason for damage..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          {/* Items Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Items</h3>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(groupedItems).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {Object.entries(groupedItems)
                .filter(([category]) => !selectedCategory || selectedCategory === 'all' || category === selectedCategory)
                .map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-gray-600 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {items
                        .filter(item =>
                          !searchTerm ||
                          item.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((item) => (
                          <div key={item._id} className="flex items-center gap-3 p-2 border rounded">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{item.name}</h4>
                              <p className="text-xs text-gray-500">${item.price}</p>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addItem(item)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Selected Items */}
          {formData.items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Selected Items</h3>
              <div className="space-y-2">
                {formData.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 p-3 border rounded">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      <p className="text-sm text-gray-500">${item.pricePerUnit} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-orange-50 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-semibold text-lg text-orange-600">${totalAmount.toFixed(2)}</span>
                </div>
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
              className="bg-orange-500 hover:bg-orange-600"
            >
              Create Damage
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditDamageModal = ({ isOpen, onClose, onSubmit, damageData, salesPersons, customers, groupedItems }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    salesPersonId: "",
    customerId: "",
    customerName: "",
    returnDate: new Date().toISOString().split('T')[0],
    reason: "",
    type: "damage",
    items: []
  });

  useEffect(() => {
    if (damageData) {
      setFormData({
        salesPersonId: damageData.salesPerson?._id || damageData.salesPersonId || "",
        customerId: damageData.customerId?._id || damageData.customerId || "",
        customerName: damageData.customerName || "",
        returnDate: damageData.returnDate ? new Date(damageData.returnDate).toISOString().split('T')[0] : "",
        reason: damageData.reason || "",
        type: damageData.type || "damage",
        items: damageData.items || []
      });
    }
  }, [damageData]);

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

  const totalAmount = formData.items.reduce((sum, item) =>
    sum + (item.pricePerUnit * item.quantity), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Edit Damage</DialogTitle>
          <DialogDescription>
            Update the damage details and information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                <SelectValue placeholder="Select customer" />
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
            <Label htmlFor="returnDate">Damage Date *</Label>
            <Input
              type="date"
              value={formData.returnDate}
              onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              placeholder="Enter reason for damage..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          <div className="p-4 bg-orange-50 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-semibold text-lg text-orange-600">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Update Damage
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ViewDamageModal = ({ isOpen, onClose, damageData }) => {
  if (!damageData) return null;

  const totalAmount = damageData.items?.reduce((sum, item) =>
    sum + (item.pricePerUnit * item.quantity), 0
  ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Damage Details</DialogTitle>
          <DialogDescription>
            View detailed information about this damage entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <p className="font-medium">{damageData.customerName || 'N/A'}</p>
            </div>
            <div>
              <Label>Sales Person</Label>
              <p className="font-medium">{damageData.salesPersonName || damageData.salesPerson?.fullName || 'N/A'}</p>
            </div>
            <div>
              <Label>Damage Date</Label>
              <p className="font-medium">
                {damageData.returnDate ? new Date(damageData.returnDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <Label>Type</Label>
              <Badge variant="outline" className="border-orange-200 text-orange-600">
                damage
              </Badge>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Badge
              variant={
                damageData.status === 'approved' ? 'success' :
                  damageData.status === 'rejected' ? 'destructive' : 'secondary'
              }
            >
              {damageData.status || 'pending'}
            </Badge>
          </div>

          <div>
            <Label>Reason</Label>
            <p className="font-medium">{damageData.reason || 'N/A'}</p>
          </div>

          <div>
            <Label>Items ({damageData.items?.length || 0})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {damageData.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-gray-500">${item.pricePerUnit} × {item.quantity}</p>
                  </div>
                  <span className="font-medium">
                    ${(item.pricePerUnit * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-semibold text-lg text-orange-600">${totalAmount.toFixed(2)}</span>
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
