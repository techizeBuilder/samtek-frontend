import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesItemRequestApi } from '@/api/salesItemRequestApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Package, ChevronDown } from 'lucide-react';

// Sales asks R&D to add a brand-new product for a specific lead. Previously
// lived inside the Quotation page; now raised straight from the lead card on
// the Leads page (the card's "Add Request" pill is colour-coded by R&D's
// decision — see itemRequestStatus in leadController.getLeads).
const REQUEST_STATUS_STYLE = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const EMPTY_REQUEST = { productName: '', production: '', category: '', application: '', quantity: '1' };

export default function SalesItemRequestModal({ leadId, leadCode, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newItemRequest, setNewItemRequest] = useState(EMPTY_REQUEST);
  const [newItemRequestImage, setNewItemRequestImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const { data: itemRequestsData } = useQuery({
    queryKey: ['sales-item-requests', leadId],
    queryFn: () => salesItemRequestApi.listRequests({ leadId }),
    enabled: !!leadId && open,
  });
  const itemRequests = itemRequestsData?.requests || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItemRequest.productName.trim()) {
      toast({ title: 'Required', description: 'Product Name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await salesItemRequestApi.createRequest({
        leadId,
        leadCode: leadCode || '',
        productName: newItemRequest.productName,
        production: newItemRequest.production,
        category: newItemRequest.category,
        application: newItemRequest.application,
        quantity: newItemRequest.quantity,
      }, newItemRequestImage);

      toast({ title: 'Sent to R&D', description: 'Your product request has been submitted for approval.' });
      setNewItemRequest(EMPTY_REQUEST);
      setNewItemRequestImage(null);
      queryClient.invalidateQueries({ queryKey: ['sales-item-requests', leadId] });
      // Refresh the leads list so the card's "Add Request" pill re-colours to Pending.
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to send request', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const imgBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" /> Request New Product from R&D
          </DialogTitle>
          <DialogDescription>
            Sales asks R&D to add a product that isn't in the catalog yet. Lead Id and request date are filled in automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Lead Id</Label>
              <Input value={leadCode || leadId || ''} disabled className="bg-gray-100 border-gray-300" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Request Date</Label>
              <Input value={new Date().toLocaleDateString()} disabled className="bg-gray-100 border-gray-300" />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Product Name *</Label>
              <Input
                placeholder="Enter Product Name"
                value={newItemRequest.productName}
                onChange={(e) => setNewItemRequest({ ...newItemRequest, productName: e.target.value })}
                className="border-gray-300"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Production</Label>
              <Input
                placeholder="e.g. In-house / Outsourced"
                value={newItemRequest.production}
                onChange={(e) => setNewItemRequest({ ...newItemRequest, production: e.target.value })}
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Product Category</Label>
              <Input
                placeholder="e.g. Flour Mill Plant"
                value={newItemRequest.category}
                onChange={(e) => setNewItemRequest({ ...newItemRequest, category: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Quantity</Label>
              <Input
                type="number"
                min="1"
                value={newItemRequest.quantity}
                onChange={(e) => setNewItemRequest({ ...newItemRequest, quantity: e.target.value })}
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700 font-semibold">Application</Label>
              <Input
                placeholder="Where/how this product will be used"
                value={newItemRequest.application}
                onChange={(e) => setNewItemRequest({ ...newItemRequest, application: e.target.value })}
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700 font-semibold">Image</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewItemRequestImage(e.target.files[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {newItemRequestImage && (
                <img src={URL.createObjectURL(newItemRequestImage)} alt="preview" className="h-16 w-16 object-cover rounded border" />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {isSubmitting ? 'Sending...' : 'Send Request to R&D'}
            </Button>
          </div>

          {/* Past requests for this lead — surfaces status back to Sales. Click a
              row to expand its full details (production/category/quantity/
              application/image, who requested it, and R&D's own review remarks
              once decided). */}
          {itemRequests.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Requests for this lead</p>
              {itemRequests.map((r) => {
                const isExpanded = expandedId === r._id;
                const imageUrl = r.image
                  ? (r.image.startsWith('http') ? r.image : `${imgBase}${r.image}`)
                  : null;
                return (
                  <div key={r._id} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : r._id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.productName}</p>
                        <p className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${REQUEST_STATUS_STYLE[r.status]}`}>
                          {r.status}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-200 bg-white space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div><span className="text-gray-400">Production:</span> <span className="text-gray-700">{r.production || '—'}</span></div>
                          <div><span className="text-gray-400">Category:</span> <span className="text-gray-700">{r.category || '—'}</span></div>
                          <div><span className="text-gray-400">Quantity:</span> <span className="text-gray-700">{r.quantity ?? '—'}</span></div>
                          <div><span className="text-gray-400">Requested By:</span> <span className="text-gray-700">{r.requestedBy?.fullName || r.requestedBy?.username || '—'}</span></div>
                        </div>
                        {r.application && (
                          <div className="text-xs"><span className="text-gray-400">Application:</span> <span className="text-gray-700">{r.application}</span></div>
                        )}
                        {imageUrl && (
                          <img src={imageUrl} alt={r.productName} className="h-16 w-16 object-cover rounded border border-gray-200" />
                        )}
                        {r.status !== 'Pending' && (
                          <div className="text-xs pt-1.5 border-t border-gray-100">
                            <span className="text-gray-400">{r.status} by:</span> <span className="text-gray-700">{r.reviewedBy?.fullName || r.reviewedBy?.username || '—'}</span>
                            {r.reviewedAt && <span className="text-gray-400"> on {new Date(r.reviewedAt).toLocaleString()}</span>}
                            {r.reviewRemarks && (
                              <p className="text-gray-700 mt-1 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">{r.reviewRemarks}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
