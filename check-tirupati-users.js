import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // First, get all companies to find Tirupati
  const companySchema = new mongoose.Schema({}, { strict: false });
  const Company = mongoose.model('Company', companySchema, 'companies');
  
  const tirupatiCompanies = await Company.find({ 
    $or: [
      { name: /tirupati/i },
      { city: /tirupati/i }
    ]
  });
  
  console.log('\n=== TIRUPATI COMPANIES ===');
  tirupatiCompanies.forEach(c => {
    console.log(`ID: ${c._id}, Name: ${c.name}, City: ${c.city}`);
  });
  
  if (tirupatiCompanies.length === 0) {
    console.log('No Tirupati companies found');
    mongoose.disconnect();
    return;
  }
  
  const tirupatiCompanyId = tirupatiCompanies[0]._id;
  
  // Get all users for this company
  const allUsersInCompany = await User.find({ companyId: tirupatiCompanyId });
  console.log(`\n=== ALL USERS IN TIRUPATI COMPANY (Total: ${allUsersInCompany.length}) ===`);
  allUsersInCompany.forEach(u => {
    console.log(`Username: ${u.username}, Role: ${u.role}, Unit: ${u.unit}, Active: ${u.isActive}`);
  });
  
  // Get manageable roles
  const UNIT_HEAD_MANAGEABLE_ROLES = ['Unit Manager', 'Sales', 'Production', 'Accounts', 'Dispatch', 'Packing'];
  const manageableUsers = await User.find({ 
    companyId: tirupatiCompanyId,
    role: { $in: UNIT_HEAD_MANAGEABLE_ROLES }
  });
  
  console.log(`\n=== MANAGEABLE ROLES USERS (Total: ${manageableUsers.length}) ===`);
  manageableUsers.forEach(u => {
    console.log(`Username: ${u.username}, Role: ${u.role}, Unit: ${u.unit}, Active: ${u.isActive}`);
  });
  
  // Get the first unit head to see their unit
  const unitHeads = await User.find({ role: 'Unit Head', companyId: tirupatiCompanyId });
  if (unitHeads.length > 0) {
    const firstUnitHead = unitHeads[0];
    console.log(`\n=== UNIT HEAD INFO ===`);
    console.log(`Unit Head: ${firstUnitHead.username}, Unit: ${firstUnitHead.unit}`);
    
    // Get users with that unit
    const unitUsers = await User.find({
      companyId: tirupatiCompanyId,
      unit: firstUnitHead.unit,
      role: { $in: UNIT_HEAD_MANAGEABLE_ROLES }
    });
    
    console.log(`\n=== USERS IN SAME UNIT (${firstUnitHead.unit}) WITH MANAGEABLE ROLES ===`);
    console.log(`Total: ${unitUsers.length}`);
    unitUsers.forEach(u => {
      console.log(`- ${u.username} (${u.role})`);
    });
  }
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  mongoose.disconnect();
});
