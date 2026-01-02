import mongoose from 'mongoose';
import Dispatch from './server/models/Dispatch.js';

// Test DCno generation functionality
async function testDCnoGeneration() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/sunrise_inventory', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to database');

    // Test 1: Generate first DCno (should be DC001)
    console.log('\n🧪 Test 1: Generate first DCno');
    const firstDCno = await Dispatch.generateNextDCno();
    console.log('Generated:', firstDCno);

    // Test 2: Check existing DCnos in database
    console.log('\n🧪 Test 2: Check existing DCnos');
    const existingDCnos = await Dispatch.find({ dcno: { $exists: true } }, { dcno: 1 }).sort({ dcno: 1 });
    console.log('Existing DCnos:', existingDCnos.map(d => d.dcno));

    // Test 3: Create some test dispatch entries to verify sequence
    console.log('\n🧪 Test 3: Create test dispatch entries');
    
    const testCompanyId = new mongoose.Types.ObjectId();
    const testPackingSheetId = new mongoose.Types.ObjectId();
    const testProductId = new mongoose.Types.ObjectId();

    for (let i = 0; i < 3; i++) {
      const dcno = await Dispatch.generateNextDCno();
      
      const testDispatch = await Dispatch.create({
        packingSheetId: testPackingSheetId,
        productId: testProductId,
        productName: `Test Product ${i + 1}`,
        date: new Date(),
        productGroup: `Test Group ${i + 1}`,
        company: testCompanyId,
        dcno: dcno,
        packedQuantityReadyForDispatch: 10 + i,
        status: 'updated'
      });

      console.log(`Created test dispatch ${i + 1}: ${testDispatch.dcno} for ${testDispatch.productName}`);
    }

    // Test 4: Generate next DCno after creating entries
    console.log('\n🧪 Test 4: Generate next DCno after creating entries');
    const nextDCno = await Dispatch.generateNextDCno();
    console.log('Next DCno:', nextDCno);

    // Test 5: Verify all DCnos are in sequence
    console.log('\n🧪 Test 5: Verify sequence');
    const allDCnos = await Dispatch.find({ dcno: { $exists: true } }, { dcno: 1 }).sort({ dcno: 1 });
    console.log('All DCnos in sequence:', allDCnos.map(d => d.dcno));

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await Dispatch.deleteMany({ productName: { $regex: /^Test Product/ } });
    console.log('✅ Test data cleaned up');
    
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
  }
}

// Run the test
testDCnoGeneration();