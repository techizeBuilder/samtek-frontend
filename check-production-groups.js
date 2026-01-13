import mongoose from 'mongoose';
import ProductionGroup from './server/models/ProductionGroup.js';
import { config } from './server/config/environment.js';

const mongoURI = config.MONGODB_URI;

async function checkGroups() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const groups = await ProductionGroup.find({}).select('groupName company isActive items');
    
    console.log('\n📦 Production Groups in Database:');
    console.log('=================================');
    
    if (groups.length === 0) {
      console.log('⚠️ No production groups found!');
    } else {
      groups.forEach((group, index) => {
        console.log(`\n${index + 1}. Group Name: "${group.groupName}"`);
        console.log(`   Company ID: ${group.company}`);
        console.log(`   Is Active: ${group.isActive}`);
        console.log(`   Items Count: ${group.items?.length || 0}`);
        console.log(`   Group ID: ${group._id}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkGroups();
