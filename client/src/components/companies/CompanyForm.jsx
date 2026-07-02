import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent, 
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, FileText, Stamp, Upload, X, Image } from 'lucide-react';

const companySchema = z.object({
  unitName: z.string().min(1, 'Unit name is required'),
  name: z.string().min(1, 'Company name is required'),
  legalName: z.string().min(1, 'Legal name is required'),
  companyType: z.string().optional(),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  address: z.string().min(1, 'Address is required'),
  locationPin: z
    .string()
    .min(1, 'PIN code is required')
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pan: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in format ABCDE1234F')
    .optional()
    .or(z.literal('')),
  gst: z.string().min(15, 'Valid GST number is required'),
});

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function CompanyForm({ isOpen, onClose, company, onSubmit, isLoading }) {
  // ─── Stamp state ────────────────────────────────────────────────────
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [stampError, setStampError] = useState('');
  const [stampUploading, setStampUploading] = useState(false);
  const stampInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      unitName: '',
      name: '',
      legalName: '',
      companyType: '',
      mobile: '',
      email: '',
      address: '',
      locationPin: '',
      city: '',
      state: '',
      pan: '',
      gst: '',
    },
  });

  // Existing stamp URL for edit mode
  const existingStampUrl = company?.stampUrl
    ? `${API_BASE}${company.stampUrl}`
    : null;

  useEffect(() => {
    if (company) {
      form.reset(company);
      setStampFile(null);
      setStampPreview(null);
      setStampError('');
    } else {
      form.reset({
        unitName: '',
        name: '',
        legalName: '',
        companyType: '',
        mobile: '',
        email: '',
        address: '',
        locationPin: '',
        city: '',
        state: '',
        pan: '',
        gst: '',
      });
      setStampFile(null);
      setStampPreview(null);
      setStampError('');
    }
  }, [company, form]);

  // ─── Handle stamp file selection ─────────────────────────────────────
  const handleStampChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setStampError('Only JPG, PNG, WEBP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStampError('File size must be less than 5MB');
      return;
    }

    setStampError('');
    setStampFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setStampPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeStamp = () => {
    setStampFile(null);
    setStampPreview(null);
    setStampError('');
    if (stampInputRef.current) stampInputRef.current.value = '';
  };

  // ─── Upload stamp to backend after company is created/updated ────────
  const uploadStamp = async (companyId) => {
    if (!stampFile) return;
    setStampUploading(true);
    const formData = new FormData();
    formData.append('stamp', stampFile);
    const token = localStorage.getItem('token');
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/companies/${companyId}/stamp`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
    } finally {
      setStampUploading(false);
    }
  };

  const handleSubmit = async (data) => {
    // For new company: require stamp
    if (!company && !stampFile) {
      setStampError('Company Stamp is required');
      return;
    }
    // Pass stamp uploader via callback — Companies.jsx will call uploadStamp after company is created
    onSubmit(data, uploadStamp);
  };

  const handleClose = () => {
    form.reset();
    removeStamp();
    onClose();
  };

  const currentStampSrc = stampPreview || existingStampUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {company ? 'Edit Company' : 'Add New Company'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Manufacturing Unit A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TechCorp Industries" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TechCorp Industries Private Limited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Private Limited">Private Limited</SelectItem>
                          <SelectItem value="Public Limited">Public Limited</SelectItem>
                          <SelectItem value="LLP">LLP</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                          <SelectItem value="OPC">OPC (One Person Company)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="9876543210"
                          type="tel"
                          maxLength={10}
                          {...field}
                          onChange={(e) => {
                            // Strip anything that isn't a digit
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            field.onChange(digits);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@company.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Location Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Complete address with building number, street, area"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="locationPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="110001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Delhi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="Delhi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Legal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ABCDE1234F" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gst"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="07AABCT1234H1Z5" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Company Stamp */}
            <Card className={stampError ? 'border-red-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stamp className="h-5 w-5 text-orange-600" />
                  Company Stamp
                  {!company && (
                    <span className="text-xs font-normal text-red-500 ml-1">* Required</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Preview box */}
                  <div className="flex-shrink-0">
                    {currentStampSrc ? (
                      <div className="relative w-40 h-32 border-2 border-orange-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                        <img
                          src={currentStampSrc}
                          alt="Company Stamp Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                        {stampFile && (
                          <button
                            type="button"
                            onClick={removeStamp}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-40 h-32 border-2 border-dashed border-orange-300 rounded-lg flex flex-col items-center justify-center bg-orange-50 gap-2">
                        <Image className="w-8 h-8 text-orange-300" />
                        <span className="text-xs text-orange-400 text-center px-2">No stamp uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Upload Company Stamp {!company && <span className="text-red-500">*</span>}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Upload your company's official stamp/seal. This will appear on all quotations and invoices generated for this company.
                        Accepted formats: JPG, PNG, WEBP (max 5MB)
                      </p>
                    </div>

                    <input
                      ref={stampInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleStampChange}
                      className="hidden"
                      id="stamp-upload"
                    />
                    <label
                      htmlFor="stamp-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-300 text-orange-700 rounded-md cursor-pointer hover:bg-orange-100 transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      {stampFile ? 'Change Stamp' : company?.stampUrl ? 'Replace Stamp' : 'Choose Stamp Image'}
                    </label>

                    {stampFile && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                        <Image className="w-3 h-3" />
                        <span>{stampFile.name} ({(stampFile.size / 1024).toFixed(1)} KB)</span>
                        <button type="button" onClick={removeStamp} className="ml-auto text-red-500 hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {company?.stampUrl && !stampFile && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                        Stamp already uploaded — upload a new one to replace it
                      </p>
                    )}

                    {stampError && (
                      <p className="text-sm text-red-500 font-medium">{stampError}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || stampUploading}>
                {isLoading || stampUploading
                  ? (stampUploading ? 'Uploading Stamp...' : 'Saving...')
                  : company ? 'Update Company' : 'Create Company'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}