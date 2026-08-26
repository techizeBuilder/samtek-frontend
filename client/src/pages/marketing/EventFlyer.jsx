import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, CalendarDays, Trash2, Edit2, RefreshCw, ChevronLeft, ChevronRight,
  ImagePlus, ImageOff, Tag, Search, X,
} from 'lucide-react';

const BASE = '/api/marketing/events';
const todayStr = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({ eventName: '', eventType: '', eventDate: todayStr() });

// Relative server paths need the backend origin prepended — same convention
// used throughout Marketing (see Upload.jsx's getMediaUrl).
const getMediaUrl = (p) => {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('data:') || p.startsWith('blob:')) return p;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
  return `${baseUrl}${p}`;
};

const TYPE_COLORS = {
  'Exhibition': 'bg-purple-50 text-purple-700 border-purple-200',
  'Trade Fair': 'bg-amber-50 text-amber-700 border-amber-200',
  'Product Launch': 'bg-blue-50 text-blue-700 border-blue-200',
  'Seminar': 'bg-teal-50 text-teal-700 border-teal-200',
  'Conference': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Promotional Campaign': 'bg-pink-50 text-pink-700 border-pink-200',
  'Corporate Event': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Other': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function EventFlyer() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('marketing', 'eventFlyer', 'add');
  const canEdit = hasFeatureAccess('marketing', 'eventFlyer', 'edit');
  const canDelete = hasFeatureAccess('marketing', 'eventFlyer', 'delete');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // flyer being edited, or null for "new"
  const [form, setForm] = useState(emptyForm());
  const [imageFile, setImageFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Event types (single source of truth from backend) ──
  const { data: typesRes } = useQuery({
    queryKey: ['mkt-event-types'],
    queryFn: () => apiRequest('GET', `${BASE}/types`),
  });
  const eventTypes = typesRes?.data || [];

  // ── Flyer list ──
  const listParams = new URLSearchParams({ page: String(page), limit: '12' });
  if (typeFilter !== 'all') listParams.set('eventType', typeFilter);
  if (search.trim()) listParams.set('search', search.trim());
  if (upcomingOnly) listParams.set('upcoming', 'true');

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['mkt-events', page, typeFilter, search, upcomingOnly],
    queryFn: () => apiRequest('GET', `${BASE}?${listParams.toString()}`),
  });
  const flyers = listRes?.data || [];
  const pagination = listRes?.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0 };

  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['mkt-events'] });

  const createMut = useMutation({
    mutationFn: (fd) => apiRequest('POST', BASE, fd),
    onSuccess: () => { invalidateAll(); toast({ title: 'Event flyer added', description: 'The flyer has been published.' }); closeForm(); },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Failed to add event flyer', variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, fd }) => apiRequest('PUT', `${BASE}/${id}`, fd),
    onSuccess: () => { invalidateAll(); toast({ title: 'Event flyer updated' }); closeForm(); },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Failed to update event flyer', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `${BASE}/${id}`),
    onSuccess: () => { invalidateAll(); toast({ title: 'Event flyer deleted' }); setDeleteTarget(null); },
    onError: (e) => { toast({ title: 'Error', description: e.message || 'Failed to delete event flyer', variant: 'destructive' }); setDeleteTarget(null); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm()); setImageFile(null); setFormOpen(true); };
  const openEdit = (flyer) => {
    setEditing(flyer);
    setForm({
      eventName: flyer.eventName,
      eventType: flyer.eventType,
      eventDate: flyer.eventDate ? flyer.eventDate.split('T')[0] : todayStr(),
    });
    setImageFile(null);
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyForm()); setImageFile(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.eventName.trim()) {
      return toast({ title: 'Event name required', description: 'Please enter the event name.', variant: 'destructive' });
    }
    if (!form.eventType) {
      return toast({ title: 'Event type required', description: 'Please select an event type.', variant: 'destructive' });
    }
    if (!form.eventDate) {
      return toast({ title: 'Event date required', description: 'Please pick the event date.', variant: 'destructive' });
    }
    if (!editing && !imageFile) {
      return toast({ title: 'Event image required', description: 'Please upload the event flyer image.', variant: 'destructive' });
    }

    const fd = new FormData();
    fd.append('eventName', form.eventName.trim());
    fd.append('eventType', form.eventType);
    fd.append('eventDate', form.eventDate);
    if (imageFile) fd.append('image', imageFile);

    if (editing) updateMut.mutate({ id: editing._id, fd });
    else createMut.mutate(fd);
  };

  // Marketing Head (or Superadmin) can manage everyone's flyers; Marketing
  // Employee can only manage their own — mirrors the backend's canManage rule.
  const canManage = (flyer) => {
    if (user?.role === 'Marketing Head' || user?.role === 'Superadmin' || user?.role === 'Super Admin') return true;
    return flyer.addedBy?._id === user?._id || flyer.addedBy === user?._id;
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Event Flyer</h1>
          <p className="text-slate-500">Publish event name, type &amp; date along with the flyer image.</p>
        </div>
        {canAdd && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Add Event Flyer
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by event name..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Event Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              {eventTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={upcomingOnly ? 'default' : 'outline'}
            className={upcomingOnly ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
            onClick={() => { setUpcomingOnly(u => !u); setPage(1); }}
          >
            <CalendarDays className="w-4 h-4 mr-2" /> Upcoming Only
          </Button>
          {(search || typeFilter !== 'all' || upcomingOnly) && (
            <Button
              type="button" variant="ghost" className="text-slate-500"
              onClick={() => { setSearch(''); setTypeFilter('all'); setUpcomingOnly(false); setPage(1); }}
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Flyer grid */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Loading event flyers...</p>
        </div>
      ) : flyers.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ImageOff className="h-10 w-10" />
            <p className="text-sm">No event flyers yet. Click "Add Event Flyer" to publish one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {flyers.map((flyer) => (
            <Card key={flyer._id} className="border-none shadow-md overflow-hidden group">
              <div className="relative aspect-[3/4] bg-slate-100">
                {getMediaUrl(flyer.imageUrl) ? (
                  <img
                    src={getMediaUrl(flyer.imageUrl)}
                    alt={flyer.eventName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300">
                    <ImageOff className="h-10 w-10" />
                  </div>
                )}
                <Badge className={`absolute top-2 left-2 border ${TYPE_COLORS[flyer.eventType] || TYPE_COLORS.Other}`}>
                  <Tag className="h-3 w-3 mr-1" />{flyer.eventType}
                </Badge>
                {(canEdit || canDelete) && canManage(flyer) && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <Button size="icon" className="h-7 w-7 bg-white/90 hover:bg-white text-blue-600 shadow" onClick={() => openEdit(flyer)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" className="h-7 w-7 bg-white/90 hover:bg-white text-red-600 shadow" onClick={() => setDeleteTarget(flyer)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-1">
                <p className="font-semibold text-slate-900 truncate" title={flyer.eventName}>{flyer.eventName}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(flyer.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-400">
                  Added by {flyer.addedBy?.fullName || flyer.addedBy?.username || '—'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalRecords > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {flyers.length} of {pagination.totalRecords} event{pagination.totalRecords === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-slate-500 self-center px-1">Page {pagination.currentPage} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event Flyer' : 'Add Event Flyer'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the event details or replace its flyer image.' : 'Enter the event details and upload its flyer image.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                placeholder="e.g. IndiaFoodTech Expo 2026"
                value={form.eventName}
                onChange={(e) => setForm(f => ({ ...f, eventName: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={form.eventType} onValueChange={(v) => setForm(f => ({ ...f, eventType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm(f => ({ ...f, eventDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event Image</Label>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors h-40"
                onClick={() => document.getElementById('event-image-input').click()}
              >
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-32 w-auto object-cover rounded border" />
                ) : editing?.imageUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={getMediaUrl(editing.imageUrl)} alt={editing.eventName} className="h-28 w-auto object-cover rounded border" />
                    <span className="text-xs text-slate-500">Click to replace image</span>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Click to upload flyer image</span>
                  </>
                )}
              </div>
              <input
                id="event-image-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => setImageFile(e.target.files[0] || null)}
              />
              {imageFile && <p className="text-xs text-blue-600 truncate">{imageFile.name}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Flyer' : 'Save Flyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Event Flyer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.eventName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>No, Keep it</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteTarget._id)}>
              {deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
