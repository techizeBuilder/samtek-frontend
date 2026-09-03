import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  Edit,
  Trash2,
  Eye,
  Tag,
  Package2,
  BarChart3,
  RefreshCw,
  GripVertical,
  Ban,
  Layers
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
import GroupManagement from './GroupManagement';
import UnitTypeManagement from './UnitTypeManagement';

import { apiRequest } from '@/lib/queryClient';
import { showSmartToast } from '@/lib/toast-utils';
import { itemDisplayQty, itemDisplayUnit } from '@/lib/fabricationDims';

// Helper function to get role-based API path
function getInventoryApiPath(user) {
  if (!user) return '/api';

  switch (user.role) {
    case 'Unit Head':
      return '/api/unit-head/inventory';
    // Research & Development Head and employees use the standard /api path
    case 'Research & Development Head':
    case 'Research Development Employee':
    default:
      return '/api';
  }
}

// Permission checking functions using the permissions system.
// This component is shared by Store (module 'Store') and R&D (module 'rnd')
// — both catalog their inventory access under a feature key of 'inventory',
// per roleModulesConfig.js's MODULES list. (Previously this checked module
// 'inventory'/feature 'items', which doesn't exist in that catalog under any
// role, so Store's Inventory checkbox could never have any effect here; R&D
// was separately hardcoded to always-allow. Both are fixed below.)
function useInventoryPermissions() {
  const { user } = useAuth();
  const { canPerformAction } = usePermissions();

  // Unit Head permissions are stored under the unitHead module with
  // inventory as the feature key.
  if (user?.role === 'Unit Head') {
    return {
      canView: canPerformAction('unitHead', 'inventory', 'view'),
      canAdd: canPerformAction('unitHead', 'inventory', 'add'),
      canEdit: canPerformAction('unitHead', 'inventory', 'edit'),
      canDelete: canPerformAction('unitHead', 'inventory', 'delete'),
      canAlter: canPerformAction('unitHead', 'inventory', 'alter')
    };
  }

  const isRnd = user?.role === 'Research & Development Head' || user?.role === 'Research Development Employee';
  const moduleName = isRnd ? 'rnd' : 'Store';

  return {
    canView: canPerformAction(moduleName, 'inventory', 'view'),
    canAdd: canPerformAction(moduleName, 'inventory', 'add'),
    canEdit: canPerformAction(moduleName, 'inventory', 'edit'),
    canDelete: canPerformAction(moduleName, 'inventory', 'delete'),
    canAlter: canPerformAction(moduleName, 'inventory', 'alter')
  };
}

// Modern Stats Component
// Total Value / Low Stock / Categories used to live here, but they're all
// derived from fields the create form no longer collects (Available Stock,
// Min Stock, Standard Cost, Category) — every new item would silently read
// as "0 value" and "low stock" (0 <= 0), and Category would collapse every
// new item into one blank bucket. Swapped for stats driven by fields the
// form still actually sets: Item Type and Item Status (isDiscontinued).
function ModernStats({ stats, isLoading }) {
  const statsCards = [
    {
      title: 'Total Items',
      value: stats?.stats?.totalItems || 0,
      icon: Package2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Item Types',
      value: stats?.stats?.totalItemTypes || 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Discontinued',
      value: stats?.stats?.discontinuedCount || 0,
      icon: Ban,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  onToggleStatus,
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
          <div className="text-sm text-gray-500 font-mono">{item.code}</div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        {item.itemType ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {item.itemType}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="py-4 text-gray-600">{item.brand || '-'}</TableCell>
      <TableCell className="py-4">
        {item.materialFlow ? (
          <Badge
            variant="outline"
            className={
              item.materialFlow === 'High Flow' ? 'bg-red-50 text-red-700 border-red-200' :
              item.materialFlow === 'Medium Flow' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-slate-50 text-slate-600 border-slate-200'
            }
          >
            {item.materialFlow}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="font-medium text-gray-900">{itemDisplayQty(item)} {itemDisplayUnit(item)}</div>
      </TableCell>
      <TableCell className="py-4">
        {item.isDiscontinued ? (
          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">Discontinued</Badge>
        ) : (
          <Badge variant="success" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
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
          {inventoryPermissions.canEdit && (
            item.isDiscontinued ? (
              <Button variant="ghost" size="sm" onClick={() => onToggleStatus(item, false)} className="text-emerald-600 hover:text-emerald-700" title="Reactivate">
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onToggleStatus(item, true)} className="text-orange-500 hover:text-orange-700" title="Discontinue">
                <Ban className="h-4 w-4" />
              </Button>
            )
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
  const [, setLocation] = useLocation();

  // Get role-based API path
  const apiBasePath = getInventoryApiPath(user);

  // Check inventory permissions based on user role
  // R&D Head and Employee have full inventory permissions (backend enforces via checkInventoryPermission)
  const isRDUser = user?.role === 'Research & Development Head' || user?.role === 'Research Development Employee';
  const moduleName = user?.role === 'Unit Head' ? 'unitHead' : 'inventory';
  const featureKey = user?.role === 'Unit Head' ? 'inventory' : 'items';

  const inventoryPermissions = isRDUser ? {
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canAlter: true
  } : {
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
  const [selectedItemType, setSelectedItemType] = useState('all');
  const [selectedSourceType, setSelectedSourceType] = useState('all');
  const [selectedItemSourceType, setSelectedItemSourceType] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState('asc'); // Added sortOrder state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Dynamic items per page — server-side
  const [localItems, setLocalItems] = useState([]); // For real-time drag-and-drop feedback
  const [groupManagementOpen, setGroupManagementOpen] = useState(false);
  const [unitTypeManagementOpen, setUnitTypeManagementOpen] = useState(false);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

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

  // Data fetching with React Query - let API handle ALL filtering AND pagination
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: [`${apiBasePath}/items`, debouncedSearchTerm, selectedItemType, selectedSourceType, selectedItemSourceType, selectedStore, showDiscontinued, sortBy, sortOrder, currentPage, itemsPerPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        // Exclude Product Master machines / Motor Master motors — this list
        // is plain Inventory only, items created through this form.
        productKind: 'none',
        discontinued: showDiscontinued ? 'true' : 'false',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(selectedItemType && selectedItemType !== 'all' && { itemType: selectedItemType }),
        ...(selectedSourceType && selectedSourceType !== 'all' && { sourceType: selectedSourceType }),
        ...(selectedItemSourceType && selectedItemSourceType !== 'all' && { itemSourceType: selectedItemSourceType }),
        ...(selectedStore && selectedStore !== 'all' && { store: selectedStore }),
        sortBy,
        sortOrder
      });
      return apiRequest('GET', `${apiBasePath}/items?${params.toString()}`);
    },
    keepPreviousData: true,
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

  const { data: groupsData } = useQuery({
    queryKey: ['/api/inventory/groups'],
  });

  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
  });

  const { data: masterOptionsData } = useQuery({
    queryKey: ['/api/inventory/master-options'],
  });

  // Extract data from API response including pagination
  const items = Array.isArray(itemsData?.items) ? itemsData.items : [];
  const apiPagination = itemsData?.pagination || {};
  const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];
  const customerCategories = Array.isArray(customerCategoriesData?.customerCategories) ? customerCategoriesData.customerCategories : [];
  const groups = Array.isArray(groupsData?.groups) ? groupsData.groups : [];
  const unitTypes = Array.isArray(unitTypesData?.unitTypes) ? unitTypesData.unitTypes : [];
  const itemTypeOptions = Array.isArray(masterOptionsData?.data?.ItemType) ? masterOptionsData.data.ItemType : [];
  const sourceTypeOptions = Array.isArray(masterOptionsData?.data?.SourceType) ? masterOptionsData.data.SourceType : [];
  const itemSourceTypeOptions = Array.isArray(masterOptionsData?.data?.ItemSourceType) ? masterOptionsData.data.ItemSourceType : [];

  const hasActiveFilters = debouncedSearchTerm || searchTerm || selectedItemType !== 'all' ||
    selectedSourceType !== 'all' || selectedItemSourceType !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedItemType('all');
    setSelectedSourceType('all');
    setSelectedItemSourceType('all');
    setCurrentPage(1);
  };

  console.log('API Response:', { items: items.length, pagination: apiPagination });

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

  const statusMutation = useMutation({
    mutationFn: ({ id, isDiscontinued }) => apiRequest('PUT', `${apiBasePath}/items/${id}`, { isDiscontinued }),
    onSuccess: (_, { isDiscontinued }) => {
      queryClient.invalidateQueries([`${apiBasePath}/items`]);
      queryClient.invalidateQueries([`${apiBasePath}/stats`]);
      toast({
        title: isDiscontinued ? 'Item Discontinued' : 'Item Reactivated',
        description: isDiscontinued ? 'Item marked as discontinued.' : 'Item marked as active.',
      });
    },
    onError: (error) => showSmartToast(error, 'Update Status'),
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

  // No frontend filtering - API handles ALL filters and pagination now
  const filteredItems = items; // Use items directly from API

  // Server-side pagination — `items` is already exactly this page's rows.
  const totalItems = apiPagination.total || items.length;
  const totalPages = apiPagination.pages || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + items.length;
  const paginatedItems = items;

  // Reset to first page when search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedItemType, selectedSourceType, selectedItemSourceType, selectedStore, sortBy, sortOrder, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
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

  // Resolve stats with robust fallback from itemsData
  const resolvedStats = {
    stats: {
      totalItems: stats?.stats?.totalItems ?? itemsData?.stats?.totalItems ?? 0,
      totalItemTypes: stats?.stats?.totalItemTypes ?? itemTypeOptions.length ?? 0,
      discontinuedCount: stats?.stats?.discontinuedCount ?? 0
    }
  };

  return (
    <div className="space-y-6">
      <ModernStats stats={resolvedStats} isLoading={statsLoading || itemsLoading} />

      {/* Modern Action Bar */}
      {(inventoryPermissions.canAdd || isRDUser) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6 flex flex-wrap gap-3">
            {inventoryPermissions.canAdd && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
            {isRDUser && (
              <Button
                onClick={() => setLocation('/r&d/fabrication-master')}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 shadow-sm transition-all duration-200"
              >
                <Layers className="h-4 w-4 mr-2" />
                Fabrication Master
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
                <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Item Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        All Item Types
                      </div>
                    </SelectItem>
                    {itemTypeOptions.map((o) => (
                      <SelectItem key={o._id || o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {o.value}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Source Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        All Source Types
                      </div>
                    </SelectItem>
                    {sourceTypeOptions.map((o) => (
                      <SelectItem key={o._id || o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {o.value}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedItemSourceType} onValueChange={setSelectedItemSourceType}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="All Item Source Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4" />
                        All Item Source Types
                      </div>
                    </SelectItem>
                    {itemSourceTypeOptions.map((o) => (
                      <SelectItem key={o._id || o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {o.value}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowDiscontinued(v => !v)}
                  className={`h-9 text-xs px-3 ${showDiscontinued ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' : 'border-gray-300'}`}
                >
                  {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="code">Item Code</SelectItem>
                    <SelectItem value="itemType">Item Type</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                  <SelectTrigger className="w-[90px] sm:w-[110px] h-9 border-gray-300 focus:border-blue-500 text-xs px-2">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="150">150 per page</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 text-xs border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset Filters
                  </Button>
                )}
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
                    <TableHead className="font-semibold text-gray-900">Name / Code</TableHead>
                    <TableHead className="font-semibold text-gray-900">Item Type</TableHead>
                    <TableHead className="font-semibold text-gray-900">Brand</TableHead>
                    <TableHead className="font-semibold text-gray-900">Material Flow</TableHead>
                    <TableHead className="font-semibold text-gray-900">Stock</TableHead>
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
                          <TableCell colSpan={inventoryPermissions.canDelete ? 12 : 11} className="text-center py-8">
                            Loading items...
                          </TableCell>
                        </TableRow>
                      ) : localItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={inventoryPermissions.canDelete ? 12 : 11} className="text-center py-8 text-muted-foreground">
                            No items found. Add your first inventory item to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        localItems.map((item, index) => (
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
                            onToggleStatus={(it, isDiscontinued) => statusMutation.mutate({ id: it._id, isDiscontinued })}
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
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
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
          groups={groups}
          unitTypes={unitTypes}
          onSubmit={handleFormSubmit}
          isLoading={createItemMutation.isPending || updateItemMutation.isPending}
          onOpenGroupManagement={() => setGroupManagementOpen(true)}
          onOpenUnitTypeManagement={() => setUnitTypeManagementOpen(true)}
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

      {/* Category Management moved to Marketing > Categories — no longer
          triggerable from here since the Action Bar was trimmed to just
          Add Item and the create/edit form no longer has a Category field. */}
      {(inventoryPermissions.canAdd || inventoryPermissions.canEdit) && (
        <>
          <GroupManagement
            isOpen={groupManagementOpen}
            onClose={() => setGroupManagementOpen(false)}
          />

          <UnitTypeManagement
            isOpen={unitTypeManagementOpen}
            onClose={() => setUnitTypeManagementOpen(false)}
          />
        </>
      )}
    </div>
  );
}