import React, { useState, useEffect } from 'react';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Truck,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Simple Card component to replace the problematic UI imports
const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border bg-white shadow-sm ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className = "" }) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

const Button = ({ children, onClick, className = "", disabled = false }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 ${className}`}
  >
    {children}
  </button>
);

const Progress = ({ value, className = "" }) => (
  <div className={`relative w-full overflow-hidden rounded-full bg-secondary ${className}`}>
    <div 
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
);

// Helper to show dates as DD-MM-YYYY
const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function DispatchDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [manualStockEntries, setManualStockEntries] = useState({});
  const [dispatchedQuantities, setDispatchedQuantities] = useState({});

  const [expandedEntryKeys, setExpandedEntryKeys] = useState({});
  const [entryHistoryByKey, setEntryHistoryByKey] = useState({});
  const [entryHistoryLoadingByKey, setEntryHistoryLoadingByKey] = useState({});
  const [entryHistoryErrorByKey, setEntryHistoryErrorByKey] = useState({});

  const { toast } = useToast();

  const getEntryHistoryKey = (entry) => {
    const groupStr = typeof entry?.productGroup === 'string' ? entry.productGroup : '';
    const isUngrouped = groupStr.toLowerCase().startsWith('ungrouped items');

    if (isUngrouped && groupStr) return `group:${groupStr}`;
    if (entry?.productId) return `product:${entry.productId}`;
    return `group:${groupStr || 'unknown'}`;
  };

  const fetchEntryHistory = async (entry, historyKey) => {
    try {
      setEntryHistoryLoadingByKey(prev => ({
        ...prev,
        [historyKey]: true
      }));
      setEntryHistoryErrorByKey(prev => ({
        ...prev,
        [historyKey]: null
      }));

      const params = new URLSearchParams();
      params.append('days', '30');
      if (entry?.productId) params.append('productId', entry.productId);
      if (entry?.productGroup) params.append('productGroup', entry.productGroup);

      const response = await fetch(`${config.baseURL}/api/dispatches/dashboard-entry-history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      setEntryHistoryByKey(prev => ({
        ...prev,
        [historyKey]: result.data
      }));
    } catch (err) {
      console.error('Error fetching entry history:', err);
      const msg = err?.message || 'Failed to load history';
      setEntryHistoryErrorByKey(prev => ({
        ...prev,
        [historyKey]: msg
      }));
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setEntryHistoryLoadingByKey(prev => ({
        ...prev,
        [historyKey]: false
      }));
    }
  };

  const fetchDashboardData = async (opts = {}) => {
    try {
      setLoading(true);
      // allow passing startDate/endDate via opts or state
      const params = new URLSearchParams();
      const sd = opts.startDate !== undefined ? opts.startDate : startDate;
      const ed = opts.endDate !== undefined ? opts.endDate : endDate;
      if (sd) params.append('startDate', sd);
      if (ed) params.append('endDate', ed);

      const response = await fetch(`${config.baseURL}/api/dispatches/dashboard?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
        setError(null);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
    toast({
      title: 'Success',
      description: 'Dashboard refreshed successfully'
    });
  };

  const handleApplyDateFilter = () => {
    // basic validation: if both set and start > end, swap
    let sd = startDate;
    let ed = endDate;
    if (sd && ed && new Date(sd) > new Date(ed)) {
      const tmp = sd; sd = ed; ed = tmp;
      setStartDate(sd); setEndDate(ed);
    }
    fetchDashboardData({ startDate: sd, endDate: ed });
  };

  const handleClearDateFilter = () => {
    setStartDate(''); setEndDate('');
    fetchDashboardData({ startDate: '', endDate: '' });
  };

  // Update local state only for manual stock entry (for onChange - typing)
  const updateManualStockLocal = (key, value) => {
    setManualStockEntries(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Update local state only for dispatched quantity (for onChange - typing)
  const updateDispatchedQuantityLocal = (key, value) => {
    setDispatchedQuantities(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleManualStockEntry = async (productGroup, packingSheetId, value) => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/manual-stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productGroup,
          packingSheetId,
          physicalStockEntryManualVerification: parseFloat(value) || 0
        })
      });

      if (response.ok) {
        // Refresh dashboard data to get updated calculations
        await fetchDashboardData();
        
        toast({
          title: 'Success',
          description: 'Physical stock entry updated and calculations refreshed'
        });
      } else {
        throw new Error('Failed to update physical stock entry');
      }
    } catch (error) {
      console.error('Error updating physical stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update physical stock entry',
        variant: 'destructive'
      });
    }
  };

  const handleDispatchedQuantityUpdate = async (productGroup, packingSheetId, productId, value) => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/manual-stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productGroup,
          packingSheetId,
          productId, // Include productId to update specific product entry
          dispatchedQuantitySentToday: parseFloat(value) || 0
        })
      });

      if (response.ok) {
        // Refresh dashboard data to get updated calculations
        await fetchDashboardData();
        
        toast({
          title: 'Success',
          description: 'Dispatched quantity updated and calculations refreshed'
        });
      } else {
        throw new Error('Failed to update dispatched quantity');
      }
    } catch (error) {
      console.error('Error updating dispatched quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dispatched quantity',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between space-y-2">
            <div>
              <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="w-8 h-8 text-blue-600" />
                Dispatch Dashboard
            </h2>
            <p className="text-muted-foreground">
              Monitor dispatch operations, inventory status, and delivery tracking
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Packed</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(dashboardData?.summary?.totalPackedQuantity || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Ready for dispatch
              </p>
              <div className="mt-2">
                <Progress value={dashboardData?.summary?.totalPackedQuantity > 0 ? 75 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Available</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(dashboardData?.summary?.totalAvailableStock || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Stock available for dispatch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Console Entries</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.summary?.totalEntries || 0}</div>
              <p className="text-xs text-muted-foreground">
                Dispatch console entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Excess/Shortage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (dashboardData?.summary?.totalExcessShortage || 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {(dashboardData?.summary?.totalExcessShortage || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Overall excess/shortage
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dispatch Console Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">📊 Dispatch Console</CardTitle>
                <CardDescription>
                  Monitor packing operations, order queue, and material inventory
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleApplyDateFilter}
                    className="bg-blue-600 text-white hover:bg-blue-700 h-9 px-3"
                  >
                    Filter
                  </Button>
                  <Button
                    onClick={handleClearDateFilter}
                    className="bg-gray-200 text-gray-800 hover:bg-gray-300 h-9 px-3"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-green-100">
                      Product Group
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-green-100">
                      <div>Packed</div>
                      <div>Quantity</div>
                      <div className="text-xs">Ready for Dispatch</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-orange-100">
                      <div>Previous Closing</div>
                      <div>Stock</div>
                      <div className="text-xs">Yesterday Balance</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-purple-100">
                      <div>Return</div>
                      <div>Quantity</div>
                      <div className="text-xs">Yesterday Returns</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-purple-100">
                      <div>Total Available Stock</div>
                      <div className="text-xs">Packing + Closing + Returns</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-yellow-100">
                      <div>Total Indent</div>
                      <div>Quantity</div>
                      <div className="text-xs">Orders for the Day</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-yellow-100">
                      <div>Excess /</div>
                      <div>Shortage</div>
                      <div className="text-xs">Available - Indent</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-green-100">
                      <div>Dispatched</div>
                      <div>Quantity</div>
                      <div className="text-xs">Sent Today</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-blue-100">
                      <div>Closing Stock</div>
                      <div>End of Day</div>
                      <div className="text-xs">Available - Dispatched</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-blue-100">
                      <div>Physical Stock</div>
                      <div>Entry</div>
                      <div className="text-xs">Manual Verification</div>
                    </th>
                    <th className="border border-gray-900 p-2 text-center font-medium text-sm bg-red-100">
                      <div>Overall Loss</div>
                      <div className="text-xs">Closing - Physical</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-900 p-2 font-medium">Dispatch Console<br />Totals</td>
                    <td className="border border-gray-900 p-2 text-center font-bold">{(dashboardData?.summary?.totalPackedQuantity || 0).toFixed(2)}</td>
                    <td className="border border-gray-900 p-2 text-center">
                      {(dashboardData?.dispatchConsoleEntries?.reduce((sum, entry) => sum + (entry.previousClosingStockYesterdayBalance || 0), 0) || 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-900 p-2 text-center">
                      {(dashboardData?.dispatchConsoleEntries?.reduce((sum, entry) => sum + (entry.returnQuantityYesterdayReturns || 0), 0) || 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-900 p-2 text-center font-bold">{(dashboardData?.summary?.totalAvailableStock || 0).toFixed(2)}</td>
                    <td className="border border-gray-900 p-2 text-center">{(dashboardData?.summary?.totalIndentQuantity || 0).toFixed(2)}</td>
                    <td className="border border-gray-900 p-2 text-center font-bold">
                      <span className={`px-2 py-1 rounded text-sm ${
                        (dashboardData?.summary?.totalExcessShortage || 0) >= 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(dashboardData?.summary?.totalExcessShortage || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="border border-gray-900 p-2 text-center">{(dashboardData?.summary?.totalDispatchedQuantity || 0).toFixed(2)}</td>
                    <td className="border border-gray-900 p-2 text-center font-bold">
                      {(dashboardData?.dispatchConsoleEntries?.reduce((sum, entry) => sum + (entry.closingStockEndOfDayBalance || 0), 0) || 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-900 p-2 text-center">
                      {(dashboardData?.dispatchConsoleEntries?.reduce((sum, entry) => sum + (entry.physicalStockEntryManualVerification || 0), 0) || 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-900 p-2 text-center">
                      <span className="text-red-600 font-medium">
                        {(dashboardData?.dispatchConsoleEntries?.reduce((sum, entry) => sum + (entry.overallLoss || 0), 0) || 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {dashboardData?.dispatchConsoleEntries?.map((entry, index) => {
                    const historyKey = getEntryHistoryKey(entry);
                    const isExpanded = !!expandedEntryKeys[historyKey];
                    const historyData = entryHistoryByKey[historyKey];
                    const isHistoryLoading = !!entryHistoryLoadingByKey[historyKey];
                    const historyError = entryHistoryErrorByKey[historyKey];

                    return (
                      <React.Fragment key={entry.id || historyKey || index}>
                        <tr>
                          <td className="border border-gray-900 p-2">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                className="mt-0.5 text-gray-600 hover:text-gray-900"
                                onClick={() => {
                                  const willOpen = !expandedEntryKeys[historyKey];
                                  setExpandedEntryKeys(prev => ({
                                    ...prev,
                                    [historyKey]: willOpen
                                  }));

                                  if (willOpen && !entryHistoryByKey[historyKey] && !entryHistoryLoadingByKey[historyKey]) {
                                    fetchEntryHistory(entry, historyKey);
                                  }
                                }}
                                aria-label={isExpanded ? 'Collapse history' : 'Expand history'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <div className="font-medium">{entry.productGroup || 'N/A'}</div>
                                <div className="text-sm text-gray-600">
                                  {entry.packingSheetSlNo ? `Sheet: ${entry.packingSheetSlNo}` : 'No Sheet'}
                                  {entry.batchNo && ` • Batch: ${entry.batchNo}`}
                                </div>
                                {formatDisplayDate(entry.date || entry.packingDate) && (
                                  <div className="text-xs text-gray-500">
                                    Date: {formatDisplayDate(entry.date || entry.packingDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-900 p-2 text-center font-medium">{(entry.packedQuantityReadyForDispatch || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center">{(entry.previousClosingStockYesterdayBalance || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center">{(entry.returnQuantityYesterdayReturns || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center font-medium">{(entry.totalAvailableStock || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center">{(entry.totalIndentQuantityOrdersForTheDay || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center">
                            <span className={`font-medium ${
                              (entry.excessShortage || 0) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(entry.excessShortage || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="border border-gray-900 p-2 text-center">
                            <input
                              type="number"
                              className="w-20 p-1 border rounded text-center"
                              value={dispatchedQuantities[`${entry.productGroup}_${entry.packingSheetId}`] ?? entry.dispatchedQuantitySentToday ?? 0}
                              placeholder="0"
                              onChange={(e) => {
                                const key = `${entry.productGroup}_${entry.packingSheetId}`;
                                updateDispatchedQuantityLocal(key, e.target.value);
                              }}
                              onBlur={(e) => {
                                handleDispatchedQuantityUpdate(
                                  entry.productGroup,
                                  entry.packingSheetId,
                                  entry.productId,
                                  e.target.value
                                );
                              }}
                            />
                          </td>
                          <td className="border border-gray-900 p-2 text-center">{(entry.closingStockEndOfDayBalance || 0).toFixed(2)}</td>
                          <td className="border border-gray-900 p-2 text-center">
                            <input
                              type="number"
                              className="w-20 p-1 border rounded text-center"
                              value={manualStockEntries[`${entry.productGroup}_${entry.packingSheetId}`] ?? entry.physicalStockEntryManualVerification ?? 0}
                              placeholder="Manual"
                              onChange={(e) => {
                                const key = `${entry.productGroup}_${entry.packingSheetId}`;
                                updateManualStockLocal(key, e.target.value);
                              }}
                              onBlur={(e) => {
                                handleManualStockEntry(
                                  entry.productGroup,
                                  entry.packingSheetId,
                                  e.target.value
                                );
                              }}
                            />
                          </td>
                          <td className="border border-gray-900 p-2 text-center">
                            <span className={`font-medium ${
                              (entry.overallLoss || 0) !== 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {(entry.overallLoss || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan="11" className="border border-gray-900 p-3">
                              {isHistoryLoading ? (
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Loading history...
                                </div>
                              ) : historyError ? (
                                <div className="text-sm text-red-600">{historyError}</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                      <tr>
                                        <th className="border border-gray-300 p-2 text-left text-xs bg-white">Date</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Packed</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Prev Closing</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Returns (Y)</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Total Available</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Indent</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Excess/Shortage</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Dispatched</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Closing</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Physical</th>
                                        <th className="border border-gray-300 p-2 text-center text-xs bg-white">Overall Loss</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(historyData?.history || []).map((h) => (
                                        <tr key={h.date}>
                                          <td className="border border-gray-300 p-2 text-xs">
                                            {formatDisplayDate(h.date) || h.date}
                                          </td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.packedQuantityReadyForDispatch || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.previousClosingStockYesterdayBalance || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.returnQuantityYesterdayReturns || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.totalAvailableStock || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.totalIndentQuantityOrdersForTheDay || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">
                                            <span className={(h.excessShortage || 0) >= 0 ? 'text-green-700' : 'text-red-700'}>
                                              {(h.excessShortage || 0).toFixed(2)}
                                            </span>
                                          </td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.dispatchedQuantitySentToday || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.closingStockEndOfDayBalance || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">{(h.physicalStockEntryManualVerification || 0).toFixed(2)}</td>
                                          <td className="border border-gray-300 p-2 text-center text-xs">
                                            <span className={(h.overallLoss || 0) !== 0 ? 'text-red-700' : 'text-green-700'}>
                                              {(h.overallLoss || 0).toFixed(2)}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}

                                      {(!historyData?.history || historyData.history.length === 0) && (
                                        <tr>
                                          <td colSpan="11" className="border border-gray-300 p-3 text-center text-xs text-gray-500">
                                            No history found
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  
                  {(!dashboardData?.dispatchConsoleEntries || dashboardData.dispatchConsoleEntries.length === 0) && (
                    <tr>
                      <td colSpan="11" className="border border-gray-900 p-4 text-center text-gray-500">
                        No dispatch console entries found for today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>



      </div>
    </div>
  );
}