import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Eye, Wallet } from 'lucide-react';

// Dummy data for Bank & Cash
const bankCashData = [
  {
    id: '1',
    accountName: 'Cash in Hand - Office',
    accountType: 'Cash',
    balance: 450000,
    lastUpdated: '2025-02-16',
    status: 'Active',
    currency: 'INR',
    description: 'Physical cash at main office'
  },
  {
    id: '2',
    accountName: 'SBI Current Account',
    accountType: 'Bank',
    balance: 2850000,
    lastUpdated: '2025-02-16',
    status: 'Active',
    currency: 'INR',
    description: 'Main business bank account',
    accountNumber: 'XX****1234'
  },
  {
    id: '3',
    accountName: 'HDFC Savings Account',
    accountType: 'Bank',
    balance: 580000,
    lastUpdated: '2025-02-15',
    status: 'Active',
    currency: 'INR',
    description: 'Reserve business account',
    accountNumber: 'XX****5678'
  },
  {
    id: '4',
    accountName: 'Cash in Hand - Branch',
    accountType: 'Cash',
    balance: 120000,
    lastUpdated: '2025-02-16',
    status: 'Active',
    currency: 'INR',
    description: 'Physical cash at branch office'
  },
];

const BankAndCash = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bank': return 'bg-blue-100 text-blue-800';
      case 'Cash': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = bankCashData.filter(item => {
    const matchesSearch = item.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || item.accountType === filterType;
    return matchesSearch && matchesType;
  });

  const types = ['All', 'Bank', 'Cash'];

  const totalBalance = filteredData.reduce((sum, item) => sum + item.balance, 0);
  const bankBalance = filteredData.filter(i => i.accountType === 'Bank').reduce((sum, item) => sum + item.balance, 0);
  const cashBalance = filteredData.filter(i => i.accountType === 'Cash').reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Bank & Cash Management</h1>
            <p className="text-gray-600 mt-2">Monitor bank accounts and cash positions</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </Button>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Record Transaction
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalBalance / 100000).toFixed(2)} L</p>
                </div>
                <Wallet className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bank Balance</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(bankBalance / 100000).toFixed(2)} L</p>
                </div>
                <Wallet className="w-10 h-10 text-cyan-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cash in Hand</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(cashBalance / 100000).toFixed(2)} L</p>
                </div>
                <Wallet className="w-10 h-10 text-green-600 opacity-20" />
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
                    placeholder="Search by account name..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {types.map(type => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={filterType === type ? "bg-gradient-to-r from-blue-600 to-cyan-600" : ""}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank & Cash Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Accounts ({filteredData.length})</CardTitle>
            <CardDescription>All bank and cash accounts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Account Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Currency</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Last Updated</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{account.accountName}</p>
                          <p className="text-xs text-gray-500">{account.description}</p>
                          {account.accountNumber && (
                            <p className="text-xs text-gray-600 mt-1">{account.accountNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getTypeColor(account.accountType)}>{account.accountType}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{account.balance.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{account.currency}</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-green-100 text-green-800">{account.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{new Date(account.lastUpdated).toLocaleDateString()}</td>
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

export default BankAndCash;
