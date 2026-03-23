import mongoose from 'mongoose';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunrise-erp';

async function checkUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ username: 'unithead' });
    if (user) {
      console.log('User found:');
      console.log('Username:', user.username);
      console.log('Role:', `"${user.role}"`);
      console.log('Role Length:', user.role.length);
      console.log('Unit:', user.unit);
    } else {
      console.log('User "unithead" not found');
      
      const allUsers = await User.find({}, 'username role');
      console.log('All users:', allUsers);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
