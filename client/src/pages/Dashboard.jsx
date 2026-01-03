import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MetricsCard from "@/components/dashboard/MetricsCard";
import ProductionChart from "@/components/dashboard/ProductionChart";
import SalesChart from "@/components/dashboard/SalesChart";
import RecentOrders from "@/components/dashboard/RecentOrders";

import QuickActions from "@/components/dashboard/QuickActions";
import {
  ShoppingCart,
  Cog,
  Truck,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    enabled: true,
  });

  const metrics = metricsData?.metrics || {};

  // Live clock functionality
  const [currentTime, setCurrentTime] = useState(new Date());
  React.useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  return (
    <div className="space-y-6 px-4 md:px-0">
      {/* Welcome Section - Full Width */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Welcome Message - 6 columns */}
        <div className="col-span-12 md:col-span-8">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold">
                Welcome back, {user?.fullName || user?.username}!
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                {user?.role} • {user?.unit || "System Access"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-blue-100">
                  <Users className="w-5 h-5" />
                  <span className="text-lg">
                    Ready to manage your operations
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-blue-100">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date & Time Section - 3 columns */}
        <div className="col-span-12 md:col-span-4">
          <Card className="h-full bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg text-indigo-700">
                <Calendar className="w-5 h-5 mr-2" />
                Live Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-slate-900">
                  {currentTime.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-lg font-mono text-indigo-600">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
                <div className="text-sm text-slate-600">
                  {currentTime.toLocaleDateString("en-US", { weekday: "long" })}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Week{" "}
                    {Math.ceil(
                      (currentTime.getDate() + currentTime.getDay()) / 7,
                    )}
                  </span>
                  <span className="px-2 py-1 bg-indigo-100 rounded-full">
                    {currentTime.toLocaleDateString("en-US", {
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Analytics Overview
        </h2>
        <Button variant="outline" size="sm" className="w-fit">
          <TrendingUp className="w-4 h-4 mr-2" />
          Last 30 days
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricsCard
          title="Total Orders"
          value={
            isLoading ? "..." : metrics.totalOrders?.toLocaleString() || "0"
          }
          change={
            isLoading ? "" : `${metrics.ordersGrowth || 0}% from last month`
          }
          changeType={metrics.ordersGrowth >= 0 ? "increase" : "decrease"}
          icon={ShoppingCart}
          color="blue"
        />

        <MetricsCard
          title="Production"
          value={isLoading ? "..." : `${metrics.production || 0}%`}
          change={
            isLoading ? "" : `${metrics.productionGrowth || 0}% efficiency`
          }
          changeType="increase"
          icon={Cog}
          color="green"
        />

        <MetricsCard
          title="Dispatches"
          value={
            isLoading ? "..." : metrics.dispatches?.toLocaleString() || "0"
          }
          change={isLoading ? "" : `${metrics.dispatchesChange || 0}% pending`}
          changeType="decrease"
          icon={Truck}
          color="orange"
        />

        <MetricsCard
          title="Revenue"
          value={
            isLoading ? "..." : `₹${(metrics.revenue || 0).toLocaleString()}`
          }
          change={
            isLoading ? "" : `${metrics.revenueGrowth || 0}% this quarter`
          }
          changeType={metrics.revenueGrowth >= 0 ? "increase" : "decrease"}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ProductionChart />
        <SalesChart />
      </div>

      {/* Recent Activities and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <RecentOrders />
        </div>
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
