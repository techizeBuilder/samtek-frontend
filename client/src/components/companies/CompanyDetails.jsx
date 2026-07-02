import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Calendar,
  Globe,
  Hash,
  Stamp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function CompanyDetails({ isOpen, onClose, company }) {
  if (!company) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const stampUrl = company.stampUrl ? `${API_BASE}${company.stampUrl}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Company Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {company.name}
            </h2>
            {company.legalName && (
              <p className="text-gray-600">{company.legalName}</p>
            )}
            <div className="flex gap-2 justify-center">
              <Badge variant="outline" className="text-sm">
                {company.unitName}
              </Badge>
              {company.companyType && (
                <Badge variant="secondary" className="text-sm">
                  {company.companyType}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Company Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mobile</p>
                    <p className="text-gray-900">{company.mobile}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900">{company.email}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-gray-900">
                      {formatDate(company.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
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
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-gray-900">{company.address}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">PIN Code</p>
                    <p className="text-gray-900">{company.locationPin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">City</p>
                    <p className="text-gray-900">{company.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">State</p>
                    <p className="text-gray-900">{company.state}</p>
                  </div>
                </div>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {company.pan && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">PAN Number</p>
                    <p className="text-gray-900 font-mono">{company.pan}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">GST Number</p>
                  <p className="text-gray-900 font-mono">{company.gst}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Stamp */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stamp className="h-5 w-5 text-orange-600" />
                Company Stamp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stampUrl ? (
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="border-2 border-orange-200 rounded-lg p-3 bg-orange-50 flex items-center justify-center shadow-sm" style={{ minWidth: 160, minHeight: 120 }}>
                    <img
                      src={stampUrl}
                      alt="Company Stamp"
                      className="max-w-[150px] max-h-[110px] object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Stamp Uploaded</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      This company's stamp will automatically appear on all quotations and documents generated by salespersons assigned to this company.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">No Stamp Uploaded</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Edit this company to upload a stamp. The stamp will appear on all quotations for this company.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-gray-600" />
                Record Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Created At</p>
                  <p className="text-gray-900">
                    {formatDate(company.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-gray-900">
                    {formatDate(company.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}