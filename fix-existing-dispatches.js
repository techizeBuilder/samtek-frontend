import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DispatchSchema = new mongoose.Schema({}, { strict: false, collection: 'dispatches' });
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
const Order = mongoose.model('Order', OrderSchema);

async function fixExistingDispatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all dispatch entries from today that don't have salesPerson/customer
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    const dispatches = await Dispatch.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      $or: [
        { salesPerson: { $exists: false } },
        { salesPerson: null },
        { customer: { $exists: false } },
        { customer: null }
      ]
    });

    console.log(`\n📦 Found ${dispatches.length} dispatch entries without salesPerson/customer`);

    if (dispatches.length === 0) {
      console.log('✅ No dispatch entries need fixing');
      return;
    }

    // Get today's orders
    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['approved', 'confirmed'] }
    }).lean();

    console.log(`\n📋 Found ${orders.length} orders for today`);

    let fixedCount = 0;
    let newEntriesCount = 0;

    // For each dispatch entry
    for (const dispatch of dispatches) {
      console.log(`\n🔍 Processing dispatch: ${dispatch.productName} (${dispatch._id})`);
      
      // Find which orders contain this product
      const ordersForProduct = orders.filter(order => 
        order.products && order.products.some(p => p.product.toString() === dispatch.productId.toString())
      );

      console.log(`  Found ${ordersForProduct.length} orders for this product`);

      if (ordersForProduct.length === 0) {
        console.log(`  ⚠️ No orders found, skipping`);
        continue;
      }

      // If there's only one order, update the existing dispatch entry
      if (ordersForProduct.length === 1) {
        const order = ordersForProduct[0];
        const productInOrder = order.products.find(p => p.product.toString() === dispatch.productId.toString());
        
        await Dispatch.findByIdAndUpdate(dispatch._id, {
          $set: {
            salesPerson: order.salesPerson,
            customer: order.customer,
            totalIndentQuantityOrdersForTheDay: productInOrder.quantity
          }
        });

        console.log(`  ✅ Updated with SP: ${order.salesPerson}, Customer: ${order.customer}, Qty: ${productInOrder.quantity}`);
        fixedCount++;
      } else {
        // Multiple orders for this product
        // Update the first one
        const firstOrder = ordersForProduct[0];
        const productInFirstOrder = firstOrder.products.find(p => p.product.toString() === dispatch.productId.toString());
        
        await Dispatch.findByIdAndUpdate(dispatch._id, {
          $set: {
            salesPerson: firstOrder.salesPerson,
            customer: firstOrder.customer,
            totalIndentQuantityOrdersForTheDay: productInFirstOrder.quantity
          }
        });

        console.log(`  ✅ Updated original with SP: ${firstOrder.salesPerson}, Customer: ${firstOrder.customer}, Qty: ${productInFirstOrder.quantity}`);
        fixedCount++;

        // Create new dispatch entries for the remaining orders
        for (let i = 1; i < ordersForProduct.length; i++) {
          const order = ordersForProduct[i];
          const productInOrder = order.products.find(p => p.product.toString() === dispatch.productId.toString());
          
          const newDispatch = await Dispatch.create({
            ...dispatch.toObject(),
            _id: new mongoose.Types.ObjectId(),
            salesPerson: order.salesPerson,
            customer: order.customer,
            totalIndentQuantityOrdersForTheDay: productInOrder.quantity,
            __v: 0
          });

          console.log(`  ✨ Created new entry with SP: ${order.salesPerson}, Customer: ${order.customer}, Qty: ${productInOrder.quantity}`);
          newEntriesCount++;
        }
      }
    }

    console.log(`\n\n✅ Migration complete!`);
    console.log(`   - Fixed ${fixedCount} existing entries`);
    console.log(`   - Created ${newEntriesCount} new entries`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixExistingDispatches();
