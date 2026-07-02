import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Download,
  Send,
  FileText,
  Printer,
  ChevronRight,
  Package,
  ShoppingCart,
  Users,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from "@/hooks/use-toast";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Dummy Products Data
// Helper to convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return 'Large Amount';
  };

  if (num === 0) return 'Zero';
  return convert(Math.floor(num)) + ' Only';
};

const Quotation = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams(window.location.search);
  const leadId = queryParams.get('lead_id');

  const [step, setStep] = useState('select_type'); // select_type, product_selection, builder, preview, price_list_selection, price_list_preview
  const [quotationType, setQuotationType] = useState('Customer'); // Price List, Dealer, Customer, PI
  const [selectedItems, setSelectedItems] = useState([]);

  // Additional Charges state
  const [additionalCharges, setAdditionalCharges] = useState([]); // [{id, name, price, gst}]
  const [showChargesPicker, setShowChargesPicker] = useState(false);
  const [chargePickerChecked, setChargePickerChecked] = useState({});

  // Item name/description inline editing
  const [editingItemField, setEditingItemField] = useState(null); // {id, field} or null

  const getImageUrl = (path) => {
    if (!path || path.trim() === '') return null; // no image
    if (path.startsWith('data:')) return path;   // base64 image — use as-is
    if (path.startsWith('http')) return path;     // absolute URL — use as-is
    // relative server path — prepend backend base URL
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    return `${baseUrl}${path}`;
  };
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [buyerType, setBuyerType] = useState('Customer'); // Dealer or Customer
  const [selectedPriceListCategory, setSelectedPriceListCategory] = useState(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // ─── Terms & Conditions state ────────────────────────────────
  // Fetch dynamic quotation settings
  const { data: adminSettingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/admin-settings/`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const dynTerms = adminSettingsData?.settings?.termsAndConditions;
  const dynCharges = adminSettingsData?.settings?.additionalCharges;
  const dynNotes = adminSettingsData?.settings?.quotationNotes;

  const ALL_TERMS = (dynTerms && dynTerms.length > 0)
    ? dynTerms.map((t, i) => ({ id: t._id || i + 1, heading: t.heading, text: t.text }))
    : [
    { id: 1, heading: 'Jurisdiction', text: 'All disputes will be settled under Ghaziabad, Uttar Pradesh jurisdiction only.' },
    { id: 2, heading: 'Prices & Packing', text: 'All prices are Ex-Works Ghaziabad, excluding packing, transport, insurance, and taxes (charged at actuals)' },
    { id: 3, heading: 'Validity', text: 'Quotation valid for 30 days from the issue date. Prices may change thereafter.' },
    { id: 4, heading: 'Payment Terms', text: '50% advance with order and balance before dispatch (or 100% advance under bank terms). Delayed payment attracts 30% yearly interest and voids warranty.' },
    { id: 5, heading: 'Order Confirmation & Cancellation', text: 'Advance payment confirms acceptance of all terms. In case of cancellation, the advance is non-refundable.' },
    { id: 6, heading: 'Delivery', text: 'Normal delivery time is 25–30 working days, depending on design and workload.' },
    { id: 7, heading: 'Warranty', text: 'OEM warranty applies to bought-out parts (motors, sensors, drives, etc.). Wear-and-tear or mishandling is not covered.' },
    { id: 8, heading: 'Product & Packaging', text: "Customer must share product and packing details. If delayed, SAMTEK may arrange the same at customer's cost." },
    { id: 9, heading: 'Dispatch & Clearance', text: "Dispatch only after full payment. If goods aren't collected within 10 days, SAMTEK may return them at buyer's cost." },
    { id: 10, heading: 'Inspection', text: "Inspection allowed at factory with 15 days' prior notice. Third-party inspection charges are borne by the customer." },
    { id: 11, heading: 'Installation & Commissioning', text: '1. Engineer will be deputed after receiving written confirmation from the customer. 2. All travel, lodging, boarding, and local conveyance expenses shall be borne by the customer.' },
    { id: 12, heading: 'Transit & Short Shipment', text: 'Customer must insure goods before dispatch. SAMTEK is not liable for transit loss.' },
    { id: 13, heading: 'Not In Our Scope Of Supply', text: 'Civil and foundation work required for machine installation is not included.' },
  ];

  const ALL_SERVICE_CHARGES = (dynCharges && dynCharges.length > 0)
    ? dynCharges.map(c => ({ id: c._id || c.name.toLowerCase().replace(/\s+/g, '_'), name: c.name, price: c.price || 0, gst: c.gst || 18 }))
    : [
    { id: 'installation', name: 'Installation Charges', price: 10000, gst: 18 },
    { id: 'freight',      name: 'Freight Charges',      price: 3000,  gst: 18 },
    { id: 'storage10',   name: 'STORAGE TANK 10 TON',  price: 0,     gst: 18 },
    { id: 'storage5',    name: 'STORAGE TANK 05 TON',  price: 160000, gst: 18 },
    { id: 'amc',         name: 'AMC Charges',           price: 5000,  gst: 18 },
    { id: 'training',    name: 'Training Charges',      price: 2000,  gst: 18 },
  ];

  const ALL_ADDITIONAL_NOTES = (dynNotes && dynNotes.length > 0)
    ? dynNotes.map(n => n.text)
    : [
    'The Semi-Skill and Unskilled Manpower, Along With Material Handling Equipment, Required For The Installation Of The Complete Plant.',
    'The Civil & Foundation Work Required For Installation of The Machine.',
    'Installation Charges Are Extra',
    'Tools Will be Provided By The Customer.',
    'Logging & Boarding Facilities Are To Be Provided By The Customer.',
  ];

  // Selected T&C: array of { id, heading, text } (user can add custom ones too)
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [showTermsPicker, setShowTermsPicker] = useState(false);
  const [termPickerChecked, setTermPickerChecked] = useState({});

  // Selected Additional Notes: array of strings
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showNotesPicker, setShowNotesPicker] = useState(false);
  const [notePickerChecked, setNotePickerChecked] = useState({});
  const [newProduct, setNewProduct] = useState({
    name: '',
    variant: '',
    code: '',
    group: '',
    category: '',
    subCategory: '',
    unit: '',
    salePrice: '',
    dealerPrice: '',
    hsn: '',
    gst: '18',
    currency: 'INR',
    unitType: 'Nos',
    description: '',
    uses: '',
    otherInfo: '',
    minOrderQty: '1',
    specifications: [{ key: '', value: '' }]
  });

  // Fetch Real Items for Price List (Dynamic Data)
  const { data: priceListResponse, isLoading: priceListLoading } = useQuery({
    queryKey: ['price-list-items'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/sales/items?limit=1000&type=Product`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    }
  });

  // Transform items data for price list
  const PRICE_LIST_DATA = (priceListResponse?.items || []).map((item, index) => ({
    id: item._id,
    category: item.name,
    code: item.code,
    price: buyerType === 'Dealer' ? (item.dealerPrice || item.salePrice) : item.salePrice,
    unit: item.unit || 1,
    description: item.description || '',
    features: item.applications || [],
    products: (item.variants && item.variants.length > 0) ? item.variants.map(variant => ({
      ...variant,
      price: buyerType === 'Dealer' ? (variant.dealerPrice || variant.price) : variant.price
    })) : [
      { 
        Capacity: item.name, 
        price: buyerType === 'Dealer' ? (item.dealerPrice || item.salePrice) : item.salePrice 
      }
    ],
    image: item.image,
    specifications: item.specifications || []
  }));

  const pdfRef = useRef();

  // Fetch Lead Data
  const { data: leadResponse } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: !!leadId,
    staleTime: 0,          // always fetch fresh — lead data may be updated between visits
    refetchOnMount: true,
  });

  const leadData = leadResponse?.lead;

  // Fetch the user's company to get the stamp URL
  const { data: companyResponse } = useQuery({
    queryKey: ['my-company'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const companyId = user?.companyId || user?.company?._id;
      if (!companyId) return null;
      const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/super-admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 10
  });

  const companyStampUrl = companyResponse?.company?.stampUrl
    ? `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${companyResponse.company.stampUrl}`
    : null;

  // ─── Logged-in salesman data (for Thanks & Regards) ─────────
  const loggedInUser = (() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch { return null; }
  })();

  // Company data from API (for dynamic header details)
  const companyData = companyResponse?.company || {};
  const companyGst = companyData.gst || '';
  const companyMobile = companyData.mobile || '';
  const companyEmail = companyData.email || '';
  const companyWebsite = companyData.website || '';
  const companyName = companyData.name || companyData.unitName || 'Samtek Machinery';

  // ─── localStorage key for this lead's quotation state ────────
  const quotationStateKey = leadId ? `quotation_state_${leadId}` : null;

  // Restore saved quotation state immediately on mount (Update Quotation flow)
  // Runs once when component mounts — if saved state exists, restore and skip select_type
  useEffect(() => {
    if (!quotationStateKey) return;
    try {
      const saved = localStorage.getItem(quotationStateKey);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (!state.selectedItems?.length) return; // nothing useful saved
      setSelectedItems(state.selectedItems);
      if (state.quotationType) setQuotationType(state.quotationType);
      if (state.selectedTerms?.length) setSelectedTerms(state.selectedTerms);
      if (state.selectedNotes?.length) setSelectedNotes(state.selectedNotes);
      if (state.additionalCharges?.length) setAdditionalCharges(state.additionalCharges);
      // Jump straight to product selection — skip "Select Type" screen
      setStep('product_selection');
    } catch (e) { /* ignore */ }
  }, []); // intentionally empty — run only once on mount

  // Fetch Real Items from Sales-specific endpoint
  const { data: itemsResponse, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['sales-items'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/sales/items?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    }
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Append all fields to FormData
      Object.keys(newProduct).forEach(key => {
        if (key === 'specifications') {
          formData.append(key, JSON.stringify(newProduct[key]));
        } else if (key === 'photo' || key === 'brochure') {
          if (newProduct[key]) {
            formData.append(key === 'photo' ? 'image' : 'brochure', newProduct[key]);
          }
        } else {
          formData.append(key, newProduct[key]);
        }
      });

      const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/sales/create-item`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        toast({ title: "Success", description: "Product added to inventory" });
        setIsAddProductModalOpen(false);
        refetchItems();
        // Reset form
        setNewProduct({
          name: '',
          variant: '',
          code: '',
          group: '',
          category: '',
          subCategory: '',
          unit: '',
          salePrice: '',
          dealerPrice: '',
          hsn: '',
          gst: '18',
          currency: 'INR',
          unitType: 'Nos',
          description: '',
          uses: '',
          otherInfo: '',
          minOrderQty: '1',
          specifications: [{ key: '', value: '' }],
          photo: null,
          brochure: null
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add product",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAddProductModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddProductModalOpen]);

  const photoInputRef = useRef(null);
  const brochureInputRef = useRef(null);

  const renderAddProductModal = () => {
    if (!isAddProductModalOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[50] overflow-hidden flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 transition-opacity"
          onClick={() => setIsAddProductModalOpen(false)}
        />

        {/* Modal Content */}
        <div
          className="relative bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh] z-[51]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 flex justify-between items-center border-b bg-gray-50 flex-shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Package className="h-5 w-5 text-orange-600" /> Add A New Product
            </h2>
            <button onClick={() => setIsAddProductModalOpen(false)} className="hover:bg-gray-200 p-1 rounded-full transition-colors text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleAddProduct} className="p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Details */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Select Group *</Label>
                <Select
                  value={newProduct.group}
                  onValueChange={(v) => setNewProduct({ ...newProduct, group: v })}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="--Select Group--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLOUR MILL PLANT">FLOUR MILL PLANT</SelectItem>
                    <SelectItem value="GRAIN PROCESSING">GRAIN PROCESSING</SelectItem>
                    <SelectItem value="OIL EXTRACTION">OIL EXTRACTION</SelectItem>
                    <SelectItem value="PACKAGING MACHINERY">PACKAGING MACHINERY</SelectItem>
                    <SelectItem value="SPARE PARTS">SPARE PARTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Select Category *</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="--Select Category--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Automatic Flour Mill">Automatic Flour Mill</SelectItem>
                    <SelectItem value="Pulverizer Machine">Pulverizer Machine</SelectItem>
                    <SelectItem value="Stone Crusher">Stone Crusher</SelectItem>
                    <SelectItem value="Seed Cleaner">Seed Cleaner</SelectItem>
                    <SelectItem value="Gravity Separator">Gravity Separator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Select Sub Category</Label>
                <Select
                  value={newProduct.subCategory}
                  onValueChange={(v) => setNewProduct({ ...newProduct, subCategory: v })}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="--Select Sub Category--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mini Plant">Mini Plant</SelectItem>
                    <SelectItem value="Commercial Grade">Commercial Grade</SelectItem>
                    <SelectItem value="Industrial Heavy Duty">Industrial Heavy Duty</SelectItem>
                    <SelectItem value="Portable Unit">Portable Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Product Name *</Label>
                <Input
                  placeholder="Enter Product Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="border-gray-300 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Product Varient</Label>
                <Input
                  placeholder="Enter Product Varient"
                  value={newProduct.variant}
                  onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Product Code *</Label>
                <Input
                  placeholder="Product Code"
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">HSN/ SAC Code *</Label>
                <Input
                  placeholder="HSN/ SAC Code"
                  value={newProduct.hsn}
                  onChange={(e) => setNewProduct({ ...newProduct, hsn: e.target.value })}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">GST% *</Label>
                <Input
                  type="number"
                  placeholder="GST"
                  value={newProduct.gst}
                  onChange={(e) => setNewProduct({ ...newProduct, gst: e.target.value })}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Selling Price *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g:100000"
                    value={newProduct.salePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                    className="border-gray-300 flex-1"
                    required
                  />
                  <Select
                    value={newProduct.currency}
                    onValueChange={(v) => setNewProduct({ ...newProduct, currency: v })}
                  >
                    <SelectTrigger className="border-gray-300 w-32">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Dealer Selling Price *</Label>
                <Input
                  type="number"
                  placeholder="e.g:100000"
                  value={newProduct.dealerPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, dealerPrice: e.target.value })}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Unit *</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g:1"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="border-gray-300 flex-1"
                    required
                  />
                  <Select
                    value={newProduct.unitType}
                    onValueChange={(v) => setNewProduct({ ...newProduct, unitType: v })}
                  >
                    <SelectTrigger className="border-gray-300 w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nos">Nos</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Pieces">Pieces</SelectItem>
                      <SelectItem value="Set">Set</SelectItem>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Unit">Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Min. Order Quantity *</Label>
                <Input
                  type="number"
                  placeholder="Order Quantity"
                  value={newProduct.minOrderQty}
                  onChange={(e) => setNewProduct({ ...newProduct, minOrderQty: e.target.value })}
                  className="border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Product Video Link</Label>
                <Input
                  placeholder="Product Video Link"
                  value={newProduct.videoUrl || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, videoUrl: e.target.value })}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Add Product Photo</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={photoInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setNewProduct({ ...newProduct, photo: file });
                    }
                  }}
                />
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors h-[80px]"
                  onClick={() => photoInputRef.current.click()}
                >
                  {newProduct.photo ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-xs font-medium text-gray-700">{newProduct.photo.name.substring(0, 15)}...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Add Product Brochure</Label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  ref={brochureInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setNewProduct({ ...newProduct, brochure: file });
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${newProduct.brochure ? 'bg-green-500 hover:bg-green-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white border-none h-[80px]`}
                  onClick={() => brochureInputRef.current.click()}
                >
                  {newProduct.brochure ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-6 w-6 mb-1" />
                      <span>Brochure Added</span>
                    </div>
                  ) : (
                    "Add PDF Brochure"
                  )}
                </Button>
              </div>
            </div>

            {/* Full Width Fields */}
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Description *</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Enter description..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-400">Note: Use ", " (comma and space) to insert a new line.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Product Uses *</Label>
                  <textarea
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Enter Product Uses..."
                    value={newProduct.uses}
                    onChange={(e) => setNewProduct({ ...newProduct, uses: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Product Other Info *</Label>
                  <textarea
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Enter Product Other Info..."
                    value={newProduct.otherInfo}
                    onChange={(e) => setNewProduct({ ...newProduct, otherInfo: e.target.value })}
                  />
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-bold">Product Specifications</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    onClick={() => setNewProduct({
                      ...newProduct,
                      specifications: [...newProduct.specifications, { key: '', value: '' }]
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add More Specification
                  </Button>
                </div>

                {newProduct.specifications.map((spec, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-gray-500">Specification Key</Label>
                      <Input
                        placeholder="e.g. Motor Power"
                        value={spec.key}
                        onChange={(e) => {
                          const newSpecs = [...newProduct.specifications];
                          newSpecs[index].key = e.target.value;
                          setNewProduct({ ...newProduct, specifications: newSpecs });
                        }}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2 flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs font-medium uppercase text-gray-500">Specification Value</Label>
                        <Input
                          placeholder="e.g. 3 HP"
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...newProduct.specifications];
                            newSpecs[index].value = e.target.value;
                            setNewProduct({ ...newProduct, specifications: newSpecs });
                          }}
                          className="bg-white"
                        />
                      </div>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => {
                            const newSpecs = newProduct.specifications.filter((_, i) => i !== index);
                            setNewProduct({ ...newProduct, specifications: newSpecs });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4 border-t pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsAddProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 px-12 py-6 text-lg font-bold shadow-lg shadow-orange-200">
                Add Product
              </Button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  const productsList = itemsResponse?.items || [];
  const categories = [...new Set(productsList.map(p => p.category))];

  const handleAddItem = (product) => {
    // Toggle: if already selected, unselect it
    const existing = selectedItems.find(item => item.id === product._id);
    if (existing) {
      setSelectedItems(selectedItems.filter(item => item.id !== product._id));
      return;
    }
    setSelectedItems([...selectedItems, {
      ...product,
      id: product._id,
      price: buyerType === 'Dealer' ? (product.dealerPrice || product.salePrice || 0) : (product.salePrice || 0),
      quantity: 1,
      gst: 18
    }]);
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id, field, value) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const generatePDF = async () => {
    const element = pdfRef.current;
    toast({ title: "Generating PDF...", description: "Optimizing layout for multiple pages..." });
    try {
      // 1. Calculate dimensions
      const width = element.offsetWidth;
      const pageHeightPx = (width * 297) / 210; // A4 Ratio

      // 2. Identify sections and prevent splitting
      const sections = Array.from(element.querySelectorAll('.pdf-section'));
      const addedSpacers = [];

      // We need to re-calculate offsets after each spacer is added
      // So we use a simple loop and check positions relative to the container
      for (const section of sections) {
        const pdfRect = element.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();

        const elementTop = sectionRect.top - pdfRect.top;
        const elementBottom = elementTop + sectionRect.height;

        const pageOfTop = Math.floor(elementTop / pageHeightPx);
        const pageOfBottom = Math.floor((elementBottom - 1) / pageHeightPx); // -1 to handle exact boundaries

        if (pageOfTop !== pageOfBottom) {
          const spacerHeight = (pageOfTop + 1) * pageHeightPx - elementTop;
          let spacer;
          if (section.tagName.toLowerCase() === 'tr') {
            spacer = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = section.children.length || 10;
            td.style.height = `${spacerHeight}px`;
            spacer.appendChild(td);
          } else {
            spacer = document.createElement('div');
            spacer.style.height = `${spacerHeight}px`;
          }
          spacer.className = 'pdf-paging-spacer';
          section.parentNode.insertBefore(spacer, section);
          addedSpacers.push(spacer);
        }
      }

      // 3. Capture canvas (scale 1.5 = good quality, much smaller than scale 2)
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      // 4. Cleanup spacers immediately after capture
      addedSpacers.forEach(s => s.remove());

      // JPEG at 0.88 quality = sharp output, ~80% smaller than PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Quotation_${leadData?.leadCode || 'New'}.pdf`);
      // Save state for Update Quotation restore
      if (quotationStateKey) {
        localStorage.setItem(quotationStateKey, JSON.stringify({
          selectedItems,
          quotationType,
          selectedTerms,
          selectedNotes,
          additionalCharges
        }));
      }
      toast({ title: "Success", description: "PDF generated with intelligent page breaks." });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ title: "Error", description: "Failed to generate PDF properly.", variant: "destructive" });
    }
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmail = async () => {
    if (!leadData?.email) {
      toast({
        title: "Missing Email",
        description: "This lead does not have an email address assigned.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSendingEmail(true);
      toast({ title: "Processing...", description: "Optimizing layout and generating PDF" });

      const element = pdfRef.current;

      // Intelligent Paging Logic
      const width = element.offsetWidth;
      const pageHeightPx = (width * 297) / 210;
      const sections = Array.from(element.querySelectorAll('.pdf-section'));
      const addedSpacers = [];

      for (const section of sections) {
        const pdfRect = element.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();

        const elementTop = sectionRect.top - pdfRect.top;
        const elementBottom = elementTop + sectionRect.height;

        const pageOfTop = Math.floor(elementTop / pageHeightPx);
        const pageOfBottom = Math.floor((elementBottom - 1) / pageHeightPx);

        if (pageOfTop !== pageOfBottom) {
          const spacerHeight = (pageOfTop + 1) * pageHeightPx - elementTop;
          let spacer;
          if (section.tagName.toLowerCase() === 'tr') {
            spacer = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = section.children.length || 10;
            td.style.height = `${spacerHeight}px`;
            spacer.appendChild(td);
          } else {
            spacer = document.createElement('div');
            spacer.style.height = `${spacerHeight}px`;
          }
          spacer.className = 'pdf-paging-spacer';
          section.parentNode.insertBefore(spacer, section);
          addedSpacers.push(spacer);
        }
      }

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      // Cleanup spacers
      addedSpacers.forEach(s => s.remove());

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const pdfBase64 = pdf.output('datauristring');
      const token = localStorage.getItem('token');

      // Prepare recipient list (Main email + Alternate email)
      let recipients = leadData.email;
      if (leadData.alternateEmail) {
        recipients += `, ${leadData.alternateEmail}`;
      }

      toast({ title: "Sending Email...", description: `Sending quotation to ${recipients}` });
      const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/sales/send-quotation-email`, {
        to: recipients,
        customerName: leadData.contactPerson || leadData.companyName,
        leadCode: leadData.leadCode,
        attachmentBase64: pdfBase64,
        // Compute net amount (items + GST + additional charges, no GST on charges) — same formula as renderPreview
        quotationFinalAmount: (() => {
          const itemsSubTotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          const itemsGst = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.gst / 100)), 0);
          const chargesSubTotal = additionalCharges.reduce((acc, c) => acc + c.price, 0);
          return itemsSubTotal + itemsGst + chargesSubTotal;
        })()
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000 // 60 seconds timeout
      });

      if (res.data.success) {
        // Save quotation state for future "Update Quotation" restores
        if (quotationStateKey) {
          localStorage.setItem(quotationStateKey, JSON.stringify({
            selectedItems,
            quotationType,
            selectedTerms,
            selectedNotes,
            additionalCharges
          }));
        }
        toast({
          title: "Success!",
          description: `Quotation has been successfully sent to ${recipients}`,
          className: "bg-green-600 text-white"
        });
        // Invalidate lead queries to update the UI (button text etc)
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send email. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const renderSelectType = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Select Quotation Type</h1>
      <div className="flex flex-wrap justify-center gap-6">
        {[
          { name: 'Price List', color: 'bg-blue-50 text-blue-600 border-blue-200' },
          { name: 'Dealer Quotation', color: 'bg-gray-50 text-gray-600 border-gray-200' },
          { name: 'Customer Quotation', color: 'bg-green-50 text-green-600 border-green-200' },
          { name: 'PI', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' }
        ].map((type) => (
          <button
            key={type.name}
            onClick={() => {
              setQuotationType(type.name);
              if (type.name === 'Price List') {
                setStep('price_list_selection');
              } else {
                setStep('product_selection');
              }
            }}
            className={`w-48 h-24 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg font-bold text-lg flex items-center justify-center ${type.color}`}
          >
            {type.name}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPriceListSelection = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep('select_type')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg py-1 px-4">{quotationType}</Badge>
            {selectedPriceListCategory && (
              <Button onClick={() => setStep('price_list_preview')} className="bg-blue-600">
                Submit Quotation <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Select Product Category for Price List</CardTitle>
              <p className="text-sm text-blue-600 font-bold mt-1">
                Select one category to generate its full price list quotation
              </p>
            </div>
            <div className="flex items-center gap-8 bg-gray-50 px-4 py-2 rounded-lg border">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="dealer"
                  name="buyer_type"
                  checked={buyerType === 'Dealer'}
                  onChange={() => setBuyerType('Dealer')}
                />
                <Label htmlFor="dealer" className="cursor-pointer">Dealer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="customer"
                  name="buyer_type"
                  checked={buyerType === 'Customer'}
                  onChange={() => setBuyerType('Customer')}
                />
                <Label htmlFor="customer" className="cursor-pointer">Customer</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left w-16">Select</th>
                    <th className="px-4 py-3 text-left w-16">Sno</th>
                    <th className="px-4 py-3 text-left">Product Category</th>
                    <th className="px-4 py-3 text-left">Product Code</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {priceListLoading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading price list...</td></tr>
                  ) : PRICE_LIST_DATA.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No products found for price list</td></tr>
                  ) : PRICE_LIST_DATA.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${selectedPriceListCategory?.id === item.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedPriceListCategory(item)}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="radio"
                          checked={selectedPriceListCategory?.id === item.id}
                          readOnly
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.category}</td>
                      <td className="px-4 py-3 text-gray-500">{item.code}</td>
                      <td className="px-4 py-3">₹{item.price.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProductSelection = () => {
    const filteredProducts = productsList.filter(p =>
      (searchKeyword === '' || p.name?.toLowerCase().includes(searchKeyword.toLowerCase()) || p.code?.toLowerCase().includes(searchKeyword.toLowerCase())) &&
      (searchCategory === 'All' || p.category === searchCategory)
    );

    const allFilteredSelected = filteredProducts.length > 0 &&
      filteredProducts.every(p => selectedItems.find(i => i.id === p._id));

    const handleSelectAll = () => {
      if (allFilteredSelected) {
        // Deselect all filtered products
        const filteredIds = new Set(filteredProducts.map(p => p._id));
        setSelectedItems(selectedItems.filter(i => !filteredIds.has(i.id)));
      } else {
        // Select all filtered products that aren't already selected
        const newItems = filteredProducts
          .filter(p => !selectedItems.find(i => i.id === p._id))
          .map(p => ({
            ...p,
            id: p._id,
            quantity: 1,
            price: quotationType === 'Dealer' ? (p.dealerPrice || p.salePrice || 0) : (p.salePrice || 0),
            gst: p.gst || 18,
            description: p.description || ''
          }));
        setSelectedItems([...selectedItems, ...newItems]);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep('select_type')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg py-1 px-4">{quotationType}</Badge>
            {selectedItems.length > 0 && (
              <Button onClick={() => setStep('builder')} className="bg-blue-600">
                Proceed with {selectedItems.length} items <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Select Type And View Data</CardTitle>
              <p className="text-sm text-blue-600 font-bold mt-1">
                Requirement For: {leadData?.productRequired || 'Items'} (Lead #{leadData?.leadCode || 'N/A'})
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsAddProductModalOpen(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search Product</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Enter keyword or code..."
                    className="pl-10"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  className={allFilteredSelected
                    ? "w-full border-red-300 text-red-600 hover:bg-red-50"
                    : "w-full border-blue-300 text-blue-600 hover:bg-blue-50"}
                  onClick={handleSelectAll}
                  disabled={filteredProducts.length === 0}
                >
                  {allFilteredSelected ? (
                    <><X className="h-4 w-4 mr-2" /> Deselect All ({filteredProducts.length})</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Select All ({filteredProducts.length})</>
                  )}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Sno</th>
                    <th className="px-4 py-3 text-left">Image</th>
                    <th className="px-4 py-3 text-left">Product Category</th>
                    <th className="px-4 py-3 text-left">Product Code</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading products...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No products found</td></tr>
                  ) : filteredProducts.map((p, idx) => (
                    <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded border overflow-hidden bg-gray-100 flex items-center justify-center">
                          {getImageUrl(p.image) ? (
                            <img
                              src={getImageUrl(p.image)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                            />
                          ) : null}
                          <div className="h-full w-full items-center justify-center text-gray-300" style={{display: getImageUrl(p.image) ? 'none' : 'flex'}}>
                            <Package className="h-5 w-5" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.code || '-'}</td>
                      <td className="px-4 py-3">₹{(p.salePrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{p.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={selectedItems.find(i => i.id === p._id) ? "text-green-600 hover:text-red-500" : "text-blue-600"}
                          onClick={() => handleAddItem(p)}
                          title={selectedItems.find(i => i.id === p._id) ? "Click to unselect" : "Click to add"}
                        >
                          {selectedItems.find(i => i.id === p._id) ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBuilder = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep('product_selection')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to selection
        </Button>
        <Button onClick={() => setStep('preview')} className="bg-green-600 hover:bg-green-700">
          Preview Quotation <FileText className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requirement For {leadData?.productRequired || 'Items'} (Lead #{leadData?.leadCode})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Product Details</th>
                  <th className="px-4 py-3 text-center w-24">Unit Price</th>
                  <th className="px-4 py-3 text-center w-24">Qty</th>
                  <th className="px-4 py-3 text-center w-24">GST %</th>
                  <th className="px-4 py-3 text-right w-32">Amount</th>
                  <th className="px-4 py-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <div className="h-16 w-16 rounded border overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                          {getImageUrl(item.image) ? (
                            <img src={getImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover"
                              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                          ) : null}
                          <div className="h-full w-full items-center justify-center text-gray-300" style={{display: getImageUrl(item.image) ? 'none' : 'flex'}}>
                            <Package className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Editable Item Name */}
                          {editingItemField?.id === item.id && editingItemField?.field === 'name' ? (
                            <Input
                              autoFocus
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              onBlur={() => setEditingItemField(null)}
                              className="h-7 text-sm font-bold mb-1"
                            />
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="font-bold text-gray-900">{item.name}</span>
                              <button onClick={() => setEditingItemField({id: item.id, field: 'name'})}
                                className="opacity-0 group-hover:opacity-100 text-orange-400 hover:text-orange-600 transition-opacity" title="Edit name">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                              </button>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">Code: {item.code}</div>
                          {/* Editable Specs + Usage line (replaces description) */}
                          {(() => {
                            // Build default spec+usage text from DB data
                            const buildSpecUsageText = (it) => {
                              const specParts = (it.specifications || []).map(s => `${s.key}: ${s.value}`);
                              const apps = it.applications || it.features || [];
                              if (apps.length > 0) specParts.push(`Usage: ${apps.join(', ')}`);
                              return specParts.join(' | ');
                            };
                            // Initialize specUsageText from item if not yet set
                            const currentText = item.specUsageText !== undefined
                              ? item.specUsageText
                              : buildSpecUsageText(item);
                            return editingItemField?.id === item.id && editingItemField?.field === 'specUsageText' ? (
                              <textarea
                                autoFocus
                                value={currentText}
                                onChange={(e) => handleUpdateItem(item.id, 'specUsageText', e.target.value)}
                                onBlur={() => setEditingItemField(null)}
                                rows={2}
                                className="mt-1 w-full text-xs border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:border-blue-400"
                              />
                            ) : (
                              <div className="flex items-start gap-1 group mt-0.5">
                                <span className="text-xs text-gray-500">
                                  {currentText || <em className="text-gray-300 italic">No specs/usage</em>}
                                </span>
                                <button
                                  onClick={() => {
                                    if (item.specUsageText === undefined) {
                                      handleUpdateItem(item.id, 'specUsageText', buildSpecUsageText(item));
                                    }
                                    setEditingItemField({id: item.id, field: 'specUsageText'});
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-orange-400 hover:text-orange-600 transition-opacity flex-shrink-0 mt-0.5" title="Edit specs/usage">
                                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value))}
                        className="h-8 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value))}
                        className="h-8 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={item.gst}
                        onChange={(e) => handleUpdateItem(item.id, 'gst', parseInt(e.target.value))}
                        className="h-8 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      ₹{(item.price * item.quantity * (1 + item.gst / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Additional Charges rows in builder (with X remove button) */}
                {additionalCharges.map((charge) => (
                  <tr key={charge.id} className="border-b last:border-0 bg-orange-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">S</span>
                        <span className="font-bold text-gray-800">{charge.name}</span>
                        <button onClick={() => setAdditionalCharges(prev => prev.filter(c => c.id !== charge.id))}
                          className="text-red-400 hover:text-red-600 ml-1" title="Remove">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input type="number" value={charge.price}
                        onChange={(e) => setAdditionalCharges(prev => prev.map(c => c.id === charge.id ? {...c, price: parseFloat(e.target.value)||0} : c))}
                        className="h-8 text-center" />
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-right font-bold">
                      ₹{charge.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-lg">Total Amount:</td>
                  <td className="px-4 py-3 text-right text-lg text-blue-600">
                    ₹{(
                      selectedItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 + item.gst / 100)), 0) +
                      additionalCharges.reduce((acc, c) => acc + c.price, 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Additional Service Charges Selector ─────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Additional Charges</CardTitle>
            <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => {
                const init = {};
                ALL_SERVICE_CHARGES.forEach(c => { init[c.id] = !!additionalCharges.find(x => x.id === c.id); });
                setChargePickerChecked(init);
                setShowChargesPicker(true);
              }}>
              <Plus className="h-4 w-4" /> Add Additional Charges
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {additionalCharges.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No charges selected. Click "Add Additional Charges" to select.</p>
          ) : (
            additionalCharges.map((charge) => (
              <div key={charge.id} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-md p-3">
                <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded">S</span>
                <span className="flex-1 text-sm font-bold text-gray-800">{charge.name}</span>
                <span className="text-sm text-gray-500">₹{charge.price.toLocaleString()}</span>
                <button onClick={() => setAdditionalCharges(prev => prev.filter(c => c.id !== charge.id))}
                  className="text-red-400 hover:text-red-600 ml-1" title="Remove">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Charges Picker Modal */}
      {showChargesPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Select Service Charges</h3>
              <button onClick={() => setShowChargesPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="charge-select-all"
                  checked={ALL_SERVICE_CHARGES.every(c => chargePickerChecked[c.id])}
                  onChange={(e) => {
                    const val = e.target.checked;
                    const next = {};
                    ALL_SERVICE_CHARGES.forEach(c => { next[c.id] = val; });
                    setChargePickerChecked(next);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500" />
                <label htmlFor="charge-select-all" className="text-sm font-semibold text-gray-700 cursor-pointer">Select All</label>
              </div>
              {ALL_SERVICE_CHARGES.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-orange-50 cursor-pointer"
                  onClick={() => setChargePickerChecked(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                  <input type="checkbox" checked={!!chargePickerChecked[c.id]} onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                  <span className="text-sm font-bold text-gray-600">₹{c.price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowChargesPicker(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const toAdd = ALL_SERVICE_CHARGES.filter(c => chargePickerChecked[c.id] && !additionalCharges.find(x => x.id === c.id));
                  const toRemove = ALL_SERVICE_CHARGES.filter(c => !chargePickerChecked[c.id]).map(c => c.id);
                  setAdditionalCharges(prev => [...prev.filter(x => !toRemove.includes(x.id)), ...toAdd]);
                  setShowChargesPicker(false);
                }}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Terms & Conditions Selector ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Terms &amp; Conditions</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                const init = {};
                ALL_TERMS.forEach(t => { init[t.id] = false; });
                setTermPickerChecked(init);
                setShowTermsPicker(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Terms &amp; Conditions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedTerms.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No terms selected. Click "Add Terms &amp; Conditions" to select.</p>
          ) : (
            selectedTerms.map((t, idx) => (
              <div key={t.id} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-md p-3">
                <span className="text-xs font-bold text-gray-500 mt-0.5 min-w-[20px]">{idx + 1}.</span>
                <div className="flex-1 text-sm">
                  <span className="font-bold text-gray-800">{t.heading}: </span>
                  <span className="text-gray-600">{t.text}</span>
                </div>
                <button
                  onClick={() => setSelectedTerms(prev => prev.filter(x => x.id !== t.id))}
                  className="text-red-400 hover:text-red-600 ml-2 mt-0.5 flex-shrink-0"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Terms Picker Modal */}
      {showTermsPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Select Terms &amp; Conditions</h3>
              <button onClick={() => setShowTermsPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="tc-select-all"
                  checked={ALL_TERMS.every(t => termPickerChecked[t.id])}
                  onChange={(e) => {
                    const val = e.target.checked;
                    const next = {};
                    ALL_TERMS.forEach(t => { next[t.id] = val; });
                    setTermPickerChecked(next);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="tc-select-all" className="text-sm font-semibold text-gray-700 cursor-pointer">Select All</label>
              </div>
              {ALL_TERMS.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-blue-50 cursor-pointer"
                  onClick={() => setTermPickerChecked(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                >
                  <input
                    type="checkbox"
                    checked={!!termPickerChecked[t.id]}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 mt-0.5 flex-shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-bold text-gray-800">{t.heading}: </span>
                    <span className="text-gray-600">{t.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTermsPicker(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const toAdd = ALL_TERMS.filter(t => termPickerChecked[t.id] && !selectedTerms.find(x => x.id === t.id));
                  setSelectedTerms(prev => [...prev, ...toAdd]);
                  setShowTermsPicker(false);
                }}
              >
                Add Selected Terms
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Additional Notes Selector ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Additional Notes</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                const init = {};
                ALL_ADDITIONAL_NOTES.forEach((_, i) => { init[i] = false; });
                setNotePickerChecked(init);
                setShowNotesPicker(true);
              }}
            >
              <Plus className="h-4 w-4" /> Select Additional Notes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedNotes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No notes selected. Click "Select Additional Notes" to add.</p>
          ) : (
            selectedNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-md p-3">
                <span className="text-xs font-bold text-gray-500 mt-0.5 min-w-[20px]">{idx + 1}.</span>
                <span className="flex-1 text-sm text-gray-700">{note}</span>
                <button
                  onClick={() => setSelectedNotes(prev => prev.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 ml-2 mt-0.5 flex-shrink-0"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notes Picker Modal */}
      {showNotesPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">Select Additional Notes</h3>
              <button onClick={() => setShowNotesPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="note-select-all"
                  checked={ALL_ADDITIONAL_NOTES.every((_, i) => notePickerChecked[i])}
                  onChange={(e) => {
                    const val = e.target.checked;
                    const next = {};
                    ALL_ADDITIONAL_NOTES.forEach((_, i) => { next[i] = val; });
                    setNotePickerChecked(next);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="note-select-all" className="text-sm font-semibold text-gray-700 cursor-pointer">Select All</label>
              </div>
              {ALL_ADDITIONAL_NOTES.map((note, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-blue-50 cursor-pointer"
                  onClick={() => setNotePickerChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  <input
                    type="checkbox"
                    checked={!!notePickerChecked[i]}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{note}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNotesPicker(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const toAdd = ALL_ADDITIONAL_NOTES.filter((_, i) => notePickerChecked[i] && !selectedNotes.includes(ALL_ADDITIONAL_NOTES[i]));
                  setSelectedNotes(prev => [...prev, ...toAdd]);
                  setShowNotesPicker(false);
                }}
              >
                Add Selected Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreview = () => {
    const itemsSubTotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const itemsGst = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.gst / 100)), 0);
    const chargesSubTotal = additionalCharges.reduce((acc, c) => acc + c.price, 0);
    const subTotal = itemsSubTotal + chargesSubTotal;
    const totalGst = itemsGst;
    const totalAmount = subTotal + totalGst;

    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 py-4 border-b">
          <Button variant="ghost" onClick={() => setStep('builder')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to builder
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? "Sending..." : "Send Email"} <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Document Structure */}
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-0 overflow-hidden text-gray-800" ref={pdfRef}>
          {/* Main Container with Border */}
          <div className="border border-gray-400 m-4">
            {/* Header Section */}
            <div className="flex border-b border-gray-400">
              {/* Logo Column */}
              <div className="w-[18%] p-4 border-r border-gray-400 flex items-center justify-center">
                <img src="/logo Semtek.webp" alt="Logo" className="h-16 w-auto object-contain" />
              </div>
              {/* Address Column */}
              <div className="w-[52%] p-4 border-r border-gray-400 space-y-1 flex flex-col justify-center">
                <div className="text-xl font-serif font-bold tracking-tight text-black">{companyName}</div>
                <div className="text-[9px] font-bold text-gray-800 uppercase">MKT BY: Samtek Engineering and GIS Solution Pvt Ltd.</div>
                <div className="text-[9px] text-gray-600 leading-normal">
                  D-16 B S Road, Industrial Area, Near IMS College, Lal Kuan, Ghaziabad, Uttar Pradesh - 201001
                </div>
                <div className="text-[9px] text-gray-600">India</div>
              </div>

              {/* Contact Column */}
              <div className="w-[30%] p-3 text-[10px] flex flex-col justify-center space-y-1">
                <div className="flex justify-between gap-1"><span>Email:</span> <span className="font-medium truncate">{companyEmail || 'sales@samtekmachinery.com'}</span></div>
                <div className="flex justify-between gap-1"><span>Mobile:</span> <span className="font-medium">{companyMobile ? `+91-${companyMobile}` : '+91-7822813451'}</span></div>
                {companyWebsite && <div className="flex justify-between gap-1"><span>Website:</span> <span className="font-medium">{companyWebsite}</span></div>}
                {!companyWebsite && <div className="flex justify-between gap-1"><span>Website:</span> <span className="font-medium">www.samtekmachinery.com</span></div>}
                {companyGst && (
                  <div className="flex justify-between gap-1 font-bold text-black pt-1 border-t border-gray-100"><span>GST:</span> <span>{companyGst}</span></div>
                )}
              </div>
            </div>

            {/* To Section and Quo Details */}
            <div className="flex border-b border-gray-400">
              <div className="w-3/5 p-4 border-r border-gray-400 space-y-1">
                <div className="font-bold text-sm">To,</div>
                <div className="font-bold text-sm text-blue-900">{leadData?.contactPerson} ({leadData?.companyName || 'S.S. Enterprises'})</div>
                <div className="text-[10px] leading-relaxed">
                  <span className="font-bold">Address:</span> {leadData?.address}, {leadData?.city}, {leadData?.state} - {leadData?.pincode || '241204'}
                </div>
                <div className="text-[10px]"><span className="font-bold">Email:</span> {leadData?.email}</div>
                <div className="text-[10px]"><span className="font-bold">Mobile:</span> {leadData?.mobile}</div>
                {leadData?.gstNumber && (
                  <div className="text-[10px]"><span className="font-bold">GST No:</span> {leadData.gstNumber}</div>
                )}
              </div>
              <div className="w-2/5">
                <table className="w-full h-full text-[10px]">
                  <tr className="border-b border-gray-400"><td className="p-2 border-r border-gray-400 font-bold bg-gray-50">Quotation No</td><td className="p-2 font-medium">: SM-7653-17-03</td></tr>
                  <tr className="border-b border-gray-400"><td className="p-2 border-r border-gray-400 font-bold bg-gray-50">Quotation Date</td><td className="p-2 font-medium">: {new Date().toLocaleDateString('en-GB')}</td></tr>
                  <tr className="border-b border-gray-400"><td className="p-2 border-r border-gray-400 font-bold bg-gray-50">Valid Till</td><td className="p-2 font-medium">: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</td></tr>
                  <tr><td className="p-2 border-r border-gray-400 font-bold bg-gray-50">Enquiry Ref ID</td><td className="p-2 font-medium">: {leadData?.leadCode || '3135580830'}</td></tr>
                </table>
              </div>
            </div>

            {/* Title Section */}
            <div className="py-6 text-center space-y-2">
              <div className="text-2xl font-black text-red-600 underline underline-offset-4 tracking-widest">QUOTATION</div>
              <div className="text-lg font-bold text-blue-800 underline underline-offset-4 uppercase">{leadData?.productRequired || 'AUTOMATIC FLOUR MILL PLANT 1000 KG/HR'}</div>
            </div>

            <div className="px-6 space-y-4">
              <div className="text-xs">
                <p className="font-bold">Dear Sir/Ma'am,</p>
                <p className="text-gray-600 mt-1">We are indeed thankful to you for referring us and evincing interest in our products. We studied your requirement carefully. Please find herewith our most exclusive and technically viable offer for your perusal and scrutiny. We are glad to submit our offer.</p>
              </div>

              {/* Items Table */}
              <div className="border border-gray-400 rounded-sm overflow-hidden">
                <table className="w-full text-[10px] text-center border-collapse">
                  <thead className="bg-blue-100 text-blue-900 font-bold uppercase border-b border-gray-400">
                    <tr>
                      <th className="px-2 py-3 border-r border-gray-400 w-10">Sl.</th>
                      <th className="px-4 py-3 border-r border-gray-400 text-left">Product Details</th>
                      <th className="px-2 py-3 border-r border-gray-400 w-24">Unit Price (INR)</th>
                      <th className="px-2 py-3 border-r border-gray-400 w-16">Qty</th>
                      <th className="px-2 py-3 border-r border-gray-400 w-16">GST %</th>
                      <th className="px-4 py-3 w-32 text-right">Total Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-400 last:border-0 pdf-section">
                        <td className="p-2 border-r border-gray-400 align-top font-bold">{idx + 1}</td>
                        <td className="p-4 border-r border-gray-400 text-left">
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="text-sm font-bold text-blue-900 border-b pb-1">{item.name}</div>
                              <div className="font-bold">Product Code: <span className="text-blue-600">{item.code || '-'}</span></div>
                              {/* Dynamic Specs + Usage from DB (or edited text from builder) */}
                              {(() => {
                                // If user edited specUsageText in builder, use that; else build from DB fields
                                const buildSpecUsageText = (it) => {
                                  const specParts = (it.specifications || []).map(s => `${s.key}: ${s.value}`);
                                  const apps = it.applications || it.features || [];
                                  if (apps.length > 0) specParts.push(`Usage: ${apps.join(', ')}`);
                                  return specParts.join(' | ');
                                };

                                const rawText = item.specUsageText !== undefined
                                  ? item.specUsageText
                                  : buildSpecUsageText(item);

                                if (!rawText) return null;

                                // Split by ' | ' to render each as a separate line with #
                                const lines = rawText.split(' | ').map(l => l.trim()).filter(Boolean);
                                return (
                                  <div className="text-[9px] text-gray-600 space-y-0.5 mt-1">
                                    {lines.map((line, i) => (
                                      <div key={i}># {line}</div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="w-24 h-24 border border-gray-200 rounded flex items-center justify-center p-1 shrink-0 bg-white overflow-hidden">
                              {getImageUrl(item.image) ? (
                                <img
                                  src={getImageUrl(item.image)}
                                  alt="Product"
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                                />
                              ) : null}
                              <Package className="h-8 w-8 text-gray-200" style={{display: getImageUrl(item.image) ? 'none' : 'block'}} />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-gray-400 align-top">
                          <div className="border border-gray-300 p-1 rounded font-bold">₹{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-[8px] text-gray-400 mt-1 italic">Per Piece</div>
                        </td>
                        <td className="p-2 border-r border-gray-400 align-top">
                          <div className="font-bold">{item.quantity}</div>
                          <div className="text-[8px] text-gray-400 mt-1 italic">Piece</div>
                        </td>
                        <td className="p-2 border-r border-gray-400 align-top font-bold">{item.gst}%</td>
                        <td className="p-2 align-top text-right font-black">₹{(item.price * item.quantity * (1 + item.gst / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Additional Charges rows in PDF — no remove button */}
                    {additionalCharges.map((charge, idx) => (
                      <tr key={charge.id} className="border-b border-gray-400 pdf-section">
                        <td className="p-2 border-r border-gray-400 align-top font-bold text-orange-600">S</td>
                        <td className="p-4 border-r border-gray-400 text-left">
                          <div className="text-sm font-bold text-blue-900">{charge.name}</div>
                        </td>
                        <td className="p-2 border-r border-gray-400 align-top">
                          <div className="border border-gray-300 p-1 rounded font-bold">₹{charge.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="p-2 border-r border-gray-400 align-top text-center font-bold text-gray-400">-</td>
                        <td className="p-2 border-r border-gray-400 align-top font-bold text-gray-400">-</td>
                        <td className="p-2 align-top text-right font-black">₹{charge.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pdf-section">
                <div className="w-1/2">
                  <table className="w-full text-[10px] font-bold">
                    <tr>
                      <td className="p-2 text-right text-gray-500">Total Gross Amount</td>
                      <td className="p-2 text-right w-32 border-l border-gray-200">₹{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-y border-gray-200">
                      <td className="p-2 text-right text-gray-500">GST</td>
                      <td className="p-2 text-right border-l border-gray-200">₹{totalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2 text-right text-blue-900 text-sm font-black">Net Amount (Round Off)</td>
                      <td className="p-2 text-right text-blue-900 text-sm font-black border-l border-gray-200">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </table>
                  <div className="bg-green-700 text-white p-2 text-right text-[11px] font-black italic uppercase tracking-wider rounded-b">
                    {numberToWords(totalAmount)}
                  </div>
                </div>
              </div>

              {/* Conditions Sections */}
              <div className="space-y-4 pt-4 pb-10">
                {/* Terms & Conditions — dynamic from builder */}
                {selectedTerms.length > 0 && (
                  <div className="border border-gray-300 pdf-section">
                    <div className="bg-blue-100 p-2 text-[10px] font-black border-b border-gray-300 uppercase tracking-widest text-blue-900">TERMS &amp; CONDITIONS</div>
                    <div className="p-4 text-[10px] text-gray-600 leading-relaxed">
                      {selectedTerms.map((t, idx) => (
                        <div key={t.id} className="mb-1">
                          <span className="font-bold text-gray-800">{idx + 1}. {t.heading}: </span>
                          <span className="italic">{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes — dynamic from builder */}
                {selectedNotes.length > 0 && (
                  <div className="border border-gray-300 pdf-section">
                    <div className="bg-blue-100 p-2 text-[10px] font-black border-b border-gray-300 uppercase tracking-widest text-blue-900">ADDITIONAL NOTE</div>
                    <div className="p-4 text-[10px] text-gray-600 leading-relaxed italic">
                      {selectedNotes.map((note, idx) => (
                        <div key={idx} className="mb-1">{idx + 1}. {note}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border border-gray-300 pdf-section">
                  <div className="bg-blue-100 p-2 text-[10px] font-black border-b border-gray-300 uppercase tracking-widest text-blue-900">BANK DETAILS</div>
                  <div className="p-4 text-[10px] font-bold text-gray-700 space-y-1">
                    <p>NAME OF COMPANY - SAMTEK ENGINEERING AND GIS SOLUTION PVT LTD.</p>
                    <p>ACCOUNT NUMBER - 411505500062</p>
                    <p>IFSC CODE - ICIC0004115</p>
                    <p>BRANCH - NOIDA SECTOR 121 (NOIDA)</p>
                  </div>
                </div>
              </div>

              {/* Final Message and Signs */}
              <div className="pt-10 border-t border-gray-200 pb-12 pdf-section">
                <p className="text-[10px] text-gray-600 text-center italic">Thank you again for showing your interest with our company. We expect a healthy and long-term relationship with you. Early revert from your side will be highly appreciated. Please feel free to ask your queries.</p>
                <div className="flex justify-between items-end mt-12">
                  <div className="space-y-1">
                    <div className="font-black text-sm text-blue-900">Thanks & Regards</div>
                    <div className="text-[11px] font-bold">{loggedInUser?.fullName || companyName}</div>
                    {(loggedInUser?.email) && (
                      <div className="text-[10px] text-gray-500">Email: {loggedInUser.email}</div>
                    )}
                    {(loggedInUser?.mobile) && (
                      <div className="text-[10px] text-gray-500">Mobile: {loggedInUser.mobile}</div>
                    )}
                  </div>
                  <div className="text-center relative">
                    <div className="font-black text-sm text-blue-900 mb-2">Authorized Signatory</div>
                    {companyStampUrl ? (
                      <div className="w-32 h-24 flex items-center justify-center">
                        <img
                          src={companyStampUrl}
                          alt="Company Stamp"
                          className="max-w-full max-h-full object-contain opacity-90"
                          crossOrigin="anonymous"
                          onError={(e) => { e.target.style.display='none'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <span className="text-[9px] text-gray-400 italic text-center px-1">Stamp not uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* Main Page Footer */}
          <div className="bg-white border-t border-gray-200 py-4 px-6">
            <div className="grid grid-cols-3 gap-4 text-[9px] font-bold text-blue-900 uppercase text-center">
              <div className="flex items-center justify-center gap-1"><span className="text-black">🌐</span> www.samtekmachinery.com</div>
              <div className="flex items-center justify-center gap-1"><span className="text-black">✉️</span> info@samtekmachinery.com</div>
              <div className="flex items-center justify-center gap-1"><span className="text-black">✉️</span> sales@samtekmachinery.com</div>
              <div className="flex items-center justify-center gap-1"><span className="text-black">📷</span> @samtekmachinerygzb</div>
              <div className="flex items-center justify-center gap-1"><span className="text-black">f</span> @samtekmachinerygzb</div>
              <div className="flex items-center justify-center gap-1"><span className="text-black">▶️</span> @SamTekMachinery</div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderPriceListPreview = () => {
    const category = selectedPriceListCategory;
    if (!category) return null;

    let dynamicColumns = [];
    if (category.products && category.products.length > 0) {
      const keySet = new Set();
      category.products.forEach(p => {
        Object.keys(p).forEach(k => {
          const lowerK = k.toLowerCase();
          if (!['price', '_id', 'id', 'dealerprice', 'pricewithoutmotor', 'pricewithmotor', 'margin', 'name', 'capacity', 'createdat', 'updatedat', '__v', 'status'].includes(lowerK)) {
             keySet.add(k);
          }
        });
      });
      let firstCols = [];
      if (category.products.some(prod => prod.capacity || prod.Capacity)) firstCols.push('Capacity');
      else if (category.products.some(prod => prod.name || prod.Name)) firstCols.push('Name');
      
      const otherCols = Array.from(keySet);
      dynamicColumns = [...firstCols, ...otherCols];
      
      if (dynamicColumns.length === 0) {
         dynamicColumns = ['Details']; // fallback
      }
    }

    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 py-4 border-b">
          <Button variant="ghost" onClick={() => setStep('price_list_selection')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to selection
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? "Sending..." : "Send Email"} <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Price List PDF Document Structure */}
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-0 overflow-hidden border" ref={pdfRef}>
          {/* Blue Header Bar */}
          <div className="bg-blue-800 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded">
                <img src="/logo Semtek.webp" alt="Samtek Logo" className="h-12 w-auto object-contain" />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{companyName.toUpperCase()}</div>
                <div className="text-[10px] opacity-80">Mkt By : Samtek Engineering And GIS Solutions Pvt Ltd</div>
              </div>
            </div>
          </div>

          {/* Orange & Blue Sub Header */}
          <div className="flex mt-1">
            <div className="bg-orange-500 text-white px-8 py-2 font-bold flex items-center justify-center">
              SINCE 2013
            </div>
            <div className="bg-blue-800 text-white flex-1 py-2 px-6 font-bold flex items-center justify-center text-center uppercase tracking-wide">
              {category.category}
            </div>
          </div>

          <div className="p-8">
            {/* Description Lines */}
            <div className="text-blue-800 font-bold space-y-1 mb-8 text-sm">
              {category.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {/* Main Content: Machine Image and Features */}
            <div className="grid grid-cols-5 gap-8 items-start mb-8">
              <div className="col-span-1">
                <div className="relative mb-6">
                  {/* Dynamic anniversary badge — year auto-increments each year */}
                  {(() => {
                    const FOUNDED_YEAR = 2013;
                    const yearsOfExcellence = new Date().getFullYear() - FOUNDED_YEAR;
                    return (
                      <div className="relative w-full aspect-square flex items-center justify-center">
                        <img src="/anniversary_badge.png" alt={`${yearsOfExcellence} Years Anniversary`} className="w-full h-auto absolute inset-0" />
                        <div className="relative z-10 flex flex-col items-center justify-center" style={{ marginTop: '-8%' }}>
                          <span className="font-black text-white leading-none" style={{ fontSize: 'clamp(28px, 8vw, 48px)', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                            {yearsOfExcellence}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Checklist */}
                <div className="border-2 border-blue-600 rounded-xl p-4 space-y-2">
                  {category.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-blue-800">
                      <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-4 flex justify-center">
                <img src={category.image || "/flour_mill_machine.png"} alt="Machine" className="max-h-[350px] w-auto object-contain" />
              </div>
            </div>

            <div className="text-blue-800 font-black mb-4">18% GST EXTRA</div>

            {/* Price Table */}
            <div className="rounded-lg overflow-hidden border-2 border-blue-800">
              <table className="w-full text-sm">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    {dynamicColumns.map((col) => (
                      <th key={col} className="px-4 py-3 text-center border-r border-blue-700 uppercase">
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">PRICE<br /><span className="text-[10px] font-normal">(WITHOUT MOTOR)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {category.products.map((p, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? "bg-orange-500 text-white" : "bg-white text-blue-800"} pdf-section`}>
                      {dynamicColumns.map(col => {
                        const actualKey = Object.keys(p).find(k => k.toLowerCase() === col.toLowerCase());
                        const val = actualKey && p[actualKey] ? p[actualKey] : '-';
                        return (
                          <td key={col} className="px-4 py-2 text-center font-bold border-r border-white/20 uppercase">
                            {val}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-black">{(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Contact Footer — matches printed quotation exactly */}
            <div className="mt-10 pt-6 border-t border-gray-200 pdf-section">
              {/* Phone + Website row */}
              <div className="flex justify-center gap-10 mb-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  {/* WhatsApp icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  <span>{companyMobile ? `+91 ${companyMobile}` : '+91 7822813451'}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  {/* Globe icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span>{companyWebsite || 'https://www.samtekmachinery.com/'}</span>
                </div>
              </div>

              {/* Social handles row */}
              <div className="flex justify-center gap-8 mb-4">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  {/* Facebook */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-600 shrink-0"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <span>@samtekmachinerygzb</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  {/* Instagram */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" style={{fill:'url(#igGrad)'}}>
                    <defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>@samtekmachinerygzb</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  {/* YouTube */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-600 shrink-0"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                  <span>@SamTekMachinery</span>
                </div>
              </div>

              {/* Address bar */}
              <div className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded text-center">
                <span className="font-black">ADDRESS :-</span> D-16, BS Road Industrial Area, Near IMS College, Lal Kuan, Ghaziabad-201009
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <Card className="mb-8 border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-blue-200 shadow-xl">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">Generate Quotation</h2>
              <p className="text-gray-500 font-medium">Create and send professional quotes to your leads</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {step === 'select_type' && renderSelectType()}
      {step === 'price_list_selection' && renderPriceListSelection()}
      {step === 'product_selection' && renderProductSelection()}
      {step === 'builder' && renderBuilder()}
      {step === 'preview' && renderPreview()}
      {step === 'price_list_preview' && renderPriceListPreview()}
      {renderAddProductModal()}
    </div>
  );
};

export default Quotation;
