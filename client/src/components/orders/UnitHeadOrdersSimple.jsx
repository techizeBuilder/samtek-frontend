import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function UnitHeadOrdersManagement() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-gray-50/50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <span className="break-words">Orders Management</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Create, manage and track production orders for your unit
            </p>
          </div>
        </div>

        {/* Placeholder Content */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Orders Management - Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Full Orders Management
              </h3>
              <p className="text-gray-600">
                Complete CRUD functionality for orders is being implemented. 
                You can already view orders from the dashboard.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                User: {user?.username} ({user?.role})
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}