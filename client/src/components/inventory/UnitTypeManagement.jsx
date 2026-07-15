import { useState } from 'react';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import {
  Plus,
  Edit,
  Trash2,
  Scale,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Helper modal for delete confirmation
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, description, isLoading }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Are you absolutely sure?</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">{title}</p>
          <p>{description}</p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Units list editor component
function UnitsInput({ units, setUnits }) {
  const addUnit = () => {
    setUnits([...units, '']);
  };

  const updateUnit = (index, value) => {
    const updated = [...units];
    updated[index] = value;
    setUnits(updated);
  };

  const removeUnit = (index) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Units *
          </Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Define individual units belonging to this unit type
          </p>
        </div>
        <Button
          type="button"
          onClick={addUnit}
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Unit
        </Button>
      </div>

      {units.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {units.map((unit, index) => (
            <div key={index} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  value={unit}
                  onChange={(e) => updateUnit(index, e.target.value)}
                  placeholder={`Unit name (e.g. Meter)`}
                  className="h-8 text-sm border-gray-300"
                  required
                />
              </div>
              <Button
                type="button"
                onClick={() => removeUnit(index)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Remove unit"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          No units added yet. Click "Add Unit" to start.
        </div>
      )}
    </div>
  );
}

// Unit Type Form Modal
function UnitTypeFormModal({ isOpen, onClose, editingUnitType, onSubmit, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState(['']);

  React.useEffect(() => {
    if (editingUnitType) {
      setName(editingUnitType.name || '');
      setDescription(editingUnitType.description || '');
      setUnits(editingUnitType.units?.length > 0 ? [...editingUnitType.units] : ['']);
    } else {
      setName('');
      setDescription('');
      setUnits(['']);
    }
  }, [editingUnitType, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const validUnits = units.map(u => u.trim()).filter(Boolean);
    if (validUnits.length === 0) {
      alert("At least one valid unit is required.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      units: validUnits
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogTitle>
          {editingUnitType ? 'Edit Unit Type' : 'Add New Unit Type'}
        </DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="unit-type-name" className="text-xs font-semibold text-gray-600">
              Unit Type Name *
            </Label>
            <Input
              id="unit-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Temperature Unit"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unit-type-desc" className="text-xs font-semibold text-gray-600">
              Description
            </Label>
            <Textarea
              id="unit-type-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this unit type"
              rows={2}
            />
          </div>
          
          <UnitsInput units={units} setUnits={setUnits} />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : editingUnitType ? 'Save Changes' : 'Create Unit Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Unit Type Management Component
export default function UnitTypeManagement({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingUnitType, setEditingUnitType] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });

  // Query unit types
  const { data: unitTypesData, isLoading } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
  });
  const unitTypes = Array.isArray(unitTypesData?.unitTypes) ? unitTypesData.unitTypes : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/inventory/unit-types', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['/api/inventory/unit-types']);
      showSuccessToast('Unit Type Created', `Unit type "${res.unitType.name}" has been created.`);
      setShowForm(false);
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to create unit type');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', `/api/inventory/unit-types/${editingUnitType._id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['/api/inventory/unit-types']);
      showSuccessToast('Unit Type Updated', `Unit type "${res.unitType.name}" has been updated.`);
      setShowForm(false);
      setEditingUnitType(null);
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to update unit type');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/inventory/unit-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/inventory/unit-types']);
      showSuccessToast('Unit Type Deleted', 'Unit type has been deleted.');
      setDeleteConfirm({ isOpen: false, item: null });
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to delete unit type');
    }
  });

  const handleEdit = (unitType) => {
    setEditingUnitType(unitType);
    setShowForm(true);
  };

  const handleDelete = (unitType) => {
    setDeleteConfirm({
      isOpen: true,
      item: unitType,
      title: `Delete Unit Type "${unitType.name}"`,
      description: `This will permanently remove this unit type and all its associated units. Unit types currently assigned to inventory items cannot be deleted.`
    });
  };

  const handleFormSubmit = (data) => {
    if (editingUnitType) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.item) {
      deleteMutation.mutate(deleteConfirm.item._id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scale className="h-6 w-6 text-indigo-600" />
            Unit Type & Unit Management
          </DialogTitle>

          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Unit Types
                </h3>
                <p className="text-sm text-gray-500">
                  Manage unit type categories and their nested units (automatic seeding available)
                </p>
              </div>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Unit Type
              </Button>
            </div>

            <ScrollArea className="h-[450px] w-full">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Loading unit types...</div>
                </div>
              ) : unitTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No unit types found
                  </h3>
                  <p className="text-sm text-gray-500">
                    Get started by creating a new unit type
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Unit Type</TableHead>
                        <TableHead className="font-semibold text-gray-900">Description</TableHead>
                        <TableHead className="font-semibold text-gray-900">Units</TableHead>
                        <TableHead className="font-semibold text-gray-900 text-center">Items Using</TableHead>
                        <TableHead className="w-[120px] font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitTypes.map((ut, index) => (
                        <TableRow 
                          key={ut._id}
                          className={`hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              <Scale className="h-3 w-3 mr-1" />
                              {ut.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm text-gray-600">
                              {ut.description || 'No description'}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 max-w-[280px]">
                            <div className="flex flex-wrap gap-1">
                              {ut.units?.map((unit, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 text-slate-800">
                                  {unit}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="text-sm font-semibold text-gray-700">
                              {ut.productCount || 0}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(ut)}
                                className="h-8 w-8 p-0 hover:bg-indigo-50"
                                title="Edit Unit Type"
                              >
                                <Edit className="h-4 w-4 text-indigo-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(ut)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                                title="Delete Unit Type"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <UnitTypeFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingUnitType(null);
        }}
        editingUnitType={editingUnitType}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null })}
        onConfirm={confirmDelete}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
