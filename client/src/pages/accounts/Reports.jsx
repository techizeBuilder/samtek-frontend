import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Plus, Download, Eye, BarChart3, Calendar } from 'lucide-react';

// Dummy report data
const reportsAvailable = [
  {
    id: '1',
    name: 'Trial Balance Report',
    description: 'Complete trial balance of all accounts',
    category: 'Accounting',
    frequency: 'Monthly',
    lastGenerated: '2025-02-14',
    format: ['PDF', 'Excel']
  },
  {
    id: '2',
    name: 'Profit & Loss Statement',
    description: 'Revenue, expenses and profit/loss calculation',
    category: 'Financial',
    frequency: 'Monthly',
    lastGenerated: '2025-02-14',
    format: ['PDF', 'Excel']
  },
  {
    id: '3',
    name: 'Balance Sheet',
    description: 'Assets, liabilities and equity statement',
    category: 'Financial',
    frequency: 'Quarterly',
    lastGenerated: '2025-02-10',
    format: ['PDF', 'Excel']
  },
  {
    id: '4',
    name: 'Cash Flow Statement',
    description: 'Cash inflows and outflows analysis',
    category: 'Financial',
    frequency: 'Monthly',
    lastGenerated: '2025-02-14',
    format: ['PDF', 'Excel']
  },
  {
    id: '5',
    name: 'Receivables Aging Report',
    description: 'Customer outstanding amounts by age',
    category: 'Receivables',
    frequency: 'Weekly',
    lastGenerated: '2025-02-15',
    format: ['PDF', 'Excel']
  },
  {
    id: '6',
    name: 'Payables Aging Report',
    description: 'Vendor payment due amounts by age',
    category: 'Payables',
    frequency: 'Weekly',
    lastGenerated: '2025-02-15',
    format: ['PDF', 'Excel']
  },
  {
    id: '7',
    name: 'GST Compliance Report',
    description: 'GST return filing details and summary',
    category: 'Tax',
    frequency: 'Monthly',
    lastGenerated: '2025-02-14',
    format: ['PDF', 'Excel']
  },
  {
    id: '8',
    name: 'Ledger Account Statements',
    description: 'Individual account transactions and balance',
    category: 'Accounting',
    frequency: 'On-Demand',
    lastGenerated: '2025-02-16',
    format: ['PDF', 'Excel']
  },
];

const Reports = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('PDF');

  const categories = ['All', 'Accounting', 'Financial', 'Receivables', 'Payables', 'Tax'];

  const filteredReports = reportsAvailable.filter(report => 
    selectedCategory === 'All' || report.category === selectedCategory
  );

  const getCategoryColor = (category) => {
    const colors = {
      'Accounting': 'bg-blue-100 text-blue-800',
      'Financial': 'bg-green-100 text-green-800',
      'Receivables': 'bg-purple-100 text-purple-800',
      'Payables': 'bg-orange-100 text-orange-800',
      'Tax': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getFrequencyIcon = (frequency) => {
    if (frequency === 'On-Demand') return '📋';
    if (frequency === 'Weekly') return '📅';
    if (frequency === 'Monthly') return '📆';
    if (frequency === 'Quarterly') return '📊';
    return '📄';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Generate and view financial and accounting reports</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{reportsAvailable.length}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Available Categories</p>
                  <p className="text-2xl font-bold text-gray-900">{categories.length - 1}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Generated Today</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
                <Calendar className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-gradient-to-r from-purple-600 to-blue-600" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{getFrequencyIcon(report.frequency)}</span>
                      {report.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{report.description}</CardDescription>
                  </div>
                  <Badge className={getCategoryColor(report.category)}>{report.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Report Details */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Frequency:</span>
                      <Badge variant="outline">{report.frequency}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Last Generated:</span>
                      <span className="font-medium text-gray-900">{new Date(report.lastGenerated).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600">Available Formats:</span>
                      <div className="flex gap-2">
                        {report.format.map(fmt => (
                          <Badge key={fmt} variant="secondary" className="text-xs">{fmt}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom Report Section */}
        <Card className="mt-6 shadow-lg border-0 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="border-b">
            <CardTitle>Create Custom Report</CardTitle>
            <CardDescription>Generate reports based on your specific requirements</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Custom Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
