const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/sunrise-erp';

async function checkUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      role: String,
      unit: String
    }));

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
