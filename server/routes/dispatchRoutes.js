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
  updateManualStock,
  getDispatchHistory,
  checkExistingDispatch,
  createDispatchFromPacking
} from '../controllers/dispatchController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Dispatch CRUD Routes
router.get('/', getDispatches);                    // GET /api/dispatches
router.get('/stats', getDispatchStats);            // GET /api/dispatches/stats
router.get('/dashboard', getDispatchDashboardData); // GET /api/dispatches/dashboard
router.get('/history', getDispatchHistory);        // GET /api/dispatches/history
router.put('/manual-stock', updateManualStock);    // PUT /api/dispatches/manual-stock

// New routes for packing integration
router.post('/check-existing', checkExistingDispatch);     // POST /api/dispatches/check-existing
router.post('/create-from-packing', createDispatchFromPacking); // POST /api/dispatches/create-from-packing

router.get('/:id', getDispatchById);                   // GET /api/dispatches/:id
router.post('/', createDispatch);                  // POST /api/dispatches
router.put('/:id', updateDispatch);                // PUT /api/dispatches/:id
router.delete('/:id', deleteDispatch);             // DELETE /api/dispatches/:id

export default router;