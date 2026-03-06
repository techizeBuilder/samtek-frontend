import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit2, Trash2, Users, Building2, MapPin, Phone, Mail } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';

const VendorMaster = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['/api/suppliers'],
        queryFn: () => apiRequest('GET', '/api/suppliers')
    });

    const vendors = data?.suppliers || [];

    const filteredVendors = vendors.filter(v =>
        v.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const mutation = useMutation({
        mutationFn: (vendorData) => {
            if (editingVendor) {
                return apiRequest('PUT', `/api/suppliers/${editingVendor._id}`, vendorData);
            }
            return apiRequest('POST', '/api/suppliers', vendorData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
            toast({ title: "Success", description: "Vendor saved successfully" });
            setIsAddModalOpen(false);
            setEditingVendor(null);
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const vendorData = Object.fromEntries(formData.entries());
        mutation.mutate(vendorData);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vendor Master</h1>
                    <p className="text-slate-500">Manage your raw material and service providers</p>
                </div>
                <Button onClick={() => { setEditingVendor(null); setIsAddModalOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                </Button>
            </div>

            <Card className="mb-6 shadow-sm border-0">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search vendors by name or code..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                    <Card key={vendor._id} className="hover:shadow-md transition-shadow border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold">{vendor.supplierName}</CardTitle>
                            <Badge variant={vendor.status === 'active' ? 'success' : 'secondary'}>
                                {vendor.status || 'Active'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-xs font-mono text-slate-400">{vendor.supplierCode}</div>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm text-slate-600">
                                    <Phone className="w-4 h-4 mr-2" /> {vendor.phone}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Mail className="w-4 h-4 mr-2" /> {vendor.email}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mr-2" /> {vendor.address?.city}, {vendor.address?.state}
                                </div>
                            </div>
                            <div className="pt-4 border-t flex justify-between items-center">
                                <div className="text-sm">
                                    <span className="text-slate-400">Opening Balance: </span>
                                    <span className="font-bold">₹{vendor.openingBalance || 0}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingVendor(vendor); setIsAddModalOpen(true); }}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Vendor Name*</label>
                            <Input name="supplierName" defaultValue={editingVendor?.supplierName} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contact Person*</label>
                            <Input name="contactPerson" defaultValue={editingVendor?.contactPerson} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">GST Number</label>
                            <Input name="gstNumber" defaultValue={editingVendor?.gstNumber} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone*</label>
                            <Input name="phone" defaultValue={editingVendor?.phone} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Email*</label>
                            <Input name="email" type="email" defaultValue={editingVendor?.email} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Opening Balance (Dr/Cr)</label>
                            <Input name="openingBalance" type="number" defaultValue={editingVendor?.openingBalance || 0} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Entity Type</label>
                            <select name="entityType" className="w-full border rounded-md p-2" defaultValue={editingVendor?.entityType || 'Others'}>
                                <option value="Individual">Individual</option>
                                <option value="HUF">HUF</option>
                                <option value="Company">Company</option>
                                <option value="Firm">Firm</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">TDS Section</label>
                            <select name="tdsSection" className="w-full border rounded-md p-2" defaultValue={editingVendor?.tdsSection || 'None'}>
                                <option value="194C">Section 194C (Contract)</option>
                                <option value="194J">Section 194J (Prof.)</option>
                                <option value="194Q">Section 194Q (Goods Sale)</option>
                                <option value="206C_1H">Section 206C(1H)</option>
                                <option value="None">None</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <select name="status" className="w-full border rounded-md p-2" defaultValue={editingVendor?.status || 'active'}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="col-span-2 pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isLoading}>
                                {mutation.isLoading ? 'Saving...' : 'Save Vendor'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VendorMaster;
