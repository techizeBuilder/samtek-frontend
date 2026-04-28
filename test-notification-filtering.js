// Test script for Role-Based Notification Filtering
// This script demonstrates how to create and test role-based notifications

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

// Test notification creation with different targeting options
const testNotificationFiltering = async () => {
  console.log('🧪 Testing Role-Based Notification Filtering...\n');

  // Test scenarios
  const testScenarios = [
    {
      name: 'Global Notification (All Users)',
      notification: {
        title: 'System Maintenance Alert',
        message: 'System will be down for maintenance at 2 AM',
        targetRole: 'all',
        type: 'system'
      },
      expectedUsers: ['Superadmin', 'Unit Head', 'Unit Manager', 'Sales', 'All others']
    },
    
    {
      name: 'Unit Head Only Notification',
      notification: {
        title: 'Unit Head Meeting',
        message: 'Monthly unit head meeting scheduled for tomorrow',
        targetRole: 'Unit Head',
        type: 'general'
      },
      expectedUsers: ['Unit Head users only']
    },
    
    {
      name: 'Unit-Specific Notification',
      notification: {
        title: 'Unit A Inventory Alert',
        message: 'Low stock alert for Unit A inventory',
        targetRole: 'all',
        targetUnit: 'Unit A',
        type: 'inventory'
      },
      expectedUsers: ['Users in Unit A only']
    },
    
    {
      name: 'Company-Specific Notification',
      notification: {
        title: 'Sunrize Bakery Policy Update',
        message: 'New policy updates for Sunrize Bakery employees',
        targetRole: 'all',
        targetCompanyId: '691409118cf85f80ad856b9', // Sample company ID
        type: 'general'
      },
      expectedUsers: ['Users in Sunrize Bakery company only']
    },
    
    {
      name: 'Sales Role + Unit Specific',
      notification: {
        title: 'Sales Target Achievement',
        message: 'Unit B sales team has achieved monthly target!',
        targetRole: 'Sales',
        targetUnit: 'Unit B',
        type: 'general'
      },
      expectedUsers: ['Sales users in Unit B only']
    }
  ];

  // Function to create test notification
  const createTestNotification = async (notificationData, token) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error.message);
      return null;
    }
  };

  // Function to get notifications for a user
  const getUserNotifications = async (token) => {
    try {
      const response = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
      return null;
    }
  };

  // Function to login and get token
  const loginUser = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      return result.success ? result : null;
    } catch (error) {
      console.error('Login error:', error.message);
      return null;
    }
  };

  // Test users (these should exist in your database)
  const testUsers = [
    { username: 'admin', password: 'password123', role: 'Superadmin' },
    { username: 'unit_head01', password: 'password123', role: 'Unit Head' },
    { username: 'unit_manager01', password: 'password123', role: 'Unit Manager' },
    { username: 'sales_user', password: 'password123', role: 'Sales' }
  ];

  console.log('📋 Test Scenarios:');
  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   Expected: ${scenario.expectedUsers.join(', ')}\n`);
  });

  // Login as admin to create test notifications
  console.log('🔑 Logging in as admin to create test notifications...');
  const adminLogin = await loginUser('admin', 'password123');
  
  if (!adminLogin) {
    console.log('❌ Failed to login as admin. Please check credentials.');
    return;
  }

  const adminToken = adminLogin.token;
  console.log('✅ Admin login successful\n');

  // Create all test notifications
  console.log('📢 Creating test notifications...');
  for (const scenario of testScenarios) {
    console.log(`Creating: ${scenario.name}`);
    const result = await createTestNotification(scenario.notification, adminToken);
    if (result && result.success) {
      console.log(`✅ Created notification: ${result.notification._id}`);
    } else {
      console.log(`❌ Failed to create notification`);
    }
  }

  console.log('\n🔍 Testing notification visibility for different users...\n');

  // Test notification visibility for each user type
  for (const user of testUsers) {
    console.log(`👤 Testing as ${user.role} (${user.username}):`);
    
    const loginResult = await loginUser(user.username, user.password);
    
    if (!loginResult) {
      console.log(`❌ Failed to login as ${user.username}\n`);
      continue;
    }

    const userNotifications = await getUserNotifications(loginResult.token);
    
    if (userNotifications && userNotifications.success) {
      console.log(`   📊 Visible notifications: ${userNotifications.notifications.length}`);
      console.log(`   📨 Unread count: ${userNotifications.unreadCount}`);
      
      console.log('   📋 Notification titles:');
      userNotifications.notifications.slice(0, 5).forEach(notification => {
        console.log(`      - ${notification.title}`);
      });
      
      if (userNotifications.notifications.length > 5) {
        console.log(`      ... and ${userNotifications.notifications.length - 5} more`);
      }
    } else {
      console.log(`❌ Failed to fetch notifications`);
    }
    
    console.log('');
  }

  console.log('✅ Role-based notification filtering test completed!');
  console.log('\n📊 Expected Results:');
  console.log('- Super Admin should see ALL notifications');
  console.log('- Unit Head should see unit-specific + global notifications');
  console.log('- Unit Manager should see unit-specific + global notifications'); 
  console.log('- Sales should see sales-role + unit-specific + global notifications');
  console.log('\n🔍 Check the results above to verify filtering is working correctly.');
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotificationFiltering().catch(console.error);
}

export { testNotificationFiltering };