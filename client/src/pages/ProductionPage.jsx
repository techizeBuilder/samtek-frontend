import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Factory,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// Dummy data for Today's Indents
const todaysIndents = [
  {
    id: 'IND-001',
    customerName: 'Acme Corp',
    product: 'Steel Rods 12mm',
    quantity: 500,
    unit: 'pcs',
    deadline: '2025-01-08 18:00',
    priority: 'High',
    status: 'Pending'
  },
  {
    id: 'IND-002',
    customerName: 'BuildTech Ltd',
    product: 'Cement Blocks',
    quantity: 1000,
    unit: 'units',
    deadline: '2025-01-08 16:00',
    priority: 'Medium',
    status: 'In Progress'
  },
  {
    id: 'IND-003',
    customerName: 'Metro Construction',
    product: 'Reinforcement Bars',
    quantity: 200,
    unit: 'kg',
    deadline: '2025-01-08 20:00',
    priority: 'Low',
    status: 'Pending'
  },
  {
    id: 'IND-004',
    customerName: 'Steel Works Inc',
    product: 'Metal Sheets 2mm',
    quantity: 150,
    unit: 'sheets',
    deadline: '2025-01-08 14:00',
    priority: 'High',
    status: 'Completed'
  },
  {
    id: 'IND-005',
    customerName: 'Industrial Solutions',
    product: 'Pipe Fittings',
    quantity: 75,
    unit: 'sets',
    deadline: '2025-01-08 17:00',
    priority: 'Medium',
    status: 'In Progress'
  },
  {
    id: 'IND-006',
    customerName: 'Construction Plus',
    product: 'Welding Rods',
    quantity: 300,
    unit: 'pcs',
    deadline: '2025-01-08 19:00',
    priority: 'Low',
    status: 'Pending'
  },
  {
    id: 'IND-007',
    customerName: 'Prime Builders',
    product: 'Steel Angles',
    quantity: 400,
    unit: 'meters',
    deadline: '2025-01-08 15:00',
    priority: 'High',
    status: 'Completed'
  },
  {
    id: 'IND-008',
    customerName: 'Mega Infrastructure',
    product: 'Concrete Mixers',
    quantity: 25,
    unit: 'units',
    deadline: '2025-01-08 21:00',
    priority: 'Medium',
    status: 'In Progress'
  },
  {
    id: 'IND-009',
    customerName: 'Heavy Industries',
    product: 'Industrial Bolts',
    quantity: 1200,
    unit: 'pcs',
    deadline: '2025-01-08 16:30',
    priority: 'Low',
    status: 'Pending'
  },
  {
    id: 'IND-010',
    customerName: 'Engineering Corp',
    product: 'Custom Brackets',
    quantity: 80,
    unit: 'units',
    deadline: '2025-01-08 18:30',
    priority: 'High',
    status: 'Completed'
  }
];

// Dummy data for Submission History
const submissionHistory = [
  {
    id: 'SUB-001',
    date: '2025-01-07',
    shift: 'Morning',
    totalProduced: 2500,
    totalDamaged: 25,
    submittedBy: 'John Smith',
    submittedAt: '2025-01-07 18:30',
    status: 'Approved'
  },
  {
    id: 'SUB-002',
    date: '2025-01-06',
    shift: 'Evening',
    totalProduced: 2100,
    totalDamaged: 18,
    submittedBy: 'Sarah Johnson',
    submittedAt: '2025-01-06 22:15',
    status: 'Pending'
  },
  {
    id: 'SUB-003',
    date: '2025-01-05',
    shift: 'Morning',
    totalProduced: 2800,
    totalDamaged: 30,
    submittedBy: 'Mike Davis',
    submittedAt: '2025-01-05 18:45',
    status: 'Approved'
  },
  {
    id: 'SUB-004',
    date: '2025-01-04',
    shift: 'Night',
    totalProduced: 1900,
    totalDamaged: 22,
    submittedBy: 'Emily Brown',
    submittedAt: '2025-01-04 06:20',
    status: 'Rejected'
  },
  {
    id: 'SUB-005',
    date: '2025-01-03',
    shift: 'Evening',
    totalProduced: 2400,
    totalDamaged: 15,
    submittedBy: 'David Wilson',
    submittedAt: '2025-01-03 22:00',
    status: 'Approved'
  }
];

export default function ProductionPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    totalProduced: '',
    totalDamaged: '',
    notes: ''
  });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Calculate summary statistics
  const totalProduced = todaysIndents
    .filter(indent => indent.status === 'Completed')
    .reduce((sum, indent) => sum + indent.quantity, 0);
  
  const totalPending = todaysIndents.filter(indent => indent.status === 'Pending').length;
  const totalInProgress = todaysIndents.filter(indent => indent.status === 'In Progress').length;
  const totalCompleted = todaysIndents.filter(indent => indent.status === 'Completed').length;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-orange-100 text-orange-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (submission) => {
    console.log('Editing submission:', submission);
    setSelectedSubmission(submission);
    setFormData({
      totalProduced: submission.totalProduced.toString(),
      totalDamaged: submission.totalDamaged.toString(),
      notes: submission.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (submissionId) => {
    console.log('Deleting submission:', submissionId);
    // Add delete logic here
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="h-8 w-8 text-blue-600" />
            My Production
          </h1>
          <p className="text-gray-600">
            Manage your daily production tasks and submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {user?.fullName || user?.username}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Summary Panel - Total Produced & Total Damaged */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Produced Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalProduced.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Damaged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  47
                </div>
                <p className="text-sm text-gray-600">Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Indents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Today's Indents
          </CardTitle>
          <CardDescription>
            Production orders scheduled for today - {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indent ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysIndents.map((indent) => (
                  <TableRow key={indent.id}>
                    <TableCell className="font-medium">{indent.id}</TableCell>
                    <TableCell>{indent.customerName}</TableCell>
                    <TableCell>{indent.product}</TableCell>
                    <TableCell>
                      {indent.quantity.toLocaleString()} {indent.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(indent.deadline).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(indent.priority)}>
                        {indent.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(indent.status)}>
                        {indent.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Submit Production Data
          </CardTitle>
          <CardDescription>
            Submit your daily production summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full sm:w-auto" 
            onClick={() => {
              console.log('Submit button clicked');
              // Add submit logic here
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Submit Today's Production
          </Button>
        </CardContent>
      </Card>

      {/* Submission History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submission History
          </CardTitle>
          <CardDescription>
            Your recent production data submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submission ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Produced</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionHistory.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.id}</TableCell>
                    <TableCell>{submission.date}</TableCell>
                    <TableCell>{submission.shift}</TableCell>
                    <TableCell>{submission.totalProduced.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        {submission.totalDamaged}
                      </div>
                    </TableCell>
                    <TableCell>{submission.submittedBy}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(submission)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(submission.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Submission - {selectedSubmission?.id}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            console.log('Updating submission:', selectedSubmission?.id, formData);
            setIsEditDialogOpen(false);
            setSelectedSubmission(null);
            setFormData({ totalProduced: '', totalDamaged: '', notes: '' });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editProduced">Total Produced</Label>
                <Input
                  id="editProduced"
                  type="number"
                  value={formData.totalProduced}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalProduced: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDamaged">Total Damaged</Label>
                <Input
                  id="editDamaged"
                  type="number"
                  value={formData.totalDamaged}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalDamaged: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Edit Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Update notes..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update Submission
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}