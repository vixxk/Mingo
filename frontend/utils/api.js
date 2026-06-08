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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, options.timeout || 8000); // 8 seconds default timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    isNetworkErrorScreenOpen = false;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.status) {
      isNetworkErrorScreenOpen = false;
    }
    const isTimeoutOrNetwork = !error.status || error.name === 'AbortError' || error.message?.includes('aborted');
    // If it's a network/fetch connection failure (no structured error response status)
    if (isTimeoutOrNetwork && endpoint !== '/auth/me' && endpoint !== '/health') {
      console.log('Redirecting to network error page due to connection failure:', error);
      if (!isNetworkErrorScreenOpen) {
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
    return apiRequest('/auth/me');
  },

    healthCheck: async (options = {}) => {
    return apiRequest('/health', options);
  },

    logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
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

  submitReport: async (message) => {
    return apiRequest('/user/report', {
      method: 'POST',
      body: JSON.stringify({ message }),
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
