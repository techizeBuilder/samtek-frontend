import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Eye, Building } from 'lucide-react';

// Dummy data for Inter Unit
const interUnitData = [
  {
    id: '1',
    transferNo: 'TRF-2025-001',
    fromUnit: 'Mumbai Head Office',
    toUnit: 'Delhi Branch',
    amount: 250000,
    date: '2025-02-14',
    status: 'Completed',
    description: 'Inter unit fund transfer',
    refNo: 'REF-001'
  },
  {
    id: '2',
    transferNo: 'TRF-2025-002',
    fromUnit: 'Delhi Branch',
    toUnit: 'Bangalore Unit',
    amount: 180000,
    date: '2025-02-12',
    status: 'Pending',
    description: 'Working capital transfer',
    refNo: 'REF-002'
  },
  {
    id: '3',
    transferNo: 'TRF-2025-003',
    fromUnit: 'Bangalore Unit',
    toUnit: 'Pune Office',
    amount: 350000,
    date: '2025-02-10',
    status: 'Completed',
    description: 'Project fund allocation',
    refNo: 'REF-003'
  },
  {
    id: '4',
    transferNo: 'TRF-2025-004',
    fromUnit: 'Pune Office',
    toUnit: 'Mumbai Head Office',
    amount: 120000,
    date: '2025-02-08',
    status: 'Completed',
    description: 'Cash reconciliation',
    refNo: 'REF-004'
  },
];

const InterUnit = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = interUnitData.filter(item => {
    const matchesSearch = item.transferNo.includes(searchTerm) || 
                         item.fromUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.toUnit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', 'Completed', 'Pending', 'Rejected'];

  const totalTransferred = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Inter Unit Transfers</h1>
            <p className="text-gray-600 mt-2">Manage transfers between different units</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Transferred</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalTransferred / 100000).toFixed(2)} L</p>
                </div>
                <Building className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Transfers</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredData.filter(i => i.status === 'Completed').length}</p>
                </div>
                <Building className="w-10 h-10 text-blue-600 opacity-20" />
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
                    placeholder="Search by transfer number or unit..."
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
                    className={filterStatus === status ? "bg-gradient-to-r from-indigo-600 to-blue-600" : ""}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inter Unit Transfer Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Transfers ({filteredData.length})</CardTitle>
            <CardDescription>Inter unit fund transfers</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Transfer No</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">From Unit</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">To Unit</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-gray-900">{item.transferNo}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.fromUnit}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.toUnit}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
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

export default InterUnit;
