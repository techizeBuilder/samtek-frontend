import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Edit,
  Eye,
  Calendar,
  Clock,
  User,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle,
  Filter,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function BatchProductionRegister() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Mock data - replace with actual API calls
  const productionRecords = [
    {
      id: 'PR001',
      batchId: 'BATCH001',
      productName: 'Product A',
      plannedQuantity: 1000,
      actualProducedQuantity: 950,
      damagesLosses: 50,
      productionHeadName: 'Alice Johnson',
      machineUsed: 'Machine A1',
      shiftDetails: 'Morning Shift (8:00 AM - 4:00 PM)',
      startDateTime: '2024-11-24T08:15:00',
      endDateTime: '2024-11-24T15:45:00',
      totalDuration: '7h 30m',
      qualityGrade: 'A',
      efficiency: 95,
      rawMaterialsUsed: [
        { name: 'Raw Material A', planned: 100, actual: 98, unit: 'kg' },
        { name: 'Raw Material B', planned: 50, actual: 52, unit: 'liters' }
      ],
      damageDetails: [
        { description: 'Minor surface defects', quantity: 30, cost: 300 },
        { description: 'Machine calibration issues', quantity: 20, cost: 200 }
      ],
      remarks: 'Production completed successfully with minor issues',
      status: 'Completed',
      verifiedBy: 'John Doe',
      verificationDate: '2024-11-24T16:00:00',
      createdAt: '2024-11-24T08:00:00',
      updatedAt: '2024-11-24T16:00:00'
    },
    {
      id: 'PR002',
      batchId: 'BATCH002',
      productName: 'Product B',
      plannedQuantity: 500,
      actualProducedQuantity: 480,
      damagesLosses: 20,
      productionHeadName: 'Bob Wilson',
      machineUsed: 'Machine B2',
      shiftDetails: 'Afternoon Shift (2:00 PM - 10:00 PM)',
      startDateTime: '2024-11-24T14:00:00',
      endDateTime: '2024-11-24T21:30:00',
      totalDuration: '7h 30m',
      qualityGrade: 'B',
      efficiency: 96,
      rawMaterialsUsed: [
        { name: 'Raw Material C', planned: 75, actual: 76, unit: 'kg' },
        { name: 'Raw Material D', planned: 25, actual: 25, unit: 'liters' }
      ],
      damageDetails: [
        { description: 'Quality control rejection', quantity: 20, cost: 150 }
      ],
      remarks: 'Good production run with acceptable quality',
      status: 'Verified',
      verifiedBy: 'Jane Smith',
      verificationDate: '2024-11-24T22:00:00',
      createdAt: '2024-11-24T14:00:00',
      updatedAt: '2024-11-24T22:00:00'
    },
    {
      id: 'PR003',
      batchId: 'BATCH003',
      productName: 'Product C',
      plannedQuantity: 750,
      actualProducedQuantity: 725,
      damagesLosses: 25,
      productionHeadName: 'Carol Davis',
      machineUsed: 'Machine C3',
      shiftDetails: 'Night Shift (10:00 PM - 6:00 AM)',
      startDateTime: '2024-11-23T22:00:00',
      endDateTime: '2024-11-24T05:45:00',
      totalDuration: '7h 45m',
      qualityGrade: 'A',
      efficiency: 97,
      rawMaterialsUsed: [
        { name: 'Raw Material E', planned: 60, actual: 59, unit: 'kg' }
      ],
      damageDetails: [
        { description: 'End-of-batch quality issues', quantity: 25, cost: 125 }
      ],
      remarks: 'Excellent production with minimal waste',
      status: 'Pending Verification',
      verifiedBy: null,
      verificationDate: null,
      createdAt: '2024-11-23T22:00:00',
      updatedAt: '2024-11-24T06:00:00'
    }
  ];

  const [editFormData, setEditFormData] = useState({
    actualProducedQuantity: '',
    damagesLosses: '',
    qualityGrade: '',
    remarks: '',
    damageDetails: []
  });

  // Filter records based on search and filters
  const filteredRecords = productionRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.productionHeadName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    const matchesDate = !dateFilter || 
      record.startDateTime.includes(dateFilter);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setEditFormData({
      actualProducedQuantity: record.actualProducedQuantity.toString(),
      damagesLosses: record.damagesLosses.toString(),
      qualityGrade: record.qualityGrade,
      remarks: record.remarks,
      damageDetails: [...record.damageDetails]
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    toast({
      title: "Record Updated",
      description: `Production record ${selectedRecord.id} has been updated successfully`,
    });
    setShowEditModal(false);
    setSelectedRecord(null);
  };

  const downloadExcelReport = () => {
    toast({
      title: "Download Started",
      description: "Excel report is being generated and will download shortly",
    });
  };

  const downloadPDFReport = () => {
    toast({
      title: "Download Started", 
      description: "PDF report is being generated and will download shortly",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending Verification': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canEdit = (record) => {
    // Only production head can edit their own records, or unit manager can edit any
    return user?.role === 'Unit Head' || 
           (user?.role === 'Production Head' && record.productionHeadName === user?.name);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Production Register</h1>
          <p className="text-gray-600">Official record of all production activities</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadExcelReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
          <Button variant="outline" onClick={downloadPDFReport}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by batch ID, product, or production head..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date Filter</Label>
              <Input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Production Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Production Head</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.batchId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.productName}</div>
                        <div className="text-sm text-gray-500">
                          Machine: {record.machineUsed}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{record.actualProducedQuantity}</span>
                          <span className="text-gray-500"> / {record.plannedQuantity}</span>
                        </div>
                        {record.damagesLosses > 0 && (
                          <div className="text-xs text-red-600">
                            -{record.damagesLosses} damaged
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.productionHeadName}</div>
                        <div className="text-sm text-gray-500">{record.shiftDetails}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{record.totalDuration}</div>
                        <div className="text-gray-500">
                          {new Date(record.startDateTime).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className={getGradeColor(record.qualityGrade)}>
                          Grade {record.qualityGrade}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {record.efficiency}% efficiency
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Production Record Details - {record.id}</DialogTitle>
                              <DialogDescription>
                                Complete production record for batch {record.batchId}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Production Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Batch ID:</span> {record.batchId}</div>
                                    <div><span className="font-medium">Product:</span> {record.productName}</div>
                                    <div><span className="font-medium">Planned Qty:</span> {record.plannedQuantity} units</div>
                                    <div><span className="font-medium">Actual Produced:</span> {record.actualProducedQuantity} units</div>
                                    <div><span className="font-medium">Damages/Losses:</span> {record.damagesLosses} units</div>
                                    <div><span className="font-medium">Quality Grade:</span> {record.qualityGrade}</div>
                                    <div><span className="font-medium">Efficiency:</span> {record.efficiency}%</div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Resources</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Production Head:</span> {record.productionHeadName}</div>
                                    <div><span className="font-medium">Machine Used:</span> {record.machineUsed}</div>
                                    <div><span className="font-medium">Shift:</span> {record.shiftDetails}</div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Timeline</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Start:</span> {new Date(record.startDateTime).toLocaleString()}</div>
                                    <div><span className="font-medium">End:</span> {new Date(record.endDateTime).toLocaleString()}</div>
                                    <div><span className="font-medium">Duration:</span> {record.totalDuration}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Raw Materials Used</h4>
                                  <div className="space-y-2">
                                    {record.rawMaterialsUsed.map((material, index) => (
                                      <div key={index} className="flex justify-between text-sm border-b pb-1">
                                        <span>{material.name}</span>
                                        <span>
                                          {material.actual} {material.unit} 
                                          <span className="text-gray-500"> (planned: {material.planned})</span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Damage Details</h4>
                                  <div className="space-y-2">
                                    {record.damageDetails.map((damage, index) => (
                                      <div key={index} className="text-sm border border-red-200 rounded p-2">
                                        <div className="font-medium">{damage.description}</div>
                                        <div className="text-gray-600">
                                          Quantity: {damage.quantity} units | Cost: ₹{damage.cost}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Remarks</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{record.remarks}</p>
                                </div>

                                {record.verifiedBy && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Verification</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><span className="font-medium">Verified By:</span> {record.verifiedBy}</div>
                                      <div><span className="font-medium">Verification Date:</span> {new Date(record.verificationDate).toLocaleString()}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {canEdit(record) && (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Production Record</DialogTitle>
            <DialogDescription>
              Update production record details (Only Production Head can edit)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actualQuantity">Actual Produced Quantity</Label>
                <Input
                  id="actualQuantity"
                  type="number"
                  value={editFormData.actualProducedQuantity}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    actualProducedQuantity: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="damages">Damages/Losses</Label>
                <Input
                  id="damages"
                  type="number"
                  value={editFormData.damagesLosses}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    damagesLosses: e.target.value
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualityGrade">Quality Grade</Label>
              <Select 
                value={editFormData.qualityGrade}
                onValueChange={(value) => setEditFormData(prev => ({
                  ...prev,
                  qualityGrade: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRemarks">Remarks</Label>
              <Textarea
                id="editRemarks"
                value={editFormData.remarks}
                onChange={(e) => setEditFormData(prev => ({
                  ...prev,
                  remarks: e.target.value
                }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}