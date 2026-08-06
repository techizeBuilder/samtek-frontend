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
  Ruler
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
            <Badge className={item.isDiscontinued ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
              {item.isDiscontinued ? 'Discontinued' : 'Active'}
            </Badge>
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
              {item.image && (
                <div className="py-2">
                  <img src={resolveMediaUrl(item.image)} alt={item.name} className="h-24 w-24 object-cover rounded-lg border" />
                </div>
              )}
              <InfoRow icon={Tag} label="Item Code" value={item.code} />
              <InfoRow icon={Package} label="Item Name" value={item.name} />
              <InfoRow icon={FileText} label="Description" value={item.description} />
              <InfoRow icon={AlertTriangle} label="Importance" value={item.importance} variant="badge" />
              <InfoRow icon={BarChart3} label="Unit" value={item.unitType ? `${item.unit} (${item.unitType})` : item.unit} />
              <InfoRow icon={MapPin} label="Store Location" value={item.storeLocation || item.store || 'No location'} />
              <InfoRow icon={Tag} label="Batch" value={item.batch} />
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
              <InfoRow icon={Tag} label="Source Type" value={item.sourceType} />
              <InfoRow icon={Tag} label="Item Source Type" value={item.itemSourceType} />
              <InfoRow icon={FileText} label="HSN Code" value={item.hsn} />
              <InfoRow icon={Calendar} label="Lead Time" value={`${item.leadTime || 0} days`} />
              {Array.isArray(item.itemCategories) && item.itemCategories.length > 0 && (
                <div className="py-2">
                  <div className="text-sm text-muted-foreground mb-2">Item Category</div>
                  <div className="flex flex-wrap gap-1">
                    {item.itemCategories.map((c, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Item Attributes */}
          {(item.brand || item.metrology || item.materialGrade || item.modelNumber || item.size || (item.unitWeightValue !== null && item.unitWeightValue !== undefined && item.unitWeightValue !== '')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-teal-600" />
                  Item Attributes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow icon={Tag} label="Brand" value={item.brand} />
                <InfoRow icon={Tag} label="Model Number" value={item.modelNumber} />
                <InfoRow icon={Tag} label="Metrology" value={item.metrology} />
                <InfoRow icon={Tag} label="Material Grade" value={item.materialGrade} />
                <InfoRow icon={Tag} label="Size" value={item.size} />
                {(item.unitWeightValue !== null && item.unitWeightValue !== undefined && item.unitWeightValue !== '') && (
                  <InfoRow icon={BarChart3} label="Unit Weight" value={`${item.unitWeightValue} ${item.unitWeightUnit || ''}`.trim()} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Dimensions */}
          {item.dimensions && Object.values(item.dimensions).some(d => d?.value !== null && d?.value !== undefined && d?.value !== '') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ruler className="h-5 w-5 text-cyan-600" />
                  Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[['length', 'Length'], ['height', 'Height'], ['width', 'Width'], ['diaOD', 'Dia (OD)'], ['diaID', 'Dia (ID)'], ['thickness', 'Thickness']].map(([key, label]) => {
                  const d = item.dimensions?.[key];
                  if (d?.value === null || d?.value === undefined || d?.value === '') return null;
                  return <InfoRow key={key} icon={Ruler} label={label} value={`${d.value} ${d.unit || ''}`.trim()} />;
                })}
              </CardContent>
            </Card>
          )}

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
              <InfoRow icon={BarChart3} label="Min Order Qty" value={item.minOrderQty} />
              {item.purchase && (
                <InfoRow
                  icon={BarChart3}
                  label="Purchase Unit"
                  value={item.purchaseUnitType ? `${item.purchaseUnit} (${item.purchaseUnitType})` : item.purchaseUnit}
                />
              )}
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
              <InfoRow icon={BarChart3} label="Dealer Price" value={item.dealerPrice} variant="currency" />
              <InfoRow icon={BarChart3} label="MRP" value={item.mrp} variant="currency" />
              <InfoRow icon={BarChart3} label="GST %" value={`${item.gst || 0}%`} />
              <InfoRow icon={Tag} label="Cost Source" value={item.costSource || 'Manual'} variant="badge" />
              {item.costResolutionIssue && (
                <div className="py-2">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Cost Resolution Issue</div>
                  <p className="text-sm bg-amber-50 text-amber-800 p-2 rounded-lg">{item.costResolutionIssue}</p>
                </div>
              )}
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

        {/* Specifications */}
        {Array.isArray(item.specifications) && item.specifications.filter(s => s.key).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-slate-600" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {item.specifications.filter(s => s.key).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{s.key}</span>
                    <span className="text-sm font-medium">{s.value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications */}
        {Array.isArray(item.applications) && item.applications.filter(Boolean).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-lime-600" />
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {item.applications.filter(Boolean).map((app, i) => (
                  <Badge key={i} variant="outline">{app}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warranty */}
        {item.warranty && (item.warranty.period || item.warranty.terms) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Warranty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Calendar} label="Period" value={`${item.warranty.period || 0} months`} />
              <InfoRow icon={Tag} label="Type" value={item.warranty.type} variant="badge" />
              {item.warranty.terms && (
                <div className="py-2">
                  <div className="text-sm text-muted-foreground mb-1">Terms</div>
                  <p className="text-sm bg-muted p-3 rounded-lg">{item.warranty.terms}</p>
                </div>
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