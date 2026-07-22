import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSearch, IoChevronBack, IoChevronForward, IoPeople,
  IoCall, IoWallet
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import UserDetailModal from '../components/admin/UserDetailModal'
import { AdminPageSkeleton } from '../components/admin/Skeleton'
import ToastNotification from '../components/shared/ToastNotification'

const avatarColors = [
  'var(--accent)',
  '#A855F7',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#7C3AED',
  '#14B8A6',
  '#8B5CF6',
]

const getAvatarColor = (name) => {
  let hash = 0
  if (!name) return avatarColors[0]
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [refreshKey, setRefreshKey] = useState(0)

  const filters = ['All', 'Active', 'Inactive', 'Deleted']

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const params = { page, limit: 20 }
        if (searchTerm) params.search = searchTerm
        if (activeFilter === 'Active') params.status = 'active'
        else if (activeFilter === 'Inactive') params.status = 'inactive'
        else if (activeFilter === 'Deleted') params.isDeleted = true

        const res = await adminAPI.getUsers(params)
        const data = res.data || res
        setUsers(data.users || data || [])
        setTotalPages(data.totalPages || 1)
        setTotalUsers(data.total || (data.users ? data.users.length : 0))
      } catch (e) {
        setToast({ visible: true, message: e.message || 'Failed to load users', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeFilter, page, searchTerm, refreshKey])

  const triggerSearch = () => {
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const handleSearch = () => {
    triggerSearch()
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    setPage(1)
  }

  const handleBan = async (userId, currentlyBanned) => {
    try {
      await adminAPI.toggleBanUser(userId)
      setToast({
        visible: true,
        message: currentlyBanned ? 'User unbanned successfully' : 'User banned successfully',
        type: 'success',
      })
      setSelectedUser(null)
      setRefreshKey(k => k + 1)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to update user', type: 'error' })
    }
  }

  const handleDelete = async (userId) => {
    try {
      await adminAPI.deleteUser(userId)
      setToast({ visible: true, message: 'User deleted permanently', type: 'success' })
      setSelectedUser(null)
      setRefreshKey(k => k + 1)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to delete user', type: 'error' })
    }
  }

  const getStatusColor = (user) => {
    if (user.isBanned) return '#EF4444'
    if (user.isOnline) return '#10B981'
    return 'var(--text-muted)'
  }

  const getStatusLabel = (user) => {
    if (user.isBanned) return 'Banned'
    if (user.isOnline) return 'Online'
    return 'Offline'
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', marginRight: 12, flexShrink: 0,
          }}
        >
          <IoChevronBack size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IoPeople size={18} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Users</h1>
          <div style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalUsers}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '0 14px', height: 42,
        }}>
          <IoSearch size={18} color="var(--text-muted)" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search users by name or phone..."
            style={{
              flex: 1, background: 'none', border: 'none', color: '#fff',
              fontSize: 13.5, outline: 'none', height: '100%',
            }}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1) }}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 16, padding: 0,
              }}
            >
              &times;
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          style={{
            height: 42, padding: '0 18px',             borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--accent-gradient)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Search
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {filters.map(filter => {
          const isActive = activeFilter === filter
          return (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                backgroundColor: isActive ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* User List */}
      {loading ? (
        <AdminPageSkeleton />
      ) : users.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px',
        }}>
          <IoPeople size={48} color="var(--border)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
            No users found
          </p>
        </div>
      ) : (
        <div>
          {users.map((user, index) => (
            <div
              key={user.id || index}
              onClick={() => setSelectedUser(user)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: '12px 14px', marginBottom: 10,
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Avatar */}
              <div style={{
                width: 48, height: 48, borderRadius: 24, flexShrink: 0,
                backgroundColor: getAvatarColor(user.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 900, color: '#fff',
              }}>
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>

              {/* User Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                    {user.name || 'Unknown'}
                  </span>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: getStatusColor(user),
                    flexShrink: 0,
                  }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {user.phone || 'No phone'}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoCall size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {user.totalCalls || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoWallet size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {user.coins || 0}
                  </span>
                </div>
              </div>

              {/* Status indicator */}
              <div style={{
                padding: '4px 10px', borderRadius: 8, flexShrink: 0,
                backgroundColor: user.isBanned
                  ? 'rgba(239,68,68,0.12)'
                  : user.isDeleted
                    ? 'rgba(107,114,128,0.12)'
                    : user.isOnline
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(107,114,128,0.08)',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  color: getStatusColor(user),
                }}>
                  {user.isDeleted ? 'Deleted' : getStatusLabel(user)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, marginTop: 24, paddingBottom: 20,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              color: page === 1 ? '#3F3F46' : '#fff', opacity: page === 1 ? 0.5 : 1,
            }}
          >
            <IoChevronBack size={18} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              color: page === totalPages ? '#3F3F46' : '#fff', opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            <IoChevronForward size={18} />
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        visible={!!selectedUser}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onBan={handleBan}
        onDelete={handleDelete}
      />

      {/* Toast */}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
