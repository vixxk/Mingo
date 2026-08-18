import { useState } from 'react'
import {
  IoDownload, IoSearch, IoCalendar, IoFilter, IoRefresh,
  IoCheckmarkCircle, IoAlertCircle, IoDocumentText,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'

function csvEscape(val) {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

function downloadCSV(filename, headers, rows) {
  const csvContent = '\uFEFF' + [
    headers.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(','))
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function ExcelIcon({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.max(4, size * 0.25),
      backgroundColor: '#107C41', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontWeight: 900,
      fontSize: size * 0.45, fontFamily: 'sans-serif',
      boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)',
      flexShrink: 0,
    }}>
      X
    </div>
  )
}

export default function Exports() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [quickRange, setQuickRange] = useState('30')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [loadingType, setLoadingType] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type })
  }

  const handleQuickRangeChange = (days) => {
    setQuickRange(days)
    if (days === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - parseInt(days))
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearch('')
    setQuickRange('30')
    setRoleFilter('all')
    setStatusFilter('all')
    setChannelFilter('all')
  }

  // 1. Download Full User List
  const handleExportUsers = async () => {
    if (loadingType) return
    setLoadingType('users')
    try {
      const res = await adminAPI.getUsers({ limit: 5000, search, startDate, endDate })
      const data = res.data || res
      const users = data.users || (Array.isArray(data) ? data : [])
      
      const headers = ['User ID', 'Name', 'Username', 'Phone', 'Role', 'Status', 'Created Date']
      const rows = users.map(u => [
        u.id || u._id,
        u.name || '—',
        u.username || '—',
        u.phone || '—',
        u.role || 'USER',
        u.isBanned ? 'Banned' : 'Active',
        u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'
      ])

      downloadCSV(`Mingo_User_List_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      showToast(`Exported ${rows.length} registered user records`)
    } catch (e) {
      showToast(e.message || 'Failed to export users', 'error')
    } finally {
      setLoadingType(null)
    }
  }

  // 2. Download Full Listener List
  const handleExportListeners = async () => {
    if (loadingType) return
    setLoadingType('listeners')
    try {
      const res = await adminAPI.getListeners({ limit: 5000, search, startDate, endDate })
      const data = res.data || res
      const listeners = data.listeners || (Array.isArray(data) ? data : [])

      const headers = ['Listener ID', 'Name', 'Display Name', 'Phone', 'Rating', 'Verified', 'Status', 'Submitted Date']
      const rows = listeners.map(l => [
        l.id || l._id,
        l.name || l.userId?.name || '—',
        l.displayName || '—',
        l.phone || l.userId?.phone || '—',
        l.rating || 5.0,
        l.verified ? 'Yes' : 'No',
        l.profileStatus || 'approved',
        l.profileSubmittedAt ? new Date(l.profileSubmittedAt).toLocaleString() : '—'
      ])

      downloadCSV(`Mingo_Listener_List_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      showToast(`Exported ${rows.length} listener records`)
    } catch (e) {
      showToast(e.message || 'Failed to export listeners', 'error')
    } finally {
      setLoadingType(null)
    }
  }

  // 3. Download Full Sessions Report
  const handleExportSessions = async () => {
    if (loadingType) return
    setLoadingType('sessions')
    try {
      const res = await adminAPI.getSessions({ limit: 5000, search, startDate, endDate, callType: channelFilter, status: statusFilter })
      const data = res.data || res
      const sessions = data.sessions || (Array.isArray(data) ? data : [])

      const headers = ['Session ID', 'Caller Name', 'Listener Name', 'Call Type', 'Duration (secs)', 'Coins Spent', 'Listener Earnings', 'Status', 'Start Time']
      const rows = sessions.map(s => [
        s.id || s._id,
        s.callerName || s.userName || '—',
        s.listenerName || '—',
        s.callType || s.type || '—',
        s.duration || 0,
        s.coinsSpent || 0,
        typeof s.earnings === 'object' ? (s.earnings?.call || 0) : (s.earnings || 0),
        s.status || 'completed',
        s.startTime ? new Date(s.startTime).toLocaleString() : '—'
      ])

      downloadCSV(`Mingo_Sessions_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      showToast(`Exported ${rows.length} session records`)
    } catch (e) {
      showToast(e.message || 'Failed to export sessions', 'error')
    } finally {
      setLoadingType(null)
    }
  }

  // 4. Download Full Transaction Report
  const handleExportTransactions = async () => {
    if (loadingType) return
    setLoadingType('transactions')
    try {
      const res = await adminAPI.getExportData({ types: 'transactions,gifts', startDate, endDate })
      const data = res.data || res
      const txns = data.transactions || []

      const headers = ['Transaction ID', 'User Name', 'Phone', 'Type', 'Coins', 'Amount (INR)', 'Date']
      const rows = txns.map(t => [
        t.id || t._id,
        t.userId?.name || '—',
        t.userId?.phone || '—',
        t.type || '—',
        t.coins || 0,
        t.amount || 0,
        t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'
      ])

      downloadCSV(`Mingo_Transaction_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      showToast(`Exported ${rows.length} transaction records`)
    } catch (e) {
      showToast(e.message || 'Failed to export transactions', 'error')
    } finally {
      setLoadingType(null)
    }
  }

  // 5. Download Full Payouts Report
  const handleExportPayouts = async () => {
    if (loadingType) return
    setLoadingType('payouts')
    try {
      const res = await adminAPI.exportPayouts({ startDate, endDate, search, status: statusFilter })
      const data = res.data || res
      const payouts = data.payouts || (Array.isArray(data) ? data : [])

      const headers = [
        'Request ID', 'Listener Name', 'Listener Phone', 'Amount (INR)', 'TDS Rate (%)', 'TDS Amount (INR)', 'Net Amount (INR)',
        'Credit SLA (days)', 'Diamonds', 'Bank Name', 'Account Number', 'IFSC Code', 'PAN Number', 'Status',
        'Requested Date', 'Processed Date', 'Transaction ID', 'Admin Notes'
      ]
      const rows = payouts.map(r => [
        r.requestId || r._id,
        r.listenerName || '—',
        r.listenerPhone || '—',
        r.amount || 0,
        r.tdsRate || 0,
        r.tdsAmount || 0,
        r.netAmount || 0,
        r.creditDaysMin && r.creditDaysMax ? `${r.creditDaysMin}-${r.creditDaysMax}` : '3-7',
        r.diamonds || 0,
        r.bankName || '—',
        r.accountNumber || '—',
        r.ifscCode || '—',
        r.panNumber || '—',
        r.status || '—',
        r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
        r.processedAt ? new Date(r.processedAt).toLocaleString() : '—',
        r.transactionId || '—',
        r.adminNotes || '—'
      ])

      downloadCSV(`Mingo_Payouts_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      showToast(`Exported ${rows.length} payout records`)
    } catch (e) {
      showToast(e.message || 'Failed to export payouts', 'error')
    } finally {
      setLoadingType(null)
    }
  }

  // Export All Selected
  const handleExportAllSelected = async () => {
    await handleExportTransactions()
  }

  return (
    <div className="page-wrap exports-page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: '24px 20px 60px' }}>
      <style>{`
        /* Desktop styles (Default) */
        .exports-header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .exports-action-btn-wrapper-desktop {
          display: block;
        }
        .exports-action-btn-wrapper-mobile {
          display: none;
        }

        /* Mobile specific responsive styles (max-width: 768px) */
        @media (max-width: 768px) {
          .exports-page-wrap {
            padding: 12px 10px 40px !important;
          }
          /* 1. Remove top header text and description on mobile */
          .exports-header-container {
            display: none !important;
          }

          /* 2. Main Action Button under filters */
          .exports-action-btn-wrapper-desktop {
            display: none !important;
          }
          .exports-action-btn-wrapper-mobile {
            display: block !important;
            margin-top: 14px;
          }
          .exports-main-action-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            border-radius: 8px !important;
          }

          /* Put Date Range and Quick Range in 1 row on mobile */
          .exports-date-quick-row {
            display: flex !important;
            flex-direction: row !important;
            gap: 8px !important;
            align-items: flex-start !important;
            width: 100% !important;
            grid-column: 1 / -1 !important;
          }
          .exports-date-col {
            flex: 1.35 !important;
            min-width: 0 !important;
          }
          .exports-quick-col {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .exports-date-col .exports-input {
            padding: 4px 3px !important;
            font-size: 9.5px !important;
          }
          .exports-date-col span {
            font-size: 9.5px !important;
          }

          /* 3. Smaller everything on mobile */
          .exports-filter-card {
            padding: 12px !important;
            margin-bottom: 14px !important;
            border-radius: 12px !important;
          }
          .exports-filter-grid {
            gap: 10px !important;
            margin-bottom: 10px !important;
          }
          .exports-filter-label {
            font-size: 10.5px !important;
            margin-bottom: 4px !important;
          }
          .exports-input, .exports-select {
            font-size: 11px !important;
            padding: 5px 8px !important;
            height: 32px !important;
            border-radius: 6px !important;
          }
          .exports-search-box {
            height: 32px !important;
            padding: 0 8px !important;
            border-radius: 6px !important;
          }

          .exports-cards-grid {
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .exports-download-card {
            padding: 12px !important;
            gap: 10px !important;
            border-radius: 12px !important;
          }
          .exports-card-title {
            font-size: 13px !important;
          }
          .exports-card-desc {
            font-size: 11px !important;
            margin-top: 3px !important;
          }
          .exports-card-btn {
            padding: 8px 0 !important;
            font-size: 11.5px !important;
            border-radius: 8px !important;
          }

          .exports-info-banner {
            padding: 9px 12px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="exports-header-container">
        <div className="exports-header-text">
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
            Exports / Download Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0' }}>
            Download complete data reports in Excel format (.xlsx / .csv)
          </p>
        </div>

        <div className="exports-action-btn-wrapper-desktop">
          <button
            className="exports-main-action-btn"
            onClick={handleExportAllSelected}
            disabled={!!loadingType}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              opacity: loadingType ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            <ExcelIcon size={20} />
            <span>{loadingType ? 'Exporting...' : 'Export Selected to Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filter Section Card */}
      <div className="exports-filter-card" style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)', padding: 20, marginBottom: 28
      }}>
        <div className="exports-filter-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 16
        }}>
          {/* Date & Quick Range Row */}
          <div className="exports-date-quick-row">
            {/* Date Range */}
            <div className="exports-date-col">
              <label className="exports-filter-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                Date Range
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="exports-input"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12.5, outline: 'none'
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>to</span>
                <input
                  className="exports-input"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12.5, outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Quick Range */}
            <div className="exports-quick-col">
              <label className="exports-filter-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                Quick Range
              </label>
              <select
                className="exports-select"
                value={quickRange}
                onChange={e => handleQuickRangeChange(e.target.value)}
                style={{
                  width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="exports-filter-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              Search
            </label>
            <div className="exports-search-box" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0 12px', height: 38
            }}>
              <IoSearch size={16} color="var(--text-muted)" />
              <input
                className="exports-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reports..."
                style={{
                  flex: 1, background: 'none', border: 'none', color: '#fff',
                  fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Sub Filters Row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="exports-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', color: 'var(--text-secondary)', fontSize: 12.5, outline: 'none'
              }}
            >
              <option value="all">All Roles</option>
              <option value="USER">User</option>
              <option value="LISTENER">Listener</option>
            </select>

            <select
              className="exports-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', color: 'var(--text-secondary)', fontSize: 12.5, outline: 'none'
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="exports-select"
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', color: 'var(--text-secondary)', fontSize: 12.5, outline: 'none'
              }}
            >
              <option value="all">All Channels</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="chat">Chat</option>
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, background: 'none',
              border: '1px solid var(--border)', color: 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <IoRefresh size={14} /> Reset
          </button>
        </div>

        {/* Action Button Under Filters (Mobile Only) */}
        <div className="exports-action-btn-wrapper-mobile">
          <button
            className="exports-main-action-btn"
            onClick={handleExportAllSelected}
            disabled={!!loadingType}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              opacity: loadingType ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            <ExcelIcon size={18} />
            <span>{loadingType ? 'Exporting...' : 'Export Selected to Excel'}</span>
          </button>
        </div>
      </div>

      {/* 4 Download Report Cards Grid */}
      <div className="exports-cards-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, marginBottom: 28
      }}>
        {/* Card 1: Download Full User List */}
        <div className="exports-download-card" style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: 22, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ExcelIcon size={40} />
            <div>
              <h3 className="exports-card-title" style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                Download Full User List (Excel)
              </h3>
              <p className="exports-card-desc" style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.4 }}>
                Export the complete list of all registered users.
              </p>
            </div>
          </div>
          <button
            className="exports-card-btn"
            onClick={handleExportUsers}
            disabled={loadingType === 'users'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 10, backgroundColor: 'var(--accent-mid)',
              border: '1px solid var(--accent)', color: 'var(--accent)',
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loadingType === 'users' ? 0.6 : 1
            }}
          >
            <IoDownload size={16} />
            {loadingType === 'users' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>

        {/* Card 2: Download Full Listener List */}
        <div className="exports-download-card" style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: 22, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ExcelIcon size={40} />
            <div>
              <h3 className="exports-card-title" style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                Download Full Listener List (Excel)
              </h3>
              <p className="exports-card-desc" style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.4 }}>
                Export the complete list of all listeners / voice agents.
              </p>
            </div>
          </div>
          <button
            className="exports-card-btn"
            onClick={handleExportListeners}
            disabled={loadingType === 'listeners'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 10, backgroundColor: 'var(--accent-mid)',
              border: '1px solid var(--accent)', color: 'var(--accent)',
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loadingType === 'listeners' ? 0.6 : 1
            }}
          >
            <IoDownload size={16} />
            {loadingType === 'listeners' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>

        {/* Card 3: Download Full Sessions Report */}
        <div className="exports-download-card" style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: 22, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ExcelIcon size={40} />
            <div>
              <h3 className="exports-card-title" style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                Download Full Sessions Report (Excel)
              </h3>
              <p className="exports-card-desc" style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.4 }}>
                Export the full sessions data including calls & durations.
              </p>
            </div>
          </div>
          <button
            className="exports-card-btn"
            onClick={handleExportSessions}
            disabled={loadingType === 'sessions'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 10, backgroundColor: 'var(--accent-mid)',
              border: '1px solid var(--accent)', color: 'var(--accent)',
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loadingType === 'sessions' ? 0.6 : 1
            }}
          >
            <IoDownload size={16} />
            {loadingType === 'sessions' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>

        {/* Card 4: Download Full Transaction Report */}
        <div className="exports-download-card" style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: 22, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ExcelIcon size={40} />
            <div>
              <h3 className="exports-card-title" style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                Download Full Transaction Report (Excel)
              </h3>
              <p className="exports-card-desc" style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.4 }}>
                Export all transactions including earnings, payouts & coins.
              </p>
            </div>
          </div>
          <button
            className="exports-card-btn"
            onClick={handleExportTransactions}
            disabled={loadingType === 'transactions'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 10, backgroundColor: 'var(--accent-mid)',
              border: '1px solid var(--accent)', color: 'var(--accent)',
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loadingType === 'transactions' ? 0.6 : 1
            }}
          >
            <IoDownload size={16} />
            {loadingType === 'transactions' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>

        {/* Card 5: Download Full Payouts Report */}
        <div className="exports-download-card" style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: 22, display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          transition: 'all 0.2s ease', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ExcelIcon size={40} />
            <div>
              <h3 className="exports-card-title" style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                Download Full Payouts Report (Excel)
              </h3>
              <p className="exports-card-desc" style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.4 }}>
                Export listener withdrawal payout requests, bank details & TDS.
              </p>
            </div>
          </div>
          <button
            className="exports-card-btn"
            onClick={handleExportPayouts}
            disabled={loadingType === 'payouts'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 0', borderRadius: 10, backgroundColor: 'var(--accent-mid)',
              border: '1px solid var(--accent)', color: 'var(--accent)',
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loadingType === 'payouts' ? 0.6 : 1
            }}
          >
            <IoDownload size={16} />
            {loadingType === 'payouts' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </div>

      {/* Informational Banner */}
      <div className="exports-info-banner" style={{
        backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex',
        alignItems: 'center', gap: 12, color: '#60A5FA', fontSize: 13.5, fontWeight: 600
      }}>
        <IoAlertCircle size={20} color="#60A5FA" style={{ flexShrink: 0 }} />
        <span>Exports are generated in Excel (.xlsx / .csv) format for accurate reporting and analysis.</span>
      </div>

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
