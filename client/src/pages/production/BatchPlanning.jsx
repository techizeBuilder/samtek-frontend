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
  Plus,
  Edit,
  Eye,
  Download,
  Share,
  CheckCircle,
  Clock,
  Calendar,
  User,
  FileText,
  Upload,
  Factory,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BatchPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedIndent, setSelectedIndent] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    indentId: '',
    productName: '',
    requiredQuantity: '',
    unitManager: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    priority: 'medium',
    notes: '',
    documents: []
  });

  // Mock data - replace with actual API calls
  const batchPlans = [
    {
      id: 'BP001',
      indentId: 'IND001',
      productName: 'Product A',
      requiredQuantity: 1000,
      unitManager: 'John Doe',
      startDate: '2024-11-25',
      startTime: '08:00',
      endDate: '2024-11-25',
      endTime: '16:00',
      status: 'Planned',
      priority: 'High',
      createdAt: '2024-11-24',
      notes: 'Rush order for client ABC'
    },
    {
      id: 'BP002',
      indentId: 'IND002', 
      productName: 'Product B',
      requiredQuantity: 500,
      unitManager: 'Jane Smith',
      startDate: '2024-11-26',
      startTime: '09:00',
      endDate: '2024-11-26',
      endTime: '17:00',
      status: 'Approved',
      priority: 'Medium',
      createdAt: '2024-11-24',
      notes: 'Standard production batch'
    },
    {
      id: 'BP003',
      indentId: 'IND003',
      productName: 'Product C', 
      requiredQuantity: 750,
      unitManager: 'Mike Johnson',
      startDate: '2024-11-27',
      startTime: '07:00',
      endDate: '2024-11-27',
      endTime: '15:00',
      status: 'Scheduled',
      priority: 'Low',
      createdAt: '2024-11-24',
      notes: 'Quality testing required'
    }
  ];

  const availableIndents = [
    { id: 'IND001', productName: 'Product A', requestedQty: 1000, requiredBy: '2024-11-25' },
    { id: 'IND002', productName: 'Product B', requestedQty: 500, requiredBy: '2024-11-26' },
    { id: 'IND003', productName: 'Product C', requestedQty: 750, requiredBy: '2024-11-27' },
    { id: 'IND004', productName: 'Product D', requestedQty: 300, requiredBy: '2024-11-28' }
  ];

  const unitManagers = [
    { id: 'UM001', name: 'John Doe' },
    { id: 'UM002', name: 'Jane Smith' },
    { id: 'UM003', name: 'Mike Johnson' },
    { id: 'UM004', name: 'Sarah Wilson' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-fill product info when indent is selected
    if (field === 'indentId') {
      const indent = availableIndents.find(i => i.id === value);
      if (indent) {
        setFormData(prev => ({
          ...prev,
          indentId: value,
          productName: indent.productName,
          requiredQuantity: indent.requestedQty.toString()
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const planData = {
      ...formData,
      id: editingPlan ? editingPlan.id : `BP${Date.now().toString().slice(-3)}`,
      status: 'Planned',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (editingPlan) {
      toast({
        title: "Plan Updated",
        description: "Batch production plan has been updated successfully",
      });
    } else {
      toast({
        title: "Plan Created", 
        description: "New batch production plan has been created successfully",
      });
    }

    // Reset form
    setFormData({
      indentId: '',
      productName: '',
      requiredQuantity: '',
      unitManager: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      priority: 'medium',
      notes: '',
      documents: []
    });
    setShowCreateForm(false);
    setEditingPlan(null);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      indentId: plan.indentId,
      productName: plan.productName,
      requiredQuantity: plan.requiredQuantity.toString(),
      unitManager: plan.unitManager,
      startDate: plan.startDate,
      startTime: plan.startTime,
      endDate: plan.endDate,
      endTime: plan.endTime,
      priority: plan.priority.toLowerCase(),
      notes: plan.notes,
      documents: []
    });
    setShowCreateForm(true);
  };

  const handleApprove = (planId) => {
    toast({
      title: "Plan Approved",
      description: `Batch plan ${planId} has been approved successfully`,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'In Queue': return 'bg-orange-100 text-orange-800 border-orange-200';
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
          <h1 className="text-3xl font-bold text-gray-900">Batch Planning</h1>
          <p className="text-gray-600">Plan batch production based on approved indents</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Batch Production Plan</DialogTitle>
                <DialogDescription>
                  {editingPlan ? 'Update the batch production plan details' : 'Plan a new batch production based on approved indents'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="indentId">Select Indent Request</Label>
                    <Select value={formData.indentId} onValueChange={(value) => handleInputChange('indentId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select indent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIndents.map((indent) => (
                          <SelectItem key={indent.id} value={indent.id}>
                            {indent.id} - {indent.productName} ({indent.requestedQty} units)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      readOnly
                      className="bg-gray-50"
                      placeholder="Select indent first..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requiredQuantity">Required Quantity</Label>
                    <Input
                      id="requiredQuantity"
                      type="number"
                      value={formData.requiredQuantity}
                      onChange={(e) => handleInputChange('requiredQuantity', e.target.value)}
                      placeholder="Enter quantity..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitManager">Assign Unit Manager</Label>
                    <Select value={formData.unitManager} onValueChange={(value) => handleInputChange('unitManager', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unitManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.name}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documents">Supporting Documents</Label>
                    <Input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => handleInputChange('documents', Array.from(e.target.files))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Remarks</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any special instructions or notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Batch Production Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Indent ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Manager</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.id}</TableCell>
                    <TableCell>{plan.indentId}</TableCell>
                    <TableCell>{plan.productName}</TableCell>
                    <TableCell>{plan.requiredQuantity.toLocaleString()} units</TableCell>
                    <TableCell>{plan.unitManager}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{plan.startDate} at {plan.startTime}</div>
                        <div className="text-gray-500">to {plan.endDate} at {plan.endTime}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(plan.priority)}>
                        {plan.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {plan.status === 'Planned' && (
                          <Button size="sm" onClick={() => handleApprove(plan.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share className="h-4 w-4" />
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
    </div>
  );
}