import fetch from 'node-fetch';

const baseURL = 'http://localhost:5000';
const username = 'package';
const password = '12345678';

async function testPackingAPI() {
    let token = null;

    try {
        // 1. Login first
        console.log('🔐 Logging in...');
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginResult = await loginResponse.json();
        token = loginResult.token;
        console.log('✅ Login successful, got token');

        // 2. Test specific packing sheet
        const packingSheetId = '6948df464891cd48b80f4cfc';
        console.log(`\n📋 Testing packing sheet: ${packingSheetId}`);
        
        const sheetResponse = await fetch(`${baseURL}/api/packing/sheets/${packingSheetId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (sheetResponse.ok) {
            const sheetData = await sheetResponse.json();
            console.log('📄 Packing sheet data:');
            console.log(JSON.stringify(sheetData, null, 2));
            
            if (sheetData.data && sheetData.data.items) {
                console.log('\n🔍 Items in packing sheet:');
                sheetData.data.items.forEach((item, index) => {
                    console.log(`Item ${index + 1}:`);
                    console.log(`  productId: ${item.productId}`);
                    console.log(`  productName: ${item.productName}`);
                    console.log(`  packingLoss: ${item.packingLoss}`);
                });

                // 3. Test update item API
                if (sheetData.data.items.length > 0) {
                    const testItem = sheetData.data.items[0];
                    console.log(`\n🧪 Testing update item API with productId: ${testItem.productId}`);
                    
                    const updateResponse = await fetch(`${baseURL}/api/packing/sheets/${packingSheetId}/item`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            productId: testItem.productId,
                            packingLoss: 5
                        })
                    });

                    const updateResult = await updateResponse.json();
                    console.log('🔄 Update result:');
                    console.log(`Status: ${updateResponse.status}`);
                    console.log(JSON.stringify(updateResult, null, 2));
                }
            }
        } else {
            const errorData = await sheetResponse.json();
            console.log('❌ Error getting packing sheet:');
            console.log(`Status: ${sheetResponse.status}`);
            console.log(JSON.stringify(errorData, null, 2));
        }

        // 4. Test production groups API to see data structure
        console.log('\n📦 Testing production groups API...');
        const groupsResponse = await fetch(`${baseURL}/api/packing/production-groups`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (groupsResponse.ok) {
            const groupsData = await groupsResponse.json();
            console.log('📋 Production groups structure:');
            if (groupsData.data && groupsData.data.productionGroups) {
                groupsData.data.productionGroups.slice(0, 2).forEach((group, index) => {
                    console.log(`\nGroup ${index + 1}:`);
                    console.log(`  name: ${group.name}`);
                    console.log(`  _id: ${group._id}`);
                    if (group.items && group.items.length > 0) {
                        console.log(`  items[0]._id: ${group.items[0]._id}`);
                        console.log(`  items[0].name: ${group.items[0].name}`);
                        
                        // Show batch details
                        if (group.items[0].batchDetails && group.items[0].batchDetails.length > 0) {
                            console.log(`\n  🔍 Batch Details for ${group.items[0].name} (${group.items[0].batchDetails.length} batches):`);
                            group.items[0].batchDetails.forEach((batch, batchIndex) => {
                                console.log(`    Batch ${batchIndex + 1}:`);
                                console.log(`      _id: ${batch._id}`);
                                console.log(`      batchNo: ${batch.batchNo}`);
                                console.log(`      qtyAchieved: ${batch.qtyAchieved}`);
                                console.log(`      productionLoss: ${batch.productionLoss}`);
                                console.log(`      status: ${batch.status}`);
                                console.log(`      companyId: ${batch.companyId}`);
                                console.log(`      itemId: ${batch.itemId}`);
                                console.log(`      groupId: ${batch.groupId}`);
                                console.log(`      productionDate: ${batch.productionDate}`);
                            });
                        } else {
                            console.log(`    No batch details found for ${group.items[0].name}`);
                        }
                    }
                });
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testPackingAPI();