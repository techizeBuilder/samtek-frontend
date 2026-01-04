import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  FileText,
  RefreshCw,
  Truck,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { config } from '@/config/environment';

export default function DeliveryChallan() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dcPrefix] = useState('DC-');
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

  useEffect(() => {
    fetchSalespeople();
    fetchTodaysProducts(); // Load all today's products on mount
  }, []);

  // Fetch customers when salesperson is selected
  useEffect(() => {
    if (selectedSalesman) {
      fetchCustomersBySalesperson(selectedSalesman._id);
      // Reset customer when salesman changes
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
      setProducts([]);
      setQtyIssuedMap({});
    } else {
      setCustomers([]);
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
      setProducts([]);
      setQtyIssuedMap({});
    }
  }, [selectedSalesman]);

  // Fetch products when customer is selected (optional filter)
  useEffect(() => {
    if (selectedSalesman || selectedCustomer) {
      fetchTodaysProducts(); // Re-fetch with filters
    }
  }, [selectedCustomer]);

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
        (result.data.products || []).forEach(product => {
          initialQtyMap[product._id] = product.qtyIssued || '';
        });
        setQtyIssuedMap(initialQtyMap);
        
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
        `${config.baseURL}/api/dispatches/validate-dc-number?dcNo=${dcNo}`,
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
          description: "Please enter DC number",
          variant: "destructive",
        });
        return;
      }

      const fullDCNumber = `${dcPrefix}${dcNumber}`;

      // Check DC number uniqueness
      const isUnique = await validateDCNumber(fullDCNumber);
      if (!isUnique) {
        toast({
          title: "Validation Error",
          description: "DC number already exists. Please use a different number.",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Validate Salesman
      if (!selectedSalesman) {
        toast({
          title: "Validation Error",
          description: "Please select a salesman",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Validate Customer
      if (!selectedCustomer) {
        toast({
          title: "Validation Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }

      // Step 4: Validate All Qty Issued Fields
      const items = [];
      let hasError = false;

      for (const product of products) {
        const qtyIssued = qtyIssuedMap[product._id];
        
        if (!qtyIssued || qtyIssued === '' || Number(qtyIssued) <= 0) {
          toast({
            title: "Validation Error",
            description: `Please enter qty issued for ${product.productName}`,
            variant: "destructive",
          });
          hasError = true;
          break;
        }

        const numQtyIssued = Number(qtyIssued);
        if (numQtyIssued > product.indentQty) {
          toast({
            title: "Validation Error",
            description: `Qty issued for ${product.productName} cannot exceed indent qty (${product.indentQty})`,
            variant: "destructive",
          });
          hasError = true;
          break;
        }

        items.push({
          productId: product.productId || product._id,
          productName: product.productName,
          productGroup: product.productGroup,
          indentQty: product.indentQty,
          qtyIssued: numQtyIssued
        });
      }

      if (hasError) return;

      // Step 5: Create Delivery Challan
      setLoading(true);

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

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to create delivery challan');
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentDCId(result.data.dcId);
        setIsDispatched(true);
        
        toast({
          title: "Dispatch Successful",
          description: `Delivery challan ${fullDCNumber} created successfully`,
        });

        // Lock all fields
        console.log('✅ Dispatch completed. All fields locked.');
      }
    } catch (error) {
      console.error('❌ Error creating delivery challan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create delivery challan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      if (!currentDCId) {
        toast({
          title: "Error",
          description: "No delivery challan found to generate invoice",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const response = await fetch(`${config.baseURL}/api/dispatches/generate-invoice/${currentDCId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
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
        a.download = `invoice-${dcPrefix}${dcNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Invoice Generated",
          description: "Invoice PDF downloaded successfully",
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
  };

  const filteredSalespeople = salespeople.filter(salesman =>
    (salesman.fullName && salesman.fullName.toLowerCase().includes(salesmanSearchTerm.toLowerCase())) ||
    (salesman.username && salesman.username.toLowerCase().includes(salesmanSearchTerm.toLowerCase()))
  );

  const filteredCustomers = customers.filter(customer =>
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
        <Button onClick={handleReset} variant="outline" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Form
        </Button>
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
                className="w-16 text-center bg-gray-100 font-semibold cursor-not-allowed"
                value={dcPrefix}
                readOnly
                disabled
              />
              <Input
                type="number"
                placeholder="016"
                className="flex-1 text-center font-semibold"
                value={dcNumber}
                onChange={(e) => setDcNumber(e.target.value)}
                disabled={isDispatched}
              />
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              Enter numeric DC number
            </div>
          </div>
          
          {/* Salesman Dropdown */}
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Salesman Name by Dropdown
            </div>
            <div className="relative dropdown-container">
              <Input
                placeholder="Search and select salesman"
                value={salesmanSearchTerm}
                onChange={(e) => {
                  setSalesmanSearchTerm(e.target.value);
                  setIsSalesmanDropdownOpen(true);
                }}
                onFocus={() => setIsSalesmanDropdownOpen(true)}
                className="cursor-pointer"
                disabled={isDispatched}
              />
              {isSalesmanDropdownOpen && !isDispatched && (
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
                disabled={!selectedSalesman || isDispatched}
              />
              {isCustomerDropdownOpen && !isDispatched && selectedSalesman && (
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              onClick={handleDispatch}
              disabled={loading || isDispatched || !dcNumber || !selectedSalesman || !selectedCustomer || products.length === 0}
            >
              <Truck className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : isDispatched ? 'Dispatched' : 'Dispatch'}
            </Button>
          </div>

          {/* Invoice Button */}
          <div className="p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Generate Invoice
            </div>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-sm"
              onClick={handleGenerateInvoice}
              disabled={loading || !isDispatched}
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
            products.map((product) => (
              <div key={product._id} className="grid grid-cols-3 border-b border-gray-800 hover:bg-gray-50">
                <div className="border-r border-gray-800 p-3">
                  <div className="font-medium">{product.productName}</div>
                  <div className="text-sm text-blue-600 mt-1">
                    {product.productGroup && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {product.productGroup}
                      </Badge>
                    )}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}