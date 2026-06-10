import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const getBaseUrl = () => {
  return process.env.EXPO_PUBLIC_API_URL;
};

const API_BASE_URL = getBaseUrl();

export let isNetworkErrorScreenOpen = false;

export const setNetworkErrorScreenOpen = (value) => {
  isNetworkErrorScreenOpen = value;
};

const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Use externally-provided signal if available, otherwise create an internal timeout
  const hasExternalSignal = !!options.signal;
  const controller = hasExternalSignal ? null : new AbortController();
  const timeoutId = hasExternalSignal ? null : setTimeout(() => {
    controller.abort();
  }, options.timeout || 15000); // 15 seconds default timeout (generous for mobile networks)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    let data = {};
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonErr) {
        try {
          const text = await response.text();
          data = { message: text || 'Invalid JSON response received' };
        } catch (e) {
          data = { message: 'Failed to read response body' };
        }
      }
    } else {
      try {
        const text = await response.text();
        data = { message: text || 'Non-JSON response received' };
      } catch (e) {
        data = { message: 'Failed to read response body' };
      }
    }

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    // Server responded successfully — clear any stale network error state
    isNetworkErrorScreenOpen = false;

    return data;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    // If we got a structured HTTP error (4xx/5xx), the server is reachable — not a network issue
    if (error.status) {
      isNetworkErrorScreenOpen = false;
      throw error;
    }

    // Skip network-error redirect for health checks, auth checks, and background/cleanup endpoints
    const skipRedirectEndpoints = [
      '/auth/me',
      '/health',
      '/call/end',
      '/listeners/go-offline',
      '/listeners/heartbeat',
      '/listeners/go-online',
      '/user/push-token',
      '/wallet/balance',
      '/listener/my-profile',
      '/notifications',
      '/chat/conversations',
    ];
    const shouldSkip = skipRedirectEndpoints.some(ep => endpoint.startsWith(ep));

    if (!shouldSkip && !isNetworkErrorScreenOpen) {
      // Verify the network is truly down by pinging the health endpoint
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 6000);
        await fetch(`${API_BASE_URL}/health`, { signal: healthController.signal });
        clearTimeout(healthTimeout);
        // Health check passed — server is reachable, so this was a transient failure
        console.log('[apiRequest] Transient error on', endpoint, '— health check passed. Not redirecting.');
      } catch (healthErr) {
        // Health check also failed — network is truly down
        console.log('[apiRequest] Network confirmed down (health check failed). Redirecting to /network-error for endpoint:', endpoint);
        isNetworkErrorScreenOpen = true;
        router.push('/network-error');
      }
    }

    throw error;
  }
};

export const authAPI = {
    sendOtp: async (phone) => {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

    loginSendOtp: async (phone) => {
    return apiRequest('/auth/login-send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

    signup: async (userData) => {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    
    if (data.data?.token) {
      await AsyncStorage.setItem('token', data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
  },

    login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    
    if (data.data?.token) {
      await AsyncStorage.setItem('token', data.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
  },

    me: async () => {
    return apiRequest(`/auth/me?cb=${Date.now()}`);
  },

    healthCheck: async (options = {}) => {
    return apiRequest('/health', options);
  },

    logout: async () => {
      try {
        // 1. Tell backend to clear the push token for this user
        if (typeof userAPI !== 'undefined' && userAPI.updatePushToken) {
          await userAPI.updatePushToken('null').catch(err => {
            console.log('[AuthAPI] Error clearing push token on backend during logout:', err);
          });
        }
      } catch (e) {
        console.log('[AuthAPI] Failed to run backend push token clearance:', e);
      }

      try {
        // 2. Clear client-side OneSignal registration
        const { logoutOneSignal } = require('./notifications');
        await logoutOneSignal();
      } catch (e) {
        console.log('[AuthAPI] Failed to log out of OneSignal:', e);
      }

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('listenerStatus');
      await AsyncStorage.removeItem('userGender');
      await AsyncStorage.removeItem('userAvatarIndex');
      await AsyncStorage.removeItem('userName');
    },

    isLoggedIn: async () => {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  },

    getStoredUser: async () => {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
};

export const listenersAPI = {
  getRecommended: async (limit = 20) => {
    return apiRequest(`/listeners?limit=${limit}`);
  },

  getProfile: async (id) => {
    return apiRequest(`/listeners/${id}`);
  },

  getPublicProfile: async (id) => {
    return apiRequest(`/listeners/${id}/public-profile`);
  },
};

export const listenerAPI = {
  goOnline: async () => {
    return apiRequest('/listeners/go-online', { method: 'POST' });
  },

  goOffline: async () => {
    return apiRequest('/listeners/go-offline', { method: 'POST' });
  },

  heartbeat: async () => {
    return apiRequest('/listeners/heartbeat', { method: 'POST' });
  },

  getMyProfile: async () => {
    return apiRequest('/listener/my-profile');
  },

  updatePublicProfile: async (data) => {
    return apiRequest('/listener/public-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  submitProfileForApproval: async () => {
    return apiRequest('/listener/public-profile/submit', {
      method: 'POST',
    });
  },

  getMediaUploadUrls: async (files) => {
    return apiRequest('/listener/upload-media', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  },

  updateSettings: async (data) => {
    return apiRequest('/listener/update-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const callAPI = {
  startCall: async (listenerId, callType = 'audio') => {
    return apiRequest('/call/start', {
      method: 'POST',
      body: JSON.stringify({ listenerId, callType }),
    });
  },

  endCall: async (sessionId) => {
    return apiRequest('/call/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  getHistory: async (limit = 20, offset = 0) => {
    return apiRequest(`/call/history?limit=${limit}&offset=${offset}`);
  },

  getActiveSession: async () => {
    return apiRequest('/call/active/session');
  },

  getSession: async (sessionId) => {
    return apiRequest(`/call/${sessionId}`);
  },
};

export const matchAPI = {
  findMatch: async () => {
    return apiRequest('/match', { method: 'POST' });
  },
};

export const ratingAPI = {
  submit: async (sessionId, rating, feedback) => {
    return apiRequest('/rating', {
      method: 'POST',
      body: JSON.stringify({ sessionId, rating, feedback }),
    });
  },

  getForListener: async (listenerId, limit = 20, offset = 0) => {
    return apiRequest(`/rating/listener/${listenerId}?limit=${limit}&offset=${offset}`);
  },
};

export const walletAPI = {
  getBalance: async () => {
    return apiRequest('/wallet/balance');
  },

  checkBalance: async (feature = 'chat') => {
    return apiRequest(`/wallet/check-balance?feature=${feature}`);
  },

  getPackages: async () => {
    return apiRequest('/wallet/packages');
  },

  purchaseCoins: async (packageId) => {
    return apiRequest('/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  },

  getTransactions: async (page = 1, limit = 20, type = 'All') => {
    return apiRequest(`/wallet/transactions?page=${page}&limit=${limit}&type=${type}`);
  },
};

export const userAPI = {
  updateProfile: async (data) => {
    return apiRequest('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updatePushToken: async (pushToken) => {
    return apiRequest('/user/push-token', {
      method: 'PATCH',
      body: JSON.stringify({ pushToken }),
    });
  },

  applyAsListener: async (data) => {
    return apiRequest('/user/apply-listener', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUploadUrl: async (fileType, extension) => {
    return apiRequest('/user/get-upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileType, extension }),
    });
  },

  toggleFavourite: async (listenerId) => {
    return apiRequest('/user/favourite', {
      method: 'POST',
      body: JSON.stringify({ listenerId }),
    });
  },

  getFavourites: async () => {
    return apiRequest('/user/favourites');
  },

  submitReport: async (data) => {
    return apiRequest('/user/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  blockUser: async (targetUserId) => {
    return apiRequest('/user/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  unblockUser: async (targetUserId) => {
    return apiRequest('/user/unblock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  getBlockedUsers: async () => {
    return apiRequest('/user/blocked');
  },

  deleteAccount: async (reason) => {
    return apiRequest('/user/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },
};

export const adminAPI = {
  getStats: async () => {
    return apiRequest('/admin/stats');
  },

  getExportData: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/export-data?${query}`);
  },

  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users?${query}`);
  },

  getListeners: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/listeners?${query}`);
  },

  approveListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}/approve`, { method: 'PATCH' });
  },

  rejectListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}/reject`, { method: 'PATCH' });
  },

  toggleBestChoice: async (id) => {
    return apiRequest(`/admin/listeners/${id}/best-choice`, { method: 'PATCH' });
  },

  toggleVerified: async (id) => {
    return apiRequest(`/admin/listeners/${id}/verify`, { method: 'PATCH' });
  },

  toggleBanUser: async (id) => {
    return apiRequest(`/admin/users/${id}/ban`, { method: 'PATCH' });
  },

  deleteUser: async (id) => {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
  },

  sendAdminMessage: async (id, content) => {
    return apiRequest(`/admin/users/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  updateUserInterests: async (id, interests) => {
    return apiRequest(`/admin/users/${id}/interests`, {
      method: 'PATCH',
      body: JSON.stringify({ interests }),
    });
  },

  getActivities: async (limit = 20, page = 1) => {
    return apiRequest(`/admin/activities?limit=${limit}&page=${page}`);
  },

  getReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/reports?${query}`);
  },

  updateReport: async (id, data) => {
    return apiRequest(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getBannedMembers: async () => {
    return apiRequest('/admin/banned');
  },

  // Wallet & Coins
  getCoinPackages: async () => {
    return apiRequest('/admin/coin-packages');
  },
  updateCoinPackages: async (packages) => {
    return apiRequest('/admin/coin-packages', {
      method: 'PUT',
      body: JSON.stringify({ packages }),
    });
  },

  // Payouts
  getPayouts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/payouts?${query}`);
  },
  updatePayoutStatus: async (id, data) => {
    return apiRequest(`/admin/payouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Settings
  getSettings: async () => {
    return apiRequest('/admin/settings');
  },
  updateSettings: async (data) => {
    return apiRequest('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  sendPushNotification: async (data) => {
    return apiRequest('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCampaigns: async () => {
    return apiRequest('/admin/notifications/campaigns');
  },

  // Profile Approvals
  getProfileApprovals: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/profile-approvals?${query}`);
  },

  approveProfileChanges: async (id) => {
    return apiRequest(`/admin/profile-approvals/${id}/approve`, { method: 'PATCH' });
  },

  rejectProfileChanges: async (id, adminNotes) => {
    return apiRequest(`/admin/profile-approvals/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNotes }),
    });
  },

  // Sessions
  getSessions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/sessions?${query}`);
  },

  // Ratings
  getRatings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/ratings?${query}`);
  },
};

export const giftsAPI = {
  getAll: async () => {
    return apiRequest('/gifts');
  },
  send: async (data) => {
    return apiRequest('/gifts/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const notificationAPI = {
  getNotifications: async (page = 1, limit = 20) => {
    return apiRequest(`/notifications?page=${page}&limit=${limit}`);
  },
  markAsRead: async (id) => {
    return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllAsRead: async () => {
    return apiRequest('/notifications/mark-all-read', { method: 'POST' });
  },
};

export const chatAPI = {
  getConversations: async () => {
    return apiRequest('/chat/conversations');
  },
  getOrCreateConversation: async (targetId, sessionId) => {
    return apiRequest('/chat/conversations/init', { method: 'POST', body: JSON.stringify({ targetId, sessionId }) });
  },
  getMessages: async (conversationId) => {
    return apiRequest(`/chat/conversations/${conversationId}/messages`);
  },
};

export default apiRequest;
