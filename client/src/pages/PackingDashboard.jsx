import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Box,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  Truck,
  Archive,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { config } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';

export default function PackingDashboard() {
  const { toast } = useToast();
  const [productionGroups, setProductionGroups] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch production groups for packing
  const fetchProductionGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${config.baseURL}/api/packing/production-groups`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Production groups data:', result);

      if (result.success) {
        setProductionGroups(result.data.productionGroups || []);
      } else {
        throw new Error(result.message || 'Failed to fetch production groups');
      }
    } catch (error) {
      console.error('Error fetching production groups:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to load production groups data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${config.baseURL}/api/packing/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardStats(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchProductionGroups();
    fetchDashboardStats();
  }, []);

  // Refresh data function
  const handleRefresh = () => {
    fetchProductionGroups();
    fetchDashboardStats();
  };
  const [selectedView, setSelectedView] = useState('overview');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Running': return 'bg-green-100 text-green-800 border-green-200';
      case 'Break': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Setup': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Maintenance': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaterialStatus = (status) => {
    switch (status) {
      case 'Good': return 'bg-green-100 text-green-800';
      case 'Low': return 'bg-yellow-100 text-yellow-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSpeedColor = (speed) => {
    switch (speed) {
      case 'Fast': return 'text-green-600';
      case 'Normal': return 'text-blue-600';
      case 'Slow': return 'text-orange-600';
      case 'Idle': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-10 w-10" />
              Packing Dashboard
            </h1>
            <p className="text-teal-100 mt-2">
              Monitor packing operations, order queue, and material inventory
            </p>
          </div>
        </div>
      </div>

      {/* Key Packing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Packed</CardTitle>
            <Box className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.todaysPacked || 0}</div>
            <p className="text-xs text-muted-foreground">
              Target: {dashboardStats?.todayTarget || 0} packages
            </p>
            <Progress value={dashboardStats?.todayTarget ? ((dashboardStats.todaysPacked / dashboardStats.todayTarget) * 100) : 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Packers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.activePackers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.activePacking || 0} active sheets
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.completedSheets || 0} completed today
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.efficiency || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Loss: {dashboardStats?.packingLoss || 0} units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Groups for Packing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Production Groups for Packing
              </CardTitle>
              <CardDescription>
                Indent quantities vs produced quantities for each production group
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">Error loading production groups</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : productionGroups.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No production groups found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productionGroups.map((group) => (
                <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      {group.description && (
                        <p className="text-gray-600 text-sm">{group.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {group.totalItems} items • Created by {group.createdBy}
                      </p>
                    </div>
                    {/* <Badge variant="outline" className="text-xs">
                      Group #{group._id.slice(-6)}
                    </Badge> */}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Indent Qty */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Indent Qty</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {group.qtyPerBatch || 0}
                      </div>
                      <p className="text-xs text-blue-600">Per Batch Target</p>
                    </div>

                    {/* Produced Qty */}
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Produced Qty</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {group.qtyAchievedPerBatch || 0}
                      </div>
                      <p className="text-xs text-green-600">Achieved Per Batch</p>
                    </div>

                    {/* Progress & Status */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-800">Progress</span>
                      </div>
                      <div className="space-y-2">
                        {group.qtyPerBatch > 0 ? (
                          <>
                            <div className="text-lg font-bold text-gray-700">
                              {Math.round(((group.qtyAchievedPerBatch || 0) / group.qtyPerBatch) * 100)}%
                            </div>
                            <Progress 
                              value={((group.qtyAchievedPerBatch || 0) / group.qtyPerBatch) * 100} 
                              className="h-2"
                            />
                            <p className="text-xs text-gray-600">
                              {(group.qtyAchievedPerBatch || 0)} of {group.qtyPerBatch}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-gray-500">N/A</div>
                            <p className="text-xs text-gray-500">No target set</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicators */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      {(group.qtyAchievedPerBatch || 0) >= (group.qtyPerBatch || 1) ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Target Achieved
                        </Badge>
                      ) : (group.qtyAchievedPerBatch || 0) > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not Started
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(group.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}