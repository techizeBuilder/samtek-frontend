import React, { useState } from 'react';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload as UploadIcon, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_EXT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.mp4,.mov';

export default function UploadContent() {
  const { uploadAsset, uploadingAsset, categories } = useMarketing();
  const { toast } = useToast();

  const mainCategories = categories.filter(c => !c.parentCategory);
  const [selectedMainCat, setSelectedMainCat] = useState('');
  const subCategories = categories.filter(c => c.parentCategory?._id === selectedMainCat || c.parentCategory === selectedMainCat);

  const [form, setForm] = useState({ fileName: '', category: '', subcategory: '', product: '', description: '', tags: '', versionNumber: '1.0' });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (!form.fileName) set('fileName', f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast({ title: 'Error', description: 'Please select a file', variant: 'destructive' });
    if (!form.fileName.trim()) return toast({ title: 'Error', description: 'File name is required', variant: 'destructive' });

    const fd = new FormData();
    fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });

    try {
      await uploadAsset(fd);
      toast({ title: 'Uploaded!', description: `${form.fileName} uploaded successfully` });
      setFile(null);
      setForm({ fileName: '', category: '', subcategory: '', product: '', description: '', tags: '', versionNumber: '1.0' });
      setSelectedMainCat('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message || 'Failed to upload', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Marketing Content</h1>
        <p className="text-slate-500 text-sm mt-1">Supported: PDF, DOC, DOCX, JPG, PNG, WEBP, MP4, MOV (max 50 MB)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Drop Zone */}
        <Card className={`border-2 border-dashed transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('file-input').click()}>
          <CardContent className="p-8 text-center">
            {file ? (
              <div className="space-y-2">
                <FileText className="h-10 w-10 text-blue-500 mx-auto" />
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button type="button" className="text-xs text-red-500 hover:underline" onClick={e => { e.stopPropagation(); setFile(null); }}>Remove</button>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadIcon className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="font-medium text-slate-700">Drop file here or click to browse</p>
                <p className="text-sm text-slate-400">PDF, DOC, DOCX, JPG, PNG, WEBP, MP4, MOV</p>
              </div>
            )}
          </CardContent>
        </Card>
        <input id="file-input" type="file" accept={ALLOWED_EXT} className="hidden" onChange={e => handleFile(e.target.files[0])} />

        <Card>
          <CardHeader><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>File Name *</Label><Input className="mt-1" value={form.fileName} onChange={e => set('fileName', e.target.value)} placeholder="Enter display name" /></div>
              <div><Label>Version Number</Label><Input className="mt-1" value={form.versionNumber} onChange={e => set('versionNumber', e.target.value)} placeholder="1.0" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Main Category</Label>
                <Select value={selectedMainCat} onValueChange={v => { setSelectedMainCat(v); set('category', v); set('subcategory', ''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {mainCategories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub Category</Label>
                <Select value={form.subcategory} onValueChange={v => set('subcategory', v)} disabled={!selectedMainCat || subCategories.length === 0}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Product</Label><Input className="mt-1" value={form.product} onChange={e => set('product', e.target.value)} placeholder="Related product name" /></div>
            <div><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this asset" rows={3} /></div>
            <div><Label>Tags / Keywords</Label><Input className="mt-1" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Separate tags with commas: brochure, machine, 2024" /></div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={uploadingAsset} className="w-full gap-2">
          {success ? <><CheckCircle className="h-4 w-4" /> Uploaded!</> : uploadingAsset ? 'Uploading...' : <><UploadIcon className="h-4 w-4" /> Upload Asset</>}
        </Button>
      </form>
    </div>
  );
}
