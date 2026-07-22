const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    let data = {}
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch {
        try {
          const text = await response.text()
          data = { message: text || 'Invalid JSON response received' }
        } catch {
          data = { message: 'Failed to read response body' }
        }
      }
    } else {
      try {
        const text = await response.text()
        data = { message: text || 'Non-JSON response received' }
      } catch {
        data = { message: 'Failed to read response body' }
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('Session expired. Redirecting to login...')
      }
      const error = new Error(data.message || 'API request failed')
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  } catch (error) {
    if (error.status) throw error
    console.error('[apiRequest] Network error:', error)
    throw error
  }
}

export const authAPI = {
  sendOtp: async (phone) => {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  loginSendOtp: async (phone) => {
    return apiRequest('/auth/login-send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    if (data.data?.token) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
    }
    return data
  },

  me: async () => {
    return apiRequest(`/auth/me?cb=${Date.now()}`)
  },

  logout: async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('listenerStatus')
    localStorage.removeItem('userGender')
    localStorage.removeItem('userAvatarIndex')
    localStorage.removeItem('userName')
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('token')
  },

  getStoredUser: () => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  },
}

export const adminAPI = {
  getStats: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/stats?${query}`)
  },

  getExportData: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/export-data?${query}`)
  },

  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/users?${query}`)
  },

  getListeners: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/listeners?${query}`)
  },

  getBestChoiceListeners: async () => {
    return apiRequest('/admin/listeners/best-choice')
  },

  approveListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}/approve`, { method: 'PATCH' })
  },

  rejectListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}/reject`, { method: 'PATCH' })
  },

  toggleBestChoice: async (id) => {
    return apiRequest(`/admin/listeners/${id}/best-choice`, { method: 'PATCH' })
  },

  toggleVerified: async (id) => {
    return apiRequest(`/admin/listeners/${id}/verify`, { method: 'PATCH' })
  },

  toggleBanUser: async (id) => {
    return apiRequest(`/admin/users/${id}/ban`, { method: 'PATCH' })
  },

  deleteUser: async (id) => {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' })
  },

  sendAdminMessage: async (id, content) => {
    return apiRequest(`/admin/users/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  },

  updateUserInterests: async (id, interests) => {
    return apiRequest(`/admin/users/${id}/interests`, {
      method: 'PATCH',
      body: JSON.stringify({ interests }),
    })
  },

  getActivities: async (limit = 20, page = 1) => {
    return apiRequest(`/admin/activities?limit=${limit}&page=${page}`)
  },

  getReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/reports?${query}`)
  },

  getMemberReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/reports?${query}`)
  },

  updateReport: async (id, data) => {
    return apiRequest(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  resolveReport: async (id) => {
    return apiRequest(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' }),
    })
  },

  dismissReport: async (id) => {
    return apiRequest(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dismissed' }),
    })
  },

  getBannedMembers: async () => {
    return apiRequest('/admin/banned')
  },

  getCoinPackages: async () => {
    return apiRequest('/admin/coin-packages')
  },

  updateCoinPackages: async (packages) => {
    return apiRequest('/admin/coin-packages', {
      method: 'PUT',
      body: JSON.stringify({ packages }),
    })
  },

  getPayouts: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/payouts?${query}`)
  },

  updatePayoutStatus: async (id, data) => {
    return apiRequest(`/admin/payouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  getSettings: async () => {
    return apiRequest('/admin/settings')
  },

  updateSettings: async (data) => {
    return apiRequest('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  sendPushNotification: async (data) => {
    return apiRequest('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getCampaigns: async () => {
    return apiRequest('/admin/notifications/campaigns')
  },

  getProfileApprovals: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/profile-approvals?${query}`)
  },

  approveProfileChanges: async (id) => {
    return apiRequest(`/admin/profile-approvals/${id}/approve`, { method: 'PATCH' })
  },

  rejectProfileChanges: async (id, adminNotes) => {
    return apiRequest(`/admin/profile-approvals/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNotes }),
    })
  },

  getSessions: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/sessions?${query}`)
  },

  getRatings: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/ratings?${query}`)
  },

  getAnalytics: async (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/analytics?${query}`)
  },

  // Listeners
  getListenerDetail: async (id) => {
    return apiRequest(`/admin/listeners/${id}`)
  },

  toggleBanListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}/ban`, { method: 'PATCH' })
  },

  deleteListener: async (id) => {
    return apiRequest(`/admin/listeners/${id}`, { method: 'DELETE' })
  },

  // Wallet
  getWalletSettings: async () => {
    return apiRequest('/admin/settings')
  },

  updateCoinPackage: async (id, payload) => {
    return apiRequest(`/admin/coin-packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  addCoinPackage: async (payload) => {
    return apiRequest('/admin/coin-packages', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteCoinPackage: async (id) => {
    return apiRequest(`/admin/coin-packages/${id}`, { method: 'DELETE' })
  },

  resetCoinPackages: async () => {
    return apiRequest('/admin/coin-packages/reset', { method: 'POST' })
  },

  updateWalletSettings: async (data) => {
    return apiRequest('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  updateEarningRates: async (data) => {
    return apiRequest('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Notifications
  getNotificationHistory: async () => {
    return apiRequest('/admin/notifications/campaigns')
  },

  sendNotification: async (data) => {
    return apiRequest('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
