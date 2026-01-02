import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Users, Package, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const UnitHeadProductionGroup = () => {
  const [groups, setGroups] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedItems: []
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const limit = 10;

  // Fetch production groups
  const fetchGroups = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/unit-head/production-groups?page=${page}&limit=${limit}&search=${search}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setGroups(data.data.groups);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch groups",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch production groups",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch available items for assignment
  const fetchAvailableItems = async (search = '', excludeGroupId = null) => {
    console.log('🔍 Fetching available items:', { search, excludeGroupId });
    try {
      let url = `/api/unit-head/production-groups/items/available?search=${search}`;
      if (excludeGroupId) {
        url += `&excludeGroupId=${excludeGroupId}`;
      }
      
      console.log('🔗 API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('📡 API Response status:', response.status);
      const data = await response.json();
      console.log('📋 API Response data:', {
        success: data.success,
        itemCount: data.data?.items?.length || 0,
        totalItems: data.data?.totalItems || 0
      });

      if (data.success) {
        console.log('✅ Items fetched successfully:', data.data.items.length);
        setAvailableItems(data.data.items);
      } else {
        console.error('❌ API Error:', data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to fetch available items",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available items",
        variant: "destructive"
      });
    }
  };

  // Create new group
  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/unit-head/production-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          items: formData.selectedItems
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Production group created successfully",
        });
        setShowCreateModal(false);
        resetForm();
        fetchGroups(currentPage, searchTerm);
        fetchAvailableItems(1, itemSearchTerm);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create group",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create production group",
        variant: "destructive"
      });
    }
  };

  // Update group
  const handleUpdateGroup = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/unit-head/production-groups/${selectedGroup._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          items: formData.selectedItems
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Production group updated successfully",
        });
        setShowEditModal(false);
        resetForm();
        fetchGroups(currentPage, searchTerm);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update group",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: "Failed to update production group",
        variant: "destructive"
      });
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this production group?')) {
      return;
    }

    try {
      const response = await fetch(`/api/unit-head/production-groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Production group deleted successfully",
        });
        fetchGroups(currentPage, searchTerm);
        fetchAvailableItems(1, itemSearchTerm);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete group",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete production group",
        variant: "destructive"
      });
    }
  };

  // View group details
  const handleViewGroup = async (group) => {
    try {
      const response = await fetch(`/api/unit-head/production-groups/${group._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectedGroup(data.data);
        setShowViewModal(true);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch group details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch group details",
        variant: "destructive"
      });
    }
  };

  // Open edit modal
  const openEditModal = async (group) => {
    console.log('📋 Opening edit modal for group:', group._id);
    setSelectedGroup(group);
    
    try {
      // First, fetch the complete group details to get current items
      console.log('🔍 Fetching group details for edit...');
      const response = await fetch(`/api/unit-head/production-groups/${group._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      console.log('📋 Group details response:', {
        success: data.success,
        itemCount: data.data?.items?.length || 0,
        items: data.data?.items?.map(item => ({ id: item._id, name: item.name })) || []
      });
      
      if (data.success && data.data) {
        // Store the complete group data with items
        setSelectedGroup({
          ...group,
          items: data.data.items || []
        });
        
        // Set form data with fetched group details
        setFormData({
          name: data.data.name,
          description: data.data.description || '',
          selectedItems: data.data.items?.map(item => item._id) || []
        });
        
        console.log('📝 Form data set:', {
          name: data.data.name,
          selectedItemsCount: data.data.items?.length || 0,
          selectedItems: data.data.items?.map(item => item._id) || []
        });
        
        // Fetch available items excluding current group's items
        await fetchAvailableItems('', group._id);
        
        setShowEditModal(true);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch group details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error opening edit modal:', error);
      toast({
        title: "Error",
        description: "Failed to load group for editing",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedItems: []
    });
    setSelectedGroup(null);
  };

  // Handle item selection
  const handleItemSelection = (itemId, isChecked) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: isChecked 
        ? [...prev.selectedItems, itemId]
        : prev.selectedItems.filter(id => id !== itemId)
    }));
  };

  // Search handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGroups(1, searchTerm);
  };

  const handleItemSearch = (e) => {
    e.preventDefault();
    fetchAvailableItems(itemSearchTerm);
  };

  useEffect(() => {
    fetchGroups();
    fetchAvailableItems();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Production Groups
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage production groups and assign inventory items
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            fetchAvailableItems('');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-sm"
              />
            </div>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Production Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No production groups found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Group Name</TableHead>
                    <TableHead className="min-w-[160px] hidden sm:table-cell">Description</TableHead>
                    <TableHead className="min-w-[100px]">Items</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Created By</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Date</TableHead>
                    <TableHead className="min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {group.description || 'No description'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate hidden sm:table-cell">
                        {group.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {group.metadata?.totalItems || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {group.createdBy?.username || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewGroup(group)}
                            className="p-1 h-8 w-8"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(group)}
                            className="p-1 h-8 w-8"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteGroup(group._id)}
                            className="p-1 h-8 w-8"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchGroups(currentPage - 1, searchTerm)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchGroups(currentPage + 1, searchTerm)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create Production Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter group name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter group description"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Assign Items</Label>
              <div className="mt-2 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Search items..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => fetchAvailableItems(itemSearchTerm)}
                    className="w-full sm:w-auto"
                  >
                    Search
                  </Button>
                </div>
                <div className="border rounded-md">
                  <ScrollArea className="h-48 sm:h-64 p-3 sm:p-4">
                    {console.log('🎨 Create Modal - Available items:', availableItems.length)}
                    {availableItems.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No items found.</p>
                        <p className="text-xs text-gray-400 mt-1">Try searching or check if items exist.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableItems.map((item) => {
                          console.log('🔍 Rendering item:', item);
                          return (
                            <div key={item._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                              <Checkbox
                                checked={formData.selectedItems.includes(item._id)}
                                onCheckedChange={(checked) => handleItemSelection(item._id, checked)}
                              />
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500 truncate">
                                    {item.code} | {item.category}
                                  </div>
                                  {item.batch && (
                                    <div className="text-xs sm:text-sm text-blue-600 font-medium">
                                      Batch: {item.batch}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="w-full sm:w-auto">
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Production Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium">Group Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter group name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter group description"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Assign Items</Label>
              <div className="mt-2 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Search items..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => fetchAvailableItems(itemSearchTerm, selectedGroup?._id)}
                    className="w-full sm:w-auto"
                  >
                    Search
                  </Button>
                </div>
                <div className="border rounded-md">
                  <ScrollArea className="h-48 sm:h-64 p-3 sm:p-4">
                    {/* Show currently assigned items first */}
                    {selectedGroup?.items?.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Currently Assigned Items:
                        </div>
                        <div className="space-y-2">
                          {selectedGroup.items.map((item) => (
                            <div key={`current-${item._id}`} className="flex items-center space-x-3 p-2 bg-blue-50 rounded-md">
                              <Checkbox
                                checked={formData.selectedItems.includes(item._id)}
                                onCheckedChange={(checked) => handleItemSelection(item._id, checked)}
                              />
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500 truncate">
                                    {item.code} | {item.category}
                                  </div>
                                  {item.batch && (
                                    <div className="text-xs sm:text-sm text-blue-600 font-medium">
                                      Batch: {item.batch}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show available items */}
                    {availableItems.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Available Items:
                        </div>
                        <div className="space-y-2">
                          {availableItems.map((item) => (
                            <div key={item._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                              <Checkbox
                                checked={formData.selectedItems.includes(item._id)}
                                onCheckedChange={(checked) => handleItemSelection(item._id, checked)}
                              />
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500 truncate">
                                    {item.code} | {item.category}
                                  </div>
                                  {item.batch && (
                                    <div className="text-xs sm:text-sm text-blue-600 font-medium">
                                      Batch: {item.batch}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedGroup?.items?.length === 0 && availableItems.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No items available</p>
                        <p className="text-xs text-gray-400 mt-1">Try searching for items</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleUpdateGroup} className="w-full sm:w-auto">
                Update Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Group Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Production Group Details</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label className="text-sm font-medium">Group Name</Label>
                  <p className="text-base sm:text-lg font-medium mt-1">{selectedGroup.name}</p>
                </div>
                {selectedGroup.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">{selectedGroup.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Created By</Label>
                    <p className="text-sm sm:text-base mt-1">{selectedGroup.createdBy?.username || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created Date</Label>
                    <p className="text-sm sm:text-base mt-1">{new Date(selectedGroup.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Assigned Items ({selectedGroup.items?.length || 0})
                </Label>
                <div className="border rounded-md mt-2">
                  <ScrollArea className="h-48 sm:h-64 p-3 sm:p-4">
                    {selectedGroup.items?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedGroup.items.map((item) => (
                          <div key={item._id} className="flex items-center space-x-3 p-3 border rounded-md bg-gray-50">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Code: {item.code} | Category: {item.category}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Quantity: {item.qty} {item.unit}
                              </div>
                              {item.batch && (
                                <div className="text-xs sm:text-sm text-blue-600 font-medium">
                                  Batch: {item.batch}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No items assigned</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowViewModal(false)} className="w-full sm:w-auto">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitHeadProductionGroup;