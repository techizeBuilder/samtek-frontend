const fs = require('fs');

// Read token from file
const token = fs.readFileSync('./token.txt', 'utf8').trim();

const testMaintenanceMode = async () => {
  console.log('=== Testing Maintenance Mode API ===');
  
  try {
    // Test 1: Get current settings
    const getCurrentSettings = await fetch('http://localhost:3001/api/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const currentSettings = await getCurrentSettings.json();
    console.log('Current maintenance mode:', currentSettings.data.system.maintenanceMode);
    
    // Test 2: Enable maintenance mode
    console.log('\n=== Enabling Maintenance Mode ===');
    const enableMaintenanceResponse = await fetch('http://localhost:3001/api/settings/system', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maintenanceMode: {
          enabled: true,
          message: "🚧 System Under Maintenance - We're upgrading our servers to serve you better!",
          estimatedTime: "2 hours (back online by 3:00 PM)"
        }
      })
    });
    
    const enableResult = await enableMaintenanceResponse.json();
    console.log('Enable maintenance response:', enableResult);
    
    // Test 3: Verify enabled state
    const verifyEnabledResponse = await fetch('http://localhost:3001/api/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifyEnabledSettings = await verifyEnabledResponse.json();
    console.log('Verified maintenance mode (enabled):', verifyEnabledSettings.data.system.maintenanceMode);
    
    // Test 4: Update maintenance message
    console.log('\n=== Updating Maintenance Message ===');
    const updateMessageResponse = await fetch('http://localhost:3001/api/settings/system', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maintenanceMode: {
          enabled: true,
          message: "⚡ Quick maintenance in progress - Almost done!",
          estimatedTime: "30 minutes"
        }
      })
    });
    
    const updateMessageResult = await updateMessageResponse.json();
    console.log('Update message response:', updateMessageResult);
    
    // Test 5: Disable maintenance mode
    console.log('\n=== Disabling Maintenance Mode ===');
    const disableMaintenanceResponse = await fetch('http://localhost:3001/api/settings/system', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maintenanceMode: {
          enabled: false,
          message: "",
          estimatedTime: ""
        }
      })
    });
    
    const disableResult = await disableMaintenanceResponse.json();
    console.log('Disable maintenance response:', disableResult);
    
    // Test 6: Verify disabled state
    const verifyDisabledResponse = await fetch('http://localhost:3001/api/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifyDisabledSettings = await verifyDisabledResponse.json();
    console.log('Final maintenance mode state:', verifyDisabledSettings.data.system.maintenanceMode);
    
    console.log('\n✅ Maintenance Mode API Testing Complete!');
    
  } catch (error) {
    console.error('❌ Error testing maintenance mode:', error.message);
  }
};

// Run the test
testMaintenanceMode();