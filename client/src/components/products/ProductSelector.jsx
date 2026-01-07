import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Search, Package, ChevronDown, ChevronUp, Star, StarOff } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuthContext } from '../../contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

const ProductSelector = React.memo(({ 
  selectedProducts = [], 
  onProductSelect, 
  onProductRemove, 
  onQuantityChange,
  className = "",
  customProducts = null // Allow passing custom products list
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [expandedBrands, setExpandedBrands] = useState({});
  const [localQuantities, setLocalQuantities] = useState({});
  const quantityRefs = useRef({});
  const { toast } = useToast();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [showPriorityProducts, setShowPriorityProducts] = useState(true);

  // Check if user is Sales to show priority functionality
  const isSalesUser = user && ['Sales', 'sales', 'SALES'].includes(user.role);

  // Determine which API endpoint to use based on user role
  const getItemsEndpoint = () => {
    if (!user) return '/api/items';
    
    switch (user.role) {
      case 'Super Admin':
        return '/api/super-admin/inventory/items';
      case 'Unit Head':
        return '/api/unit-head/inventory/items';
      case 'Unit Manager':
        return '/api/unit-manager/inventory/items';
      case 'Sales':
        return '/api/sales/items';
      default:
        return '/api/items';
    }
  };

  // Fetch inventory items using appropriate endpoint
  const { data: itemsResponse, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: [getItemsEndpoint()],
    queryFn: async () => {
      console.log('🔍 ProductSelector: Fetching items from:', getItemsEndpoint());
      try {
        const response = await apiRequest('GET', getItemsEndpoint());
        console.log('✅ ProductSelector: API Response:', response);
        
        // Filter items to only show type = "Product" on frontend as well
        if (response?.items) {
          const originalCount = response.items.length;
          response.items = response.items.filter(item => item.type === 'Product');
          console.log(`🎯 ProductSelector: Filtered ${originalCount} items to ${response.items.length} Product items`);
        }
        
        return response;
      } catch (error) {
        console.error('❌ ProductSelector: API Error:', error);
        throw error;
      }
    },
    enabled: !customProducts, // Only fetch if custom products not provided
    onError: (error) => {
      console.error('❌ ProductSelector: Query Error:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive"
      });
    }
  });

  const items = customProducts || itemsResponse?.items || [];
  
  // Fetch priority products for Sales users
  const { data: priorityProductsResponse, isLoading: priorityProductsLoading } = useQuery({
    queryKey: ['/api/sales/priority-products'],
    queryFn: async () => {
      if (!isSalesUser) return { data: { products: [] } };
      try {
        console.log('🔍 Fetching priority products...');
        const response = await apiRequest('GET', '/api/sales/priority-products');
        console.log('✅ Priority products response:', response);
        return response;
      } catch (error) {
        console.error('❌ Priority products error:', error);
        return { data: { products: [] } };
      }
    },
    enabled: isSalesUser && !customProducts, // Only fetch if Sales user and no custom products
    retry: 1
  });

  const priorityProducts = priorityProductsResponse?.data?.products || [];

  // Add to priority mutation
  const addToPriorityMutation = useMutation({
    mutationFn: (productId) => apiRequest('POST', '/api/sales/priority-products', { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/priority-products'] });
      toast({
        title: "Success",
        description: "Product added to priority list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error?.message || "Failed to add to priority list",
        variant: "destructive",
      });
    },
  });

  // Remove from priority mutation
  const removeFromPriorityMutation = useMutation({
    mutationFn: (priorityId) => apiRequest('DELETE', `/api/sales/priority-products/${priorityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/priority-products'] });
      toast({
        title: "Success", 
        description: "Product removed from priority list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove from priority list",
        variant: "destructive",
      });
    },
  });
  
  // Debug logging
  React.useEffect(() => {
    console.log('📦 ProductSelector Debug:', {
      itemsResponse,
      itemsArray: items,
      itemsCount: items.length,
      itemsError,
      isLoading: itemsLoading
    });
  }, [itemsResponse, items, itemsError, itemsLoading]);

  // Group inventory items by category (treat as brands for UI consistency)
  const productsByBrand = React.useMemo(() => {
    const grouped = {};
    
    // Filter items based on search term
    const filteredItems = items.filter(item => 
      searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredItems.forEach(item => {
      const categoryName = item.category || 'Uncategorized';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      // Transform inventory item to match expected product format
      grouped[categoryName].push({
        _id: item._id,
        name: item.name,
        price: item.salePrice || 0,
        image: item.image || null,
        brand: categoryName,
        stock: item.qty || 0,
        unit: item.unit || 'pcs',
        code: item.code || ''
      });
    });
    return grouped;
  }, [items, searchTerm]);

  // Track categories that have quantities (should stay locked open)
  const brandsWithQuantities = React.useMemo(() => {
    const brandsSet = new Set();
    selectedProducts.forEach(product => {
      if (product.quantity > 0) {
        brandsSet.add(product.brand);
      }
    });
    return brandsSet;
  }, [selectedProducts]);

  const toggleBrandExpansion = (brandName) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandName]: !prev[brandName]
    }));
  };

  const handleProductToggle = (product) => {
    const isSelected = selectedProducts.some(p => p._id === product._id);
    
    if (isSelected) {
      onProductRemove(product._id);
    } else {
      onProductSelect({
        ...product,
        quantity: 1
      });
    }
  };

  // Priority product handlers
  const handleTogglePriority = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const priorityProduct = priorityProducts.find(pp => pp.productId === product._id);
    
    if (priorityProduct) {
      // Remove from priority
      removeFromPriorityMutation.mutate(priorityProduct.priorityId);
    } else {
      // Add to priority
      addToPriorityMutation.mutate(product._id);
    }
  };

  const isProductPriority = (productId) => {
    return priorityProducts.some(pp => pp.productId === productId);
  };

  // Handle local quantity changes to prevent focus loss
  const handleLocalQuantityChange = (productId, value) => {
    console.log('📝 Local quantity change:', { productId, value });
    setLocalQuantities(prev => ({
      ...prev,
      [productId]: value
    }));
    // Don't call handleQuantityUpdate here - only on blur/enter
  };

  // Handle quantity submission/blur to update parent
  const handleQuantityUpdate = (productId, value) => {
    console.log('🔍 handleQuantityUpdate called with:', { productId, value });
    
    // Use the entered value as-is, don't change it
    const numQuantity = value === '' || value === null || value === undefined ? 0 : parseInt(value);
    
    // Only proceed if parsing was successful or value is explicitly 0
    if (isNaN(numQuantity) && value !== '' && value !== '0') {
      console.log('❌ Invalid value, not updating:', value);
      return;
    }
    
    console.log('✅ Processing quantity update:', { original: value, parsed: numQuantity });
    
    if (numQuantity <= 0) {
      // Remove product if quantity is 0 or less
      onProductRemove(productId);
      // Clear local quantity when removing product
      setLocalQuantities(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } else {
      // Check if product already selected
      const existingProduct = selectedProducts.find(p => p._id === productId);
      if (existingProduct) {
        console.log('📤 Calling onQuantityChange with:', { productId, quantity: numQuantity });
        onQuantityChange(productId, numQuantity);
      } else {
        // Add new product with quantity - find from all grouped products
        let foundProduct = null;
        Object.values(productsByBrand).forEach(brandProducts => {
          const product = brandProducts.find(p => p._id === productId);
          if (product) foundProduct = product;
        });
          
        if (foundProduct) {
          console.log('📤 Calling onProductSelect with quantity:', numQuantity);
          onProductSelect({
            ...foundProduct,
            quantity: numQuantity
          });
        }
      }
      
      // Update local quantity to show the entered value
      setLocalQuantities(prev => ({
        ...prev,
        [productId]: value
      }));
    }
  };

  // Get all visible product IDs in order across all brands (regardless of expansion state for navigation)
  const getAllVisibleProductIds = React.useMemo(() => {
    const allIds = [];
    Object.entries(productsByBrand)
      .filter(([categoryName]) => selectedBrand === 'all' || categoryName === selectedBrand)
      .forEach(([brandName, brandProducts]) => {
        // Include ALL products for navigation, regardless of expansion state
        brandProducts.forEach(product => {
          allIds.push(product._id);
        });
      });
    console.log('🚀 All navigation product IDs:', allIds);
    return allIds;
  }, [productsByBrand, selectedBrand]);

  // Handle Enter key navigation to next quantity input across all visible products
  const handleKeyDown = (e, productId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔍 Enter key pressed for product:', productId);
      console.log('📝 All visible product IDs:', getAllVisibleProductIds);
      
      // Submit current quantity as-is
      const currentValue = e.target.value;
      handleQuantityUpdate(productId, currentValue);
      
      // Find current product index in the global list
      const currentGlobalIndex = getAllVisibleProductIds.indexOf(productId);
      const nextGlobalIndex = currentGlobalIndex + 1;
      
      console.log('📊 Current index:', currentGlobalIndex, 'Next index:', nextGlobalIndex);
      
      // Move to next product across all visible products
      if (nextGlobalIndex < getAllVisibleProductIds.length) {
        const nextProductId = getAllVisibleProductIds[nextGlobalIndex];
        
        console.log('➡️ Moving to next product:', nextProductId);
        
        // Focus the next input with a short delay
        setTimeout(() => {
          const nextInput = quantityRefs.current[nextProductId];
          console.log('🎯 Next input element:', nextInput);
          
          if (nextInput) {
            try {
              nextInput.focus();
              nextInput.select();
              console.log('✅ Successfully focused next input');
            } catch (error) {
              console.error('❌ Error focusing next input:', error);
            }
          } else {
            console.log('❌ Next input not found in refs');
          }
        }, 150);
      } else {
        console.log('🏁 Reached end of product list');
      }
    }
  };

  const getDisplayQuantity = (productId) => {
    // ALWAYS use local quantity if user is typing - this prevents value loss
    if (localQuantities.hasOwnProperty(productId)) {
      console.log('📱 Using local quantity for', productId, ':', localQuantities[productId]);
      return localQuantities[productId];
    }
    const selectedProduct = selectedProducts.find(p => p._id === productId);
    const quantity = selectedProduct?.quantity || '';
    console.log('📱 Using selected quantity for', productId, ':', quantity);
    return quantity;
  };

  if (itemsError) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load inventory data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} w-full max-w-full overflow-hidden`}>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
          Select Products
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col gap-2 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs w-full"
            />
          </div>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.keys(productsByBrand).map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6 pb-6 w-full overflow-hidden">
        {/* Priority Products Section */}
        {isSalesUser && priorityProducts.length > 0 && (
          <div className="mb-6 w-full overflow-hidden">
            <div className="border rounded-lg w-full overflow-hidden">
              <div className="flex items-center justify-between p-2 bg-yellow-50 border-b">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                  <Badge variant="default" className="bg-yellow-500 text-xs">
                    Priority Products
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    {priorityProducts.length} items
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPriorityProducts(!showPriorityProducts)}
                >
                  {showPriorityProducts ? <ChevronUp className="h-4 w-4 text-yellow-600" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              
              {showPriorityProducts && (
                <div className="border-t w-full overflow-hidden">
                  {/* Header Row */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 text-xs font-medium text-gray-600 w-full">
                    <span className="text-xs flex-1 min-w-0">ITEM NAME</span>
                    <span className="w-12 text-center text-xs flex-shrink-0">QTY</span>
                  </div>
                  
                  {/* Priority Product Rows */}
                  <div className="space-y-0 divide-y w-full overflow-hidden">
                    {priorityProducts.map((priorityProduct) => {
                      const product = {
                        _id: priorityProduct.productId,
                        name: priorityProduct.name,
                        code: priorityProduct.code,
                        price: priorityProduct.price,
                        stock: priorityProduct.stock,
                        image: priorityProduct.image,
                        unit: priorityProduct.unit,
                        brand: priorityProduct.category
                      };
                      
                      const isSelected = selectedProducts.some(p => p._id === product._id);
                      const displayQuantity = getDisplayQuantity(product._id);
                      
                      return (
                        <div
                          key={priorityProduct.id}
                          className={`flex items-center justify-between p-2 transition-colors w-full ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0 ${product.image ? 'hidden' : 'flex'}`}
                            >
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1">
                                <h4 className="font-medium text-xs truncate max-w-[120px] sm:max-w-full">{product.name}</h4>
                                {/* Priority indicator */}
                                <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                              </div>
                              <p className="text-xs text-green-600 font-semibold truncate max-w-[120px] sm:max-w-full">
                                ₹{product.price} / {product.unit}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-full">
                                {product.code}
                              </p>
                            </div>
                          </div>

                          <div className="w-12 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={el => quantityRefs.current[product._id] = el}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={displayQuantity}
                              onBlur={(e) => {
                                e.stopPropagation();
                                console.log('🎯 Input blur for', product._id, 'with value:', e.target.value);
                                if (!e.target.value) {
                                  e.target.placeholder = "0";
                                }
                                handleQuantityUpdate(product._id, e.target.value);
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                const value = e.target.value;
                                handleLocalQuantityChange(product._id, value);
                                if (value && value !== '' && !isNaN(parseInt(value))) {
                                  const numValue = parseInt(value);
                                  if (numValue > 0) {
                                    const existingProduct = selectedProducts.find(p => p._id === product._id);
                                    if (existingProduct) {
                                      console.log('📤 IMMEDIATE onChange calling onQuantityChange:', { productId: product._id, quantity: numValue });
                                      onQuantityChange(product._id, numValue);
                                    } else {
                                      console.log('📤 IMMEDIATE onChange calling onProductSelect:', { productId: product._id, quantity: numValue });
                                      onProductSelect({
                                        ...product,
                                        quantity: numValue
                                      });
                                    }
                                  }
                                }
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                e.target.placeholder = '';
                                setTimeout(() => e.target.select(), 0);
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                handleKeyDown(e, product._id);
                              }}
                              className="w-full text-center text-xs h-7 px-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {itemsLoading ? (
          <div className="space-y-4 w-full overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse w-full">
                <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                <div className="h-20 bg-gray-100 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 w-full overflow-hidden">
            {Object.entries(productsByBrand)
              .filter(([categoryName]) => selectedBrand === 'all' || categoryName === selectedBrand)
              .map(([brandName, brandProducts]) => {
              const hasQuantities = brandsWithQuantities.has(brandName);
              const isExpanded = expandedBrands[brandName];
              
              return (
              <div key={brandName} className="border rounded-lg w-full overflow-hidden">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleBrandExpansion(brandName);
                  }}
                  className={`w-full flex items-center justify-between p-2 transition-colors ${
                    hasQuantities && isExpanded 
                      ? 'bg-blue-50 hover:bg-blue-100:bg-blue-900/30' 
                      : 'hover:bg-gray-50:bg-gray-800'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-1 flex-wrap min-w-0 overflow-hidden">
                    <Badge variant={hasQuantities ? "default" : "secondary"} className="text-xs">
                      {brandName}
                    </Badge>
                    {hasQuantities && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Selected
                      </Badge>
                    )}
                    <span className="text-xs text-gray-600">
                      {brandProducts.length} products
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className={`h-4 w-4 ${hasQuantities ? 'text-blue-500' : ''}`} />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {expandedBrands[brandName] && (
                  <div className="border-t w-full overflow-hidden">
                    {/* Header Row */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 text-xs font-medium text-gray-600 w-full">
                      <span className="text-xs flex-1 min-w-0">ITEM NAME</span>
                      <span className="w-12 text-center text-xs flex-shrink-0">QTY</span>
                    </div>
                    
                    {/* Product Rows */}
                    <div className="space-y-0 divide-y w-full overflow-hidden">
                      {brandProducts.map((product, productIndex) => {
                        const displayQuantity = getDisplayQuantity(product._id);
                        const isSelected = selectedProducts.some(p => p._id === product._id && p.quantity > 0);

                      return (
                        <div
                          key={product._id}
                          className={`flex items-center justify-between p-2 transition-colors w-full ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0 ${product.image ? 'hidden' : 'flex'}`}
                            >
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1">
                                <h4 className="font-medium text-xs truncate max-w-[120px] sm:max-w-full">{product.name}</h4>
                                {/* Priority toggle button for Sales users */}
                                {isSalesUser && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-transparent flex-shrink-0"
                                    onClick={(e) => handleTogglePriority(e, product)}
                                    disabled={addToPriorityMutation.isLoading || removeFromPriorityMutation.isLoading}
                                  >
                                    {isProductPriority(product._id) ? (
                                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                    ) : (
                                      <StarOff className="h-3 w-3 text-gray-400 hover:text-yellow-500" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-green-600 font-semibold truncate max-w-[120px] sm:max-w-full">
                                ₹{product.price} / {product.unit}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-full">
                                {product.code}
                              </p>
                            </div>
                          </div>

                          <div className="w-12 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={(el) => {
                                if (el) {
                                  quantityRefs.current[product._id] = el;
                                }
                              }}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={displayQuantity}
                              onBlur={(e) => {
                                e.stopPropagation();
                                console.log('🎯 Input blur for', product._id, 'with value:', e.target.value);
                                if (!e.target.value) {
                                  e.target.placeholder = "0";
                                }
                                // Submit quantity on blur - this is when we update the parent
                                handleQuantityUpdate(product._id, e.target.value);
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                const value = e.target.value;
                                handleLocalQuantityChange(product._id, value);
                                // IMMEDIATELY update parent - add product if not selected, update quantity if selected
                                if (value && value !== '' && !isNaN(parseInt(value))) {
                                  const numValue = parseInt(value);
                                  if (numValue > 0) {
                                    const existingProduct = selectedProducts.find(p => p._id === product._id);
                                    if (existingProduct) {
                                      console.log('📤 IMMEDIATE onChange calling onQuantityChange:', { productId: product._id, quantity: numValue });
                                      onQuantityChange(product._id, numValue);
                                    } else {
                                      console.log('📤 IMMEDIATE onChange calling onProductSelect:', { productId: product._id, quantity: numValue });
                                      onProductSelect({
                                        ...product,
                                        quantity: numValue
                                      });
                                    }
                                  }
                                }
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                e.target.placeholder = '';
                                // Select all text on focus for easy editing
                                setTimeout(() => e.target.select(), 0);
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                handleKeyDown(e, product._id);
                              }}
                              className="w-full text-center text-xs h-7 px-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}

            {Object.keys(productsByBrand).length === 0 && (
              <div className="text-center py-8 text-gray-500 w-full">
                {searchTerm || selectedBrand ? 'No products found matching your search.' : 'No products available.'}
              </div>
            )}
          </div>
        )}

        {/* Selected Products Summary */}
        {selectedProducts.length > 0 && (
          <div className="mt-6 pt-4 border-t w-full overflow-hidden">
            <h4 className="font-medium mb-3 text-sm">Selected Products ({selectedProducts.length})</h4>
            <div className="space-y-2 w-full">
              {selectedProducts.map(product => (
                <div key={product._id} className="flex items-start justify-between text-xs gap-2 w-full overflow-hidden">
                  <span className="truncate flex-1 min-w-0 max-w-[140px] sm:max-w-full overflow-hidden">{product.name}</span>
                  <span className="font-medium text-right flex-shrink-0 text-xs whitespace-nowrap">
                    {product.quantity}x ₹{product.price || 0} = ₹{(product.quantity * (product.price || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-sm pt-2 border-t w-full">
                <span>Total Amount:</span>
                <span className="whitespace-nowrap">₹{selectedProducts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ProductSelector;