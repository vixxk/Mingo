import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronBack, IoShieldCheckmark, IoBan, IoClose, IoSearch,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

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

export default function BannedMembers() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [unbanning, setUnbanning] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getBannedMembers()
      const data = res.data || res || []
      setMembers(Array.isArray(data) ? data : [])
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load banned members', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = search
    ? members.filter(m => {
        const q = search.toLowerCase()
        return (m.name?.toLowerCase() || '').includes(q)
          || (m.phone?.toLowerCase() || '').includes(q)
          || (m.username?.toLowerCase() || '').includes(q)
      })
    : members

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleUnban = async () => {
    if (!confirmTarget) return
    const id = confirmTarget._id || confirmTarget.id
    setUnbanning(id)
    setConfirmTarget(null)
    try {
      if (confirmTarget.role === 'listener') {
        await adminAPI.toggleBanListener(id)
      } else {
        await adminAPI.toggleBanUser(id)
      }
      setMembers(prev => prev.filter(m => (m._id || m.id) !== id))
      setToast({ visible: true, message: 'Member unbanned successfully', type: 'success' })
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to unban member', type: 'error' })
    } finally {
      setUnbanning(null)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
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
            <IoBan size={18} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Banned Members</h1>
          <div style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'rgba(239,68,68,0.15)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>{filteredMembers.length}</span>
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
            placeholder="Search by name or phone..."
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
      ) : filteredMembers.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px',
        }}>
          <IoShieldCheckmark size={48} color="var(--border)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
            No banned members found
          </p>
        </div>
      ) : (
        <div>
          {filteredMembers.map((member) => {
            const memberId = member._id || member.id
            const name = member.name || 'Unknown'
            const isListener = member.role === 'listener'

            return (
              <div
                key={memberId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: '12px 14px', marginBottom: 10,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 24, flexShrink: 0,
                  backgroundColor: getAvatarColor(name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: '#fff',
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                      {name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      color: isListener ? 'var(--accent)' : '#10B981',
                      backgroundColor: isListener ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)',
                    }}>
                      {isListener ? 'Listener' : 'User'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      color: '#EF4444',
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <IoBan size={10} />
                      BANNED
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {member.phone || 'No phone'}
                  </div>
                </div>

                <button
                  onClick={() => setConfirmTarget(member)}
                  disabled={unbanning === memberId}
                  style={{
                    padding: '8px 16px', borderRadius: 16, border: 'none',
                    background: unbanning === memberId ? 'var(--text-muted)' : '#374151',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {unbanning === memberId ? '...' : 'Unban'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {confirmTarget && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            width: '100%', maxWidth: 360,
            backgroundColor: 'var(--bg-secondary)', borderRadius: 24,
            border: '1.5px solid var(--border)', padding: '28px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <IoShieldCheckmark size={28} color="#10B981" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '0 0 8px', textAlign: 'center' }}>
              Unban Member
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to unban <strong style={{ color: '#fff' }}>{confirmTarget.name || 'this member'}</strong>? They will be able to log back in immediately.
            </p>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 30,
                  border: '1.5px solid #3F3F46',
                  backgroundColor: 'transparent',
                  color: '#A1A1AA', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUnban}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 30, border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Unban
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
