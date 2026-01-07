import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ArrowRight, Package, User, Settings, Clock, TrendingUp, AlertTriangle, BarChart, Filter, Search, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config/environment';

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const SalesApproval = () => {
  const [orders, setOrders] = useState([]); // Product-grouped data for grid
  const [individualOrders, setIndividualOrders] = useState([]); // Individual orders for status counting
  const [products, setProducts] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductOrders, setSelectedProductOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  // Date filter restored
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Production calculation states
  const [productionData, setProductionData] = useState({});
  // Structure: { productName: { packing: 0, physicalStock: 0, batchAdjusted: 0, qtyPerBatch: 0, toBeProducedDay: 0 } }
  
  // Approval status states
  const [summaryStatusData, setSummaryStatusData] = useState({});
  // Structure: { productName: { status: 'pending' | 'approved', summaryId: 'id' } }
  
  // Bulk approve states
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [approvingProducts, setApprovingProducts] = useState(new Set()); // Track which products are being approved
  const [bulkApproving, setBulkApproving] = useState(false); // Separate state for bulk operations
  
  // Debouncing states for input fields
  const [inputValues, setInputValues] = useState({}); // Store temporary input values
  const [saveTimers, setSaveTimers] = useState({}); // Store timers for each field
  
  // Date filter handler
  const handleDateChange = (newDate) => {
    console.log('📅 Date changed to:', newDate);
    setLoading(true);
    setSelectedDate(newDate);
    // fetchData will be triggered by useEffect when selectedDate changes
  };

  // Clear date filter and set to current date
  const clearDateFilter = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    console.log('🗑️ Clearing date filter, setting to current date:', currentDate);
    handleDateChange(currentDate);
  };

  // Set to today's date
  const setToday = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    console.log('📅 Setting to today:', currentDate);
    handleDateChange(currentDate);
  };

  const { toast } = useToast();
  
  // Debug logs for component re-rendering
  console.log('🎯 SalesApproval render - summaryStatusData:', summaryStatusData);
  console.log('🎯 SalesApproval render - products count:', products.length);
  console.log('🎯 Current timestamp:', new Date().toISOString());

  // Initialize production data for a product
  const initializeProductionData = (productName) => {
    if (!productionData[productName]) {
      setProductionData(prev => ({
        ...prev,
        [productName]: {
          packing: 0,
          physicalStock: 0,
          batchAdjusted: 0,
          qtyPerBatch: 0, // Default value changed to 0
          toBeProducedDay: 0
        }
      }));
    }
  };

  // Debounced refresh to avoid too many API calls
  const debouncedRefresh = useCallback(
    debounce(async () => {
      console.log('🔄 Performing debounced data refresh...');
      await refreshProductionData(selectedDate);
      await loadSummaryStatusData();
    }, 1000), // Wait 1 second after last update before refreshing
    [selectedDate] // Include selectedDate to avoid stale closure
  );

  // Quick refresh function for immediate UI feedback
  const quickRefreshAfterUpdate = async (productName, description) => {
    try {
      // Show immediate success feedback
      toast({
        title: 'Success',
        description: description
      });
      
      // Trigger debounced refresh to get latest data
      debouncedRefresh();
      
    } catch (error) {
      console.error('Error in quick refresh:', error);
    }
  };

  // Get production data with fallback values
  const getProductionData = (productName) => {
    return productionData[productName] || {
      packing: 0,
      physicalStock: 0,
      batchAdjusted: 0,
      qtyPerBatch: 0,
      toBeProducedDay: 0
    };
  };
  
  // Get input value for display (shows user input or saved value)
  const getInputValue = (productName, field) => {
    const inputKey = `${productName}_${field}`;
    // Always show the stored input value if it exists (user is typing)
    if (inputValues[inputKey] !== undefined) {
      return inputValues[inputKey];
    }
    // Otherwise show the saved production data value
    const data = getProductionData(productName);
    const value = data[field];
    // Convert 0 to empty string for better UX
    return value === 0 ? '' : value.toString();
  };

  // Handle input blur - clean up temporary input value and save
  const handleInputBlur = (productName, field) => {
    const inputKey = `${productName}_${field}`;
    
    console.log(`💾 Saving ${productName}.${field} on blur`);
    
    // Get the current input value and parse it
    const currentInputValue = inputValues[inputKey];
    if (currentInputValue !== undefined) {
      const numValue = currentInputValue === '' ? 0 : parseFloat(currentInputValue);
      const finalValue = isNaN(numValue) ? 0 : numValue;
      
      // Update production data with final parsed value
      setProductionData(prev => ({
        ...prev,
        [productName]: {
          ...prev[productName],
          [field]: finalValue
        }
      }));
    }
    
    // Save the current data to backend
    saveProductionData(productName);
    
    // Clear the temporary input value so it shows the saved value
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[inputKey];
      return newValues;
    });
  };

  // Update production data field - only update input display, no calculations during typing
  const updateProductionField = (productName, field, value) => {
    console.log(`📝 Input: ${productName}.${field} = ${value}`);
    
    // Store the raw input value immediately for display (no parsing, no calculations)
    const inputKey = `${productName}_${field}`;
    setInputValues(prev => ({
      ...prev,
      [inputKey]: value // Keep the raw string value for smooth typing
    }));
    
    // No timers, no calculations during typing - only update display
    // All calculations and saves happen on blur
  };

  // Individual approve function
  const handleIndividualApprove = async (productName) => {
    console.log('🔴 APPROVE BUTTON CLICKED for product:', productName);
    console.log('📊 Available products:', products.map(p => ({ name: p.productName, id: p.productId, _id: p._id })));
    
    // Find the product in the current data to get its productId
    let product = products.find(p => p.productName === productName);
    
    // If not found in products, check in the raw API data (summaryStatusData might have more info)
    if (!product) {
      console.log('🔍 Product not found in products array, checking API data...');
      console.log('❌ Available products:', products.map(p => p.productName));
      toast({
        title: 'Product Not Found',
        description: `Product ${productName} not found in current data. Please refresh the page.`,
        variant: 'warning'
      });
      return;
    }
    
    if (!product || !product.productId) {
      console.log('❌ Product details:', { product, productName, allProducts: products.length });
      toast({
        title: 'No Product Found',
        description: `Product ${productName} not found or missing productId`,
        variant: 'warning'
      });
      return;
    }
    
    // Extract productId - we need the actual product ID, not the daily summary ID
    let actualProductId;
    if (typeof product.productId === 'string') {
      actualProductId = product.productId;
    } else if (typeof product.productId === 'object' && product.productId._id) {
      actualProductId = product.productId._id;  // This is the key fix
    } else {
      console.log('❌ Invalid productId structure:', product.productId);
      toast({
        title: 'Invalid Product Data',
        description: `Invalid productId structure for ${productName}`,
        variant: 'warning'
      });
      return;
    }

    try {
      // Add this product to approving state
      setApprovingProducts(prev => new Set([...prev, productName]));
      
      console.log(`🚀 Making API call for:`, productName);
      console.log('🔍 Product found:', product);
      console.log('📧 Extracted productId:', actualProductId);
      
      // Get selected date for the update (not current date)
      console.log('📅 Using selected date for update:', selectedDate);
      
      // Extract orderIds from salesBreakdown
      const orderIds = product.salesBreakdown && product.salesBreakdown.length > 0
        ? product.salesBreakdown.flatMap(sb => sb.orderIds || [])
        : [];
      
      const requestBody = {
        date: selectedDate,
        productId: actualProductId,
        updates: {
          status: 'approved'
        },
        orderIds: orderIds,
        dailyDetailsId: product.dailyDetailsId || null
      };
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      // Use the sales update API to approve the product
      const response = await fetch(`${config.baseURL}/api/sales/update-product-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', [...response.headers.entries()]);

      const responseText = await response.text();
      console.log('📡 Raw response:', responseText);

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse response as JSON:', parseError);
          throw new Error('Invalid response format from server');
        }
        console.log('✅ API Success:', result);
        
        // Update local state immediately for better UX
        setSummaryStatusData(prev => ({
          ...prev,
          [productName]: {
            ...prev[productName],
            status: 'approved'
          }
        }));
        
        toast({
          title: 'Success',
          description: result.message || `Approved ${productName} successfully`
        });
        
        // Auto-refresh data to show latest values without manual refresh
        console.log('🔄 Auto-refreshing data after approval...');
        await refreshProductionData(selectedDate);
        await loadSummaryStatusData();
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${responseText}` };
        }
        console.log('❌ API Error Response:', errorData);
        console.log('❌ API Error Status:', response.status);
        console.log('❌ API Error Status Text:', response.statusText);
        toast({
          title: 'Approval Failed',
          description: errorData.message || `Failed to approve ${productName}: ${response.status}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('💥 Error approving product:', error);
      console.error('💥 Error stack:', error.stack);
      toast({
        title: 'Error',
        description: `Network error while approving ${productName}: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      // Remove this product from approving state
      setApprovingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productName);
        return newSet;
      });
    }
  };

  // Bulk approve selected products
  const handleBulkApprove = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select products to approve',
        variant: 'warning'
      });
      return;
    }

    try {
      setBulkApproving(true);
      
      const selectedProductNames = Array.from(selectedProducts);
      console.log('🔄 Bulk approving products:', selectedProductNames);

      // Use selected date for the updates (not current date)
      console.log('📅 Using selected date for bulk approval:', selectedDate);
      
      // Prepare bulk approval payload with all products in one request
      const productSummariesToApprove = selectedProductNames.map((productName) => {
        const product = products.find(p => p.productName === productName);
        
        if (!product || !product.productId) {
          throw new Error(`Product ${productName} not found or missing productId`);
        }

        // Extract productId - we need the actual product ID, not the daily summary ID
        let actualProductId;
        if (typeof product.productId === 'string') {
          actualProductId = product.productId;
        } else if (typeof product.productId === 'object' && product.productId._id) {
          actualProductId = product.productId._id;  // This is the key fix
        } else {
          throw new Error(`Invalid productId structure for ${productName}`);
        }

        // Get production data from either productionData or fallback to product data
        const productionInfo = productionData[productName] || {};
        const batchAdjusted = productionInfo.batchAdjusted || product.batchAdjusted || 0;  // Default to 0, not 1
        const qtyPerBatch = productionInfo.qtyPerBatch || product.qtyPerBatch || 1;
        const physicalStock = productionInfo.physicalStock || product.physicalStock || 0;
        const packing = productionInfo.packing || product.packing || 0;
        const toBeProducedDay = productionInfo.toBeProducedDay || product.toBeProducedDay || 0;
        const produceBatches = productionInfo.produceBatches || product.produceBatches || 0;
        
        // Extract orderIds from salesBreakdown
        const orderIds = product.salesBreakdown && product.salesBreakdown.length > 0
          ? product.salesBreakdown.flatMap(sb => sb.orderIds || [])
          : [];
        
        console.log(`📦 Bulk approve ${productName} with production data:`, {
          batchAdjusted,
          qtyPerBatch,
          physicalStock,
          packing,
          toBeProducedDay,
          produceBatches,
          dailyDetailsId: product.dailyDetailsId,
          orderIds
        });

        return {
          productId: actualProductId,
          productName: productName,
          batchAdjusted: batchAdjusted,
          qtyPerBatch: qtyPerBatch,
          physicalStock: physicalStock,
          packing: packing,
          toBeProducedDay: toBeProducedDay,
          produceBatches: produceBatches,
          orderIds: orderIds,
          dailyDetailsId: product.dailyDetailsId || null
        };
      });

      // Make SINGLE API call for bulk approval
      const response = await fetch(`${config.baseURL}/api/unit-manager/approve-product-summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: selectedDate,
          productSummaries: productSummariesToApprove
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const bulkResult = await response.json();
      console.log('✅ Bulk approval completed:', bulkResult);

      // Update local state for all approved products
      if (bulkResult.success) {
        const successCount = bulkResult.summary?.successful || 0;
        const totalBatchesCreated = bulkResult.summary?.totalBatchesCreated || 0;
        
        setSummaryStatusData(prev => {
          const newData = { ...prev };
          selectedProductNames.forEach(productName => {
            if (newData[productName]) {
              newData[productName] = {
                ...newData[productName],
                status: 'approved'
              };
            }
          });
          return newData;
        });
        
        toast({
          title: 'Bulk Approval Success',
          description: `Successfully approved ${successCount} products and created ${totalBatchesCreated} production batches`
        });
        
        setSelectedProducts(new Set());
        setIsAllSelected(false);
        
        // Auto-refresh data to show latest values without manual refresh
        console.log('🔄 Auto-refreshing data after bulk approval...');
        await refreshProductionData(selectedDate);
        await loadSummaryStatusData();
      } else {
        toast({
          title: 'Bulk Approval Failed',
          description: bulkResult.message || 'An error occurred during bulk approval',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('💥 Error bulk approving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Network error during bulk approval',
        variant: 'destructive'
      });
    } finally {
      setBulkApproving(false);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productName) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productName)) {
      newSelected.delete(productName);
    } else {
      newSelected.add(productName);
    }
    setSelectedProducts(newSelected);
    setIsAllSelected(newSelected.size === filteredProducts.length && filteredProducts.length > 0);
  };

  // Toggle all products selection
  const toggleAllSelection = () => {
    if (isAllSelected) {
      setSelectedProducts(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.productName)));
      setIsAllSelected(true);
    }
  };

  // Save production data with specific field value
  const saveProductionDataWithValue = async (productName, field, value) => {
    try {
      const product = orders.find(p => p.productName === productName);
      if (!product) {
        console.error(`❌ Product not found for: ${productName}`);
        return;
      }

      // Get current data and override the specific field with the new value
      const currentData = getProductionData(productName);
      const updatedData = { ...currentData, [field]: value };
      
      const physicalStock = Number(updatedData.physicalStock) || 0;
      const batchAdjusted = Number(updatedData.batchAdjusted) || 0;
      const qtyPerBatch = Number(updatedData.qtyPerBatch) || 1;
      
      console.log(`🔥 FORCE SAVE ${productName}.${field}=${value} | physicalStock=${physicalStock}, batchAdjusted=${batchAdjusted}, qtyPerBatch=${qtyPerBatch}`);
      console.log(`📅 Using selected date for force save: ${selectedDate}`);
      
      const productionFinalBatches = parseFloat((batchAdjusted * qtyPerBatch).toFixed(2));
      const totalIndentSalesman = product.totalQuantity || 0;
      const toBeProducedDay = Math.max(0, totalIndentSalesman - physicalStock);
      const produceBatches = parseFloat((toBeProducedDay / qtyPerBatch).toFixed(2));

      // Extract orderIds from salesBreakdown
      const orderIds = product.salesBreakdown && product.salesBreakdown.length > 0
        ? product.salesBreakdown.flatMap(sb => sb.orderIds || [])
        : [];

      const apiPayload = {
        date: selectedDate,
        productId: product.productId || product._id,
        updates: {
          productionFinalBatches: productionFinalBatches,
          physicalStock: physicalStock,
          batchAdjusted: batchAdjusted,
          qtyPerBatch: qtyPerBatch,
          toBeProducedDay: toBeProducedDay,
          produceBatches: produceBatches,
          status: 'pending'  // Auto-reset status to pending when any field changes
        },
        orderIds: orderIds
      };
      
      console.log(`🔥 EXACT API PAYLOAD:`, JSON.stringify(apiPayload, null, 2));

      const response = await fetch(`${config.baseURL}/api/sales/update-product-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('📡 Save response status:', response.status);
      console.log('📡 Save response headers:', [...response.headers.entries()]);

      const responseText = await response.text();
      console.log('📡 Save raw response:', responseText);

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse save response:', parseError);
          throw new Error('Invalid response format from server');
        }
        console.log(`✅ SAVED ${productName}.${field}=${value}:`, result.data);
        
        // Update local state with ALL values from backend response
        if (result.data) {
          setProductionData(prev => ({
            ...prev,
            [productName]: {
              ...prev[productName],
              physicalStock: result.data.physicalStock || 0,
              batchAdjusted: result.data.batchAdjusted || 0,
              qtyPerBatch: result.data.qtyPerBatch || 0,
              toBeProducedDay: result.data.toBeProducedDay || 0,
              productionFinalBatches: result.data.productionFinalBatches || 0,
              produceBatches: result.data.produceBatches || 0,
              expiryShortage: result.data.expiryShortage || 0,
              toBeProducedBatches: result.data.toBeProducedBatches || 0,
              totalIndent: result.data.totalIndent || 0
            }
          }));
        }

        // Update status data if available
        if (result.data?.status) {
          setSummaryStatusData(prev => ({
            ...prev,
            [productName]: {
              ...prev[productName],
              status: result.data.status,
              summaryId: result.data._id || prev[productName]?.summaryId
            }
          }));
        }

        // Show success toast with status reset notification
        toast({
          title: 'Field Updated',
          description: `${field} updated for ${productName}. Status reset to pending for re-approval.`
        });
        
        // Auto-refresh data to show latest values without manual refresh
        console.log('🔄 Auto-refreshing data after field update...');
        await refreshProductionData(selectedDate);
        await loadSummaryStatusData();
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${responseText}` };
        }
        console.error('❌ Save failed:', errorData);
        throw new Error(errorData.message || `Failed to save ${field}`);
      }
    } catch (error) {
      console.error('Error saving with value:', error);
      console.error('Error stack:', error.stack);
      toast({
        title: 'Update Failed',
        description: `Failed to update ${field} for ${productName}: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Save production data to backend
  const saveProductionData = async (productName) => {
    try {
      const product = orders.find(p => p.productName === productName);
      if (!product) {
        console.error(`❌ Product not found for: ${productName}`);
        return;
      }

      // FIXED: Get current values directly from input state and production data
      const savedData = getProductionData(productName);
      
      // Check for any pending input values and use them instead
      const physicalStockInput = inputValues[`${productName}_physicalStock`];
      const batchAdjustedInput = inputValues[`${productName}_batchAdjusted`];
      const qtyPerBatchInput = inputValues[`${productName}_qtyPerBatch`];
      
      const physicalStock = physicalStockInput !== undefined ? 
        Number(physicalStockInput) || 0 : Number(savedData.physicalStock) || 0;
      const batchAdjusted = batchAdjustedInput !== undefined ? 
        Number(batchAdjustedInput) || 0 : Number(savedData.batchAdjusted) || 0;
      const qtyPerBatch = qtyPerBatchInput !== undefined ? 
        Number(qtyPerBatchInput) || 1 : Number(savedData.qtyPerBatch) || 1;
      
      console.log(`🚀 Saving ${productName}: physicalStock=${physicalStock}, batchAdjusted=${batchAdjusted}, qtyPerBatch=${qtyPerBatch}`);
      console.log(`📝 Input values used: physicalStock="${physicalStockInput}", batchAdjusted="${batchAdjustedInput}", qtyPerBatch="${qtyPerBatchInput}"`);
      console.log(`📅 Using selected date for update: ${selectedDate}`);

      // Calculate dependent fields
      const productionFinalBatches = parseFloat((batchAdjusted * qtyPerBatch).toFixed(2));
      const totalIndentSalesman = product.totalQuantity || 0;
      const toBeProducedDay = Math.max(0, totalIndentSalesman - physicalStock);

      // Auto-calculate dependent values
      const produceBatches = parseFloat((toBeProducedDay / qtyPerBatch).toFixed(2));

      // Extract orderIds from salesBreakdown
      const orderIds = product.salesBreakdown && product.salesBreakdown.length > 0
        ? product.salesBreakdown.flatMap(sb => sb.orderIds || [])
        : [];

      const apiPayload = {
        date: selectedDate,
        productId: product.productId || product._id,
        updates: {
          productionFinalBatches: productionFinalBatches,
          physicalStock: physicalStock,  // Use parsed value
          batchAdjusted: batchAdjusted,  // Use parsed value
          qtyPerBatch: qtyPerBatch,      // Use parsed value
          toBeProducedDay: toBeProducedDay,
          produceBatches: produceBatches,
          status: 'pending'  // Auto-reset status to pending when any field changes
        },
        orderIds: orderIds
      };
      
      console.log(`🚀 API Payload for ${productName}:`, apiPayload);

      const response = await fetch(`${config.baseURL}/api/sales/update-product-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('📡 Production save response status:', response.status);
      const responseText = await response.text();
      console.log('📡 Production save raw response:', responseText);

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse production save response:', parseError);
          throw new Error('Invalid response format from server');
        }
        console.log('Production data saved with calculations:', result);
        console.log('Status from API response:', result.data?.status);

        // Update local state with ALL values from backend response (including calculations)
        if (result.data) {
          setProductionData(prev => ({
            ...prev,
            [productName]: {
              ...prev[productName],
              physicalStock: result.data.physicalStock || 0,
              batchAdjusted: result.data.batchAdjusted || 0,
              qtyPerBatch: result.data.qtyPerBatch || 0,
              toBeProducedDay: result.data.toBeProducedDay || 0,
              productionFinalBatches: result.data.productionFinalBatches || 0,
              produceBatches: result.data.produceBatches || 0,
              expiryShortage: result.data.expiryShortage || 0,
              toBeProducedBatches: result.data.toBeProducedBatches || 0,
              totalIndent: result.data.totalIndent || 0
            }
          }));
        }

        // IMPORTANT: Update status data when production data changes
        if (result.data?.status) {
          setSummaryStatusData(prev => ({
            ...prev,
            [productName]: {
              ...prev[productName],
              status: result.data.status,
              summaryId: result.data._id || prev[productName]?.summaryId
            }
          }));
          console.log(`✅ Status updated to '${result.data.status}' for ${productName}`);
        }

        // Clear any pending input values since we got fresh data from backend
        setInputValues(prev => {
          const newInputValues = { ...prev };
          ['physicalStock', 'batchAdjusted', 'qtyPerBatch'].forEach(field => {
            delete newInputValues[`${productName}_${field}`];
          });
          return newInputValues;
        });

        console.log(`🔄 Updated production data for ${productName}:`, result.summary);

        // Show success toast notification
        toast({
          title: 'Success',
          description: `Production data saved successfully for ${productName}`,
          variant: 'default'
        });

        // Auto-refresh data to show latest values without manual refresh
        console.log('🔄 Auto-refreshing data after production save...');
        await refreshProductionData(selectedDate);
        await loadSummaryStatusData();
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${responseText}` };
        }
        console.error('❌ Production save failed:', errorData);
        throw new Error(errorData.message || 'Failed to save production data');
      }
    } catch (error) {
      console.error('Error saving production data:', error);
      console.error('Error stack:', error.stack);
      toast({
        title: 'Error',
        description: `Failed to save production data: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Calculate Production with final batches = Batch_Adjusted * Qty_per_Batch
  const getProductionWithFinalBatches = (productName) => {
    const data = getProductionData(productName);
    const batchAdjusted = data.batchAdjusted || 0;
    const qtyPerBatch = data.qtyPerBatch || 1;
    return parseFloat((batchAdjusted * qtyPerBatch).toFixed(2));
  };

  // Calculate Expiry/Shortage = Production_with_final_batches - To_be_produced_day
  const getExpiryShortage = (productName) => {
    const data = getProductionData(productName);
    // Use backend-calculated value if available, otherwise calculate
    if (data.expiryShortage !== undefined) {
      return data.expiryShortage;
    }
    const productionWithFinalBatches = getProductionWithFinalBatches(productName);
    return parseFloat((productionWithFinalBatches - data.toBeProducedDay).toFixed(2));
  };

  // Calculate Produce / Batches = Frontend "To be Prod./Day" / qtyPerBatch  
  const getProduceBatches = (productName) => {
    const productData = orders.find(p => p.productName === productName);
    const totalQuantity = productData ? productData.totalQuantity : 0;
    const data = getProductionData(productName);
    const physicalStock = data.physicalStock || 0;
    const qtyPerBatch = data.qtyPerBatch || 1;
    
    // Use SAME calculation as "To be Prod./Day" column - frontend calculated value
    const toBeProducedDay = Math.max(0, totalQuantity - physicalStock);
    
    // Produce / Batches = frontend toBeProducedDay / qtyPerBatch
    if (qtyPerBatch === 0) return 0;
    const result = toBeProducedDay / qtyPerBatch;
    return parseFloat(result.toFixed(2));
  };

  // Get Batch Adjusted - user entered value
  const getBatchAdjusted = (productName) => {
    const data = getProductionData(productName);
    return data.batchAdjusted || 0;
  };

  // Calculate To be produced/Batches = To_be_produced_day / Qty_per_Batch
  const getToBeProducedBatches = (productName) => {
    const data = getProductionData(productName);
    // Use backend-calculated value if available, otherwise calculate
    if (data.toBeProducedBatches !== undefined) {
      return data.toBeProducedBatches;
    }
    if (data.qtyPerBatch === 0) return 0;
    return parseFloat((data.toBeProducedDay / data.qtyPerBatch).toFixed(2)); // Round to 2 decimals
  };

  // Filter and search functions
  const applyFilters = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    const currentDate = new Date().toISOString().split('T')[0];
    setSelectedDate(currentDate);
    setFilteredProducts(products);
    // Data will be refreshed by useEffect when selectedDate changes
  };

  // Apply filters when search term or products change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, products]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [saveTimers]);

  // Filter orders by date range
  const filterOrdersByDate = (orders) => {
    if (!dateFrom && !dateTo) return orders;

    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
  };

  // Load production summary status data
  const loadSummaryStatusData = async (filterDate = null) => {
    console.log('🔄 Loading summary status data...');
    // Date filter restored
    const targetDate = filterDate || selectedDate;
    console.log('📅 Loading data for date:', targetDate);
    
    try {
      // Build URL with date parameter
      const url = new URL(`${config.baseURL}/api/sales/product-summary`);
      // Date filter restored
      if (targetDate) {
        url.searchParams.append('date', targetDate);
      }
      
      console.log('🔗 API URL (with date filter):', url.toString());
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('📡 Summary status API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Summary status API result:', result);
        
        if (result.success) {
          const newStatusData = {};
          let allProducts = [];
          
          // Process production groups
          if (result.productionGroups && result.productionGroups.length > 0) {
            console.log('🏭 Processing production groups:', result.productionGroups.length);
            
            result.productionGroups.forEach(group => {
              console.log(`📦 Group: ${group.groupName} (${group.products.length} products)`);
              group.products.forEach(product => {
                allProducts.push(product);
                newStatusData[product.productName] = {
                  status: product.status || 'pending',
                  summaryId: product._id || null,
                  category: product.productId?.category || 'Unknown Category',
                  subCategory: product.productId?.subCategory || '',
                  productionGroup: {
                    groupId: group.groupId,
                    groupName: group.groupName,
                    groupDescription: group.groupDescription
                  }
                };
              });
            });
          }
          
          // Process ungrouped products
          if (result.ungroupedProducts && result.ungroupedProducts.length > 0) {
            console.log('🔄 Processing ungrouped products:', result.ungroupedProducts.length);
            result.ungroupedProducts.forEach(product => {
              allProducts.push(product);
              newStatusData[product.productName] = {
                status: product.status || 'pending',
                summaryId: product._id || null,
                category: product.productId?.category || 'Unknown Category',
                subCategory: product.productId?.subCategory || '',
                productionGroup: null // No production group - won't show any tag
              };
            });
          }
          
          setSummaryStatusData(newStatusData);
          console.log('✅ Summary status data loaded:', newStatusData);
          console.log(`📊 Total products processed: ${allProducts.length}`);
        }
      } else {
        console.log('❌ Summary status API failed with status:', response.status);
        console.log('No summary status data found, using defaults');
      }
    } catch (error) {
      console.error('💥 Error loading summary status data:', error);
    }
  };

  // Get summary status for a product
  const getSummaryStatus = (productName) => {
    return summaryStatusData[productName]?.status || 'pending';
  };

  // Get summary ID for a product
  const getSummaryId = (productName) => {
    return summaryStatusData[productName]?.summaryId || null;
  };

  // Get production group info for a product
  const getProductionGroup = (productName) => {
    return summaryStatusData[productName]?.productionGroup || null;
  };

  // Get production group name for display
  const getProductionGroupName = (productName) => {
    const group = getProductionGroup(productName);
    return group?.groupName || 'Unknown Group';
  };

  // Get product category for display
  const getProductCategory = (productName) => {
    // Get category from summaryStatusData which includes the product API response
    const productInfo = summaryStatusData[productName];
    return productInfo?.category || 'Unknown Category';
  };

  // Get product subcategory for display
  const getProductSubCategory = (productName) => {
    const productInfo = summaryStatusData[productName];
    return productInfo?.subCategory || '';
  };

  // Refresh production data from backend
  const refreshProductionData = async (filterDate = null) => {
    console.log('🔄 Refreshing production data from backend...');
    try {
      // Use selected date for refresh
      const targetDate = filterDate || selectedDate;
      const url = new URL(`${config.baseURL}/api/sales/product-summary`);
      if (targetDate) {
        url.searchParams.append('date', targetDate);
      }
      
      console.log('🔗 Refreshing from URL:', url.toString());
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          let allProducts = [];
          
          // Process production groups
          if (result.productionGroups && result.productionGroups.length > 0) {
            result.productionGroups.forEach(group => {
              group.products.forEach(product => {
                allProducts.push(product);
              });
            });
          }
          
          // Process ungrouped products
          if (result.ungroupedProducts && result.ungroupedProducts.length > 0) {
            result.ungroupedProducts.forEach(product => {
              allProducts.push(product);
            });
          }
          
          // Update production data with fresh backend values
          const newProductionData = {};
          allProducts.forEach(product => {
            newProductionData[product.productName] = {
              packing: product.packing || 0,
              physicalStock: product.physicalStock || 0,
              batchAdjusted: product.batchAdjusted || 0,
              qtyPerBatch: product.qtyPerBatch || 1,
              toBeProducedDay: product.toBeProducedDay || 0,
              productionFinalBatches: product.productionFinalBatches || 0,
              produceBatches: product.produceBatches || 0,
              totalIndent: product.totalIndent || 0,
              toBeProducedBatches: product.toBeProducedBatches || 0,
              expiryShortage: product.expiryShortage || 0
            };
          });
          
          setProductionData(newProductionData);
          console.log('✅ Production data refreshed with latest backend values:', newProductionData);
        }
      }
    } catch (error) {
      console.error('Error refreshing production data:', error);
    }
  };

  // Load production summary data
  const loadProductionSummary = async (filterDate = null) => {
    try {
      // Use selected date for loading
      const targetDate = filterDate || selectedDate;
      const url = new URL(`${config.baseURL}/api/sales/product-summary`);
      if (targetDate) {
        url.searchParams.append('date', targetDate);
      }
      
      console.log('🔗 Loading from URL:', url.toString());
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // NEW: Handle the updated API response structure with productionGroups and ungroupedProducts
          let allProducts = [];
          
          // Process production groups
          if (result.productionGroups && result.productionGroups.length > 0) {
            result.productionGroups.forEach(group => {
              group.products.forEach(product => {
                allProducts.push(product);
              });
            });
          }
          
          // Process ungrouped products
          if (result.ungroupedProducts && result.ungroupedProducts.length > 0) {
            result.ungroupedProducts.forEach(product => {
              allProducts.push(product);
            });
          }
          
          // Convert API response to productionData format
          const newProductionData = {};
          allProducts.forEach(product => {
            newProductionData[product.productName] = {
              packing: product.packing || 0,
              physicalStock: product.physicalStock || 0,
              batchAdjusted: product.batchAdjusted || 0,
              qtyPerBatch: product.qtyPerBatch || 0,
              toBeProducedDay: product.toBeProducedDay || 0,
              productionFinalBatches: product.productionFinalBatches || 0,
              // Add calculated fields for display
              totalIndent: product.totalIndent || 0,
              toBeProducedBatches: product.toBeProducedBatches || 0,
              expiryShortage: product.expiryShortage || 0,
              produceBatches: product.produceBatches || 0
            };
          });
          setProductionData(newProductionData);
          console.log('Production summary loaded:', newProductionData);
        }
      } else {
        console.log('No production summary found, using defaults');
      }
    } catch (error) {
      console.error('Error loading production summary:', error);
    }
  };

  // Update filtered orders when date range or orders change
  useEffect(() => {
    const filtered = filterOrdersByDate(individualOrders);
    setFilteredOrders(filtered);
  }, [individualOrders, dateFrom, dateTo]);

  // Initialize production data when products change
  useEffect(() => {
    products.forEach(product => {
      initializeProductionData(product);
    });
  }, [products]);

  // Get dynamic status counts
  const getStatusCounts = () => {
    return {
      pending: filteredOrders.filter(order => order.status === 'pending').length,
      approved: filteredOrders.filter(order => order.status === 'approved').length,
      in_production: filteredOrders.filter(order => order.status === 'in_production').length,
      rejected: filteredOrders.filter(order => order.status === 'rejected').length
    };
  };

  // Helper function to extract sales person name consistently
  const getSalesPersonName = (order, userMap = {}) => {
    console.log('getSalesPersonName called with order:', {
      orderId: order._id || order.orderCode,
      salesPerson: order.salesPerson,
      createdBy: order.createdBy
    });

    if (order.salesPerson) {
      if (typeof order.salesPerson === 'object' && order.salesPerson._id) {
        // Check for duplicate names in productSalesData to determine if we need username
        const duplicateNames = productSalesData?.data?.flatMap(p => p.salesPersons)
          .filter(sp => sp.fullName === order.salesPerson.fullName) || [];

        const name = duplicateNames.length > 1
          ? `${order.salesPerson.fullName || order.salesPerson.username} (${order.salesPerson.username})`
          : order.salesPerson.fullName || order.salesPerson.username || 'Unknown';

        console.log('Extracted name from populated salesPerson:', name);
        return name;
      }
      // If it's an ID, look it up
      const name = userMap[order.salesPerson] || order.salesPerson || 'Unknown';
      console.log('Extracted name from salesPerson ID:', name);
      return name;
    }
    // Fallback to createdBy
    if (order.createdBy) {
      const name = userMap[order.createdBy] || order.createdBy || 'Unknown';
      console.log('Extracted name from createdBy:', name);
      return name;
    }
    console.log('No sales person found, returning Unknown');
    return 'Unknown';
  };

  const fetchData = async (filterDate = null) => {
    try {
      setLoading(true);
      
      // Date filter restored
      const targetDate = filterDate || selectedDate;
      console.log('📅 Fetching data for date:', targetDate);

      // Build URL with date parameter
      const url = new URL(`${config.baseURL}/api/sales/product-summary`);
      // Date filter restored
      if (targetDate) {
        url.searchParams.append('date', targetDate);
      }
      
      const productSummaryResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('🔗 API URL (with date filter):', url.toString());
      console.log('📡 Product Summary Response Status:', productSummaryResponse.status);

      // Fetch individual orders for status counting with date filter
      const ordersUrl = new URL(`${config.baseURL}/api/orders`);
      if (targetDate) {
        ordersUrl.searchParams.append('date', targetDate);
      }
      
      const individualOrdersResponse = await fetch(ordersUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (productSummaryResponse.ok && individualOrdersResponse.ok) {
        const productSummaryData = await productSummaryResponse.json();
        const individualOrdersData = await individualOrdersResponse.json();

        console.log('=== PRODUCT SUMMARY API RESPONSE ===');
        console.log('📊 Full API Response:', productSummaryData);
        console.log('📦 Production Groups:', productSummaryData.productionGroups?.length || 0);
        console.log('🔄 Ungrouped Products:', productSummaryData.ungroupedProducts?.length || 0);
        console.log('✅ API Success:', productSummaryData.success);
        console.log('=== INDIVIDUAL ORDERS ===');
        console.log('Individual orders count:', individualOrdersData.orders?.length || 0);
        console.log('Sample order statuses:', individualOrdersData.orders?.slice(0, 5)?.map(o => o.status) || []);
        console.log('=== END API RESPONSE ===');

        // Set individual orders for status counting
        if (individualOrdersData.success && individualOrdersData.orders) {
          setIndividualOrders(individualOrdersData.orders);
        } else {
          setIndividualOrders([]); // Set empty array for no orders
        }

        if (productSummaryData.success) {
          // NEW: Handle the updated API response structure with productionGroups and ungroupedProducts
          let allProducts = [];
          
          // Process production groups
          if (productSummaryData.productionGroups && productSummaryData.productionGroups.length > 0) {
            productSummaryData.productionGroups.forEach(group => {
              group.products.forEach(product => {
                allProducts.push(product);
              });
            });
          }
          
          // Process ungrouped products
          if (productSummaryData.ungroupedProducts && productSummaryData.ungroupedProducts.length > 0) {
            productSummaryData.ungroupedProducts.forEach(product => {
              allProducts.push(product);
            });
          }
          
          console.log('🔄 Total products from API:', allProducts.length);
          
          // Handle empty data gracefully - this is not an error condition
          if (allProducts.length === 0) {
            console.log('📭 No data found for selected date - showing empty state');
            setOrders([]);
            setProducts([]);
            setSalesPersons([]);
            setGridData({});
            setIndividualOrders([]);
            
            // Load production summary data even if no sales data
            await loadProductionSummary(selectedDate);
            await loadSummaryStatusData();
            return; // Exit early - this is successful empty state
          }
          
          console.log('🔄 Products details:', allProducts);
          
          // Transform product summary data to match the expected unit-manager format
          // Include ALL products, even those with empty salesBreakdown
          const transformedData = allProducts.map(product => {
            // Handle products with empty salesBreakdown
            const hasSalesData = product.salesBreakdown && product.salesBreakdown.length > 0;

            return {
              productId: product.productId,
              productName: product.productName,
              productCode: product.productCode || '',
              totalOrders: hasSalesData ? product.salesBreakdown.reduce((sum, sp) => sum + sp.orderCount, 0) : 0,
              totalQuantity: hasSalesData ? product.salesBreakdown.reduce((sum, sp) => sum + sp.totalQuantity, 0) : 0, // Calculate total from salesBreakdown
              salesBreakdown: product.salesBreakdown || [], // ✅ PRESERVE salesBreakdown with orderIds
              salesPersons: hasSalesData ? product.salesBreakdown.map(sp => ({
                _id: sp.salesPersonId,
                fullName: sp.salesPersonName,
                username: sp.salesPersonName, // Use same as fullName since we don't have username in breakdown
                email: '',
                role: 'Sales',
                totalQuantity: sp.totalQuantity,
                orderCount: sp.orderCount,
                orders: [] // We don't have individual order details in sales breakdown, but UI can handle this
              })) : [] // Empty array for products with no sales data
            };
          });

          console.log('=== TRANSFORMED DATA ===');
          console.log('Transformed data:', transformedData);

          // Set the transformed data to match the expected format
          setOrders(transformedData);
          
          console.log('🔍 Debug orders set:', {
            transformedDataLength: transformedData.length,
            firstTransformed: transformedData[0],
            sampleSalesBreakdown: transformedData[0]?.salesBreakdown
          });

          // Extract products and sales persons from the transformed response
          const products = allProducts; // Use the full product objects instead of just names
          const allSalesPersons = new Map(); // Use Map to store unique salespeople with full info

          // Collect all sales persons from ALL products (even empty ones)
          transformedData.forEach(product => {
            product.salesPersons.forEach(sp => {
              // Create unique key using ID to avoid duplicates
              if (!allSalesPersons.has(sp._id)) {
                allSalesPersons.set(sp._id, {
                  id: sp._id,
                  fullName: sp.fullName,
                  username: sp.username
                });
              }
            });
          });

          // If no sales persons found from products, create a default entry to show "0" values
          if (allSalesPersons.size === 0) {
            allSalesPersons.set('no-sales', {
              id: 'no-sales',
              fullName: 'No Sales Data',
              username: 'no-sales'
            });
          }

          // Convert to array and create display names
          const salesPersonsArray = Array.from(allSalesPersons.values());
          const salesPersonsWithDisplayNames = salesPersonsArray.map(sp => {
            // Check if there are multiple people with the same fullName
            const duplicateNames = salesPersonsArray.filter(p => p.fullName === sp.fullName);
            const displayName = duplicateNames.length > 1
              ? `${sp.fullName || sp.username} (${sp.username})`
              : sp.fullName || sp.username || 'Unknown';

            return {
              ...sp,
              displayName
            };
          });

          setProducts(products);
          setSalesPersons(salesPersonsWithDisplayNames.map(sp => sp.displayName));

          console.log('Products found:', products);
          console.log('Sales persons found:', salesPersonsWithDisplayNames.map(sp => sp.displayName));

          // Create grid data structure for frontend display
          const grid = {};
          transformedData.forEach(product => {
            grid[product.productName] = {};

            // Initialize all sales persons for this product using display names
            salesPersonsWithDisplayNames.forEach(salesPersonObj => {
              grid[product.productName][salesPersonObj.displayName] = [];
            });

            // Fill in actual data from the API response using display names
            if (product.salesPersons.length > 0) {
              product.salesPersons.forEach(sp => {
                // Find the display name for this salesperson
                const salesPersonObj = salesPersonsWithDisplayNames.find(spObj => spObj.id === sp._id);
                const displayName = salesPersonObj ? salesPersonObj.displayName : sp.fullName;

                if (grid[product.productName][displayName]) {
                  // Create mock order data since salesBreakdown doesn't have individual orders
                  grid[product.productName][displayName] = [{
                    orderId: `summary-${sp._id}`,
                    orderCode: `SUMMARY-${sp.orderCount}`,
                    quantity: sp.totalQuantity,
                    customerName: `Total from ${sp.orderCount} orders`,
                    status: 'aggregated',
                    orderDate: new Date()
                  }];
                }
              });
            } else {
              // Product has no sales data - all sales persons show empty arrays (which will display as 0)
              console.log(`Product ${product.productName} has no sales data - showing 0 for all sales persons`);
            }
          });

          // Store the product data separately for total calculations
          const productData = {};
          transformedData.forEach(product => {
            productData[product.productName] = {
              totalQuantity: product.totalQuantity,
              totalOrders: product.totalOrders
            };
          });

          setGridData(grid);

          // Store product totals for easy access
          window.productTotals = productData;

          console.log('=== FINAL GRID STRUCTURE ===');
          Object.entries(grid).forEach(([productName, salesData]) => {
            const productInfo = productData[productName];
            console.log(`Product: ${productName} - Total: ${productInfo.totalQuantity} qty, ${productInfo.totalOrders} orders`);
            Object.entries(salesData).forEach(([salesPerson, orders]) => {
              const totalQuantity = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
              console.log(`  ${salesPerson}: ${orders.length} orders, ${totalQuantity} total quantity`);
            });
          });
          console.log('=== END GRID STRUCTURE ===');
        }
      } else {
        console.error('❌ API Response not OK:', {
          productSummaryStatus: productSummaryResponse.status,
          individualOrdersStatus: individualOrdersResponse.status
        });
        
        // Check if it's a 404 (no data) vs other errors
        if (productSummaryResponse.status === 404) {
          console.log('📭 No data found for this date - showing empty state');
          setOrders([]);
          setProducts([]);
          setSalesPersons([]);
          setGridData({});
          setIndividualOrders([]);
          return; // Exit without error - this is valid empty state
        } else {
          throw new Error(`API Error: ${productSummaryResponse.status}`);
        }
      }

      // Load production summary data
      await loadProductionSummary(selectedDate);
      
      // Load summary status data
      await loadSummaryStatusData();

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 SalesApproval component mounted');
    // selectedDate is already initialized, so the fetch useEffect will trigger automatically
  }, []); // Load data on mount

  // Fetch data when selectedDate changes (after initial mount)
  useEffect(() => {
    if (selectedDate) {
      console.log('📅 Date changed, fetching data for:', selectedDate);
      fetchData(selectedDate);
    }
  }, [selectedDate]); // Trigger when date changes

  // Force refresh function for debugging
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing all data...');
    setLoading(true);
    try {
      // Clear all local state first
      setSummaryStatusData({});
      setProductionData({});
      setInputValues({});
      
      // Fetch fresh data from backend
      // Date filter restored
      await fetchData(selectedDate);
      await refreshProductionData(selectedDate);
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedProductOrders.length || !selectedStatus) return;

    try {
      setUpdating(true);

      // Update all orders for the selected product
      const updatePromises = selectedProductOrders.map(order =>
        fetch(`${config.baseURL}/api/orders/${order._id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            status: selectedStatus,
            notes: `Bulk status update for ${selectedProduct} via Sales Approval dashboard`
          })
        })
      );

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(res => res.json()));

      // Check if all updates were successful
      const allSuccessful = responses.every(res => res.ok);

      if (allSuccessful) {
        toast({
          title: 'Success',
          description: `Updated ${selectedProductOrders.length} orders for ${selectedProduct} to ${selectedStatus.replace('_', ' ')}`
        });

        setIsModalOpen(false);
        setSelectedOrder(null);
        setSelectedProduct(null);
        setSelectedProductOrders([]);
        setSelectedStatus('');
        fetchData(); // Refresh data
      } else {
        const failedCount = results.filter(result => !result.success).length;
        toast({
          title: 'Partial Success',
          description: `Updated ${selectedProductOrders.length - failedCount} orders, ${failedCount} failed`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const openProductStatusModal = (product, productOrders) => {
    setSelectedProduct(product);
    setSelectedProductOrders(productOrders);
    setSelectedStatus(productOrders[0]?.status || 'pending');
    setIsModalOpen(true);
  };

  const handleCellClick = (productName, salesPersonName) => {
    // COMMENTED OUT - Modal functionality disabled as requested
    // Get the orders for this specific product and sales person
    // const ordersForProductSales = gridData[productName]?.[salesPersonName] || [];

    // if (ordersForProductSales.length > 0) {
    //   console.log(`Clicked on ${salesPersonName} for ${productName}:`, ordersForProductSales);
    //   
    //   // Open the modal with the specific orders for this product/salesperson combination
    //   setSelectedProduct(productName);
    //   setSelectedProductOrders(ordersForProductSales);
    //   setSelectedStatus(ordersForProductSales[0]?.status || 'pending');
    //   setIsModalOpen(true);
    // }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Disapproved': return 'bg-red-100 text-red-800 border-red-200';
      case 'In_Production': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-2 lg:p-6 bg-gray-50 min-h-screen">
        {/* Header Skeleton */}
        <div className="mb-3 lg:mb-6">
          <div className="h-8 bg-gray-200 rounded-lg w-80 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-60 animate-pulse"></div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-3 lg:p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-12 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg border">
          <div className="h-16 bg-gray-100 border-b p-6">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <div className="w-full min-w-[1200px]">
                {/* Header Row Skeleton */}
                <div className="border-b bg-gray-50 p-2">
                  <div className="grid grid-cols-10 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
                {/* Data Rows Skeleton */}
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="border-b p-2">
                    <div className="grid grid-cols-10 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                        <div key={col} className="h-10 bg-gray-100 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-3 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Indent Summary Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-600">Manage product orders by sales person</p>
          </div>
          
        
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-yellow-600">
                  {getStatusCounts().pending}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">Pending Approval</div>
              </div>
              <div className="p-2 lg:p-3 bg-yellow-100 rounded-full">
                <Clock className="h-4 w-4 lg:h-6 lg:w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {getStatusCounts().approved}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">Approved</div>
              </div>
              <div className="p-2 lg:p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-4 w-4 lg:h-6 lg:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {getStatusCounts().in_production}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">In Production</div>
              </div>
              <div className="p-2 lg:p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-4 w-4 lg:h-6 lg:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-red-600">
                  {getStatusCounts().rejected}
                </div>
                <div className="text-xs lg:text-sm text-gray-600">Rejected</div>
              </div>
              <div className="p-2 lg:p-3 bg-red-100 rounded-full">
                <XCircle className="h-4 w-4 lg:h-6 lg:w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Groups Summary Table */}
      {(() => {
        // Group products by production group
        const productGroups = {};
        filteredProducts.forEach(product => {
          const productName = product.productName;
          const group = getProductionGroup(productName);
          const groupName = group?.groupName || 'Ungrouped';
          
          if (!productGroups[groupName]) {
            productGroups[groupName] = [];
          }
          productGroups[groupName].push(product);
        });

        // Only show if there are production groups
        if (Object.keys(productGroups).length > 1 || (Object.keys(productGroups).length === 1 && !productGroups['Ungrouped'])) {
          return (
            <Card className="shadow-sm border-0 mb-4">
              <CardHeader className="border-b bg-gray-50/50 px-3 lg:px-6 py-2">
                <CardTitle className="text-md font-semibold text-gray-900">Production Groups Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="p-2 text-left font-semibold text-gray-900 border-r">Product Group</th>
                        <th className="p-2 text-center font-semibold text-gray-900 border-r">Production with final batches</th>
                        <th className="p-2 text-center font-semibold text-gray-900 border-r">Produce/Batches</th>
                        <th className="p-2 text-center font-semibold text-gray-900 border-r">Physical Stock</th>
                        <th className="p-2 text-center font-semibold text-gray-900 border-r">Batch Adjusted</th>
                        <th className="p-2 text-center font-semibold text-gray-900 border-r">To be Prod./Day</th>
                        <th className="p-2 text-center font-semibold text-gray-900">Total Indent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(productGroups).map(([groupName, groupProducts]) => {
                        if (groupName === 'Ungrouped') return null;
                        
                        return (
                          <tr key={groupName} className="border-b bg-blue-50 hover:bg-blue-100">
                            <td className="p-2 border-r text-sm font-bold text-gray-900">
                              {groupName} Total
                            </td>
                            <td className="p-2 border-r text-center text-sm font-bold text-green-700">
                              {parseFloat(groupProducts.reduce((sum, product) => sum + getProductionWithFinalBatches(product.productName), 0).toFixed(2))}
                            </td>
                            <td className="p-2 border-r text-center text-sm font-bold text-purple-700">
                              {parseFloat(groupProducts.reduce((sum, product) => sum + getProduceBatches(product.productName), 0).toFixed(2))}
                            </td>
                            <td className="p-2 border-r text-center text-sm font-bold text-indigo-700">
                              {groupProducts.reduce((sum, product) => sum + (getProductionData(product.productName).physicalStock || 0), 0)}
                            </td>
                            <td className="p-2 border-r text-center text-sm font-bold text-cyan-700">
                              {parseFloat(groupProducts.reduce((sum, product) => sum + getBatchAdjusted(product.productName), 0).toFixed(2))}
                            </td>
                            <td className="p-2 border-r text-center text-sm font-bold text-amber-700">
                              {groupProducts.reduce((sum, product) => {
                                const productData = orders.find(p => p.productName === product.productName);
                                const totalQuantity = productData ? productData.totalQuantity : 0;
                                return sum + Math.max(0, totalQuantity - (getProductionData(product.productName).physicalStock || 0));
                              }, 0)}
                            </td>
                            <td className="p-2 text-center text-sm font-bold text-blue-700">
                              {groupProducts.reduce((sum, product) => {
                                const productData = orders.find(p => p.productName === product.productName);
                                return sum + (productData ? productData.totalQuantity : 0);
                              }, 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Grid Container */}
      <Card className="shadow-sm border-0">
        <CardHeader className="border-b bg-gray-50/50 px-3 lg:px-6 py-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left Side - Title */}
              <div>
                Product Sales Management
              </div>

              {/* Right Side - Filter Controls and Actions */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
                {/* Bulk Actions - Always show */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {selectedProducts.size} selected
                  </span>
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkApproving || selectedProducts.size === 0}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkApproving ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bulk Approve
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden w-full">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-center gap-2"
                    size="sm"
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                </div>

                {/* Filter Controls */}
                <div className={`flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 w-full lg:w-auto ${showFilters || 'hidden lg:flex'}`}>
                  {/* Search */}
                
       
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full lg:w-48 pr-8 text-sm"
                        size="sm"
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {/* Date Filter restored */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
                  </div>

                  {/* Clear Date Filter Button restored */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDateFilter}
                      className="flex items-center gap-1"
                      title="Reset to today's date"
                    >
                      <X className="h-3 w-3" />
                      Today
                    </Button>

                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {filteredProducts.length} of {products.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Responsive Table with Sticky Header */}
          <div className="overflow-auto max-h-[80vh] relative">
            <table className="w-full" style={{ minWidth: `${700 + (salesPersons.length * 150)}px` }}>
              {/* Header Row - Fixed 10 columns with Sticky positioning */}
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b bg-gray-50">
                  {/* 1. Selection Checkbox Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[50px]">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected && filteredProducts.length > 0}
                        onChange={toggleAllSelection}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        title="Select all products"
                      />
                    </div>
                  </th>
                  {/* 2. Products Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-left font-semibold text-gray-900 border-r min-w-[100px] lg:min-w-[160px]">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4" />
                      <span className="text-xs lg:text-sm">Products</span>
                    </div>
                  </th>
                  {/* 3. Production with final batches Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[90px] lg:min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                      <div className="text-xs font-semibold text-gray-900">Production</div>
                      <div className="text-xs font-semibold text-gray-900">with final</div>
                      <div className="text-xs font-semibold text-gray-900">batches</div>
                    </div>
                  </th>
                  {/* 4. Produce / Batches Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[90px] lg:min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                      <div className="text-xs font-semibold text-gray-900">Produce /</div>
                      <div className="text-xs font-semibold text-gray-900">Batches</div>
                    </div>
                  </th>
                  {/* 5. Physical Stock Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[80px] lg:min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-indigo-600" />
                      <div className="text-xs font-semibold text-gray-900">Physical</div>
                      <div className="text-xs font-semibold text-gray-900">Stock</div>
                    </div>
                  </th>
                  {/* 6. Batch Adjusted Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[80px] lg:min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-cyan-600" />
                      <div className="text-xs font-semibold text-gray-900">Batch</div>
                      <div className="text-xs font-semibold text-gray-900">Adjusted</div>
                    </div>
                  </th>
                  {/* 7. To be Produced/Day Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[90px] lg:min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-amber-600" />
                      <div className="text-xs font-semibold text-gray-900">To be Prod.</div>
                      <div className="text-xs font-semibold text-gray-900">/Day</div>
                    </div>
                  </th>

                  {/* Dynamic Sales Person Columns */}
                  {salesPersons.map((salesPersonName, index) => (
                    <th key={salesPersonName} className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[120px] lg:min-w-[150px]">
                      <div className="flex flex-col items-center gap-1">
                        <User className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
                        <div className="text-xs font-semibold text-gray-900 text-center leading-tight break-words max-w-[140px]">
                          {salesPersonName}
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Total Indent Salesman Column */}
                  <th className="sticky top-0 bg-gradient-to-r from-green-50 to-green-100 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[90px] lg:min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                      <div className="text-xs font-bold text-gray-900">Total Indent</div>
                      <div className="text-xs font-bold text-gray-900">Salesman</div>
                    </div>
                  </th>
                  {/* Qty/Batch Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[90px] lg:min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <Package className="h-3 w-3 lg:h-4 lg:w-4 text-orange-600" />
                      <div className="text-xs font-semibold text-gray-900">Qty/Batch</div>
                    </div>
                  </th>
                  {/* Status Column */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 border-r min-w-[80px] lg:min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                      <div className="text-xs font-semibold text-gray-900">Status</div>
                    </div>
                  </th>
                  {/* Actions Column - LAST COLUMN */}
                  <th className="sticky top-0 bg-gray-50 p-1 lg:p-2 text-center font-semibold text-gray-900 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Settings className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
                      <div className="text-xs font-semibold text-gray-900">Actions</div>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product, index) => {
                  // Get product data from our new API structure
                  const productData = orders.find(p => p.productName === product.productName);
                  const totalQuantity = productData ? productData.totalQuantity : 0;
                  const totalOrderCount = productData ? productData.totalOrders : 0;

                  // Debug log to see what we're getting
                  if (index === 0) {
                    console.log('🔍 Debug product lookup:', {
                      product,
                      productData,
                      totalQuantity,
                      totalOrderCount,
                      ordersLength: orders.length,
                      firstOrder: orders[0]
                    });
                  }

                  // Get all orders for this product from all sales persons for modal functionality
                  const productOrders = productData ?
                    productData.salesPersons.flatMap(sp => sp.orders || []) : [];

                  return (
                    <tr key={`${product.productName}-${index}`} className="border-b hover:bg-gray-50/50 transition-colors">
                      {/* 1. Selection Checkbox Column */}
                      <td className="bg-white p-1 lg:p-2 text-center border-r">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.productName)}
                          onChange={() => toggleProductSelection(product.productName)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          title={`Select ${product.productName}`}
                        />
                      </td>
                      {/* 2. Product Name Column */}
                      <td className="bg-white p-1 lg:p-2 font-medium text-gray-900 border-r max-w-[100px] lg:max-w-[160px]">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-900 leading-tight break-words">
                            {product.productName} - {getProductCategory(product.productName)}
                            {getProductSubCategory(product.productName)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Total Qty: {totalQuantity} ({totalOrderCount} orders)
                          </span>
                          {/* Production Group Tag */}
                          {(() => {
                            const group = getProductionGroup(product.productName);
                            console.log(`🏷️ Product ${product.productName} group:`, group);
                            if (group?.groupId) {
                              return (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  {getProductionGroupName(product.productName)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* 3. Production with final batches Column - AUTO CALCULATED */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-600">
                            {getProductionWithFinalBatches(product.productName)}
                          </div>
                        </div>
                      </td>

                      {/* 4. Produce / Batches Column */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-600">
                            {getProduceBatches(product.productName)}
                          </div>
                        </div>
                      </td>

                      {/* 5. Physical Stock Column - EDITABLE */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <Input
                            type="text"
                            value={getInputValue(product.productName, 'physicalStock')}
                            onChange={(e) => updateProductionField(product.productName, 'physicalStock', e.target.value)}
                            onBlur={() => handleInputBlur(product.productName, 'physicalStock')}
                            className="w-24 h-8 text-center text-lg font-bold text-purple-600 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* 6. Batch Adjusted Column - EDITABLE */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <Input
                            type="text"
                            value={getInputValue(product.productName, 'batchAdjusted')}
                            onChange={(e) => updateProductionField(product.productName, 'batchAdjusted', e.target.value)}
                            onBlur={() => handleInputBlur(product.productName, 'batchAdjusted')}
                            className="w-24 h-8 text-center text-sm font-bold text-cyan-600 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* 7. To be Prod/Day Column - AUTO CALCULATED */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <div className="text-sm font-bold text-amber-600">
                            {Math.max(0, totalQuantity - (getProductionData(product.productName).physicalStock || 0))}
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Sales Person Columns */}
                      {salesPersons.map((salesPersonName) => {
                        const salesPersonData = gridData[product.productName]?.[salesPersonName] || [];
                        const totalQty = salesPersonData.reduce((sum, order) => sum + (order.quantity || 0), 0);

                        return (
                          <td key={`${product.productName}-${salesPersonName}`} className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                            {salesPersonData.length === 0 ? (
                              <span className="text-gray-400 text-sm">0</span>
                            ) : (
                              // DISABLED CLICK FUNCTIONALITY - Modal removed as requested
                              <div className="text-center rounded p-1">
                                <div className="text-sm font-bold text-orange-600">
                                  {totalQty}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {salesPersonData.length} order{salesPersonData.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Indent Salesman Column */}
                      <td className="p-1 lg:p-2 border-r align-middle bg-gradient-to-r from-green-50 to-green-100 text-center">
                        <div className="text-center">
                          <div className="text-sm font-bold text-blue-600">
                            {totalQuantity}
                          </div>
                          <div className="text-xs text-gray-500">
                            {totalOrderCount} order{totalOrderCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>

                      {/* Qty/Batch Column */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <div className="text-sm font-bold text-orange-600">
                            {getProductionData(product.productName).qtyPerBatch || 0}
                          </div>
                        </div>
                      </td>
                      {/* Status Column */}
                      <td className="bg-white p-1 lg:p-2 border-r text-center align-middle">
                        <div className="text-center">
                          <Badge 
                            variant={getSummaryStatus(product.productName) === 'approved' ? 'default' : 'secondary'}
                            className={`text-xs ${getSummaryStatus(product.productName) === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                          >
                            {getSummaryStatus(product.productName)}
                          </Badge>
                        </div>
                      </td>
                      {/* Actions Column - LAST COLUMN */}
                      <td className="bg-white p-1 lg:p-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleIndividualApprove(product.productName)}
                            disabled={approvingProducts.has(product.productName) || getSummaryStatus(product.productName) === 'approved'}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-7 text-xs disabled:opacity-50"
                            title={`Approve summary for ${product.productName}`}
                          >
                            {approvingProducts.has(product.productName) ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : getSummaryStatus(product.productName) === 'approved' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-6xl text-gray-300">📅</div>
                  <div className="text-gray-500 text-lg mb-2">
                    {searchTerm ? 'No products found matching your search' : 
                     loading ? 'Loading data...' : 
                     'No data available'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {searchTerm ? (
                      <>
                        Try adjusting your search term: "{searchTerm}" or{' '}
                        <button
                          onClick={clearFilters}
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          clear filters
                        </button>
                      </>
                    ) : (
                      loading ? 'Please wait while we fetch the data...' :
                      'Check if there are products available in your inventory'
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Product Orders Status</DialogTitle>
          </DialogHeader>

          {selectedProduct && selectedProductOrders.length > 0 && (
            <div className="space-y-4">
              {/* Product Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Product</div>
                    <div className="font-semibold">{selectedProduct}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Orders</div>
                    <div className="font-semibold">{selectedProductOrders.length} orders</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-2">Current Status Distribution</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        selectedProductOrders.reduce((acc, order) => {
                          acc[order.status] = (acc[order.status] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([status, count]) => (
                        <Badge key={status} className={`text-xs ${getStatusColor(status)}`}>
                          {count} {status.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Summary */}
              <div className="bg-blue-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="text-sm text-blue-800 font-medium mb-2">Orders to be updated:</div>
                <div className="space-y-1">
                  {selectedProductOrders.slice(0, 5).map((order) => (
                    <div key={order._id} className="text-xs text-blue-700">
                      #{order.orderCode || order._id.slice(-6)} - {order.customer?.name || 'Unknown'} - ₹{order.totalAmount?.toLocaleString() || '0'}
                    </div>
                  ))}
                  {selectedProductOrders.length > 5 && (
                    <div className="text-xs text-blue-600">
                      +{selectedProductOrders.length - 5} more orders...
                    </div>
                  )}
                </div>
              </div>

              {/* Status Selection Dropdown */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Select New Status for All Orders:</div>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        Pending Approval
                      </div>
                    </SelectItem>
                    <SelectItem value="Approved">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Approved
                      </div>
                    </SelectItem>
                    <SelectItem value="Disapproved">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Rejected
                      </div>
                    </SelectItem>
                    <SelectItem value="In_Production">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                        In Production
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Change Warning */}
                {selectedStatus && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-sm text-amber-800">
                      <strong>Warning:</strong> This will update the status of all {selectedProductOrders.length} orders
                      for "{selectedProduct}" to "<span className="font-medium">{selectedStatus.replace('_', ' ')}</span>".
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={updating || !selectedStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updating ? `Updating ${selectedProductOrders.length} Orders...` : `Update All ${selectedProductOrders.length} Orders`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesApproval;