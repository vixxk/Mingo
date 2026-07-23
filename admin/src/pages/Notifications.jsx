import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoChevronBack, IoMegaphone, IoAdd, IoClose, IoSend,
  IoPeople, IoPerson, IoHeadset, IoSearch, IoTimeOutline,
  IoCheckmarkCircle, IoAlertCircle, IoRemove,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const truncate = (str, len) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function HistorySkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 'var(--card-padding)', marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Skeleton width="60%" height={18} borderRadius={6} />
            <Skeleton width={70} height={22} borderRadius={10} />
          </div>
          <Skeleton width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={14} borderRadius={6} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Skeleton width={60} height={12} borderRadius={6} />
            <Skeleton width={80} height={12} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  )
}

const targetColors = { everyone: 'var(--accent)', users: '#A855F7', listeners: '#10B981' }
const deliveryMethods = ['both', 'push', 'in-app']

export default function Notifications() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('everyone')
  const [deliveryMethod, setDeliveryMethod] = useState('both')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedTargets, setSelectedTargets] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [modal, setModal] = useState({ visible: false, type: 'success', message: '' })
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getNotificationHistory()
      const responseData = res.data || res || {}
      const items = Array.isArray(responseData) ? responseData : responseData.campaigns || responseData.notifications || responseData || []
      setHistory(items)
    } catch (e) {
      console.error('Failed to fetch history', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  useEffect(() => {
    if (!searchQuery.trim() || target === 'everyone') {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const apiFn = target === 'users' ? adminAPI.getUsers : adminAPI.getListeners
        const res = await apiFn({ search: searchQuery.trim(), limit: 10 })
        const data = res.data || res
        const list = data.users || data.listeners || data || []
        const filtered = Array.isArray(list)
          ? list.filter(item => !selectedTargets.some(s => s.id === (item.id || item._id)))
          : []
        setSearchResults(filtered)
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, target, selectedTargets])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelectTarget = (item) => {
    const id = item.id || item._id
    if (selectedTargets.some(s => s.id === id)) return
    setSelectedTargets(prev => [...prev, { id, name: item.name || item.phone || 'Unknown' }])
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleRemoveTarget = (id) => {
    setSelectedTargets(prev => prev.filter(s => s.id !== id))
  }

  const handleTargetChange = (newTarget) => {
    setTarget(newTarget)
    setSelectedTargets([])
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setTarget('everyone')
    setDeliveryMethod('both')
    setSelectedTargets([])
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const handleSend = async () => {
    if (!message.trim() || (target !== 'everyone' && selectedTargets.length === 0)) return
    setSending(true)
    try {
      const payload = {
        title: title.trim(),
        body: message.trim(),
        target: target === 'everyone' ? 'all' : target,
        notificationMethod: deliveryMethod,
      }
      if (target !== 'everyone') {
        payload.userIds = selectedTargets.map(s => s.id)
      }
      await adminAPI.sendNotification(payload)
      setModal({ visible: true, type: 'success', message: 'Campaign sent successfully!' })
      resetForm()
      setShowForm(false)
      fetchHistory()
    } catch (e) {
      setModal({ visible: true, type: 'error', message: e.message || 'Failed to send campaign' })
    } finally {
      setSending(false)
    }
  }

  const closeModal = () => setModal(prev => ({ ...prev, visible: false }))

  const isFormValid = message.trim() && (target === 'everyone' || selectedTargets.length > 0)

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalContentIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
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
            <IoMegaphone size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Notifications</h1>
          <div className="page-header-count" style={{
            padding: '2px 10px', borderRadius: 10,
            backgroundColor: 'var(--accent-mid)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{history.length}</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          title={showForm ? 'Close form' : 'New Campaign'}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: showForm
              ? 'var(--bg-tertiary)'
              : 'var(--accent-gradient)',
            border: showForm
              ? '1px solid var(--border)'
              : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: showForm ? 'var(--text-secondary)' : '#fff',
            boxShadow: showForm ? 'none' : '0 4px 14px rgba(168,85,247,0.35)',
            transition: 'all 0.25s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (!showForm) {
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(168,85,247,0.5)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={e => {
            if (!showForm) {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(168,85,247,0.35)'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
        >
          {showForm ? <IoRemove size={22} /> : <IoAdd size={22} />}
        </button>
      </div>

      {/* Campaign Creation Form */}
      {showForm && (
        <div className="campaign-form" style={{
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: 20, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
            New Campaign
          </h2>

          {/* Title Input */}
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Title
          </label>
          <div style={{
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '0 14px', marginBottom: 16,
          }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Campaign title (optional)"
              style={{
                width: '100%', background: 'none', border: 'none', color: '#fff',
                fontSize: 14, padding: '12px 0', outline: 'none',
              }}
            />
          </div>

          {/* Message Textarea */}
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Message <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your campaign message..."
            rows={3}
            style={{
              width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: '#fff', padding: 12, fontSize: 14,
              outline: 'none', resize: 'none', marginBottom: 16, fontFamily: 'inherit',
            }}
          />

          {/* Target Selector */}
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Target Audience
          </label>
          <div style={{
            display: 'flex', backgroundColor: 'var(--bg-tertiary)', borderRadius: 12,
            padding: 4, border: '1px solid var(--border)', marginBottom: 16,
          }}>
            {[
              { key: 'everyone', label: 'Everyone', icon: IoPeople },
              { key: 'users', label: 'Users', icon: IoPerson },
              { key: 'listeners', label: 'Listeners', icon: IoHeadset },
            ].map(t => {
              const Icon = t.icon
              const isActive = target === t.key
              return (
                <button className="notif-target-btn"
                  key={t.key}
                  onClick={() => handleTargetChange(t.key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '10px 0', borderRadius: 10, border: 'none',
                      background: isActive
                        ? t.key === 'everyone'
                          ? 'var(--accent-mid)'
                          : `${targetColors[t.key]}20`
                        : 'transparent',
                    color: isActive ? targetColors[t.key] : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Searchable Picker (Users / Listeners) */}
          {target !== 'everyone' && (
            <div ref={searchRef} style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '0 14px', height: 42,
              }}>
                <IoSearch size={16} color="var(--text-muted)" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                  placeholder={`Search ${target}...`}
                  style={{
                    flex: 1, background: 'none', border: 'none', color: '#fff',
                    fontSize: 13, outline: 'none', height: '100%',
                  }}
                />
                {searching && (
                  <div style={{
                    width: 16, height: 16, borderRadius: 8,
                    border: '2px solid var(--accent)', borderTopColor: 'transparent',
                    animation: 'pulse 0.8s linear infinite',
                  }} />
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  borderRadius: 12, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                      {searchQuery.trim() ? 'No results found' : 'Type to search...'}
                    </div>
                  ) : (
                    searchResults.map(item => {
                      const id = item.id || item._id
                      const name = item.name || item.phone || 'Unknown'
                      return (
                        <button
                          key={id}
                          onClick={() => handleSelectTarget(item)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: 10, padding: '10px 14px', border: 'none',
                            background: 'none', color: '#fff', fontSize: 13,
                            cursor: 'pointer', textAlign: 'left',
                            borderBottom: '1px solid var(--border)',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 14,
                            background: `linear-gradient(135deg, ${targetColors[target]}, ${targetColors[target]}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0,
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ flex: 1 }}>{name}</span>
                          <IoAdd size={16} color="var(--accent)" />
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {/* Selected Chips */}
              {selectedTargets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {selectedTargets.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 10,
                        backgroundColor: `${targetColors[target]}15`,
                        border: `1px solid ${targetColors[target]}30`,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: targetColors[target] }}>
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleRemoveTarget(item.id)}
                        style={{
                          width: 16, height: 16, borderRadius: 8, border: 'none',
                          backgroundColor: `${targetColors[target]}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: targetColors[target], padding: 0,
                          fontSize: 10,
                        }}
                      >
                        <IoClose size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delivery Method */}
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Delivery Method
          </label>
          <div style={{
            display: 'flex', gap: 8, marginBottom: 20,
          }}>
            {deliveryMethods.map(dm => (
              <button className="notif-delivery-btn"
                key={dm}
                onClick={() => setDeliveryMethod(dm)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: deliveryMethod === dm ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: deliveryMethod === dm ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: deliveryMethod === dm ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  textTransform: 'capitalize', transition: 'all 0.2s',
                }}
              >
                {dm === 'both' ? 'Both' : dm === 'push' ? 'Push' : 'In-App'}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSend}
            disabled={!isFormValid || sending}
            style={{
              width: '100%', border: 'none', borderRadius: 14, cursor: isFormValid && !sending ? 'pointer' : 'not-allowed',
              background: isFormValid && !sending
                ? 'var(--accent-gradient)'
                : 'var(--border)',
              padding: '14px 0', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              color: isFormValid && !sending ? '#fff' : 'var(--text-muted)',
              fontSize: 15, fontWeight: 800, transition: 'all 0.2s',
            }}
          >
            <IoSend size={16} />
            {sending ? 'Sending...' : 'Send Campaign'}
          </button>
        </div>
      )}

      {/* Campaign History */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
          Campaign History
        </h2>
        {/* count moved next to header title */}
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : history.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px',
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        }}>
          <IoMegaphone size={48} color="var(--border)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>
            No campaigns sent yet
          </p>
        </div>
      ) : (
        <div>
          {history.map((camp) => {
            const tColor = targetColors[camp.target] || 'var(--accent)'
            const tLabel = camp.target ? camp.target.charAt(0).toUpperCase() + camp.target.slice(1) : 'Everyone'
            return (
              <div className="notif-history-item"
                key={camp._id || camp.id}
                style={{
                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)', padding: 'var(--card-padding)', marginBottom: 10,
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="notif-campaign-title" style={{ fontSize: 15, fontWeight: 800, color: '#fff', display: 'block' }}>
                      {camp.title || 'Untitled Campaign'}
                    </span>
                  </div>
                  <div style={{
                    padding: '3px 10px', borderRadius: 8, flexShrink: 0,
                    backgroundColor: `${tColor}15`,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: tColor }}>{tLabel}</span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>
                  {truncate(camp.message, 80)}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, marginTop: 12,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IoSend size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {camp.sentCount || 0} sent
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IoTimeOutline size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatDate(camp.createdAt)}
                    </span>
                  </div>
                  {camp.deliveryMethod && camp.deliveryMethod !== 'both' && (
                    <div style={{
                      padding: '2px 8px', borderRadius: 6,
                      backgroundColor: 'var(--border)', fontSize: 10, fontWeight: 700,
                      color: 'var(--text-secondary)', textTransform: 'capitalize',
                    }}>
                      {camp.deliveryMethod}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Animated Modal */}
      {modal.visible && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--card-padding)', animation: 'modalOverlayIn 0.25s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340, backgroundColor: 'var(--bg-secondary)',
              borderRadius: 24, border: '1px solid var(--border)',
              padding: '32px 24px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              animation: 'modalContentIn 0.3s ease-out',
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: modal.type === 'success'
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              {modal.type === 'success' ? (
                <IoCheckmarkCircle size={32} color="#10B981" />
              ) : (
                <IoAlertCircle size={32} color="#EF4444" />
              )}
            </div>
            <span style={{
              fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8,
              textAlign: 'center',
            }}>
              {modal.type === 'success' ? 'Success' : 'Error'}
            </span>
            <span style={{
              fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center',
              lineHeight: 1.5, marginBottom: 24,
            }}>
              {modal.message}
            </span>
            <button
              onClick={closeModal}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                background: modal.type === 'success'
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
