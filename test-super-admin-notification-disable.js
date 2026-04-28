// Test script to disable Super Admin notifications
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

const testSuperAdminNotificationDisable = async () => {
  console.log('🧪 Testing Super Admin Notification Disable...\n');

  try {
    // Step 1: Login as Super Admin
    console.log('Step 1: Logging in as Super Admin...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.success) {
      console.log('❌ Super Admin login failed:', loginResult.message);
      return;
    }

    const token = loginResult.token;
    console.log('✅ Super Admin logged in successfully');

    // Step 2: Check current settings
    console.log('\nStep 2: Checking current notification settings...');
    const getSettingsResponse = await fetch(`${API_BASE}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const currentSettings = await getSettingsResponse.json();
    console.log('📋 Current superAdmin notification setting:', 
      currentSettings.settings?.notifications?.roleSettings?.superAdmin?.enabled ?? 'undefined (defaults to true)');

    // Step 3: Disable Super Admin notifications
    console.log('\nStep 3: Disabling Super Admin notifications...');
    const updateResponse = await fetch(`${API_BASE}/settings/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roleNotifications: {
          superAdmin: {
            enabled: false
          }
        }
      })
    });

    const updateResult = await updateResponse.json();
    console.log('📄 Update response status:', updateResponse.status);
    console.log('📄 Update response:', updateResult);

    if (!updateResponse.ok) {
      console.log('❌ Failed to update settings:', updateResult.message || updateResult.error);
      return;
    }

    console.log('✅ Super Admin notifications disabled successfully');

    // Step 4: Verify settings were saved
    console.log('\nStep 4: Verifying settings were saved...');
    const verifyResponse = await fetch(`${API_BASE}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const verifySettings = await verifyResponse.json();
    const superAdminEnabled = verifySettings.settings?.notifications?.roleSettings?.superAdmin?.enabled;
    
    console.log('🔍 Verified superAdmin notification setting:', superAdminEnabled);
    
    if (superAdminEnabled === false) {
      console.log('✅ SUCCESS: Settings saved correctly');
    } else {
      console.log('❌ FAILURE: Settings not saved correctly');
    }

    // Step 5: Test notifications for Super Admin
    console.log('\nStep 5: Testing Super Admin notifications...');
    
    // Create a test notification
    const notificationResponse = await fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Super Admin Notification',
        message: 'This should not be visible to Super Admin',
        targetRole: 'Superadmin',
        type: 'general'
      })
    });

    const notificationResult = await notificationResponse.json();
    console.log('📨 Test notification created:', notificationResult.success);

    // Check if Super Admin can see notifications
    const getUserNotificationsResponse = await fetch(`${API_BASE}/notifications?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const notificationsResult = await getUserNotificationsResponse.json();
    console.log('📊 Super Admin visible notifications:', notificationsResult.notifications?.length || 0);
    console.log('📊 Super Admin unread count:', notificationsResult.unreadCount || 0);

    if (notificationsResult.notifications?.length === 0) {
      console.log('✅ SUCCESS: Super Admin cannot see notifications when disabled');
    } else {
      console.log('❌ FAILURE: Super Admin can still see notifications');
    }

    // Step 6: Re-enable Super Admin notifications
    console.log('\nStep 6: Re-enabling Super Admin notifications...');
    const reEnableResponse = await fetch(`${API_BASE}/settings/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roleNotifications: {
          superAdmin: {
            enabled: true
          }
        }
      })
    });

    const reEnableResult = await reEnableResponse.json();
    console.log('✅ Super Admin notifications re-enabled:', reEnableResponse.ok);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
};

// Run the test
testSuperAdminNotificationDisable().catch(console.error);