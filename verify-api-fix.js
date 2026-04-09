import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const companySchema = new mongoose.Schema({}, { strict: false });
const Company = mongoose.model('Company', companySchema, 'companies');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Find Tirupati company
    const tirupatiCompany = await Company.findOne({ 
      $or: [
        { name: /tirupati/i },
        { city: /tirupati/i }
      ]
    });
    
    // Get a Unit Head user 
    const unitHead = await User.findOne({ 
      role: 'Unit Head',
      companyId: tirupatiCompany._id
    });
    
    console.log(`Unit Head: ${unitHead.username}, Unit: ${unitHead.unit}`);
    
    // Simulate the API query
    const UNIT_HEAD_MANAGEABLE_ROLES = ['Unit Manager', 'Sales', 'Production', 'Accounts', 'Dispatch', 'Packing'];
    
    const users = await User.find({
      role: { $in: UNIT_HEAD_MANAGEABLE_ROLES },
      unit: unitHead.unit,
      companyId: unitHead.companyId
    }).select('-password');
    
    console.log(`\n=== USERS NOW RETURNED BY API ===`);
    console.log(`Total: ${users.length}`);
    users.forEach(u => {
      console.log(`- ${u.username} (${u.role})`);
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('Connection error:', err.message);
});
