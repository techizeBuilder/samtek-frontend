import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsApp } from '@/lib/whatsapp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Package, Image as ImageIcon, Film, FileText, Download, Share2,
  ImageOff, Loader2, Megaphone,
} from 'lucide-react';

// Relative server paths need the backend origin prepended — same convention
// used throughout Marketing (see marketing/Upload.jsx's getMediaUrl).
const getMediaUrl = (p) => {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('data:') || p.startsWith('blob:')) return p;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
  return `${baseUrl}${p}`;
};

const extFromUrl = (url) => {
  const m = (url || '').match(/(\.[a-zA-Z0-9]+)(?:\?|$)/);
  return m ? m[1] : '';
};

const MAX_RESULTS = 60;

export default function SalesMarketingContent() {
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [items, setItems] = useState([]);
  const [downloadingKey, setDownloadingKey] = useState(null);

  const [shareItem, setShareItem] = useState(null);
  const [shareForm, setShareForm] = useState({ method: 'WhatsApp', customerName: '', customerPhone: '', customerEmail: '' });
  const [sharing, setSharing] = useState(false);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      toast({ title: 'Enter Item Code or Item Name', description: 'Type an item code or name to search.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSearched(true);
    setAppliedQuery(q);
    try {
      // /api/sales/items already does a case-insensitive partial match on
      // both name AND code (see getSalespersonItems), so a single box
      // covers "item code ya item name" without a mode toggle.
      const res = await apiRequest('GET', `/api/sales/items?search=${encodeURIComponent(q)}`);
      setItems(res?.items || []);
    } catch (err) {
      toast({ title: 'Search failed', description: err.message || 'Could not fetch items', variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url, filename, key) => {
    setDownloadingKey(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('File could not be downloaded');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast({ title: 'Download failed', description: err.message || 'Could not download file', variant: 'destructive' });
    } finally {
      setDownloadingKey(null);
    }
  };

  const openShare = (item) => {
    setShareItem(item);
    setShareForm({ method: 'WhatsApp', customerName: '', customerPhone: '', customerEmail: '' });
  };

  const handleShareSubmit = async () => {
    if (!shareItem) return;
    if (!shareForm.customerName.trim()) {
      return toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
    }
    if (shareForm.method === 'WhatsApp' && !shareForm.customerPhone.trim()) {
      return toast({ title: 'Error', description: 'Customer mobile number is required for WhatsApp', variant: 'destructive' });
    }
    if (shareForm.method === 'Email' && !shareForm.customerEmail.trim()) {
      return toast({ title: 'Error', description: 'Customer email is required for email sharing', variant: 'destructive' });
    }

    const links = [];
    if (shareItem.image) links.push(`Image: ${getMediaUrl(shareItem.image)}`);
    if (shareItem.videoUrl) links.push(`Video: ${getMediaUrl(shareItem.videoUrl)}`);
    if (shareItem.brochureUrl) links.push(`Brochure: ${getMediaUrl(shareItem.brochureUrl)}`);
    if (links.length === 0) {
      return toast({ title: 'Nothing to share', description: 'No marketing content uploaded for this item yet.', variant: 'destructive' });
    }

    setSharing(true);
    try {
      const bodyText = `Hi ${shareForm.customerName}, please find the details for ${shareItem.name} (${shareItem.code}):\n${links.join('\n')}`;
      if (shareForm.method === 'WhatsApp') {
        const result = await sendWhatsApp(shareForm.customerPhone, bodyText);
        toast({
          title: result.automatic ? 'Sent!' : 'WhatsApp Opened',
          description: result.automatic ? 'Content sent automatically via WhatsApp' : 'Opened WhatsApp for manual send',
        });
      } else {
        window.open(`mailto:${shareForm.customerEmail}?subject=${encodeURIComponent(shareItem.name)}&body=${encodeURIComponent(bodyText)}`, '_blank');
        toast({ title: 'Email Opened', description: 'Compose window opened with the content links.' });
      }
      setShareItem(null);
    } finally {
      setSharing(false);
    }
  };

  const visibleItems = items.slice(0, MAX_RESULTS);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-orange-600" />Marketing Content
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Search any item by code or name to view, download &amp; share the image, video and PDF brochure Marketing has uploaded for it.
        </p>
      </div>

      {/* Search bar */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by Item Code or Item Name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" onClick={runSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {!searched ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <Package className="h-10 w-10" />
            <p className="text-sm">Type an item code or name above and hit Search to see its marketing content.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Searching items...</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ImageOff className="h-10 w-10" />
            <p className="text-sm">No items found matching "{appliedQuery}"</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {items.length} item{items.length === 1 ? '' : 's'} matched
            {items.length > MAX_RESULTS && ` — showing first ${MAX_RESULTS}, refine your search for more precise results`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleItems.map((item) => {
              const hasImage = !!item.image;
              const hasVideo = !!item.videoUrl;
              const hasBrochure = !!item.brochureUrl;
              const hasAny = hasImage || hasVideo || hasBrochure;

              return (
                <Card key={item._id} className="overflow-hidden shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate" title={item.name}>{item.name}</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Code: <span className="font-medium text-slate-700">{item.code}</span>
                          {item.category && <> · {item.category}</>}
                        </p>
                      </div>
                      {!hasAny && <Badge variant="outline" className="text-slate-400 border-slate-200 shrink-0">No Content</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Image */}
                      <div className="space-y-1.5">
                        <div className="h-16 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                          {hasImage ? (
                            <img src={getMediaUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <Button
                          size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1 px-1"
                          disabled={!hasImage || downloadingKey === `${item._id}-image`}
                          onClick={() => downloadFile(getMediaUrl(item.image), `${item.code}-image${extFromUrl(item.image)}`, `${item._id}-image`)}
                        >
                          {downloadingKey === `${item._id}-image` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Image
                        </Button>
                      </div>
                      {/* Video */}
                      <div className="space-y-1.5">
                        <div className="h-16 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                          <Film className={`h-5 w-5 ${hasVideo ? 'text-purple-500' : 'text-slate-300'}`} />
                        </div>
                        <Button
                          size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1 px-1"
                          disabled={!hasVideo || downloadingKey === `${item._id}-video`}
                          onClick={() => downloadFile(getMediaUrl(item.videoUrl), `${item.code}-video${extFromUrl(item.videoUrl)}`, `${item._id}-video`)}
                        >
                          {downloadingKey === `${item._id}-video` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Video
                        </Button>
                      </div>
                      {/* Brochure */}
                      <div className="space-y-1.5">
                        <div className="h-16 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                          <FileText className={`h-5 w-5 ${hasBrochure ? 'text-red-500' : 'text-slate-300'}`} />
                        </div>
                        <Button
                          size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1 px-1"
                          disabled={!hasBrochure || downloadingKey === `${item._id}-brochure`}
                          onClick={() => downloadFile(getMediaUrl(item.brochureUrl), `${item.code}-brochure.pdf`, `${item._id}-brochure`)}
                        >
                          {downloadingKey === `${item._id}-brochure` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
                        </Button>
                      </div>
                    </div>

                    <Button
                      size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                      disabled={!hasAny}
                      onClick={() => openShare(item)}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share with Customer
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Share Modal */}
      <Dialog open={!!shareItem} onOpenChange={(open) => !open && setShareItem(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Share Marketing Content</DialogTitle>
            <DialogDescription>{shareItem?.name} ({shareItem?.code})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Share Via</Label>
              <Select value={shareForm.method} onValueChange={(v) => setShareForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                placeholder="Customer name"
                value={shareForm.customerName}
                onChange={(e) => setShareForm(f => ({ ...f, customerName: e.target.value }))}
              />
            </div>
            {shareForm.method === 'WhatsApp' ? (
              <div className="space-y-2">
                <Label>Customer Mobile</Label>
                <Input
                  placeholder="10-digit mobile number"
                  value={shareForm.customerPhone}
                  onChange={(e) => setShareForm(f => ({ ...f, customerPhone: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={shareForm.customerEmail}
                  onChange={(e) => setShareForm(f => ({ ...f, customerEmail: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareItem(null)}>Cancel</Button>
            <Button onClick={handleShareSubmit} disabled={sharing} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
