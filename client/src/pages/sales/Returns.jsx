import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Minus,
  ShoppingCart,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// API service for fetching data
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Enhanced form component for returns
const CreateReturnForm = ({
  onClose,
  editData = null,
  onSubmit,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer: editData?.customerName || "",
    order: editData?.order?._id || editData?.order || "",
    date: editData?.returnDate
      ? new Date(editData.returnDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    reason: editData?.reason || "",
    products: [],
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Fetch orders for selected customer
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/sales/orders", selectedCustomerId],
    queryFn: () => apiRequest(`/api/sales/orders?customerId=${selectedCustomerId}&limit=1000`),
    enabled: !!selectedCustomerId,
  });

  const customerOrders = ordersResponse?.orders || [];

  const [productQuantities, setProductQuantities] = useState({});
  const [expandedBrands, setExpandedBrands] = useState({});

  // Fetch customers from API
  const {
    data: customersResponse,
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ["/api/sales/my-customers"],
    queryFn: () => apiRequest("/api/sales/my-customers"),
  });

  // Fetch inventory items (using sales-specific endpoint)
  const {
    data: itemsResponse,
    isLoading: itemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ["/api/sales/items"],
    queryFn: () => apiRequest("/api/sales/items"),
  });

  // Fetch categories from inventory
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
  });

  // Extract data from API responses
  const customers = customersResponse?.customers || [];
  const categories = categoriesResponse?.categories || [];
  const items = itemsResponse?.items || [];

  // Initialize selectedCustomerId if editData exists
  React.useEffect(() => {
    if (editData?.customerId && customers.length > 0) {
      setSelectedCustomerId(editData.customerId);
    }
  }, [editData, customers]);

  // Group items by category
  const itemsByCategory = React.useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      const categoryName = item.category || "Uncategorized";
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push({
        _id: item._id,
        name: item.name,
        price: item.salePrice || item.price || item.stdCost || 0,
        salePrice: item.salePrice || item.price || item.stdCost || 0,
        image: item.image || null,
        category: categoryName,
        stock: item.qty || item.quantity || 0,
        unit: item.unit || "pcs",
        code: item.code || "",
      });
    });
    return grouped;
  }, [items]);

  // Initialize data for edit mode
  React.useEffect(() => {
    if (editData?.items && items.length > 0) {
      const quantities = {};
      const categoriesToExpand = {};

      editData.items.forEach((returnItem) => {
        // Find the API item by productId or productName
        const apiItem = items.find((p) =>
          p._id === returnItem.productId ||
          p.name === returnItem.productName
        );
        if (apiItem) {
          quantities[apiItem._id] = returnItem.quantity || 0;
          const categoryName = apiItem.category || "Uncategorized";
          categoriesToExpand[categoryName] = true;
        }
      });

      setProductQuantities(quantities);
      setExpandedBrands(categoriesToExpand);
    }
  }, [editData, items]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Special handling for customer selection to fetch orders
      if (field === 'customer') {
        const selectedCustomer = customers.find(c => c.name === value);
        if (selectedCustomer) {
          setSelectedCustomerId(selectedCustomer._id);
          newData.order = ""; // Reset order when customer changes
        }
      }
      return newData;
    });
  };

  const handleQuantityChange = (productId, value) => {
    const numValue = parseInt(value) || 0;
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, numValue),
    }));
  };

  const toggleCategory = (category) => {
    setExpandedBrands((prev) => {
      const isCurrentlyExpanded = prev[category];
      const newState = {};
      if (!isCurrentlyExpanded) {
        newState[category] = true;
      }
      return newState;
    });
  };

  const getSelectedProducts = () => {
    return items
      .filter((item) => (productQuantities[item._id] || 0) > 0)
      .map((item) => ({
        ...item,
        returnQuantity: productQuantities[item._id],
      }));
  };

  const getSelectedUnits = () => {
    return Object.values(productQuantities).reduce(
      (total, quantity) => total + (quantity || 0),
      0,
    );
  };

  const calculateTotal = () => {
    return getSelectedProducts().reduce((total, item) => {
      const price = item.salePrice || item.price || item.stdCost || 0;
      const quantity = item.returnQuantity || 0;
      return total + (quantity * price);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customer) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter return quantities for at least one product",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for the return",
        variant: "destructive",
      });
      return;
    }

    // Find selected customer
    const selectedCustomer = customers.find(
      (c) => c.name === formData.customer,
    );
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Selected customer not found",
        variant: "destructive",
      });
      return;
    }

    // Prepare API payload
    const apiPayload = {
      customerId: selectedCustomer._id,
      customerName: selectedCustomer.name, // Required by backend model
      order: (formData.order && formData.order !== "none") ? formData.order : null,
      returnDate: formData.date,
      reason: formData.reason,
      type: "refund", // Backend expects 'refund' for returns
      items: selectedProducts.map((item) => {
        const pricePerUnit = item.salePrice || item.price || item.stdCost || 0;
        return {
          productId: item._id,
          productName: item.name,
          categoryName: item.category,
          pricePerUnit: pricePerUnit,
          quantity: item.returnQuantity,
          unit: item.unit || "pcs",
          totalAmount: pricePerUnit * item.returnQuantity
        };
      }),
    };

    // Call onSubmit with the API payload
    onSubmit(apiPayload);
  };

  return (
    <div className="space-y-4">
      {/* Customer Selection */}
      <div>
        <Label className="text-sm font-medium">Customer *</Label>
        <Select
          value={formData.customer}
          onValueChange={(value) => handleInputChange("customer", value)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customersLoading ? (
              <SelectItem value="loading" disabled>
                Loading customers...
              </SelectItem>
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <SelectItem
                  key={customer._id || customer.name}
                  value={customer.name}
                >
                  {customer.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-customers" disabled>
                No customers found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div>
        <Label className="text-sm font-medium">Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => handleInputChange("date", e.target.value)}
          className="h-11"
        />
      </div>

      {/* Order Selection */}
      <div>
        <Label className="text-sm font-medium">Order (Optional)</Label>
        <Select
          value={formData.order}
          onValueChange={(value) => handleInputChange("order", value)}
          disabled={!selectedCustomerId || ordersLoading}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={ordersLoading ? "Loading orders..." : "Select an order"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific order</SelectItem>
            {customerOrders.map((order) => (
              <SelectItem key={order._id} value={order._id}>
                {order.orderCode} ({new Date(order.orderDate || order.createdAt).toLocaleDateString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-700">
            Select Products for Return
          </h3>
          {getSelectedUnits() > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              {getSelectedUnits()} units
            </span>
          )}
        </div>

        {/* Loading state */}
        {(customersLoading || categoriesLoading || itemsLoading) && (
          <div className="p-4 text-center text-gray-500">
            Loading products...
          </div>
        )}

        {/* Error state */}
        {(customersError || categoriesError || itemsError) && (
          <div className="p-4 text-center text-red-500">
            Error loading data. Please try again.
          </div>
        )}

        {/* Products by Category */}
        {!itemsLoading &&
          !itemsError &&
          Object.keys(itemsByCategory).map((category) => {
            const categoryItems = itemsByCategory[category] || [];
            const isExpanded = expandedBrands[category];
            return (
              <div
                key={category}
                className="border border-gray-200 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50:bg-gray-800 rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <h4 className="font-semibold text-gray-900">
                      {category}
                    </h4>
                    <span className="text-xs text-gray-500">
                      ({categoryItems.length} items)
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="divide-y divide-gray-200">
                      {categoryItems.map((item) => (
                        <div key={item._id} className="p-3">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ${item.image ? 'hidden' : 'flex'}`}
                              style={{ display: item.image ? 'none' : 'flex' }}
                            >
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {item.name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                ₹{item.price} per {item.unit}
                              </p>
                              <p className="text-xs text-gray-400">
                                Stock: {item.stock} {item.unit}
                              </p>
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                min="0"
                                max={item.stock}
                                placeholder="0"
                                value={productQuantities[item._id] || ""}
                                onChange={(e) =>
                                  handleQuantityChange(item._id, e.target.value)
                                }
                                className="text-center text-sm h-9 w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Return Summary */}
      {getSelectedProducts().length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-sm text-blue-700">
                Return Summary
              </h4>
              <p className="text-xs text-blue-500">
                {getSelectedProducts().length} product types •{" "}
                {getSelectedUnits()} total units
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-blue-600">
                ₹{calculateTotal().toFixed(2)}
              </div>
              <div className="text-xs text-blue-500">
                Total Amount
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason Field */}
      <div className="mt-4">
        <Label className="text-sm font-medium">Reason for Return</Label>
        <Input
          placeholder="Specify return reason (e.g., quality defect, wrong product, expired items, packaging issues)"
          value={formData.reason || ""}
          onChange={(e) => handleInputChange("reason", e.target.value)}
          className="h-11 mt-1"
        />
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 order-2 sm:order-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.customer || getSelectedProducts().length === 0}
          className="h-11 order-1 sm:order-2"
        >
          {editData ? "Update Return Entry" : "Create Return Entry"}
        </Button>
      </div>
    </div>
  );
};

const Returns = () => {
  const { hasFeatureAccess } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check permissions
  const permissions = {
    canView: hasFeatureAccess("sales", "returns", "view"),
    canAdd: hasFeatureAccess("sales", "returns", "add"),
    canEdit: hasFeatureAccess("sales", "returns", "edit"),
    canDelete: hasFeatureAccess("sales", "returns", "delete"),
  };

  if (!permissions.canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to view Returns.
          </p>
        </div>
      </div>
    );
  }

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState(null);

  // Jump back to page 1 whenever search/status changes.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch returns data from API
  const {
    data: returnsResponse,
    isLoading: returnsLoading,
    error: returnsError,
    refetch: refetchReturns,
  } = useQuery({
    queryKey: ["/api/sales/returns", searchTerm, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '50');
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return apiRequest(`/api/sales/returns?${params}`);
    },
    keepPreviousData: true,
  });

  // Simple API call functions instead of mutations
  const handleCreateReturn = async (data) => {
    try {
      await apiRequest("/api/sales/create-return", {
        method: 'POST',
        body: JSON.stringify(data)
      });
      queryClient.invalidateQueries(["/api/sales/returns"]);
      setIsCreateModalOpen(false);
      toast({
        title: "Return Created",
        description: "Return entry has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create return entry",
        variant: "destructive",
      });
    }
  };

  const handleUpdateReturn = async (id, data) => {
    try {
      await apiRequest(`/api/sales/update-return/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      queryClient.invalidateQueries(["/api/sales/returns"]);
      setIsEditModalOpen(false);
      setSelectedEntry(null);
      toast({
        title: "Return Updated",
        description: "Return entry has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update return entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReturn = async (id) => {
    if (!confirm("Are you sure you want to delete this return?")) return;

    try {
      await apiRequest(`/api/sales/delete-return/${id}`, {
        method: 'DELETE'
      });
      queryClient.invalidateQueries(["/api/sales/returns"]);
      toast({
        title: "Return Deleted",
        description: "Return entry has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete return entry",
        variant: "destructive",
      });
    }
  };

  const returns = returnsResponse?.returns || [];
  const returnsPagination = returnsResponse?.pagination || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <RotateCcw className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Returns
            </h1>
            <p className="text-sm text-gray-600">
              Manage product returns
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchReturns}
            disabled={returnsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

          {permissions.canAdd && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Return
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Entry List</CardTitle>
        </CardHeader>
        <CardContent>
          {returnsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Loading returns...</span>
            </div>
          ) : returnsError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Returns
              </h3>
              <p className="text-gray-600 mb-4">
                {returnsError.message || "Failed to load returns data"}
              </p>
              <Button onClick={refetchReturns} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No returns found
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
                    <TableHead>RETURN DATE</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead>ITEMS</TableHead>
                    <TableHead>TOTAL AMOUNT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>CREATED</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnItem) => (
                    <TableRow key={returnItem._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium text-sm">
                            {returnItem.customerName || 'N/A'}
                          </div>
                          {returnItem.returnCode && (
                            <div className="text-xs text-gray-500">
                              #{returnItem.returnCode}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={returnItem.type === 'refund' ? 'default' : 'secondary'}
                          className={returnItem.type === 'refund' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {returnItem.type === 'refund' ? 'Refund' : 'Return'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {returnItem.items?.length || 0} items
                          </div>
                          <div className="text-xs text-gray-500">
                            {returnItem.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0} qty
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          ₹{(returnItem.totalAmount || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            returnItem.status === "completed"
                              ? "default"
                              : returnItem.status === "pending"
                                ? "secondary"
                                : returnItem.status === "processing"
                                  ? "outline"
                                  : returnItem.status === "approved"
                                    ? "default"
                                    : "destructive"
                          }
                        >
                          {returnItem.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500 font-medium">
                          {returnItem.createdAt ? new Date(returnItem.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(returnItem);
                              setIsViewModalOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {permissions.canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(returnItem);
                                setIsEditModalOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              onClick={() => handleDeleteReturn(returnItem._id)}
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

      {returnsPagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={returnsPagination.page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {returnsPagination.page} of {returnsPagination.pages} ({returnsPagination.total} returns)
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={returnsPagination.page >= returnsPagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto mx-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">
              Create Return Entry
            </DialogTitle>
            <DialogDescription className="text-sm">
              Record return items with product quantities, pricing
              details, and specific return reasons.
            </DialogDescription>
          </DialogHeader>
          <CreateReturnForm
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateReturn}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto mx-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">
              Edit Return Entry
            </DialogTitle>
            <DialogDescription className="text-sm">
              Update product quantities, unit pricing, return reasons,
              and processing status.
            </DialogDescription>
          </DialogHeader>
          <CreateReturnForm
            onClose={() => setIsEditModalOpen(false)}
            editData={selectedEntry}
            onSubmit={(data) => handleUpdateReturn(selectedEntry._id, data)}
          />
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto mx-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">
              View Return Details
            </DialogTitle>
            <DialogDescription className="text-sm">
              View complete return entry information with quantities and pricing details.
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Return ID</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {selectedEntry.returnCode || selectedEntry._id || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
                  <p className="text-sm font-medium bg-blue-50 p-2 rounded border">
                    {selectedEntry.customerName || 'N/A'}
                  </p>
                </div>


                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Return Date</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {selectedEntry.returnDate ? new Date(selectedEntry.returnDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Type</Label>
                  <div>
                    <Badge
                      variant={selectedEntry.type === 'refund' ? 'default' : 'secondary'}
                      className={selectedEntry.type === 'refund' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                    >
                      {selectedEntry.type === 'refund' ? 'Refund' : 'Return'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div>
                    <Badge
                      variant={
                        selectedEntry.status === "completed"
                          ? "default"
                          : selectedEntry.status === "pending"
                            ? "secondary"
                            : selectedEntry.status === "processing"
                              ? "outline"
                              : selectedEntry.status === "approved"
                                ? "default"
                                : "destructive"
                      }
                    >
                      {selectedEntry.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                  <p className="text-lg font-bold text-green-600 bg-green-50 p-2 rounded border">
                    ₹{(selectedEntry.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Date Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {selectedEntry.createdAt ? new Date(selectedEntry.createdAt).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
                {selectedEntry.updatedAt && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {new Date(selectedEntry.updatedAt).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Reason */}
              {selectedEntry.reason && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Return Reason</Label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{selectedEntry.reason}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEntry.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{selectedEntry.notes}</p>
                  </div>
                </div>
              )}

              {/* Items Details */}
              {selectedEntry.items && selectedEntry.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-medium text-gray-700">Return Items Details</Label>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Total Items: <strong>{selectedEntry.items.length}</strong></span>
                      <span>Total Quantity: <strong>{selectedEntry.items.reduce((total, item) => total + (item.quantity || 0), 0)}</strong></span>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-semibold">Product Name</TableHead>
                          <TableHead className="text-xs font-semibold">Category</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Quantity</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntry.items.map((item, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                            <TableCell className="text-sm">{item.categoryName || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-center">
                              <Badge variant="outline" className="bg-blue-50">
                                {item.quantity} {item.unit || 'pcs'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-right font-medium">₹{(item.pricePerUnit || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-right font-bold text-green-600">
                              ₹{(item.quantity * item.pricePerUnit).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Summary Row */}
                        <TableRow className="bg-green-50 border-t-2">
                          <TableCell colSpan={3} className="text-sm font-bold text-right">GRAND TOTAL:</TableCell>
                          <TableCell colSpan={2} className="text-lg font-bold text-green-600 text-right">
                            ₹{(selectedEntry.totalAmount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Returns;