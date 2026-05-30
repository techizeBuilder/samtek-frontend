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
    enabled: !!leadId
  });

  const leadData = leadResponse?.lead;

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
    if (selectedItems.find(item => item._id === product._id)) {
      toast({ title: "Already added", description: "Product is already in the list" });
      return;
    }
    setSelectedItems([...selectedItems, {
      ...product,
      id: product._id,
      price: product.salePrice || 0,
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

      // 3. Capture high-quality canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      // 4. Cleanup spacers immediately after capture
      addedSpacers.forEach(s => s.remove());

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Quotation_${leadData?.leadCode || 'New'}.pdf`);
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
        attachmentBase64: pdfBase64
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000 // 60 seconds timeout
      });

      if (res.data.success) {
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
                          className={selectedItems.find(i => i.id === p._id) ? "text-green-600" : "text-blue-600"}
                          onClick={() => handleAddItem(p)}
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
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                            />
                          ) : null}
                          <div className="h-full w-full items-center justify-center text-gray-300" style={{display: getImageUrl(item.image) ? 'none' : 'flex'}}>
                            <Package className="h-8 w-8" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">Code: {item.code}</div>
                          <div className="text-xs text-gray-400 line-clamp-1">{item.description}</div>
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
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-lg">Total Amount:</td>
                  <td className="px-4 py-3 text-right text-lg text-blue-600">
                    ₹{selectedItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 + item.gst / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreview = () => {
    const totalAmount = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 + item.gst / 100)), 0);
    const subTotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalGst = totalAmount - subTotal;

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
                <div className="text-xl font-serif font-bold tracking-tight text-black">Samtek Machinery</div>
                <div className="text-[9px] font-bold text-gray-800 uppercase">MKT BY: Samtek Engineering and GIS Solution Pvt Ltd.</div>
                <div className="text-[9px] text-gray-600 leading-normal">
                  D-16 B S Road, Industrial Area, Near IMS College, Lal Kuan, Ghaziabad, Uttar Pradesh - 201001
                </div>
                <div className="text-[9px] text-gray-600">India</div>
              </div>

              {/* Contact Column */}
              <div className="w-[30%] p-3 text-[10px] flex flex-col justify-center space-y-1">
                <div className="flex justify-between gap-1"><span>Email:</span> <span className="font-medium truncate">sales@samtekmachinery.com</span></div>
                <div className="flex justify-between gap-1"><span>Mobile:</span> <span className="font-medium">+91-7822813451</span></div>
                <div className="flex justify-between gap-1"><span>Website:</span> <span className="font-medium">www.samtekmachinery.com</span></div>
                <div className="flex justify-between gap-1 font-bold text-black pt-1 border-t border-gray-100"><span>GST:</span> <span>09AABCX1268H1ZJ</span></div>
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
                              <div className="text-[9px] text-gray-600 space-y-0.5">
                                <div># Capacity : 200 Kg/hr</div>
                                <div># Usages : Milling</div>
                                <div># Model : Heavy Duty</div>
                                <div># Size : 24 inch</div>
                                <div># Material : Mild Steel</div>
                                <div># Motor (HP) : 15 HP</div>
                                <div># Load (KW) : 11.25 Kwh</div>
                                <div># Motor RPM : 960 RPM</div>
                                <div># Phase : Three</div>
                              </div>
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
                <div className="border border-gray-300 pdf-section">
                  <div className="bg-blue-100 p-2 text-[10px] font-black border-b border-gray-300 uppercase tracking-widest text-blue-900">TERMS & CONDITIONS</div>
                  <div className="p-4 text-[10px] text-gray-600 leading-relaxed italic">
                    1. 18% GST Extra as applicable.<br />
                    2. Payment: 50% Advance, balance before dispatch.<br />
                    3. Delivery: Within 2-3 weeks from confirmed order.<br />
                    4. Transport: Extra as per actual distance.
                  </div>
                </div>

                <div className="border border-gray-300 pdf-section">
                  <div className="bg-blue-100 p-2 text-[10px] font-black border-b border-gray-300 uppercase tracking-widest text-blue-900">ADDITIONAL NOTE</div>
                  <div className="p-4 text-[10px] text-gray-600 leading-relaxed italic">
                    The machine is built with heavy-duty MS body and high-quality components. Warranty: 1 Year on machine body.
                  </div>
                </div>

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
                    <div className="text-[11px] font-bold">Samtek Machinery</div>
                    <div className="text-[10px] text-gray-500">Mobile: 7822813451</div>
                    <div className="text-[10px] text-gray-500">Email: sales@samtekmachinery.com</div>
                  </div>
                  <div className="text-center relative">
                    <div className="font-black text-sm text-blue-900 mb-12">Authorized Signatory</div>
                    <div className="absolute -bottom-8 right-0 w-28 opacity-70">
                      <img src="/samtek_stamp.png" alt="Stamp" className="w-full h-auto" />
                    </div>
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
                <div className="text-2xl font-black tracking-tight">SAMTEK MACHINERY</div>
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
                  <img src="/anniversary_badge.png" alt="13 Years Anniversary" className="w-full h-auto" />
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

            {/* Contact Footer */}
            <div className="mt-12 flex flex-col items-center space-y-4 pt-8 border-t border-gray-100 pdf-section">
              <div className="flex gap-8 text-blue-800 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500 p-1 rounded-full text-white"><Send className="h-3 w-3" /></div>
                  <span>+91 7822813451</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500 p-1 rounded-full text-white"><Search className="h-3 w-3" /></div>
                  <span>https://www.samtekmachinery.com/</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-[10px] font-bold text-blue-800">
                <span className="flex items-center gap-1 opacity-70">@samtekmachinerygzb</span>
                <span className="flex items-center gap-1 opacity-70">@samtekmachinerygzb</span>
                <span className="flex items-center gap-1 opacity-70">@SamTekMachinery</span>
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
