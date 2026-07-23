import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI, authAPI } from '../utils/api'

const navigateTo = (navigate, path) => {
  window.scrollTo(0, 0)
  navigate(path)
}
import {
  IoMegaphone, IoTrendingUp, IoCalendarOutline,
  IoTimeOutline, IoShieldCheckmark, IoFlag, IoCall, IoWallet,
  IoCash, IoStatsChart, IoArrowForward, IoPeople, IoHeadset,
  IoRefresh, IoClose,
} from 'react-icons/io5'
import { StatCard, SectionTitle, ActivityItem } from '../components/admin/AdminComponents'
import { AdminPageSkeleton } from '../components/admin/Skeleton'
import LogoutPopup from '../components/shared/LogoutPopup'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'

// Format date as YYYY-MM-DD using local timezone (avoids UTC date shifts from toISOString)
const formatLocalDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Parse YYYY-MM-DD or YYYY-MM as local midnight (avoids UTC date shift from new Date())
const parseLocalDate = (dateStr) => {
  const parts = dateStr.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const day = parts.length > 2 ? parseInt(parts[2]) : 1
  return new Date(year, month, day)
}

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

const formatChartLabel = (value, granularity) => {
  if (!value) return ''
  const date = parseLocalDate(value)
  if (date.toString() === 'Invalid Date') return value
  if (granularity === 'monthly') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatTooltipLabel = (value, granularity) => {
  if (!value) return ''
  const date = parseLocalDate(value)
  if (date.toString() === 'Invalid Date') return value
  if (granularity === 'weekly') {
    const end = new Date(date)
    end.setDate(date.getDate() + 6)
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  if (granularity === 'monthly') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
  const [revenueData, setRevenueData] = useState([])
  const [registrationData, setRegistrationData] = useState([])
  const [revenueGranularity, setRevenueGranularity] = useState('weekly')
  const [registrationGranularity, setRegistrationGranularity] = useState('weekly')
  const [revenueChartMode, setRevenueChartMode] = useState('area') // 'area' or 'line'
  const [showMovingAvg, setShowMovingAvg] = useState(true)
  const [retrying, setRetrying] = useState(false)

  // Helper to aggregate daily data to weekly/monthly
  const aggregateData = useCallback((data, granularity, valueKey) => {
    if (!data || data.length === 0) return []
    const grouped = {}
    data.forEach(item => {
      const date = parseLocalDate(item.month)
      let key
      if (granularity === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = formatLocalDate(weekStart)
      } else if (granularity === 'daily') {
        key = formatLocalDate(date)
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      if (!grouped[key]) {
        grouped[key] = { month: key, [valueKey]: 0 }
      }
      grouped[key][valueKey] += item[valueKey]
    })
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
  }, [])

  // Transform data based on selected granularity
  const transformedRevenueData = useMemo(() => aggregateData(revenueData, revenueGranularity, 'revenue'), [revenueData, revenueGranularity, aggregateData])
  const transformedRegistrationData = useMemo(() => aggregateData(registrationData, registrationGranularity, 'signups'), [registrationData, registrationGranularity, aggregateData])

  const movingAvgWindow = 3
  const movingAvgData = useMemo(() => {
    if (!transformedRevenueData || transformedRevenueData.length === 0) return []
    return transformedRevenueData.map((d, i) => {
      const start = Math.max(0, i - (movingAvgWindow - 1))
      const slice = transformedRevenueData.slice(start, i + 1)
      const avg = slice.reduce((s, x) => s + (x.revenue || 0), 0) / slice.length
      return { month: d.month, avg }
    })
  }, [transformedRevenueData])

  // merge avg into primary data so series are on same x-axis and share tooltip
  const mergedRevenueData = useMemo(() => {
    if (!transformedRevenueData) return []
    const avgMap = new Map(movingAvgData.map(d => [d.month, d.avg]))
    return transformedRevenueData.map(d => ({ ...d, avg: avgMap.get(d.month) ?? null }))
  }, [transformedRevenueData, movingAvgData])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getStats()
      const data = res.data || res
      setStats(data)
      // Transform chart data to match recharts expected format
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

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // ignore
    }
    setShowLogoutPopup(false)
    navigate('/login')
  }

  if (loading) {
    return <AdminPageSkeleton type="dashboard" />
  }

  const s = stats || {}

  // Compute derived stats from charts data
  const dailyRevenue = s.charts?.dailyRevenue || []
  const dailyRegistrations = s.charts?.dailyRegistrations || []
  const peakRevenue = dailyRevenue.length > 0 ? Math.max(...dailyRevenue.map(d => d.amount)) : 0
  const dailyAvgRevenue = dailyRevenue.length > 0 
    ? dailyRevenue.reduce((a, b) => a + b.amount, 0) / dailyRevenue.length 
    : 0
  const activeDays = dailyRevenue.filter(d => d.amount > 0).length
  const peakSignups = dailyRegistrations.length > 0 ? Math.max(...dailyRegistrations.map(d => d.count)) : 0
  const dailyAvgSignups = dailyRegistrations.length > 0
    ? dailyRegistrations.reduce((a, b) => a + b.count, 0) / dailyRegistrations.length
    : 0
  const totalAcquired = dailyRegistrations.reduce((a, b) => a + b.count, 0)

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--page-padding)' }}>
      {/* Header */}        <div className="page-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--section-gap)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

            </div>
            <p style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                margin: '4px 0 0',
              }} className="page-header-sub">
                System Overview
              </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/notifications')}
            style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <IoMegaphone size={18} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => { setLoading(true); setError(null); setRetrying(true); fetchData(); }}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Stats Grid */}
      <div className="stat-cards" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 'var(--section-gap)',
      }}>
        <StatCard
          title="Total Users"
          value={formatNumber(s.totalUsers)}
          icon={<IoPeople size={16} color="var(--accent)" />}
        />
        <StatCard
          title="Listeners"
          value={formatNumber(s.totalListeners)}
          icon={<IoHeadset size={16} color="var(--info)" />}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(s.totalRevenue)}
          icon={<IoWallet size={16} color="var(--success)" />}
        />
        <StatCard
          title="Total Sessions"
          value={formatNumber(s.totalCalls)}
          icon={<IoCall size={16} color="var(--warning)" />}
        />
      </div>

      {/* Revenue Analysis */}
      {revenueData.length > 0 && (
      <div className="section-card" style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: 'var(--card-padding)',
        marginBottom: 'var(--section-gap)',
        borderTop: '3px solid var(--accent)',
      }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle>Revenue Analysis</SectionTitle>
          <div className="chart-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={revenueGranularity}
                onChange={(e) => setRevenueGranularity(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setRevenueChartMode('area')} style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: revenueChartMode === 'area' ? 'var(--accent-mid)' : 'transparent', border: '1px solid var(--border)', color: revenueChartMode === 'area' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>Area</button>
                <button onClick={() => setRevenueChartMode('line')} style={{ padding: '8px 10px', borderRadius: 8, backgroundColor: revenueChartMode === 'line' ? 'var(--accent-mid)' : 'transparent', border: '1px solid var(--border)', color: revenueChartMode === 'line' ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>Line</button>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showMovingAvg} onChange={e => setShowMovingAvg(e.target.checked)} />
              <span>Moving avg</span>
            </label>
          </div>
        </div>

        <div className="chart-container" style={{ height: 320, marginBottom: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            {revenueChartMode === 'area' ? (
              <AreaChart data={mergedRevenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.6} />
                    <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 5" stroke="var(--border)" vertical={false} horizontal={true} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => formatChartLabel(v, revenueGranularity)} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(1) + 'K' : v} width={60} />
                <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} color="#A855F7" />} labelFormatter={(value) => formatTooltipLabel(value, revenueGranularity)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#A855F7" strokeWidth={2} fill="url(#revG)" dot={{ r: 3 }} />
                {showMovingAvg && <Line type="monotone" dataKey="avg" name="Moving Avg" stroke="#10B981" dot={false} strokeWidth={2} />}
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingTop: 6 }} />
              </AreaChart>
            ) : (
              <LineChart data={mergedRevenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 5" stroke="var(--border)" vertical={false} horizontal={true} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => formatChartLabel(v, revenueGranularity)} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(1) + 'K' : v} width={60} />
                <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} color="#A855F7" />} labelFormatter={(value) => formatTooltipLabel(value, revenueGranularity)} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#A855F7" strokeWidth={2.5} dot={{ r: 3 }} />
                {showMovingAvg && <Line type="monotone" dataKey="avg" name="Moving Avg" stroke="#10B981" dot={false} strokeWidth={2} />}
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingTop: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="insight-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <InsightBox icon={<IoTrendingUp size={16} color="var(--success)" />} label="Peak Revenue" value={formatCurrency(peakRevenue)} />
          <InsightBox icon={<IoCalendarOutline size={16} color="var(--info)" />} label="Daily Average" value={formatCurrency(dailyAvgRevenue)} />
          <InsightBox icon={<IoTimeOutline size={16} color="var(--warning)" />} label="Active Days" value={activeDays.toLocaleString() || '-'} />
        </div>
      </div>
      )}

      {/* Registration Analysis */}
      {registrationData.length > 0 && (
      <div className="section-card" style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: 'var(--card-padding)',
        marginBottom: 'var(--section-gap)',
        borderTop: '3px solid var(--accent)',
      }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle>Registration Analysis</SectionTitle>
          <div style={{ position: 'relative' }}>
            <select
              value={registrationGranularity}
              onChange={(e) => setRegistrationGranularity(e.target.value)}
              style={{
                padding: '8px 36px 8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: 40,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </div>
        <div className="chart-container-sm" style={{ height: 260, marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transformedRegistrationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 5" stroke="var(--border)" vertical={false} horizontal={true} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value) => {
                  const isMonthly = value.split('-').length === 2
                  const date = parseLocalDate(value)
                  if (date.toString() === 'Invalid Date') return value
                  return date.toLocaleDateString('en-US', isMonthly ? { month: 'short' } : { month: 'short', day: 'numeric' })
                }}
                interval={'preserveStartEnd'}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                tickFormatter={(v) => v >= 1000 ? formatNumber(v) : v}
                tickCount={5}
                width={40}
              />
              <Tooltip content={<CustomTooltip formatter={(v) => formatNumber(v)} color="#A855F7" />} />
              <Bar 
                dataKey="signups" 
                radius={[6, 6, 0, 0]} 
                fill="#A855F7"
                stroke="#C084FC"
                strokeWidth={2}
                maxBarSize={60}
                minPointSize={8}
                isAnimationActive={false}
                background={{ fill: 'rgba(168, 85, 247, 0.1)' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="insight-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          <InsightBox icon={<IoTrendingUp size={16} color="var(--success)" />} label="Peak Signups" value={formatNumber(peakSignups)} />
          <InsightBox icon={<IoCalendarOutline size={16} color="var(--info)" />} label="Daily Average" value={formatNumber(dailyAvgSignups)} />
          <InsightBox icon={<IoTimeOutline size={16} color="var(--warning)" />} label="Total Acquired" value={formatNumber(totalAcquired)} />
        </div>
      </div>
      )}

      {/* Management Modules */}
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '20px 12px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.2s, background-color 0.2s, transform 0.2s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = mod.color + '50'
                  e.currentTarget.style.backgroundColor = '#232323'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {badge !== null && badge > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: mod.color,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </div>
                )}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mod.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={22} color={mod.color} />
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                }}>
                  {mod.label}
                </span>
                <IoArrowForward size={14} color="var(--text-muted)" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="section-card" style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: 'var(--card-padding)',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <SectionTitle>Recent Activities</SectionTitle>
          <button
            onClick={() => navigateTo(navigate, '/activities')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--accent)',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 600,
              transition: 'background-color 0.2s',
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
              <ActivityItem
                key={act._id || act.id || i}
                activity={{
                  user: act.userName || act.user?.name || act.user || 'Unknown',
                  action: act.action || act.description || act.message || 'No details',
                  time,
                  exactTime,
                  color: act.color || 'var(--info)',
                }}
                isLast={i === activities.length - 1}
              />
            )
          })
        ) : (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            No recent activities
          </div>
        )}
      </div>

      <LogoutPopup
        visible={showLogoutPopup}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutPopup(false)}
      />
    </div>
  )
}

function InsightBox({ icon, label, value }) {
  return (
    <div className="insight-box" style={{
      display: 'flex',
      alignItems: 'center',          gap: 10,
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
    }}>
      <div className="insight-box-icon" style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div className="insight-label" style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </div>
        <div className="insight-value" style={{
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          marginTop: 2,
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
