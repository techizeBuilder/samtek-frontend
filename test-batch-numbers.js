// Test the production-shift endpoint to check batch numbers
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const testBatchNumbers = async () => {
    try {
        console.log('🧪 Testing production-shift endpoint for unique batch numbers...\n');
        
        // Login first
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'unit_head01',
            password: 'unit123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Test production-shift endpoint
        const shiftResponse = await axios.get(`${BASE_URL}/production/production-shift`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (shiftResponse.data.success) {
            console.log('✅ Production shift data retrieved successfully\n');
            
            // Extract and display batch numbers
            const shiftData = shiftResponse.data.data;
            
            shiftData.forEach((group, groupIndex) => {
                console.log(`📦 Group ${groupIndex + 1}: ${group.name}`);
                
                if (group.items && group.items.length > 0) {
                    group.items.forEach((item, itemIndex) => {
                        console.log(`  Item ${itemIndex + 1}: ${item.name}`);
                        console.log(`    📍 Batch: ${item.batchNo} (Number: ${item.batchNumber})`);
                        console.log(`    📊 Status: ${item.productionStatus}`);
                        console.log('    ---');
                    });
                } else {
                    console.log('  No items found in this group');
                }
                console.log('');
            });

            // Also check ungrouped items if they exist
            if (shiftResponse.data.ungroupedItems && shiftResponse.data.ungroupedItems.length > 0) {
                console.log('🔍 UNGROUPED ITEMS:');
                shiftResponse.data.ungroupedItems.forEach((item, index) => {
                    console.log(`  Item ${index + 1}: ${item.name}`);
                    console.log(`    📍 Batch: ${item.batchNo} (Number: ${item.batchNumber})`);
                    console.log(`    📊 Status: ${item.productionStatus}`);
                    console.log('    ---');
                });
            }
            
        } else {
            console.log('❌ Failed to get production shift data:', shiftResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
};

testBatchNumbers();