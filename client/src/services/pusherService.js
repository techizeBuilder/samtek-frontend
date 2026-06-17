import Pusher from 'pusher-js';

// Map every role to its Pusher channel name (must match backend)
const getRoleChannel = (role) => {
  const map = {
    'Superadmin': 'notifications-superadmin',
    'Super Admin': 'notifications-superadmin',
    'Sales': 'notifications-sales',
    'Sales Head': 'notifications-sales-head',
    'Sales Employee': 'notifications-sales-employee',
    'Accounts': 'notifications-accounts',
    'Accounts Head': 'notifications-accounts-head',
    'Account Employee': 'notifications-account-employee',
    'Production': 'notifications-production',
    'Production Head': 'notifications-production-head',
    'Production Employee': 'notifications-production-employee',
    'Packing': 'notifications-packing',
    'Packing Head': 'notifications-packing-head',
    'Packing Employee': 'notifications-packing-employee',
    'Dispatch': 'notifications-dispatch',
    'Dispatch Head': 'notifications-dispatch-head',
    'Dispatch Employee': 'notifications-dispatch-employee',
    'Store': 'notifications-store',
    'Store Head': 'notifications-store-head',
    'Store Employee': 'notifications-store-employee',
    'QC': 'notifications-qc',
    'QC Head': 'notifications-qc-head',
    'QC Employee': 'notifications-qc-employee',
    'Complaint Management Head': 'notifications-complaint-head',
    'Complaint Management Employee': 'notifications-complaint-employee',
    'HR-Admin': 'notifications-hr-admin',
    'Manager': 'notifications-manager',
    'Employee': 'notifications-employee',
    'Company Admin': 'notifications-company-admin',
    'Research & Development Head': 'notifications-rd-head',
    'Research Development Employee': 'notifications-rd-employee',
    'MIS Admin': 'notifications-mis-admin',
    'Marketing': 'notifications-marketing',
    'Unit Head': 'notifications-unit-head',
    'Unit Manager': 'notifications-unit-manager',
    'Manufacturing': 'notifications-manufacturing',
  };
  return map[role] || `notifications-${(role || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
};

class PusherService {
  constructor() {
    this.pusher = null;
    this.channels = new Map();
    this.isConnected = false;
  }

  init(user) {
    if (this.pusher) {
      this.disconnect();
    }

    this.pusher = new Pusher('9a62ef4d6', {
      cluster: 'ap2',
      encrypted: true,
      forceTLS: true
    });

    this.pusher.connection.bind('connected', () => {
      console.log('Pusher connected successfully');
      this.isConnected = true;
    });

    this.pusher.connection.bind('disconnected', () => {
      console.log('Pusher disconnected');
      this.isConnected = false;
    });

    this.pusher.connection.bind('error', (error) => {
      console.error('Pusher connection error:', error);
    });

    if (user) {
      this.subscribeToUserChannel(user);
    }

    return this.pusher;
  }

  subscribeToUserChannel(user) {
    if (!this.pusher || !user) return;

    const userId = user.id || user._id;
    const userRole = user.role;

    // 1. User-specific channel (for direct notifications)
    const userChannelName = `user-${userId}`;
    const userChannel = this.pusher.subscribe(userChannelName);
    this.channels.set(userChannelName, userChannel);

    // 2. Role-specific channel
    const roleChannelName = getRoleChannel(userRole);
    const roleChannel = this.pusher.subscribe(roleChannelName);
    this.channels.set(roleChannelName, roleChannel);

    // 3. Always subscribe to global 'all' channel
    if (roleChannelName !== 'notifications-all') {
      const globalChannel = this.pusher.subscribe('notifications-all');
      this.channels.set('notifications-all', globalChannel);
    }

    console.log(`[Pusher] Subscribed to: ${userChannelName}, ${roleChannelName}, notifications-all`);
  }

  onNotification(callback) {
    if (!this.pusher) return;
    this.channels.forEach((channel) => {
      channel.bind('notification', callback);
    });
  }

  offNotification(callback) {
    if (!this.pusher) return;
    this.channels.forEach((channel) => {
      channel.unbind('notification', callback);
    });
  }

  getConnectionState() {
    return this.pusher?.connection?.state || 'disconnected';
  }

  disconnect() {
    if (this.pusher) {
      this.channels.forEach((channel, channelName) => {
        this.pusher.unsubscribe(channelName);
      });
      this.channels.clear();
      this.pusher.disconnect();
      this.pusher = null;
      this.isConnected = false;
    }
  }

  reconnect(user, maxRetries = 3) {
    let retryCount = 0;
    const attemptReconnect = () => {
      if (retryCount >= maxRetries) return;
      setTimeout(() => {
        this.init(user);
        retryCount++;
        setTimeout(() => {
          if (!this.isConnected) attemptReconnect();
        }, 2000);
      }, 1000 * Math.pow(2, retryCount));
    };
    attemptReconnect();
  }
}

export default new PusherService();
