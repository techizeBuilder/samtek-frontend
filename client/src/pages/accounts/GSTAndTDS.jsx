import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, BarChart3, TrendingUp } from 'lucide-react';

// Dummy data for GST & TDS
const gstTdsData = [
  {
    id: '1',
    period: 'Feb 2025',
    transactionType: 'Sales',
    gstAmount: 450000,
    tdsAmount: 25000,
    netAmount: 425000,
    status: 'Declared',
    dueDate: '2025-02-20',
    month: 'February'
  },
  {
    id: '2',
    period: 'Jan 2025',
    transactionType: 'Purchases',
    gstAmount: 320000,
    tdsAmount: 18000,
    netAmount: 302000,
    status: 'Submitted',
    dueDate: '2025-01-20',
    month: 'January'
  },
  {
    id: '3',
    period: 'Dec 2024',
    transactionType: 'Sales',
    gstAmount: 380000,
    tdsAmount: 22000,
    netAmount: 358000,
    status: 'Approved',
    dueDate: '2024-12-20',
    month: 'December'
  },
];

const GSTAndTDS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Declared': return 'bg-blue-100 text-blue-800';
      case 'Submitted': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = gstTdsData.filter(item => {
    const matchesSearch = item.period.includes(searchTerm) || 
                         item.transactionType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', 'Declared', 'Submitted', 'Approved'];

  const totalGST = filteredData.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalTDS = filteredData.reduce((sum, item) => sum + item.tdsAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">GST & TDS Management</h1>
            <p className="text-gray-600 mt-2">Track and manage GST and TDS compliance</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total GST</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalGST / 100000).toFixed(2)} L</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total TDS</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalTDS / 1000).toFixed(1)}K</p>
                </div>
                <TrendingUp className="w-10 h-10 text-pink-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Liability</p>
                  <p className="text-2xl font-bold text-gray-900">₹{((totalGST + totalTDS) / 100000).toFixed(2)} L</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by period or type..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {statuses.map(status => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className={filterStatus === status ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST & TDS Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>GST & TDS Returns ({filteredData.length})</CardTitle>
            <CardDescription>Tax compliance records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Period</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">GST Amount</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">TDS Amount</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Net Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Due Date</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.period}</td>
                      <td className="px-6 py-4 text-gray-600">{item.transactionType}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{item.gstAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{item.tdsAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{item.netAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{new Date(item.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GSTAndTDS;
