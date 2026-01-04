import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getDispatches,
  getDispatchById,
  createDispatch,
  updateDispatch,
  deleteDispatch,
  getDispatchStats,
  getDispatchDashboardData,
  getDeliveryChallanData,
  updateManualStock,
  getDispatchHistory,
  checkExistingDispatch,
  createDispatchFromPacking,
  updateQtyIssued,
  approveProduct,
  generateInvoice,
  getNextDCNumber,
  createDispatchOrder,
  getTodaysProducts,
  validateDCNumber,
  createDeliveryChallan,
  generateInvoiceForDC
} from '../controllers/dispatchController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Dispatch CRUD Routes
router.get('/', getDispatches);                    // GET /api/dispatches
router.get('/stats', getDispatchStats);            // GET /api/dispatches/stats
router.get('/dashboard', getDispatchDashboardData); // GET /api/dispatches/dashboard
router.get('/delivery-challan', getDeliveryChallanData); // GET /api/dispatches/delivery-challan
router.get('/history', getDispatchHistory);        // GET /api/dispatches/history
router.put('/manual-stock', updateManualStock);    // PUT /api/dispatches/manual-stock

// New routes for packing integration
router.post('/check-existing', checkExistingDispatch);     // POST /api/dispatches/check-existing
router.post('/create-from-packing', createDispatchFromPacking); // POST /api/dispatches/create-from-packing

// Delivery Challan specific routes
router.get('/todays-products', getTodaysProducts);              // GET /api/dispatches/todays-products
router.get('/validate-dc-number', validateDCNumber);            // GET /api/dispatches/validate-dc-number
router.post('/create-delivery-challan', createDeliveryChallan); // POST /api/dispatches/create-delivery-challan
router.post('/generate-invoice/:dcId', generateInvoiceForDC);   // POST /api/dispatches/generate-invoice/:dcId
router.get('/next-dc-number', getNextDCNumber);                 // GET /api/dispatches/next-dc-number
router.post('/create-dispatch-order', createDispatchOrder);     // POST /api/dispatches/create-dispatch-order
router.put('/update-qty-issued', updateQtyIssued);              // PUT /api/dispatches/update-qty-issued
router.post('/approve-product', approveProduct);                // POST /api/dispatches/approve-product
router.post('/generate-invoice', generateInvoice);              // POST /api/dispatches/generate-invoice

router.get('/:id', getDispatchById);                   // GET /api/dispatches/:id
router.post('/', createDispatch);                  // POST /api/dispatches
router.put('/:id', updateDispatch);                // PUT /api/dispatches/:id
router.delete('/:id', deleteDispatch);             // DELETE /api/dispatches/:id

export default router;