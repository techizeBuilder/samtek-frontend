import { useState, useEffect } from 'react';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import ExcelImportExport from './ExcelImportExport';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Tag,
  Users,
  AlertTriangle,
  X,
  FolderPlus,
  List,
  Package
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Subcategory Input Component
function SubcategoryInput({ subcategories, setSubcategories }) {
  const addSubcategory = () => {
    setSubcategories([...subcategories, '']);
  };

  const updateSubcategory = (index, value) => {
    const updated = [...subcategories];
    updated[index] = value;
    setSubcategories(updated);
  };

  const removeSubcategory = (index) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Subcategories
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Add subcategories to organize your products better
          </p>
        </div>
        <Button
          type="button"
          onClick={addSubcategory}
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Subcategory
        </Button>
      </div>
      
      {subcategories.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {subcategories.map((subcategory, index) => (
            <div key={index} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  value={subcategory}
                  onChange={(e) => updateSubcategory(index, e.target.value)}
                  placeholder={`Subcategory ${index + 1} name`}
                  className="h-8 text-sm border-gray-300"
                />
              </div>
              <Button
                type="button"
                onClick={() => removeSubcategory(index)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50:bg-red-950/30"
                title="Remove subcategory"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          No subcategories added yet. Click "Add Subcategory" to start.
        </div>
      )}
    </div>
  );
}

// Subcategory Form Modal
function SubcategoryFormModal({ isOpen, onClose, categories, selectedCategory, onCategorySelect, onSubmit, isLoading }) {
  const [subcategories, setSubcategories] = useState(['']);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      return;
    }

    const validSubcategories = subcategories.filter(sub => sub.trim() !== '');
    
    if (validSubcategories.length === 0) {
      return;
    }

    onSubmit({ subcategories: validSubcategories });
  };

  const handleClose = () => {
    setSubcategories(['']);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add Subcategories
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Select a category and add new subcategories to it
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="categorySelect" className="text-sm font-medium text-gray-700">
                Select Category *
              </Label>
              <Select onValueChange={(value) => {
                const category = categories.find(cat => cat._id === value);
                onCategorySelect(category);
              }} value={selectedCategory?._id || ''}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name} ({category.subcategories?.length || 0} subcategories)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedCategory && (
              <>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Existing Subcategories
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md min-h-[40px]">
                    {selectedCategory.subcategories?.length > 0 ? (
                      selectedCategory.subcategories.map((sub, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm italic">No existing subcategories</span>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <SubcategoryInput subcategories={subcategories} setSubcategories={setSubcategories} />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Adding...' : 'Add Subcategories'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Category Form Modal
function CategoryFormModal({ isOpen, onClose, editingCategory, onSubmit, isLoading }) {
  const [subcategories, setSubcategories] = useState(
    editingCategory?.subcategories || []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const filteredSubcategories = subcategories.filter(sub => sub && sub.trim() !== '');
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      subcategories: filteredSubcategories
    };
    console.log('Submitting category data:', data);
    onSubmit(data);
  };

  const handleClose = () => {
    setSubcategories(editingCategory?.subcategories || []);
    onClose();
  };

  // Update subcategories when editingCategory changes
  React.useEffect(() => {
    if (editingCategory) {
      const existingSubcategories = editingCategory.subcategories || [];
      console.log('Loading subcategories for edit:', existingSubcategories);
      setSubcategories(existingSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [editingCategory]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Tag className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Category Name *
              </Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingCategory?.name || ''}
                placeholder="Enter category name"
                className="mt-1 border-gray-300 focus:border-blue-500:border-blue-400"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingCategory?.description || ''}
                placeholder="Enter category description"
                rows={3}
                className="mt-1 border-gray-300 focus:border-blue-500:border-blue-400"
              />
            </div>
            <div className="border-t border-gray-200 pt-4">
              <SubcategoryInput subcategories={subcategories} setSubcategories={setSubcategories} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Customer Category Form Modal
function CustomerCategoryFormModal({ isOpen, onClose, editingCategory, onSubmit, isLoading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
    };
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {editingCategory ? 'Edit Customer Category' : 'Add Customer Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                Customer Category Name *
              </Label>
              <Input
                id="customerName"
                name="name"
                required
                defaultValue={editingCategory?.name || ''}
                placeholder="Enter customer category name"
                className="mt-1 border-gray-300 focus:border-green-500:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="customerDescription" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="customerDescription"
                name="description"
                defaultValue={editingCategory?.description || ''}
                placeholder="Enter customer category description"
                rows={3}
                className="mt-1 border-gray-300 focus:border-green-500:border-green-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Saving...' : editingCategory ? 'Update Customer Category' : 'Create Customer Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, description, isLoading, category }) {
  const hasProducts = category && (category.productCount || 0) > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            hasProducts 
              ? 'bg-yellow-100' 
              : 'bg-red-100'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${
              hasProducts 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`} />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center">{description}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {hasProducts ? 'Close' : 'Cancel'}
          </Button>
          {!hasProducts && (
            <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Category Management Modal
function CategoryManagementModal({ isOpen, onClose }) {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    enabled: isOpen,
  });

  const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/categories']);
      setShowCategoryForm(false);
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error) => {
      showSmartToast(error, 'Create Category');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/categories/${id}`, data),
    onSuccess: (response) => {
      console.log('Category update success:', response);
      queryClient.invalidateQueries(['/api/categories']);
      setShowCategoryForm(false);
      setEditingCategory(null);
      toast({
        title: "Success",
        description: response.message || "Category updated successfully",
      });
    },
    onError: (error) => {
      console.error('Category update error:', error);
      showSmartToast(error, 'Update Category');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/categories']);
      setDeleteConfirm({ isOpen: false, item: null });
      showSuccessToast('Category Deleted', 'Successfully deleted the category');
    },
    onError: (error) => {
      showSmartToast(error, 'Delete Category');
    }
  });

  const handleFormSubmit = (data) => {
    console.log('Submitting category form:', { editingCategory, data });
    
    try {
      if (editingCategory) {
        console.log('Updating category with ID:', editingCategory._id);
        updateCategoryMutation.mutate({ id: editingCategory._id, data });
      } else {
        console.log('Creating new category');
        createCategoryMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form submit error:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDelete = (category) => {
    const productCount = category.productCount || 0;
    const hasProducts = productCount > 0;
    
    setDeleteConfirm({
      isOpen: true,
      item: category,
      title: 'Delete Category',
      description: hasProducts 
        ? `Cannot delete "${category.name}" because it contains ${productCount} product${productCount === 1 ? '' : 's'}. Please move or delete all products from this category first.`
        : `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.item) {
      const productCount = deleteConfirm.item.productCount || 0;
      if (productCount > 0) {
        // Don't proceed with deletion if category has products
        setDeleteConfirm({ isOpen: false, item: null });
        return;
      }
      deleteCategoryMutation.mutate(deleteConfirm.item._id);
    }
  };

  const handleCloseModal = () => {
    setShowCategoryForm(false);
    setShowSubcategoryForm(false);
    setEditingCategory(null);
    setSelectedCategoryForSubcategory(null);
    onClose();
  };

  const handleSubcategorySubmit = (data) => {
    if (selectedCategoryForSubcategory) {
      const existingSubcategories = selectedCategoryForSubcategory.subcategories || [];
      const newSubcategories = [...existingSubcategories, ...data.subcategories];
      
      updateCategoryMutation.mutate({ 
        id: selectedCategoryForSubcategory._id, 
        data: {
          name: selectedCategoryForSubcategory.name,
          description: selectedCategoryForSubcategory.description || '',
          subcategories: newSubcategories
        }
      });
      
      // Close the modal and reset state
      setShowSubcategoryForm(false);
      setSelectedCategoryForSubcategory(null);
    }
  };

  const handleAddSubcategory = (category) => {
    setSelectedCategoryForSubcategory(category);
    setShowSubcategoryForm(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-2">
                <Tag className="h-6 w-6 text-blue-600" />
                Category Management
              </div>
              <div className="flex items-center gap-2">
                {/* Excel Import/Export functionality removed */}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Categories
                </h3>
                <p className="text-sm text-gray-500">
                  Manage your product categories and subcategories
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowCategoryForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Category
                </Button>
                <Button 
                  onClick={() => setShowSubcategoryForm(true)}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50:bg-blue-900/20"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Add Subcategory
                </Button>
              </div>
            </div>

            {/* Categories List */}
            <ScrollArea className="h-[500px] w-full">
              <div className="space-y-3">
                {categoriesLoading ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Loading categories...</div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No categories found
                    </h3>
                    <p className="text-sm text-gray-500">
                      Get started by creating your first category
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-900">Category Name</TableHead>
                          <TableHead className="font-semibold text-gray-900">Description</TableHead>
                          <TableHead className="font-semibold text-gray-900">Subcategories</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Products</TableHead>
                          <TableHead className="w-[120px] font-semibold text-gray-900">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category, index) => (
                          <TableRow 
                            key={category._id}
                            className={`hover:bg-gray-50:bg-gray-800/50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {category.name}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-sm text-gray-600">
                                {category.description || 'No description'}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              {category.subcategories && category.subcategories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {category.subcategories.slice(0, 3).map((sub, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="secondary" 
                                      className="text-xs bg-gray-100 text-gray-700"
                                    >
                                      {sub}
                                    </Badge>
                                  ))}
                                  {category.subcategories.length > 3 && (
                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                                      +{category.subcategories.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No subcategories</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="flex items-center justify-center">
                                <Badge 
                                  variant={category.productCount > 0 ? "default" : "secondary"}
                                  className={`
                                    ${category.productCount > 0 
                                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                      : 'bg-gray-100 text-gray-600'
                                    }
                                  `}
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  {category.productCount || 0}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddSubcategory(category)}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50:bg-green-900/30"
                                  title="Add Subcategory"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(category)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50:bg-blue-950/30"
                                  title="Edit Category"
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(category)}
                                  className="h-8 w-8 p-0 hover:bg-red-50:bg-red-950/30"
                                  title="Delete Category"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <CategoryFormModal
        isOpen={showCategoryForm}
        onClose={() => {
          setShowCategoryForm(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSubmit={handleFormSubmit}
        isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
      />

      <SubcategoryFormModal
        isOpen={showSubcategoryForm}
        onClose={() => {
          setShowSubcategoryForm(false);
          setSelectedCategoryForSubcategory(null);
        }}
        categories={categories || []}
        selectedCategory={selectedCategoryForSubcategory}
        onCategorySelect={setSelectedCategoryForSubcategory}
        onSubmit={handleSubcategorySubmit}
        isLoading={updateCategoryMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        category={deleteConfirm.item}
        isLoading={deleteCategoryMutation.isPending}
      />
    </>
  );
}

// Customer Category Management Modal
function CustomerCategoryManagementModal({ isOpen, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });
  const queryClient = useQueryClient();

  // Data fetching
  const { data: customerCategoriesData, isLoading } = useQuery({
    queryKey: ['/api/customer-categories'],
    enabled: isOpen,
  });

  const customerCategories = Array.isArray(customerCategoriesData?.customerCategories) ? customerCategoriesData.customerCategories : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/customer-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/customer-categories']);
      setShowForm(false);
      setEditingCategory(null);
      showSuccessToast('Success', 'Customer category created successfully');
    },
    onError: (error) => {
      showSmartToast(error, 'Create Customer Category');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/customer-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/customer-categories']);
      setShowForm(false);
      setEditingCategory(null);
      showSuccessToast('Success', 'Customer category updated successfully');
    },
    onError: (error) => {
      showSmartToast(error, 'Update Customer Category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/customer-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/customer-categories']);
      setDeleteConfirm({ isOpen: false, item: null });
      showSuccessToast('Customer Category Deleted', 'Successfully deleted the customer category');
    },
    onError: (error) => {
      showSmartToast(error, 'Delete Customer Category');
    }
  });

  const handleFormSubmit = (data) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = (category) => {
    setDeleteConfirm({
      isOpen: true,
      item: category,
      title: 'Delete Customer Category',
      description: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.item) {
      deleteMutation.mutate(deleteConfirm.item._id);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingCategory(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-green-600" />
              Customer Category Management
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Customer Categories
                </h3>
                <p className="text-sm text-gray-500">
                  Manage your customer category classifications
                </p>
              </div>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer Category
              </Button>
            </div>

            {/* Customer Categories List */}
            <ScrollArea className="h-[500px] w-full">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Loading customer categories...</div>
                </div>
              ) : customerCategories.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No customer categories found
                  </h3>
                  <p className="text-sm text-gray-500">
                    Get started by creating your first customer category
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Category Name</TableHead>
                        <TableHead className="font-semibold text-gray-900">Description</TableHead>
                        <TableHead className="w-[120px] font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerCategories.map((category, index) => (
                        <TableRow 
                          key={category._id}
                          className={`hover:bg-gray-50:bg-gray-800/50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Users className="h-3 w-3 mr-1" />
                              {category.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm text-gray-600">
                              {category.description || 'No description'}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(category)}
                                className="h-8 w-8 p-0 hover:bg-green-50:bg-green-950/30"
                                title="Edit Customer Category"
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(category)}
                                className="h-8 w-8 p-0 hover:bg-red-50:bg-red-950/30"
                                title="Delete Customer Category"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerCategoryFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

// Main Component
export default function CategoryManagement({ 
  isOpen,
  onClose,
  initialTab = 'product'
}) {
  const [activeView, setActiveView] = useState(initialTab);

  useEffect(() => {
    setActiveView(initialTab);
  }, [initialTab]);

  if (initialTab === 'customer') {
    return (
      <CustomerCategoryManagementModal
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <CategoryManagementModal
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}