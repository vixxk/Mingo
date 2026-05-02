import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  return process.env.EXPO_PUBLIC_API_URL;
};

const API_BASE_URL = getBaseUrl();

const apiRequest = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || 'Something went wrong',
      errors: data.errors || null,
    };
  }

  return data;
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

  getPackages: async () => {
    return apiRequest('/wallet/packages');
  },

  purchaseCoins: async (packageId) => {
    return apiRequest('/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  },

  getTransactions: async (page = 1, limit = 20) => {
    return apiRequest(`/wallet/transactions?page=${page}&limit=${limit}`);
  },
};

export const userAPI = {
  updateProfile: async (data) => {
    return apiRequest('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  applyAsListener: async (data) => {
    return apiRequest('/user/apply-listener', {
      method: 'POST',
      body: JSON.stringify(data),
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
};

export const chatAPI = {
  getConversations: async () => {
    return apiRequest('/chat/conversations');
  },
  getMessages: async (conversationId) => {
    return apiRequest(`/chat/conversations/${conversationId}/messages`);
  },
};

export default apiRequest;
