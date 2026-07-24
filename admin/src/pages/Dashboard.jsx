import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI, authAPI } from '../utils/api'

const navigateTo = (navigate, path) => {
  window.scrollTo(0, 0)
  navigate(path)
}
import {
  IoMegaphone, IoShieldCheckmark, IoFlag, IoCall, IoWallet,
  IoCash, IoStatsChart, IoArrowForward, IoPeople, IoHeadset,
  IoRefresh, IoClose, IoPulse,
} from 'react-icons/io5'
import { StatCard, SectionTitle, ActivityItem } from '../components/admin/AdminComponents'
import { AdminPageSkeleton } from '../components/admin/Skeleton'
import LogoutPopup from '../components/shared/LogoutPopup'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts'

const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K'
  return n.toLocaleString()
}

const formatCurrency = (n) => {
  if (!n && n !== 0) return '0 coins'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M coins'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K coins'
  return Math.round(n).toLocaleString() + ' coins'
}

const getRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return diffMin + 'm ago'
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return diffHr + 'h ago'
  const diffDay = Math.floor(diffHr / 24)
  return diffDay + 'd ago'
}

const formatActivityTime = (dateStr) => {
  if (!dateStr) return { time: '', exactTime: '' }
  const d = new Date(dateStr)
  return {
    time: getRelativeTime(dateStr),
    exactTime: d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

function AnimatedNumber({ value, format, duration = 1200 }) {
  const [animated, setAnimated] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef()

  useEffect(() => {
    const startVal = prevRef.current
    const diff = value - startVal
    if (diff === 0) {
      setAnimated(value)
      return
    }
    const startTime = performance.now()

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimated(startVal + diff * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return format ? format(animated) : Math.round(animated).toLocaleString()
}

const modules = [
  { label: 'Sessions', icon: IoCall, path: '/sessions', color: '#A855F7', badgeKey: 'totalCalls' },
  { label: 'Approvals', icon: IoShieldCheckmark, path: '/approvals', color: '#7C6FF7', badgeKey: 'pendingApprovals' },
  { label: 'Payouts', icon: IoCash, path: '/payouts', color: '#8B5CF6', badgeKey: 'pendingPayout' },
  { label: 'Analytics', icon: IoStatsChart, path: '/analytics', color: '#EC4899', badgeKey: null },
  { label: 'Wallet', icon: IoWallet, path: '/wallet', color: '#F59E0B', badgeKey: null },
  { label: 'Campaigns', icon: IoMegaphone, path: '/notifications', color: '#F97316', badgeKey: null },
  { label: 'Reports', icon: IoFlag, path: '/reports', color: '#EF4444', badgeKey: 'pendingReports' },
]

const ErrorBanner = ({ message, onRetry, onDismiss }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginBottom: 'var(--section-gap)',
  }}>
    <button
      onClick={onDismiss}
      style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      title="Dismiss"
    >
      <IoClose size={16} color="#EF4444" />
    </button>
    <span style={{ flex: 1, fontSize: 13, color: '#FCA5A5', fontWeight: 500 }}>
      {message}
    </span>
    <button
      onClick={onRetry}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        color: '#EF4444',
        fontSize: 12, fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)' }}
    >
      <IoRefresh size={14} /> Retry
    </button>
  </div>
)

const CustomTooltip = ({ active, payload, label, formatter, color }) => {
  if (!active || !payload || !payload.length) return null
  const currentColor = color || (payload[0] && payload[0].color) || '#8B5CF6'
  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: `1px solid ${currentColor}40`,
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
      minWidth: 180,
      animation: 'slideUpFade 0.12s ease-out',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: p.color || currentColor }} />
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{p.name || p.dataKey}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: p.color || currentColor }}>{formatter ? formatter(p.value) : formatNumber(p.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutPopup, setShowLogoutPopup] = useState(false)
  const [error, setError] = useState(null)
  const [animateIn, setAnimateIn] = useState(false)
  const [revenueData, setRevenueData] = useState([])
  const [registrationData, setRegistrationData] = useState([])
  const [retrying, setRetrying] = useState(false)

  const safeRevenueData = useMemo(() => revenueData || [], [revenueData])
  const safeRegistrationData = useMemo(() => registrationData || [], [registrationData])

    const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getStats()
      const data = res.data || res
      setStats(data)
      const revData = (data.charts?.dailyRevenue || []).map(d => ({ month: d._id, revenue: d.amount }))
      const regData = (data.charts?.dailyRegistrations || []).map(d => ({ month: d._id, signups: d.count }))
      setRevenueData(revData)
      setRegistrationData(regData)
      try {
        const actsRes = await adminAPI.getActivities(5)
        const actsData = actsRes.data || actsRes
        const activitiesList = Array.isArray(actsData) ? actsData : (actsData.activities || [])
        setActivities(activitiesList)
      } catch {
        setActivities([])
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message || 'Failed to load data from backend')
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnimateIn(true), 80)
      return () => clearTimeout(t)
    }
  }, [loading])

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    setShowLogoutPopup(false)
    navigate('/login')
  }

  const s = stats || {}

  const dailyRevenue = s.charts?.dailyRevenue || []
  const dailyRegistrations = s.charts?.dailyRegistrations || []

  const totalUsers = s.totalUsers || 0
  const totalListeners = s.totalListeners || 0
  const totalRevenue = s.totalRevenue || 0
  const totalSessions = s.totalCalls || 0

  const listenerShare = totalUsers ? (totalListeners / totalUsers) * 100 : 0
  const nonListenerUsers = Math.max(0, totalUsers - totalListeners)
  const sessionRate = totalUsers ? totalSessions / totalUsers : 0
  const revenuePerUser = totalUsers ? totalRevenue / totalUsers : 0
  const userGrowth = dailyRegistrations.reduce((a, b) => a + b.count, 0)

  const audienceData = [
    { name: 'Listeners', value: totalListeners, color: '#A855F7' },
    { name: 'Other members', value: nonListenerUsers, color: '#10B981' },
  ]

  const peakRevenue = dailyRevenue.length > 0 ? Math.max(...dailyRevenue.map(d => d.amount)) : 0
  const dailyAvgRevenue = dailyRevenue.length > 0
    ? dailyRevenue.reduce((a, b) => a + b.amount, 0) / dailyRevenue.length
    : 0
  const peakSignups = dailyRegistrations.length > 0 ? Math.max(...dailyRegistrations.map(d => d.count)) : 0
  const dailyAvgSignups = dailyRegistrations.length > 0
    ? dailyRegistrations.reduce((a, b) => a + b.count, 0) / dailyRegistrations.length
    : 0

    const pulseData = [
    {
      name: 'Revenue Flow',
      value: Math.round(Math.min(100, peakRevenue ? (dailyAvgRevenue / peakRevenue) * 120 : 0)),
      display: formatCurrency(Math.round(dailyAvgRevenue)),
      color: '#A855F7',
    },
    {
      name: 'Signup Surge',
      value: Math.round(Math.min(100, peakSignups ? (dailyAvgSignups / peakSignups) * 120 : 0)),
      display: formatNumber(Math.round(dailyAvgSignups)),
      color: '#F59E0B',
    },
    {
      name: 'Session Pace',
      value: Math.round(Math.min(100, sessionRate * 10)),
      display: `${sessionRate.toFixed(1)} / user`,
      color: '#10B981',
    },
  ]

  const sparkRevenue = useMemo(() => {
    const rev = safeRevenueData.slice(-14)
    return rev.length > 0 ? rev : [{ month: '', revenue: 0 }]
  }, [safeRevenueData])

  const sparkRegistrations = useMemo(() => {
    const reg = safeRegistrationData.slice(-14)
    return reg.length > 0 ? reg : [{ month: '', signups: 0 }]
  }, [safeRegistrationData])

  const sectionStyle = (delay) => ({
    animation: animateIn ? `slideUp 0.5s ${delay}s ease-out both` : 'none',
  })

  if (loading) return <AdminPageSkeleton type="dashboard" />

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--page-padding)' }}>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .dashboard-momentum-rings {
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 16px;
        }
        .momentum-ring {
          padding: 18px;
          border-radius: var(--radius-xl);
          background-color: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .momentum-ring-graphic {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        .momentum-ring-center {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--bg-secondary);
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
        }
        .momentum-ring-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          text-transform: uppercase;
          text-align: center;
        }
        .momentum-ring-display {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          text-align: center;
        }
        @media (max-width: 600px) {
          .dashboard-momentum-rings {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px;
          }
          .momentum-ring {
            padding: 10px;
            gap: 8px;
          }
          .momentum-ring-graphic {
            width: 72px;
            height: 72px;
          }
          .momentum-ring-center {
            width: 44px;
            height: 44px;
          }
          .momentum-ring-center div {
            font-size: 13px !important;
          }
          .momentum-ring-label {
            font-size: 9px;
          }
          .momentum-ring-display {
            font-size: 12px;
          }
          .dashboard-audience-pulse .ap-flex {
            gap: 10px !important;
          }
          .dashboard-audience-pulse .ap-chart {
            min-height: 180px !important;
            min-width: 180px !important;
          }
          .dashboard-audience-pulse .ap-chart .recharts-responsive-container {
            height: 180px !important;
          }
          .dashboard-audience-pulse .ap-chart > div:last-child div:first-child {
            font-size: 20px !important;
          }
          .dashboard-audience-pulse .ap-chart > div:last-child div:last-child {
            font-size: 11px !important;
          }
          .dashboard-audience-pulse .ap-chart > div:nth-child(2) {
            top: 8px !important;
          }
          .dashboard-audience-pulse .ap-stats {
            gap: 6px !important;
          }
          .dashboard-audience-pulse .ap-stats > div {
            padding: 8px 10px !important;
            gap: 8px !important;
          }
          .dashboard-audience-pulse .ap-stats > div > div:first-child div:first-child {
            font-size: 9px !important;
          }
          .dashboard-audience-pulse .ap-stats > div > div:first-child div:nth-child(2) {
            font-size: 13px !important;
            margin-top: 3px !important;
          }
          .dashboard-audience-pulse .ap-stats > div > div:first-child div:nth-child(3) {
            font-size: 9px !important;
            margin-top: 2px !important;
          }
          .dashboard-audience-pulse .ap-stats > div > div:last-child {
            width: 12px !important;
            height: 12px !important;
          }
          .dashboard-audience-pulse .ap-stats > div > div:last-child > div {
            width: 5px !important;
            height: 5px !important;
          }
          .dashboard-sparkline-column .section-card {
            padding: 10px !important;
          }
          .dashboard-sparkline-column .section-card > div:first-child > div:first-child {
            font-size: 9px !important;
          }
          .dashboard-sparkline-column .section-card > div:first-child > div:nth-child(2) {
            font-size: 15px !important;
            margin-top: 1px !important;
          }
          .dashboard-sparkline-column .section-card > div:first-child > div:nth-child(3) {
            font-size: 9px !important;
          }
          .dashboard-sparkline-column .section-card > div:last-child {
            height: 40px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={sectionStyle(0)}>
        <div className="page-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--section-gap)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent), #A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'float 3s ease-in-out infinite',
            }}>
              <IoPulse size={20} color="#fff" />
            </div>
            <div>
              <h1 className="page-header-title" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--header-font-size)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Platform overview &amp; key metrics
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/notifications')}
              style={{
                width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <IoMegaphone size={17} />
            </button>
            <button
              onClick={() => { setLoading(true); fetchData() }}
              style={{
                width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <IoRefresh size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={sectionStyle(0.05)}>
          <ErrorBanner
            message={error}
            onRetry={() => { setLoading(true); setError(null); setRetrying(true); fetchData() }}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* Animated Stats Grid */}
      <div style={sectionStyle(0.1)}>
        <div className="stat-cards" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 'var(--section-gap)',
        }}>
          <StatCard
            title="Total Users"
            value={<AnimatedNumber value={totalUsers} format={formatNumber} />}
            icon={<IoPeople size={16} color="var(--accent)" />}
            subtitle="Registered accounts"
          />
          <StatCard
            title="Listeners"
            value={<AnimatedNumber value={totalListeners} format={formatNumber} />}
            icon={<IoHeadset size={16} color="#A855F7" />}
            subtitle="Active voice agents"
          />
          <StatCard
            title="Revenue"
            value={<AnimatedNumber value={totalRevenue} format={formatCurrency} />}
            icon={<IoWallet size={16} color="#10B981" />}
            subtitle="Total earnings"
          />
          <StatCard
            title="Sessions"
            value={<AnimatedNumber value={totalSessions} format={formatNumber} />}
            icon={<IoCall size={16} color="#F59E0B" />}
            subtitle="Completed calls"
          />
        </div>
      </div>

      {/* Audience Pulse + Sparkline Row */}
      <div className="dashboard-audience-row grid-2-mobile" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--section-gap)',
        marginBottom: 'var(--section-gap)',
      }}>
        {/* Audience Pulse */}
        <div className="dashboard-audience-pulse" style={sectionStyle(0.15)}>
          <div className="section-card" style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: 'var(--card-padding)',
            borderTop: '3px solid var(--accent)',
            height: '100%',
          }}>
            <SectionTitle>Audience Pulse</SectionTitle>
            <div className="ap-flex" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <div className="ap-chart" style={{ minHeight: 200, minWidth: 200, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={audienceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={4}
                      stroke="transparent"
                      isAnimationActive={true}
                      animationBegin={200}
                      animationDuration={800}
                    >
                      {audienceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(v) => formatNumber(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{Math.round(listenerShare)}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Listeners</div>
                  </div>
                </div>
              </div>
              <div className="ap-stats" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PulseStat label="Total listeners" value={formatNumber(totalListeners)} accent="#A855F7" subtext={`${listenerShare.toFixed(1)}% of users`} />
                <PulseStat label="Non-listeners" value={formatNumber(nonListenerUsers)} accent="#10B981" subtext={`${(100 - listenerShare).toFixed(1)}% of users`} />
                <PulseStat label="Avg sessions/user" value={sessionRate.toFixed(1)} accent="#F59E0B" subtext="Engagement metric" />
              </div>
            </div>
          </div>
        </div>

        {/* Sparkline Cards */}
        <div className="dashboard-sparkline-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
          <div style={sectionStyle(0.2)}>
            <div className="section-card" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              padding: 'var(--card-padding)',
              borderTop: '3px solid #A855F7',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue Trend</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginTop: 4 }}>
                    <AnimatedNumber value={dailyAvgRevenue} format={formatCurrency} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Daily average</div>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 12, backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', fontSize: 11, fontWeight: 700 }}>
                  {sparkRevenue.length}d
                </div>
              </div>
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkRevenue}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#A855F7" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={2} fill="url(#revGrad)" dot={false} isAnimationActive={true} animationDuration={1000} />
                    <XAxis dataKey="month" hide />
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} color="#A855F7" />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={sectionStyle(0.25)}>
            <div className="section-card" style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              padding: 'var(--card-padding)',
              borderTop: '3px solid #F59E0B',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signups Trend</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginTop: 4 }}>
                    <AnimatedNumber value={dailyAvgSignups} format={formatNumber} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Daily average</div>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontSize: 11, fontWeight: 700 }}>
                  +{formatNumber(userGrowth)} total
                </div>
              </div>
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkRegistrations}>
                    <defs>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="signups" stroke="#F59E0B" strokeWidth={2} fill="url(#regGrad)" dot={false} isAnimationActive={true} animationDuration={1000} />
                    <XAxis dataKey="month" hide />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip content={<CustomTooltip formatter={(v) => formatNumber(v)} color="#F59E0B" />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Momentum Dashboard section separator */}
      <div style={sectionStyle(0.3)}>
        <div className="section-card" style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: 'var(--card-padding)',
          marginBottom: 'var(--section-gap)',
          borderTop: '3px solid var(--accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <SectionTitle>Momentum Dashboard</SectionTitle>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Trend scores relative to peak performance</span>
          </div>
          <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1.25fr minmax(260px, 1fr)', gap: 18, alignItems: 'center' }}>
            <div className="momentum-rings-wrapper" style={{ minHeight: 300 }}>
              <div className="dashboard-momentum-rings">
                {pulseData.map((item) => (
                  <div key={item.name} className="momentum-ring">
                    <div
                      className="momentum-ring-graphic"
                      style={{
                        background: `conic-gradient(${item.color} ${item.value * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                      }}
                    >
                      <div className="momentum-ring-center">
                        <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}%</div>
                      </div>
                    </div>
                    <div className="momentum-ring-label">{item.name}</div>
                    <div className="momentum-ring-display">{item.display}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {pulseData.map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '16px 18px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}50`; e.currentTarget.style.backgroundColor = '#232323' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{item.display}</div>
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: `${item.color}20`, display: 'grid', placeItems: 'center', color: item.color, fontWeight: 800, fontSize: 13 }}>
                      {item.value}%
                    </div>
                  </div>
                  <div style={{ marginTop: 8, width: '100%', height: 4, borderRadius: 2, backgroundColor: 'var(--bg-hover)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${item.value}%`, height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                      transition: 'width 1s ease-out',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Management Modules */}
      <div style={sectionStyle(0.4)}>
        <div className="section-card" style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: 'var(--card-padding)',
          marginBottom: 'var(--section-gap)',
        }}>
          <SectionTitle>Management</SectionTitle>
          <div className="modules-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {modules.map((mod) => {
              const Icon = mod.icon
              const badge = mod.badgeKey ? s[mod.badgeKey] : null
              return (
                <button
                  key={mod.label}
                  className="module-btn"
                  onClick={() => navigateTo(navigate, mod.path)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 8, padding: '20px 12px',
                    borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    position: 'relative', fontFamily: 'var(--font-body)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = mod.color + '50'
                    e.currentTarget.style.backgroundColor = '#232323'
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                    e.currentTarget.style.boxShadow = `0 8px 25px ${mod.color}15`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {badge !== null && badge > 0 && (
                    <div className="module-badge" style={{
                      position: 'absolute', top: 8, right: 8,
                      minWidth: 20, height: 20, borderRadius: 10,
                      backgroundColor: mod.color, color: '#fff',
                      fontSize: 10, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px',
                    }}>
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                  <div className="module-icon" style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                    backgroundColor: mod.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s',
                  }}>
                    <Icon size={22} color={mod.color} />
                  </div>
                  <span className="module-label" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {mod.label}
                  </span>
                  <IoArrowForward className="module-arrow" size={13} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div style={sectionStyle(0.45)}>
        <div className="section-card" style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: 'var(--card-padding)',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionTitle>Recent Activities</SectionTitle>
            <button
              onClick={() => navigateTo(navigate, '/activities')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)',
                cursor: 'pointer', color: 'var(--accent)',
                fontSize: 11, fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-mid)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
            >
              View All <IoArrowForward size={12} />
            </button>
          </div>
          {activities.length > 0 ? (
            activities.map((act, i) => {
              const { time, exactTime } = formatActivityTime(act.createdAt || act.timestamp)
              return (
                <div key={act._id || act.id || i} style={{ animation: `slideUp 0.3s ${0.5 + i * 0.08}s ease-out both` }}>
                  <ActivityItem
                    activity={{
                      user: act.userName || act.user?.name || act.user || 'Unknown',
                      action: act.action || act.description || act.message || 'No details',
                      time,
                      exactTime,
                      color: act.color || 'var(--info)',
                    }}
                    isLast={i === activities.length - 1}
                  />
                </div>
              )
            })
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No recent activities
            </div>
          )}
        </div>
      </div>

      <LogoutPopup
        visible={showLogoutPopup}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutPopup(false)}
      />
    </div>
  )
}

function PulseStat({ label, value, accent, subtext }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px' }}>{label}</div>
        <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        {subtext && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>{subtext}</div>}
      </div>
      <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: `${accent}20`, border: `2px solid ${accent}`, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: accent }} />
      </div>
    </div>
  )
}
