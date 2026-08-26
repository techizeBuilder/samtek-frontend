import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
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
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('dispatches', 'deliveryChallan', 'add');
  const canEdit = hasFeatureAccess('dispatches', 'deliveryChallan', 'edit');
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
  const [selectedItems, setSelectedItems] = useState({}); // Track which items are selected for dispatch
  const [expandedGroup, setExpandedGroup] = useState({}); // Track which product groups are expanded

  // Item history (last 30 days) for "Individual Items" expansion
  const [itemsHistoryByGroup, setItemsHistoryByGroup] = useState({});
  const [itemsHistoryLoadingByGroup, setItemsHistoryLoadingByGroup] = useState({});

  // Confirmation dialog for updating dispatched items
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [pendingQtyUpdate, setPendingQtyUpdate] = useState(null);

  // Direct Order Creation State
  const [isDirectOrderModalOpen, setIsDirectOrderModalOpen] = useState(false);
  const [directOrderLoading, setDirectOrderLoading] = useState(false);
  const [orderSalesPersons, setOrderSalesPersons] = useState([]);
  const [orderCustomers, setOrderCustomers] = useState([]);
  const [orderProducts, setOrderProducts] = useState([]);
  
  const [todayOrderItems, setTodayOrderItems] = useState([]);
  const [todayOrderItemsLoading, setTodayOrderItemsLoading] = useState(false);
  const [directOrderForm, setDirectOrderForm] = useState({
    salesPersonId: '',
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
    selectedProducts: []
  });

  // Invoice Generation State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    dcNo: '',
    salesPersonId: ''
  });
  const [invoiceSalesPersons, setInvoiceSalesPersons] = useState([]);

  useEffect(() => {
    fetchSalespeople();
    fetchAllCustomers(); // Load all customers on mount
    fetchTodaysProducts(); // Load all today's products on mount
  }, []);

  // When salesperson changes, just reset customer selection
  // Keep showing ALL customers (no filtering by salesperson)
  useEffect(() => {
    // Reset expanded rows + history cache when filters change
    setExpandedGroup({});
    setItemsHistoryByGroup({});
    setItemsHistoryLoadingByGroup({});

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

  useEffect(() => {
    setExpandedGroup({});
    setItemsHistoryByGroup({});
    setItemsHistoryLoadingByGroup({});
  }, [selectedCustomer?._id]);

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

  // Next DC number functionality removed: DC numbering is managed server-side and must be unique per company

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

  const fetchTodaysProducts = async (overrideSalesman, overrideCustomer) => {
    try {
      setLoading(true);
      
      // Use override values if provided, otherwise use state
      const salesmanToUse = overrideSalesman !== undefined ? overrideSalesman : selectedSalesman;
      const customerToUse = overrideCustomer !== undefined ? overrideCustomer : selectedCustomer;
      
      console.log('📦 Fetching today\'s products...');
      console.log('Salesman:', salesmanToUse);
      console.log('Customer:', customerToUse);
      
      // Build query params - make salesman and customer optional
      const params = new URLSearchParams();
      if (salesmanToUse?._id) params.append('salesmanId', salesmanToUse._id);
      if (customerToUse?._id) params.append('customerId', customerToUse._id);
      
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
            // Use existing DC number when all items already dispatched
            setDcNumber(productsData[0].dcno);
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

  const fetchItemsHistoryForGroup = async (groupId, items) => {
    try {
      const itemIds = (items || [])
        .map(i => i?.itemId)
        .filter(Boolean)
        .map(id => String(id));

      if (itemIds.length === 0) return;

      setItemsHistoryLoadingByGroup(prev => ({
        ...prev,
        [groupId]: true
      }));

      const params = new URLSearchParams();
      params.append('itemIds', itemIds.join(','));
      params.append('days', '30');
      if (selectedSalesman?._id) params.append('salesmanId', selectedSalesman._id);
      if (selectedCustomer?._id) params.append('customerId', selectedCustomer._id);

      const response = await fetch(`${config.baseURL}/api/dispatches/items-history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      setItemsHistoryByGroup(prev => ({
        ...prev,
        [groupId]: result?.data?.items || {}
      }));
    } catch (error) {
      console.error('❌ Error fetching items history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch items history (last 30 days)',
        variant: 'destructive'
      });
    } finally {
      setItemsHistoryLoadingByGroup(prev => ({
        ...prev,
        [groupId]: false
      }));
    }
  };

  const handleQtyIssuedChange = (productId, value) => {
    // Always allow the value to be entered
    // Validation will happen on blur with confirmation if needed
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
          qtyIssued: Number(value),
          indentQty: product.indentQty, // Send indent qty for validation
          forceUpdate: false // Initially request without force
        })
      });

      const result = await response.json();

      // Handle confirmation requirement (dispatched items OR exceeds indent qty)
      if (response.status === 409 && result.requiresConfirmation) {
        setPendingQtyUpdate({
          productId,
          value: Number(value),
          message: result.message,
          currentStatus: result.currentStatus,
          currentQtyIssued: result.currentQtyIssued,
          newQtyIssued: result.newQtyIssued,
          indentQty: result.indentQty,
          exceedsIndent: result.exceedsIndent
        });
        setShowUpdateConfirmation(true);
        return;
      }

      if (!response.ok || !result.success) {
        // Show specific error message from backend
        toast({
          title: "Error",
          description: result.message || "Failed to save qty issued",
          variant: "destructive",
        });
        return;
      }

      if (result.success) {
        toast({
          title: "Saved",
          description: result.wasForced 
            ? "Qty issued updated (with override)"
            : "Qty issued updated successfully",
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ Error saving qty issued:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save qty issued",
        variant: "destructive",
      });
    }
  };

  // Confirm and proceed with qty update for dispatched item
  const handleConfirmQtyUpdate = async () => {
    if (!pendingQtyUpdate) return;

    try {
      console.log('✅ Forcing qty update for dispatched item:', pendingQtyUpdate);

      const response = await fetch(`${config.baseURL}/api/dispatches/update-qty-issued`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispatchId: pendingQtyUpdate.productId,
          qtyIssued: pendingQtyUpdate.value,
          forceUpdate: true // Force update for dispatched items
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to update qty issued",
          variant: "destructive",
        });
        return;
      }

      if (result.success) {
        toast({
          title: "✅ Updated",
          description: "Qty issued updated successfully for dispatched item",
          duration: 3000
        });

        // Refresh products to show updated data
        await fetchTodaysProducts();
      }
    } catch (error) {
      console.error('❌ Error updating qty issued:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update qty issued",
        variant: "destructive",
      });
    } finally {
      setShowUpdateConfirmation(false);
      setPendingQtyUpdate(null);
    }
  };

  // Cancel qty update
  const handleCancelQtyUpdate = () => {
    // Revert the input value to original
    if (pendingQtyUpdate) {
      setQtyIssuedMap(prev => ({
        ...prev,
        [pendingQtyUpdate.productId]: pendingQtyUpdate.currentQtyIssued
      }));
    }
    setShowUpdateConfirmation(false);
    setPendingQtyUpdate(null);
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

      // Step 1b: DC numbering is managed server-side; only uniqueness is validated later

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

        // Lock all fields and refresh data to show updated state
        console.log('✅ Dispatch completed. All fields locked.');
        
        // Refresh data to show fresh dispatch state
        await fetchTodaysProducts();
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
    setSelectedItems({});
    // next DC number no longer fetched from server
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

  // Fetch today's order items when sales person and customer are selected
  useEffect(() => {
    const fetchTodayOrderItems = async () => {
      if (!directOrderForm.salesPersonId || !directOrderForm.customerId) {
        setTodayOrderItems([]);
        return;
      }

      try {
        setTodayOrderItemsLoading(true);
        const response = await fetch(
          `${config.baseURL}/api/dispatches/today-order-items?salesPersonId=${directOrderForm.salesPersonId}&customerId=${directOrderForm.customerId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const result = await response.json();
        if (result.success) {
          setTodayOrderItems(result.data.items || []);
        } else {
          setTodayOrderItems([]);
        }
      } catch (error) {
        console.error('Error fetching today order items:', error);
        setTodayOrderItems([]);
      } finally {
        setTodayOrderItemsLoading(false);
      }
    };

    fetchTodayOrderItems();
  }, [directOrderForm.salesPersonId, directOrderForm.customerId]);

  const handleDirectOrderModalOpen = async () => {
    setIsDirectOrderModalOpen(true);
    // Load sales persons and products; use existing customers from main component
    fetchOrderSalesPersons();
    setOrderCustomers(customers); // Use already loaded customers
    fetchOrderProducts();
    
    // Next DC number endpoint removed; server assigns unique DC per company
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

      // Check for existing order for this sales person + customer + today
      console.log('Checking for existing order...');
      const checkResponse = await fetch(
        `${config.baseURL}/api/orders/check-existing?salesPersonId=${directOrderForm.salesPersonId}&customerId=${directOrderForm.customerId}&orderDate=${directOrderForm.orderDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const checkResult = await checkResponse.json();

      if (checkResult.success && checkResult.data.exists) {
        // Order already exists for this sales person + customer + today
        toast({
          title: "Order Already Exists",
          description: "This customer already has an order for today. Please update the existing order instead of creating a new one.",
          variant: "destructive",
          duration: 5000
        });
        setDirectOrderLoading(false);
        return;
      }

      const orderData = {
        salesPersonId: directOrderForm.salesPersonId,
        customerId: directOrderForm.customerId,
        orderDate: directOrderForm.orderDate,
        notes: directOrderForm.notes,
        products: directOrderForm.selectedProducts.map(p => ({
          productId: p._id,
          quantity: parseInt(p.quantity),
          unitPrice: parseFloat(p.price) || 0
        })),
        autoDispatch: true // Flag to indicate direct dispatch
      };

      console.log('Creating and dispatching direct order:', orderData);

      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      // Retry logic for duplicate DC number errors
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`${config.baseURL}/api/dispatches/create-direct-order`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
          });

          const result = await response.json();

          // Check for duplicate DC number error
          if (!response.ok && response.status === 409 && result.error?.includes('DC number')) {
            console.log(`⚠️ Duplicate DC number detected, retrying... (Attempt ${attempts + 1}/${maxAttempts})`);
            attempts++;
            lastError = new Error(result.message || 'Duplicate DC number');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            continue;
          }

          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to create and dispatch order');
          }

          if (result.success) {
            toast({
              title: "✅ Dispatch Successful",
              description: `Order ${result.order.orderCode} created and dispatched successfully with DC No: ${result.dcNo || 'Generated'}`,
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
            
            // Refresh all data to show fresh dispatch
            await Promise.all([
              fetchTodaysProducts()
            ]);
            
            return; // Success, exit the function
          }
        } catch (error) {
          lastError = error;
          break; // Exit retry loop for non-duplicate errors
        }
      }

      // If we get here, all retries failed
      throw lastError || new Error('Failed to create and dispatch order after multiple attempts');
    } catch (error) {
      console.error('Error creating and dispatching direct order:', error);
      toast({
        title: "❌ Dispatch Failed",
        description: error.message || "Failed to create and dispatch order",
        variant: "destructive"
      });
    } finally {
      setDirectOrderLoading(false);
    }
  };

  // Invoice Modal Handlers
  const handleInvoiceModalOpen = async () => {
    try {
      // Reset invoice form and sales persons
      setInvoiceForm({
        dcNo: '',
        salesPersonId: ''
      });
      setInvoiceSalesPersons([]);
      
      setIsInvoiceModalOpen(true);
      
      // Fetch salespeople for invoice
      const response = await fetch(`${config.baseURL}/api/dispatches/sales-persons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📋 Invoice sales persons response:', result);
        if (result.success && Array.isArray(result.data)) {
          setInvoiceSalesPersons(result.data);
        } else {
          setInvoiceSalesPersons([]);
        }
      } else {
        setInvoiceSalesPersons([]);
      }

    } catch (error) {
      console.error('Error opening invoice modal:', error);
      setInvoiceSalesPersons([]);
      toast({
        title: "Error",
        description: "Failed to open invoice modal",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvoiceByDC = async () => {
    try {
      if (!invoiceForm.dcNo || invoiceForm.dcNo.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Please enter DC Number",
          variant: "destructive"
        });
        return;
      }

      setInvoiceLoading(true);

      const response = await fetch(`${config.baseURL}/api/dispatches/generate-invoice-by-dc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceForm)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to generate invoice');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceForm.dcNo}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Invoice Generated",
        description: `Invoice for DC ${invoiceForm.dcNo} has been generated successfully`,
      });

      // Close modal and reset
      setIsInvoiceModalOpen(false);
      setInvoiceForm({
        dcNo: '',
        salesPersonId: ''
      });

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "❌ Invoice Generation Failed",
        description: error.message || "Failed to generate invoice",
        variant: "destructive"
      });
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Preview feature removed — dispatch proceeds directly from the form

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
    <div className="p-2 sm:p-4 md:p-6 max-w-8xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Delivery Challan</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Product Groups and Indent Quantities for Today</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {canAdd && (
            <Button onClick={handleDirectOrderModalOpen} variant="default" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm flex-1 sm:flex-none">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Dispatch Order</span>
              <span className="sm:hidden">Dispatch Order</span>
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleInvoiceModalOpen} variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm flex-1 sm:flex-none">
              <span className="hidden sm:inline">Generate Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" disabled={loading} className="text-xs sm:text-sm flex-1 sm:flex-none">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        
        {/* Control Row - DC Number, Salesman, Customer, Dispatch, Invoice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-b border-gray-800">
          
          {/* DC Number */}
          <div className="border-b sm:border-r border-gray-800 p-2 sm:p-3 bg-gray-50">
            <div className="text-center font-medium text-xs sm:text-sm mb-2">
              DC Number
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                placeholder="DC017"
                className="w-full text-center font-semibold text-base sm:text-lg"
                value={dcNumber}
                onChange={(e) => setDcNumber(e.target.value.toUpperCase())}
                disabled={isDispatched}
              />
            </div>
            {/* Next DC number removed — numbering will be assigned server-side */}
          </div>
          
          {/* Salesman Dropdown */}
          <div className="border-b sm:border-b-0 lg:border-r border-gray-800 p-2 sm:p-3 bg-gray-50">
            <div className="text-center font-medium text-xs sm:text-sm mb-2">
              <span className="hidden sm:inline">Salesman Name by Dropdown</span>
              <span className="sm:hidden">Salesman</span>
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
                      // Fetch latest data after clearing salesman filter - pass null to override
                      fetchTodaysProducts(null, selectedCustomer);
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
          <div className="border-b sm:border-r lg:border-r border-gray-800 p-2 sm:p-3 bg-gray-50">
            <div className="text-center font-medium text-xs sm:text-sm mb-2">
              <span className="hidden sm:inline">Customer Name by dropdown search</span>
              <span className="sm:hidden">Customer</span>
            </div>
            <div className="relative dropdown-container">
              <div className="relative">
                <Input
                  placeholder="Select customer"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setSelectedCustomer(null);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (!selectedCustomer) {
                      setIsCustomerDropdownOpen(true);
                    }
                  }}
                  className="cursor-pointer"
                  disabled={isDispatched}
                  readOnly={selectedCustomer !== null}
                />
                {selectedCustomer && !isDispatched && (
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchTerm('');
                      setIsCustomerDropdownOpen(true);
                      // Fetch latest data after clearing customer filter - pass null to override
                      fetchTodaysProducts(selectedSalesman, null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {isCustomerDropdownOpen && !isDispatched && !selectedCustomer && (
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
          <div className="border-b sm:border-b-0 sm:border-r lg:border-r border-gray-800 p-2 sm:p-3 bg-gray-50">
            <div className="text-center font-medium text-xs sm:text-sm mb-2">
              <span className="hidden sm:inline">Dispatch Action</span>
              <span className="sm:hidden">Dispatch</span>
            </div>
            <Button 
              className={`w-full text-xs sm:text-sm ${
                isAlreadyDispatched || isDispatched 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={handleDispatch}
              disabled={loading || isDispatched || isAlreadyDispatched || !dcNumber || !selectedSalesman || !selectedCustomer || products.length === 0}
            >
              <Truck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{loading ? 'Processing...' : (isDispatched || isAlreadyDispatched) ? 'Already Dispatched' : 'Dispatch'}</span>
              <span className="sm:hidden">{loading ? '...' : (isDispatched || isAlreadyDispatched) ? 'Done' : 'Send'}</span>
            </Button>
           
          </div>

          {/* Invoice Button */}
          <div className="p-2 sm:p-3 bg-gray-50">
            <div className="text-center font-medium text-xs sm:text-sm mb-2">
              <span className="hidden sm:inline">Generate Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </div>
            <Button 
              className={`w-full text-xs sm:text-sm ${
                (isDispatched || isAlreadyDispatched) && selectedSalesman && selectedCustomer
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              onClick={handleGenerateInvoice}
              disabled={loading || (!isDispatched && !isAlreadyDispatched) || !selectedSalesman || !selectedCustomer}
            >
              {loading ? 'Generating...' : 'Invoice'}
            </Button>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-3 bg-yellow-300 border-b border-gray-800 min-w-[600px]">
            <div className="border-r border-gray-800 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
              <span className="hidden sm:inline">Product Name / Product Group</span>
              <span className="sm:hidden">Product</span>
            </div>
            <div className="border-r border-gray-800 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
              Stock / Batch
            </div>
            {/* <div className="border-r border-gray-800 p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
              Indent Qty
            </div> */}
            <div className="p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
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
              const effectiveItems = Array.isArray(product.items) && product.items.length > 0
                ? product.items
                : (product.productId
                    ? [{
                        itemId: product.productId,
                        productName: product.productName,
                        batch: product.batchNo ?? null,
                        stock: product.totalAvailableStock ?? 0,
                        qtyIssued: product.qtyIssued ?? 0,
                        status: product.status,
                        totalAvailableStock: product.totalAvailableStock ?? 0
                      }]
                    : []);
              const hasItems = effectiveItems.length > 0;
              
              return (
                <div key={product._id} className="border-b border-gray-800">
                  {/* Main Row */}
                  <div className="grid grid-cols-3 hover:bg-gray-50 min-w-[600px]">
                    {/* Product Name with Checkbox */}
                    <div className="border-r border-gray-800 p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer flex-shrink-0"
                        checked={selectedItems[product._id] || false}
                        onChange={(e) => {
                          setSelectedItems(prev => ({
                            ...prev,
                            [product._id]: e.target.checked
                          }));
                        }}
                        disabled={isDispatched || isItemDispatched}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate sm:whitespace-normal">{product.productName}</div>
                        <div className="text-xs sm:text-sm text-blue-600 mt-1 flex items-center gap-1 sm:gap-2 flex-wrap">
                          {product.productGroup && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {product.productGroup}
                            </Badge>
                          )}
                          {product.salesPerson && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              👤 {product.salesPerson.fullName || product.salesPerson.username}
                            </Badge>
                          )}
                          {isItemDispatched && product.dcno && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 font-semibold border-green-300">
                              📋 {product.dcno}
                            </Badge>
                          )}
                          {isItemDispatched && (
                            <Badge variant="outline" className="bg-green-50 text-green-600 font-medium">
                              ✓ Dispatched
                            </Badge>
                          )}
                          {hasItems && (
                            <button
                              onClick={() => {
                                const willOpen = !expandedGroup[product._id];

                                setExpandedGroup(prev => ({
                                  ...prev,
                                  [product._id]: !prev[product._id]
                                }));

                                if (willOpen && !itemsHistoryLoadingByGroup[product._id] && !itemsHistoryByGroup[product._id]) {
                                  fetchItemsHistoryForGroup(product._id, effectiveItems);
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              {expandedGroup[product._id] ? 'Hide' : 'Show'} {effectiveItems.length} items
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Stock / Batch Column - Show totalItemBatch */}
                    <div className="border-r border-gray-800 p-2 sm:p-3 text-center flex flex-col items-center justify-center gap-1">
                      {product.totalItemBatch !== undefined && product.totalItemBatch !== null ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 text-sm sm:text-lg font-bold">
                          Total: {product.totalItemBatch}
                        </Badge>
                      ) : product.batchNo ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                          Stock: {product.batchNo}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </div>
                    <div className="p-2 sm:p-3">
                      <Input
                        type="number"
                        placeholder="Enter qty"
                        className="text-center text-sm sm:text-base"
                        min="0"
                        value={qtyIssuedMap[product._id] || ''}
                        onChange={(e) => handleQtyIssuedChange(product._id, e.target.value)}
                        onBlur={(e) => handleQtyIssuedBlur(product._id, e.target.value)}
                        disabled={isDispatched}
                      />
                    </div>
                  </div>
                  
                  {/* Expanded Items List */}
                  {expandedGroup[product._id] && hasItems && (
                    <div className="bg-gray-50 border-t border-gray-300">
                      <div className="px-6 py-2">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Individual Items:
                          {itemsHistoryLoadingByGroup[product._id] && (
                            <span className="ml-2 text-gray-400 font-normal">Loading last 30 days...</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="grid grid-cols-4 gap-2 px-2 py-1 text-[11px] font-semibold text-gray-600">
                            <div>Item Name</div>
                            <div className="text-center">Stock/Batch</div>
                            <div className="text-center">Qty Issued</div>
                            <div className="text-right">Date</div>
                          </div>

                          {effectiveItems.flatMap((item) => {
                            const itemIdStr = String(item?.itemId || '');
                            const history = itemsHistoryByGroup[product._id]?.[itemIdStr];
                            const records = Array.isArray(history?.records) ? history.records : [];

                            if (itemsHistoryLoadingByGroup[product._id]) {
                              return [
                                <div key={`${itemIdStr}-loading`} className="grid grid-cols-4 gap-2 items-center text-sm py-1 px-2 bg-white rounded border border-gray-200">
                                  <span className="font-medium text-gray-700 truncate">{item.productName}</span>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                                      Stock/Batch: ...
                                    </Badge>
                                  </div>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                                      Qty Issued: ...
                                    </Badge>
                                  </div>
                                  <div className="text-right text-xs text-gray-500">...</div>
                                </div>
                              ];
                            }

                            if (records.length === 0) {
                              return [
                                <div key={`${itemIdStr}-empty`} className="grid grid-cols-4 gap-2 items-center text-sm py-1 px-2 bg-white rounded border border-gray-200">
                                  <span className="font-medium text-gray-700 truncate">{item.productName}</span>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                                      Stock/Batch: {item.batch || 'N/A'}
                                    </Badge>
                                  </div>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                                      Qty Issued: —
                                    </Badge>
                                  </div>
                                  <div className="text-right text-xs text-gray-500">No history</div>
                                </div>
                              ];
                            }

                            return records.map((rec, recIdx) => {
                              const dateValue = rec?.date;
                              const d = dateValue ? new Date(dateValue) : null;
                              const dateLabel = d && !Number.isNaN(d.getTime())
                                ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '—';

                              const stockValue = rec?.totalAvailableStock ?? item.stock ?? 0;
                              const batchValue = rec?.batchNo ?? item.batch ?? 'N/A';

                              return (
                                <div key={`${itemIdStr}-${recIdx}`} className="grid grid-cols-4 gap-2 items-center text-sm py-1 px-2 bg-white rounded border border-gray-200">
                                  <span className="font-medium text-gray-700 truncate">{item.productName}</span>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                                      Stock/Batch: {stockValue} / {batchValue}
                                    </Badge>
                                  </div>
                                  <div className="text-center">
                                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                                      Qty Issued: {rec?.qtyIssued ?? 0}
                                    </Badge>
                                  </div>
                                  <div className="text-right text-xs text-gray-600">{dateLabel}</div>
                                </div>
                              );
                            });
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            );
            })
          )}
        </div>
      </div>

      {/* Preview feature removed */}
      
      {/* Direct Add Order Modal */}
      <Dialog open={isDirectOrderModalOpen} onOpenChange={setIsDirectOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Create Dispatch Order
            </DialogTitle>
            <DialogDescription>
              Create a new order and automatically add it to dispatch. Fill in the details below.
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

            {/* Today's Order Items Section */}
            {directOrderForm.salesPersonId && directOrderForm.customerId && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold text-blue-900">Today's Order Items</Label>
                </div>
                
                {todayOrderItemsLoading ? (
                  <div className="text-center py-4 text-gray-600">
                    <div className="animate-pulse">Loading order items...</div>
                  </div>
                ) : todayOrderItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="text-left py-2 px-2 font-medium text-blue-900">Item Name</th>
                          <th className="text-left py-2 px-2 font-medium text-blue-900">Code</th>
                          <th className="text-left py-2 px-2 font-medium text-blue-900">Category</th>
                          <th className="text-right py-2 px-2 font-medium text-blue-900">Indent Qty</th>
                          <th className="text-right py-2 px-2 font-medium text-blue-900">Batch</th>
                          <th className="text-right py-2 px-2 font-medium text-blue-900">Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayOrderItems.map((item, index) => (
                          <tr key={index} className="border-b border-blue-100 hover:bg-blue-100">
                            <td className="py-2 px-2 text-gray-800">{item.name}</td>
                            <td className="py-2 px-2 text-gray-700">{item.code}</td>
                            <td className="py-2 px-2 text-gray-700">{item.category}</td>
                            <td className="py-2 px-2 text-right text-gray-800 font-medium">
                              {item.indentQty} {item.unit}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-800 font-medium">
                              {item.batch}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-800 font-medium">
                              ₹{item.orderValue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-100 font-semibold">
                          <td colSpan="3" className="py-2 px-2 text-right text-blue-900">
                            Total:
                          </td>
                          <td className="py-2 px-2 text-right text-blue-900">
                            {todayOrderItems.reduce((sum, item) => sum + (parseFloat(item.indentQty) || 0), 0)} pieces
                          </td>
                          <td className="py-2 px-2 text-right text-blue-900">
                            {todayOrderItems.reduce((sum, item) => sum + (parseFloat(item.batch) || 0), 0)}
                          </td>
                          <td className="py-2 px-2 text-right text-blue-900">
                            ₹{todayOrderItems.reduce((sum, item) => sum + item.orderValue, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-600">
                    No orders placed today for this customer by this sales person.
                  </div>
                )}
              </div>
            )}

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

            {/* Next DC number removed — numbering will be assigned server-side */}

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
                className="bg-green-600 hover:bg-green-700"
              >
                {directOrderLoading ? 'Dispatching...' : 'Create & Dispatch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Generation Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Enter DC Number to generate invoice. Optionally select a sales person.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* DC Number */}
            <div>
              <Label htmlFor="invoiceDcNo" className="text-sm font-medium">DC Number *</Label>
              <Input
                id="invoiceDcNo"
                placeholder="Enter DC Number (e.g., DC001)"
                value={invoiceForm.dcNo}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dcNo: e.target.value.toUpperCase() })}
                className="mt-1"
              />
            </div>

            {/* Sales Person (Optional) */}
            {/* <div>
              <Label htmlFor="invoiceSalesPerson" className="text-sm font-medium">Sales Person (Optional)</Label>
              <Select
                value={invoiceForm.salesPersonId}
                onValueChange={(value) => setInvoiceForm({ ...invoiceForm, salesPersonId: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None (Use Original)" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(invoiceSalesPersons) && invoiceSalesPersons.length > 0 ? (
                    invoiceSalesPersons.map((person) => (
                      <SelectItem key={person._id} value={person._id}>
                        {person.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-sales-person" disabled>
                      No sales persons available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the original sales person from the order
              </p>
            </div> */}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setInvoiceForm({
                    dcNo: '',
                    salesPersonId: ''
                  });
                }}
                disabled={invoiceLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateInvoiceByDC}
                disabled={invoiceLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {invoiceLoading ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Qty Update Confirmation Dialog for Dispatched Items */}
      {showUpdateConfirmation && pendingQtyUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-yellow-500 text-white p-4 rounded-t-lg flex items-center gap-3">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Confirm Quantity Update</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                {pendingQtyUpdate.message}
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {pendingQtyUpdate.currentStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <Badge variant="outline" className={
                      pendingQtyUpdate.currentStatus === 'dispatched' 
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-blue-100 text-blue-700 border-blue-300'
                    }>
                      {pendingQtyUpdate.currentStatus}
                    </Badge>
                  </div>
                )}
                {pendingQtyUpdate.indentQty !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Indent Qty:</span>
                    <span className="text-lg font-semibold text-green-700">{pendingQtyUpdate.indentQty}</span>
                  </div>
                )}
                {pendingQtyUpdate.currentQtyIssued !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Current Qty:</span>
                    <span className="text-lg font-bold text-gray-900">{pendingQtyUpdate.currentQtyIssued}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">New Qty:</span>
                  <span className={`text-lg font-bold ${
                    pendingQtyUpdate.exceedsIndent ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {pendingQtyUpdate.newQtyIssued}
                  </span>
                </div>
              </div>

              <div className={`border rounded-lg p-3 text-sm ${
                pendingQtyUpdate.exceedsIndent 
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                <strong>⚠️ Warning:</strong> {
                  pendingQtyUpdate.exceedsIndent
                    ? 'This quantity exceeds the indent quantity. Excess qty may not be needed.'
                    : 'This will recalculate stock values for an already dispatched item.'
                }
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 bg-gray-50 rounded-b-lg">
              <Button
                variant="outline"
                onClick={handleCancelQtyUpdate}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmQtyUpdate}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Yes, Update Qty
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}