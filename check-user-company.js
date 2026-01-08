import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

async function checkUserCompany() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('username email role companyId').lean();
    
    console.log(`📋 Total users in database: ${users.length}\n`);
    
    console.log('User Company IDs:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    users.forEach(user => {
      console.log(`👤 ${user.username} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Company ID: ${user.companyId || '❌ NO COMPANY ID'}`);
      console.log('');
    });
    
    // Check which users match the production data company
    const targetCompanyId = '6914090118cf85f80ad856bc';
    const matchingUsers = users.filter(u => u.companyId?.toString() === targetCompanyId);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n✅ Users with matching company ID (${targetCompanyId}):`);
    if (matchingUsers.length > 0) {
      matchingUsers.forEach(u => console.log(`   - ${u.username} (${u.email})`));
    } else {
      console.log('   ⚠️  NO USERS FOUND - This is why you see 0 items!');
    }
    
    console.log(`\n❌ Users with different or no company ID: ${users.length - matchingUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUserCompany();
