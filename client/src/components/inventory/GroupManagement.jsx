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
  Folder,
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

// Group Form Modal
function GroupFormModal({ isOpen, onClose, editingGroup, onSubmit, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name || '');
      setDescription(editingGroup.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingGroup, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? 'Edit Group' : 'Add New Group'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="group-name" className="text-xs font-semibold text-gray-600">
              Group Name *
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electrical Spares"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-desc" className="text-xs font-semibold text-gray-600">
              Description
            </Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the group"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Group Management Component
export default function GroupManagement({ isOpen, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null });

  // Query groups
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['/api/inventory/groups'],
  });
  const groups = Array.isArray(groupsData?.groups) ? groupsData.groups : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/inventory/groups', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['/api/inventory/groups']);
      showSuccessToast('Group Created', `Group "${res.group.name}" has been created.`);
      setShowForm(false);
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to create group');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest('PUT', `/api/inventory/groups/${editingGroup._id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['/api/inventory/groups']);
      showSuccessToast('Group Updated', `Group "${res.group.name}" has been updated.`);
      setShowForm(false);
      setEditingGroup(null);
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to update group');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/inventory/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/inventory/groups']);
      showSuccessToast('Group Deleted', 'Group has been deleted.');
      setDeleteConfirm({ isOpen: false, item: null });
    },
    onError: (err) => {
      showSmartToast(err, 'Failed to delete group');
    }
  });

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleDelete = (group) => {
    setDeleteConfirm({
      isOpen: true,
      item: group,
      title: `Delete Group "${group.name}"`,
      description: `This will remove the group classification. Note that groups currently assigned to inventory items cannot be deleted.`
    });
  };

  const handleFormSubmit = (data) => {
    if (editingGroup) {
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Folder className="h-6 w-6 text-indigo-600" />
              Item Group Management
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Item Groups
                </h3>
                <p className="text-sm text-gray-500">
                  Manage your inventory group classifications
                </p>
              </div>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item Group
              </Button>
            </div>

            <ScrollArea className="h-[500px] w-full">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Loading groups...</div>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No groups found
                  </h3>
                  <p className="text-sm text-gray-500">
                    Get started by creating your first item group
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Group Name</TableHead>
                        <TableHead className="font-semibold text-gray-900">Description</TableHead>
                        <TableHead className="font-semibold text-gray-900">Item Count</TableHead>
                        <TableHead className="w-[120px] font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((group, index) => (
                        <TableRow 
                          key={group._id}
                          className={`hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              <Folder className="h-3 w-3 mr-1" />
                              {group.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm text-gray-600">
                              {group.description || 'No description'}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm font-semibold text-gray-700">
                              {group.productCount || 0}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(group)}
                                className="h-8 w-8 p-0 hover:bg-indigo-50"
                                title="Edit Group"
                              >
                                <Edit className="h-4 w-4 text-indigo-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(group)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                                title="Delete Group"
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

      <GroupFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingGroup(null);
        }}
        editingGroup={editingGroup}
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
