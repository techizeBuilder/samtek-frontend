import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Loader2, Package, AlertCircle, Upload, Plus, X, Shield, Layers, Wrench, FlaskConical, Trash2,
  Image as ImageIcon, FileText, Video, StickyNote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UNIT_TYPES, getUnitTypeForUnit, getUnitsForType } from '@/utils/unitTypes';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';

const ITEM_TYPES = ['Product', 'Material', 'Spares', 'Assemblies'];
const IMPORTANCE_LEVELS = ['Low', 'Normal', 'High', 'Critical'];
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
  isOpen, onClose, item = null, categories = [], customerCategories = [], groups = [], unitTypes = [], onSubmit, isLoading = false, onOpenCategoryManagement, onOpenGroupManagement, onOpenUnitTypeManagement
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [brochureUploading, setBrochureUploading] = useState(false);
  // Tracks a freshly-uploaded (this session) image/brochure URL that isn't attached to a
  // saved item yet — if the user replaces it or cancels the dialog, we discard it from disk
  // so it doesn't sit as an orphaned file. Cleared (without discarding) once the item saves.
  const [pendingImageUpload, setPendingImageUpload] = useState(null);
  const [pendingBrochureUpload, setPendingBrochureUpload] = useState(null);

  const emptyForm = {
    name: '', code: '', description: '', group: '',
    category: '', subCategory: '', customerCategory: 'Retail', type: 'Product',
    importance: 'Normal', unitType: '', unit: '',
    qty: 0, minStock: 0, batch: '', leadTime: 0,
    stdCost: 0, purchaseCost: 0, salePrice: 0, mrp: 0, gst: 0, hsn: '',
    // Auto-pricing bookkeeping (see itemPricingService.js) — 'Manual' until a
    // real BOM build or purchase invoice resolves a cost for this item
    costSource: 'Manual', costResolvedAt: null, costResolutionIssue: null,
    internalManufacturing: false, purchase: true, purchaseUnitType: '', purchaseUnit: '', internalNotes: '', image: '',
    brochureUrl: '', videoUrl: '', otherInfo: '',
    // Optional Product Master attributes — auto-filled when Item Code matches, editable after
    brand: '', metrology: '', size: '', unitWeightValue: '', unitWeightUnitType: '', unitWeightUnit: '',
    specifications: [], applications: [],
    warranty: { period: 12, type: 'Comprehensive', terms: '' }
  };

  const [formData, setFormData] = useState(emptyForm);

  const availableUnits = React.useMemo(() => {
    if (!formData.unitType) return [];
    const selectedUnitType = unitTypes.find(ut => ut.name === formData.unitType);
    const units = selectedUnitType?.units || [];
    return formData.unit && !units.includes(formData.unit) ? [formData.unit, ...units] : units;
  }, [formData.unitType, formData.unit, unitTypes]);

  const availablePurchaseUnits = React.useMemo(() => {
    if (!formData.purchaseUnitType) return [];
    const selectedUnitType = unitTypes.find(ut => ut.name === formData.purchaseUnitType);
    const units = selectedUnitType?.units || [];
    return formData.purchaseUnit && !units.includes(formData.purchaseUnit) ? [formData.purchaseUnit, ...units] : units;
  }, [formData.purchaseUnitType, formData.purchaseUnit, unitTypes]);

  const availableSubCategories = React.useMemo(() => {
    if (!formData.category) return [];
    const selectedCat = categories.find(cat => cat.name === formData.category);
    return selectedCat?.subcategories || [];
  }, [formData.category, categories]);

  const availableWeightUnits = React.useMemo(() => {
    if (!formData.unitWeightUnitType) return [];
    const ut = unitTypes.find(u => u.name === formData.unitWeightUnitType);
    const units = ut?.units || [];
    return formData.unitWeightUnit && !units.includes(formData.unitWeightUnit) ? [formData.unitWeightUnit, ...units] : units;
  }, [formData.unitWeightUnitType, formData.unitWeightUnit, unitTypes]);

  // Product Master lookup for the optional code-match autofill. Fetched unfiltered
  // (no page/limit) — same convention other full-list consumers of this endpoint use.
  const { data: pmMachinesResponse } = useQuery({
    queryKey: ['rd-machines-all'],
    queryFn: () => apiRequest('GET', '/api/rd/machines'),
  });
  const pmMatch = React.useMemo(() => {
    const c = (formData.code || '').trim().toLowerCase();
    if (!c) return null;
    const pmMachines = pmMachinesResponse?.data || [];
    return pmMachines.find(m => (m.code || '').trim().toLowerCase() === c) || null;
  }, [formData.code, pmMachinesResponse]);

  // Fills in Product Master attributes when the Item Code matches — only into fields still
  // empty, never overwriting what's already typed. Deliberately excludes Category/Sub Category:
  // Product Master's P-Type/Category/P-Source Type is a different taxonomy from Inventory's own
  // (shown read-only near the code field for reference instead of ever being written here).
  const applyPMAutofill = () => {
    if (!pmMatch) return;
    setFormData(prev => ({
      ...prev,
      name: prev.name || pmMatch.name || '',
      description: prev.description || pmMatch.description || '',
      brand: prev.brand || pmMatch.brand || '',
      metrology: prev.metrology || pmMatch.metrology || '',
      size: prev.size || pmMatch.size || '',
      unitWeightValue: (prev.unitWeightValue !== '' && prev.unitWeightValue !== null && prev.unitWeightValue !== undefined)
        ? prev.unitWeightValue
        : (pmMatch.unitWeightValue ?? ''),
      unitWeightUnitType: prev.unitWeightUnitType || pmMatch.unitWeightUnitType || '',
      unitWeightUnit: prev.unitWeightUnit || pmMatch.unitWeightUnit || '',
      // Product Master's Input Unit / Output Unit were modeled to mirror Inventory's
      // purchaseUnitType+purchaseUnit / unitType+unit convention exactly — direct mapping.
      purchaseUnitType: prev.purchaseUnitType || pmMatch.inputUnitType || '',
      purchaseUnit: prev.purchaseUnit || pmMatch.inputUnit || '',
      unitType: prev.unitType || pmMatch.outputUnitType || '',
      unit: prev.unit || pmMatch.outputUnit || '',
      specifications: (Array.isArray(prev.specifications) && prev.specifications.length > 0)
        ? prev.specifications
        : (Array.isArray(pmMatch.specifications) ? pmMatch.specifications : []),
    }));
  };

  const getUnitTypeForUnitDynamic = (unitName) => {
    if (!unitName) return '';
    const found = unitTypes.find(ut => ut.units?.includes(unitName));
    return found ? found.name : '';
  };

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        ...emptyForm, ...item,
        unitType: item.unitType || getUnitTypeForUnitDynamic(item.unit),
        purchaseUnitType: item.purchaseUnitType || getUnitTypeForUnitDynamic(item.purchaseUnit),
        qty: Number(item.qty) || 0,
        minStock: Number(item.minStock) || 0,
        stdCost: Number(item.stdCost) || 0,
        purchaseCost: Number(item.purchaseCost) || 0,
        salePrice: Number(item.salePrice) || 0,
        mrp: Number(item.mrp) || 0,
        gst: Number(item.gst) || 0,
        leadTime: Number(item.leadTime) || 0,
        unitWeightValue: (item.unitWeightValue !== null && item.unitWeightValue !== undefined) ? item.unitWeightValue : '',
        internalManufacturing: Boolean(item.internalManufacturing),
        purchase: Boolean(item.purchase !== false),
        costSource: item.costSource || 'Manual',
        costResolvedAt: item.costResolvedAt || null,
        costResolutionIssue: item.costResolutionIssue || null,
        specifications: Array.isArray(item.specifications) ? item.specifications : [],
        applications: Array.isArray(item.applications) ? item.applications : [],
        warranty: item.warranty || { period: 12, type: 'Comprehensive', terms: '' }
      });
      setErrors({});
      setImagePreview(item.image || null);
      setPendingImageUpload(null);
      setPendingBrochureUpload(null);
    } else if (isOpen && !item) {
      resetForm();
    }
  }, [isOpen, item]);

  const resetForm = () => {
    setFormData(emptyForm);
    setErrors({});
    setImagePreview(null);
    setIsSubmitting(false);
    setImageUploading(false);
    setBrochureUploading(false);
    setPendingImageUpload(null);
    setPendingBrochureUpload(null);
  };

  // Best-effort cleanup of this session's not-yet-saved uploads (dialog cancelled/closed).
  const discardPendingMedia = () => {
    [pendingImageUpload, pendingBrochureUpload].filter(Boolean).forEach(url => {
      apiRequest('POST', '/api/items/media/delete', { url }).catch(() => {});
    });
  };

  const handleCancel = () => {
    discardPendingMedia();
    onClose();
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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }
    // Instant local preview while the real upload is in flight
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiRequest('POST', '/api/items/upload-image', fd);
      if (res.success && res.url) {
        // Replacing an upload from this same session that was never saved — discard it
        if (pendingImageUpload) {
          apiRequest('POST', '/api/items/media/delete', { url: pendingImageUpload }).catch(() => {});
        }
        setPendingImageUpload(res.url);
        handleInputChange('image', res.url);
        setImagePreview(res.url);
      }
    } catch (error) {
      toast({ title: 'Image Upload Failed', description: error?.message || 'Failed to upload image', variant: 'destructive' });
      setImagePreview(formData.image || null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleBrochureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Only PDF files are allowed for the brochure', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select a PDF under 10MB', variant: 'destructive' });
      return;
    }
    setBrochureUploading(true);
    try {
      const fd = new FormData();
      fd.append('brochure', file);
      const res = await apiRequest('POST', '/api/items/upload-brochure', fd);
      if (res.success && res.url) {
        // Replacing an upload from this same session that was never saved — discard it
        if (pendingBrochureUpload) {
          apiRequest('POST', '/api/items/media/delete', { url: pendingBrochureUpload }).catch(() => {});
        }
        setPendingBrochureUpload(res.url);
        handleInputChange('brochureUrl', res.url);
        toast({ title: 'Brochure Uploaded', description: 'Brochure PDF uploaded successfully' });
      }
    } catch (error) {
      toast({ title: 'Brochure Upload Failed', description: error?.message || 'Failed to upload brochure', variant: 'destructive' });
    } finally {
      setBrochureUploading(false);
    }
  };

  const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const validationErrors = {};
      if (!formData.name.trim()) validationErrors.name = 'Item name is required';
      if (!formData.code || !formData.code.trim()) validationErrors.code = 'Item Code is mandatory (R&D defined).';
      if (!formData.category) validationErrors.category = 'Category is required';
      if (!formData.unitType && !formData.unit) validationErrors.unitType = 'Unit Type is required';
      if (!formData.unit) validationErrors.unit = 'Unit is required';
      if (formData.purchase) {
        if (!formData.purchaseUnitType && !formData.purchaseUnit) validationErrors.purchaseUnitType = 'Purchase Unit Type is required';
        if (!formData.purchaseUnit) validationErrors.purchaseUnit = 'Purchase Unit is required';
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const processedData = {
        ...formData,
        code: formData.code.trim(),
        purchaseUnitType: formData.purchase ? formData.purchaseUnitType : '',
        purchaseUnit: formData.purchase ? formData.purchaseUnit : '',
        qty: Number(formData.qty) || 0,
        minStock: Number(formData.minStock) || 0,
        stdCost: Number(formData.stdCost) || 0,
        purchaseCost: Number(formData.purchaseCost) || 0,
        salePrice: Number(formData.salePrice) || 0,
        mrp: Number(formData.mrp) || 0,
        gst: Number(formData.gst) || 0,
        leadTime: Number(formData.leadTime) || 0,
        unitWeightValue: (formData.unitWeightValue !== '' && formData.unitWeightValue !== null && formData.unitWeightValue !== undefined)
          ? Number(formData.unitWeightValue) : null,
        specifications: formData.specifications.filter(s => s.key?.trim() !== ''),
        applications: formData.applications.filter(s => s?.trim() !== ''),
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
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
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  onBlur={applyPMAutofill}
                  placeholder="e.g. MAT-001"
                  className={`mt-1 font-mono bg-white pr-8 ${errors.code ? 'border-red-500' : ''}`}
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                {!errors.code && pmMatch && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ Matched Product Master: <strong>{pmMatch.name}</strong> — classified as {pmMatch.pType || '—'} / {pmMatch.category || '—'} / {pmMatch.pSourceType || '—'}
                    <span className="text-gray-400"> (reference only — doesn't affect this item's Category)</span>
                  </p>
                )}
                {!errors.code && !pmMatch && formData.code && (
                  <p className="text-xs text-amber-600 mt-1">⚠ No matching Product Master item for this code — you can still save, nothing was auto-filled.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Enter item description" rows={2} className="mt-1 bg-white" />
              </div>
            </div>
          </div>

          {/* ── Product Master Attributes (auto-filled by code, editable) ──── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900">Product Master Attributes</h3>
            <p className="text-xs text-gray-400 mb-4">Auto-filled from Product Master when the Item Code matches — optional, safe to edit.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Brand</Label>
                <Input value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)} placeholder="e.g. Bosch" className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Metrology</Label>
                <Input value={formData.metrology} onChange={(e) => handleInputChange('metrology', e.target.value)} placeholder="e.g. Vernier Caliper" className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Size</Label>
                <Input value={formData.size} onChange={(e) => handleInputChange('size', e.target.value)} placeholder="e.g. 200mm x 100mm" className="mt-1 bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Unit Weight</Label>
                <Input type="number" min="0" value={formData.unitWeightValue} onChange={(e) => handleInputChange('unitWeightValue', e.target.value)} placeholder="0" className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Weight Unit Type</Label>
                <Select value={formData.unitWeightUnitType} onValueChange={(v) => { handleInputChange('unitWeightUnitType', v); handleInputChange('unitWeightUnit', ''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{unitTypes.map(ut => <SelectItem key={ut._id} value={ut.name}>{ut.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Weight Unit</Label>
                <Select value={formData.unitWeightUnit} onValueChange={(v) => handleInputChange('unitWeightUnit', v)} disabled={!formData.unitWeightUnitType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{availableWeightUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Media & Documents ──────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Media & Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" /> Product Image
                </Label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img src={resolveMediaUrl(imagePreview)} alt="Product" className="h-16 w-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 flex-shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {imageUploading && <p className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" /> Brochure (PDF)
                </Label>
                <input type="file" accept="application/pdf" onChange={handleBrochureUpload} disabled={brochureUploading} className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {brochureUploading && <p className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
                {formData.brochureUrl && !brochureUploading && (
                  <a href={resolveMediaUrl(formData.brochureUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1.5 inline-block">View uploaded brochure</a>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <Video className="h-4 w-4 text-gray-500" /> Video URL
                </Label>
                <Input value={formData.videoUrl} onChange={(e) => handleInputChange('videoUrl', e.target.value)} placeholder="e.g. https://youtube.com/watch?v=..." className="bg-white" />
                <p className="text-xs text-gray-400 mt-1">Not uploaded to the server — just a link (YouTube, Drive, etc.)</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <StickyNote className="h-4 w-4 text-gray-500" /> Other Info
                </Label>
                <Input value={formData.otherInfo} onChange={(e) => handleInputChange('otherInfo', e.target.value)} placeholder="Any other notes for this item" className="bg-white" />
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
              <Label className="text-sm font-medium text-gray-700">Group</Label>
              <div className="flex gap-2 mt-1">
                <Select value={formData.group || ''} onValueChange={(v) => handleInputChange('group', v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select Group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g._id} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {onOpenGroupManagement && (
                  <Button type="button" variant="outline" size="icon" onClick={onOpenGroupManagement}><Plus className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Item Type *</Label>
              <Select value={formData.type} onValueChange={(v) => handleInputChange('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Unit Type *</Label>
              <div className="flex gap-2 mt-1">
                <Select value={formData.unitType} onValueChange={(v) => { handleInputChange('unitType', v); handleInputChange('unit', ''); }}>
                  <SelectTrigger className={`flex-1 ${errors.unitType ? 'border-red-500' : ''}`}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{unitTypes.map((ut) => <SelectItem key={ut._id} value={ut.name}>{ut.name}</SelectItem>)}</SelectContent>
                </Select>
                {onOpenUnitTypeManagement && (
                  <Button type="button" variant="outline" size="icon" onClick={onOpenUnitTypeManagement}><Plus className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Unit *</Label>
              <Select value={formData.unit} onValueChange={(v) => handleInputChange('unit', v)} disabled={!formData.unitType && !formData.unit}>
                <SelectTrigger className={`mt-1 ${errors.unit ? 'border-red-500' : ''}`}><SelectValue placeholder={formData.unitType ? 'Select' : 'Select Unit Type first'} /></SelectTrigger>
                <SelectContent>{availableUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pricing & Tax Information</h3>
            {formData.costSource !== 'Manual' ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-4">
                Auto-calculated from {formData.costSource === 'BOM' ? 'Bill of Materials (built cost)' : 'the latest Purchase price'}
                {formData.costResolvedAt ? ` as of ${new Date(formData.costResolvedAt).toLocaleString()}` : ''}.
                {' '}Formula: MRP = Cost + Profit%, Sale Price = Cost − Discount% (set in Company → My Company).
              </p>
            ) : formData.costResolutionIssue ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                Not yet auto-calculated: {formData.costResolutionIssue}. Manual values below are being used until this is resolved.
              </p>
            ) : (formData.internalManufacturing || formData.purchase) ? (
              <p className="text-xs text-gray-500 mb-4">
                These values are R&D's manual estimate. Once this item is actually built (manufacturing) or purchased, Sale Price and MRP will be calculated automatically.
              </p>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div><Label className="text-sm font-medium text-gray-700">Standard Cost</Label><Input type="number" disabled={formData.costSource === 'BOM'} value={formData.stdCost} onChange={(e) => handleInputChange('stdCost', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Purchase Cost</Label><Input type="number" disabled={formData.costSource === 'Purchase'} value={formData.purchaseCost} onChange={(e) => handleInputChange('purchaseCost', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Sale Price</Label><Input type="number" disabled={formData.costSource !== 'Manual'} value={formData.salePrice} onChange={(e) => handleInputChange('salePrice', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">MRP</Label><Input type="number" disabled={formData.costSource !== 'Manual'} value={formData.mrp} onChange={(e) => handleInputChange('mrp', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">GST (%)</Label><Input type="number" value={formData.gst} onChange={(e) => handleInputChange('gst', e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm font-medium text-gray-700">HSN Code</Label><Input value={formData.hsn} onChange={(e) => handleInputChange('hsn', e.target.value)} className="mt-1 bg-white" /></div>
            </div>
          </div>

          {/* ── Stock Sourcing Rules ──────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock & Sourcing Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div><Label className="text-sm font-medium text-gray-700">Available Stock</Label><Input type="number" value={formData.qty} onChange={(e) => handleInputChange('qty', e.target.value)} className="mt-1 bg-white" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Min Stock</Label><Input type="number" value={formData.minStock} onChange={(e) => handleInputChange('minStock', e.target.value)} className="mt-1 bg-white" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Qty / Batch</Label><Input value={formData.batch} onChange={(e) => handleInputChange('batch', e.target.value)} placeholder="e.g. 400g" className="mt-1 bg-white" /></div>
              <div><Label className="text-sm font-medium text-gray-700">Lead Time (Days)</Label><Input type="number" value={formData.leadTime} onChange={(e) => handleInputChange('leadTime', e.target.value)} className="mt-1 bg-white" /></div>
            </div>

            <RadioGroup
              value={formData.purchase ? 'purchase' : formData.internalManufacturing ? 'internalManufacturing' : ''}
              onValueChange={(v) => {
                handleInputChange('purchase', v === 'purchase');
                handleInputChange('internalManufacturing', v === 'internalManufacturing');
              }}
              className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-md mb-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="purchase" id="purchase" />
                <Label htmlFor="purchase" className="text-sm font-medium text-gray-700">Purchasable (Vendor)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="internalManufacturing" id="internalManufacturing" />
                <Label htmlFor="internalManufacturing" className="text-sm font-medium text-gray-700">Internal Manufacturing</Label>
              </div>
            </RadioGroup>

            {formData.purchase && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-blue-50/20 border border-blue-100 rounded-md">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Purchase Unit Type *</Label>
                  <Select value={formData.purchaseUnitType} onValueChange={(v) => { handleInputChange('purchaseUnitType', v); handleInputChange('purchaseUnit', ''); }}>
                    <SelectTrigger className={`mt-1 bg-white ${errors.purchaseUnitType ? 'border-red-500' : ''}`}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{unitTypes.map((ut) => <SelectItem key={ut._id} value={ut.name}>{ut.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.purchaseUnitType && <p className="text-red-500 text-xs mt-1">{errors.purchaseUnitType}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Purchase Unit *</Label>
                  <Select value={formData.purchaseUnit} onValueChange={(v) => handleInputChange('purchaseUnit', v)} disabled={!formData.purchaseUnitType}>
                    <SelectTrigger className={`mt-1 bg-white ${errors.purchaseUnit ? 'border-red-500' : ''}`}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{availablePurchaseUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.purchaseUnit && <p className="text-red-500 text-xs mt-1">{errors.purchaseUnit}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? 'Update Master Item' : 'Create Master Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}