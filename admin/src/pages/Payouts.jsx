import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronBack, IoChevronForward, IoSearch, IoWallet, IoCopy, IoCheckmarkCircle,
  IoCloseCircle, IoHourglass, IoBan,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

const FILTERS = [
  { key: 'all', label: 'All', color: 'var(--text-muted)' },
  { key: 'pending', label: 'Pending', color: '#F59E0B' },
  { key: 'paid', label: 'Paid', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', color: '#EF4444' },
]

const STATUS_BADGES = {
  pending: { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  hold: { label: 'On Hold', bg: 'rgba(107,114,128,0.12)', color: 'var(--text-muted)' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239,68,68,0.08)', color: 'var(--text-muted)' },
}

const ACTION_COLORS = {
  paid: { bg: '#10B981', label: 'Mark as Paid' },
  reject: { bg: '#EF4444', label: 'Reject' },
  hold: { bg: '#F59E0B', label: 'On Hold' },
  cancel: { bg: 'var(--text-muted)', label: 'Cancel' },
}

const CONFIRM_MESSAGES = {
  paid: 'Are you sure you want to mark this payout as paid?',
  reject: 'Are you sure you want to reject this payout?',
  hold: 'Are you sure you want to put this payout on hold?',
  cancel: 'Are you sure you want to cancel this payout?',
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

export default function Payouts() {
  const navigate = useNavigate()
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [transactionId, setTransactionId] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPayouts, setTotalPayouts] = useState(0)
  const [counts, setCounts] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)

  const filteredPayouts = search
    ? payouts.filter(p => {
        const q = search.toLowerCase()
        return (p.listenerName?.toLowerCase() || '').includes(q)
          || (p.listenerPhone?.toLowerCase() || '').includes(q)
      })
    : payouts

  useEffect(() => {
    loadPayouts()
  }, [activeFilter, page, refreshKey])

  const loadPayouts = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (activeFilter !== 'all') params.status = activeFilter

      const res = await adminAPI.getPayouts(params)
      const data = res.data || res
      const list = data.payouts || data || []
      setPayouts(Array.isArray(list) ? list : [])
      setTotalPages(data.totalPages || 1)
      setTotalPayouts(data.total || 0)

      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load payouts', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type })
  }

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    setPage(1)
  }

  const getFilterCount = (key) => {
    if (key === 'all') return totalPayouts
    return counts[key] ?? 0
  }

  const handleSelectPayout = (payout) => {
    setSelectedPayout(payout)
    setTransactionId(payout.transactionId || '')
    setAdminNotes(payout.adminNotes || '')
    setConfirmAction(null)
  }

  const handleCloseDetail = () => {
    setSelectedPayout(null)
    setConfirmAction(null)
  }

  const handleActionClick = (action) => {
    setConfirmAction(action)
  }

  const handleConfirmAction = async () => {
    if (!selectedPayout || !confirmAction) return
    setUpdating(true)
    try {
      let status = confirmAction
      if (status === 'cancel') status = 'cancelled'
      if (status === 'hold') status = 'hold'

      const payload = { status }
      if (transactionId && confirmAction === 'paid') {
        payload.transactionId = transactionId
      }
      if (adminNotes) {
        payload.adminNotes = adminNotes
      }

      await adminAPI.updatePayoutStatus(selectedPayout._id, payload)

      setPayouts(prev =>
        prev.map(p =>
          p._id === selectedPayout._id
            ? { ...p, status, transactionId: transactionId || p.transactionId, adminNotes: adminNotes || p.adminNotes }
            : p
        )
      )

      setSelectedPayout(prev => ({ ...prev, status, transactionId: transactionId || prev.transactionId, adminNotes: adminNotes || prev.adminNotes }))
      setConfirmAction(null)
      showToast(`Payout ${ACTION_COLORS[confirmAction]?.label || status} successfully`)
    } catch (e) {
      showToast(e.message || 'Failed to update payout status', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status) => {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.pending
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <IoCheckmarkCircle size={18} color="#10B981" />
      case 'rejected':
      case 'cancelled': return <IoCloseCircle size={18} color="#EF4444" />
      case 'hold': return <IoHourglass size={18} color="#F59E0B" />
      default: return <IoWallet size={18} color="#F59E0B" />
    }
  }

  const renderSkeleton = () => (
    <div style={{ padding: 'var(--page-padding)', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
      <Skeleton width={120} height={28} style={{ marginBottom: 24 }} />
      <Skeleton width="100%" height={44} borderRadius={12} style={{ marginBottom: 20 }} />
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} width="100%" height={96} borderRadius={16} style={{ marginBottom: 12 }} />
      ))}
    </div>
  )

  const renderDetailOverlay = () => {
    if (!selectedPayout) return null
    const p = selectedPayout

    return (
      <div
        onClick={handleCloseDetail}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--page-padding)', overflowY: 'auto',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
            padding: 'var(--card-padding)', maxWidth: 420, width: '100%', maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {getStatusIcon(p.status)}
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>Payout Details</h2>
            </div>
            <button
              onClick={handleCloseDetail}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}
            >
              <IoCloseCircle size={22} />
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{p.listenerName}</span>
              {getStatusBadge(p.status)}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
              {p.listenerPhone}
            </div>
            <div style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 22, marginTop: 8 }}>
              ₹{p.amount?.toLocaleString?.() || p.amount}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              {p.diamonds || 0} diamonds
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
            padding: 'var(--card-padding)', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
              Payment Details
            </h3>
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                UPI ID
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{p.upiId || '—'}</span>
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                Bank Account
              </span>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{p.bankAccount || '—'}</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Transaction ID
            </label>
            <input
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              placeholder="Enter transaction ID..."
              style={{
                width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Admin Notes
            </label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Add admin notes..."
              rows={3}
              style={{
                width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.4,
              }}
            />
          </div>

          {!confirmAction ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(ACTION_COLORS).map(([key, config]) => {
                  if (key === 'cancel' && p.status === 'cancelled') return null
                  if (key === 'paid' && p.status === 'paid') return null
                  if (key === 'reject' && p.status === 'rejected') return null
                  if (key === 'hold' && p.status === 'hold') return null
                  return (
                    <button
                      key={key}
                      onClick={() => handleActionClick(key)}
                      style={{
                        padding: '10px 0', borderRadius: 10, border: 'none',
                        cursor: 'pointer', backgroundColor: config.bg,
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        opacity: updating ? 0.6 : 1,
                      }}
                      disabled={updating}
                    >
                      {config.label}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleCloseDetail}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10,
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
                {CONFIRM_MESSAGES[confirmAction]}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmAction(null)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 10,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                    fontSize: 14, fontWeight: 600,
                  }}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={updating}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                    cursor: 'pointer',
                    backgroundColor: ACTION_COLORS[confirmAction]?.bg || 'var(--text-muted)',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    opacity: updating ? 0.6 : 1,
                  }}
                >
                  {updating ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading && payouts.length === 0) {
    return renderSkeleton()
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 40 }}>
      <div style={{ padding: '16px 16px 0' }}>
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
              <IoWallet size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Payouts</h1>
            <div style={{
              padding: '2px 10px', borderRadius: 10,
              backgroundColor: 'var(--accent-mid)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalPayouts}</span>
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
              placeholder="Search by listener name or phone..."
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter.key
            const count = getFilterCount(filter.key)
            return (
              <button
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
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
                {count > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 18, height: 18, borderRadius: 9,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-mid)',
                    color: isActive ? '#fff' : 'var(--accent)',
                    fontSize: 10, fontWeight: 800, padding: '0 4px',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={96} borderRadius={16} style={{ marginBottom: 12 }} />
          ))
        ) : filteredPayouts.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px',
          }}>
            <IoWallet size={48} color="var(--border)" />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
              No payouts found
            </p>
          </div>
        ) : (
          filteredPayouts.map(payout => (
            <div
              key={payout._id}
              onClick={() => handleSelectPayout(payout)}
              style={{
                backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
                padding: 14, marginBottom: 10, cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                      {payout.listenerName || 'Unknown'}
                    </span>
                    {getStatusBadge(payout.status)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {payout.listenerPhone || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 16 }}>
                    ₹{payout.amount?.toLocaleString?.() || payout.amount}
                  </span>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
                    {payout.diamonds || 0} 💎
                  </div>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                {formatDate(payout.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>

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

      {renderDetailOverlay()}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
