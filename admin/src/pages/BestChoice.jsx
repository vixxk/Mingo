import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoAdd, IoClose, IoSearch, IoStar, IoCalendar, IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

const colors = ['var(--accent)', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#7C3AED']

function getAvatarColor(name) {
  let hash = 0
  if (!name) return colors[0]
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function BestChoice() {
  const navigate = useNavigate()
  const [listeners, setListeners] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchBestChoice = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getListeners({ bestChoice: true })
      const responseData = res.data || res || {}
      const allListeners = responseData.listeners || responseData || []
      const bestChoiceListeners = Array.isArray(allListeners) 
        ? allListeners.filter(l => l.bestChoice || l.isBestChoice) 
        : []
      setListeners(bestChoiceListeners)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load best choice listeners', type: 'error' })
      setListeners([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBestChoice()
  }, [fetchBestChoice])

  useEffect(() => {
    if (!showModal || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await adminAPI.getListeners({ status: 'approved', search: searchQuery })
        const data = res.data || res.listeners || res || []
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, showModal])

  const handleToggleBestChoice = async (listener) => {
    const id = listener._id || listener.id
    setActionLoading(id)
    try {
      await adminAPI.toggleBestChoice(id)
      if (listener.isBestChoice) {
        setListeners(prev => prev.filter(l => (l._id || l.id) !== id))
        setToast({ visible: true, message: `${listener.name} removed from Best Choice`, type: 'success' })
      } else {
        const updated = { ...listener, isBestChoice: true }
        setListeners(prev => [...prev, updated])
        setSearchResults(prev => prev.filter(r => (r._id || r.id) !== id))
        setToast({ visible: true, message: `${listener.name} added as Best Choice`, type: 'success' })
      }
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to toggle best choice', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const avatarStyle = (name, size = 44) => ({
    width: size, height: size, borderRadius: '50%',
    backgroundColor: getAvatarColor(name),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  })

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12,
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <IoChevronBack size={20} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 'var(--header-font-size)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Best Choice</h1>
            <span style={{
              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
              padding: '2px 10px', borderRadius: 20, border: '1px solid var(--border)',
            }}>
              {listeners.length} listener{listeners.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            backgroundColor: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <IoAdd size={18} />
          Add
        </button>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 15 }} />
          ))}
        </div>
      ) : listeners.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>&#9734;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No Best Choice Listeners</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Click the add button to designate a Best Choice listener.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listeners.map(listener => {
            const id = listener._id || listener.id
            const loading = actionLoading === id
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
              }}>
                <div style={avatarStyle(listener.name)}>
                  <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                    {getInitials(listener.name)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                      {listener.name || 'Unknown'}
                    </span>
                    <span style={{
                      color: 'var(--accent)', fontSize: 10, fontWeight: 700, padding: '1px 6px',
                      borderRadius: 10, backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)',
                    }}>
                      Best Choice
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{listener.phone || '—'}</span>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    {(listener.rating ?? listener.avgRating) != null && (
                      <span style={{ color: '#F59E0B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <IoStar size={12} />
                        {(listener.rating ?? listener.avgRating).toFixed(1)}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <IoCalendar size={12} />
                      {listener.totalSessions ?? listener.sessionCount ?? 0} sessions
                    </span>
                  </div>
                </div>
                <button onClick={() => handleToggleBestChoice(listener)} disabled={loading}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: '1px solid #EF4444',
                    backgroundColor: '#1A0B0B', color: '#EF4444', fontSize: 12, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                  {loading ? '...' : 'Remove'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflow: 'auto', padding: 20,
          }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, backgroundColor: 'var(--bg-secondary)',
            borderRadius: 24, border: '1px solid var(--border)', marginTop: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                Add Best Choice Listener
              </span>
              <button onClick={() => setShowModal(false)}
                style={{
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 10,
                  width: 34, height: 34, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer',
                }}>
                <IoClose size={18} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <IoSearch size={16} color="var(--text-muted)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search approved listeners..." autoFocus
                  style={{
                    width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: '#fff', padding: '10px 12px 10px 36px',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }} />
              </div>
            </div>

            <div style={{ padding: 12, maxHeight: 400, overflow: 'auto' }}>
              {searching ? (
                <div style={{ padding: 20 }}>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} width="100%" height={70} borderRadius={12}
                      style={{ marginBottom: 10 }} />
                  ))}
                </div>
              ) : !searchQuery.trim() ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                  Type to search approved listeners
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
                  No listeners found
                </div>
              ) : (
                searchResults.map(listener => {
                  const id = listener._id || listener.id
                  const alreadyBestChoice = listeners.some(l => (l._id || l.id) === id)
                  const loading = actionLoading === id
                  return (
                    <div key={id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                      borderRadius: 'var(--radius-md)', marginBottom: 6,
                      backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    }}>
                      <div style={avatarStyle(listener.name, 40)}>
                        <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                          {getInitials(listener.name)}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 1,
                        }}>
                          {listener.name || 'Unknown'}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {listener.phone || '—'}
                        </span>
                        {listener.skills && listener.skills.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
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
                      <button onClick={() => handleToggleBestChoice(listener)}
                        disabled={loading || alreadyBestChoice}
                        style={{
                          padding: '8px 14px', borderRadius: 10, border: 'none',
                          backgroundColor: alreadyBestChoice
                            ? 'var(--border)' : loading ? 'var(--text-muted)' : '#10B981',
                          color: alreadyBestChoice ? 'var(--text-muted)' : '#fff',
                          fontSize: 12, fontWeight: 700,
                          cursor: (loading || alreadyBestChoice) ? 'not-allowed' : 'pointer',
                          opacity: (loading || alreadyBestChoice) ? 0.6 : 1,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                        {loading ? '...' : alreadyBestChoice ? 'Added' : 'Add'}
                      </button>
                    </div>
                  )
                })
              )}
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
