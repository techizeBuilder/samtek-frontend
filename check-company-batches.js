// Check batch numbers for specific company
import mongoose from 'mongoose';
import ProductionBatch from './server/models/ProductionBatch.js';
import dotenv from 'dotenv';

dotenv.config();

const checkCompanyBatches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check with specific company ID 
    const companyId = '6914090118cf85f80ad856bc';
    
    console.log('🏢 Checking for company:', companyId);
    console.log('📅 Date range:', today.toISOString(), 'to', tomorrow.toISOString());
    
    const batches = await ProductionBatch.find({
      companyId: companyId,
      productionDate: { $gte: today, $lt: tomorrow }
    }).sort({ batchNumber: -1 });
    
    console.log(`📦 Found ${batches.length} batches for this company today:`);
    batches.forEach(b => console.log(`  - ${b.batchNo} (Number: ${b.batchNumber}), Company: ${b.companyId}`));
    
    const lastBatch = batches[0];
    console.log(`\n📊 Last batch number: ${lastBatch?.batchNumber || 'none'}`);
    console.log(`✅ Next batch should be: ${(lastBatch?.batchNumber || 0) + 1}`);
    
    // Also check all companies for comparison
    const allBatches = await ProductionBatch.find({
      productionDate: { $gte: today, $lt: tomorrow }
    }).sort({ batchNumber: -1 });
    
    console.log(`\n🌍 All companies combined - ${allBatches.length} batches today:`);
    allBatches.forEach(b => console.log(`  - ${b.batchNo} (Number: ${b.batchNumber}), Company: ${b.companyId}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkCompanyBatches();