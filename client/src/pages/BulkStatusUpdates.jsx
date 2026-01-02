import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BulkStatusUpdates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Bulk Status Updates
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Status Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Perform bulk status updates on multiple records from this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}