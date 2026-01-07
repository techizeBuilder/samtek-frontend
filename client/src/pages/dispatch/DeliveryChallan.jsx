import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ProductSelector from '@/components/products/ProductSelector';
import {
  Package,
  FileText,
  RefreshCw,
  Truck,
  Receipt,
  AlertCircle,
  Eye,
  X,
  Plus,
  ShoppingCart
} from 'lucide-react';
import { config } from '@/config/environment';

export default function DeliveryChallan() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dcPrefix] = useState('DC');
  const [dcNumber, setDcNumber] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isSalesmanDropdownOpen, setIsSalesmanDropdownOpen] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [qtyIssuedMap, setQtyIssuedMap] = useState({});
  const [isDispatched, setIsDispatched] = useState(false);
  const [currentDCId, setCurrentDCId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [nextDCNumber, setNextDCNumber] = useState('');
  const [selectedItems, setSelectedItems] = useState({}); // Track which items are selected for dispatch

  // Direct Order Creation State
  const [isDirectOrderModalOpen, setIsDirectOrderModalOpen] = useState(false);
  const [directOrderLoading, setDirectOrderLoading] = useState(false);
  const [orderSalesPersons, setOrderSalesPersons] = useState([]);
  const [orderCustomers, setOrderCustomers] = useState([]);
  const [orderProducts, setOrderProducts] = useState([]);
  const [directOrderForm, setDirectOrderForm] = useState({
    salesPersonId: '',
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
    selectedProducts: []
  });

  useEffect(() => {
    fetchSalespeople();
    fetchAllCustomers(); // Load all customers on mount
    fetchTodaysProducts(); // Load all today's products on mount
    fetchNextDCNumber(); // Fetch next DC number on mount
  }, []);

  // When salesperson changes, just reset customer selection
  // Keep showing ALL customers (no filtering by salesperson)
  useEffect(() => {
    if (selectedSalesman) {
      // Don't filter customers - show all customers
      // Only reset customer selection when salesman changes
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
      // Fetch products for this salesman
      fetchTodaysProducts();
    } else {
      // When no salesman selected, still load all customers
      fetchAllCustomers();
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
      setProducts([]);
      setQtyIssuedMap({});
    }
  }, [selectedSalesman]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsSalesmanDropdownOpen(false);
        setIsCustomerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNextDCNumber = async () => {
    try {
      console.log('🔢 Fetching next DC number...');
      
      const response = await fetch(`${config.baseURL}/api/dispatches/next-dc-number`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Next DC number response:', result);
      
      if (result.success && result.dcNo) {
        // Store the full DC number (e.g., DC017)
        setNextDCNumber(result.dcNo);
        setDcNumber(result.dcNo);
        
        toast({
          title: "DC Number",
          description: `Next available DC number: ${result.dcNo}`,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching next DC number:', error);
      toast({
        title: "Error",
        description: "Failed to fetch next DC number",
        variant: "destructive",
      });
    }
  };

  const fetchSalespeople = async () => {
    try {
      console.log('👥 Fetching salespeople...');
      
      const response = await fetch(`${config.baseURL}/api/customers/salespeople`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Salespeople response:', result);
      
      if (result.success) {
        setSalespeople(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching salespeople:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salespeople list",
        variant: "destructive",
      });
    }
  };

  const fetchAllCustomers = async () => {
    try {
      console.log('👥 Fetching all customers...');
      
      const response = await fetch(`${config.baseURL}/api/customers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('👥 All customers response:', result);
      
      if (result.success) {
        setCustomers(result.customers || result.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching all customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers list",
        variant: "destructive",
      });
    }
  };

  const fetchCustomersBySalesperson = async (salespersonId) => {
    try {
      console.log(`🎯 Fetching customers for salesperson: ${salespersonId}`);
      
      const response = await fetch(`${config.baseURL}/api/customers/salesperson/${salespersonId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('👥 Salesperson customers response:', result);
      
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching customers by salesperson:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers for selected salesperson",
        variant: "destructive",
      });
    }
  };

  const fetchTodaysProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Fetching today\'s products...');
      console.log('Salesman:', selectedSalesman);
      console.log('Customer:', selectedCustomer);
      
      // Build query params - make salesman and customer optional
      const params = new URLSearchParams();
      if (selectedSalesman?._id) params.append('salesmanId', selectedSalesman._id);
      if (selectedCustomer?._id) params.append('customerId', selectedCustomer._id);
      
      const response = await fetch(
        `${config.baseURL}/api/dispatches/todays-products?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Today\'s products response:', result);
      
      if (result.success) {
        setProducts(result.data.products || []);
        // Initialize qtyIssued map with existing values from API
        const initialQtyMap = {};
        const initialSelectedItems = {};
        (result.data.products || []).forEach(product => {
          initialQtyMap[product._id] = product.qtyIssued || '';
          // Auto-select only non-dispatched items
          initialSelectedItems[product._id] = product.status !== 'dispatched';
        });
        setQtyIssuedMap(initialQtyMap);
        setSelectedItems(initialSelectedItems);
        
        // Check if products are already dispatched and set existing DC number
        const productsData = result.data.products || [];
        if (productsData.length > 0) {
          const allDispatched = productsData.every(p => p.status === 'dispatched' && p.dcno);
          if (allDispatched && productsData[0].dcno) {
            // Use existing DC number instead of fetching next
            setDcNumber(productsData[0].dcno);
            setNextDCNumber(productsData[0].dcno);
            console.log('📋 Using existing DC number:', productsData[0].dcno);
          }
        }
        
        console.log('✅ Products loaded:', result.data.products.length);
        console.log('📊 Initial qty map:', initialQtyMap);
      }
    } catch (error) {
      console.error('❌ Error fetching today\'s products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch today's products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQtyIssuedChange = (productId, value) => {
    const product = products.find(p => p._id === productId);
    const numValue = Number(value);
    
    // Validate against indent qty
    if (product && numValue > product.indentQty) {
      toast({
        title: "Validation Error",
        description: `Qty issued cannot exceed indent qty (${product.indentQty})`,
        variant: "destructive",
      });
      return;
    }

    // Update local state immediately
    setQtyIssuedMap(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Auto-save qty issued to API when user finishes entering
  const handleQtyIssuedBlur = async (productId, value) => {
    try {
      if (!value || value === '' || Number(value) <= 0) {
        return; // Don't save empty or zero values
      }

      const product = products.find(p => p._id === productId);
      if (!product) return;

      console.log('💾 Auto-saving qty issued:', { productId, value });

      const response = await fetch(`${config.baseURL}/api/dispatches/update-qty-issued`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispatchId: productId,
          qtyIssued: Number(value)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update qty issued');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Saved",
          description: "Qty issued updated successfully",
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ Error saving qty issued:', error);
      toast({
        title: "Error",
        description: "Failed to save qty issued",
        variant: "destructive",
      });
    }
  };

  const validateDCNumber = async (dcNo) => {
    try {
      const response = await fetch(
        `${config.baseURL}/api/dispatches/validate-dc-number?dcNo=${encodeURIComponent(dcNo)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      return result.isUnique;
    } catch (error) {
      console.error('Error validating DC number:', error);
      return false;
    }
  };

  const handleDispatch = async () => {
    try {
      // Step 1: Validate DC Number
      if (!dcNumber || dcNumber.trim() === '') {
        toast({
          title: "Validation Error",
          description: "DC number is required. Please enter a valid DC number.",
          variant: "destructive",
        });
        return;
      }

      // dcNumber already contains full format like DC017
      const fullDCNumber = dcNumber.trim().toUpperCase();

      // Step 1b: Validate DC Number matches the next available number
      if (nextDCNumber && fullDCNumber !== nextDCNumber) {
        toast({
          title: "Invalid DC Number",
          description: `Please use the next available DC number: ${nextDCNumber}. You entered: ${fullDCNumber}`,
          variant: "destructive",
        });
        return;
      }

      // Step 2: Validate Salesman
      if (!selectedSalesman) {
        toast({
          title: "Validation Error",
          description: "Salesman is required. Please select a salesman from the dropdown.",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Validate Customer
      if (!selectedCustomer) {
        toast({
          title: "Validation Error",
          description: "Customer is required. Please select a customer from the dropdown.",
          variant: "destructive",
        });
        return;
      }

      // Step 4: Validate products exist
      if (products.length === 0) {
        toast({
          title: "Validation Error",
          description: "No products found. Please ensure today's products are loaded for the selected salesman.",
          variant: "destructive",
        });
        return;
      }

      // Step 4b: Check if any items are selected
      const selectedProductIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      if (selectedProductIds.length === 0) {
        toast({
          title: "No Items Selected",
          description: "Please select at least one item to dispatch by checking the checkbox.",
          variant: "destructive",
        });
        return;
      }

      // Step 5: Validate All Qty Issued Fields for SELECTED items only
      const items = [];
      let hasError = false;

      for (const product of products) {
        // Skip if item is not selected
        if (!selectedItems[product._id]) {
          continue;
        }
        
        const qtyIssued = qtyIssuedMap[product._id];
        
        if (!qtyIssued || qtyIssued === '' || Number(qtyIssued) <= 0) {
          toast({
            title: "Validation Error",
            description: `Qty Issued is required for "${product.productName}". Please enter a quantity greater than 0.`,
            variant: "destructive",
          });
          hasError = true;
          break;
        }

        const numQtyIssued = Number(qtyIssued);
        if (numQtyIssued > product.indentQty) {
          toast({
            title: "Validation Error",
            description: `Qty issued (${numQtyIssued}) for "${product.productName}" cannot exceed indent qty (${product.indentQty})`,
            variant: "destructive",
          });
          hasError = true;
          break;
        }

        items.push({
          dispatchId: product._id, // This is the dispatch entry _id
          productId: product.productId || product._id,
          productName: product.productName,
          productGroup: product.productGroup,
          indentQty: product.indentQty,
          qtyIssued: numQtyIssued
        });
      }

      if (hasError) return;

      // Step 6: Check DC number uniqueness
      console.log('🔍 Validating DC number:', fullDCNumber);
      const isUnique = await validateDCNumber(fullDCNumber);
      if (!isUnique) {
        toast({
          title: "DC Number Already Exists",
          description: `DC number "${fullDCNumber}" is already used. Please enter a different number.`,
          variant: "destructive",
        });
        return;
      }

      // Step 7: Create Delivery Challan
      setLoading(true);
      console.log('📤 Creating delivery challan with data:', {
        dcNo: fullDCNumber,
        salesmanId: selectedSalesman._id,
        customerId: selectedCustomer._id,
        items: items
      });

      const response = await fetch(`${config.baseURL}/api/dispatches/create-delivery-challan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dcNo: fullDCNumber,
          salesmanId: selectedSalesman._id,
          customerId: selectedCustomer._id,
          items: items
        })
      });

      const result = await response.json();
      console.log('📥 Response from server:', result);

      if (!response.ok) {
        // Handle different error types with specific messages
        let errorMessage = result.message || 'Failed to create delivery challan';
        
        // If there are validation errors, show them
        if (result.errors && Array.isArray(result.errors)) {
          errorMessage = result.errors.join(', ');
        }
        
        // If item already dispatched
        if (result.alreadyDispatched) {
          errorMessage = `${result.productName || 'One or more items'} already dispatched with DC number ${result.existingDC}. Cannot create duplicate delivery challan.`;
        }
        
        // If it's a stock validation error
        if (result.error && result.error.includes('Closing stock cannot be negative')) {
          errorMessage = 'Cannot dispatch: Insufficient stock available. The closing stock would be negative. Please check inventory levels.';
        }
        
        // If DC number already exists
        if (result.error && result.error.includes('Duplicate')) {
          errorMessage = `DC number ${fullDCNumber} already exists. This delivery challan may have already been dispatched.`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (result.success) {
        setCurrentDCId(result.data.dcId);
        setIsDispatched(true);
        
        toast({
          title: "✅ Dispatch Successful",
          description: `Delivery challan ${fullDCNumber} created successfully with ${items.length} items.`,
        });

        // Lock all fields
        console.log('✅ Dispatch completed. All fields locked.');
      }
    } catch (error) {
      console.error('❌ Error creating delivery challan:', error);
      
      // Show detailed error with proper formatting
      let errorTitle = "❌ Failed to Create Delivery Challan";
      let errorDescription = error.message || "An unexpected error occurred. Please try again.";
      
      // Special handling for stock errors
      if (error.message.includes('stock')) {
        errorTitle = "❌ Insufficient Stock";
      } else if (error.message.includes('already dispatched')) {
        errorTitle = "❌ Already Dispatched";
      } else if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        errorTitle = "❌ Duplicate DC Number";
      } else if (error.message.includes('Validation')) {
        errorTitle = "❌ Validation Error";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds for important errors
      });

    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      // Use currentDCId if available, otherwise use the first product's _id
      const dcIdToUse = currentDCId || (products.length > 0 ? products[0]._id : null);
      const dcNumberToUse = dcNumber || existingDCNumber;
      
      if (!dcIdToUse) {
        toast({
          title: "Error",
          description: "No delivery challan found to generate invoice",
          variant: "destructive",
        });
        return;
      }

      if (!selectedSalesman || !selectedCustomer) {
        toast({
          title: "Error",
          description: "Salesman and customer information required for invoice",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      console.log('📄 Generating invoice for DC:', dcNumberToUse);

      const response = await fetch(`${config.baseURL}/api/dispatches/generate-invoice/${dcIdToUse}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dcNo: dcNumberToUse,
          salesmanId: selectedSalesman._id,
          salesmanName: selectedSalesman.fullName || selectedSalesman.username,
          customerId: selectedCustomer._id,
          customerName: selectedCustomer.name,
          customerCode: selectedCustomer.customerCode,
          items: products.map(p => ({
            productId: p.productId || p._id,
            productName: p.productName,
            productGroup: p.productGroup,
            indentQty: p.indentQty,
            qtyIssued: qtyIssuedMap[p._id] || p.qtyIssued || 0
          }))
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to generate invoice');
      }

      // Check if response is JSON or PDF
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${dcNumberToUse}-${selectedCustomer.name.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "✅ Invoice Generated",
          description: `Invoice for DC ${dcNumberToUse} downloaded successfully`,
        });
      } else {
        // Handle JSON response
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Invoice Generated",
            description: result.message || "Invoice created successfully",
          });
        }
      }
    } catch (error) {
      console.error('❌ Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDcNumber('');
    setSelectedSalesman(null);
    setSelectedCustomer(null);
    setSalesmanSearchTerm('');
    setCustomerSearchTerm('');
    setProducts([]);
    setQtyIssuedMap({});
    setIsDispatched(false);
    setCurrentDCId(null);
    setShowPreview(false);
    setSelectedItems({});
    fetchNextDCNumber(); // Fetch new DC number after reset
    fetchTodaysProducts(); // Fetch today's products after reset
  };

  // Direct Order Creation Functions
  const fetchOrderSalesPersons = async () => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/sales-persons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setOrderSalesPersons(result.data.salesPersons || []);
      }
    } catch (error) {
      console.error('Error fetching sales persons:', error);
    }
  };

  const fetchOrderCustomers = async (salesPersonId = null) => {
    try {
      const url = salesPersonId 
        ? `${config.baseURL}/api/dispatches/customers?salesPersonId=${salesPersonId}`
        : `${config.baseURL}/api/dispatches/customers`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setOrderCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrderProducts = async () => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setOrderProducts(result.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleDirectOrderModalOpen = () => {
    setIsDirectOrderModalOpen(true);
    // Load sales persons and products; use existing customers from main component
    fetchOrderSalesPersons();
    setOrderCustomers(customers); // Use already loaded customers
    fetchOrderProducts();
  };

  const handleProductSelect = (product) => {
    const existingIndex = directOrderForm.selectedProducts.findIndex(p => p._id === product._id);
    if (existingIndex >= 0) {
      const updatedProducts = [...directOrderForm.selectedProducts];
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        quantity: parseInt(updatedProducts[existingIndex].quantity) + 1
      };
      setDirectOrderForm({ ...directOrderForm, selectedProducts: updatedProducts });
    } else {
      setDirectOrderForm({ 
        ...directOrderForm, 
        selectedProducts: [...directOrderForm.selectedProducts, { 
          ...product, 
          quantity: 1,
          price: product.price || product.salePrice || 0
        }] 
      });
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    const updatedProducts = directOrderForm.selectedProducts.map(p =>
      p._id === productId ? { ...p, quantity: parseInt(quantity) || 1 } : p
    );
    setDirectOrderForm({ ...directOrderForm, selectedProducts: updatedProducts });
  };

  const handleProductRemove = (productId) => {
    const updatedProducts = directOrderForm.selectedProducts.filter(p => p._id !== productId);
    setDirectOrderForm({ ...directOrderForm, selectedProducts: updatedProducts });
  };

  const handleCreateDirectOrder = async () => {
    // Validation
    if (!directOrderForm.salesPersonId) {
      toast({
        title: "Validation Error",
        description: "Please select a sales person",
        variant: "destructive"
      });
      return;
    }

    if (!directOrderForm.customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    if (directOrderForm.selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product",
        variant: "destructive"
      });
      return;
    }

    try {
      setDirectOrderLoading(true);

      const orderData = {
        salesPersonId: directOrderForm.salesPersonId,
        customerId: directOrderForm.customerId,
        orderDate: directOrderForm.orderDate,
        notes: directOrderForm.notes,
        products: directOrderForm.selectedProducts.map(p => ({
          productId: p._id,
          quantity: parseInt(p.quantity),
          unitPrice: parseFloat(p.price) || 0
        }))
      };

      console.log('Creating direct order:', orderData);

      const response = await fetch(`${config.baseURL}/api/dispatches/create-direct-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create order');
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Order ${result.order.orderCode} created successfully`,
        });

        // Reset form
        setDirectOrderForm({
          salesPersonId: '',
          customerId: '',
          orderDate: new Date().toISOString().split('T')[0],
          notes: '',
          selectedProducts: []
        });

        setIsDirectOrderModalOpen(false);
        
        // Refresh today's products
        fetchTodaysProducts();
      }
    } catch (error) {
      console.error('Error creating direct order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive"
      });
    } finally {
      setDirectOrderLoading(false);
    }
  };

  const handlePreview = () => {
    // Validation
    if (!dcNumber || dcNumber.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Please enter DC number",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSalesman) {
      toast({
        title: "Validation Error",
        description: "Please select a salesman",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (products.length === 0) {
      toast({
        title: "Validation Error",
        description: "No products available",
        variant: "destructive",
      });
      return;
    }

    // Check if all products have qty issued
    const allQtyFilled = products.every(product => {
      const qty = qtyIssuedMap[product._id];
      return qty && qty !== '' && Number(qty) > 0;
    });

    if (!allQtyFilled) {
      toast({
        title: "Validation Error",
        description: "Please enter qty issued for all products",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(true);
  };

  // Check if products are already dispatched
  const isAlreadyDispatched = products.length > 0 && products.every(product => 
    product.status === 'dispatched' && product.dcno
  );
  
  // Get existing DC number if already dispatched
  const existingDCNumber = isAlreadyDispatched && products.length > 0 ? products[0].dcno : null;

  const filteredSalespeople = salespeople.filter(salesman =>
    (salesman.fullName && salesman.fullName.toLowerCase().includes(salesmanSearchTerm.toLowerCase())) ||
    (salesman.username && salesman.username.toLowerCase().includes(salesmanSearchTerm.toLowerCase()))
  );

  const filteredCustomers = (customers || []).filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.customerCode && customer.customerCode.toLowerCase().includes(customerSearchTerm.toLowerCase()))
  );

  // Debug: Log current state
  console.log('🔍 Current State:', {
    selectedSalesman: selectedSalesman?._id,
    selectedCustomer: selectedCustomer?._id,
    productsCount: products.length,
    qtyIssuedMapKeys: Object.keys(qtyIssuedMap).length,
    loading
  });

  return (
    <div className="p-6 max-w-8xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Challan</h1>
          <p className="text-gray-600 mt-1">Product Groups and Indent Quantities for Today</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDirectOrderModalOpen} variant="default" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Direct Add Order
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Form
          </Button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="border border-gray-800">
        
        {/* Control Row - DC Number, Salesman, Customer, Dispatch, Invoice */}
        <div className="grid grid-cols-5 border-b border-gray-800">
          
          {/* DC Number */}
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              DC Number
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                placeholder="DC017"
                className="w-full text-center font-semibold text-lg"
                value={dcNumber}
                onChange={(e) => setDcNumber(e.target.value.toUpperCase())}
                disabled={isDispatched}
              />
            </div>
            {!isAlreadyDispatched && (
              <div className="text-xs text-blue-600 font-medium text-center mt-1">
                Next DC number - {nextDCNumber || dcNumber}
              </div>
            )}
          </div>
          
          {/* Salesman Dropdown */}
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Salesman Name by Dropdown
            </div>
            <div className="relative dropdown-container">
              <div className="relative">
                <Input
                  placeholder="Search and select salesman"
                  value={salesmanSearchTerm}
                  onChange={(e) => {
                    setSalesmanSearchTerm(e.target.value);
                    setSelectedSalesman(null);
                    setIsSalesmanDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (!selectedSalesman) {
                      setIsSalesmanDropdownOpen(true);
                    }
                  }}
                  className="cursor-pointer"
                  disabled={isDispatched}
                  readOnly={selectedSalesman !== null}
                />
                {selectedSalesman && !isDispatched && (
                  <button
                    onClick={() => {
                      setSelectedSalesman(null);
                      setSalesmanSearchTerm('');
                      setIsSalesmanDropdownOpen(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {isSalesmanDropdownOpen && !isDispatched && !selectedSalesman && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSalespeople.length > 0 ? (
                    filteredSalespeople.map((salesman) => (
                      <div
                        key={salesman._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSelectedSalesman(salesman);
                          setSalesmanSearchTerm(salesman.fullName || salesman.username);
                          setIsSalesmanDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{salesman.fullName || salesman.username}</div>
                        {salesman.email && (
                          <div className="text-xs text-gray-500">{salesman.email}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-center">
                      No salespeople found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Dropdown */}
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Customer Name by dropdown search
            </div>
            <div className="relative dropdown-container">
              <Input
                placeholder="Select customer"
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                className="cursor-pointer"
                disabled={isDispatched}
              />
              {isCustomerDropdownOpen && !isDispatched && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearchTerm(`${customer.name} ${customer.customerCode ? `(${customer.customerCode})` : ''}`);
                          setIsCustomerDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        {customer.customerCode && (
                          <div className="text-xs text-gray-500">Code: {customer.customerCode}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500 text-center">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dispatch Button */}
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Dispatch Action
            </div>
            <Button 
              className={`w-full text-sm ${
                isAlreadyDispatched || isDispatched 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={handleDispatch}
              disabled={loading || isDispatched || isAlreadyDispatched || !dcNumber || !selectedSalesman || !selectedCustomer || products.length === 0}
            >
              <Truck className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : (isDispatched || isAlreadyDispatched) ? 'Already Dispatched' : 'Dispatch'}
            </Button>
           
          </div>

          {/* Invoice Button */}
          <div className="p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Generate Invoice
            </div>
            <Button 
              className={`w-full text-sm ${
                (isDispatched || isAlreadyDispatched) && selectedSalesman && selectedCustomer
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              onClick={handleGenerateInvoice}
              disabled={loading || (!isDispatched && !isAlreadyDispatched) || !selectedSalesman || !selectedCustomer}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Invoice'}
            </Button>
          </div>
        </div>

        {/* Product Table */}
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-3 bg-yellow-300 border-b border-gray-800">
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Product Name / Product Group
            </div>
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Indent Qty
            </div>
            <div className="p-3 text-center font-medium">
              Qty Issued
            </div>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <div>Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <div>No products found for today</div>
            </div>
          ) : (
            products.map((product) => {
              const isItemDispatched = product.status === 'dispatched';
              return (
                <div key={product._id} className="grid grid-cols-3 border-b border-gray-800 hover:bg-gray-50">
                  {/* Product Name with Checkbox */}
                  <div className="border-r border-gray-800 p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 cursor-pointer flex-shrink-0"
                      checked={selectedItems[product._id] || false}
                      onChange={(e) => {
                        setSelectedItems(prev => ({
                          ...prev,
                          [product._id]: e.target.checked
                        }));
                      }}
                      disabled={isDispatched || isItemDispatched}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                        {product.productGroup && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {product.productGroup}
                          </Badge>
                        )}
                        {isItemDispatched && (
                          <span className="text-xs text-green-600 font-medium">
                            Dispatched
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-r border-gray-800 p-3 text-center flex items-center justify-center">
                    <Badge variant="outline" className="bg-green-50 text-green-700 text-lg">
                      {product.indentQty}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <Input
                      type="number"
                      placeholder="Enter qty"
                      className="text-center"
                      min="0"
                      max={product.indentQty}
                      value={qtyIssuedMap[product._id] || ''}
                      onChange={(e) => handleQtyIssuedChange(product._id, e.target.value)}
                      onBlur={(e) => handleQtyIssuedBlur(product._id, e.target.value)}
                      disabled={isDispatched}
                    />
                  {qtyIssuedMap[product._id] && Number(qtyIssuedMap[product._id]) > product.indentQty && (
                    <div className="text-xs text-red-600 mt-1 text-center">
                      Cannot exceed indent qty
                    </div>
                  )}
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <h2 className="text-xl font-bold">Delivery Challan Preview</h2>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="hover:bg-blue-700 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* DC Number Display */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-blue-600 font-medium mb-1">Delivery Challan Number</div>
                  <div className="text-3xl font-bold text-blue-900">
                    {dcNumber}
                  </div>
                </div>
              </div>

              {/* Customer & Salesman Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Salesman</div>
                  <div className="font-bold text-lg">{selectedSalesman?.fullName || selectedSalesman?.username}</div>
                  {selectedSalesman?.email && (
                    <div className="text-sm text-gray-500">{selectedSalesman.email}</div>
                  )}
                </div>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Customer</div>
                  <div className="font-bold text-lg">{selectedCustomer?.name}</div>
                  {selectedCustomer?.customerCode && (
                    <div className="text-sm text-gray-500">Code: {selectedCustomer.customerCode}</div>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-yellow-200">
                    <tr>
                      <th className="border-b border-gray-300 p-3 text-left">Product Name / Group</th>
                      <th className="border-b border-gray-300 p-3 text-center">Indent Qty</th>
                      <th className="border-b border-gray-300 p-3 text-center">Qty Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border-b border-gray-200 p-3">
                          <div className="font-medium">{product.productName}</div>
                          {product.productGroup && (
                            <div className="text-sm text-blue-600 mt-1">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {product.productGroup}
                              </Badge>
                            </div>
                          )}
                        </td>
                        <td className="border-b border-gray-200 p-3 text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 text-base">
                            {product.indentQty}
                          </Badge>
                        </td>
                        <td className="border-b border-gray-200 p-3 text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-base font-bold">
                            {qtyIssuedMap[product._id]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Total Products</div>
                    <div className="text-2xl font-bold text-gray-900">{products.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Indent Qty</div>
                    <div className="text-2xl font-bold text-green-700">
                      {products.reduce((sum, p) => sum + (p.indentQty || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Qty Issued</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {products.reduce((sum, p) => sum + (Number(qtyIssuedMap[p._id]) || 0), 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowPreview(false);
                    handleDispatch();
                  }}
                  disabled={loading || isDispatched}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Proceed to Dispatch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Direct Add Order Modal */}
      <Dialog open={isDirectOrderModalOpen} onOpenChange={setIsDirectOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Direct Add Order
            </DialogTitle>
            <DialogDescription>
              Create a new order directly from dispatch. Fill in the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sales Person Selection */}
            <div>
              <Label htmlFor="salesPerson" className="text-sm font-medium">Sales Person *</Label>
              <Select
                value={directOrderForm.salesPersonId}
                onValueChange={(value) => {
                  setDirectOrderForm({ ...directOrderForm, salesPersonId: value });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  {orderSalesPersons.map((person) => (
                    <SelectItem key={person._id} value={person._id}>
                      {person.fullName || person.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection */}
            <div>
              <Label htmlFor="customer" className="text-sm font-medium">Customer Name by dropdown search *</Label>
              <Select
                value={directOrderForm.customerId}
                onValueChange={(value) => setDirectOrderForm({ ...directOrderForm, customerId: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {orderCustomers.length > 0 ? (
                    orderCustomers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} {customer.customerCode ? `(${customer.customerCode})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading customers...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Order Date */}
            <div>
              <Label htmlFor="orderDate" className="text-sm font-medium">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={directOrderForm.orderDate}
                onChange={(e) => setDirectOrderForm({ ...directOrderForm, orderDate: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Product Selection */}
            <div>
              <Label className="text-sm font-medium">Select Products *</Label>
              <div className="mt-1">
                {orderProducts.length > 0 ? (
                  <ProductSelector
                    onProductSelect={handleProductSelect}
                    selectedProducts={directOrderForm.selectedProducts}
                    onQuantityChange={handleQuantityChange}
                    onProductRemove={handleProductRemove}
                    customProducts={orderProducts}
                  />
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Loading products...
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions or notes..."
                value={directOrderForm.notes}
                onChange={(e) => setDirectOrderForm({ ...directOrderForm, notes: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDirectOrderModalOpen(false);
                  setDirectOrderForm({
                    salesPersonId: '',
                    customerId: '',
                    orderDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    selectedProducts: []
                  });
                }}
                disabled={directOrderLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDirectOrder}
                disabled={directOrderLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {directOrderLoading ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}