import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useMarketing } from '@/contexts/MarketingContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Share2, Trash2, Edit, Eye, Download, Phone, Mail, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FILE_COLORS = { PDF: 'bg-red-100 text-red-700', DOC: 'bg-blue-100 text-blue-700', DOCX: 'bg-blue-100 text-blue-700', JPG: 'bg-green-100 text-green-700', JPEG: 'bg-green-100 text-green-700', PNG: 'bg-green-100 text-green-700', WEBP: 'bg-green-100 text-green-700', MP4: 'bg-purple-100 text-purple-700', MOV: 'bg-purple-100 text-purple-700' };
const IMAGE_TYPES = ['JPG', 'JPEG', 'PNG', 'WEBP'];
const VIDEO_TYPES = ['MP4', 'MOV'];
const DOC_TYPES   = ['PDF', 'DOC', 'DOCX'];
const TYPE_BUCKETS = { pdf: DOC_TYPES, image: IMAGE_TYPES, video: VIDEO_TYPES };

export default function MarketingLibrary() {
  const { categories, shareAsset, deleteAsset } = useMarketing();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMarketingHead = user?.role === 'Marketing Head';

  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('all');
  const [filterCat, setFilterCat]     = useState('all');
  const [page, setPage]               = useState(1);
  const [shareModal, setShareModal]   = useState(null); // asset
  const [shareForm, setShareForm]     = useState({ method: 'WhatsApp', customerName: '', customerPhone: '', customerEmail: '' });
  const [sharing, setSharing]         = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);

  const mainCategories = categories.filter(c => !c.parentCategory);

  // Reset to page 1 whenever a filter/search changes so the user doesn't
  // land on a now-out-of-range page.
  useEffect(() => { setPage(1); }, [search, filterType, filterCat]);

  const { data: assetsResponse, isLoading: assetsLoading } = useQuery({
    queryKey: ['mkt-assets', 'list', { page, search, filterType, filterCat }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterCat !== 'all') params.set('category', filterCat);
      if (filterType !== 'all') params.set('fileType', TYPE_BUCKETS[filterType].join(','));
      return apiRequest('GET', `/api/marketing/assets?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const filtered = assetsResponse?.data || [];
  const pagination = { page: assetsResponse?.page || 1, pages: assetsResponse?.pages || 1, total: assetsResponse?.total || 0 };

  const handleShare = async () => {
    if (!shareForm.customerName) return toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
    if (shareForm.method === 'WhatsApp' && !shareForm.customerPhone) return toast({ title: 'Error', description: 'Phone is required for WhatsApp', variant: 'destructive' });
    if (shareForm.method === 'Email' && !shareForm.customerEmail) return toast({ title: 'Error', description: 'Email is required for email sharing', variant: 'destructive' });

    setSharing(true);
    try {
      await shareAsset(shareModal._id, { shareMethod: shareForm.method, customerName: shareForm.customerName, customerPhone: shareForm.customerPhone, customerEmail: shareForm.customerEmail });

      // Open WhatsApp / Email
      const fileLink = `${window.location.origin}/uploads/${shareModal.fileUrl.replace('uploads/', '')}`;
      if (shareForm.method === 'WhatsApp') {
        const msg = encodeURIComponent(`Hi ${shareForm.customerName}, please find the document: ${shareModal.fileName}\n${fileLink}`);
        window.open(`https://wa.me/${shareForm.customerPhone.replace(/\D/g, '')}?text=${msg}`, '_blank');
      } else {
        window.open(`mailto:${shareForm.customerEmail}?subject=${encodeURIComponent(shareModal.fileName)}&body=${encodeURIComponent(`Hi ${shareForm.customerName},\n\nPlease find the document: ${shareModal.fileName}\n${fileLink}`)}`, '_blank');
      }

      toast({ title: 'Shared!', description: `${shareModal.fileName} shared via ${shareForm.method}` });
      setShareModal(null);
      setShareForm({ method: 'WhatsApp', customerName: '', customerPhone: '', customerEmail: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to log share', variant: 'destructive' });
    } finally { setSharing(false); }
  };

  const handleDelete = async (asset) => {
    if (!confirm(`Delete "${asset.fileName}"?`)) return;
    try {
      await deleteAsset(asset._id);
      toast({ title: 'Deleted', description: `${asset.fileName} deleted` });
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
  };

  const getFileUrl = (fileUrl) => {
    const base = window.location.origin.replace(':5173', ':5000').replace(':3000', ':5000');
    return `${base}/${fileUrl}`;
  };

  if (assetsLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading library...</div>;

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Library</h1>
          <p className="text-slate-500 text-sm">{pagination.total} asset{pagination.total === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name, product, tag..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">Documents</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {mainCategories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FolderOpen className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No assets found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(asset => (
            <Card key={asset._id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail / Preview */}
              <div className="h-36 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                {IMAGE_TYPES.includes(asset.fileType) ? (
                  <img src={getFileUrl(asset.fileUrl)} alt={asset.fileName} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div className={`text-3xl font-bold px-4 py-2 rounded-xl ${FILE_COLORS[asset.fileType] || 'bg-slate-200 text-slate-600'}`}>{asset.fileType}</div>
                )}
                <span className={`absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded ${FILE_COLORS[asset.fileType] || 'bg-slate-100 text-slate-600'}`}>{asset.fileType}</span>
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="font-semibold text-slate-800 text-sm truncate" title={asset.fileName}>{asset.fileName}</p>
                <div className="flex flex-wrap gap-1">
                  {asset.category && <Badge variant="outline" className="text-xs">{asset.category.name}</Badge>}
                  {asset.product && <Badge variant="secondary" className="text-xs">{asset.product}</Badge>}
                </div>
                {asset.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map(t => <span key={t} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">#{t}</span>)}
                  </div>
                )}
                <p className="text-xs text-slate-400">v{asset.versionNumber} · {asset.shareCount} shares</p>
                {/* Actions */}
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => window.open(getFileUrl(asset.fileUrl), '_blank')}><Eye className="h-3 w-3" />View</Button>
                  <Button size="sm" className="flex-1 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShareModal(asset); setShareForm({ method: 'WhatsApp', customerName: '', customerPhone: '', customerEmail: '' }); }}><Share2 className="h-3 w-3" />Share</Button>
                  {isMarketingHead && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2" onClick={() => handleDelete(asset)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* Share Modal */}
      <Dialog open={!!shareModal} onOpenChange={() => setShareModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Share: {shareModal?.fileName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Share Via</Label>
              <div className="flex gap-2 mt-1">
                {['WhatsApp', 'Email'].map(m => (
                  <button key={m} onClick={() => setShareForm(f => ({ ...f, method: m }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${shareForm.method === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                    {m === 'WhatsApp' ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{m}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Customer Name *</Label><Input className="mt-1" value={shareForm.customerName} onChange={e => setShareForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Enter customer name" /></div>
            {shareForm.method === 'WhatsApp' && <div><Label>Phone Number *</Label><Input className="mt-1" value={shareForm.customerPhone} onChange={e => setShareForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="+91 9999999999" /></div>}
            {shareForm.method === 'Email' && <div><Label>Email Address *</Label><Input className="mt-1" type="email" value={shareForm.customerEmail} onChange={e => setShareForm(f => ({ ...f, customerEmail: e.target.value }))} placeholder="customer@example.com" /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareModal(null)}>Cancel</Button>
            <Button onClick={handleShare} disabled={sharing} className="gap-2"><Share2 className="h-4 w-4" />{sharing ? 'Sharing...' : `Share via ${shareForm.method}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
