import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoFlag, IoCheckmarkCircle, IoCloseCircle, IoChevronBack, IoChevronForward,
  IoBan, IoHourglass, IoSearch,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

const FILTERS = [
  { key: 'all', label: 'All', color: 'var(--accent)' },
  { key: 'pending', label: 'Pending', color: '#F59E0B' },
  { key: 'resolved', label: 'Resolved', color: '#10B981' },
  { key: 'dismissed', label: 'Dismissed', color: 'var(--text-muted)' },
]

const STATUS_BADGE = {
  pending: { label: 'Pending', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  resolved: { label: 'Resolved', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  dismissed: { label: 'Dismissed', bg: 'rgba(107,114,128,0.12)', color: 'var(--text-secondary)' },
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

function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.pending
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

export default function MemberReports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const [counts, setCounts] = useState({})

  const filteredReports = search
    ? reports.filter(r => {
        const q = search.toLowerCase()
        return (r.reporterName?.toLowerCase() || '').includes(q)
          || (r.reportedName?.toLowerCase() || '').includes(q)
          || (r.reporterPhone?.toLowerCase() || '').includes(q)
          || (r.reportedPhone?.toLowerCase() || '').includes(q)
      })
    : reports

  useEffect(() => {
    loadReports()
  }, [activeFilter, page])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (activeFilter !== 'all') params.status = activeFilter

      const res = await adminAPI.getMemberReports(params)
      const data = res.data || res
      const list = data.reports || data || []
      setReports(Array.isArray(list) ? list : [])
      const total = data.total || list.length
      setTotalPages(Math.ceil(total / 20))
      setTotalReports(total)
      if (data.counts) setCounts(data.counts)
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load reports', type: 'error' })
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
    if (key === 'all') return totalReports
    return counts[key] || 0
  }

  const handleSelectReport = (report) => {
    setSelectedReport(report)
  }

  const handleCloseDetail = () => {
    setSelectedReport(null)
  }

  const handleResolve = async () => {
    if (!selectedReport || actionLoading) return
    setActionLoading(true)
    try {
      await adminAPI.resolveReport(selectedReport._id)
      const updated = { ...selectedReport, status: 'resolved' }
      setReports(prev => prev.map(r => r._id === selectedReport._id ? updated : r))
      setSelectedReport(updated)
      showToast('Report resolved successfully')
    } catch (e) {
      showToast(e.message || 'Failed to resolve report', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!selectedReport || actionLoading) return
    setActionLoading(true)
    try {
      await adminAPI.dismissReport(selectedReport._id)
      const updated = { ...selectedReport, status: 'dismissed' }
      setReports(prev => prev.map(r => r._id === selectedReport._id ? updated : r))
      setSelectedReport(updated)
      showToast('Report dismissed')
    } catch (e) {
      showToast(e.message || 'Failed to dismiss report', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBan = async () => {
    if (!selectedReport || actionLoading) return
    setActionLoading(true)
    try {
      await adminAPI.toggleBanUser(selectedReport.reportedId)
      showToast('Reported user banned successfully')
      setActionLoading(false)
    } catch (e) {
      showToast(e.message || 'Failed to ban user', 'error')
      setActionLoading(false)
    }
  }

  const isPending = selectedReport?.status === 'pending'

  const renderDetailOverlay = () => {
    if (!selectedReport) return null
    const r = selectedReport

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
              <IoFlag size={18} color="var(--accent)" />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>Report Details</h2>
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

          <div className="report-detail-section" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Reporter</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{r.reporterName || 'Unknown'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.reporterPhone || '—'}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          </div>

          <div className="report-detail-section" style={{
            backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
            padding: 16, marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
              Reported Member
            </h3>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              {r.reportedName || 'Unknown'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 2 }}>
              {r.reportedPhone || '—'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              ID: {r.reportedId || '—'}
            </div>
          </div>

          <div className="report-detail-section" style={{
            backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',            padding: 'var(--card-padding)', marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Reason / Category</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{r.reason || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Description</div>
              <div style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {r.description || 'No description provided'}
              </div>
            </div>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 20 }}>
            Reported on {formatDate(r.createdAt)}
          </div>

          {isPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={handleResolve}
                  disabled={actionLoading}
                  style={{
                    padding: '12px 0', borderRadius: 10, border: 'none',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    backgroundColor: actionLoading ? 'var(--text-muted)' : '#10B981',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  <IoCheckmarkCircle size={16} />
                  Resolve
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={actionLoading}
                  style={{
                    padding: '12px 0', borderRadius: 10, border: 'none',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    backgroundColor: actionLoading ? 'var(--text-muted)' : 'var(--text-muted)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  <IoCloseCircle size={16} />
                  Dismiss
                </button>
              </div>
              <button
                onClick={handleBan}
                disabled={actionLoading}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  backgroundColor: actionLoading ? 'var(--text-muted)' : '#EF4444',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                <IoBan size={16} />
                Ban Reported User
              </button>
            </div>
          ) : (
            <button
              onClick={handleCloseDetail}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                border: '1px solid var(--border)', cursor: 'pointer',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading && reports.length === 0) {
    return (
      <div style={{ padding: 'var(--page-padding)', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        <Skeleton width={140} height={28} style={{ marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width={90} height={36} borderRadius={20} />
          ))}
        </div>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 40 }}>
      <div style={{ padding: '16px 16px 0' }}>
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
              <IoFlag size={18} color="#fff" />
            </div>
            <h1 className="page-header-title" style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Member Reports</h1>
            <div className="page-header-count" style={{
              padding: '2px 10px', borderRadius: 10,
              backgroundColor: 'var(--accent-mid)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{totalReports}</span>
            </div>
          </div>
        </div>

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
              placeholder="Search by reporter or reported name..."
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
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-light)',
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
            <Skeleton key={i} width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
          ))
        ) : filteredReports.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px',
          }}>
            <IoFlag size={48} color="var(--border)" />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
              No reports found
            </p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div className="report-card list-item"
              key={report._id}
              onClick={() => handleSelectReport(report)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
                      {report.reporterName || 'Unknown'}
                    </span>
                    <StatusBadge status={report.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Reported: <span style={{ color: '#fff', fontWeight: 600 }}>{report.reportedName || 'Unknown'}</span>
                    {report.reportedPhone ? ` (${report.reportedPhone})` : ''}
                  </div>
                </div>
              </div>
              <div style={{
                color: 'var(--text-muted)', fontSize: 12, marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  color: 'var(--accent)', backgroundColor: 'var(--accent-light)',
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                }}>
                  {report.reason || 'Other'}
                </span>
              </div>
              {report.description && (
                <div style={{
                  color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', maxWidth: '100%',
                }}>
                  {report.description}
                </div>
              )}
              <div style={{
                color: '#4B5563', fontSize: 11, borderTop: '1px solid var(--border)',
                paddingTop: 8, marginTop: 6,
              }}>
                {formatDate(report.createdAt)}
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
