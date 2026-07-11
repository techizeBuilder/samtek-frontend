import React, { useState } from 'react';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ChevronRight, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CategoryManagement() {
  const { categories, categoriesLoading, createCategory, updateCategory, deleteCategory } = useMarketing();
  const { toast } = useToast();

  const [open, setOpen]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]   = useState({ name: '', parentCategory: '' });
  const [saving, setSaving] = useState(false);

  const mainCategories = categories.filter(c => !c.parentCategory);
  const subCategories  = categories.filter(c => !!c.parentCategory);

  const openCreate = (parentId = '') => { setEditing(null); setForm({ name: '', parentCategory: parentId }); setOpen(true); };
  const openEdit   = (cat) => { setEditing(cat); setForm({ name: cat.name, parentCategory: cat.parentCategory?._id || '' }); setOpen(true); };

  const isSub = !!form.parentCategory || !!editing?.parentCategory;
  const parentName = mainCategories.find(c => c._id === form.parentCategory)?.name || '';
  const dialogTitle = editing
    ? (isSub ? 'Edit Sub-Category' : 'Edit Category')
    : (isSub ? `Add Sub-Category${parentName ? ` in "${parentName}"` : ''}` : 'Add Category');

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing._id, { name: form.name, parentCategory: form.parentCategory || null });
        toast({ title: 'Updated', description: 'Category updated' });
      } else {
        await createCategory({ name: form.name, parentCategory: form.parentCategory || null });
        toast({ title: 'Created', description: 'Category created' });
      }
      setOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? Sub-categories and asset links will also be removed.`)) return;
    try {
      await deleteCategory(cat._id);
      toast({ title: 'Deleted', description: `${cat.name} deleted` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (categoriesLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading categories...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Category Management</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} categories total</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2"><Plus className="h-4 w-4" />Add Category</Button>
      </div>

      {mainCategories.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium">No categories yet</p>
          <p className="text-sm">Create your first main category to get started</p>
          <Button className="mt-4 gap-2" onClick={() => openCreate()}><Plus className="h-4 w-4" />Create Category</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {mainCategories.map(main => {
            const subs = subCategories.filter(s => s.parentCategory?._id === main._id || s.parentCategory === main._id);
            return (
              <Card key={main._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-base">{main.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{subs.length} sub-categories</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openCreate(main._id)}><Plus className="h-3 w-3" />Add Sub</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(main)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(main)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                {subs.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-1 pl-4 border-l-2 border-slate-100">
                      {subs.map(sub => (
                        <div key={sub._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <ChevronRight className="h-3 w-3 text-slate-400" />{sub.name}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(sub)}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(sub)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editing && isSub && (
              <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                <Package className="h-4 w-4 text-indigo-500" />
                <span>Category: <span className="font-medium text-slate-900">{parentName}</span></span>
              </div>
            )}
            <div>
              <Label>{isSub ? 'Sub-Category Name *' : 'Category Name *'}</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isSub ? 'e.g. Brochures' : 'e.g. Product Catalog'} />
            </div>
            {editing && isSub && (
              <div>
                <Label>Category</Label>
                <Select value={form.parentCategory} onValueChange={v => setForm(f => ({ ...f, parentCategory: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {mainCategories.filter(m => m._id !== editing?._id).map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
