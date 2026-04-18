import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI);

const DispatchModule = await import('./server/models/Dispatch.js');
const Dispatch = DispatchModule.default;

// Get today's date range (UTC)
const today = new Date();
const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

// Get all dispatches for today
const dispatches = await Dispatch.find({
  date: { $gte: startOfDay, $lte: endOfDay },
  status: { $in: ['pending', 'updated', 'approved', 'dispatched'] }
}).select('productName productGroup packingSheetId productId status qtyIssued indentQty').lean();

console.log(`📊 Found ${dispatches.length} dispatch records for today\n`);

// Group by productId
const groupedByProduct = {};
dispatches.forEach(d => {
  const productId = d.productId?.toString?.() || d.productId || 'unknown';
  if (!groupedByProduct[productId]) {
    groupedByProduct[productId] = {
      productName: d.productName || d.productGroup || 'Unknown',
      productGroup: d.productGroup,
      count: 0,
      totalIndentQty: 0,
      totalQtyIssued: 0,
      records: []
    };
  }
  groupedByProduct[productId].count++;
  groupedByProduct[productId].totalIndentQty += d.indentQty || 0;
  groupedByProduct[productId].totalQtyIssued += d.qtyIssued || 0;
  groupedByProduct[productId].records.push({
    status: d.status,
    qtyIssued: d.qtyIssued,
    indentQty: d.indentQty
  });
});

console.log(`📋 Grouped into ${Object.keys(groupedByProduct).length} unique products:\n`);
Object.entries(groupedByProduct).forEach(([productId, data]) => {
  console.log(`✅ ${data.productName || data.productGroup || productId}`);
  console.log(`   - Dispatch records: ${data.count}`);
  console.log(`   - Total Indent Qty: ${data.totalIndentQty}`);
  console.log(`   - Total Qty Issued: ${data.totalQtyIssued}`);
  console.log('');
});

// Group by packingSheetId to show how many are grouped
console.log('\n📦 Grouped by Packing Sheet:');
const groupedByPackingSheet = {};
dispatches.forEach(d => {
  const psId = d.packingSheetId?.toString?.() || d.packingSheetId || 'ungrouped';
  if (!groupedByPackingSheet[psId]) {
    groupedByPackingSheet[psId] = {
      productName: d.productName,
      count: 0
    };
  }
  groupedByPackingSheet[psId].count++;
});

Object.entries(groupedByPackingSheet).forEach(([psId, data]) => {
  console.log(`✅ ${data.productName || psId}: ${data.count} records`);
});

await mongoose.disconnect();
