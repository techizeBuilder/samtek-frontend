import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, X, Package, Image as ImageIcon, Film, FileText,
  Upload as UploadIcon, CheckCircle2, ArrowLeft, Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Relative server paths (e.g. "/uploads/marketing/mkt-123.jpg") need the backend
// origin prepended — same convention as Sales > Send Quotation's getImageUrl().
const getMediaUrl = (p) => {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('data:') || p.startsWith('blob:')) return p;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
  return `${baseUrl}${p}`;
};

export default function UploadContent() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ─── Group / Category / SubCategory filter (same behavior as Sales > Send
  // Quotation's customer/dealer product picker) ────────────────────────────
  const [searchGroup, setSearchGroup] = useState('All');
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchSubCategory, setSearchSubCategory] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState({ group: 'All', category: 'All', subCategory: 'All', mode: null });

  const [selectedItem, setSelectedItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [brochureFile, setBrochureFile] = useState(null);

  const { data: filtersData } = useQuery({
    queryKey: ['mkt-item-filters'],
    queryFn: () => apiRequest('GET', '/api/marketing/item-filters'),
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['mkt-items'],
    queryFn: () => apiRequest('GET', '/api/marketing/items'),
  });

  const productsList = itemsData?.items || [];

  // Groups primarily from the Group collection, falling back to whatever is on items
  const allGroups = useMemo(() => {
    const fromCollection = (filtersData?.groups || []).map(g => g.name).filter(Boolean);
    if (fromCollection.length > 0) return [...fromCollection].sort();
    return [...new Set(productsList.map(p => p.group).filter(Boolean))].sort();
  }, [filtersData, productsList]);

  // Categories derived from items, filtered by the selected group
  const categoriesByGroup = useMemo(() => {
    const base = searchGroup === 'All' ? productsList : productsList.filter(p => p.group === searchGroup);
    return [...new Set(base.map(p => p.category).filter(Boolean))].sort();
  }, [productsList, searchGroup]);

  // SubCategories from the Category collection's subcategories array, falling back to items
  const allCategoriesList = filtersData?.categories || [];
  const subCategoriesByCategoryAndGroup = useMemo(() => {
    if (searchCategory === 'All') return [];
    const catDoc = allCategoriesList.find(
      c => c.name.toLowerCase().trim() === searchCategory.toLowerCase().trim()
    );
    if (catDoc) return (catDoc.subcategories || []).filter(Boolean).sort();
    return [...new Set(
      productsList
        .filter(p => p.category?.toLowerCase().trim() === searchCategory.toLowerCase().trim())
        .map(p => p.subCategory)
        .filter(Boolean)
    )].sort();
  }, [allCategoriesList, searchCategory, productsList]);

  const af = appliedFilters;
  const filteredProducts = productsList.filter(p => {
    if (af.mode === null) return true;
    const matchesGroup = af.group === 'All' || p.group === af.group;
    const matchesCategory = af.category === 'All' || p.category === af.category;
    const matchesSubCategory = af.subCategory === 'All' || p.subCategory === af.subCategory;
    return matchesGroup && matchesCategory && matchesSubCategory;
  });

  const handleSearch = () => {
    if (searchGroup !== 'All') {
      if (searchCategory === 'All') {
        toast({ title: 'Please select Category', description: 'Category is required when Group is selected.', variant: 'destructive' });
        return;
      }
      if (searchSubCategory === 'All' && subCategoriesByCategoryAndGroup.length > 0) {
        toast({ title: 'Please select Sub Category', description: 'Sub Category is required when Category is selected.', variant: 'destructive' });
        return;
      }
    }
    setAppliedFilters({
      group: searchGroup, category: searchCategory, subCategory: searchSubCategory,
      mode: searchGroup === 'All' && searchCategory === 'All' ? null : 'filter'
    });
  };

  const handleReset = () => {
    setSearchGroup('All'); setSearchCategory('All'); setSearchSubCategory('All');
    setAppliedFilters({ group: 'All', category: 'All', subCategory: 'All', mode: null });
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setImageFile(null); setVideoFile(null); setBrochureFile(null);
  };

  const uploadMutation = useMutation({
    mutationFn: (fd) => apiRequest('POST', `/api/marketing/items/${selectedItem._id}/media`, fd),
    onSuccess: (res) => {
      toast({ title: 'Uploaded!', description: `Media saved for ${selectedItem.name}` });
      setSelectedItem(res.item);
      setImageFile(null); setVideoFile(null); setBrochureFile(null);
      qc.invalidateQueries({ queryKey: ['mkt-items'] });
    },
    onError: (err) => {
      toast({ title: 'Upload failed', description: err.message || 'Failed to upload', variant: 'destructive' });
    }
  });

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!imageFile && !videoFile && !brochureFile) {
      return toast({ title: 'Error', description: 'Please choose at least one file (image, video, or PDF brochure)', variant: 'destructive' });
    }
    const fd = new FormData();
    if (imageFile) fd.append('image', imageFile);
    if (videoFile) fd.append('video', videoFile);
    if (brochureFile) fd.append('brochure', brochureFile);
    uploadMutation.mutate(fd);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Marketing Content</h1>
        <p className="text-slate-500 text-sm mt-1">
          Filter products by Group, Category &amp; Sub Category, then upload image, video and PDF brochure for the selected item.
        </p>
      </div>

      {!selectedItem ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Group filter */}
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={searchGroup}
                  onValueChange={(val) => { setSearchGroup(val); setSearchCategory('All'); setSearchSubCategory('All'); }}
                >
                  <SelectTrigger><SelectValue placeholder="All Groups" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Groups</SelectItem>
                    {allGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Category filter - filtered by group */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={searchCategory}
                  onValueChange={(val) => { setSearchCategory(val); setSearchSubCategory('All'); }}
                >
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categoriesByGroup.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* SubCategory filter */}
              <div className="space-y-2">
                <Label>Sub Category</Label>
                <Select
                  value={searchSubCategory}
                  onValueChange={(val) => setSearchSubCategory(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      searchCategory === 'All'
                        ? 'Select Category first'
                        : subCategoriesByCategoryAndGroup.length === 0
                          ? 'No Sub Categories'
                          : 'All Sub Categories'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Sub Categories</SelectItem>
                    {subCategoriesByCategoryAndGroup.map(sc => <SelectItem key={sc} value={sc}>{sc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
              {appliedFilters.mode !== null && (
                <Button variant="ghost" className="text-gray-500" onClick={handleReset}>
                  <X className="h-4 w-4 mr-1" /> Reset
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Sno</th>
                    <th className="px-4 py-3 text-left">Image</th>
                    <th className="px-4 py-3 text-left">Item Name</th>
                    <th className="px-4 py-3 text-left">Item Code</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Media</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-500">Loading products...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-500">No products found</td></tr>
                  ) : filteredProducts.map((p, idx) => (
                    <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded border overflow-hidden bg-gray-100 flex items-center justify-center">
                          {getMediaUrl(p.image) ? (
                            <img
                              src={getMediaUrl(p.image)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div className="h-full w-full items-center justify-center text-gray-300" style={{ display: getMediaUrl(p.image) ? 'none' : 'flex' }}>
                            <Package className="h-5 w-5" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.code || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-700">{p.category}</span>
                          {p.subCategory && <span className="text-xs text-gray-400">{p.subCategory}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <ImageIcon className={`h-4 w-4 ${p.image ? 'text-green-600' : ''}`} />
                          <Film className={`h-4 w-4 ${p.videoUrl ? 'text-green-600' : ''}`} />
                          <FileText className={`h-4 w-4 ${p.brochureUrl ? 'text-green-600' : ''}`} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => selectItem(p)}>
                          Select
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3 mb-1 text-gray-500" onClick={() => setSelectedItem(null)}>
                <ArrowLeft className="h-4 w-4" /> Back to list
              </Button>
              <CardTitle className="text-base">{selectedItem.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Code: {selectedItem.code} {selectedItem.category && <>· {selectedItem.category}</>} {selectedItem.subCategory && <>· {selectedItem.subCategory}</>}
              </p>
            </div>
            <Badge variant="outline">{selectedItem.group || 'No Group'}</Badge>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUploadSubmit} className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Image */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 cursor-pointer transition-colors h-36"
                    onClick={() => document.getElementById('item-image-input').click()}
                  >
                    {imageFile ? (
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-24 w-24 object-cover rounded border" />
                    ) : getMediaUrl(selectedItem.image) ? (
                      <img src={getMediaUrl(selectedItem.image)} alt={selectedItem.name} className="h-24 w-24 object-cover rounded border" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Click to add image</span>
                      </>
                    )}
                  </div>
                  <input id="item-image-input" type="file" accept="image/*" className="hidden"
                    onChange={(e) => setImageFile(e.target.files[0] || null)} />
                  {imageFile && <p className="text-xs text-blue-600 truncate">{imageFile.name}</p>}
                </div>

                {/* Video */}
                <div className="space-y-2">
                  <Label>Product Video</Label>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 cursor-pointer transition-colors h-36"
                    onClick={() => document.getElementById('item-video-input').click()}
                  >
                    {videoFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <span className="text-xs text-slate-600 truncate max-w-[10rem]">{videoFile.name}</span>
                      </div>
                    ) : selectedItem.videoUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <Film className="h-8 w-8 text-green-600" />
                        <span className="text-xs text-slate-500">Video already uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Film className="h-8 w-8 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Click to add video</span>
                      </>
                    )}
                  </div>
                  <input id="item-video-input" type="file" accept="video/*" className="hidden"
                    onChange={(e) => setVideoFile(e.target.files[0] || null)} />
                  {getMediaUrl(selectedItem.videoUrl) && !videoFile && (
                    <a href={getMediaUrl(selectedItem.videoUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View current video</a>
                  )}
                </div>

                {/* Brochure */}
                <div className="space-y-2">
                  <Label>PDF Brochure</Label>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 cursor-pointer transition-colors h-36"
                    onClick={() => document.getElementById('item-brochure-input').click()}
                  >
                    {brochureFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <span className="text-xs text-slate-600 truncate max-w-[10rem]">{brochureFile.name}</span>
                      </div>
                    ) : selectedItem.brochureUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="h-8 w-8 text-green-600" />
                        <span className="text-xs text-slate-500">Brochure already uploaded</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-8 w-8 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Click to add PDF</span>
                      </>
                    )}
                  </div>
                  <input id="item-brochure-input" type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => setBrochureFile(e.target.files[0] || null)} />
                  {getMediaUrl(selectedItem.brochureUrl) && !brochureFile && (
                    <a href={getMediaUrl(selectedItem.brochureUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View current brochure</a>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploadMutation.isPending} className="gap-2">
                {uploadMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><UploadIcon className="h-4 w-4" /> Save Media</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
