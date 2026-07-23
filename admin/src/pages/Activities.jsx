import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoPerson, IoHeadset, IoCall, IoWallet, IoConstruct, IoChevronBack,
  IoTimeOutline, IoChevronDown,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'

const TYPE_COLORS = {
  user: '#A855F7',
  listener: 'var(--accent)',
  session: '#10B981',
  payout: '#F59E0B',
  system: 'var(--text-muted)',
}

const TYPE_ICONS = {
  user: IoPerson,
  listener: IoHeadset,
  session: IoCall,
  payout: IoWallet,
  system: IoConstruct,
}

const TABS = ['All', 'User', 'Listener', 'Session', 'Payout', 'System']

const getRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getExactTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const filterKey = (tab) => tab === 'All' ? null : tab.toLowerCase()

function ActivitiesSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 'var(--card-padding)', marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <div style={{ flex: 1 }}>
              <Skeleton width="70%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={12} borderRadius={6} />
            </div>
            <Skeleton width={60} height={12} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Activities() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [offset, setOffset] = useState(0)
  const [tooltipId, setTooltipId] = useState(null)
  const LIMIT = 20

  const fetchActivities = useCallback(async (isLoadMore = false, pageOffset) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      const currentOffset = pageOffset !== undefined ? pageOffset : offset
      const page = Math.floor(currentOffset / LIMIT) + 1
      const res = await adminAPI.getActivities(LIMIT, page)
      const data = res.data || res
      const items = data.activities || []
      if (isLoadMore) {
        setActivities(prev => [...prev, ...items])
      } else {
        setActivities(items)
      }
      setTotal(data.total ?? items.length)
      setHasMore(data.hasMore ?? items.length >= LIMIT)
    } catch (e) {
      console.error('Failed to fetch activities', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [offset])

  useEffect(() => {
    setOffset(0)
    fetchActivities(false, 0)
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = activeTab === 'All'
    ? activities
    : activities.filter(a => a.type === activeTab.toLowerCase())

  const handleLoadMore = (e) => {
    e.preventDefault()
    const newOffset = offset + LIMIT
    setOffset(newOffset)
    fetchActivities(true, newOffset)
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--page-padding)' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          className="back-btn"
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
            <IoConstruct size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
            System Activities
          </h1>
          <div className="page-header-count" style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{total}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs tabs-scroll" style={{
        display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab
          const color = tab === 'All' ? 'var(--accent)' : TYPE_COLORS[tab.toLowerCase()]
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setOffset(0)
              }}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: 'none',
                background: isActive ? `${color}20` : 'var(--bg-tertiary)',
                color: isActive ? color : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
                ...(isActive ? { border: `1px solid ${color}40` } : { border: '1px solid var(--border)' }),
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Activity Count Badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
          Activity Log
        </h2>
        <span style={{
          padding: '2px 10px', borderRadius: 8,
          backgroundColor: 'var(--accent-light)',
          fontSize: 12, fontWeight: 800, color: 'var(--accent)',
        }}>
          {total}
        </span>
      </div>

      {/* Loading State */}
      {loading ? (
        <ActivitiesSkeleton />
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px',
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        }}>
          <IoConstruct size={48} color="var(--border)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
            {activeTab === 'All' ? 'No activities recorded yet' : `No ${activeTab.toLowerCase()} activities`}
          </p>
        </div>
      ) : (
        /* Activity List */
        <div>
          {filtered.map(activity => {
            const Icon = TYPE_ICONS[activity.type] || IoConstruct
            const color = TYPE_COLORS[activity.type] || 'var(--text-muted)'
            return (
              <div
                key={activity._id}
                style={{
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)', padding: 'var(--card-padding)', marginBottom: 10,
                  transition: 'border-color 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={() => setTooltipId(activity._id)}
                onMouseLeave={() => setTooltipId(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} color={color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {activity.action || activity.description || 'Unknown action'}
                    </div>
                    {activity.performedBy && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                        by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activity.performedBy}</span>
                        {activity.targetName && (
                          <span> &rarr; {activity.targetName}</span>
                        )}
                      </div>
                    )}
                    {activity.targetName && !activity.performedBy && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                        {activity.targetName}
                        {activity.targetType && (
                          <span style={{ color: color, fontWeight: 600 }}> ({activity.targetType})</span>
                        )}
                      </div>
                    )}
                  </div>

{/* Time */}
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {getRelativeTime(activity.createdAt)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      {getExactTime(activity.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load More */}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px', borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', color: 'var(--accent)',
                  fontSize: 14, fontWeight: 700, cursor: loadingMore ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                <IoChevronDown size={18} />
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
