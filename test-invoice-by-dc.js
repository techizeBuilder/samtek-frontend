import mongoose from 'mongoose';
import Dispatch from './server/models/Dispatch.js';
import { Item } from './server/models/Inventory.js';
import Customer from './server/models/Customer.js';
import User from './server/models/User.js';
import Order from './server/models/Order.js';
import { Company } from './server/models/Company.js';
import dotenv from 'dotenv';

dotenv.config();

async function testInvoiceByDC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const dcNo = 'DC004';
    console.log(`\n🔍 Searching for dispatches with DC Number: ${dcNo}`);

    const dispatches = await Dispatch.find({ dcno: dcNo })
      .populate('productId')
      .populate('customer')
      .populate('company')
      .populate('salesPerson')
      .populate('orderId')
      .sort({ createdAt: 1 });

    console.log(`\n📦 Found ${dispatches.length} dispatch entries for ${dcNo}`);

    if (dispatches.length === 0) {
      console.log('❌ No dispatches found with this DC number');
      return;
    }

    console.log('\n📋 Dispatch Details:');
    dispatches.forEach((dispatch, index) => {
      console.log(`\n--- Entry ${index + 1} ---`);
      console.log('Product ID:', dispatch.productId?._id);
      console.log('Product Name:', dispatch.productId?.name || dispatch.productName);
      console.log('Qty Issued:', dispatch.qtyIssued);
      console.log('Indent Qty:', dispatch.indentQty);
      console.log('Customer:', dispatch.customer?.name);
      console.log('Sales Person:', dispatch.salesPerson?.name);
      console.log('Company:', dispatch.company?.name);
      console.log('Status:', dispatch.status);
      console.log('Order ID:', dispatch.orderId?._id);
      
      if (dispatch.orderId && dispatch.orderId.products) {
        console.log('\n📊 Order Products:');
        dispatch.orderId.products.forEach((p, i) => {
          console.log(`  ${i + 1}. Product: ${p.product?.toString()}`);
          console.log(`     Quantity: ${p.quantity}`);
          console.log(`     Unit Price: ${p.unitPrice}`);
          console.log(`     GST Rate: ${p.gstRate || 0}%`);
        });
      }
    });

    console.log('\n✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testInvoiceByDC();
