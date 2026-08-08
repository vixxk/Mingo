import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChatbubble, IoChevronBack, IoChevronForward,
  IoSearch,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'
import { formatDate } from '../components/admin/ChatMessage'

const presetBtnStyle = (isActive) => ({
  padding: '6px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid',
  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
  backgroundColor: isActive ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'all 0.2s',
})

function CalendarDatePicker({ value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date(value || new Date()))
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value))
      setSelectedDate(new Date(value))
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const handleDayClick = (day) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    setSelectedDate(d)
    onChange(d.toISOString().split('T')[0])
    setIsOpen(false)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const totalDays = daysInMonth(year, month)
  const startDay = firstDayOfMonth(year, month)

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  }

  const isToday = (d) => {
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  const weeks = []
  let week = []
  for (let i = 0; i < startDay; i++) {
    week.push(null)
  }
  for (let day = 1; day <= totalDays; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <input
        type="text"
        value={value || ''}
        readOnly
        placeholder={placeholder || 'Select date'}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: '#fff',
          fontSize: 12, outline: 'none', fontFamily: 'var(--font-body)',
          cursor: 'pointer', width: 140,
        }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 12, marginTop: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 220,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={handlePrevMonth} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <IoChevronBack size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <IoChevronForward size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {dayNames.map(d => (
              <div key={d} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>
                {d}
              </div>
            ))}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'contents' }}>
                {week.map((day, di) => {
                  const dateObj = day ? new Date(year, month, day) : null
                  const isSelected = selectedDate && dateObj && isSameDay(selectedDate, dateObj)
                  const isTodayDate = dateObj && isToday(dateObj)
                  return (
                    <button
                      key={`${wi}-${di}`}
                      onClick={() => day && handleDayClick(day)}
                      disabled={!day}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', border: 'none',
                        backgroundColor: isSelected ? 'var(--accent)' : isTodayDate ? 'var(--accent-mid)' : 'transparent',
                        color: isSelected ? '#fff' : day ? 'var(--text-primary)' : 'transparent',
                        fontSize: 12, fontWeight: isSelected ? 700 : 400,
                        cursor: day ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantAvatar({ participant, size = 40, support = false }) {
  if (support) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size / 2,
        background: 'linear-gradient(135deg, #FBBF24, #D97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, flexShrink: 0, color: '#fff',
      }}>
        🛡️
      </div>
    )
  }
  const getAvatarUrl = (g, idx) => {
    const base = 'https://mingo-avatars.s3.amazonaws.com'
    return `${base}/${g}_${idx}.png`
  }
  return (
    <img
      src={getAvatarUrl(participant?.gender || 'Female', participant?.avatarIndex || 0)}
      alt=""
      style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

function RoleTag({ role, support }) {
  const label = support ? 'Support' : role === 'USER' ? 'User' : role === 'LISTENER' ? 'Listener' : (role || '')
  const color = support ? '#FBBF24' : role === 'USER' ? '#A78BFA' : role === 'LISTENER' ? '#22D3EE' : 'var(--text-muted)'
  const bg = support ? 'rgba(251,191,36,0.12)' : role === 'USER' ? 'rgba(139,92,246,0.12)' : role === 'LISTENER' ? 'rgba(34,211,238,0.12)' : 'var(--bg-tertiary)'
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
      color, backgroundColor: bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

const sessionStatusMeta = {
  active: { label: 'Active', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.12)' },
  completed: { label: 'Completed', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' },
  cancelled: { label: 'Cancelled', color: '#F87171', bg: 'rgba(248, 113, 113, 0.12)' },
  free: { label: 'Free Chat', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.12)' },
}

function SessionCard({ session, onClick }) {
  const participants = session.participants || []
  const isAdmin = session.isAdminConversation
  const msgCount = session.messageCount
  const lastMsg = session.lastMessage
  const sInfo = session.session || null
  const hasSession = sInfo && sInfo.active

  const userPart = participants.find(p => p && p.role === 'USER') || participants[0] || null
  const listenerPart = participants.find(p => p && p.role === 'LISTENER') || null

  const rows = isAdmin
    ? [userPart, { name: 'Mingo Support', role: 'ADMIN', support: true }].filter(Boolean)
    : [userPart, listenerPart].filter(Boolean)

  // One card = ONE session → show that session's own status & stats.
  const statusKey = sInfo ? sInfo.status : 'free'
  const status = sessionStatusMeta[statusKey] || { label: statusKey || 'Free Chat', color: '#9CA3AF', bg: 'var(--bg-tertiary)' }

  const startLabel = sInfo && sInfo.startTime ? formatDate(sInfo.startTime) : ''
  const endLabel = sInfo && sInfo.endTime ? formatDate(sInfo.endTime) : ''
  const durationLabel = sInfo ? `${sInfo.duration || 0} min` : ''
  const coinsLabel = sInfo && sInfo.totalCoinsDeducted > 0 ? sInfo.totalCoinsDeducted : null

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderLeft: `3px solid ${status.color}`,
        borderRadius: 'var(--radius-xl)', padding: 16, marginBottom: 12,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = status.color
        e.currentTarget.style.boxShadow = `0 4px 16px ${status.color}30`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        {/* Stacked dual avatars */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
          {rows[0] && (
            <div style={{
              position: 'relative', zIndex: 2,
              border: '3px solid var(--bg-secondary)', borderRadius: '50%', lineHeight: 0,
            }}>
              <ParticipantAvatar participant={rows[0]} size={44} support={rows[0].support} />
            </div>
          )}
          {rows[1] && (
            <div style={{
              position: 'relative', zIndex: 1, marginLeft: -14,
              border: '3px solid var(--bg-secondary)', borderRadius: '50%', lineHeight: 0,
            }}>
              <ParticipantAvatar participant={rows[1]} size={44} support={rows[1].support} />
            </div>
          )}
          {hasSession && (
            <div style={{
              position: 'absolute', top: -2, right: 0,
              width: 13, height: 13, borderRadius: '50%',
              backgroundColor: '#22C55E', border: '2px solid var(--bg-secondary)',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </div>

        {/* Participant names */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((r, idx) => (
            <div key={`${r.name || 'p'}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.name || 'Unknown'}
              </span>
              <RoleTag role={r.role} support={r.support} />
            </div>
          ))}
        </div>

        {/* Status pill + start time */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: status.color, backgroundColor: status.bg, borderRadius: 6,
            padding: '3px 8px', whiteSpace: 'nowrap',
          }}>
            {status.label}
          </span>
          {startLabel && (
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {startLabel}
            </span>
          )}
        </div>
      </div>

      {/* Session info strip — unique to this session */}
      {(sInfo || msgCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '7px 12px', borderRadius: 10, marginBottom: 10,
          backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        }}>
          {sInfo && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
              ⏱ {durationLabel}
            </span>
          )}
          {coinsLabel != null && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FBBF24' }}>
              🪙 {coinsLabel.toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
            💬 {msgCount} {msgCount === 1 ? 'message' : 'messages'}
          </span>
          {endLabel && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              → Ended {endLabel}
            </span>
          )}
          {!sInfo && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Conversation opened — no paid session
            </span>
          )}
        </div>
      )}

      {lastMsg && (
        <div style={{
          padding: '8px 12px', backgroundColor: 'var(--bg-secondary)',
          borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          border: '1px solid var(--border)', borderLeft: `3px solid ${status.color}`,
        }}>
          {lastMsg.content || lastMsg}
        </div>
      )}
    </div>
  )
}

export default function ChatLogs() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const debounceRef = useRef(null)
  const fetchRef = useRef(null)
  const LIMIT = 20

  const doFetch = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true)
    else setLoadingMore(true)

    try {
      const currentPage = isLoadMore ? Math.floor(offset / LIMIT) + 1 : 1
      const params = { limit: LIMIT, page: currentPage }
      if (debouncedSearch) params.search = debouncedSearch
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await adminAPI.getChatLogs(params)
      const data = res.data || res
      const list = (data.conversations || data.results || data || [])
        .slice()
        .sort((a, b) => {
          const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
          const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
          return tb - ta
        })

      if (isLoadMore) {
        setConversations(prev => [...prev, ...list])
      } else {
        setConversations(list)
      }

      const total = data.total || data.totalCount || data.count || (Array.isArray(data) ? data.length : list.length)
      setTotalCount(total)
      setHasMore((isLoadMore ? offset + LIMIT : LIMIT) < total)
    } catch (e) {
      console.error('Failed to fetch chat logs:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [offset, debouncedSearch, startDate, endDate])

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
    setConversations([])
    setHasMore(true)
    setLoading(true)
    fetchRef.current(false)
  }, [debouncedSearch, startDate, endDate])

  useEffect(() => {
    if (offset > 0) {
      fetchRef.current(true)
    }
  }, [offset])

  const handleLoadMore = () => {
    setOffset(prev => prev + LIMIT)
  }

  const handleSelectConversation = (conv) => {
    navigate(`/chat-logs/${conv.id}`)
  }

  const handlePresetPeriod = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="page-wrap" style={{ padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button className="back-btn"
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
          <div className="icon-box" style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IoChatbubble size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{
            fontSize: 'var(--header-font-size)', fontWeight: 800,
            color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px',
          }}>
            Chat Logs
          </h1>
          <div className="page-header-count" style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Period:
          </span>
          <button onClick={() => handlePresetPeriod(1)} style={presetBtnStyle(startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0])}>Today</button>
          <button onClick={() => handlePresetPeriod(7)} style={presetBtnStyle(false)}>Last 7d</button>
          <button onClick={() => handlePresetPeriod(30)} style={presetBtnStyle(false)}>Last 30d</button>
          <button onClick={() => handlePresetPeriod(90)} style={presetBtnStyle(false)}>Last 90d</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="Start date"
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
          <CalendarDatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="End date"
          />
        </div>
        {(startDate || endDate || search) && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Search */}
      <div className="search-bar" style={{
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
            placeholder="Search by user or listener name..."
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={120} borderRadius={16} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
        }}>
          <IoChatbubble size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>No chat logs found</p>
          <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search terms</p>
        </div>
      ) : (
        <>
          {/* Conversation List */}
          {conversations.map(conv => (
            <SessionCard
              key={conv.id}
              session={conv}
              onClick={() => handleSelectConversation(conv)}
            />
          ))}

          {hasMore && (
            <div className="pagination" key="load-more" style={{ textAlign: 'center', padding: '20px 0' }}>
              <button className="load-more-btn"
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