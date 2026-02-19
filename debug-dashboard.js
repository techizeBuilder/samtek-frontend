import Order from './server/models/Order.js';
import Return from './server/models/Return.js';
import DispatchConsole from './server/models/Dispatch.js';
import ProductionBatch from './server/models/ProductionBatch.js';
import { Item } from './server/models/Inventory.js';
import './server/db.ts';

async function debugDashboard() {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('\n===== ORDERS =====');
    const orders = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } }).limit(2).lean();
    console.log('Sample order:', JSON.stringify(orders[0], null, 2));
    console.log('Total orders this month:', await Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }));

    console.log('\n===== RETURNS (Damage) =====');
    const returns = await Return.find({ type: 'Damage' }).limit(2).lean();
    console.log('Sample return:', JSON.stringify(returns[0], null, 2));
    console.log('Total damage returns:', await Return.countDocuments({ type: 'Damage' }));

    console.log('\n===== DISPATCH =====');
    const dispatches = await DispatchConsole.find().limit(2).lean();
    console.log('Sample dispatch:', JSON.stringify(dispatches[0], null, 2));
    console.log('Total dispatches:', await DispatchConsole.countDocuments({}));

    console.log('\n===== PRODUCTION BATCHES =====');
    const batches = await ProductionBatch.find().limit(2).lean();
    console.log('Sample batch:', JSON.stringify(batches[0], null, 2));
    console.log('Total batches:', await ProductionBatch.countDocuments({}));

    console.log('\n===== INVENTORY ITEMS =====');
    const items = await Item.find({ category: 'Finished Goods' }).limit(2).lean();
    console.log('Sample finished goods item:', JSON.stringify(items[0], null, 2));
    console.log('Total finished goods:', await Item.countDocuments({ category: 'Finished Goods' }));

    console.log('\n===== LOW STOCK ITEMS =====');
    const lowStock = await Item.find({ $expr: { $lte: ['$qty', '$minStock'] } }).limit(2).lean();
    console.log('Sample low stock item:', JSON.stringify(lowStock[0], null, 2));
    console.log('Total low stock items:', await Item.countDocuments({ $expr: { $lte: ['$qty', '$minStock'] } }));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugDashboard();
