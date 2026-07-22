import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoCall, IoVideocam, IoChatbubble, IoStar, IoStarOutline,
  IoSearch, IoChevronBack, IoTimeOutline, IoCash,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'

const STATUSES = ['All', 'Completed', 'Active', 'Cancelled']

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0 min 0 sec'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} sec`
  return `${m} min ${s} sec`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${month} ${day}, ${year} at ${h12}:${minutes} ${ampm}`
}

function StarRating({ stars }) {
  const arr = []
  for (let i = 1; i <= 5; i++) {
    arr.push(
      i <= stars
        ? <IoStar key={i} size={14} color="#FBBF24" />
        : <IoStarOutline key={i} size={14} color="#3F3F46" />
    )
  }
  return <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>{arr}</div>
}

function CallTypeIcon({ type, size = 14 }) {
  if (type === 'video') return <IoVideocam size={size} />
  if (type === 'chat') return <IoChatbubble size={size} />
  return <IoCall size={size} />
}

function CallTypeBadge({ type }) {
  const config = {
    audio: { bg: 'var(--accent-light)', color: 'var(--accent)', label: 'Audio' },
    video: { bg: 'var(--info-light)', color: 'var(--info)', label: 'Video' },
    chat: { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'Chat' },
  }
  const c = config[type] || config.audio
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      backgroundColor: c.bg, color: c.color,
      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700,
    }}>
      <CallTypeIcon type={type} size={13} />
      {c.label}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    completed: { bg: 'var(--success-light)', color: 'var(--success)' },
    active: { bg: 'var(--info-light)', color: 'var(--info)' },
    cancelled: { bg: 'var(--error-light)', color: 'var(--error)' },
    missed: { bg: 'var(--warning-light)', color: 'var(--warning)' },
  }
  const c = config[status] || config.cancelled
  return (
    <div style={{
      backgroundColor: c.bg, color: c.color,
      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700,
      textTransform: 'capitalize',
    }}>
      {status}
    </div>
  )
}

function ParticipantAvatar({ name, avatar, isDeleted }) {
  const initial = (name?.[0] || '?').toUpperCase()
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDeleted ? '#2A1A1A' : 'var(--border)',
      overflow: 'hidden', flexShrink: 0,
      border: isDeleted ? '2px solid #EF444444' : 'none',
    }}>
      {avatar ? (
        <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDeleted ? '#EF4444' : 'var(--text-secondary)', fontSize: 14, fontWeight: 700,
        }}>
          {initial}
        </div>
      )}
    </div>
  )
}

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const debounceRef = useRef(null)
  const fetchRef = useRef(null)
  const LIMIT = 10

  const doFetch = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true)
    else setLoadingMore(true)

    try {
      const currentPage = isLoadMore ? Math.floor(offset / LIMIT) + 1 : 1
      const params = { limit: LIMIT, page: currentPage }
      if (status !== 'All') params.status = status.toLowerCase()
      if (debouncedSearch) params.search = debouncedSearch

      const res = await adminAPI.getSessions(params)
      const data = res.data || res
      const list = data.sessions || data.results || data || []

      if (isLoadMore) {
        setSessions(prev => [...prev, ...list])
      } else {
        setSessions(list)
      }

      const total = data.total || data.totalCount || data.count || (Array.isArray(data) ? data.length : list.length)
      setTotalCount(total)
      setHasMore((isLoadMore ? offset + LIMIT : LIMIT) < total)
    } catch (e) {
      console.error('Failed to fetch sessions:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [status, debouncedSearch, offset])

  fetchRef.current = doFetch

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => {
    setOffset(0)
    setSessions([])
    setHasMore(true)
    setLoading(true)
    fetchRef.current(false)
  }, [status, debouncedSearch])

  useEffect(() => {
    if (offset > 0) {
      fetchRef.current(true)
    }
  }, [offset])

  const handleLoadMore = () => {
    setOffset(prev => prev + LIMIT)
  }

  const handleStatusChange = (s) => {
    setStatus(s)
  }

  const navigate = useNavigate()

  return (
    <div style={{ padding: 'var(--page-padding)' }}>
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
            <IoCall size={18} color="#fff" />
          </div>
          <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Sessions</h1>
          <div style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalCount}</span>
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
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder="Search by caller or listener name..."
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

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {STATUSES.map(s => {
          const isActive = status === s
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                backgroundColor: isActive ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {s}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={200} borderRadius={16} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
        }}>
          <IoCall size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>No sessions found</p>
          <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <>
          {sessions.map(session => (
            <div
              key={session.id || session._id}
              style={{
                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 20, marginBottom: 16,
              }}
            >
              {/* Header: type badge + status + date */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CallTypeBadge type={session.callType || session.type} />
                  <StatusBadge status={session.status} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(session.createdAt)}</span>
              </div>

              {/* Participants */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <ParticipantAvatar
                    name={session.callerName || session.userName}
                    avatar={session.callerAvatar}
                    isDeleted={session.isCallerDeleted}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: session.isCallerDeleted ? '#EF4444' : '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {session.isCallerDeleted ? 'Deleted Caller' : (session.callerName || session.userName || 'Unknown Caller')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Caller</div>
                  </div>
                </div>
                <div style={{
                  color: '#3F3F46', fontSize: 11, fontWeight: 600,
                  padding: '4px 8px', borderRadius: 8,
                  backgroundColor: 'var(--bg-tertiary)',
                }}>
                  with
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right', minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: session.isListenerDeleted ? '#EF4444' : '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {session.isListenerDeleted ? 'Deleted Listener' : (session.listenerName || 'Unknown Listener')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Listener</div>
                  </div>
                  <ParticipantAvatar
                    name={session.listenerName}
                    avatar={session.listenerAvatar}
                    isDeleted={session.isListenerDeleted}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
                padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 12,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px',
                }}>
                  <IoTimeOutline size={16} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatDuration(session.duration)}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px',
                }}>
                  <IoCash size={16} color="#FBBF24" />
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Coins Spent</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{session.coinsSpent ?? 0}</div>
                  </div>
                </div>
                {session.gifts && session.gifts.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px',
                  }}>
                    <IoCash size={16} color="#A78BFA" />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>Gifts</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {session.gifts.length} ({session.gifts.reduce((sum, g) => sum + (g.price * g.quantity), 0)})
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Rating */}
              {session.rating && (
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)', borderRadius: 10, padding: '12px 14px', marginBottom: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: session.rating.feedback ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rating:</span>
                    <StarRating stars={session.rating.stars} />
                  </div>
                  {session.rating.feedback && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      &ldquo;{session.rating.feedback}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div key="load-more" style={{ textAlign: 'center', padding: '20px 0' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '12px 40px', borderRadius: 999, border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-tertiary)', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: loadingMore ? 'not-allowed' : 'pointer', opacity: loadingMore ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
