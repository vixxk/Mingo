import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../utils/api'
import {
  IoDownload, IoPeople, IoHeadset, IoWallet, IoCall,
  IoBarChart, IoChevronBack, IoTime, IoPulse,
  IoCash, IoChatbubbles, IoFlag, IoCheckmarkCircle,
  IoArrowUp, IoArrowDown, IoArrowForward,
} from 'react-icons/io5'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { StatCard, SectionTitle } from '../components/admin/AdminComponents'
import { AdminPageSkeleton } from '../components/admin/Skeleton'
import ToastNotification from '../components/shared/ToastNotification'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const PIE_COLORS = ['var(--accent)', '#EC4899']

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

const cardAccents = {
  totalUsers: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: <IoPeople size={18} color="#8B5CF6" /> },
  totalListeners: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: <IoHeadset size={18} color="#10B981" /> },
  activeToday: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <IoPulse size={18} color="#F59E0B" /> },
  totalCalls: { color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', icon: <IoCall size={18} color="#60A5FA" /> },
  totalRevenue: { color: '#34D399', bg: 'rgba(52,211,153,0.08)', icon: <IoCash size={18} color="#34D399" /> },
  pendingApprovals: { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', icon: <IoCheckmarkCircle size={18} color="#FBBF24" /> },
  activeNow: { color: '#A855F7', bg: 'rgba(168,85,247,0.08)', icon: <IoPulse size={18} color="#A855F7" /> },
  pendingPayouts: { color: '#F87171', bg: 'rgba(248,113,113,0.08)', icon: <IoCash size={18} color="#F87171" /> },
}

const sectionColors = {
  registeredUsers: 'var(--accent)',
  approvedListeners: '#10B981',
  gifts: '#F59E0B',
  walletTransactions: '#A855F7',
}

const sectionLabels = {
  registeredUsers: 'Registered Users',
  approvedListeners: 'Approved Listeners',
  gifts: 'Revenue & Purchases',
  walletTransactions: 'Wallet & Call Transactions',
}

export default function Analytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' })
  const [exporting, setExporting] = useState(false)
  const [visibleSections, setVisibleSections] = useState({
    registeredUsers: true,
    approvedListeners: true,
    gifts: true,
    walletTransactions: true,
  })
  const [period, setPeriod] = useState('7')

  const PERIOD_OPTIONS = [
    { id: '7', label: '7D' },
    { id: '30', label: '30D' },
    { id: '90', label: '3M' },
    { id: '365', label: '1Y' },
  ]

  const getDateRangeLabel = () => {
    const days = parseInt(period)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  }

  const fetchAnalytics = useCallback(async (selectedPeriod) => {
    try {
      setLoading(true)
      const res = await adminAPI.getStats({ timeline: selectedPeriod || period })
      const stats = res.data || res
      setData(stats)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load analytics', type: 'error' })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchAnalytics(period)
  }, [period, fetchAnalytics])

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
  }

  const handleExportPDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      setToast({ visible: true, message: 'Generating PDF report...', type: 'success' })

      const res = await adminAPI.getExportData({ types: 'users,listeners,gifts,transactions' })
      const exportData = res.data || res

      const doc = new jsPDF()
      const d = data || {}

      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(139, 92, 246)
      doc.text('Mingo Analytics Report', 14, 22)

      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100)
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 29)
      doc.text(`Period: ${getDateRangeLabel()}`, 14, 35)

      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0)
      doc.text('Summary Statistics', 14, 45)

      const summaryData = [
        ['Total Users', formatNumber(d.totalUsers || 0)],
        ['Total Listeners', formatNumber(d.totalListeners || 0)],
        ['Total Sessions', formatNumber(d.totalCalls || 0)],
        ['Total Revenue', formatCurrency(d.totalRevenue || 0)],
        ['Active Today', formatNumber(d.activeUsersToday || 0)],
        ['Online Listeners', formatNumber(d.activeNow || 0)],
        ['Pending Reports', formatNumber(d.pendingReports || 0)],
        ['Pending Payouts', formatNumber(d.pendingPayoutsCount || 0)],
        ['Pending Payout Amount', formatCurrency(d.pendingPayoutAmount || 0)],
      ]

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        styles: { fontSize: 10 },
      })

      let finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('User Distribution', 14, finalY)

      const distData = [
        ['Users', formatNumber(d.totalUsers || 0)],
        ['Listeners', formatNumber(d.totalListeners || 0)],
      ]

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Category', 'Count']],
        body: distData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        styles: { fontSize: 10 },
      })

      finalY = doc.lastAutoTable.finalY + 10
      if (exportData.transactions && exportData.transactions.length > 0) {
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('Recent Transactions (Latest 20)', 14, finalY)

        const txnData = exportData.transactions.slice(0, 20).map(t => [
          t.userId?.name || 'Unknown',
          t.type || 'N/A',
          formatCurrency(t.amount || 0),
          t.coins ? `${t.coins} coins` : 'N/A',
          t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        ])

        autoTable(doc, {
          startY: finalY + 5,
          head: [['User', 'Type', 'Amount', 'Coins', 'Date']],
          body: txnData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246], textColor: 255 },
          styles: { fontSize: 8 },
        })
      }

      finalY = doc.lastAutoTable.finalY + 10
      if (exportData.gifts && exportData.gifts.length > 0) {
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('Recent Gifts (Latest 20)', 14, finalY)

        const giftData = exportData.gifts.slice(0, 20).map(g => [
          g.userId?.name || 'Unknown',
          g.type || 'N/A',
          g.coins ? `${g.coins} coins` : 'N/A',
          g.amount ? formatCurrency(g.amount) : 'N/A',
          g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'N/A',
        ])

        autoTable(doc, {
          startY: finalY + 5,
          head: [['User', 'Type', 'Coins', 'Amount', 'Date']],
          body: giftData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246], textColor: 255 },
          styles: { fontSize: 8 },
        })
      }

      const fileName = `mingo-analytics-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      setToast({ visible: true, message: 'PDF report downloaded successfully!', type: 'success' })
    } catch (e) {
      console.error('[PDF Export] Error:', e)
      const errorMsg = e?.message || 'Failed to generate PDF'
      setToast({ visible: true, message: errorMsg, type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const toggleSection = (key) => {
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return <AdminPageSkeleton type="dashboard" />
  }

  const d = data || {}
  const pieData = [
    { name: 'Users', value: d.totalUsers || 0 },
    { name: 'Listeners', value: d.totalListeners || 0 },
  ]

  const dailyRevenue = d.charts?.dailyRevenue || []
  const dailyRegistrations = d.charts?.dailyRegistrations || []
  const dailyApprovedListeners = d.charts?.dailyApprovedListeners || []
  const dailyGifts = d.charts?.dailyGifts || []

  const isMonthlyGrouping = period === '90' || period === '365'

  const formatLabel = (id) => {
    if (!id) return ''
    if (isMonthlyGrouping) {
      const [year, month] = id.split('-')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[parseInt(month) - 1] || ''} ${year}`
    }
    const date = new Date(id + 'T00:00:00')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const registrationChartData = dailyRegistrations
    .filter(r => r._id)
    .map(r => ({ label: formatLabel(r._id), value: r.count }))

  const revenueChartData = dailyRevenue
    .filter(r => r._id)
    .map(r => ({ label: formatLabel(r._id), value: r.amount }))

  const approvedListenersChartData = dailyApprovedListeners
    .filter(r => r._id)
    .map(r => ({ label: formatLabel(r._id), value: r.count }))

  const giftsChartData = dailyGifts
    .filter(r => r._id)
    .map(r => ({ label: formatLabel(r._id), value: r.amount }))

  const sectionData = {
    registeredUsers: registrationChartData,
    approvedListeners: approvedListenersChartData,
    gifts: giftsChartData,
    walletTransactions: revenueChartData,
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
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
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IoBarChart size={18} color="#fff" />
            </div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 'var(--header-font-size)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Analytics</h1>
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12,
            backgroundColor: exporting ? 'var(--bg-tertiary)' : 'var(--accent-light)',
            border: `1px solid ${exporting ? 'var(--border)' : 'var(--accent)'}`,
            cursor: exporting ? 'not-allowed' : 'pointer',
            color: exporting ? 'var(--text-muted)' : 'var(--accent)',
            fontSize: 13, fontWeight: 600,
            opacity: exporting ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          <IoDownload size={16} style={{
            animation: exporting ? 'spin 1s linear infinite' : 'none',
          }} />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        <MiniCard
          title="Total Listeners"
          value={formatNumber(d.totalListeners)}
          icon={cardAccents.totalListeners.icon}
          color={cardAccents.totalListeners.color}
          bg={cardAccents.totalListeners.bg}
          subtitle={`${formatNumber(d.activeNow || 0)} online`}
        />
        <MiniCard
          title="Active Today"
          value={formatNumber(d.activeUsersToday || 0)}
          icon={cardAccents.activeToday.icon}
          color={cardAccents.activeToday.color}
          bg={cardAccents.activeToday.bg}
          subtitle={`${formatNumber(d.activeChats || 0)} active chats`}
        />
        <MiniCard
          title="Total Sessions"
          value={formatNumber(d.totalCalls)}
          icon={cardAccents.totalCalls.icon}
          color={cardAccents.totalCalls.color}
          bg={cardAccents.totalCalls.bg}
          subtitle={`${formatNumber(d.activeChats || 0)} active now`}
        />
        <MiniCard
          title="Total Revenue"
          value={formatCurrency(d.totalRevenue)}
          icon={cardAccents.totalRevenue.icon}
          color={cardAccents.totalRevenue.color}
          bg={cardAccents.totalRevenue.bg}
          subtitle={`${formatNumber(d.coinsPurchasedToday || 0)} coins today`}
        />
        <MiniCard
          title="Pending Approvals"
          value={formatNumber(d.pendingApprovals)}
          icon={cardAccents.pendingApprovals.icon}
          color={cardAccents.pendingApprovals.color}
          bg={cardAccents.pendingApprovals.bg}
          subtitle={`${d.pendingUsers || 0} users, ${d.pendingListeners || 0} listeners`}
        />
        <MiniCard
          title="Online Listeners"
          value={formatNumber(d.activeNow || 0)}
          icon={cardAccents.activeNow.icon}
          color={cardAccents.activeNow.color}
          bg={cardAccents.activeNow.bg}
        />
        <MiniCard
          title="Pending Payouts"
          value={formatNumber(d.pendingPayoutsCount || 0)}
          icon={cardAccents.pendingPayouts.icon}
          color={cardAccents.pendingPayouts.color}
          bg={cardAccents.pendingPayouts.bg}
          subtitle={d.pendingPayoutAmount ? formatCurrency(d.pendingPayoutAmount) : undefined}
        />
      </div>

      {/* Stat Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard title="Active Today" value={formatNumber(d.activeUsersToday)} icon={<IoTime size={16} color="var(--accent)" />} trend={d.activeUsersToday > 0 ? 12 : undefined} />
        <StatCard title="Total Calls" value={formatNumber(d.totalCalls)} icon={<IoCall size={16} color="var(--accent)" />} />
        <StatCard title="Total Revenue" value={formatCurrency(d.totalRevenue)} icon={<IoWallet size={16} color="var(--accent)" />} />
      </div>

      {/* Period Selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        padding: '12px 16px', backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <IoTime size={16} color="var(--text-muted)" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
          Period:
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePeriodChange(opt.id)}
              style={{
                padding: '6px 14px', borderRadius: 16, border: '1px solid',
                borderColor: period === opt.id ? 'var(--accent)' : 'var(--border)',
                backgroundColor: period === opt.id ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
                color: period === opt.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {getDateRangeLabel()}
        </span>
      </div>

      {/* User Distribution + Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16, marginBottom: 20,
      }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
          padding: 'var(--card-padding)',
        }}>
          <SectionTitle>User Distribution</SectionTitle>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [formatNumber(value), name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                  iconType="circle"
                  formatter={(value) => (
                    <span style={{ color: '#D1D5DB', fontWeight: 600 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 14,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            }}>
              <IoPeople size={16} color="var(--accent)" />
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Total Users</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{formatNumber(d.totalUsers)}</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 14,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            }}>
              <IoHeadset size={16} color="#10B981" />
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Total Listeners</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{formatNumber(d.totalListeners)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
          padding: 'var(--card-padding)',
        }}>
          <SectionTitle>Today's Activity</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TodayRow
              label="Active Users"
              value={formatNumber(d.activeUsersToday || 0)}
              icon={<IoPeople size={16} color="var(--accent)" />}
              color="var(--accent)"
            />
            <TodayRow
              label="Online Listeners"
              value={formatNumber(d.activeNow || 0)}
              icon={<IoHeadset size={16} color="#10B981" />}
              color="#10B981"
            />
            <TodayRow
              label="Coins Purchased"
              value={formatNumber(d.coinsPurchasedToday || 0)}
              icon={<IoCash size={16} color="#F59E0B" />}
              color="#F59E0B"
            />
            <TodayRow
              label="Diamonds Generated"
              value={formatNumber(d.diamondsGeneratedToday || 0)}
              icon={<IoWallet size={16} color="#A855F7" />}
              color="#A855F7"
            />
            <TodayRow
              label="Active Chats"
              value={formatNumber(d.activeChats || 0)}
              icon={<IoChatbubbles size={16} color="#60A5FA" />}
              color="#60A5FA"
            />
            <TodayRow
              label="Pending Reports"
              value={formatNumber(d.pendingReports || 0)}
              icon={<IoFlag size={16} color="#F87171" />}
              color="#F87171"
            />
          </div>
        </div>
      </div>

      {/* Section Toggles */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16,
      }}>
        {Object.entries(sectionLabels).map(([key, label]) => {
          const color = sectionColors[key]
          return (
            <button
              key={key}
              onClick={() => toggleSection(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 10,
                backgroundColor: visibleSections[key]
                  ? `${color}15` : 'var(--bg-tertiary)',
                border: `1px solid ${visibleSections[key] ? color : 'var(--border)'}`,
                color: visibleSections[key] ? color : 'var(--text-muted)',
                fontSize: 11, fontWeight: visibleSections[key] ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Section Stats */}
      {Object.entries(sectionLabels).map(([key, label]) => {
        if (!visibleSections[key]) return null
        const sectionItems = sectionData[key] || []
        const color = sectionColors[key]
        const maxVal = sectionItems.length > 0
          ? Math.max(...sectionItems.map((item) => item.value), 1)
          : 1

        return (
          <div key={key} style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
            padding: 24, marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionTitle>{label}</SectionTitle>
              {sectionItems.length > 0 && (
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                }}>
                  {sectionItems.length} data points
                </span>
              )}
            </div>
            {sectionItems.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, marginBottom: 16 }}>
                  {sectionItems.map((item, i) => {
                    const height = Math.max((item.value / maxVal) * 100, 4)
                    return (
                      <div key={i} style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3, position: 'relative',
                      }}>
                        <span style={{
                          fontSize: 8, color: 'var(--text-muted)', fontWeight: 700,
                          opacity: item.value > maxVal * 0.7 ? 1 : 0,
                        }}>
                          {formatNumber(item.value)}
                        </span>
                        <div
                          style={{
                            width: '100%', height, borderRadius: '4px 4px 0 0',
                            background: color,
                            opacity: 0.65,
                            transition: 'height 0.4s ease, opacity 0.3s',
                            cursor: 'pointer',
                            minHeight: 4,
                          }}
                          title={`${item.label}: ${formatNumber(item.value)}`}
                        />
                        <span style={{
                          fontSize: 8, color: '#4B5563', fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: '100%', textAlign: 'center',
                        }}>
                          {item.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                }}>
                  <MiniStat label="Period Total" value={formatNumber(sectionItems.reduce((a, b) => a + b.value, 0))} color={color} />
                  <MiniStat label="Daily Average" value={formatNumber(Math.round(sectionItems.reduce((a, b) => a + b.value, 0) / sectionItems.length))} color={color} />
                  <MiniStat label="Peak" value={formatNumber(maxVal)} color={color} />
                </div>
              </div>
            ) : (
              <div>
                {key === 'approvedListeners' && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}>
                    <MiniStat label="Total Approved" value={formatNumber(d.totalListeners || 0)} color={color} />
                    <MiniStat label="Online Now" value={formatNumber(d.activeNow || 0)} color={color} />
                    <MiniStat label="Pending Approvals" value={formatNumber(d.pendingApprovals || 0)} color={color} />
                  </div>
                )}
                {key === 'gifts' && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}>
                    <MiniStat label="Total Revenue" value={formatCurrency(d.totalRevenue || 0)} color={color} />
                    <MiniStat label="Active Sessions" value={formatNumber(d.totalCalls || 0)} color={color} />
                    <MiniStat label="Coins Today" value={formatNumber(d.coinsPurchasedToday || 0)} color={color} />
                  </div>
                )}
                {key === 'walletTransactions' && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}>
                    <MiniStat label="Active Chats" value={formatNumber(d.activeChats || 0)} color={color} />
                    <MiniStat label="Pending Payouts" value={formatNumber(d.pendingPayoutsCount || 0)} color={color} />
                    <MiniStat label="Pending Amount" value={formatCurrency(d.pendingPayoutAmount || 0)} color={color} />
                  </div>
                )}
                {!['approvedListeners', 'gifts', 'walletTransactions'].includes(key) && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#4B5563', fontSize: 13 }}>
                    No data available for this period
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}

function MiniCard({ title, value, icon, color, bg, subtitle }) {
  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${color}`,
      transition: 'transform 0.2s, border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.3px',
        }}>
          {title}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
        letterSpacing: '-0.3px',
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 14,
      backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function TodayRow({ label, value, icon, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', borderRadius: 12,
      backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}
