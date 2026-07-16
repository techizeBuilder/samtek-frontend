// ViewItemModal component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Tag,
  Users,
  DollarSign,
  BarChart3,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Video,
  StickyNote
} from 'lucide-react';
import { config } from '@/config/environment';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

export default function ViewItemModal({ isOpen, onClose, item }) {
  if (!item) return null;

  const InfoRow = ({ icon: Icon, label, value, variant = 'default' }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm font-medium">
        {variant === 'badge' ? (
          <Badge variant={value === 'High' || value === 'Critical' ? 'destructive' : 'secondary'}>
            {value}
          </Badge>
        ) : variant === 'currency' ? (
          `₹${Number(value || 0).toLocaleString()}`
        ) : variant === 'boolean' ? (
          value ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              Yes
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              No
            </div>
          )
        ) : (
          value || 'N/A'
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                Item Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Tag} label="Item Code" value={item.code} />
              <InfoRow icon={Package} label="Item Name" value={item.name} />
              <InfoRow icon={FileText} label="Description" value={item.description} />
              <InfoRow icon={Tag} label="Item Type" value={item.type} variant="badge" />
              <InfoRow icon={AlertTriangle} label="Importance" value={item.importance} variant="badge" />
              <InfoRow icon={BarChart3} label="Unit" value={item.unit} />
              <InfoRow icon={MapPin} label="Store Location" value={item.storeLocation || item.store || 'No location'} />
              <InfoRow icon={Tag} label="Qty/Batch" value={item.batch} />
            </CardContent>
          </Card>

          {/* Category Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-purple-600" />
                Category Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Tag} label="Category" value={item.category} />
              <InfoRow icon={Tag} label="Sub Category" value={item.subCategory} />
              <InfoRow icon={Users} label="Customer Category" value={item.customerCategory} />
              <InfoRow icon={FileText} label="HSN Code" value={item.hsn} />
              <InfoRow icon={Calendar} label="Lead Time" value={`${item.leadTime || 0} days`} />
              {item.tags && item.tags.length > 0 && (
                <div className="py-2">
                  <div className="text-sm text-muted-foreground mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Stock Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={BarChart3} label="Current Stock" value={`${item.qty || 0} ${item.unit}`} />
              <InfoRow icon={AlertTriangle} label="Minimum Stock" value={`${item.minStock || 0} ${item.unit}`} />
              <div className="py-2">
                <div className="text-sm text-muted-foreground mb-1">Stock Status</div>
                <Badge variant={(item.qty || 0) <= (item.minStock || 0) ? 'destructive' : 'default'}>
                  {(item.qty || 0) <= (item.minStock || 0) ? 'Low Stock' : 'In Stock'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Pricing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={BarChart3} label="Standard Cost" value={item.stdCost} variant="currency" />
              <InfoRow icon={BarChart3} label="Purchase Cost" value={item.purchaseCost} variant="currency" />
              <InfoRow icon={BarChart3} label="Sale Price" value={item.salePrice} variant="currency" />
              <InfoRow icon={BarChart3} label="MRP" value={item.mrp} variant="currency" />
              <InfoRow icon={BarChart3} label="GST %" value={`${item.gst || 0}%`} />
            </CardContent>
          </Card>
        </div>

        {/* Manufacturing Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-indigo-600" />
              Manufacturing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow icon={Package} label="Internal Manufacturing" value={item.internalManufacturing} variant="boolean" />
              <InfoRow icon={Package} label="Purchase Item" value={item.purchase} variant="boolean" />
            </div>
            {item.internalNotes && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    Internal Notes
                  </div>
                  <p className="text-sm bg-muted p-3 rounded-lg">{item.internalNotes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Media & Documents */}
        {(item.image || item.brochureUrl || item.videoUrl || item.otherInfo) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-pink-600" />
                Media & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Product Image</div>
                  {item.image ? (
                    <img src={resolveMediaUrl(item.image)} alt={item.name} className="h-32 w-32 object-cover rounded-lg border" />
                  ) : (
                    <div className="h-32 w-32 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <InfoRow
                    icon={FileText}
                    label="Brochure"
                    value={item.brochureUrl ? (
                      <a href={resolveMediaUrl(item.brochureUrl)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View PDF
                      </a>
                    ) : null}
                  />
                  <InfoRow
                    icon={Video}
                    label="Video"
                    value={item.videoUrl ? (
                      <a href={item.videoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        Watch Video
                      </a>
                    ) : null}
                  />
                </div>
              </div>
              {item.otherInfo && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <StickyNote className="h-4 w-4" />
                      Other Info
                    </div>
                    <p className="text-sm bg-muted p-3 rounded-lg">{item.otherInfo}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customer Pricing */}
        {item.customerPrices && item.customerPrices.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-cyan-600" />
                Customer Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {item.customerPrices.map((pricing, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">{pricing.category}</div>
                    <div className="text-lg font-bold text-green-600">₹{pricing.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}