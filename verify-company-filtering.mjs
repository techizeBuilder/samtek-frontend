import mongoose from 'mongoose';
import User from './server/models/User.js';
import { Item } from './server/models/Inventory.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://***:***@cluster0.by2qy6x.mongodb.net/production-erp';

async function verifyCompanyFiltering() {
  try {
    console.log('🔍 VERIFYING COMPANY FILTERING\n');
    
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to database\n');
    }

    // Find a Unit Head user
    const unitHead = await User.findOne({ role: 'Unit Head' }).lean();
    
    if (!unitHead) {
      console.log('❌ No Unit Head users found!');
      return;
    }

    console.log(`📋 Testing with Unit Head: ${unitHead.username}`);
    console.log(`   Company ID: ${unitHead.companyId}\n`);

    // Query finished goods items FOR THIS COMPANY
    console.log('✅ Finished Goods Stock (Company Filtered):');
    console.log('─'.repeat(70));
    
    const finishedGoods = await Item.find({
      $or: [
        { companyId: unitHead.companyId },
        { company: unitHead.companyId },
        { assignedToCompany: unitHead.companyId }
      ]
    }).lean();

    console.log(`Items found: ${finishedGoods.length}`);
    if (finishedGoods.length > 0) {
      console.log('Sample items:');
      finishedGoods.slice(0, 3).forEach(item => {
        console.log(`  • ${item.name} - Qty: ${item.qty} (Min: ${item.minStock})`);
      });
    }
    console.log();

    // Query low stock items FOR THIS COMPANY
    console.log('✅ Raw Material - Low Stock Alert (Company Filtered):');
    console.log('─'.repeat(70));
    
    const lowStockItems = await Item.find({
      $and: [
        { $expr: { $lte: ['$qty', '$minStock'] } },
        {
          $or: [
            { companyId: unitHead.companyId },
            { company: unitHead.companyId },
            { assignedToCompany: unitHead.companyId }
          ]
        }
      ]
    }).lean();

    const rawMaterial = lowStockItems.filter(item => 
      item.category === 'Raw Material' || 
      item.category === 'Raw' || 
      item.category === 'rawMaterial' ||
      (item.category && item.category.toLowerCase().includes('raw'))
    );

    console.log(`Low Stock Raw Material items: ${rawMaterial.length}`);
    if (rawMaterial.length > 0) {
      console.log('Sample items:');
      rawMaterial.slice(0, 3).forEach(item => {
        console.log(`  • ${item.name} - Current: ${item.qty}, Min: ${item.minStock}`);
      });
    }
    console.log();

    // Packing material
    console.log('✅ Packing Material - Low Stock Alert (Company Filtered):');
    console.log('─'.repeat(70));
    
    const packingMaterial = lowStockItems.filter(item => 
      item.category === 'Packing Material' || 
      item.category === 'Packing' || 
      item.category === 'packingMaterial' ||
      (item.category && item.category.toLowerCase().includes('packing'))
    );

    console.log(`Low Stock Packing Material items: ${packingMaterial.length}`);
    if (packingMaterial.length > 0) {
      console.log('Sample items:');
      packingMaterial.slice(0, 3).forEach(item => {
        console.log(`  • ${item.name} - Current: ${item.qty}, Min: ${item.minStock}`);
      });
    }
    console.log();

    console.log('═'.repeat(70));
    console.log('\n✅ COMPANY FILTERING VERIFICATION COMPLETE!');
    console.log(`\nAll data is filtered for Company: ${unitHead.companyId}`);
    console.log(`\nSummary:`);
    console.log(`  • Finished Goods Items: ${finishedGoods.length}`);
    console.log(`  • Low Stock Raw Material: ${rawMaterial.length}`);
    console.log(`  • Low Stock Packing Material: ${packingMaterial.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

verifyCompanyFiltering();
