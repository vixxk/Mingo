import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoReceipt, IoChevronBack, IoChevronForward, IoSearch,
  IoSwapHorizontal, IoArrowDownCircle, IoArrowUpCircle, IoCash,
  IoCloseCircle, IoGift, IoCall, IoCheckmarkCircle, IoAlertCircle, IoWallet, IoChatbubble
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'
import { DateRangeFilterBar } from '../components/admin/DateRangeFilter'

const TYPE_FILTERS = [
  { key: 'all', label: 'All Logs', color: 'var(--accent)' },
  { key: 'purchase', label: 'Coins Bought', color: '#10B981' },
  { key: 'call_debit', label: 'Call Debits', color: '#F59E0B' },
  { key: 'chat_debit', label: 'Chat Debits', color: '#EC4899' },
  { key: 'gift_send', label: 'Gifts Sent', color: '#8B5CF6' },
]

const STATUS_FILTERS = [
  { key: 'all', label: 'All Status' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
]

const TYPE_BADGES = {
  purchase: { label: 'Coins Bought', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', icon: IoArrowDownCircle },
  call_debit: { label: 'Call Spend', bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', icon: IoCall },
  chat_debit: { label: 'Chat Spend', bg: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', icon: IoChatbubble },
  call_credit: { label: 'Call Earnings', bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', icon: IoCall },
  gift_send: { label: 'Gift Sent', bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', icon: IoGift },
  gift_receive: { label: 'Gift Received', bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', icon: IoGift },
  signup_bonus: { label: 'Bonus', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', icon: IoWallet },
  refund: { label: 'Refund', bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', icon: IoAlertCircle },
}

const STATUS_BADGES = {
  completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' },
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
  failed: { label: 'Failed', bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`
}

function TypeBadge({ type }) {
  const badge = TYPE_BADGES[type] || { label: type, bg: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF', icon: IoReceipt }
  const Icon = badge.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 8,
      backgroundColor: badge.bg, color: badge.color,
      fontSize: 11.5, fontWeight: 800,
    }}>
      <Icon size={13} />
      {badge.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.completed
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 8,
      backgroundColor: badge.bg, color: badge.color,
      fontSize: 11, fontWeight: 800,
    }}>
      {badge.label}
    </span>
  )
}

export default function Transactions() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({ totalCoinsBought: 0, totalCoinsSpent: 0, totalRevenue: 0, totalCount: 0 })
  const [counts, setCounts] = useState({})
  const [selectedTx, setSelectedTx] = useState(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })

  useEffect(() => {
    loadTransactions()
  }, [activeType, statusFilter, page, startDate, endDate])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      if (activeType !== 'all') params.type = activeType
      if (statusFilter !== 'all') params.status = statusFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (search) params.search = search

      const res = await adminAPI.getTransactions(params)
      const data = res.data || res
      const list = data.transactions || data || []
      setTransactions(Array.isArray(list) ? list : [])
      const total = data.total || list.length
      setTotalPages(Math.ceil(total / 25) || 1)
      setTotalCount(total)
      if (data.stats) setStats(data.stats)
      if (data.counts) setCounts(data.counts)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load transaction logs', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      setPage(1)
      loadTransactions()
    }
  }

  const handlePresetPeriod = (days) => {
    if (days === 'all') {
      setStartDate('')
      setEndDate('')
      setPage(1)
      return
    }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setActiveType('all')
    setStatusFilter('all')
    setPage(1)
  }

  const renderDetailModal = () => {
    if (!selectedTx) return null
    const tx = selectedTx
    const isCredit = tx.type === 'purchase' || tx.type === 'signup_bonus' || tx.type === 'refund' || tx.type === 'call_credit'

    return (
      <div
        onClick={() => setSelectedTx(null)}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', overflowY: 'auto',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)',
            padding: 24, maxWidth: 650, width: '100%', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IoReceipt size={22} color="var(--accent)" />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>Transaction Log Details</h2>
            </div>
            <button
              onClick={() => setSelectedTx(null)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}
            >
              <IoCloseCircle size={22} />
            </button>
          </div>

          {/* 2-Column Details Layout */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 16, marginBottom: 20,
          }}>
            {/* Column 1: User & Identification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
                padding: 14,
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Account User</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{tx.userName || 'Unknown User'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{tx.userPhone || tx.userEmail || '—'}</div>
                <div style={{
                  display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 6,
                  backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontSize: 11, fontWeight: 700
                }}>
                  {tx.userRole || 'USER'}
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
                padding: 14,
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Transaction Info</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TypeBadge type={tx.type} />
                  <StatusBadge status={tx.status} />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                  Transaction ID: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{tx.id}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Financial Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
                padding: 14,
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Coin Delta</div>
                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: isCredit ? '#10B981' : '#F59E0B',
                }}>
                  {isCredit ? `+${tx.coins}` : `-${Math.abs(tx.coins)}`} Coins
                </div>
                {tx.amount > 0 && (
                  <div style={{ color: '#10B981', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                    Amount Paid: ₹{tx.amount || 0}
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
                padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Description / Note</div>
                  <div style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.4 }}>
                    {tx.description || 'No additional description'}
                  </div>
                  {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Metadata</div>
                      <pre style={{
                        fontSize: 11, color: '#A1A1AA', background: 'rgba(0,0,0,0.2)',
                        padding: 8, borderRadius: 6, margin: 0, overflowX: 'auto'
                      }}>
                        {JSON.stringify(tx.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  Recorded on {formatDate(tx.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedTx(null)}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 40 }}>
      <div className="page-wrap-inner" style={{ padding: '16px 16px 0' }}>
        {/* Page Header */}
        <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
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
              <IoReceipt size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
              Transaction Logs
            </h1>
            <div style={{
              padding: '2px 10px', borderRadius: 10,
              backgroundColor: 'var(--accent-mid)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalCount}</span>
            </div>
          </div>
        </div>

        <style>{`
          .tx-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          @media (min-width: 768px) {
            .tx-stats-grid {
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
            }
          }
          .tx-stat-card {
            background-color: var(--bg-secondary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border);
            padding: 12px 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }
          .tx-stat-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .tx-stat-label {
            color: var(--text-muted);
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .tx-stat-value {
            color: #fff;
            font-size: 16px;
            font-weight: 900;
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          @media (min-width: 768px) {
            .tx-stat-card {
              padding: 16px;
              gap: 14px;
            }
            .tx-stat-icon {
              width: 42px;
              height: 42px;
              border-radius: 12px;
            }
            .tx-stat-label {
              font-size: 11.5px;
            }
            .tx-stat-value {
              font-size: 20px;
              margin-top: 2px;
            }
          }
        `}</style>

        {/* Summary Stats Grid */}
        <div className="tx-stats-grid">
          <div className="tx-stat-card">
            <div className="tx-stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
              <IoArrowDownCircle size={22} color="#10B981" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tx-stat-label">Coins Purchased</div>
              <div className="tx-stat-value">{stats.totalCoinsBought.toLocaleString()}</div>
            </div>
          </div>

          <div className="tx-stat-card">
            <div className="tx-stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
              <IoArrowUpCircle size={22} color="#F59E0B" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tx-stat-label">Coins Spent</div>
              <div className="tx-stat-value">{stats.totalCoinsSpent.toLocaleString()}</div>
            </div>
          </div>

          <div className="tx-stat-card">
            <div className="tx-stat-icon" style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}>
              <IoCash size={22} color="#3B82F6" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tx-stat-label">Purchase Revenue</div>
              <div className="tx-stat-value">₹{stats.totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          <div className="tx-stat-card">
            <div className="tx-stat-icon" style={{ backgroundColor: 'var(--accent-light)' }}>
              <IoSwapHorizontal size={22} color="var(--accent)" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tx-stat-label">Total Logs</div>
              <div className="tx-stat-value">{totalCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Date Range Bar */}
        <DateRangeFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartChange={(v) => { setStartDate(v); setPage(1) }}
          onEndChange={(v) => { setEndDate(v); setPage(1) }}
          onPreset={handlePresetPeriod}
          onClear={handleClearFilters}
          showClear={!!(startDate || endDate || search || activeType !== 'all' || statusFilter !== 'all')}
        />

        {/* Search Bar & Status Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '0 10px', height: 38,
          }}>
            <IoSearch size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Search user, phone, note..."
              style={{
                flex: 1, minWidth: 0, background: 'none', border: 'none', color: '#fff',
                fontSize: 12.5, outline: 'none', height: '100%',
              }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); loadTransactions() }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}
              >
                &times;
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            style={{
              height: 38, padding: '0 10px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              color: '#fff', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer',
              flexShrink: 0, maxWidth: 110,
            }}
          >
            {STATUS_FILTERS.map(st => (
              <option key={st.key} value={st.key}>{st.label}</option>
            ))}
          </select>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }} className="tabs-scroll">
          {TYPE_FILTERS.map(filter => {
            const isActive = activeType === filter.key
            return (
              <button
                key={filter.key}
                onClick={() => { setActiveType(filter.key); setPage(1) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  backgroundColor: isActive ? filter.color : 'var(--bg-tertiary)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--border)',
                }}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Transaction Items List */}
      <div className="page-wrap-inner" style={{ padding: '0 16px' }}>
        {loading ? (
          [1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 10 }} />
          ))
        ) : transactions.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px',
            backgroundColor: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)',
          }}>
            <IoReceipt size={48} color="var(--border)" />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12, fontWeight: 600 }}>
              No transaction logs found matching your filters
            </p>
          </div>
        ) : (
          transactions.map(tx => {
            const isCredit = tx.type === 'purchase' || tx.type === 'signup_bonus' || tx.type === 'refund' || tx.type === 'call_credit'
            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                style={{
                  backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
                  padding: 14, marginBottom: 10, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {isCredit ? <IoArrowDownCircle size={22} color="#10B981" /> : <IoArrowUpCircle size={22} color="#F59E0B" />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>
                        {tx.userName}
                      </span>
                      <TypeBadge type={tx.type} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {tx.description || tx.userPhone || tx.userEmail || 'Transaction'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 16, fontWeight: 900,
                      color: isCredit ? '#10B981' : '#F59E0B'
                    }}>
                      {isCredit ? `+${tx.coins}` : `-${Math.abs(tx.coins)}`} Coins
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDate(tx.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, marginTop: 24, paddingBottom: 20,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              color: page === 1 ? '#3F3F46' : '#fff', opacity: page === 1 ? 0.5 : 1,
            }}
          >
            <IoChevronBack size={18} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              color: page === totalPages ? '#3F3F46' : '#fff', opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            <IoChevronForward size={18} />
          </button>
        </div>
      )}

      {renderDetailModal()}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
