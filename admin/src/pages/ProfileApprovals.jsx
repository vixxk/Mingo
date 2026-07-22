import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSearch, IoCheckmarkCircle, IoClose, IoCloseCircle,
  IoImageOutline, IoChevronBack, IoShieldCheckmark,
  IoStar, IoPerson, IoDocumentText,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

const TABS = ['All', 'Rejected', 'Approved', 'Pending']

const STATUS_STYLE = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#1A150B' },
  approved: { label: 'Approved', color: '#10B981', bg: '#05120B' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#1A0B0B' },
}

const ALL_FIELDS = [
  'hookline', 'aboutMe', 'expertiseTags', 'languages',
  'galleryImages', 'galleryVideos', 'profileImage', 'coverImage',
]

const FIELD_META = {
  hookline:        { label: 'Hookline',    type: 'text' },
  aboutMe:         { label: 'About Me',    type: 'text' },
  expertiseTags:   { label: 'Expertise Tags', type: 'tags' },
  languages:       { label: 'Languages',   type: 'tags' },
  galleryImages:   { label: 'Gallery Images', type: 'images' },
  galleryVideos:   { label: 'Gallery Videos', type: 'videos' },
  profileImage:    { label: 'Profile Image', type: 'image' },
  coverImage:      { label: 'Cover Image', type: 'image' },
}

function getFieldValue(profile, key) {
  const val = profile ? profile[key] : undefined
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  return val
}

function isFieldChanged(current, requested, key) {
  const a = current ? current[key] : undefined
  const b = requested ? requested[key] : undefined
  const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
  if (isEmpty(a) && isEmpty(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return !arraysEqualIgnoringOrder(a, b)
  if (Array.isArray(a) || Array.isArray(b)) return true
  const aStr = String(a ?? '')
  const bStr = String(b ?? '')
  if (aStr === '' && bStr === '') return false
  return aStr !== bStr
}

function normalizeProfile(profile) {
  if (!profile) return {}
  return {
    hookline: profile.hookline || '',
    aboutMe: profile.aboutMe || '',
    expertiseTags: Array.isArray(profile.expertiseTags) ? profile.expertiseTags : [],
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    galleryImages: Array.isArray(profile.galleryImages) ? profile.galleryImages : [],
    galleryVideos: Array.isArray(profile.galleryVideos) ? profile.galleryVideos : [],
    profileImage: profile.profileImage || '',
    coverImage: profile.coverImage || '',
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function arraysEqualIgnoringOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  const sortedA = [...a].map(String).sort()
  const sortedB = [...b].map(String).sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

function getChangedFields(current, requested) {
  const changed = []

  for (const key of ALL_FIELDS) {
    if (isFieldChanged(current, requested, key)) {
      changed.push(key)
    }
  }

  return changed
}

function ImageDiff({ label, currentUrl, newUrl, onImageClick }) {
  const hasCurrent = !!currentUrl
  const hasNew = !!newUrl
  const hasChange = currentUrl !== newUrl
  if (!hasChange) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IoPerson size={12} />
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {hasCurrent && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', marginBottom: 4, textTransform: 'uppercase' }}>Current</div>
            <div
              onClick={() => onImageClick?.(currentUrl)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                backgroundColor: 'var(--border)', border: '2px solid #EF4444',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
              }}
            >
              <img src={currentUrl} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}
        {hasCurrent && hasNew && (
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
            <span style={{ color: '#4B5563', fontSize: 18, fontWeight: 700 }}>→</span>
          </div>
        )}
        {hasNew && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#10B981', marginBottom: 4, textTransform: 'uppercase' }}>New</div>
            <div
              onClick={() => onImageClick?.(newUrl)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                backgroundColor: 'var(--border)', border: '2px solid #10B981',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
              }}
            >
              <img src={newUrl} alt="New" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}
        {!hasCurrent && hasNew && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#10B981', marginBottom: 4, textTransform: 'uppercase' }}>Added</div>
            <div
              onClick={() => onImageClick?.(newUrl)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                backgroundColor: 'var(--border)', border: '2px solid #10B981',
                overflow: 'hidden', cursor: 'pointer',
              }}
            >
              <img src={newUrl} alt="New" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}
        {hasCurrent && !hasNew && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', marginBottom: 4, textTransform: 'uppercase' }}>Removed</div>
            <div
              onClick={() => onImageClick?.(currentUrl)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                backgroundColor: 'var(--border)', border: '2px solid #EF4444',
                overflow: 'hidden', cursor: 'pointer', opacity: 0.6,
              }}
            >
              <img src={currentUrl} alt="Removed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DiffField({ fieldKey, current, requested, onImageClick }) {
  const meta = FIELD_META[fieldKey]
  if (!meta) return null
  const { label, type } = meta

  if (type === 'image') {
    return <ImageDiff label={label} currentUrl={current} newUrl={requested} onImageClick={onImageClick} />
  }

  if (type === 'tags') {
    const curArr = Array.isArray(current) ? current : []
    const reqArr = Array.isArray(requested) ? requested : []
    const curSet = new Set(curArr)
    const reqSet = new Set(reqArr)
    const added = reqArr.filter(v => !curSet.has(v))
    const removed = curArr.filter(v => !reqSet.has(v))
    const kept = reqArr.filter(v => curSet.has(v))

    if (added.length === 0 && removed.length === 0) return null

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {added.map((v, i) => (
            <span key={`add-${i}`} style={{
              fontSize: 11, color: '#10B981', backgroundColor: '#05120B',
              padding: '3px 8px', borderRadius: 8, border: '1px solid #10B98133',
            }}>
              + {v}
            </span>
          ))}
          {removed.map((v, i) => (
            <span key={`rem-${i}`} style={{
              fontSize: 11, color: '#EF4444', backgroundColor: '#1A0B0B',
              padding: '3px 8px', borderRadius: 8, border: '1px solid #EF444433',
              textDecoration: 'line-through',
            }}>
              - {v}
            </span>
          ))}
          {kept.map((v, i) => (
            <span key={`keep-${i}`} style={{
              fontSize: 11, color: 'var(--text-secondary)', backgroundColor: 'var(--border)',
              padding: '3px 8px', borderRadius: 8,
            }}>
              {v}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'images' || type === 'videos') {
    const curArr = Array.isArray(current) ? current : []
    const reqArr = Array.isArray(requested) ? requested : []

    if (curArr.length === 0 && reqArr.length === 0) return null

    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IoImageOutline size={12} />
          {label}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
            ({curArr.length} → {reqArr.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {curArr.map((url, i) => (
            <div key={`cur-${i}`} onClick={() => onImageClick?.(url)}
              style={{
                width: 56, height: 56, borderRadius: 10,
                backgroundColor: 'var(--border)', border: '2px solid #EF4444',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
              }}>
              {url ? (
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IoImageOutline size={18} color="var(--text-muted)" />
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(239,68,68,0.85)', fontSize: 7, color: '#fff',
                textAlign: 'center', padding: '1px 0', fontWeight: 700, textTransform: 'uppercase',
              }}>
                Current
              </div>
            </div>
          ))}
          {reqArr.map((url, i) => (
            <div key={`req-${i}`} onClick={() => onImageClick?.(url)}
              style={{
                width: 56, height: 56, borderRadius: 10,
                backgroundColor: 'var(--border)', border: '2px solid #10B981',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
              }}>
              {url ? (
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IoImageOutline size={18} color="var(--text-muted)" />
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(16,185,129,0.85)', fontSize: 7, color: '#fff',
                textAlign: 'center', padding: '1px 0', fontWeight: 700, textTransform: 'uppercase',
              }}>
                New
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Text field diff
  const curText = String(current ?? '')
  const reqText = String(requested ?? '')
  if (curText === reqText) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IoDocumentText size={12} />
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {curText && (
          <div style={{
            backgroundColor: '#1A0B0B', border: '1px solid #EF444422',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', marginBottom: 3 }}>Current</div>
            <div style={{ color: '#FCA5A5', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {curText}
            </div>
          </div>
        )}
        {reqText && (
          <div style={{
            backgroundColor: '#05120B', border: '1px solid #10B98122',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', marginBottom: 3 }}>New</div>
            <div style={{ color: '#6EE7B7', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {reqText}
            </div>
          </div>
        )}
        {!curText && reqText && (
          <div style={{ fontSize: 11, color: '#10B981', fontStyle: 'italic' }}>Added</div>
        )}
        {curText && !reqText && (
          <div style={{ fontSize: 11, color: '#EF4444', fontStyle: 'italic' }}>Removed</div>
        )}
      </div>
    </div>
  )
}

export default function ProfileApprovals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmApproveId, setConfirmApproveId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [expandedCards, setExpandedCards] = useState(new Set())

  const mapApproval = (item) => ({
    _id: item.id || item._id,
    listenerName: item.name || item.listenerName || 'Unknown',
    listenerPhone: item.phone || item.listenerPhone || '',
    status: item.profileStatus || item.status || 'pending',
    currentValues: item.currentProfile || {},
    requestedValues: item.requestedProfile || item.draftProfile || null,
    adminNotes: item.profileAdminNotes || item.adminNotes || '',
    createdAt: item.profileSubmittedAt || item.createdAt,
    verified: item.verified,
    rating: item.rating,
    userId: item.userId,
    profileChangeHistory: item.profileChangeHistory || [],
  })

  const fetchApprovals = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const res = await adminAPI.getProfileApprovals({ limit: 100, ...params })
      const responseData = res.data || res
      const rawApprovals = responseData.approvals || responseData || []
      setApprovals(Array.isArray(rawApprovals) ? rawApprovals.map(mapApproval) : [])
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load approvals', type: 'error' })
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApprovals({ status: 'all' })
  }, [fetchApprovals])

  const filteredApprovals = approvals.filter(a => {
    const name = (a.listenerName || '').toLowerCase()
    const phone = (a.listenerPhone || '').toLowerCase()
    const s = search.toLowerCase()
    if (s && !name.includes(s) && !phone.includes(s)) return false
    if (activeTab === 'All') return true
    return a.status === activeTab.toLowerCase()
  })

  const handleApprove = async (id) => {
    setConfirmApproveId(null)
    setApprovals(prev => prev.map(a => a._id === id ? { ...a, status: 'approved' } : a))
    try {
      await adminAPI.approveProfileChanges(id)
      setToast({ visible: true, message: 'Profile changes approved', type: 'success' })
    } catch (e) {
      setApprovals(prev => prev.map(a => a._id === id ? { ...a, status: 'pending' } : a))
      setToast({ visible: true, message: e.message || 'Failed to approve', type: 'error' })
    }
  }

  const handleReject = async (id) => {
    if (!rejectReason.trim()) return
    const reason = rejectReason.trim()
    setRejectId(null)
    setRejectReason('')
    setApprovals(prev => prev.map(a => a._id === id ? { ...a, status: 'rejected' } : a))
    try {
      await adminAPI.rejectProfileChanges(id, reason)
      setToast({ visible: true, message: 'Profile changes rejected', type: 'success' })
    } catch (e) {
      setApprovals(prev => prev.map(a => a._id === id ? { ...a, status: 'pending' } : a))
      setToast({ visible: true, message: e.message || 'Failed to reject', type: 'error' })
    }
  }

  const navigate = useNavigate()

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', minHeight: '100%', padding: 'var(--page-padding)' }}>
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
            <IoShieldCheckmark size={18} color="#fff" />
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 'var(--header-font-size)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Profile Approvals
          </h1>
          <div style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>
              {approvals.length}
            </span>
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
            placeholder="Search by name or phone..."
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

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: '1px solid',
              borderColor: activeTab === tab ? 'var(--accent)' : 'var(--border)',
              backgroundColor: activeTab === tab ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={220} borderRadius={16} style={{ marginBottom: 15 }} />
          ))}
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14,
        }}>
          No profile approvals found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredApprovals.map(approval => {
            const changedFields = getChangedFields(approval.currentValues, approval.requestedValues)
            const normalizedCurrent = normalizeProfile(approval.currentValues)
            const normalizedRequested = normalizeProfile(approval.requestedValues)
            const badge = STATUS_STYLE[approval.status] || STATUS_STYLE.pending
            const isExpanded = expandedCards.has(approval._id)

            return (
              <div key={approval._id} style={{
                backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
                overflow: 'hidden',
              }}>
                {/* Card Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                        {approval.listenerName || 'Unknown'}
                      </span>
                      {approval.verified && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                          color: '#A855F7', backgroundColor: '#A855F71a', border: '1px solid #A855F733',
                        }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      {approval.listenerPhone || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {approval.rating != null && approval.rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <IoStar size={13} color="#FBBF24" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24' }}>
                          {approval.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                      color: badge.color, backgroundColor: badge.bg,
                      border: `1px solid ${badge.color}33`, whiteSpace: 'nowrap',
                    }}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 16px' }}>
                  {changedFields.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                      No changed fields detected
                    </div>
                  ) : (
                    <>
                      {/* Changes summary */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
                        padding: '6px 12px', borderRadius: 10,
                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          backgroundColor: 'var(--accent-mid)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: 'var(--accent)',
                        }}>
                          {changedFields.length}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {changedFields.length === 1 ? 'field changed' : 'fields changed'}
                        </span>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {(isExpanded ? changedFields : changedFields.slice(0, 4)).map(f => (
                            <span key={f} style={{
                              fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
                              backgroundColor: 'var(--bg-secondary)', padding: '2px 6px',
                              borderRadius: 6, border: '1px solid var(--border)',
                            }}>
                              {FIELD_META[f]?.label || f}
                            </span>
                          ))}
                          {changedFields.length > 4 && (
                            <span
                              onClick={() => setExpandedCards(prev => {
                                const next = new Set(prev)
                                if (next.has(approval._id)) next.delete(approval._id)
                                else next.add(approval._id)
                                return next
                              })}
                              style={{
                                fontSize: 9, color: 'var(--accent)', padding: '2px 4px',
                                cursor: 'pointer', textDecoration: 'underline',
                                textDecorationColor: 'var(--accent)',
                              }}
                            >
                              {isExpanded ? 'show less' : `+${changedFields.length - 4} more`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diff fields */}
                      {changedFields.map(fieldKey => (
                        <DiffField
                          key={fieldKey}
                          fieldKey={fieldKey}
                          current={normalizedCurrent[fieldKey]}
                          requested={normalizedRequested[fieldKey]}
                          onImageClick={(url) => setPreviewImage(url)}
                        />
                      ))}
                    </>
                  )}

                  {approval.adminNotes && (
                    <div style={{
                      marginTop: 8, backgroundColor: '#120B1A', borderRadius: 10,
                      padding: '10px 12px', border: '1px solid var(--accent-mid)',
                    }}>
                      <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                        Admin Notes
                      </div>
                      <div style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.4 }}>
                        {approval.adminNotes}
                      </div>
                    </div>
                  )}

                  <div style={{ color: '#4B5563', fontSize: 11, marginTop: 10 }}>
                    Requested {formatDate(approval.createdAt)}
                  </div>

                  {/* Change History */}
                  {approval.profileChangeHistory && approval.profileChangeHistory.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                        padding: '6px 12px', borderRadius: 10,
                        backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Past Changes ({approval.profileChangeHistory.length})
                        </span>
                      </div>
                      {approval.profileChangeHistory.map((history, idx) => {
                        const hChangedFields = getChangedFields(history.previousProfile, history.requestedProfile)
                        const hNormalizedCurrent = normalizeProfile(history.previousProfile)
                        const hNormalizedRequested = normalizeProfile(history.requestedProfile)
                        const hBadge = history.status === 'approved'
                          ? { label: 'Approved', color: '#10B981', bg: '#05120B' }
                          : { label: 'Rejected', color: '#EF4444', bg: '#1A0B0B' }
                        return (
                          <div key={idx} style={{
                            marginBottom: 10, padding: '10px 12px', borderRadius: 12,
                            backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              marginBottom: 8,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {formatDate(history.submittedAt)}
                                </span>
                                {history.reviewedAt && (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                    • Reviewed {formatDate(history.reviewedAt)}
                                  </span>
                                )}
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                                color: hBadge.color, backgroundColor: hBadge.bg,
                                border: `1px solid ${hBadge.color}33`,
                              }}>
                                {hBadge.label}
                              </span>
                            </div>
                            {hChangedFields.length === 0 ? (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                No changes
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                                    backgroundColor: 'var(--accent-mid)', padding: '2px 6px', borderRadius: 6,
                                  }}>
                                    {hChangedFields.length} fields changed
                                  </span>
                                  {hChangedFields.map(f => (
                                    <span key={f} style={{
                                      fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
                                      backgroundColor: 'var(--bg-secondary)', padding: '2px 6px',
                                      borderRadius: 6, border: '1px solid var(--border)',
                                    }}>
                                      {FIELD_META[f]?.label || f}
                                    </span>
                                  ))}
                                </div>
                                {hChangedFields.map(fieldKey => (
                                  <DiffField
                                    key={fieldKey}
                                    fieldKey={fieldKey}
                                    current={hNormalizedCurrent[fieldKey]}
                                    requested={hNormalizedRequested[fieldKey]}
                                    onImageClick={(url) => setPreviewImage(url)}
                                  />
                                ))}
                              </>
                            )}
                            {history.adminNotes && (
                              <div style={{
                                marginTop: 6, fontSize: 11, color: '#FCA5A5',
                                backgroundColor: '#1A0B0B', borderRadius: 8,
                                padding: '6px 8px', border: '1px solid #EF444433',
                              }}>
                                <span style={{ fontWeight: 600, color: '#EF4444' }}>Rejection reason: </span>
                                {history.adminNotes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {approval.status === 'pending' && (
                  <div style={{
                    padding: '12px 16px', borderTop: '1px solid var(--border)',
                    display: 'flex', gap: 8, flexDirection: 'column',
                  }}>
                    {rejectId === approval._id ? (
                      <div style={{
                        backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, padding: 12,
                        border: '1px solid var(--border)',
                      }}>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          rows={3}
                          style={{
                            width: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            borderRadius: 10, color: '#fff', padding: 10, fontSize: 13,
                            outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => { setRejectId(null); setRejectReason('') }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10,
                              border: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>
                            Cancel
                          </button>
                          <button onClick={() => handleReject(approval._id)}
                            disabled={!rejectReason.trim()}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                              backgroundColor: !rejectReason.trim() ? 'var(--text-muted)' : '#EF4444',
                              color: '#fff', fontSize: 13, fontWeight: 700,
                              cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer',
                            }}>
                            Submit Rejection
                          </button>
                        </div>
                      </div>
                    ) : confirmApproveId === approval._id ? (
                      <div style={{
                        backgroundColor: 'var(--bg-tertiary)', borderRadius: 12, padding: 12,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
                          Approve these profile changes?
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setConfirmApproveId(null)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10,
                              border: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>
                            Cancel
                          </button>
                          <button onClick={() => handleApprove(approval._id)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                              backgroundColor: '#10B981',
                              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setConfirmApproveId(approval._id)}
                          disabled={actionLoading === approval._id}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                            backgroundColor: '#10B981', color: '#fff', fontSize: 13,
                            fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                          <IoCheckmarkCircle size={16} />
                          Approve
                        </button>
                        <button onClick={() => { setRejectId(approval._id); setRejectReason('') }}
                          disabled={actionLoading === approval._id}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                            backgroundColor: '#EF4444', color: '#fff', fontSize: 13,
                            fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                          <IoCloseCircle size={16} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {previewImage && (
        <div onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <button onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12,
              width: 40, height: 40, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', zIndex: 2001,
            }}>
            <IoClose size={22} color="#fff" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}
