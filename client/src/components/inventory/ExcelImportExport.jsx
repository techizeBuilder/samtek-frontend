import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { ClientExcelExporter } from '@/utils/excelExport';

// Helper function to get role-based API path
function getInventoryApiPath(user) {
  if (!user) return '/api';
  
  switch (user.role) {
    case 'Superadmin':
      return '/api/super-admin/inventory';
    case 'Unit Head':
      return '/api/unit-head/inventory';
    default:
      return '/api';
  }
}

export default function ExcelImportExport({ type = 'items' }) {
  const { user } = useAuth();
  const [importOpen, setImportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Get role-based API path
  const apiBasePath = getInventoryApiPath(user);

  const getTypeConfig = () => {
    switch (type) {
      case 'categories':
        return {
          title: 'Categories',
          importFn: null, // Categories import not implemented yet
          queryKey: `${apiBasePath}/categories`
        };
      case 'customer-categories':
        return {
          title: 'Customer Categories',
          importFn: null, // Customer categories import not implemented yet
          queryKey: `${apiBasePath}/customer-categories`
        };
      case 'customers':
        return {
          title: 'Customers',
          importFn: api.importCustomersFromExcel.bind(api),
          queryKey: '/api/customers'
        };
      case 'suppliers':
        return {
          title: 'Suppliers',
          importFn: api.importSuppliersFromExcel.bind(api),
          queryKey: '/api/suppliers'
        };
      default:
        return {
          title: 'Inventory Items',
          importFn: api.importItemsFromExcel.bind(api),
          queryKey: `${apiBasePath}/items`
        };
    }
  };

  const config = getTypeConfig();

  const handleExport = async () => {
    try {
      toast({
        title: "Preparing Export",
        description: "Fetching data and generating Excel file...",
      });
      
      let data = [];
      let exportResult;
      
      // Get fresh data for export
      switch (type) {
        case 'categories':
          const categoriesResponse = await api.getCategories();
          data = categoriesResponse.categories || [];
          exportResult = ClientExcelExporter.exportCategories(data);
          break;
        case 'customer-categories':
          const customerCategoriesResponse = await api.getCustomerCategories();
          data = customerCategoriesResponse.customerCategories || [];
          exportResult = ClientExcelExporter.exportCustomerCategories(data);
          break;
        case 'customers':
          const customersResponse = await api.getCustomers();
          data = customersResponse.customers || [];
          exportResult = ClientExcelExporter.exportCustomers(data);
          break;
        case 'suppliers':
          const suppliersResponse = await api.getSuppliers();
          data = suppliersResponse.suppliers || [];
          exportResult = ClientExcelExporter.exportSuppliers(data);
          break;
        default:
          const itemsResponse = await api.getItems();
          data = itemsResponse.items || [];
          exportResult = ClientExcelExporter.exportInventoryItems(data);
          break;
      }
      
      if (exportResult.success) {
        toast({
          title: "Export Successful",
          description: `${config.title} exported successfully with ${data.length} records.`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: exportResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImport(file);
    }
  };

  const handleImport = async (file) => {
    if (!config.importFn) {
      toast({
        title: "Import Not Available",
        description: `Import functionality for ${config.title} is not yet implemented`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await config.importFn(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log('Import result:', result);
      setImportResult(result);

      // Refresh the data if successful
      if (result.success) {
        queryClient.invalidateQueries([config.queryKey]);
        queryClient.invalidateQueries([`${apiBasePath}/stats`]);

        const successCount = result.results?.successful || 0;
        const failedCount = result.results?.failed || 0;
        const totalCount = result.results?.total || 0;

        toast({
          title: "✅ Import Completed",
          description: `Successfully imported ${successCount} of ${totalCount} records${failedCount > 0 ? `. ${failedCount} failed (see details below)` : ''}`,
          duration: 6000
        });
      } else {
        toast({
          title: "❌ Import Failed",
          description: result.message || "Import failed completely",
          variant: "destructive",
          duration: 8000
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: error.message || 'Import failed',
        results: null
      });
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetImport = () => {
    setImportResult(null);
    setUploadProgress(0);
    setUploading(false);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      // Create template data with sample/empty rows
      let templateData = [];
      
      switch (type) {
        case 'categories':
          templateData = [{
            'S.No': 1,
            'Category Name': 'Sample Category',
            'Description': 'Sample description',
            'Subcategories': 'Sub1, Sub2, Sub3',
            'Total Subcategories': 3,
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': ''
          }];
          ClientExcelExporter.exportCategories(templateData);
          break;
        case 'customer-categories':
          templateData = [{
            'S.No': 1,
            'Category Name': 'Sample Customer Category',
            'Description': 'Sample description',
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': ''
          }];
          ClientExcelExporter.exportCustomerCategories(templateData);
          break;
        case 'customers':
          templateData = [{
            'S.No': 1,
            'Customer Name': 'Sample Customer',
            'Mobile': '1234567890',
            'Email': 'customer@example.com',
            'Address': 'Sample Address',
            'City': 'Sample City',
            'State': 'Sample State',
            'Country': 'Sample Country',
            'GST Number': 'SAMPLE123456789',
            'Category': 'General',
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': ''
          }];
          ClientExcelExporter.exportCustomers(templateData);
          break;
        case 'suppliers':
          templateData = [{
            'S.No': 1,
            'Supplier Name': 'Sample Supplier',
            'Contact Person': 'John Doe',
            'Mobile': '1234567890',
            'Email': 'supplier@example.com',
            'Address': 'Sample Address',
            'City': 'Sample City',
            'State': 'Sample State',
            'Country': 'Sample Country',
            'GST Number': 'SAMPLE123456789',
            'Category': 'General',
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': ''
          }];
          ClientExcelExporter.exportSuppliers(templateData);
          break;
        default:
          templateData = [{
            'S.No': 1,
            'Item Name': 'Everyday PremiumSoft Milk Bread 400g',
            'Description': 'Soft milk bread perfect for daily consumption',
            'Type': 'Product',
            'Category': 'Breads',
            'Sub Category': 'Premium Breads',
            'Customer Category': 'General',
            'Unit': 'pieces',
            'Purchase Price': 100,
            'Sale Price': 150,
            'MRP': 200,
            'Current Stock': 50,
            'Min Stock': 10,
            'Max Stock': 100,
            'GST %': 18,
            'HSN Code': '12345678',
            'Store Location ID': '675bff35e71ef51a68b5d7ab6',
            'Supplier': 'Sample Supplier',
            'Qty/Batch': 'BATCH001',
            'Lead Time': 5,
            'Internal Manufacturing': 'NO',
            'Purchase Allowed': 'YES',
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': '',
            // Add a comment row showing valid options
          }, {
            'S.No': 2,
            'Item Name': '*** VALID TYPE OPTIONS ***',
            'Description': 'Product | Material | Spares | Assemblies',
            'Type': 'Material',
            'Category': 'Raw Materials',
            'Sub Category': 'Metal Parts',
            'Customer Category': 'Industrial',
            'Unit': 'kg',
            'Purchase Price': 50,
            'Sale Price': 75,
            'MRP': 100,
            'Current Stock': 200,
            'Min Stock': 50,
            'Max Stock': 500,
            'GST %': 12,
            'HSN Code': '87654321',
            'Store Location ID': '675bff35e71ef51a68b5d7ab6',
            'Supplier': 'Material Supplier',
            'Qty/Batch': 'BATCH002',
            'Lead Time': 7,
            'Internal Manufacturing': 'YES',
            'Purchase Allowed': 'YES',
            'Active': 'YES',
            'Created Date': '',
            'Updated Date': ''
          }];
          ClientExcelExporter.exportInventoryItems(templateData);
          break;
      }
      
      toast({
        title: "Template Downloaded",
        description: `${config.title} template downloaded successfully`,
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Template Download Failed", 
        description: error.message || "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const oldDownloadTemplate = () => {
    // Create a sample template based on type
    let templateData = [];
    
    if (type === 'items') {
      templateData = [{
        'Item Code': 'SAMPLE-001',
        'Item Name': 'Sample Item',
        'Category': 'Electronics',
        'Subcategory': 'Phones',
        'Customer Category': 'Retail',
        'Unit Price': 100.00,
        'Cost Price': 80.00,
        'Quantity': 50,
        'Min Stock': 10,
        'Max Stock': 100,
        'Location': 'Warehouse A',
        'Description': 'Sample item description'
      }];
    } else if (type === 'categories') {
      templateData = [{
        'Category Name': 'Electronics',
        'Description': 'Electronic items and devices',
        'Subcategories': 'Phones, Laptops, Tablets'
      }];
    } else if (type === 'customers') {
      templateData = [{
        'Customer Name': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '+1234567890',
        'Company': 'ABC Corp',
        'Address': '123 Main St',
        'City': 'New York',
        'State': 'NY',
        'Country': 'USA',
        'Postal Code': '10001',
        'Status': 'active',
        'Customer Type': 'retail'
      }];
    } else if (type === 'suppliers') {
      templateData = [{
        'Supplier Name': 'ABC Supplies',
        'Contact Person': 'Jane Smith',
        'Email': 'jane@abcsupplies.com',
        'Phone': '+1234567890',
        'Company': 'ABC Supplies Inc',
        'Address': '456 Business Ave',
        'City': 'Chicago',
        'State': 'IL',
        'Country': 'USA',
        'Postal Code': '60601',
        'Tax ID': 'TAX123456',
        'Payment Terms': '30 days',
        'Status': 'active'
      }];
    } else {
      templateData = [{
        'Category Name': 'Retail',
        'Description': 'Retail customers'
      }];
    }

    // Convert to CSV for simple download
    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      templateData.map(row => headers.map(header => `"${row[header]}"`).join(',')).join('\n')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Template Downloaded",
      description: `${config.title} template downloaded successfully`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export Button */}
      <Button
        onClick={handleExport}
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100:from-green-900/30:to-emerald-900/30 text-green-700"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Excel
      </Button>

      {/* Template Download Button */}
      {/* <Button
        onClick={downloadTemplate}
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:from-amber-100 hover:to-orange-100:from-amber-900/30:to-orange-900/30 text-amber-700"
      >
        <FileText className="h-4 w-4 mr-2" />
        Template
      </Button> */}

      {/* Import Button - Only show if import is available */}
      {config.importFn && (
        <Dialog open={importOpen} onOpenChange={(open) => {
          setImportOpen(open);
          // Clear import state when modal is closed
          if (!open) {
            resetImport();
          }
        }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100:from-blue-900/30:to-indigo-900/30 text-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-w-[90vw] max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Import {config.title} from Excel
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              {!importResult && !uploading && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Upload an Excel file (.xlsx or .xls) containing {config.title.toLowerCase()} data. 
                      📝 <strong>Important:</strong> Type field must be one of: Product, Material, Spares, Assemblies (case sensitive). 
                      Store Location ID must be a valid company ID. Download the template to see the required format.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-center">
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      size="sm"
                      className="bg-amber-50 border-amber-200 text-amber-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-12 border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100:bg-blue-900/30 text-blue-700"
                      variant="outline"
                    >
                      <FileSpreadsheet className="h-5 w-5 mr-2" />
                      Choose Excel File
                    </Button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Uploading and processing file...
                    </p>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <Alert className={importResult.success ? "border-green-200" : "border-red-200"}>
                    {importResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      {importResult.message}
                    </AlertDescription>
                  </Alert>

                  {importResult.results && (
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <div className="text-sm font-medium">Import Summary:</div>
                      <div className="text-sm space-y-1">
                        <div>Total records: {importResult.results.total}</div>
                        <div className="text-green-600">Successful: {importResult.results.successful}</div>
                        {importResult.results.failed > 0 && (
                          <div className="text-red-600">Failed: {importResult.results.failed}</div>
                        )}
                      </div>
                      
                      {importResult.results.errors && importResult.results.errors.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                            <span>Issues Found ({importResult.results.errors.length}):</span>
                            <span className="text-xs text-gray-500">All errors are shown below</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto text-sm space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                            {importResult.results.errors.map((error, index) => {
                              // Clean up error message for better readability
                              const cleanError = error.replace(/^Row \d+:\s*/, '').replace(/Row \d+:\s*/, '');
                              const rowMatch = error.match(/Row (\d+):/);
                              const rowNumber = rowMatch ? rowMatch[1] : index + 2;
                              
                              return (
                                <div key={index} className="flex gap-3 p-2 bg-white rounded border border-red-100">
                                  <span className="text-red-800 font-mono text-sm bg-red-200 px-2 py-1 rounded flex-shrink-0">
                                    Row {rowNumber}
                                  </span>
                                  <span className="text-red-700 flex-1 break-words">{cleanError}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-2">💡 Import Guidelines:</div>
                            <div className="text-sm text-blue-700 space-y-1">
                              <div>• Each item name must be unique within your company</div>
                              <div>• Item Code is auto-generated if left blank</div>
                              <div>• Store Location accepts both company ID or company name</div>
                              <div>• Use the template download for proper format</div>
                              <div>• Check for typos in required fields</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button onClick={resetImport} variant="outline" size="sm">
                      Import Another File
                    </Button>
                    <Button onClick={() => setImportOpen(false)} size="sm">
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}