import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronBack, IoChevronForward, IoSearch, IoWallet, IoCopy, IoCheckmarkCircle,
  IoCloseCircle, IoHourglass, IoBan, IoEyeOutline, IoDocumentText, IoDownloadOutline,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'
import { DateRangeFilterBar } from '../components/admin/DateRangeFilter'

const FILTERS = [
  { key: 'all', label: 'All', color: 'var(--text-muted)' },
  { key: 'pending', label: 'Pending', color: '#F59E0B' },
  { key: 'approved', label: 'Approved', color: '#3B82F6' },
  { key: 'on_hold', label: 'On Hold', color: '#A78BFA' },
  { key: 'paid', label: 'Paid', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', color: '#EF4444' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--text-muted)' },
]

const STATUS_BADGES = {
  pending: { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  approved: { label: 'Approved', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  on_hold: { label: 'On Hold', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA' },
  cancelled: { label: 'Cancelled', bg: 'rgba(107,114,128,0.12)', color: 'var(--text-muted)' },
}

const ACTION_COLORS = {
  paid: { bg: '#10B981', label: 'Mark as Paid' },
  approve: { bg: '#3B82F6', label: 'Approve' },
  reject: { bg: '#EF4444', label: 'Reject' },
  hold: { bg: '#F59E0B', label: 'On Hold' },
  cancel: { bg: 'var(--text-muted)', label: 'Cancel' },
}

const CONFIRM_MESSAGES = {
  paid: 'Are you sure you want to mark this payout as paid?',
  approve: 'Are you sure you want to approve this payout?',
  reject: 'Are you sure you want to reject this payout?',
  hold: 'Are you sure you want to put this payout on hold?',
  cancel: 'Are you sure you want to cancel this payout?',
}

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  on_hold: 'On Hold',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const EXPORT_HEADERS = [
  'Request ID', 'Listener Name', 'Listener Phone', 'Amount (₹)', 'TDS Rate (%)', 'TDS Amount (₹)', 'Net Amount (₹)',
  'Credit Timeline (days)', 'Diamonds',
  'Bank Name', 'Account Number', 'IFSC Code', 'PAN Number', 'Status',
  'Requested At', 'Processed At', 'Transaction ID', 'Admin Notes',
]

const getTimelineText = (p) => {
  const min = Math.max(1, Number(p.creditDaysMin) || 3)
  const max = Math.max(min, Number(p.creditDaysMax) || 7)
  return min === max ? `${min} day${min === 1 ? '' : 's'}` : `${min}–${max} days`
}

const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

const formatCsvDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [revealSensitive, setRevealSensitive] = useState(false)
  const [exporting, setExporting] = useState(false)

  const maskSensitive = (value, keep = 4) => {
    if (!value) return '—'
    const str = String(value)
    if (str.length <= keep) return '•'.repeat(str.length)
    return '•'.repeat(Math.max(str.length - keep, 4)) + str.slice(-keep)
  }

  useEffect(() => {
    loadPayouts()
  }, [activeFilter, page, refreshKey, startDate, endDate, search])

  const loadPayouts = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (activeFilter !== 'all') params.status = activeFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (search) params.search = search

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
    setStartDate('')
    setEndDate('')
    setSearch('')
    setPage(1)
  }

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type })
  }

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    setPage(1)
  }

  const handleExportCSV = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const params = {}
      if (activeFilter !== 'all') params.status = activeFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (search) params.search = search

      const res = await adminAPI.exportPayouts(params)
      const rows = res.data?.payouts || []
      if (!rows.length) {
        showToast('No payouts found for the current filters', 'error')
        return
      }

      const lines = [EXPORT_HEADERS.map(csvEscape).join(',')]
      rows.forEach(r => {
        lines.push([
          r.requestId,
          r.listenerName,
          r.listenerPhone,
          r.amount,
          r.tdsRate,
          r.tdsAmount,
          r.netAmount,
          r.creditDaysMin && r.creditDaysMax ? `${r.creditDaysMin}-${r.creditDaysMax}` : '3-7',
          r.diamonds,
          r.bankName,
          r.accountNumber,
          r.ifscCode,
          r.panNumber,
          STATUS_LABELS[r.status] || r.status,
          formatCsvDate(r.createdAt),
          formatCsvDate(r.processedAt),
          r.transactionId,
          r.adminNotes,
        ].map(csvEscape).join(','))
      })

      // BOM so Excel opens UTF-8 (₹ symbol) correctly
      const csv = '\uFEFF' + lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payouts-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast(`Exported ${rows.length} payout request${rows.length === 1 ? '' : 's'}`)
    } catch (e) {
      console.error('Export failed:', e)
      showToast(e.message || 'Failed to export payouts', 'error')
    } finally {
      setExporting(false)
    }
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
    setRevealSensitive(false)
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
      if (status === 'hold') status = 'on_hold'

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
      case 'approved': return <IoCheckmarkCircle size={18} color="#3B82F6" />
      case 'rejected':
      case 'cancelled': return <IoCloseCircle size={18} color="#EF4444" />
      case 'on_hold': return <IoHourglass size={18} color="#F59E0B" />
      default: return <IoWallet size={18} color="#F59E0B" />
    }
  }

  const renderSkeleton = () => (
    <div className="page-wrap" style={{ padding: 'var(--page-padding)', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
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
        <div className="modal-content"
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

            {(p.tdsAmount > 0 || p.netAmount > 0) && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 10,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Gross Amount</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>₹{p.amount?.toLocaleString?.() || p.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TDS Deduction ({p.tdsRate || 0}%)</span>
                  <span style={{ fontSize: 13, color: '#F87171', fontWeight: 700 }}>− ₹{p.tdsAmount?.toLocaleString?.() || p.tdsAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Net Amount (credited)</span>
                  <span style={{ fontSize: 14, color: '#34D399', fontWeight: 800 }}>₹{p.netAmount?.toLocaleString?.() || p.netAmount}</span>
                </div>
              </div>
            )}

            {/* Credit Timeline (SLA) */}
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10,
              backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <IoHourglass size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Credit Timeline (SLA)</span>
                  <span style={{ fontSize: 13, color: '#60A5FA', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {getTimelineText(p)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Credited within {getTimelineText(p)} of approval
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
            padding: 'var(--card-padding)', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                Bank Details
              </h3>
              <button
                onClick={() => setRevealSensitive(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8,
                  backgroundColor: revealSensitive ? 'rgba(168,85,247,0.15)' : 'var(--bg-secondary)',
                  border: '1px solid ' + (revealSensitive ? 'rgba(168,85,247,0.4)' : 'var(--border)'),
                  color: revealSensitive ? '#C084FC' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <IoEyeOutline size={14} />
                {revealSensitive ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {[['Bank Name', p.bankName], ['Account Number', p.accountNumber], ['IFSC Code', p.bankIfscCode || p.ifscCode]].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                  {label}
                </span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  {revealSensitive ? (val || '—') : (label === 'Bank Name' ? (val || '—') : maskSensitive(val))}
                </span>
              </div>
            ))}

            <div style={{ marginBottom: 10 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                Phone Number
              </span>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{p.phone || '—'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                  PAN Number (TDS)
                </span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  {revealSensitive ? (p.panNumber || '—') : (p.panNumber ? maskSensitive(p.panNumber, 4) : '—')}
                </span>
              </div>
              {p.panNumber && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  backgroundColor: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
                  fontSize: 10, fontWeight: 700,
                }}>
                  <IoDocumentText size={12} />
                  For TDS
                </span>
              )}
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
              <div className="payout-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(ACTION_COLORS).map(([key, config]) => {
                  if (key === 'cancel' && p.status === 'cancelled') return null
                  if (key === 'paid' && p.status === 'paid') return null
                  if (key === 'approve' && p.status === 'approved') return null
                  if (key === 'reject' && (p.status === 'rejected' || p.status === 'cancelled')) return null
                  if (key === 'hold' && p.status === 'on_hold') return null
                  if (key === 'hold' && (p.status === 'paid' || p.status === 'cancelled')) return null
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
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 40 }}>
      <div className="page-wrap-inner" style={{ padding: '16px 16px 0' }}>
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
              <IoWallet size={18} color="#fff" />
            </div>
            <h1 className="page-header-title" style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Payouts</h1>
            <div className="page-header-count" style={{
              padding: '2px 10px', borderRadius: 10,
              backgroundColor: 'var(--accent-mid)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalPayouts}</span>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              backgroundColor: exporting ? 'var(--bg-tertiary)' : 'var(--accent-light)',
              border: '1px solid ' + (exporting ? 'var(--border)' : 'var(--accent)'),
              color: exporting ? 'var(--text-muted)' : 'var(--accent)',
              fontSize: 12.5, fontWeight: 700,
              cursor: exporting ? 'not-allowed' : 'pointer',
              marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.backgroundColor = 'var(--accent-mid)' }}
            onMouseLeave={e => { if (!exporting) e.currentTarget.style.backgroundColor = 'var(--accent-light)' }}
          >
            <IoDownloadOutline size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Date Period Filter */}
        <DateRangeFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartChange={v => { setStartDate(v); setPage(1) }}
          onEndChange={v => { setEndDate(v); setPage(1) }}
          onPreset={handlePresetPeriod}
          onClear={handleClearFilters}
          showClear={!!(startDate || endDate || search)}
        />

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
          <div className="search-bar" style={{
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

        <div className="filter-tabs tabs-scroll" style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
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

      <div className="page-wrap-inner" style={{ padding: '0 16px' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={96} borderRadius={16} style={{ marginBottom: 12 }} />
          ))
        ) : payouts.length === 0 ? (
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
          payouts.map(payout => (
            <div className="payout-card list-item"
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: 'var(--text-muted)', fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>{formatDate(payout.createdAt)}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <IoHourglass size={11} color="#60A5FA" />
                  <span style={{ color: '#60A5FA', fontWeight: 700 }}>{getTimelineText(payout)}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{
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
