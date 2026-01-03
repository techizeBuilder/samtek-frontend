import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Play,
  Pause,
  Square,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Activity,
  Timer,
  Settings,
  Package,
  Wrench,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProductionExecution() {
  const { toast } = useToast();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showDamagesModal, setShowDamagesModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock data - replace with actual API calls
  const [batches, setBatches] = useState([
    {
      id: 'BATCH001',
      planId: 'BP001',
      productName: 'Product A',
      plannedQuantity: 1000,
      currentQuantity: 650,
      status: 'In Progress',
      priority: 'High',
      startTime: '2024-11-24T08:00:00',
      estimatedEndTime: '2024-11-24T16:00:00',
      actualStartTime: '2024-11-24T08:15:00',
      unitManager: 'John Doe',
      productionHead: 'Alice Johnson',
      machine: 'Machine A1',
      shift: 'Morning Shift',
      progress: 65,
      remarks: 'Production going smoothly',
      usedMaterials: [
        { name: 'Raw Material A', quantity: 100, unit: 'kg' },
        { name: 'Raw Material B', quantity: 50, unit: 'liters' }
      ],
      damages: []
    },
    {
      id: 'BATCH002',
      planId: 'BP002',
      productName: 'Product B', 
      plannedQuantity: 500,
      currentQuantity: 0,
      status: 'Ready',
      priority: 'Medium',
      startTime: '2024-11-24T10:00:00',
      estimatedEndTime: '2024-11-24T18:00:00',
      actualStartTime: null,
      unitManager: 'Jane Smith',
      productionHead: null,
      machine: 'Machine B2',
      shift: 'Morning Shift',
      progress: 0,
      remarks: '',
      usedMaterials: [],
      damages: []
    },
    {
      id: 'BATCH003',
      planId: 'BP003',
      productName: 'Product C',
      plannedQuantity: 750,
      currentQuantity: 150,
      status: 'Paused',
      priority: 'Low',
      startTime: '2024-11-24T07:00:00',
      estimatedEndTime: '2024-11-24T15:00:00',
      actualStartTime: '2024-11-24T07:30:00',
      unitManager: 'Mike Johnson',
      productionHead: 'Bob Wilson',
      machine: 'Machine C3',
      shift: 'Morning Shift',
      progress: 20,
      remarks: 'Paused for quality check',
      usedMaterials: [
        { name: 'Raw Material C', quantity: 30, unit: 'kg' }
      ],
      damages: [
        { description: 'Minor defects in 5 units', quantity: 5, cost: 50 }
      ]
    }
  ]);

  const productionHeads = [
    { id: 'PH001', name: 'Alice Johnson' },
    { id: 'PH002', name: 'Bob Wilson' },
    { id: 'PH003', name: 'Carol Davis' },
    { id: 'PH004', name: 'David Brown' }
  ];

  const handleStartProduction = (batch) => {
    const updatedBatches = batches.map(b => 
      b.id === batch.id 
        ? { 
            ...b, 
            status: 'In Progress',
            actualStartTime: new Date().toISOString()
          }
        : b
    );
    setBatches(updatedBatches);
    toast({
      title: "Production Started",
      description: `Production for ${batch.id} has been started`,
    });
  };

  const handlePauseProduction = (batch) => {
    const updatedBatches = batches.map(b => 
      b.id === batch.id ? { ...b, status: 'Paused' } : b
    );
    setBatches(updatedBatches);
    toast({
      title: "Production Paused",
      description: `Production for ${batch.id} has been paused`,
    });
  };

  const handleCompleteProduction = (batch) => {
    const updatedBatches = batches.map(b => 
      b.id === batch.id 
        ? { 
            ...b, 
            status: 'Completed',
            currentQuantity: b.plannedQuantity,
            progress: 100,
            actualEndTime: new Date().toISOString()
          }
        : b
    );
    setBatches(updatedBatches);
    toast({
      title: "Production Completed",
      description: `Production for ${batch.id} has been completed`,
    });
  };

  const assignProductionHead = (batchId, headName) => {
    const updatedBatches = batches.map(b => 
      b.id === batchId ? { ...b, productionHead: headName } : b
    );
    setBatches(updatedBatches);
    toast({
      title: "Production Head Assigned",
      description: `${headName} has been assigned to ${batchId}`,
    });
  };

  const updateProgress = (batchId, newQuantity, remarks) => {
    const updatedBatches = batches.map(b => {
      if (b.id === batchId) {
        const progress = Math.min((newQuantity / b.plannedQuantity) * 100, 100);
        return { 
          ...b, 
          currentQuantity: newQuantity,
          progress: progress,
          remarks: remarks
        };
      }
      return b;
    });
    setBatches(updatedBatches);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'Paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '-';
    const start = new Date(startTime);
    const diff = currentTime - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Execution</h1>
          <p className="text-gray-600">Execute and monitor batch production processes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{batches.filter(b => b.status === 'Ready').length}</p>
                <p className="text-sm text-blue-600">Ready to Start</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{batches.filter(b => b.status === 'In Progress').length}</p>
                <p className="text-sm text-green-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Pause className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{batches.filter(b => b.status === 'Paused').length}</p>
                <p className="text-sm text-yellow-600">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{batches.filter(b => b.status === 'Completed').length}</p>
                <p className="text-sm text-purple-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Production Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Production Head</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.productName}</div>
                        <div className="text-sm text-gray-500">
                          {batch.currentQuantity} / {batch.plannedQuantity} units
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Progress value={batch.progress} className="h-2" />
                        <span className="text-sm">{batch.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(batch.status)}>
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {batch.productionHead ? (
                        <span>{batch.productionHead}</span>
                      ) : (
                        <Select onValueChange={(value) => assignProductionHead(batch.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {productionHeads.map((head) => (
                              <SelectItem key={head.id} value={head.name}>
                                {head.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatDuration(batch.actualStartTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{batch.machine}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {batch.status === 'Ready' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartProduction(batch)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {batch.status === 'In Progress' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePauseProduction(batch)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleCompleteProduction(batch)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {batch.status === 'Paused' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartProduction(batch)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedBatch(batch)}>
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Batch Details - {batch.id}</DialogTitle>
                              <DialogDescription>
                                Detailed information and controls for this production batch
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedBatch && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">Production Info</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><span className="font-medium">Product:</span> {selectedBatch.productName}</div>
                                      <div><span className="font-medium">Planned Quantity:</span> {selectedBatch.plannedQuantity} units</div>
                                      <div><span className="font-medium">Current Quantity:</span> {selectedBatch.currentQuantity} units</div>
                                      <div><span className="font-medium">Progress:</span> {selectedBatch.progress}%</div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">Timing</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><span className="font-medium">Planned Start:</span> {new Date(selectedBatch.startTime).toLocaleString()}</div>
                                      <div><span className="font-medium">Actual Start:</span> {selectedBatch.actualStartTime ? new Date(selectedBatch.actualStartTime).toLocaleString() : 'Not started'}</div>
                                      <div><span className="font-medium">Duration:</span> {formatDuration(selectedBatch.actualStartTime)}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="currentQuantity">Update Current Quantity</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="currentQuantity"
                                      type="number"
                                      placeholder="Enter current quantity..."
                                      onBlur={(e) => {
                                        if (e.target.value && selectedBatch.remarks) {
                                          updateProgress(selectedBatch.id, parseInt(e.target.value), selectedBatch.remarks);
                                        }
                                      }}
                                    />
                                    <Button size="sm">Update</Button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="remarks">Remarks</Label>
                                  <Textarea
                                    id="remarks"
                                    placeholder="Add production remarks..."
                                    defaultValue={selectedBatch.remarks}
                                  />
                                </div>

                                <div className="flex gap-3">
                                  <Button onClick={() => setShowMaterialsModal(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Materials
                                  </Button>
                                  <Button variant="outline" onClick={() => setShowDamagesModal(true)}>
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Report Damage
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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