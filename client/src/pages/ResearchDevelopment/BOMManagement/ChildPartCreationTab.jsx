import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Boxes, Plus, Wand2, ImageIcon, Ban, RefreshCw, Loader2 } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { config } from '@/config/environment';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

export default function ChildPartCreationTab({ product }) {
  const qc = useQueryClient();
  const [cpName, setCpName] = useState('');
  const [cpCode, setCpCode] = useState('');
  const [cpImage, setCpImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [subForms, setSubForms] = useState({}); // childPartId -> { name, code }

  const productId = product?._id;

  const { data: childPartsResponse, isLoading } = useQuery({
    queryKey: ['rd-child-parts', productId],
    queryFn: () => apiRequest('GET', `/api/rd/child-parts?productId=${productId}`),
    enabled: !!productId,
  });
  const childParts = childPartsResponse?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rd-child-parts', productId] });

  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest('GET', `/api/rd/child-parts/generate-code?productId=${productId}`),
    onSuccess: (res) => setCpCode(res.code),
    onError: (e) => showSmartToast(e, 'Failed to generate code'),
  });

  const createChildPartMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/child-parts', data),
    onSuccess: () => {
      invalidate();
      showSuccessToast('Child Part Created', 'New child part added successfully');
      setCpName(''); setCpCode(''); setCpImage('');
    },
    onError: (e) => showSmartToast(e, 'Failed to create child part'),
  });

  const discontinueChildPartMutation = useMutation({
    mutationFn: ({ id, isDiscontinued }) => apiRequest('PUT', `/api/rd/child-parts/${id}`, { isDiscontinued }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to update status'),
  });

  const generateSubCodeMutation = useMutation({
    mutationFn: (childPartId) => apiRequest('GET', `/api/rd/child-parts/${childPartId}/sub-parts/generate-code`),
    onSuccess: (res, childPartId) => setSubForms(f => ({ ...f, [childPartId]: { ...f[childPartId], code: res.code } })),
    onError: (e) => showSmartToast(e, 'Failed to generate code'),
  });

  const addSubChildPartMutation = useMutation({
    mutationFn: ({ childPartId, data }) => apiRequest('POST', `/api/rd/child-parts/${childPartId}/sub-parts`, data),
    onSuccess: (_res, { childPartId }) => {
      invalidate();
      showSuccessToast('Sub Child Part Created', 'New sub child part added successfully');
      setSubForms(f => ({ ...f, [childPartId]: { name: '', code: '' } }));
    },
    onError: (e) => showSmartToast(e, 'Failed to add sub child part'),
  });

  const discontinueSubMutation = useMutation({
    mutationFn: ({ childPartId, subId, isDiscontinued }) => apiRequest('PUT', `/api/rd/child-parts/${childPartId}/sub-parts/${subId}`, { isDiscontinued }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to update status'),
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showSmartToast(new Error('Please select an image under 5MB'), 'File too large');
      return;
    }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiRequest('POST', '/api/items/upload-image', fd);
      if (res.success && res.url) setCpImage(res.url);
    } catch (e) {
      showSmartToast(e, 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleAddChildPart = () => {
    if (!cpName || !cpCode || !productId) return;
    createChildPartMutation.mutate({ productId, name: cpName, code: cpCode, image: cpImage });
  };

  const getSubForm = (childPartId) => subForms[childPartId] || { name: '', code: '' };
  const setSubForm = (childPartId, patch) => setSubForms(f => ({ ...f, [childPartId]: { ...getSubForm(childPartId), ...patch } }));

  return (
    <div className="space-y-6">
      {/* Add Child Part */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Add Child Part for {product?.name}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part Name *</Label>
              <Input placeholder="e.g. Main Body" value={cpName} onChange={e => setCpName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part Code *</Label>
              <div className="flex gap-2">
                <Input placeholder="Type or generate" value={cpCode} onChange={e => setCpCode(e.target.value)} />
                <Button type="button" variant="outline" size="icon" className="flex-shrink-0" title="Generate code"
                  onClick={() => generateCodeMutation.mutate()} disabled={generateCodeMutation.isPending}>
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Image</Label>
              <div className="flex items-center gap-2">
                {cpImage ? (
                  <img src={resolveMediaUrl(cpImage)} alt="" className="h-9 w-9 rounded object-cover border" />
                ) : (
                  <div className="h-9 w-9 rounded border bg-slate-50 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                )}
                <label className="cursor-pointer">
                  <span className="text-xs text-blue-600 hover:underline">{imageUploading ? 'Uploading...' : 'Upload'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                </label>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleAddChildPart} disabled={!cpName || !cpCode || createChildPartMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Child Part
          </Button>
        </CardContent>
      </Card>

      {/* Child Parts list */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      ) : childParts.length === 0 ? (
        <Card className="border-none shadow-sm"><CardContent className="py-10 text-center text-slate-400">No Child Parts created for this product yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {childParts.map(cp => {
            const subForm = getSubForm(cp._id);
            return (
              <Card key={cp._id} className="border-none shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {cp.image ? (
                        <img src={resolveMediaUrl(cp.image)} alt="" className="h-10 w-10 rounded object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-slate-50 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">{cp.name}</p>
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{cp.code}</span>
                        {cp.isDiscontinued && <span className="ml-2 text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => discontinueChildPartMutation.mutate({ id: cp._id, isDiscontinued: !cp.isDiscontinued })}>
                      {cp.isDiscontinued ? <RefreshCw className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-red-500" />}
                    </Button>
                  </div>

                  {/* Sub Child Parts */}
                  <div className="pl-4 border-l-2 border-slate-100 space-y-2">
                    {(cp.subChildParts || []).map(sub => (
                      <div key={sub._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm text-slate-800">{sub.name}</span>
                          <span className="ml-2 font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{sub.code}</span>
                          {sub.isDiscontinued && <span className="ml-2 text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => discontinueSubMutation.mutate({ childPartId: cp._id, subId: sub._id, isDiscontinued: !sub.isDiscontinued })}>
                          {sub.isDiscontinued ? <RefreshCw className="h-3.5 w-3.5 text-emerald-600" /> : <Ban className="h-3.5 w-3.5 text-red-500" />}
                        </Button>
                      </div>
                    ))}

                    {!cp.isDiscontinued && (
                      <div className="flex items-end gap-2 pt-1">
                        <div className="flex-1">
                          <Label className="text-[11px] text-slate-500 mb-1 block">Sub Child Part Name</Label>
                          <Input className="h-8 text-sm" placeholder="e.g. Side Panel" value={subForm.name} onChange={e => setSubForm(cp._id, { name: e.target.value })} />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[11px] text-slate-500 mb-1 block">Sub Child Part Code</Label>
                          <div className="flex gap-1">
                            <Input className="h-8 text-sm" placeholder="Type or generate" value={subForm.code} onChange={e => setSubForm(cp._id, { code: e.target.value })} />
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" title="Generate code"
                              onClick={() => generateSubCodeMutation.mutate(cp._id)}>
                              <Wand2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Button size="sm" className="h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          disabled={!subForm.name || !subForm.code || addSubChildPartMutation.isPending}
                          onClick={() => addSubChildPartMutation.mutate({ childPartId: cp._id, data: subForm })}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
