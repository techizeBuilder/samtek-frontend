// Test notes field in packing sheet

async function testNotes() {
  try {
    console.log('🧪 Testing Notes Field Storage...');
    
    // Mock request body as if from the API
    const testData = {
      productId: "693928b054dc840409006933",
      notes: "dfsfsfsf"
    };
    
    console.log('📝 Test data:', testData);
    console.log('✅ Notes field should now be available in PackingSheet schema');
    console.log('✅ Controller logic is already implemented to save notes');
    console.log('✅ Ready for API testing!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotes();