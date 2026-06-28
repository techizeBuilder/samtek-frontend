import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, Package, AlertCircle, Upload, Plus, X, Shield, Layers, Wrench, FlaskConical, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ITEM_TYPES = ['Product', 'Material', 'Spares', 'Assemblies'];
const IMPORTANCE_LEVELS = ['Low', 'Normal', 'High', 'Critical'];
const UNITS = ['pieces', 'kg', 'liters', 'meters', 'sheets', 'boxes', 'units', 'tons', 'cartons'];
const WARRANTY_TYPES = ['Parts Only', 'Labor Only', 'Comprehensive'];

function DynamicListField({ label, icon: Icon, items, onChange, placeholder }) {
  const addItem = () => onChange([...items, '']);
  const updateItem = (i, val) => {
    const updated = [...items];
    updated[i] = val;
    onChange(updated);
  };
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />} {label}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg py-3 text-center">No {label.toLowerCase()} added yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((val, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={val} onChange={(e) => updateItem(i, e.target.value)} placeholder={`${placeholder} ${i + 1}`} className="h-8 text-sm bg-white" />
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={() => removeItem(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SimpleInventoryForm({
  isOpen, onClose, item = null, categories = [], customerCategories = [], onSubmit, isLoading = false, onOpenCategoryManagement
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const emptyForm = {
    name: '', code: '', description: '', group: '',
    category: '', subCategory: '', customerCategory: 'Retail', type: 'Product',
    importance: 'Normal', unit: 'pieces',
    qty: 0, minStock: 0, batch: '', leadTime: 0,
    // Restored Financials
    stdCost: 0, purchaseCost: 0, salePrice: 0, mrp: 0, gst: 0, hsn: '',
    internalManufacturing: false, purchase: true, internalNotes: '', image: '',
    // R&D Fields
    specifications: [], applications: [], variants: [],
    warranty: { period: 12, type: 'Comprehensive', terms: '' }
  };

  const [formData, setFormData] = useState(emptyForm);

  const availableSubCategories = React.useMemo(() => {
    if (!formData.category) return [];
    const selectedCat = categories.find(cat => cat.name === formData.category);
    return selectedCat?.subcategories || [];
  }, [formData.category, categories]);

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        ...emptyForm, ...item,
        qty: Number(item.qty) || 0,
        minStock: Number(item.minStock) || 0,
        stdCost: Number(item.stdCost) || 0,
        purchaseCost: Number(item.purchaseCost) || 0,
        salePrice: Number(item.salePrice) || 0,
        mrp: Number(item.mrp) || 0,
        gst: Number(item.gst) || 0,
        leadTime: Number(item.leadTime) || 0,
        internalManufacturing: Boolean(item.internalManufacturing),
        purchase: Boolean(item.purchase !== false),
        specifications: Array.isArray(item.specifications) ? item.specifications : [],
        applications: Array.isArray(item.applications) ? item.applications : [],
        variants: Array.isArray(item.variants) ? item.variants : [],
        warranty: item.warranty || { period: 12, type: 'Comprehensive', terms: '' }
      });
      setErrors({});
      setImagePreview(item.image || null);
    } else if (isOpen && !item) {
      resetForm();
    }
  }, [isOpen, item]);

  const resetForm = () => {
    setFormData(emptyForm);
    setErrors({});
    setImagePreview(null);
    setIsSubmitting(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSpecChange = (index, field, value) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index][field] = value;
    handleInputChange('specifications', newSpecs);
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    handleInputChange('variants', newVariants);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      handleInputChange('image', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const validationErrors = {};
      if (!formData.name.trim()) validationErrors.name = 'Item name is required';
      if (!formData.code || !formData.code.trim()) validationErrors.code = 'Item Code is mandatory (R&D defined).';
      if (!formData.category) validationErrors.category = 'Category is required';
      if (!formData.unit) validationErrors.unit = 'Unit is required';

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const processedData = {
        ...formData,
        code: formData.code.trim(),
        qty: Number(formData.qty) || 0,
        minStock: Number(formData.minStock) || 0,
        stdCost: Number(formData.stdCost) || 0,
        purchaseCost: Number(formData.purchaseCost) || 0,
        salePrice: Number(formData.salePrice) || 0,
        mrp: Number(formData.mrp) || 0,
        gst: Number(formData.gst) || 0,
        leadTime: Number(formData.leadTime) || 0,
        specifications: formData.specifications.filter(s => s.key?.trim() !== ''),
        applications: formData.applications.filter(s => s?.trim() !== ''),
        variants: formData.variants.filter(v => v.name?.trim() !== ''),
      };

      await onSubmit(processedData);
      resetForm();
      onClose();
      toast({ title: `Item ${item ? 'Updated' : 'Created'}`, description: `Item has been saved successfully` });
    } catch (error) {
      console.error('Form submission error:', error);
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to save item', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {item ? 'Edit Master Item' : 'Add New Master Item'}
          </DialogTitle>
          <DialogDescription>Central R&D item registry. Location is automatically assigned to your company.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">

          {/* ── Core Identification ─────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Item Name *</Label>
                <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Enter item name" className={`mt-1 bg-white ${errors.name ? 'border-red-500' : ''}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Item Code (ERP) * <span className="text-xs font-normal text-amber-600">(R&D must define)</span></Label>
                <Input value={formData.code} onChange={(e) => handleInputChange('code', e.target.value)} placeholder="e.g. MAT-001" className={`mt-1 font-mono bg-white ${errors.code ? 'border-red-500' : ''}`} />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Enter item description" rows={2} className="mt-1 bg-white" />
              </div>
            </div>
          </div>

          {/* ── Classification ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-gray-700">Category *</Label>
              <div className="flex gap-2 mt-1">
                <Select value={formData.category} onValueChange={(v) => { handleInputChange('category', v); handleInputChange('subCategory', ''); }}>
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={onOpenCategoryManagement}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Sub Category</Label>
              <Select value={formData.subCategory} onValueChange={(v) => handleInputChange('subCategory', v)} disabled={!formData.category}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{availableSubCategories.map((s, i) => <SelectItem key={i} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Customer Category</Label>
              <Select value={formData.customerCategory} onValueChange={(v) => handleInputChange('customerCategory', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{customerCategories.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Item Type *</Label>
              <Select value={formData.type} onValueChange={(v) => handleInputChange('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Unit *</Label>
              <Select value={formData.unit} onValueChange={(v) => handleInputChange('unit', v)}>
                <SelectTrigger className={`mt-1 ${errors.unit ? 'border-red-500' : ''}`}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Importance</Label>
              <Select value={formData.importance} onValueChange={(v) => handleInputChange('importance', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{IMPORTANCE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* ── R&D Product Details ────────────────────────────────────── */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-5">
            <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" /> R&D Standards & Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Wrench className="h-4 w-4 text-gray-500" /> Specifications</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => handleInputChange('specifications', [...formData.specifications, { key: '', value: '' }])}><Plus className="h-3 w-3 mr-1" /> Add Spec</Button>
                </div>
                {formData.specifications.length === 0 && <p className="text-xs text-gray-400 italic mb-2">No specs added.</p>}
                {formData.specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input placeholder="Key (e.g. Power)" value={spec.key} onChange={e => handleSpecChange(idx, 'key', e.target.value)} className="h-8 bg-white" />
                    <Input placeholder="Value (e.g. 5HP)" value={spec.value} onChange={e => handleSpecChange(idx, 'value', e.target.value)} className="h-8 bg-white" />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => handleInputChange('specifications', formData.specifications.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div>
                <DynamicListField label="Applications" icon={Layers} items={formData.applications} onChange={(v) => handleInputChange('applications', v)} placeholder="e.g. Industrial Pipeline" />
              </div>
            </div>

            <div className="mt-6 border-t border-blue-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Package className="h-4 w-4 text-gray-500" /> Product Variants</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => handleInputChange('variants', [...formData.variants, { name: '', code: '', capacity: '', motorPower: '' }])}><Plus className="h-3 w-3 mr-1" /> Add Variant</Button>
              </div>
              <div className="space-y-2">
                {formData.variants.length === 0 && <p className="text-xs text-gray-400 italic">No variants added. Parent item will be used directly.</p>}
                {formData.variants.map((variant, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 p-3 bg-white rounded border border-gray-200">
                    <div><Label className="text-[10px] text-gray-500 uppercase">Variant Name</Label><Input className="h-8 text-sm" value={variant.name} onChange={e => handleVariantChange(idx, 'name', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-gray-500 uppercase">Sub-Code</Label><Input className="h-8 text-sm" value={variant.code} onChange={e => handleVariantChange(idx, 'code', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-gray-500 uppercase">Capacity</Label><Input className="h-8 text-sm" value={variant.capacity} onChange={e => handleVariantChange(idx, 'capacity', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-gray-500 uppercase">Motor Power</Label><Input className="h-8 text-sm" value={variant.motorPower} onChange={e => handleVariantChange(idx, 'motorPower', e.target.value)} /></div>
                    <div className="flex items-end"><Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleInputChange('variants', formData.variants.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-blue-200 pt-4">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2"><Shield className="h-4 w-4 text-gray-500" /> Warranty Details</Label>
              <div className="flex gap-3">
                <div className="w-1/4"><Label className="text-[10px] text-gray-500 uppercase">Period (Months)</Label><Input type="number" className="h-9 bg-white" value={formData.warranty.period} onChange={e => handleInputChange('warranty', { ...formData.warranty, period: Number(e.target.value) })} /></div>
                <div className="w-1/4"><Label className="text-[10px] text-gray-500 uppercase">Type</Label><Select value={formData.warranty.type} onValueChange={v => handleInputChange('warranty', { ...formData.warranty, type: v })}><SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger><SelectContent>{WARRANTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex-1"><Label className="text-[10px] text-gray-500 uppercase">Terms</Label><Input placeholder="Enter terms & conditions" className="h-9 bg-white" value={formData.warranty.terms} onChange={e => handleInputChange('warranty', { ...formData.warranty, terms: e.target.value })} /></div>
              </div>
            </div>
          </div>

          {/* ── Financials & Tax (Restored) ──────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div><Label className="text-sm font-medium text-gray-700">Standard Cost</Label><Input type="number" value={formData.stdCost} onChange={(e) => handleInputChange('stdCost', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Purchase Cost</Label><Input type="number" value={formData.purchaseCost} onChange={(e) => handleInputChange('purchaseCost', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Sale Price</Label><Input type="number" value={formData.salePrice} onChange={(e) => handleInputChange('salePrice', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">MRP</Label><Input type="number" value={formData.mrp} onChange={(e) => handleInputChange('mrp', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">GST (%)</Label><Input type="number" value={formData.gst} onChange={(e) => handleInputChange('gst', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">HSN Code</Label><Input value={formData.hsn} onChange={(e) => handleInputChange('hsn', e.target.value)} placeholder="HSN" className="mt-1" /></div>
            </div>
          </div>

          {/* ── Stock & Sourcing ─────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock & Sourcing Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div><Label className="text-sm font-medium text-gray-700">Available Stock</Label><Input type="number" value={formData.qty} onChange={(e) => handleInputChange('qty', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Min Stock</Label><Input type="number" value={formData.minStock} onChange={(e) => handleInputChange('minStock', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Qty / Batch</Label><Input value={formData.batch} onChange={(e) => handleInputChange('batch', e.target.value)} placeholder="e.g. 400g" className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Lead Time (Days)</Label><Input type="number" value={formData.leadTime} onChange={(e) => handleInputChange('leadTime', e.target.value)} className="mt-1" /></div>
            </div>

            <div className="flex gap-6 p-3 bg-slate-50 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox id="purchase" checked={formData.purchase} onCheckedChange={(v) => handleInputChange('purchase', v)} />
                <label htmlFor="purchase" className="text-sm font-medium cursor-pointer">Purchasable (Vendor)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="internalManufacturing" checked={formData.internalManufacturing} onCheckedChange={(v) => handleInputChange('internalManufacturing', v)} />
                <label htmlFor="internalManufacturing" className="text-sm font-medium cursor-pointer">Internal Manufacturing</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.code || !formData.category}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Update Master Item' : 'Create Master Item'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}