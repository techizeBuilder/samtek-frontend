import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';

/**
 * Get all sales invoices for the company
 * Shows all orders from all sales persons in the company
 */
export const getCompanySalesInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'All', search = '', sortBy = 'date', sortOrder = 'desc' } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📊 getCompanySalesInvoices called:', {
      companyId: userCompanyId,
      page,
      limit,
      status,
      search
    });

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found. User not assigned to a company.'
      });
    }

    // Build query to get ALL orders for this company (all sales persons)
    let orderQuery = {
      $or: [
        { companyId: userCompanyId },
        { company: userCompanyId }
      ]
    };

    // Get all orders for the company
    const allOrders = await Order.find(orderQuery)
      .populate('customer', 'name email phone category')
      .populate('salesPerson', 'fullName username email')
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 });

    console.log(`Found ${allOrders.length} orders for company`);

    // Format orders as invoices with calculated data
    let invoices = allOrders.map((order, index) => {
      const invoice = {
        _id: order._id,
        invoiceNo: order.orderCode || `INV-${order._id.toString().slice(-6).toUpperCase()}`,
        customerName: order.customer?.name || 'Unknown Customer',
        customerId: order.customer?._id,
        customerEmail: order.customer?.email,
        customerPhone: order.customer?.phone,
        date: order.createdAt,
        amount: order.totalAmount || 0,
        discount: order.discountAmount || 0,
        gst: order.gst || 0,
        finalAmount: (order.totalAmount || 0) - (order.discountAmount || 0) + (order.gst || 0),
        status: order.paymentStatus || 'Pending',
        paymentMethod: order.paymentMethod || 'Not Specified',
        items: order.products?.length || 0,
        salesPerson: order.salesPerson?.fullName || order.salesPerson?.username || 'Unknown',
        salesPersonId: order.salesPerson?._id,
        orderCode: order.orderCode,
        itemsCount: order.itemsCount || 0,
        notes: order.notes || ''
      };
      return invoice;
    });

    // Apply search filter
    if (search && search.trim()) {
      invoices = invoices.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.salesPerson.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status && status !== 'All') {
      invoices = invoices.filter(inv => inv.status === status);
    }

    // Calculate pagination
    const totalInvoices = invoices.length;
    const totalPages = Math.ceil(totalInvoices / parseInt(limit));
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = invoices.slice(startIndex, endIndex);

    // Calculate summary statistics
    const summary = {
      totalInvoices: totalInvoices,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
      totalDiscount: invoices.reduce((sum, inv) => sum + inv.discount, 0),
      totalFinalAmount: invoices.reduce((sum, inv) => sum + inv.finalAmount, 0),
      paidCount: invoices.filter(inv => inv.status === 'Paid').length,
      pendingCount: invoices.filter(inv => inv.status === 'Pending').length,
      overdueCount: invoices.filter(inv => inv.status === 'Overdue').length,
      byStatus: {
        paid: invoices.filter(inv => inv.status === 'Paid').length,
        pending: invoices.filter(inv => inv.status === 'Pending').length,
        overdue: invoices.filter(inv => inv.status === 'Overdue').length
      }
    };

    console.log(`📋 Returning ${paginatedInvoices.length} invoices (page ${page})`);

    res.json({
      success: true,
      data: {
        invoices: paginatedInvoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInvoices,
          pages: totalPages,
          hasMore: endIndex < totalInvoices
        },
        summary,
        filters: {
          status,
          search
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getCompanySalesInvoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company sales invoices',
      error: error.message
    });
  }
};

/**
 * Get detailed invoice information
 */
export const getInvoiceDetail = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userCompanyId = req.user.companyId;

    console.log('📄 getInvoiceDetail called:', { invoiceId, companyId: userCompanyId });

    const order = await Order.findById(invoiceId)
      .populate('customer')
      .populate('salesPerson', 'fullName username email phone')
      .populate('products.product', 'name code price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify company access
    if (order.companyId?.toString() !== userCompanyId?.toString() && 
        order.company?.toString() !== userCompanyId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const invoice = {
      _id: order._id,
      invoiceNo: order.orderCode,
      customer: order.customer,
      salesPerson: {
        _id: order.salesPerson?._id,
        name: order.salesPerson?.fullName || order.salesPerson?.username || 'Unknown',
        username: order.salesPerson?.username,
        email: order.salesPerson?.email,
        phone: order.salesPerson?.phone
      },
      date: order.createdAt,
      amount: order.totalAmount,
      discount: order.discountAmount,
      gst: order.gst || 0,
      finalAmount: (order.totalAmount || 0) - (order.discountAmount || 0) + (order.gst || 0),
      status: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      products: order.products,
      notes: order.notes
    };

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('❌ Error in getInvoiceDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice details',
      error: error.message
    });
  }
};

/**
 * Update invoice payment status or details
 */
export const updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status, paymentMethod, paymentDate, notes, amount, discount, gst } = req.body;
    const userCompanyId = req.user.companyId;

    console.log('✏️ updateInvoice called:', { invoiceId, amount, discount, gst, status, paymentMethod });

    const order = await Order.findById(invoiceId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify company access
    if (order.companyId?.toString() !== userCompanyId?.toString() && 
        order.company?.toString() !== userCompanyId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update amount, discount, and gst if provided
    if (amount !== undefined && amount > 0) {
      order.totalAmount = amount;
    }
    if (discount !== undefined && discount >= 0) {
      order.discountAmount = discount;
    }
    if (gst !== undefined && gst >= 0) {
      order.gst = gst;
    }

    // Update other fields if provided
    if (status) order.paymentStatus = status;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentDate) order.paymentDate = paymentDate;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    console.log('✅ Invoice updated successfully');

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Error in updateInvoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

/**
 * Get sales summary by various metrics
 */
export const getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📈 getSalesAnalytics called:', { companyId: userCompanyId, period });

    let dateFilter = {};
    const now = new Date();

    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: weekAgo, $lte: now } };
    } else if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: monthStart, $lte: now } };
    } else if (period === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateFilter = { createdAt: { $gte: yearStart, $lte: now } };
    }

    const orders = await Order.find({
      $or: [
        { companyId: userCompanyId },
        { company: userCompanyId }
      ],
      ...dateFilter
    }).populate('salesPerson', 'username');

    // Group by sales person
    const bySalesPerson = {};
    orders.forEach(order => {
      const salesPersonName = order.salesPerson?.username || 'Unknown';
      if (!bySalesPerson[salesPersonName]) {
        bySalesPerson[salesPersonName] = {
          name: salesPersonName,
          ordersCount: 0,
          totalSales: 0,
          totalDiscount: 0
        };
      }
      bySalesPerson[salesPersonName].ordersCount += 1;
      bySalesPerson[salesPersonName].totalSales += order.totalAmount || 0;
      bySalesPerson[salesPersonName].totalDiscount += order.discountAmount || 0;
    });

    // Group by payment status
    const byStatus = {
      paid: orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      pending: orders.filter(o => o.paymentStatus === 'Pending').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      overdue: orders.filter(o => o.paymentStatus === 'Overdue').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    };

    const analytics = {
      period,
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      totalDiscount: orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / orders.length : 0,
      byStatus,
      topSalesPeople: Object.values(bySalesPerson)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10)
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error in getSalesAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics',
      error: error.message
    });
  }
};

/**
 * Get all sales persons for the company
 */
export const getAllSalesPersons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('👥 getAllSalesPersons called:', {
      companyId: userCompanyId,
      page,
      limit,
      search,
      sortBy,
      sortOrder
    });

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found. User not assigned to a company.'
      });
    }

    // Build search query
    let searchQuery = {};
    if (search && search.trim()) {
      searchQuery = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get all sales persons for this company
    // Build query with proper MongoDB structure
    let query = {
      companyId: userCompanyId,
      role: 'Sales'  // Only fetch actual Sales role for simplicity (matches getUnitHeadSalesPersons)
    };

    // Add search conditions if provided
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { username: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex }
      ];
    }

    console.log('🔍 Query:', JSON.stringify(query, null, 2));

    const totalSalesPersons = await User.countDocuments(query);

    console.log('📊 Found total sales persons:', totalSalesPersons);

    // Build sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const salesPersons = await User.find(query)
      .select('_id username email fullName companyId totalOrders totalRevenue averageOrderValue successRate lastOrderDate isActive createdAt')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log('👥 Fetched sales persons count:', salesPersons.length, 'on page', page);

    // Get statistics for each sales person
    const salesPersonsWithStats = await Promise.all(
      salesPersons.map(async (salesPerson) => {
        const orders = await Order.find({
          salesPerson: salesPerson._id,
          $or: [
            { companyId: userCompanyId },
            { company: userCompanyId }
          ]
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        // Calculate success rate (approved/completed orders)
        const successfulOrders = orders.filter(order => 
          ['approved', 'completed', 'in_production', 'shipped', 'delivered'].includes(order.status?.toLowerCase())
        ).length;
        const successRate = totalOrders > 0 ? Math.round((successfulOrders / totalOrders) * 100) : 0;

        // Get latest order date
        const latestOrder = orders.length > 0 
          ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
          : null;

        return {
          _id: salesPerson._id,
          username: salesPerson.username,
          fullName: salesPerson.fullName || salesPerson.username,
          email: salesPerson.email,
          totalOrders,
          totalRevenue,
          averageOrderValue,
          successRate,
          lastOrderDate: latestOrder?.createdAt || null,
          isActive: salesPerson.isActive,
          createdAt: salesPerson.createdAt
        };
      })
    );

    // Calculate summary
    const summary = {
      totalSalesPersons,
      activeSalesPersons: salesPersonsWithStats.filter(sp => sp.isActive).length,
      inactiveSalesPersons: salesPersonsWithStats.filter(sp => !sp.isActive).length,
      totalOrders: salesPersonsWithStats.reduce((sum, sp) => sum + sp.totalOrders, 0),
      totalRevenue: salesPersonsWithStats.reduce((sum, sp) => sum + sp.totalRevenue, 0),
      averageOrderValue: salesPersonsWithStats.length > 0
        ? salesPersonsWithStats.reduce((sum, sp) => sum + sp.averageOrderValue, 0) / salesPersonsWithStats.length
        : 0
    };

    const totalPages = Math.ceil(totalSalesPersons / parseInt(limit));

    res.json({
      success: true,
      data: {
        salesPersons: salesPersonsWithStats,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: totalSalesPersons,
          pages: totalPages,
          hasMore: parseInt(page) < totalPages
        },
        summary
      }
    });

  } catch (error) {
    console.error('❌ Error in getAllSalesPersons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales persons',
      error: error.message
    });
  }
};

/**
 * Get specific sales person details
 */
export const getSalesPersonById = async (req, res) => {
  try {
    const { salesPersonId } = req.params;
    const userCompanyId = req.user.companyId;

    console.log('👤 getSalesPersonById called:', { salesPersonId, companyId: userCompanyId });

    const salesPerson = await User.findById(salesPersonId)
      .select('_id username email fullName phone companyId role totalOrders totalRevenue averageOrderValue successRate lastOrderDate isActive createdAt')
      .lean();

    if (!salesPerson) {
      return res.status(404).json({
        success: false,
        message: 'Sales person not found'
      });
    }

    // Verify company access
    if (salesPerson.companyId?.toString() !== userCompanyId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all orders for this sales person
    const orders = await Order.find({
      salesPerson: salesPersonId,
      $or: [
        { companyId: userCompanyId },
        { company: userCompanyId }
      ]
    })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const successfulOrders = orders.filter(order => 
      ['approved', 'completed', 'in_production', 'shipped', 'delivered'].includes(order.status?.toLowerCase())
    ).length;
    const successRate = totalOrders > 0 ? Math.round((successfulOrders / totalOrders) * 100) : 0;

    // Group orders by status
    const ordersByStatus = {
      pending: orders.filter(o => o.status?.toLowerCase() === 'pending').length,
      approved: orders.filter(o => o.status?.toLowerCase() === 'approved').length,
      inProduction: orders.filter(o => o.status?.toLowerCase() === 'in_production').length,
      shipped: orders.filter(o => o.status?.toLowerCase() === 'shipped').length,
      delivered: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
      cancelled: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length
    };

    const response = {
      ...salesPerson,
      totalOrders,
      totalRevenue,
      averageOrderValue,
      successRate,
      ordersByStatus,
      recentOrders: orders.slice(0, 10)
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Error in getSalesPersonById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales person details',
      error: error.message
    });
  }
};

/**
 * Get all orders for a specific sales person
 */
export const getSalesPersonOrders = async (req, res) => {
  try {
    const { salesPersonId } = req.params;
    const { page = 1, limit = 10, status = 'All', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📦 getSalesPersonOrders called:', {
      salesPersonId,
      companyId: userCompanyId,
      page,
      limit,
      status,
      search,
      sortBy,
      sortOrder
    });

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }

    // Verify sales person exists and belongs to company
    const salesPerson = await User.findById(salesPersonId);
    if (!salesPerson) {
      return res.status(404).json({
        success: false,
        message: 'Sales person not found'
      });
    }

    if (salesPerson.companyId?.toString() !== userCompanyId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    let orderQuery = {
      salesPerson: salesPersonId,
      $or: [
        { companyId: userCompanyId },
        { company: userCompanyId }
      ]
    };

    // Add status filter
    if (status && status !== 'All') {
      orderQuery.status = status;
    }

    // Add search filter
    if (search && search.trim()) {
      orderQuery.$or = [
        ...(orderQuery.$or || []),
        { orderCode: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }

    const totalOrders = await Order.countDocuments(orderQuery);

    // Build sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(orderQuery)
      .populate('customer', 'name email phone')
      .populate('salesPerson', 'username email')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderCode: order.orderCode,
      customerName: order.customer?.name || 'Unknown',
      customerId: order.customer?._id,
      date: order.createdAt,
      amount: order.totalAmount || 0,
      discount: order.discountAmount || 0,
      gst: order.gst || 0,
      finalAmount: (order.totalAmount || 0) - (order.discountAmount || 0) + (order.gst || 0),
      status: order.status || 'Pending',
      paymentStatus: order.paymentStatus || 'Pending',
      itemsCount: order.itemsCount || order.products?.length || 0,
      notes: order.notes || ''
    }));

    // Calculate statistics
    const statistics = {
      totalOrders,
      totalAmount: formattedOrders.reduce((sum, order) => sum + order.amount, 0),
      totalDiscount: formattedOrders.reduce((sum, order) => sum + order.discount, 0),
      totalGst: formattedOrders.reduce((sum, order) => sum + order.gst, 0),
      totalFinal: formattedOrders.reduce((sum, order) => sum + order.finalAmount, 0),
      averageOrderValue: totalOrders > 0 
        ? formattedOrders.reduce((sum, order) => sum + order.amount, 0) / totalOrders 
        : 0,
      byStatus: {
        pending: formattedOrders.filter(o => o.status?.toLowerCase() === 'pending').length,
        approved: formattedOrders.filter(o => o.status?.toLowerCase() === 'approved').length,
        inProduction: formattedOrders.filter(o => o.status?.toLowerCase() === 'in_production').length,
        shipped: formattedOrders.filter(o => o.status?.toLowerCase() === 'shipped').length,
        delivered: formattedOrders.filter(o => o.status?.toLowerCase() === 'delivered').length,
        cancelled: formattedOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length
      }
    };

    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      data: {
        salesPerson: {
          _id: salesPerson._id,
          username: salesPerson.username,
          fullName: salesPerson.fullName,
          email: salesPerson.email
        },
        orders: formattedOrders,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: totalOrders,
          pages: totalPages,
          hasMore: parseInt(page) < totalPages
        },
        statistics,
        filters: {
          status,
          search
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getSalesPersonOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales person orders',
      error: error.message
    });
  }
};

/**
 * Debug endpoint - check database for sales persons
 */
export const debugCheckSalesPersons = async (req, res) => {
  try {
    const userCompanyId = req.user.companyId;

    console.log('🔍 DEBUG: Checking sales persons for company:', userCompanyId);

    // Check all users with their roles
    const allUsersInCompany = await User.find({ companyId: userCompanyId })
      .select('username email role companyId isActive')
      .lean();

    console.log('📊 All users in company:', allUsersInCompany);

    // Check users with 'Sales' in role
    const salesUsers = await User.find({
      companyId: userCompanyId,
      role: { $regex: 'Sales', $options: 'i' }
    })
      .select('username email role companyId isActive')
      .lean();

    console.log('💼 Users with Sales role:', salesUsers);

    // Check for exact role matches
    const exactMatches = await User.find({
      companyId: userCompanyId,
      $or: [
        { role: 'Sales' },
        { role: 'Sales Person' },
        { role: 'Salesman' }
      ]
    })
      .select('username email role companyId isActive')
      .lean();

    console.log('🎯 Exact role matches:', exactMatches);

    res.json({
      success: true,
      data: {
        userCompanyId,
        allUsersInCompany,
        salesUsers,
        exactMatches,
        stats: {
          totalInCompany: allUsersInCompany.length,
          totalWithSalesRole: salesUsers.length,
          totalExactMatches: exactMatches.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in debugCheckSalesPersons:', error);
    res.status(500).json({
      success: false,
      message: 'Debug check failed',
      error: error.message
    });
  }
};

/**
 * Get all damage and expiry items for the company
 * Lists all returns with type 'damage' or 'expired' for the logged-in user's company
 */
export const getDamageExpiryList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'returnDate', sortOrder = 'desc', type = 'all' } = req.query;
    const userCompanyId = req.user.companyId;

    console.log('📦 getDamageExpiryList called:', {
      companyId: userCompanyId,
      page,
      limit,
      search,
      type
    });

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found. User not assigned to a company.'
      });
    }

    // Build query - filter by damage/expiry types
    // Handle both new records (with companyId) and legacy records (without companyId)
    let query = {
      $or: [
        { companyId: userCompanyId, type: type === 'all' ? { $in: ['damage', 'expired'] } : type },
        { companyId: { $exists: false }, type: type === 'all' ? { $in: ['damage', 'expired'] } : type }
      ]
    };

    // Simplify for now - just get all damage/expired items
    query = {
      type: type === 'all' ? { $in: ['damage', 'expired'] } : type
    };

    // Add search filter if provided (search in customer name or notes)
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$and = [
        { type: type === 'all' ? { $in: ['damage', 'expired'] } : type },
        {
          $or: [
            { customerName: searchRegex },
            { notes: searchRegex },
            { 'items.productName': searchRegex }
          ]
        }
      ];
    }

    console.log('🔍 Damage/Expiry Query:', JSON.stringify(query, null, 2));

    const Return = (await import('../models/Return.js')).default;

    // Get total count
    const totalCount = await Return.countDocuments(query);
    console.log(`📊 Total damage/expiry count: ${totalCount}`);

    // Build sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch damage/expiry items with pagination
    const damageExpiryItems = await Return.find(query)
      .populate('customerId', 'name email phone')
      .populate('salesPerson', 'username fullName email')
      .select('_id customerName returnDate reason items status type totalAmount totalQuantity notes createdBy createdAt')
      .sort(sortObj)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    console.log(`📊 Found ${damageExpiryItems.length} damage/expiry items on page ${page}`);

    // Calculate summary statistics
    const summary = {
      totalDamageExpiry: totalCount,
      totalQuantity: damageExpiryItems.reduce((sum, item) => sum + (item.totalQuantity || 0), 0),
      totalAmount: damageExpiryItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
      damageCount: damageExpiryItems.filter(item => item.type === 'damage').length,
      expiredCount: damageExpiryItems.filter(item => item.type === 'expired').length,
      pendingCount: damageExpiryItems.filter(item => item.status === 'pending').length,
      approvedCount: damageExpiryItems.filter(item => item.status === 'approved').length
    };

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        items: damageExpiryItems,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: totalPages,
          hasMore: parseInt(page) < totalPages
        },
        summary
      }
    });

  } catch (error) {
    console.error('❌ Error in getDamageExpiryList:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch damage/expiry items',
      error: error.message
    });
  }
};

/**
 * Get damage/expiry item details
 */
export const getDamageExpiryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userCompanyId = req.user.companyId;

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found.'
      });
    }

    const Return = (await import('../models/Return.js')).default;

    // Look for damage/expiry item - handle both with and without companyId
    const damageExpiryItem = await Return.findOne({
      _id: id,
      type: { $in: ['damage', 'expired'] }
    })
      .populate('customerId')
      .populate('salesPerson', 'username fullName email')
      .populate('items.productId');

    if (!damageExpiryItem) {
      return res.status(404).json({
        success: false,
        message: 'Damage/Expiry item not found'
      });
    }

    res.json({
      success: true,
      data: damageExpiryItem
    });

  } catch (error) {
    console.error('❌ Error in getDamageExpiryDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch damage/expiry item details',
      error: error.message
    });
  }
};
