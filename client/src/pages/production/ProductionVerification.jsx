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
  CheckCircle,
  XCircle,
  RotateCcw,
  Send,
  Eye,
  AlertTriangle,
  Clock,
  User,
  Package,
  TrendingUp,
  FileText,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function ProductionVerification() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState({
    approvalStatus: '',
    approvalRemarks: '',
    qualityCheck: '',
    quantityVerified: '',
    damageVerified: '',
    nextAction: ''
  });

  // Mock data - replace with actual API calls
  const pendingBatches = [
    {
      id: 'BATCH001',
      planId: 'BP001',
      productName: 'Product A',
      plannedQuantity: 1000,
      reportedQuantity: 950,
      reportedDamages: 50,
      productionHead: 'Alice Johnson',
      completedAt: '2024-11-24T15:45:00',
      machineUsed: 'Machine A1',
      shiftDetails: 'Morning Shift',
      qualityGrade: 'A',
      efficiency: 95,
      productionNotes: 'Production completed successfully with minor issues',
      rawMaterialsUsed: [
        { name: 'Raw Material A', planned: 100, actual: 98, unit: 'kg' },
        { name: 'Raw Material B', planned: 50, actual: 52, unit: 'liters' }
      ],
      damageDetails: [
        { description: 'Minor surface defects', quantity: 30, cost: 300 },
        { description: 'Machine calibration issues', quantity: 20, cost: 200 }
      ],
      status: 'Pending Verification',
      priority: 'High'
    },
    {
      id: 'BATCH003',
      planId: 'BP003',
      productName: 'Product C',
      plannedQuantity: 750,
      reportedQuantity: 725,
      reportedDamages: 25,
      productionHead: 'Carol Davis',
      completedAt: '2024-11-24T05:45:00',
      machineUsed: 'Machine C3',
      shiftDetails: 'Night Shift',
      qualityGrade: 'A',
      efficiency: 97,
      productionNotes: 'Excellent production with minimal waste',
      rawMaterialsUsed: [
        { name: 'Raw Material E', planned: 60, actual: 59, unit: 'kg' }
      ],
      damageDetails: [
        { description: 'End-of-batch quality issues', quantity: 25, cost: 125 }
      ],
      status: 'Pending Verification',
      priority: 'Medium'
    }
  ];

  const verifiedBatches = [
    {
      id: 'BATCH002',
      planId: 'BP002',
      productName: 'Product B',
      plannedQuantity: 500,
      reportedQuantity: 480,
      verifiedQuantity: 475,
      reportedDamages: 20,
      verifiedDamages: 25,
      productionHead: 'Bob Wilson',
      completedAt: '2024-11-24T21:30:00',
      verifiedAt: '2024-11-24T22:00:00',
      verifiedBy: 'Jane Smith',
      verificationStatus: 'Approved',
      verificationRemarks: 'Production approved with quality adjustments',
      finalAction: 'Forwarded to Packing Department',
      status: 'Verified',
      priority: 'Medium'
    }
  ];

  const handleVerify = (batch, action) => {
    setSelectedBatch(batch);
    setVerificationData({
      approvalStatus: action,
      approvalRemarks: '',
      qualityCheck: '',
      quantityVerified: batch.reportedQuantity.toString(),
      damageVerified: batch.reportedDamages.toString(),
      nextAction: action === 'approve' ? 'forward_packing' : 'send_back'
    });
    setShowVerificationModal(true);
  };

  const submitVerification = () => {
    const actionText = verificationData.approvalStatus === 'approve' ? 'approved' : 
                      verificationData.approvalStatus === 'reject' ? 'rejected' : 'sent back for correction';
    
    toast({
      title: "Verification Complete",
      description: `Batch ${selectedBatch.id} has been ${actionText}`,
    });

    setShowVerificationModal(false);
    setSelectedBatch(null);
    setVerificationData({
      approvalStatus: '',
      approvalRemarks: '',
      qualityCheck: '',
      quantityVerified: '',
      damageVerified: '',
      nextAction: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Verification': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Verification & Approval</h1>
          <p className="text-gray-600">Verify and approve completed production batches</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{pendingBatches.length}</p>
                <p className="text-sm text-yellow-600">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{verifiedBatches.filter(b => b.verificationStatus === 'Approved').length}</p>
                <p className="text-sm text-green-600">Approved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-rose-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{verifiedBatches.filter(b => b.verificationStatus === 'Rejected').length}</p>
                <p className="text-sm text-red-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">96%</p>
                <p className="text-sm text-blue-600">Avg Efficiency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verification Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Verification ({pendingBatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Reported Quantity</TableHead>
                  <TableHead>Production Head</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.productName}</div>
                        <div className="text-sm text-gray-500">
                          Planned: {batch.plannedQuantity} units
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">{batch.reportedQuantity} produced</span>
                        </div>
                        {batch.reportedDamages > 0 && (
                          <div className="text-xs text-red-600">
                            {batch.reportedDamages} damaged/lost
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.productionHead}</div>
                        <div className="text-sm text-gray-500">{batch.shiftDetails}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(batch.completedAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Grade {batch.qualityGrade}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {batch.efficiency}% efficiency
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(batch.priority)}>
                        {batch.priority}
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
                              <DialogTitle>Batch Verification Details - {batch.id}</DialogTitle>
                              <DialogDescription>
                                Review production details before verification
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Production Summary</h4>
                                  <div className="space-y-2 text-sm border rounded p-3">
                                    <div className="flex justify-between">
                                      <span>Planned Quantity:</span>
                                      <span className="font-medium">{batch.plannedQuantity} units</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Reported Produced:</span>
                                      <span className="font-medium text-green-600">{batch.reportedQuantity} units</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Reported Damages:</span>
                                      <span className="font-medium text-red-600">{batch.reportedDamages} units</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Efficiency:</span>
                                      <span className="font-medium">{batch.efficiency}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Quality Grade:</span>
                                      <span className="font-medium">{batch.qualityGrade}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Raw Materials</h4>
                                  <div className="space-y-2">
                                    {batch.rawMaterialsUsed.map((material, index) => (
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
                                  <h4 className="font-semibold mb-2">Production Notes</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{batch.productionNotes}</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Damage Analysis</h4>
                                  <div className="space-y-2">
                                    {batch.damageDetails.map((damage, index) => (
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
                                  <h4 className="font-semibold mb-2">Production Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Production Head:</span> {batch.productionHead}</div>
                                    <div><span className="font-medium">Machine:</span> {batch.machineUsed}</div>
                                    <div><span className="font-medium">Shift:</span> {batch.shiftDetails}</div>
                                    <div><span className="font-medium">Completed:</span> {new Date(batch.completedAt).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          size="sm" 
                          onClick={() => handleVerify(batch, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerify(batch, 'reject')}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerify(batch, 'send_back')}
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Send Back
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

      {/* Recently Verified Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Recently Verified
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Final Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifiedBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{batch.productName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          Verified: <span className="font-medium text-green-600">{batch.verifiedQuantity} units</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Damages: {batch.verifiedDamages} units
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.verifiedBy}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(batch.verifiedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {batch.verificationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{batch.finalAction}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {verificationData.approvalStatus === 'approve' ? 'Approve' : 
               verificationData.approvalStatus === 'reject' ? 'Reject' : 'Send Back'} 
              Production - {selectedBatch?.id}
            </DialogTitle>
            <DialogDescription>
              Complete the verification process for this production batch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedBatch && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Batch Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Product: {selectedBatch.productName}</div>
                  <div>Production Head: {selectedBatch.productionHead}</div>
                  <div>Reported Quantity: {selectedBatch.reportedQuantity} units</div>
                  <div>Reported Damages: {selectedBatch.reportedDamages} units</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityVerified">Verified Quantity</Label>
                <Input
                  id="quantityVerified"
                  type="number"
                  value={verificationData.quantityVerified}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    quantityVerified: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="damageVerified">Verified Damages</Label>
                <Input
                  id="damageVerified"
                  type="number"
                  value={verificationData.damageVerified}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    damageVerified: e.target.value
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualityCheck">Quality Assessment</Label>
              <Select 
                value={verificationData.qualityCheck}
                onValueChange={(value) => setVerificationData(prev => ({
                  ...prev,
                  qualityCheck: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality assessment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acceptable">Quality Acceptable</SelectItem>
                  <SelectItem value="excellent">Excellent Quality</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  <SelectItem value="rejected">Quality Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {verificationData.approvalStatus === 'approve' && (
              <div className="space-y-2">
                <Label htmlFor="nextAction">Next Action</Label>
                <Select 
                  value={verificationData.nextAction}
                  onValueChange={(value) => setVerificationData(prev => ({
                    ...prev,
                    nextAction: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select next action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forward_packing">Forward to Packing Department</SelectItem>
                    <SelectItem value="forward_quality">Send for Quality Control</SelectItem>
                    <SelectItem value="forward_warehouse">Move to Warehouse</SelectItem>
                    <SelectItem value="hold">Hold for Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="approvalRemarks">Verification Remarks</Label>
              <Textarea
                id="approvalRemarks"
                value={verificationData.approvalRemarks}
                onChange={(e) => setVerificationData(prev => ({
                  ...prev,
                  approvalRemarks: e.target.value
                }))}
                placeholder="Add verification remarks and feedback..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowVerificationModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitVerification}
                className={
                  verificationData.approvalStatus === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  verificationData.approvalStatus === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Verification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}