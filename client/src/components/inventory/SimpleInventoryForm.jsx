import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Package,
  AlertCircle,
  Upload,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ITEM_TYPES = ['Product', 'Material', 'Spares', 'Assemblies'];
const IMPORTANCE_LEVELS = ['Low', 'Normal', 'High', 'Critical'];
const UNITS = ['pieces', 'kg', 'liters', 'meters', 'sheets', 'boxes', 'units', 'tons', 'cartons'];

export default function SimpleInventoryForm({
  isOpen,
  onClose,
  item = null,
  categories = [],
  customerCategories = [],
  companies = [],
  onSubmit,
  isLoading = false,
  onOpenCategoryManagement
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    subCategory: '',
    customerCategory: 'Retail',
    type: 'Product',
    importance: 'Normal',
    unit: 'pieces',
    qty: 0,
    minStock: 0,
    stdCost: 0,
    purchaseCost: 0,
    salePrice: 0,
    mrp: 0,
    gst: 0,
    hsn: '',
    batch: '',
    store: '',
    leadTime: 0,
    internalManufacturing: false,
    purchase: true,
    internalNotes: '',
    image: '',
    quantity: ''
  });

  // Auto-select default store location for Unit Head
  useEffect(() => {
    console.log('🏢 Companies data:', companies);
    console.log('📝 Form data store:', formData.store);
    console.log('✏️ Is editing item:', !!item);

    if (companies && companies.length > 0 && !item && formData.store === '') {
      // For new items, auto-select the first company as default (user's company)
      const defaultCompany = companies[0];
      if (defaultCompany && defaultCompany.value) {
        console.log('🎯 Auto-selecting store:', defaultCompany.label, 'Value:', defaultCompany.value);
        setFormData(prev => ({ ...prev, store: defaultCompany.value }));
      } else {
        console.log('❌ No valid default company found');
      }
    } else {
      console.log('❌ Auto-select conditions not met');
    }
  }, [companies, item, formData.store]);

  // Get available subcategories based on selected category
  const availableSubCategories = React.useMemo(() => {
    if (!formData.category) return [];
    const selectedCat = categories.find(cat => cat.name === formData.category);
    return selectedCat?.subcategories || [];
  }, [formData.category, categories]);

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      // Editing mode
      const itemData = {
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        category: item.category || '',
        subCategory: item.subCategory || '',
        customerCategory: item.customerCategory || 'Retail',
        type: item.type || 'Product',
        importance: item.importance || 'Normal',
        unit: item.unit || 'pieces',
        qty: Number(item.qty) || 0,
        minStock: Number(item.minStock) || 0,
        stdCost: Number(item.stdCost) || 0,
        purchaseCost: Number(item.purchaseCost) || 0,
        salePrice: Number(item.salePrice) || 0,
        mrp: Number(item.mrp) || 0,
        gst: Number(item.gst) || 0,
        hsn: item.hsn || '',
        batch: item.batch || '',
        store: item.store || '',
        leadTime: Number(item.leadTime) || 0,
        internalManufacturing: Boolean(item.internalManufacturing),
        purchase: Boolean(item.purchase !== false),
        internalNotes: item.internalNotes || '',
        image: item.image || '',
        quantity: item.quantity || ''
      };

      setFormData(itemData);
      setErrors({});
      setImagePreview(item.image || null);
    } else if (isOpen && !item) {
      // Adding mode
      resetForm();
    }
  }, [isOpen, item]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      subCategory: '',
      customerCategory: 'Retail',
      type: 'Product',
      importance: 'Normal',
      unit: 'pieces',
      qty: 0,
      minStock: 0,
      stdCost: 0,
      purchaseCost: 0,
      salePrice: 0,
      mrp: 0,
      gst: 0,
      hsn: '',
      batch: '',
      store: '',
      leadTime: 0,
      internalManufacturing: false,
      purchase: true,
      internalNotes: '',
      image: '',
      quantity: ''
    });
    setErrors({});
    setImagePreview(null);
    setIsSubmitting(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        handleInputChange('image', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    handleInputChange('image', '');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Basic frontend validation
      const validationErrors = {};

      if (!formData.name.trim()) {
        validationErrors.name = 'Item name is required';
      }

      if (!formData.store || formData.store.trim() === '') {
        validationErrors.store = 'Store location is required';
      }

      if (!formData.category) {
        validationErrors.category = 'Category is required';
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Convert string numbers to actual numbers
      const processedData = {
        ...formData,
        qty: Number(formData.qty) || 0,
        minStock: Number(formData.minStock) || 0,
        stdCost: Number(formData.stdCost) || 0,
        purchaseCost: Number(formData.purchaseCost) || 0,
        salePrice: Number(formData.salePrice) || 0,
        mrp: Number(formData.mrp) || 0,
        gst: Number(formData.gst) || 0,
        leadTime: Number(formData.leadTime) || 0
      };

      await onSubmit(processedData);

      // Only close modal and reset form if we reach here (no errors thrown)
      resetForm();
      onClose();

      toast({
        title: `Item ${item ? 'Updated' : 'Created'}`,
        description: `Item "${formData.name}" has been ${item ? 'updated' : 'created'} successfully`,
      });

    } catch (error) {
      console.error('Form submission error:', error);

      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);

        // Show comprehensive validation error toast
        const errorCount = error.response.data.errors.length;
        const firstError = error.response.data.errors[0];

        toast({
          title: `Validation Failed (${errorCount} error${errorCount > 1 ? 's' : ''})`,
          description: errorCount === 1
            ? firstError.message
            : `${firstError.message} and ${errorCount - 1} more error${errorCount > 2 ? 's' : ''}`,
          variant: "destructive",
          duration: 8000,
        });

        // Scroll to first error field
        const firstErrorField = document.getElementById(firstError.field);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      } else if (error.response?.data?.message) {
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to save item",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update item details and save changes' : 'Enter item information to add to inventory'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Information Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Item Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter item name"
                  className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.name}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity / Specification</Label>
                <Input
                  id="quantity"
                  value={formData.batch}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="e.g. 400g, 300g, Premium"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter item description"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">Item Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="importance" className="text-sm font-medium text-gray-700">Importance *</Label>
                <Select value={formData.importance} onValueChange={(value) => handleInputChange('importance', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select importance" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORTANCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700">Product Image</Label>
              <div className="mt-1 space-y-4">
                {/* Current Image or Preview */}
                {(imagePreview || formData.image) && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={imagePreview || formData.image}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {formData.image ? 'Change Image' : 'Upload Image'}
                  </label>
                  <span className="text-sm text-gray-500">
                    Max 5MB (JPG, PNG, GIF)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Information Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Category Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category *</Label>
                <div className="flex gap-2 mt-1">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      handleInputChange('category', value);
                      handleInputChange('subCategory', ''); // Clear subcategory when category changes
                    }}
                  >
                    <SelectTrigger className={`${errors.category ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-3"
                    onClick={onOpenCategoryManagement}
                    title="Add new category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.category && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.category}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="subCategory" className="text-sm font-medium text-gray-700">Sub Category</Label>
                <Select
                  value={formData.subCategory}
                  onValueChange={(value) => handleInputChange('subCategory', value)}
                  disabled={!formData.category || availableSubCategories.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select sub category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubCategories.map((subCat, index) => (
                      <SelectItem key={index} value={subCat}>
                        {subCat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="customerCategory" className="text-sm font-medium text-gray-700">Customer Category</Label>
                <Select value={formData.customerCategory} onValueChange={(value) => handleInputChange('customerCategory', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select customer category" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerCategories.map((category) => (
                      <SelectItem key={category._id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit" className="text-sm font-medium text-gray-700">Unit *</Label>
                <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
                  <SelectTrigger className={`mt-1 ${errors.unit ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.unit}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Information Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pricing Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="stdCost" className="text-sm font-medium text-gray-700">Standard Cost</Label>
                <Input
                  id="stdCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.stdCost}
                  onChange={(e) => handleInputChange('stdCost', e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="purchaseCost" className="text-sm font-medium text-gray-700">Purchase Cost</Label>
                <Input
                  id="purchaseCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchaseCost}
                  onChange={(e) => handleInputChange('purchaseCost', e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="salePrice" className="text-sm font-medium text-gray-700">Sale Price</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => handleInputChange('salePrice', e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mrp" className="text-sm font-medium text-gray-700">MRP</Label>
                <Input
                  id="mrp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => handleInputChange('mrp', e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="gst" className="text-sm font-medium text-gray-700">GST (%)</Label>
                <Input
                  id="gst"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.gst}
                  onChange={(e) => handleInputChange('gst', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hsn" className="text-sm font-medium text-gray-700">HSN Code</Label>
                <Input
                  id="hsn"
                  value={formData.hsn}
                  onChange={(e) => handleInputChange('hsn', e.target.value)}
                  placeholder="Enter HSN code"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Stock Information Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Stock Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="qty" className="text-sm font-medium text-gray-700">Available Stock</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={formData.qty}
                  onChange={(e) => handleInputChange('qty', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="minStock" className="text-sm font-medium text-gray-700">Minimum Stock</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => handleInputChange('minStock', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="batch" className="text-sm font-medium text-gray-700">Qty/Batch</Label>
                <Input
                  id="batch"
                  value={formData.batch}
                  onChange={(e) => handleInputChange('batch', e.target.value)}
                  placeholder="Enter qty per batch"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="store" className="text-sm font-medium text-gray-700">Store Location *</Label>
                <Select value={formData.store} onValueChange={(value) => handleInputChange('store', value)}>
                  <SelectTrigger className={`mt-1 ${errors.store ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select store location" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length > 0 ? companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        {company.label}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-companies" disabled>
                        No companies available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.store && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.store}
                  </p>
                )}
              </div>
              {/* <div>
                <Label htmlFor="leadTime" className="text-sm font-medium text-gray-700">Lead Time (days)</Label>
                <Input
                  id="leadTime"
                  type="number"
                  min="0"
                  value={formData.leadTime}
                  onChange={(e) => handleInputChange('leadTime', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div> */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internalManufacturing"
                  checked={formData.internalManufacturing}
                  onCheckedChange={(checked) => handleInputChange('internalManufacturing', checked)}
                />
                <Label htmlFor="internalManufacturing" className="text-sm font-medium text-gray-700">
                  Internal Manufacturing
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="purchase"
                  checked={formData.purchase}
                  onCheckedChange={(checked) => handleInputChange('purchase', checked)}
                />
                <Label htmlFor="purchase" className="text-sm font-medium text-gray-700">
                  Available for Purchase
                </Label>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="internalNotes" className="text-sm font-medium text-gray-700">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                placeholder="Enter internal notes"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !formData.category || !formData.type || !formData.unit}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {item ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                item ? 'Update Item' : 'Create Item'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}