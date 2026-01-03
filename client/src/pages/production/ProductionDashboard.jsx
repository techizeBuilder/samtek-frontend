import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  RefreshCw,
  Package,
  Factory,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function ProductionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState('today');
  const [showUngroupedItems, setShowUngroupedItems] = useState(true); // Set to true for testing

  // Fetch production dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['production-dashboard'],
    queryFn: () => apiRequest('GET', '/api/production/dashboard'),
    staleTime: 30000, // Refetch every 30 seconds
    refetchInterval: 30000 // Auto-refresh
  });

  // Fetch ungrouped items data using new endpoint
  const {
    data: ungroupedData,
    isLoading: ungroupedLoading,
    error: ungroupedError,
    refetch: refetchUngrouped
  } = useQuery({
    queryKey: ['production-ungrouped-item-group'],
    queryFn: () => apiRequest('GET', '/api/production/ungrouped-items'),
    staleTime: 30000,
    refetchInterval: 30000
  });

  const productGroups = dashboardData?.data || [];
  const stats = dashboardData?.stats || {
    totalGroups: 0,
    totalItems: 0
  };

  const ungroupedItems = ungroupedData?.data?.items || [];
  const ungroupedStats = ungroupedData?.data || {
    ungroupedItemsCount: 0,
    totalItems: 0,
    assignedItemsCount: 0
  };

  // Simplified debug
  console.log('🔄 Render - showUngroupedItems:', showUngroupedItems, '| Items count:', ungroupedStats.ungroupedItemsCount);

  if (error || ungroupedError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 text-sm mt-1">
            {error?.message || ungroupedError?.message || 'Unknown error occurred'}
          </p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => refetch()} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Dashboard
            </Button>
            <Button onClick={() => refetchUngrouped()} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Ungrouped
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Dashboard</h1>
          <p className="text-gray-600">Monitor and manage production activities</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - Production Groups, Total Items, and Ungrouped Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {isLoading ? '...' : stats.totalGroups}
                </p>
                <p className="text-sm text-blue-600">Total Production Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {isLoading ? '...' : stats.totalItems}
                </p>
                <p className="text-sm text-green-600">Total Items in Production</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-r from-orange-50 to-amber-50 cursor-pointer hover:shadow-lg transition-all border-2 border-orange-200 hover:border-orange-300"
          onClick={() => {
            console.log('🔄 CARD CLICKED! Current state:', showUngroupedItems);
            console.log('🔄 About to toggle state...');
            setShowUngroupedItems(prev => {
              const newState = !prev;
              console.log('🔄 State toggled from', prev, 'to', newState);
              return newState;
            });
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">
                  {ungroupedLoading ? '...' : ungroupedStats.ungroupedItemsCount}
                </p>
                <p className="text-sm text-orange-600">Ungrouped Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Groups with Batch Counts */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Product Sales Management - Production with Final Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Group</TableHead>
                      <TableHead className="text-center">No. Of Batches for Production</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : productGroups.length === 0 ? (
              <div className="text-center py-8">
                <Factory className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No production groups found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Group</TableHead>
                    <TableHead className="text-center">No. Of Batches for Production</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productGroups.map((group, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{group.productGroup}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {group.noOfBatchesForProduction}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ungrouped Items Section */}
      {showUngroupedItems && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                Ungrouped Items - Production with Final Batches
                <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200">
                  {ungroupedStats.ungroupedItemsCount} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ungroupedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-gray-500">Loading ungrouped items...</span>
                </div>
              ) : ungroupedError ? (
                <div className="text-center py-8">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600">Error loading ungrouped items: {ungroupedError.message}</p>
                    <Button onClick={() => refetchUngrouped()} className="mt-2 bg-red-600 hover:bg-red-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : ungroupedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-green-400 mb-4" />
                  <p className="text-green-600 font-medium">All items are assigned to production groups!</p>
                  <p className="text-gray-500 text-sm">No ungrouped items found.</p>
                </div>
              ) : (
                <div>
                  {/* <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-800">
                      <strong>{ungroupedStats.ungroupedItemsCount}</strong> items are not assigned to any production group out of <strong>{ungroupedStats.totalItems}</strong> total items.
                    </p>
                  </div> */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-center">No. Of Batches for Production</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ungroupedLoading ? (
                        [...Array(4)].map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="w-8 h-8 rounded" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        ungroupedItems.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-8 h-8 rounded object-cover"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                {item.name}
                              </div>
                            </TableCell>
                      
                            <TableCell className="text-center">
                              <Badge variant={item.batchAdjusted > 0 ? "default" : "secondary"}>
                                {item.batchAdjusted || 0}
                              </Badge>
                            </TableCell>
                       
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div> 
              )}
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
}