import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function UnitHeadIndentSummary() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    status: 'all',
    search: ''
  });

  const fetchData = async (currentFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.startDate) params.append('fromDate', currentFilters.startDate);
      if (currentFilters.endDate) params.append('toDate', currentFilters.endDate);
      // Keep 'date' for backward compatibility
      if (currentFilters.startDate) params.append('date', currentFilters.startDate);

      const response = await fetch(
        `${config.baseURL}/api/sales/products-summary?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        // Flatten the grouped response format
        const groupedProducts = data.productionGroups?.flatMap(group => group.products || []) || [];
        const ungroupedProducts = data.ungroupedProducts || [];
        const allProducts = [...groupedProducts, ...ungroupedProducts];
        
        console.log(`📦 Loaded ${allProducts.length} products total (${groupedProducts.length} grouped, ${ungroupedProducts.length} ungrouped)`);
        setProducts(allProducts);
      } else {
        throw new Error(data.message || 'Failed to load indent summary');
      }

    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filters);
  }, [filters.startDate, filters.endDate]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: getTodayDate(), endDate: getTodayDate(), status: 'all', search: '' });
  };

  // Client-side filtering logic
  const filteredProducts = products.filter((p) => {
    // 1. Search term match
    const matchSearch = !filters.search ||
      (p.productName || '').toLowerCase().includes(filters.search.toLowerCase());
    
    // 2. Status match (All, Approved, Pending)
    const matchStatus = filters.status === 'all' || p.status === filters.status;
    
    // 3. Activity match (ONLY show products with daily data or total qty > 0 OR if searching)
    // This prevents showing the entire master list of 37 empty products.
    const hasActivity = p.hasDailyData || 
                        (p.dailyDetailsId && !p.dailyDetailsId.startsWith('empty-')) || 
                        parseFloat(p.totalQuantity) > 0;
    
    // If user is searching, show everything matching search.
    // If not, only show active products.
    if (filters.search) return matchSearch && matchStatus;
    
    return matchSearch && matchStatus && hasActivity;
  });

  const activeProductsWithData = products.filter(p => 
    p.hasDailyData || (p.dailyDetailsId && !p.dailyDetailsId.startsWith('empty-')) || parseFloat(p.totalQuantity) > 0
  );
  const approvedCount = activeProductsWithData.filter(p => p.status === 'approved').length;
  const pendingCount = activeProductsWithData.filter(p => p.status !== 'approved').length;
  const totalQty = activeProductsWithData.reduce((sum, p) => sum + (parseFloat(p.totalQuantity) || 0), 0);


  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Indent Summary
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View approved indents and order summaries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(filters)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Qty</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{totalQty.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                <Calendar className="w-3 h-3 inline mr-1" />
                Start Date
              </Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                <Calendar className="w-3 h-3 inline mr-1" />
                End Date
              </Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                <Search className="w-3 h-3 inline mr-1" />
                Search Product
              </Label>
              <Input
                placeholder="Search by product name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Status</Label>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-gray-500"
            >
              Reset to Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Product Indent List
            {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <Badge variant="secondary" className="ml-auto text-xs">
              {filteredProducts.length} products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
              <span className="text-gray-500">Loading indent summary...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No indent records found</p>
              <p className="text-gray-400 text-sm mt-1">Try changing the date range or clearing filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Product Name</TableHead>
                    <TableHead className="font-semibold text-right">Total Quantity</TableHead>
                    <TableHead className="font-semibold text-right">To Be Produced</TableHead>
                    <TableHead className="font-semibold">Sales Persons</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => (
                    <TableRow key={product.productId || index} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="text-gray-400 text-sm">{index + 1}</TableCell>
                      <TableCell className="text-gray-400 text-sm whitespace-nowrap">
                        {product.date ? new Date(product.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {product.productName || 'Unknown Product'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">
                        {(parseFloat(product.totalQuantity) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {(parseFloat(product.toBeProducedDay) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {product.salesBreakdown && product.salesBreakdown.length > 0 ? (
                          <div className="space-y-0.5">
                            {product.salesBreakdown.slice(0, 3).map((sb, i) => (
                              <div key={i} className="text-xs text-gray-600">
                                <span className="font-medium">{sb.salesPersonName || sb.salesPerson}</span>
                                {sb.totalQuantity ? (
                                  <span className="ml-1 text-blue-600 font-medium">({sb.totalQuantity})</span>
                                ) : null}

                              </div>
                            ))}
                            {product.salesBreakdown.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{product.salesBreakdown.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
