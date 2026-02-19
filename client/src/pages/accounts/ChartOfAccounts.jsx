import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';

// Dummy data for Chart of Accounts
const chartOfAccountsData = [
  {
    id: '1001',
    accountCode: '1001',
    accountName: 'Cash in Hand',
    accountType: 'Asset',
    balance: 450000,
    status: 'Active',
    description: 'Physical cash held at office'
  },
  {
    id: '1002',
    accountCode: '1002',
    accountName: 'Bank Account - SBI',
    accountType: 'Asset',
    balance: 2850000,
    status: 'Active',
    description: 'Main operating bank account'
  },
  {
    id: '1010',
    accountCode: '1010',
    accountName: 'Accounts Receivable',
    accountType: 'Asset',
    balance: 1240000,
    status: 'Active',
    description: 'Customer outstanding amounts'
  },
  {
    id: '2001',
    accountCode: '2001',
    accountName: 'Accounts Payable',
    accountType: 'Liability',
    balance: 850000,
    status: 'Active',
    description: 'Vendor payment obligations'
  },
  {
    id: '3001',
    accountCode: '3001',
    accountName: 'Sales Revenue',
    accountType: 'Income',
    balance: 28400000,
    status: 'Active',
    description: 'Revenue from product sales'
  },
  {
    id: '4001',
    accountCode: '4001',
    accountName: 'Cost of Goods Sold',
    accountType: 'Expense',
    balance: 15600000,
    status: 'Active',
    description: 'Direct production costs'
  },
  {
    id: '4010',
    accountCode: '4010',
    accountName: 'Salaries & Wages',
    accountType: 'Expense',
    balance: 4200000,
    status: 'Active',
    description: 'Employee compensation'
  },
  {
    id: '4020',
    accountCode: '4020',
    accountName: 'Rent & Utilities',
    accountType: 'Expense',
    balance: 1800000,
    status: 'Active',
    description: 'Office rent and utilities'
  },
];

const ChartOfAccounts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const getTypeColor = (type) => {
    switch (type) {
      case 'Asset': return 'bg-blue-100 text-blue-800';
      case 'Liability': return 'bg-red-100 text-red-800';
      case 'Income': return 'bg-green-100 text-green-800';
      case 'Expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAccounts = chartOfAccountsData.filter(account => {
    const matchesSearch = account.accountCode.includes(searchTerm) || 
                         account.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || account.accountType === filterType;
    return matchesSearch && matchesType;
  });

  const accountTypes = ['All', 'Asset', 'Liability', 'Income', 'Expense'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-600 mt-2">Manage your account structure and balances</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by account code or name..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {accountTypes.map(type => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={filterType === type ? "bg-gradient-to-r from-blue-600 to-purple-600" : ""}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Accounts ({filteredAccounts.length})</CardTitle>
            <CardDescription>All accounts in your chart of accounts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 hover:bg-slate-100">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Code</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Account Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-gray-900">{account.accountCode}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{account.accountName}</p>
                          <p className="text-xs text-gray-500">{account.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getTypeColor(account.accountType)}>{account.accountType}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ₹{account.balance.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-green-100 text-green-800">{account.status}</Badge>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">₹45.40 Lakhs</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">₹8.50 Lakhs</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Income</p>
              <p className="text-2xl font-bold text-green-600">₹2.84 Cr</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
              <p className="text-2xl font-bold text-orange-600">₹2.16 Cr</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChartOfAccounts;
