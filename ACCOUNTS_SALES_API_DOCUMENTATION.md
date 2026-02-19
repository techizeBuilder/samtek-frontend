# Accounts Sales Module - API Documentation

## Overview
A new dynamic API module for managing and tracking all company sales invoices. This module is company-filtered, showing only orders for the logged-in user's company, from all sales persons.

## Files Created

### Backend Files

#### 1. **Controller**: `server/controllers/accountsController.js`
- `getCompanySalesInvoices()` - Get all sales invoices for the company with pagination
- `getInvoiceDetail()` - Get detailed invoice information
- `updateInvoice()` - Update invoice payment status or details
- `getSalesAnalytics()` - Get sales analytics by period

**Features:**
- ✅ Company filtering (only shows data for user's company)
- ✅ Search by invoice number, customer name, or sales person
- ✅ Filter by payment status (Paid, Pending, Overdue)
- ✅ Pagination support
- ✅ Sales summary statistics
- ✅ Top sales persons breakdown

#### 2. **Routes**: `server/routes/accountsRoutes.js`
```javascript
GET  /api/accounts/sales/invoices        - List all invoices
GET  /api/accounts/sales/invoices/:id    - Get invoice details
PUT  /api/accounts/sales/invoices/:id    - Update invoice
GET  /api/accounts/sales/analytics       - Get sales analytics
```

**Authorization:** Unit Manager, Unit Head, Super Admin, Admin

#### 3. **Server Registration**: `server/index.ts`
Added route registration:
```typescript
const accountsRouter = (await import('./routes/accountsRoutes.js')).default;
app.use('/api/accounts', accountsRouter);
```

### Frontend Files

#### 1. **Component**: `client/src/pages/accounts/Sales.jsx`
Updated to use the new API instead of dummy data

**Features:**
- ✅ Real-time data from API
- ✅ Search and filter functionality
- ✅ Pagination
- ✅ Sales summary statistics
- ✅ Loading and error states
- ✅ Responsive design
- ✅ Refresh button
- ✅ Company-filtered data

## API Endpoints

### 1. Get Sales Invoices
```
GET /api/accounts/sales/invoices
```

**Query Parameters:**
- `page` (default: 1) - Page number for pagination
- `limit` (default: 20) - Items per page
- `status` (default: 'All') - Filter by payment status (All, Paid, Pending, Overdue)
- `search` - Search by invoice number, customer name, or sales person username

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "_id": "...",
        "invoiceNo": "INV-2025-001",
        "customerName": "Tech Solutions Inc",
        "customerId": "...",
        "customerEmail": "...",
        "customerPhone": "...",
        "date": "2026-02-16T...",
        "amount": 350000,
        "discount": 10000,
        "finalAmount": 340000,
        "status": "Paid",
        "paymentMethod": "Bank Transfer",
        "items": 5,
        "salesPerson": "username",
        "salesPersonId": "...",
        "orderCode": "ORD-0001",
        "itemsCount": 5,
        "notes": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3,
      "hasMore": true
    },
    "summary": {
      "totalInvoices": 50,
      "totalAmount": 17500000,
      "totalDiscount": 500000,
      "totalFinalAmount": 17000000,
      "paidCount": 30,
      "pendingCount": 15,
      "overdueCount": 5,
      "byStatus": {
        "paid": 30,
        "pending": 15,
        "overdue": 5
      }
    }
  }
}
```

### 2. Get Invoice Details
```
GET /api/accounts/sales/invoices/:invoiceId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceNo": "INV-2025-001",
    "customer": {...},
    "salesPerson": {...},
    "date": "2026-02-16T...",
    "amount": 350000,
    "discount": 10000,
    "finalAmount": 340000,
    "status": "Paid",
    "paymentMethod": "Bank Transfer",
    "products": [...],
    "notes": "..."
  }
}
```

### 3. Update Invoice
```
PUT /api/accounts/sales/invoices/:invoiceId
```

**Body:**
```json
{
  "status": "Paid",
  "paymentMethod": "Bank Transfer",
  "paymentDate": "2026-02-16",
  "notes": "Invoice note"
}
```

### 4. Get Sales Analytics
```
GET /api/accounts/sales/analytics?period=month
```

**Query Parameters:**
- `period` - 'week', 'month', or 'year'

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "totalOrders": 50,
    "totalSales": 17500000,
    "totalDiscount": 500000,
    "averageOrderValue": 350000,
    "byStatus": {
      "paid": 10000000,
      "pending": 5000000,
      "overdue": 2500000
    },
    "topSalesPeople": [
      {
        "name": "salesperson_name",
        "ordersCount": 10,
        "totalSales": 3500000,
        "totalDiscount": 100000
      }
    ]
  }
}
```

## Company Filtering

**All endpoints automatically filter data by the logged-in user's company:**

```javascript
{
  $or: [
    { companyId: req.user.companyId },
    { company: req.user.companyId }
  ]
}
```

This ensures:
- ✅ Each user only sees their company's sales
- ✅ Invoices from all sales persons in the company are visible
- ✅ Data isolation between companies
- ✅ No cross-company data leakage

## Frontend Integration

The Sales component uses React Query with the new API:

```javascript
const { data: salesResponse, isLoading, error, refetch } = useQuery({
  queryKey: ['/api/accounts/sales/invoices', currentPage, filterStatus, searchTerm],
  queryFn: () => apiRequest('GET', `/api/accounts/sales/invoices?page=${currentPage}&limit=20&status=${filterStatus}&search=${searchTerm}`)
});
```

**Features:**
- Automatic caching
- Pagination support
- Real-time search filtering
- Loading states
- Error handling
- Refresh capability

## Testing

**Test Script:** `test-accounts-sales-api.cjs`

```bash
cd d:\inventory\TechiziBuilder\03-12-2025\(sunrize\)\Sunrise-Full-Application
node test-accounts-sales-api.cjs
```

Expected output:
- Login success
- API response with invoices
- Sales summary statistics
- Sample invoice data

## Usage Example

### Direct API Call
```javascript
const response = await fetch('/api/accounts/sales/invoices?page=1&limit=20&status=All', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.invoices); // Display invoices
```

### React Component (Updated)
```jsx
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const Sales = () => {
  const { data: salesResponse, isLoading } = useQuery({
    queryKey: ['/api/accounts/sales/invoices'],
    queryFn: () => apiRequest('GET', '/api/accounts/sales/invoices?page=1&limit=20')
  });

  return (
    <div>
      {isLoading ? 'Loading...' : (
        <table>
          {salesResponse?.data?.invoices?.map(invoice => (
            <tr key={invoice._id}>
              <td>{invoice.invoiceNo}</td>
              <td>{invoice.customerName}</td>
              <td>₹{invoice.amount}</td>
              <td>{invoice.status}</td>
            </tr>
          ))}
        </table>
      )}
    </div>
  );
};
```

## Module Structure

```
/api/accounts/
├── sales/
│   ├── invoices          [GET]  - List all invoices
│   ├── invoices/:id      [GET]  - Get details
│   ├── invoices/:id      [PUT]  - Update invoice
│   └── analytics         [GET]  - Get analytics
```

## Error Handling

**Missing Company:**
```json
{
  "success": false,
  "message": "Company ID not found. User not assigned to a company."
}
```

**Access Denied:**
```json
{
  "success": false,
  "message": "Access denied"
}
```

**Invoice Not Found:**
```json
{
  "success": false,
  "message": "Invoice not found"
}
```

## Future Enhancements

1. **Invoice Export** - Export to PDF/Excel
2. **Bulk Operations** - Update multiple invoices at once
3. **Email Notifications** - Send invoice alerts
4. **Payment Tracking** - Track payment details and dates
5. **Revenue Forecasting** - Predict future revenue
6. **Customer Aging** - Track overdue payments by customer
7. **Commission Calculation** - Auto-calculate sales person commissions
8. **Invoice Templates** - Customizable invoice templates

## Performance Optimization

- Pagination: Max 20 invoices per page (configurable)
- Search: Indexed fields (invoiceNo, customerName, salesPerson)
- Aggregation: Pre-calculated summary statistics
- Lean queries: Excluded unnecessary fields

## Security

✅ Company isolation - Only view own company data
✅ Role-based access - Unit Manager, Head, Admin only
✅ Token authentication - All endpoints require auth
✅ Data validation - Input validation on updates
✅ Audit logging - All updates logged in console

---

**Created:** February 2026
**Version:** 1.0
**Status:** Production Ready
