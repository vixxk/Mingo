import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronBack, IoSearch, IoMic,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ListenerDetailModal from '../components/admin/ListenerDetailModal'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

const avatarGradients = [
  'var(--accent-gradient)',
  'linear-gradient(135deg, #A855F7, #7C3AED)',
  'linear-gradient(135deg, #10B981, #059669)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #EF4444, #DC2626)',
  'linear-gradient(135deg, #EC4899, #DB2777)',
  'linear-gradient(135deg, #14B8A6, #0D9488)',
  'linear-gradient(135deg, #8B5CF6, #6D28D9)',
]

const getAvatarGradient = (id) => {
  return avatarGradients[Number(id) % avatarGradients.length] || avatarGradients[0]
}

const TABS = ['All', 'Pending', 'Approved', 'Verified', 'Best Choice', 'Rejected', 'Deleted']

const STATUS_MAP = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#1A150B' },
  approved: { label: 'Approved', color: '#10B981', bg: '#05120B' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#1A0B0B' },
  verified: { label: 'Verified', color: 'var(--accent)', bg: '#120B1A' },
  banned: { label: 'Banned', color: '#EF4444', bg: '#1A0B0B' },
  deleted: { label: 'Deleted', color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
  bestChoice: { label: 'Best Choice', color: '#A855F7', bg: '#1A0B2E' },
}

function getStatusBadge(listener) {
  if (listener.isBanned) return STATUS_MAP.banned
  if (listener.isDeleted) return STATUS_MAP.deleted
  if (listener.status === 'verified' || listener.isVerified) return STATUS_MAP.verified
  if (listener.status === 'approved') return STATUS_MAP.approved
  if (listener.status === 'pending') return STATUS_MAP.pending
  if (listener.status === 'rejected') return STATUS_MAP.rejected
  if (listener.isBestChoice) return STATUS_MAP.bestChoice
  return STATUS_MAP.pending
}

function getTags(listener) {
  const tags = []
  if (listener.isVerified) tags.push({ label: 'Verified', color: 'var(--accent)' })
  if (listener.isBestChoice) tags.push({ label: 'Best Choice', color: '#A855F7' })
  if (listener.isBanned) tags.push({ label: 'Banned', color: '#EF4444' })
  if (listener.isDeleted) tags.push({ label: 'Deleted', color: 'var(--text-muted)' })
  return tags
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const colors = ['var(--accent)', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#7C3AED']
function getAvatarColor(name) {
  let hash = 0
  if (!name) return colors[0]
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function Listeners() {
  const navigate = useNavigate()
  const [listeners, setListeners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [selectedListener, setSelectedListener] = useState(null)

  const [refreshKey, setRefreshKey] = useState(0)

  const fetchListeners = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const res = await adminAPI.getListeners({ limit: 100, ...params })
      const responseData = res.data || res || {}
      const listenersList = responseData.listeners || responseData || []
      setListeners(Array.isArray(listenersList) ? listenersList : [])
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load listeners', type: 'error' })
      setListeners([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch when refreshKey changes (after ban/delete actions)
  useEffect(() => {
    if (refreshKey > 0) fetchListeners()
  }, [refreshKey, fetchListeners])

  useEffect(() => {
    fetchListeners()
  }, [fetchListeners])

  const filteredListeners = listeners.filter(l => {
    const name = (l.name || '').toLowerCase()
    const phone = (l.phone || '').toLowerCase()
    const s = search.toLowerCase()
    if (s && !name.includes(s) && !phone.includes(s)) return false
    if (activeTab === 'All') return true
    if (activeTab === 'Pending') return l.status === 'pending' && !l.isBanned && !l.isDeleted
    if (activeTab === 'Approved') return l.status === 'approved' && !l.isBanned && !l.isDeleted
    if (activeTab === 'Verified') return l.isVerified && !l.isBanned && !l.isDeleted
    if (activeTab === 'Best Choice') return l.isBestChoice && !l.isBanned && !l.isDeleted
    if (activeTab === 'Rejected') return l.status === 'rejected'
    if (activeTab === 'Deleted') return l.isDeleted
    return true
  })

  const handleOpenDetail = async (listener) => {
    try {
      const res = await adminAPI.getListenerDetail(listener._id || listener.id)
      const detail = res.data || res.listener || res
      if (detail && typeof detail === 'object') {
        setSelectedListener({ ...listener, ...detail })
      } else {
        setSelectedListener({ ...listener })
      }
    } catch {
      setSelectedListener({ ...listener })
    }
  }

  const handleCloseDetail = () => {
    setSelectedListener(null)
  }

  const handleBanCallback = (id, wasBanned) => {
    setRefreshKey(k => k + 1)
    setToast({ visible: true, message: wasBanned ? 'Listener unbanned' : 'Listener banned', type: 'success' })
  }

  const handleDeleteCallback = (id) => {
    setRefreshKey(k => k + 1)
    setToast({ visible: true, message: 'Listener deleted', type: 'success' })
  }

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  const avatarStyle = (name) => ({
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: getAvatarColor(name),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  })

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', minHeight: '100%', padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', marginRight: 12, flexShrink: 0,
          }}>
          <IoChevronBack size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IoMic size={18} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Listeners</h1>
          <div style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{listeners.length}</span>
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
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listeners by name or phone..."
            style={{
              flex: 1, background: 'none', border: 'none', color: '#fff',
              fontSize: 13.5, outline: 'none', height: '100%',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 16, padding: 0,
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: '1px solid',
              borderColor: activeTab === tab ? 'var(--accent)' : 'var(--border)',
              backgroundColor: activeTab === tab ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} width={80} height={35} borderRadius={20} />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 15 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredListeners.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14,
            }}>
              No listeners found
            </div>
          ) : filteredListeners.map(listener => {
            const badge = getStatusBadge(listener)
            const tags = getTags(listener)
            return (
              <button key={listener._id || listener.id} onClick={() => handleOpenDetail(listener)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                <div style={avatarStyle(listener.name)}>
                  <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                    {getInitials(listener.name)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{listener.name || 'Unknown'}</span>
                    {tags.map(t => (
                      <span key={t.label} style={{
                        color: t.color, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, backgroundColor: t.color + '1a',
                      }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{listener.phone || '—'}</span>
                  {listener.skills && listener.skills.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {listener.skills.slice(0, 3).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10, color: 'var(--text-muted)', backgroundColor: 'var(--border)',
                          padding: '1px 6px', borderRadius: 8,
                        }}>
                          {typeof s === 'string' ? s : s.name || s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                  color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.color}33`,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {badge.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Listener Detail Modal */}
      <ListenerDetailModal
        visible={!!selectedListener}
        listener={selectedListener}
        onClose={handleCloseDetail}
        onBan={handleBanCallback}
        onDelete={handleDeleteCallback}
        onRefresh={handleRefresh}
      />

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
