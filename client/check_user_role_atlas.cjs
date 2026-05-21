const mongoose = require('mongoose');

// Correct URI from environment.js
const MONGODB_URI = 'mongodb+srv://jeeturadicalloop:Mjvesqnj8gY3t0zP@cluster0.by2xy6x.mongodb.net/manuerp';

async function checkUser() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

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
      // Find one user to see role format
      const someUser = await User.findOne({});
      if (someUser) {
        console.log('Sample user found:', someUser.username, `"${someUser.role}"`);
      }
      
      const allUsers = await User.find({}, 'username role').limit(10);
      console.log('Some users:', allUsers);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
