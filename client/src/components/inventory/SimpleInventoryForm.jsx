import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Loader2, Package, Plus, Layers,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UNIT_TYPES, getUnitTypeForUnit, getUnitsForType } from '@/utils/unitTypes';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import FabricationItemPicker from './FabricationItemPicker';

const DIMENSION_UNITS = ['Inch', 'MM', 'Feet', 'Meter'];
const DIMENSION_FIELDS = [
  ['length', 'Length'], ['height', 'Height'], ['width', 'Width'],
  ['diaOD', 'Dia (OD)'], ['diaID', 'Dia (ID)'], ['thickness', 'Thickness'],
];
// The one Item Process Type value with special behavior — opens the
// Fabrication Master picker and switches field 15 (Size/Dimension) to show
// the picked item's dimension variants instead of the fixed 6-field grid.
const FABRICATION_PROCESS_TYPE = 'Fabrication Item';

export default function SimpleInventoryForm({
  isOpen, onClose, item = null, categories = [], unitTypes = [], onSubmit, isLoading = false, onOpenCategoryManagement, onOpenUnitTypeManagement
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  // Tracks a freshly-uploaded (this session) image URL that isn't attached to a
  // saved item yet — if the user replaces it or cancels the dialog, we discard it from disk
  // so it doesn't sit as an orphaned file. Cleared (without discarding) once the item saves.
  const [pendingImageUpload, setPendingImageUpload] = useState(null);

  const emptyForm = {
    name: '', code: '', description: '',
    // Record Type — not shown in this form (Product/Motor Master set it
    // themselves elsewhere); defaults silently to 'Material', the common case
    // for plain Inventory items created here.
    itemType: '', type: 'Material',
    // Item Process Type + Fabrication Master link — see FABRICATION_PROCESS_TYPE above.
    itemProcessType: '', fabricationRef: null, dimensionVariants: [],
    importance: 'Normal', unitType: '', unit: '', isDiscontinued: false,
    qty: 0, minStock: 0, batch: '', leadTime: 0,
    stdCost: 0, purchaseCost: 0, salePrice: 0, mrp: 0, gst: 0, hsn: '',
    // Auto-pricing bookkeeping (see itemPricingService.js) — 'Manual' until a
    // real BOM build or purchase invoice resolves a cost for this item
    costSource: 'Manual', costResolvedAt: null, costResolutionIssue: null,
    internalManufacturing: false, purchase: true, purchaseUnitType: '', purchaseUnit: '', internalNotes: '', image: '',
    // Optional Product Master attributes — auto-filled when Item Code matches, editable after
    brand: '', metrology: '', materialGrade: '', modelNumber: '', size: '', unitWeightValue: '', unitWeightUnitType: '', unitWeightUnit: '',
    specifications: [], applications: [],
    // Inventory's own new classification fields — see InventoryMasterOption.js
    itemCategories: [], sourceType: '', itemSourceType: '',
    dimensions: {
      length: { value: '', unit: '' }, height: { value: '', unit: '' }, width: { value: '', unit: '' },
      diaOD: { value: '', unit: '' }, diaID: { value: '', unit: '' }, thickness: { value: '', unit: '' },
    },
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

  const availableWeightUnits = React.useMemo(() => {
    if (!formData.unitWeightUnitType) return [];
    const ut = unitTypes.find(u => u.name === formData.unitWeightUnitType);
    const units = ut?.units || [];
    return formData.unitWeightUnit && !units.includes(formData.unitWeightUnit) ? [formData.unitWeightUnit, ...units] : units;
  }, [formData.unitWeightUnitType, formData.unitWeightUnit, unitTypes]);

  // ── Dynamic dropdown values ──────────────────────────────────────────────
  // ItemCategory/SourceType/ItemSourceType are Inventory's own
  // ("+"-addable) lists — see InventoryMasterOption.js. Metrology/Material
  // Grade reuse the SAME shared lists Product Master's dropdowns read from
  // (RDMasterOption, unscoped) since these are universal specs, not
  // per-module ones — kept in sync rather than duplicated.
  const qc = useQueryClient();
  const { data: invOptionsResponse } = useQuery({
    queryKey: ['inventory-master-options'],
    queryFn: () => apiRequest('GET', '/api/inventory/master-options'),
  });
  const invMasterOptions = invOptionsResponse?.data || {};
  const { data: rdOptionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const rdMasterOptions = rdOptionsResponse?.data || {};

  const [newOptionModal, setNewOptionModal] = useState({ open: false, scope: '', field: '', value: '' });

  const addInvOptionMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/inventory/master-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-master-options'] }),
  });
  const addRdOptionMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/master-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });

  const INV_FIELD_KEY_MAP = { SourceType: 'sourceType', ItemSourceType: 'itemSourceType', ItemType: 'itemType', ItemProcessType: 'itemProcessType' };
  const RD_FIELD_KEY_MAP = { Metrology: 'metrology', MaterialGrade: 'materialGrade' };

  const handleAddOption = async () => {
    if (!newOptionModal.value.trim()) return;
    try {
      if (newOptionModal.scope === 'inventory') {
        await addInvOptionMutation.mutateAsync({ field: newOptionModal.field, value: newOptionModal.value.trim() });
        if (newOptionModal.field === 'ItemCategory') {
          handleInputChange('itemCategories', [...formData.itemCategories, newOptionModal.value.trim()]);
        } else {
          handleInputChange(INV_FIELD_KEY_MAP[newOptionModal.field], newOptionModal.value.trim());
        }
      } else {
        await addRdOptionMutation.mutateAsync({ field: newOptionModal.field, value: newOptionModal.value.trim() });
        handleInputChange(RD_FIELD_KEY_MAP[newOptionModal.field], newOptionModal.value.trim());
      }
      setNewOptionModal({ open: false, scope: '', field: '', value: '' });
      toast({ title: 'Option Added', description: 'New option added successfully' });
    } catch (e) {
      toast({ title: 'Failed to add option', description: e?.message || '', variant: 'destructive' });
    }
  };

  // Item Code suggestion: initials of Name words + digits from Name (e.g.
  // "Sheet 8x16" -> "S816"). Only fills the field — never overwrites what's
  // already typed, and R&D can always edit it before saving.
  const suggestItemCode = () => {
    const initials = (formData.name || '').trim().split(/\s+/).filter(Boolean)
      .map(w => /^[a-zA-Z]/.test(w) ? w[0].toUpperCase() : '').join('');
    const digits = (formData.name || '').replace(/[^0-9]/g, '');
    const suggestion = `${initials}${digits}`;
    if (suggestion) handleInputChange('code', suggestion);
  };

  const [fabricationPickerOpen, setFabricationPickerOpen] = useState(false);

  // Item Process Type change — "Fabrication Item" opens the picker; any
  // other value (or clearing it) drops a previously-picked Fabrication link
  // so field 15 reverts to the normal fixed dimension grid.
  const handleItemProcessTypeChange = (value) => {
    handleInputChange('itemProcessType', value);
    if (value === FABRICATION_PROCESS_TYPE) {
      setFabricationPickerOpen(true);
    } else {
      setFormData(prev => ({ ...prev, fabricationRef: null, dimensionVariants: [] }));
    }
  };

  // Autofills Item Name/Code and the dimension variants (with weight, each
  // starting at subStock: 0 — real stock only arrives later via Purchase)
  // from the selected Fabrication Master catalog entry.
  const handleFabricationSelect = (fabItem) => {
    setFormData(prev => ({
      ...prev,
      name: fabItem.itemName || prev.name,
      code: fabItem.itemCode || prev.code,
      fabricationRef: fabItem._id,
      dimensionVariants: (fabItem.dimensions || []).map(d => ({
        category: fabItem.category,
        values: d.values || {},
        designation: d.designation || '',
        densityValue: fabItem.density?.value ?? null,
        densityUnit: fabItem.density?.unit || 'kg/m3',
        weightPerMeterKg: d.weightPerMeterKg ?? null,
        weightPerPieceKg: d.weightPerPieceKg ?? null,
        subStock: 0,
      })),
    }));
    setFabricationPickerOpen(false);
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
        isDiscontinued: Boolean(item.isDiscontinued),
        costSource: item.costSource || 'Manual',
        costResolvedAt: item.costResolvedAt || null,
        costResolutionIssue: item.costResolutionIssue || null,
        specifications: Array.isArray(item.specifications) ? item.specifications : [],
        applications: Array.isArray(item.applications) ? item.applications : [],
        itemCategories: Array.isArray(item.itemCategories) ? item.itemCategories : [],
        itemProcessType: item.itemProcessType || '',
        fabricationRef: item.fabricationRef || null,
        dimensionVariants: Array.isArray(item.dimensionVariants) ? item.dimensionVariants : [],
        dimensions: {
          length: { value: item.dimensions?.length?.value ?? '', unit: item.dimensions?.length?.unit || '' },
          height: { value: item.dimensions?.height?.value ?? '', unit: item.dimensions?.height?.unit || '' },
          width: { value: item.dimensions?.width?.value ?? '', unit: item.dimensions?.width?.unit || '' },
          diaOD: { value: item.dimensions?.diaOD?.value ?? '', unit: item.dimensions?.diaOD?.unit || '' },
          diaID: { value: item.dimensions?.diaID?.value ?? '', unit: item.dimensions?.diaID?.unit || '' },
          thickness: { value: item.dimensions?.thickness?.value ?? '', unit: item.dimensions?.thickness?.unit || '' },
        },
        warranty: item.warranty || { period: 12, type: 'Comprehensive', terms: '' }
      });
      setErrors({});
      setImagePreview(item.image || null);
      setPendingImageUpload(null);
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
    setPendingImageUpload(null);
  };

  // Best-effort cleanup of this session's not-yet-saved uploads (dialog cancelled/closed).
  const discardPendingMedia = () => {
    if (pendingImageUpload) {
      apiRequest('POST', '/api/items/media/delete', { url: pendingImageUpload }).catch(() => {});
    }
  };

  const handleCancel = () => {
    discardPendingMedia();
    onClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
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

  const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const validationErrors = {};
      if (!formData.name.trim()) validationErrors.name = 'Item name is required';
      if (!formData.code || !formData.code.trim()) validationErrors.code = 'Item Code is mandatory (R&D defined).';
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
        itemCategories: formData.itemCategories.filter(c => c?.trim() !== ''),
        dimensions: Object.fromEntries(DIMENSION_FIELDS.map(([key]) => [key, {
          value: formData.dimensions[key].value !== '' ? Number(formData.dimensions[key].value) : null,
          unit: formData.dimensions[key].unit || '',
        }])),
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
    <>
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

          {/* ── 1-6: Item Identification ─────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">1. Item Type</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.itemType} onValueChange={(v) => handleInputChange('itemType', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="e.g. Raw Material, Tool, Readymade Material, Assets" /></SelectTrigger>
                    <SelectContent>{(invMasterOptions.ItemType || []).map(o => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'inventory', field: 'ItemType', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">2. Item Process Type</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.itemProcessType} onValueChange={handleItemProcessTypeChange}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="e.g. Fabrication Item" /></SelectTrigger>
                    <SelectContent>
                      {[FABRICATION_PROCESS_TYPE, ...(invMasterOptions.ItemProcessType || []).map(o => o.value).filter(v => v !== FABRICATION_PROCESS_TYPE)].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'inventory', field: 'ItemProcessType', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
                {formData.itemProcessType === FABRICATION_PROCESS_TYPE && (
                  <div className="mt-2 flex items-center justify-between gap-2 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                    <span className="text-xs text-blue-700 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {formData.fabricationRef ? `Linked: ${formData.name || 'Fabrication item'}` : 'No fabrication item selected yet'}
                    </span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs bg-white" onClick={() => setFabricationPickerOpen(true)}>
                      {formData.fabricationRef ? 'Change' : 'Select'}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">3. Item Name *</Label>
                <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Enter item name" className={`mt-1 bg-white ${errors.name ? 'border-red-500' : ''}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">4. Item Code (ERP) * <span className="text-xs font-normal text-amber-600">(R&D must define)</span></Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="e.g. MAT-001"
                    className={`font-mono bg-white pr-8 flex-1 ${errors.code ? 'border-red-500' : ''}`}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={suggestItemCode} title="Suggest a code from Item Name">Generate</Button>
                </div>
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">5. Model Number</Label>
                <Input value={formData.modelNumber} onChange={(e) => handleInputChange('modelNumber', e.target.value)} placeholder="e.g. 6600, 4320" className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">6. Brand Name</Label>
                <Input value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)} placeholder="e.g. Bosch" className="mt-1 bg-white" />
              </div>
            </div>
          </div>

          {/* ── 6-8: Classification ───────────────────────────────────────── */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">7. Item Category</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewOptionModal({ open: true, scope: 'inventory', field: 'ItemCategory', value: '' })} className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3 mr-1" /> Add New
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(invMasterOptions.ItemCategory || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No item categories yet — click "Add New" to create one.</p>
                ) : invMasterOptions.ItemCategory.map(o => {
                  const selected = formData.itemCategories.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => handleInputChange('itemCategories', selected
                        ? formData.itemCategories.filter(c => c !== o.value)
                        : [...formData.itemCategories, o.value])}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    >
                      {o.value}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">8. Source Type</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.sourceType} onValueChange={(v) => handleInputChange('sourceType', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(invMasterOptions.SourceType || []).map(o => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'inventory', field: 'SourceType', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">9. Item Source Type</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.itemSourceType} onValueChange={(v) => handleInputChange('itemSourceType', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(invMasterOptions.ItemSourceType || []).map(o => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'inventory', field: 'ItemSourceType', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 9-11: Metrology / Material Grade / Unit Weight ──────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">10. Metrology</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.metrology} onValueChange={(v) => handleInputChange('metrology', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(rdMasterOptions.Metrology || []).map(o => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'rd', field: 'Metrology', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">11. Material Grade</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={formData.materialGrade} onValueChange={(v) => handleInputChange('materialGrade', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(rdMasterOptions.MaterialGrade || []).map(o => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setNewOptionModal({ open: true, scope: 'rd', field: 'MaterialGrade', value: '' })}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            {formData.itemProcessType !== FABRICATION_PROCESS_TYPE && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">12. Unit Weight</Label>
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
            )}
          </div>

          {/* ── 12: Purchase Unit (incl. the Purchasable/Internal Manufacturing choice) ── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">13. Purchase Unit</h3>
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

          {/* ── 13: Used Unit (Inventory's storage/entry unit — was labelled
              "Unit Type"/"Unit") ─────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">14. Used Unit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Used Unit Type *</Label>
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
                <Label className="text-sm font-medium text-gray-700">Used Unit *</Label>
                <Select value={formData.unit} onValueChange={(v) => handleInputChange('unit', v)} disabled={!formData.unitType && !formData.unit}>
                  <SelectTrigger className={`mt-1 ${errors.unit ? 'border-red-500' : ''}`}><SelectValue placeholder={formData.unitType ? 'Select' : 'Select Used Unit Type first'} /></SelectTrigger>
                  <SelectContent>{availableUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── 15: Size / Dimension ─────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">15. Size / Dimension</Label>
            {formData.dimensionVariants.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  From Fabrication Master
                  {(() => {
                    const dv = formData.dimensionVariants[0];
                    return dv?.densityValue != null ? ` · Density: ${dv.densityValue} ${dv.densityUnit === 'g/cm3' ? 'g/cm³' : 'kg/m³'}` : '';
                  })()}
                </p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                  {formData.dimensionVariants.map((dv, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-700">
                        {dv.designation || Object.entries(dv.values || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800">{dv.weightPerPieceKg != null ? `${Number(dv.weightPerPieceKg).toFixed(2)} kg` : '—'}</span>
                        <span className="text-gray-400">Sub Stock: {dv.subStock ?? 0}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DIMENSION_FIELDS.map(([key, label]) => (
                  <div key={key} className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] text-gray-500 uppercase">{label}</Label>
                      <Input
                        type="number" min="0" className="mt-1 bg-white" placeholder="0"
                        value={formData.dimensions[key].value}
                        onChange={(e) => handleInputChange('dimensions', { ...formData.dimensions, [key]: { ...formData.dimensions[key], value: e.target.value } })}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-[10px] text-gray-500 uppercase">Unit</Label>
                      <Select
                        value={formData.dimensions[key].unit}
                        onValueChange={(v) => handleInputChange('dimensions', { ...formData.dimensions, [key]: { ...formData.dimensions[key], unit: v } })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{DIMENSION_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 16-17: Item Status & Description ──────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">16. Item Status</Label>
                <Select value={formData.isDiscontinued ? 'Discontinue' : 'Continue'} onValueChange={(v) => handleInputChange('isDiscontinued', v === 'Discontinue')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Continue">Continue</SelectItem>
                    <SelectItem value="Discontinue">Discontinue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700">17. Description</Label>
              <Textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Enter item description" rows={2} className="mt-1 bg-white" />
            </div>
          </div>

          {/* ── 17: Image Upload ─────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">18. Image Upload</h3>
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

    {/* Add New Master Option (Item Category / Source Type / Item Source Type / Metrology / Material Grade) */}
    <Dialog open={newOptionModal.open} onOpenChange={(open) => !open && setNewOptionModal({ open: false, scope: '', field: '', value: '' })}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Add New {({ ItemCategory: 'Item Category', SourceType: 'Source Type', ItemSourceType: 'Item Source Type', ItemType: 'Item Type', ItemProcessType: 'Item Process Type', Metrology: 'Metrology', MaterialGrade: 'Material Grade' })[newOptionModal.field] || newOptionModal.field}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Value *</Label>
          <Input autoFocus value={newOptionModal.value} onChange={(e) => setNewOptionModal(prev => ({ ...prev, value: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && handleAddOption()} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setNewOptionModal({ open: false, scope: '', field: '', value: '' })}>Cancel</Button>
          <Button onClick={handleAddOption} disabled={!newOptionModal.value.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
        </div>
      </DialogContent>
    </Dialog>

    <FabricationItemPicker
      open={fabricationPickerOpen}
      onClose={() => setFabricationPickerOpen(false)}
      onSelect={handleFabricationSelect}
    />
    </>
  );
}