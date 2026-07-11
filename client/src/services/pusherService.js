import Pusher from 'pusher-js';

// Map every role to its Pusher channel slug (must match backend)
const getRoleSlug = (role) => {
  const map = {
    'Superadmin': 'superadmin',
    'Super Admin': 'superadmin',
    'Sales': 'sales',
    'Sales Head': 'sales-head',
    'Sales Employee': 'sales-employee',
    'Accounts': 'accounts',
    'Accounts Head': 'accounts-head',
    'Account Employee': 'account-employee',
    'Production': 'production',
    'Production Head': 'production-head',
    'Production Employee': 'production-employee',
    'Packing': 'packing',
    'Packing Head': 'packing-head',
    'Packing Employee': 'packing-employee',
    'Dispatch': 'dispatch',
    'Dispatch Head': 'dispatch-head',
    'Dispatch Employee': 'dispatch-employee',
    'Store': 'store',
    'Store Head': 'store-head',
    'Store Employee': 'store-employee',
    'QC': 'qc',
    'QC Head': 'qc-head',
    'QC Employee': 'qc-employee',
    'Complaint Management Head': 'complaint-head',
    'Complaint Management Employee': 'complaint-employee',
    'HR-Admin': 'hr-admin',
    'Manager': 'manager',
    'Employee': 'employee',
    'Company Admin': 'company-admin',
    'Research & Development Head': 'rd-head',
    'Research Development Employee': 'rd-employee',
    'MIS Admin': 'mis-admin',
    'Marketing': 'marketing',
    'Marketing Head': 'marketing-head',
    'Unit Head': 'unit-head',
    'Unit Manager': 'unit-manager',
    'Manufacturing': 'manufacturing',
  };
  return map[role] || (role || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Returns company-scoped role channel name.
 * Global roles (Superadmin, MIS Admin) use a single global channel.
 */
const getRoleChannel = (role, companyId) => {
  const slug = getRoleSlug(role);
  const globalRoles = ['superadmin', 'mis-admin'];
  if (globalRoles.includes(slug) || !companyId) {
    return `notifications-${slug}`;
  }
  return `notifications-${slug}-${companyId}`;
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
    // Support both nested company object and plain companyId string/ObjectId
    const companyId = user.companyId?._id?.toString()
      || user.companyId?.toString()
      || user.company?.id?.toString()
      || null;

    // 1. User-specific channel (direct/personal notifications)
    const userChannelName = `user-${userId}`;
    const userChannel = this.pusher.subscribe(userChannelName);
    this.channels.set(userChannelName, userChannel);

    // 2. Company-scoped role channel (e.g. notifications-sales-head-{companyId})
    const roleChannelName = getRoleChannel(userRole, companyId);
    const roleChannel = this.pusher.subscribe(roleChannelName);
    this.channels.set(roleChannelName, roleChannel);

    // 3. Company-scoped "all" channel for company-wide broadcasts
    if (companyId) {
      const companyAllChannel = `notifications-all-${companyId}`;
      if (companyAllChannel !== roleChannelName) {
        const allChannel = this.pusher.subscribe(companyAllChannel);
        this.channels.set(companyAllChannel, allChannel);
      }
    }

    // 4. Superadmin/MIS Admin also subscribe to global channels
    const slug = getRoleSlug(userRole);
    const globalRoles = ['superadmin', 'mis-admin'];
    if (globalRoles.includes(slug)) {
      const globalChannel = this.pusher.subscribe('notifications-all');
      this.channels.set('notifications-all', globalChannel);
    }

    console.log(`[Pusher] Subscribed channels:`, [...this.channels.keys()]);
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
