import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useActionPermissions } from '@/components/permissions/ActionButton';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Tag,
  Package2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FolderPlus,
  Tags,
  Users,
  Building2,
  GripVertical,
  Scale
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import SimpleInventoryForm from './SimpleInventoryForm';
import ViewItemModal from './ViewItemModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import CategoryManagement from './CategoryManagement';
import ExcelImportExport from './ExcelImportExport';

import { apiRequest } from '@/lib/queryClient';
import { showSmartToast } from '@/lib/toast-utils';

// Helper function to get role-based API path
function getInventoryApiPath(user) {
  if (!user) return '/api';

  switch (user.role) {
    case 'Super Admin':
      return '/api/super-admin/inventory';
    case 'Unit Head':
      return '/api/unit-head/inventory';
    default:
      return '/api';
  }
}

// Permission checking functions using the permissions system
function useInventoryPermissions() {
  const { user } = useAuth();
  const { canPerformAction } = usePermissions();

  // For Unit Head, permissions are stored under unitHead module with inventory as feature key
  // For other roles, it's under inventory module with items as feature key
  const moduleName = user?.role === 'Unit Head' ? 'unitHead' : 'inventory';
  const featureKey = user?.role === 'Unit Head' ? 'inventory' : 'items';

  return {
    canView: canPerformAction(moduleName, featureKey, 'view'),
    canAdd: canPerformAction(moduleName, featureKey, 'add'),
    canEdit: canPerformAction(moduleName, featureKey, 'edit'),
    canDelete: canPerformAction(moduleName, featureKey, 'delete'),
    canAlter: canPerformAction(moduleName, featureKey, 'alter')
  };
}

// Modern Stats Component
function ModernStats({ stats, isLoading }) {
  const statsCards = [
    {
      title: 'Total Items',
      value: stats?.stats?.totalItems || 0,
      icon: Package2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'Total Value',
      value: `₹${stats?.stats?.totalValue?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%'
    },
    {
      title: 'Low Stock',
      value: stats?.stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      change: '-3%'
    },
    {
      title: 'Categories',
      value: stats?.stats?.totalCategories || 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+2%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">{stat.title}</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="text-xs text-green-600 font-medium">{stat.change}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Sortable Row Component
function SortableRow({
  id,
  item,
  index,
  selectedItems,
  handleSelectItem,
  handleView,
  handleEdit,
  handleDelete,
  inventoryPermissions,
  isDraggable = true
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : 'none',
    position: isDragging ? 'relative' : 'static'
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
        } ${selectedItems.has(item._id) ? 'bg-blue-50' : ''} ${isDragging ? 'bg-blue-100/50 border-2 border-blue-500' : ''}`}
    >
      {inventoryPermissions.canDelete && (
        <TableCell className="py-4">
          <Checkbox
            checked={selectedItems.has(item._id)}
            onCheckedChange={(checked) => handleSelectItem(item._id, checked)}
          />
        </TableCell>
      )}
      <TableCell className="py-4">
        {isDraggable && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkMyMC40MTgzIDE2IDI0IDE5LjU4MTcgMjQgMjRTMjAuNDE4MyAzMiAxNiAzMlM4IDI4LjQxODMgOCAyNFMxMS41ODE3IDE2IDE2IDE2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
              }}
            />
          ) : (
            <Package className="h-6 w-6 text-gray-400" />
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div>
          <div className="font-medium text-gray-900">{item.name}</div>
          <div className="text-sm text-gray-500">{item.type}</div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-gray-600">{item.batch || '-'}</TableCell>
      <TableCell className="py-4">
        <div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {item.category}
          </Badge>
          {item.subCategory && (
            <div className="text-xs text-gray-500 mt-1">
              {item.subCategory}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
          {item.storeLocation || item.store || 'No location'}
        </Badge>
      </TableCell>
      <TableCell className="py-4">
        <div>
          <div className="font-medium text-gray-900">{item.qty} {item.unit}</div>
          <div className="text-xs text-gray-500">
            Min: {item.minStock} {item.unit}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="font-medium text-gray-900">₹{item.salePrice?.toLocaleString()}</div>
      </TableCell>
      <TableCell className="py-4">
        {item.qty <= item.minStock ? (
          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">Low Stock</Badge>
        ) : (
          <Badge variant="success" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleView(item)}>
            <Eye className="h-4 w-4" />
          </Button>
          {inventoryPermissions.canEdit && (
            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {inventoryPermissions.canDelete && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ModernInventoryUI() {
  const { user } = useAuth();
  const { canPerformAction } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get role-based API path
  const apiBasePath = getInventoryApiPath(user);

  // Check inventory permissions based on user role
  const moduleName = user?.role === 'Unit Head' ? 'unitHead' : 'inventory';
  const featureKey = user?.role === 'Unit Head' ? 'inventory' : 'items';

  const inventoryPermissions = {
    canView: canPerformAction(moduleName, featureKey, 'view'),
    canAdd: canPerformAction(moduleName, featureKey, 'add'),
    canEdit: canPerformAction(moduleName, featureKey, 'edit'),
    canDelete: canPerformAction(moduleName, featureKey, 'delete'),
    canAlter: canPerformAction(moduleName, featureKey, 'alter')
  };

  // State management
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState({ isOpen: false, items: [] });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState('asc'); // Added sortOrder state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Dynamic items per page
  const [localItems, setLocalItems] = useState([]); // For real-time drag-and-drop feedback
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const [showCustomerCategoryModal, setShowCustomerCategoryModal] = useState(false);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Data fetching with React Query - let API handle ALL filtering
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: [`${apiBasePath}/items`, debouncedSearchTerm, selectedCategory, selectedType, selectedStore, selectedLocation, sortBy, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams({
        page: 1,
        limit: 100, // Fetch more items from API
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(selectedCategory && selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedType && selectedType !== 'all' && { type: selectedType }),
        ...(selectedStore && selectedStore !== 'all' && { store: selectedStore }),
        ...(selectedLocation && selectedLocation !== 'all' && { location: selectedLocation }),
        sortBy,
        sortOrder
      });
      return apiRequest('GET', `${apiBasePath}/items?${params.toString()}`);
    },
  });

  // Update local items when API data changes
  useEffect(() => {
    if (itemsData?.items) {
      setLocalItems(itemsData.items);
    }
  }, [itemsData]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`${apiBasePath}/stats`],
    queryFn: () => apiService.getInventoryStats()
  });

  const { data: categoriesData } = useQuery({
    queryKey: [`${apiBasePath}/categories`],
  });

  const { data: customerCategoriesData } = useQuery({
    queryKey: [`${apiBasePath}/customer-categories`],
  });

  // Fetch companies for location dropdown - use authenticated endpoint
  const { data: companiesData } = useQuery({
    queryKey: ['companies-dropdown'],
    queryFn: () => apiRequest('GET', '/api/companies/dropdown'),
  });

  // Extract data from API response including pagination
  const items = Array.isArray(itemsData?.items) ? itemsData.items : [];
  const apiPagination = itemsData?.pagination || {};
  const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];
  const customerCategories = Array.isArray(customerCategoriesData?.customerCategories) ? customerCategoriesData.customerCategories : [];
  const companies = Array.isArray(companiesData?.companies) ? companiesData.companies : [];

  console.log('API Response:', { items: items.length, pagination: apiPagination });
  console.log('Companies data:', companies);

  // Mutations
  const deleteItemMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `${apiBasePath}/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
      setDeleteConfirm({ isOpen: false, item: null });
      toast({
        title: "Item Deleted",
        description: "Inventory item has been deleted successfully",
      });
    },
    onError: (error) => {
      showSmartToast(error, 'Delete Item');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (itemOrders) => apiRequest('PUT', `${apiBasePath}/items/reorder`, { itemOrders }),
    onSuccess: () => {
      // Refresh stats but don't strictly need to refresh items as we updated them locally
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
    },
    onError: (error) => {
      showSmartToast(error, 'Reorder Items');
      // Revert local items on error if needed
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
    }
  });

  const bulkDeleteItemsMutation = useMutation({
    mutationFn: (itemIds) => apiRequest('POST', `${apiBasePath}/items/bulk-delete`, { itemIds }),
    onSuccess: (data) => {
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
      setSelectedItems(new Set());
      setBulkDeleteConfirm({ isOpen: false, items: [] });

      // Show detailed success message
      const { deletedCount, requestedCount, warning } = data;
      let message = `Successfully deleted ${deletedCount} item${deletedCount === 1 ? '' : 's'}`;
      if (warning) {
        message += ` (${warning})`;
      }

      toast({
        title: "Bulk Delete Complete",
        description: message,
        variant: deletedCount === requestedCount ? "default" : "destructive"
      });
    },
    onError: (error) => {
      showSmartToast(error, 'Bulk Delete');
      setBulkDeleteConfirm({ isOpen: false, items: [] });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', `${apiBasePath}/items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
      setShowForm(false);
      setEditingItem(null);
      toast({
        title: "Item Created",
        description: "New inventory item has been created successfully",
      });
    },
    onError: (error) => {
      console.error('Create item error details:', error);

      // DON'T close the modal on error - let user fix the issue
      // Show proper validation error message
      if (error.status === 400 && error.message) {
        // Check for duplicate item error
        if (error.message.includes('Duplicate item detected') || error.message.includes('already exists')) {
          toast({
            title: "⚠️ Duplicate Item",
            description: error.message.replace(/[\n\r]/g, ' '), // Clean line breaks
            variant: "destructive",
            duration: 10000 // Longer duration for reading
          });
        } else {
          toast({
            title: "❌ Validation Error",
            description: error.message,
            variant: "destructive",
            duration: 6000
          });
        }
      } else if (error.message) {
        toast({
          title: "❌ Create Item Failed",
          description: error.message,
          variant: "destructive",
          duration: 6000
        });
      } else {
        showSmartToast(error, 'Create Item');
      }
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `${apiBasePath}/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
      setShowForm(false);
      setEditingItem(null);
      toast({
        title: "Item Updated",
        description: "Inventory item has been updated successfully",
      });
    },
    onError: (error) => {
      // Show proper validation error message
      if (error.status === 400 && error.message) {
        toast({
          title: "Update Item: Validation Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        showSmartToast(error, 'Update Item');
      }
    }
  });

  // Handlers
  const handleFormSubmit = async (data) => {
    if (editingItem) {
      return await updateItemMutation.mutateAsync({ id: editingItem._id, data });
    } else {
      return await createItemMutation.mutateAsync(data);
    }
  };

  const handleView = (item) => {
    setViewItem(item);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    setDeleteConfirm({
      isOpen: true,
      item,
      title: "Delete Item",
      description: `Are you sure you want to delete this inventory item?`,
      itemName: item.name
    });
  };

  // Bulk delete handlers
  const handleSelectItem = (itemId, checked) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allCurrentPageItemIds = paginatedItems.map(item => item._id);
      setSelectedItems(new Set([...selectedItems, ...allCurrentPageItemIds]));
    } else {
      const currentPageItemIds = paginatedItems.map(item => item._id);
      const newSelected = new Set(selectedItems);
      currentPageItemIds.forEach(id => newSelected.delete(id));
      setSelectedItems(newSelected);
    }
  };

  const handleBulkDelete = () => {
    const selectedItemsArray = items.filter(item => selectedItems.has(item._id));
    setBulkDeleteConfirm({
      isOpen: true,
      items: selectedItemsArray
    });
  };

  const confirmBulkDelete = () => {
    const itemIds = Array.from(selectedItems);
    bulkDeleteItemsMutation.mutate(itemIds);
  };

  const confirmDelete = () => {
    if (deleteConfirm.item) {
      deleteItemMutation.mutate(deleteConfirm.item._id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries([`${apiBasePath}/items`]);
    queryClient.invalidateQueries([`${apiBasePath}/categories`]);
    queryClient.invalidateQueries([`${apiBasePath}/customer-categories`]);
    queryClient.invalidateQueries([`${apiBasePath}/stats`]);
    toast({
      title: "Refreshed",
      description: "Inventory data has been refreshed successfully",
    });
  };

  // No frontend filtering - API handles ALL filters
  const filteredItems = items; // Use items directly from API

  // Frontend pagination only - API does the filtering
  const totalItems = apiPagination.total || items.length;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, selectedType, selectedStore, selectedLocation, sortBy, sortOrder]);

  // Auto-select location for Unit Head users
  useEffect(() => {
    if (user?.role === 'Unit Head' && companies.length === 1) {
      // If Unit Head has only one company (their assigned one), auto-select it
      setSelectedLocation(companies[0].value);
    }
  }, [companies, user?.role]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Frontend pagination - no API refetch needed
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex(item => item._id === active.id);
      const newIndex = localItems.findIndex(item => item._id === over.id);

      const newItems = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(newItems);

      // Calculate new orders for all items based on their new positions
      // We'll update the 'order' field for ALL items in the current filtered list
      const itemOrders = newItems.map((item, index) => ({
        id: item._id,
        order: index + 1 // 1-based ordering
      }));

      reorderMutation.mutate(itemOrders);
    }
  };

  return (
    <div className="space-y-6">
      <ModernStats stats={stats} isLoading={statsLoading} />

      {/* Modern Action Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-blue-900">
                {!inventoryPermissions.canAdd && !inventoryPermissions.canEdit && !inventoryPermissions.canDelete ? 'Inventory Monitoring' : 'Quick Actions'}
              </h2>
              <p className="text-sm text-blue-600">
                {!inventoryPermissions.canAdd && !inventoryPermissions.canEdit && !inventoryPermissions.canDelete
                  ? 'Monitor inventory levels, view item details and track stock status'
                  : 'Manage your inventory efficiently with these actions'
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {inventoryPermissions.canAdd && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
              {(inventoryPermissions.canAdd || inventoryPermissions.canEdit) && (
                <>
                  <Button
                    onClick={() => setCategoryManagementOpen(true)}
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50:bg-purple-950/30"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Categories
                  </Button>
                  <Button
                    onClick={() => setShowCustomerCategoryModal(true)}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50:bg-green-950/30"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Customer Category
                  </Button>
                </>
              )}

              {/* Excel Import/Export - Available to all users with view permissions */}
              {inventoryPermissions.canView && (
                <ExcelImportExport type="items" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Package className="h-5 w-5" />
            Inventory Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 pb-1">
              <div className="flex-1 min-w-[200px] sm:min-w-[240px] relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-full border-gray-300 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        All Categories
                      </div>
                    </SelectItem>
                    {categories.length > 0 && [...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                      <SelectItem key={category._id || category.name} value={category.name}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        All Types
                      </div>
                    </SelectItem>
                    <SelectItem value="Product">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Products
                      </div>
                    </SelectItem>
                    <SelectItem value="Material">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        Materials
                      </div>
                    </SelectItem>
                    <SelectItem value="Spares">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Spares
                      </div>
                    </SelectItem>
                    <SelectItem value="Assemblies">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        Assemblies
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        All Locations
                      </div>
                    </SelectItem>
                    {companies.length > 0 && companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        <div className="flex items-center gap-2 max-w-[240px]">
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate" title={company.label}>
                            {company.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="qty">Stock Quantity</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                  <SelectTrigger className="w-[90px] sm:w-[110px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="30">30 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedItems.size > 0 && inventoryPermissions.canDelete && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItems(new Set())}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Clear selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteItemsMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {bulkDeleteItemsMutation.isPending ? 'Deleting...' : `Delete ${selectedItems.size} item${selectedItems.size === 1 ? '' : 's'}`}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {inventoryPermissions.canDelete && (
                      <TableHead className="w-[50px] font-semibold text-gray-900">
                        <Checkbox
                          checked={paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(item._id))}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[40px] font-semibold text-gray-900"></TableHead>
                    <TableHead className="font-semibold text-gray-900">Image</TableHead>
                    <TableHead className="font-semibold text-gray-900">Name</TableHead>
                    <TableHead className="font-semibold text-gray-900">Quantity</TableHead>
                    <TableHead className="font-semibold text-gray-900">Category</TableHead>
                    <TableHead className="font-semibold text-gray-900">Store Location</TableHead>
                    <TableHead className="font-semibold text-gray-900">Stock</TableHead>
                    <TableHead className="font-semibold text-gray-900">Price</TableHead>
                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localItems.map(item => item._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {itemsLoading ? (
                        <TableRow>
                          <TableCell colSpan={inventoryPermissions.canDelete ? 11 : 10} className="text-center py-8">
                            Loading items...
                          </TableCell>
                        </TableRow>
                      ) : localItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={inventoryPermissions.canDelete ? 11 : 10} className="text-center py-8 text-muted-foreground">
                            No items found. Add your first inventory item to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        localItems.slice(startIndex, startIndex + itemsPerPage).map((item, index) => (
                          <SortableRow
                            key={item._id}
                            id={item._id}
                            item={item}
                            index={index}
                            selectedItems={selectedItems}
                            handleSelectItem={handleSelectItem}
                            handleView={handleView}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            inventoryPermissions={inventoryPermissions}
                            isDraggable={sortBy === 'newest' && !searchTerm} // Only allow drag when in default view
                          />
                        ))
                      )}
                    </SortableContext>
                  </DndContext>
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {totalItems} items
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forms and Modals - Show based on permissions */}
      {(inventoryPermissions.canAdd || inventoryPermissions.canEdit) && (
        <SimpleInventoryForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          item={editingItem}
          categories={categories}
          customerCategories={customerCategories}
          companies={companies}
          onSubmit={handleFormSubmit}
          isLoading={createItemMutation.isPending || updateItemMutation.isPending}
          onOpenCategoryManagement={() => setCategoryManagementOpen(true)}
        />
      )}

      <ViewItemModal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        item={viewItem}
      />

      {inventoryPermissions.canDelete && (
        <>
          <DeleteConfirmDialog
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
            onConfirm={confirmDelete}
            title="Delete Inventory Item"
            description="Are you sure you want to delete this inventory item?"
            itemName={deleteConfirm.item?.name}
            isLoading={deleteItemMutation.isPending}
          />

          <DeleteConfirmDialog
            isOpen={bulkDeleteConfirm.isOpen}
            onClose={() => setBulkDeleteConfirm({ isOpen: false, items: [] })}
            onConfirm={confirmBulkDelete}
            title="Bulk Delete Items"
            description={`Are you sure you want to delete ${bulkDeleteConfirm.items.length} item${bulkDeleteConfirm.items.length === 1 ? '' : 's'}? This action cannot be undone.`}
            itemName={bulkDeleteConfirm.items.length > 0 ?
              bulkDeleteConfirm.items.length === 1
                ? bulkDeleteConfirm.items[0].name
                : `${bulkDeleteConfirm.items.length} items: ${bulkDeleteConfirm.items.slice(0, 3).map(item => item.name).join(', ')}${bulkDeleteConfirm.items.length > 3 ? '...' : ''}`
              : ''
            }
            confirmText={`Delete ${bulkDeleteConfirm.items.length} item${bulkDeleteConfirm.items.length === 1 ? '' : 's'}`}
            isLoading={bulkDeleteItemsMutation.isPending}
          />
        </>
      )}

      {/* Category Management Modals - Show based on permissions */}
      {(inventoryPermissions.canAdd || inventoryPermissions.canEdit) && (
        <>
          <CategoryManagement
            isOpen={categoryManagementOpen}
            onClose={() => setCategoryManagementOpen(false)}
            initialTab="product"
          />

          <CategoryManagement
            isOpen={showCustomerCategoryModal}
            onClose={() => setShowCustomerCategoryModal(false)}
            initialTab="customer"
          />
        </>
      )}
    </div>
  );
}