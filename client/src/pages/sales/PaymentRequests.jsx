import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadApi } from '@/api/leadService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

const PaymentRequests = () => {
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['sales-payment-requests'],
    queryFn: () => leadApi.getAll({}),
  });

  const leads = leadsData?.leads || [];
  // Filter leads that have requested a payment check
  const paymentRequests = leads.filter(l => l.paymentCheckStatus && l.paymentCheckStatus !== 'Not Requested');

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Payment Requests</h1>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : paymentRequests.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
            <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Payment Requests</h3>
            <p className="text-gray-400 mt-2">You haven't requested any payment checks yet.</p>
          </div>
        ) : (
          paymentRequests.map((lead) => (
            <Card key={lead._id} className="shadow-sm border-gray-100 hover:border-blue-200 transition-colors">
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{lead.companyName}</h3>
                  <p className="text-sm text-gray-600">Contact: {lead.contactPerson} ({lead.mobile})</p>
                  <p className="text-sm text-gray-600">Lead ID: #{lead.leadCode}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={
                    lead.paymentCheckStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                    lead.paymentCheckStatus === 'Partially Paid' ? 'bg-blue-100 text-blue-700' :
                    lead.paymentCheckStatus === 'Pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {lead.paymentCheckStatus}
                  </Badge>
                  {lead.status === 'Won' && (
                    <Badge className="bg-green-600 text-white">Deal Won</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentRequests;
