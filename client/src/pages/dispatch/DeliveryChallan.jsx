import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  FileText,
  RefreshCw,
  Download,
  Calendar,
  Building,
  Hash,
  Truck,
  Receipt
} from 'lucide-react';
import { config } from '@/config/environment';

export default function DeliveryChallan() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({});
  const [customers, setCustomers] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState('');
  const [isSalesmanDropdownOpen, setIsSalesmanDropdownOpen] = useState(false);

  // Sample data for dropdowns - will be replaced by API data
  const [sampleCustomers] = useState([
    'ABC Retail Store',
    'XYZ Supermarket', 
    'Quick Mart',
    'Daily Needs Store'
  ]);

  const [sampleSalesmen] = useState([
    'Rajesh Kumar',
    'Priya Sharma',
    'Amit Singh', 
    'Neha Gupta'
  ]);

  const [formData, setFormData] = useState({
    manualEntryNo: '',
    customerName: '',
    salesmanName: '',
    dcNo: '',
    to: '',
    by: ''
  });
  const [nextDCNumber, setNextDCNumber] = useState('');
  const [loadingDCNumber, setLoadingDCNumber] = useState(false);

  useEffect(() => {
    fetchDeliveryChallanData();
    fetchSalespeople();
    fetchCustomers();
    fetchNextDCNumber();
  }, []);

  // Fetch customers when salesperson changes
  useEffect(() => {
    if (formData.salesmanName) {
      fetchCustomersBySalesperson(formData.salesmanName);
    } else {
      setFilteredCustomers(customers);
    }
    // Reset customer search when salesperson changes
    setCustomerSearchTerm('');
    setFormData(prev => ({ ...prev, customerName: '' }));
  }, [formData.salesmanName, customers]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setIsCustomerDropdownOpen(false);
        setIsSalesmanDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchDeliveryChallanData = async () => {
    try {
      setLoading(true);
      console.log('🚚 Fetching delivery challan data...');
      
      const response = await fetch(`${config.baseURL}/api/dispatches/delivery-challan`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Delivery challan response:', result);
      
      if (result.success) {
        setDeliveryData(result.data.products);
        setSummary(result.data.summary);
        setMeta(result.data.meta);
      }
    } catch (error) {
      console.error('❌ Error fetching delivery challan data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery challan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalespeople = async () => {
    try {
      console.log('👥 Fetching salespeople...');
      
      const response = await fetch(`${config.baseURL}/api/customers/salespeople`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Salespeople response:', result);
      
      if (result.success) {
        setSalespeople(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching salespeople:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salespeople list",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('👥 Fetching customers...');
      
      const response = await fetch(`${config.baseURL}/api/customers/dropdown/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Customers response:', result);
      
      if (result.success) {
        setCustomers(result.data);
        setFilteredCustomers(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers list",
        variant: "destructive",
      });
    }
  };

  const fetchCustomersBySalesperson = async (salespersonId) => {
    try {
      console.log(`🎯 Fetching customers for salesperson: ${salespersonId}`);
      
      const response = await fetch(`${config.baseURL}/api/customers/salesperson/${salespersonId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('👥 Salesperson customers response:', result);
      
      if (result.success) {
        setFilteredCustomers(result.data);
        // Reset customer selection and search when salesperson changes
        setCustomerSearchTerm('');
        setFormData(prev => ({ ...prev, customerName: '' }));
        setIsCustomerDropdownOpen(false);
      }
    } catch (error) {
      console.error('❌ Error fetching customers by salesperson:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers for selected salesperson",
        variant: "destructive",
      });
    }
  };

  const fetchNextDCNumber = async () => {
    try {
      setLoadingDCNumber(true);
      const response = await fetch(`${config.baseURL}/api/dispatches/next-dc-number`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch next DC number');
      }

      const result = await response.json();
      
      if (result.success) {
        setNextDCNumber(result.dcNo);
        setFormData(prev => ({ ...prev, manualEntryNo: result.dcNo }));
      }
    } catch (error) {
      console.error('Error fetching next DC number:', error);
      toast({
        title: "Error",
        description: "Failed to fetch next DC number",
        variant: "destructive",
      });
    } finally {
      setLoadingDCNumber(false);
    }
  };

  // Handle Qty Issued change
  const handleQtyIssuedChange = (dcNo, value) => {
    setDeliveryData(prev => prev.map(item => 
      item.dcno === dcNo ? { ...item, qtyIssued: value } : item
    ));
  };

  // Update Qty Issued API call
  const updateQtyIssued = async (dcNo, qtyIssued) => {
    try {
      if (!qtyIssued || qtyIssued <= 0) {
        return;
      }

      const response = await fetch(`${config.baseURL}/api/dispatches/update-qty-issued`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dcNo, qtyIssued: Number(qtyIssued) })
      });

      if (!response.ok) {
        throw new Error('Failed to update qty issued');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Updated",
          description: "Qty issued updated successfully",
        });
        
        // Auto-refresh the entire list to show updated data
        await fetchDeliveryChallanData();
      }
    } catch (error) {
      console.error('Error updating qty issued:', error);
      toast({
        title: "Error",
        description: "Failed to update qty issued",
        variant: "destructive",
      });
    }
  };

  // Handle Approve
  const handleApprove = async (dcNo) => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/approve-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dcNo })
      });

      if (!response.ok) {
        throw new Error('Failed to approve product');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Approved",
          description: "Product approved successfully",
        });
        
        // Auto-refresh the entire list to show updated data
        await fetchDeliveryChallanData();
      }
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Error",
        description: "Failed to approve product",
        variant: "destructive",
      });
    }
  };

  // Handle Generate Invoice
  const handleGenerateInvoice = async (dcNo) => {
    try {
      const response = await fetch(`${config.baseURL}/api/dispatches/generate-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dcNo })
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${dcNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice Generated",
        description: "Invoice PDF downloaded successfully",
      });

      // Auto-refresh the entire list to show updated data
      await fetchDeliveryChallanData();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  // Handle Dispatch Order
  const handleDispatchOrder = async () => {
    try {
      // Validate form data
      if (!formData.salesmanName) {
        toast({
          title: "Validation Error",
          description: "Please select a salesman",
          variant: "destructive",
        });
        return;
      }

      if (!formData.customerName) {
        toast({
          title: "Validation Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const response = await fetch(`${config.baseURL}/api/dispatches/create-dispatch-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dcNo: nextDCNumber,
          salesmanId: formData.salesmanName,
          customerId: formData.customerName,
          by: formData.by,
          to: formData.to
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create dispatch order');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Dispatch Created",
          description: "Dispatch order created successfully",
        });
        
        // Reset form and fetch new data
        setFormData({
          manualEntryNo: '',
          customerName: '',
          salesmanName: '',
          dcNo: '',
          to: '',
          by: ''
        });
        setCustomerSearchTerm('');
        setSalesmanSearchTerm('');
        await fetchNextDCNumber();
        await fetchDeliveryChallanData();
      }
    } catch (error) {
      console.error('Error creating dispatch order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create dispatch order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-8xl mx-auto space-y-6">
      {/* Header with Statistics */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Challan</h1>
          <p className="text-gray-600 mt-1">Product Groups and Indent Quantities for Today</p>
        </div>
        <Button onClick={fetchDeliveryChallanData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Main Table Structure */}
      <div className="border border-gray-800">
        
        {/* First Row - Manual Entry Section */}
        <div className="grid grid-cols-5 border-b border-gray-800">
          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              DC Number
            </div>
            <div className="relative">
              <Input
                className="text-center bg-blue-50 font-semibold cursor-not-allowed"
                value={loadingDCNumber ? 'Loading...' : nextDCNumber}
                readOnly
                disabled
                title="Auto-generated DC Number (Cannot be edited)"
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                Auto-generated DCno will be used
              </div>
            </div>
          </div>
          
       <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Salesman Name by Dropdown
            </div>
            <div className="relative">
              <Input
                placeholder="Search and select salesman"
                value={salesmanSearchTerm}
                onChange={(e) => {
                  setSalesmanSearchTerm(e.target.value);
                  setIsSalesmanDropdownOpen(true);
                }}
                onFocus={() => setIsSalesmanDropdownOpen(true)}
                className="cursor-pointer"
              />
              {isSalesmanDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {salespeople
                    .filter(salesman => 
                      (salesman.fullName && salesman.fullName.toLowerCase().includes(salesmanSearchTerm.toLowerCase())) ||
                      (salesman.username && salesman.username.toLowerCase().includes(salesmanSearchTerm.toLowerCase()))
                    )
                    .map((salesman) => (
                      <div
                        key={salesman._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, salesmanName: salesman._id }));
                          setSalesmanSearchTerm(salesman.fullName || salesman.username);
                          setIsSalesmanDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{salesman.fullName || salesman.username}</div>
                        {salesman.email && (
                          <div className="text-xs text-gray-500">Email: {salesman.email}</div>
                        )}
                      </div>
                    ))}
                  {salespeople.filter(salesman => 
                    (salesman.fullName && salesman.fullName.toLowerCase().includes(salesmanSearchTerm.toLowerCase())) ||
                    (salesman.username && salesman.username.toLowerCase().includes(salesmanSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-2 text-gray-500 text-center">
                      No salespeople found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Customer Name by dropdown search
            </div>
            <div className="relative">
              <Input
                placeholder="Search and select customer"
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                className="cursor-pointer"
              />
              {isCustomerDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCustomers
                    .filter(customer => 
                      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      (customer.customerCode && customer.customerCode.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                    )
                    .map((customer) => (
                      <div
                        key={customer._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, customerName: customer._id }));
                          setCustomerSearchTerm(`${customer.name} ${customer.customerCode ? `(${customer.customerCode})` : ''}`);
                          setIsCustomerDropdownOpen(false);
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        {customer.customerCode && (
                          <div className="text-xs text-gray-500">Code: {customer.customerCode}</div>
                        )}
                      </div>
                    ))}
                  {filteredCustomers.filter(customer => 
                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    (customer.customerCode && customer.customerCode.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-2 text-gray-500 text-center">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

   

          <div className="border-r border-gray-800 p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              Dispatch Action
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              onClick={handleDispatchOrder}
              disabled={loading || !formData.salesmanName || !formData.customerName}
            >
              <Truck className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Dispatch'}
            </Button>
          </div>

          <div className="p-3 bg-gray-50">
            <div className="text-center font-medium text-sm mb-2">
              give button Option
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-sm">
              <Receipt className="h-4 w-4 mr-2" />
              Invoice
            </Button>
          </div>
        </div>
        {/* Product Table */}
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-5 bg-yellow-300 border-b border-gray-800">
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              DC No
            </div>
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Product Name / Product Group
            </div>
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Indent Qty
            </div>
            <div className="border-r border-gray-800 p-3 text-center font-medium">
              Qty issued
            </div>
            <div className="p-3 text-center font-medium">
              Action
            </div>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <div>Loading delivery data...</div>
            </div>
          ) : deliveryData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <div>No delivery items found for today</div>
            </div>
          ) : (
            deliveryData.map((item) => (
              <div key={item.id} className="grid grid-cols-5 border-b border-gray-800 hover:bg-gray-50">
                <div className="border-r border-gray-800 p-3 text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono">
                    {item.dcno || 'N/A'}
                  </Badge>
                </div>
                <div className="border-r border-gray-800 p-3">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-blue-600 mt-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {item.productGroup}
                    </Badge>
                  </div>
                </div>
                <div className="border-r border-gray-800 p-3 text-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {item.indentQty}
                  </Badge>
                </div>
                <div className="border-r border-gray-800 p-3">
                  <Input
                    type="number"
                    placeholder="Enter qty"
                    className="text-center"
                    min="0"
                    max={item.indentQty}
                    value={item.qtyIssued || ''}
                    onChange={(e) => handleQtyIssuedChange(item.dcno, e.target.value)}
                    onBlur={(e) => updateQtyIssued(item.dcno, e.target.value)}
                  />
                </div>
                <div className="p-3">
                  <div className="flex flex-col space-y-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                      onClick={() => handleApprove(item.dcno)}
                      disabled={!item.qtyIssued || item.status === 'approved'}
                    >
                      {item.status === 'approved' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs px-2 py-1"
                      onClick={() => handleGenerateInvoice(item.dcno)}
                      disabled={item.status !== 'approved'}
                    >
                      Invoice
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}