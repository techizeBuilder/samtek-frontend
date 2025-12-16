// Check current users in database
import mongoose from 'mongoose';
import User from './server/models/User.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const checkUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sameerraval2025:4CWvUTcLbTqDdA3R@cluster0.6dcgg.mongodb.net/Inventory_Database?retryWrites=true&w=majority&appName=Cluster0');
    
    console.log('🔗 Connected to MongoDB');
    
    // Get all users
    const users = await User.find({}).select('username role companyId -_id').lean();
    
    console.log('👥 Current users in database:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. Username: ${user.username}, Role: ${user.role}, Company: ${user.companyId}`);
    });
    
    // Now test login with the first user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🧪 Testing login with user: ${testUser.username}`);
      
      // Try direct password comparison
      const foundUser = await User.findOne({ username: testUser.username });
      console.log('User found:', !!foundUser);
      console.log('Raw password hash:', foundUser?.password?.substring(0, 20) + '...');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUsers();