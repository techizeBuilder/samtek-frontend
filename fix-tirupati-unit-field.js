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
    
    if (!tirupatiCompany) {
      console.log('Tirupati company not found');
      mongoose.disconnect();
      return;
    }
    
    console.log(`\nFound company: ${tirupatiCompany.name}, Unit: ${tirupatiCompany.unitName || 'Not Set'}`);
    const unitName = tirupatiCompany.unitName || tirupatiCompany.name;
    
    // Update all users with this company to have the correct unit
    const result = await User.updateMany(
      { companyId: tirupatiCompany._id },
      { 
        $set: { 
          unit: unitName 
        } 
      }
    );
    
    console.log(`\n✅ Updated ${result.modifiedCount} users`);
    console.log(`Unit value set to: "${unitName}"`);
    
    // Verify the update
    const verifyUsers = await User.find({ companyId: tirupatiCompany._id });
    const withUnit = verifyUsers.filter(u => u.unit).length;
    const withoutUnit = verifyUsers.filter(u => !u.unit).length;
    
    console.log(`\nVerification:`);
    console.log(`- Users with unit: ${withUnit}`);
    console.log(`- Users without unit: ${withoutUnit}`);
    
    if (withoutUnit === 0) {
      console.log('\n✅ All users now have unit value set!');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('Connection error:', err.message);
});
