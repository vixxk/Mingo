import { useState, useEffect, useRef } from 'react'
import {
  IoClose, IoChatbubble, IoTrashOutline, IoBan,
  IoCheckmarkCircle, IoAlertCircle, IoPersonOutline,
  IoGlobeOutline, IoWalletOutline, IoCalendarOutline,
  IoTimeOutline, IoStar, IoShieldCheckmark, IoMic,
  IoPlay, IoPause, IoEllipsisVertical, IoDownload,
} from 'react-icons/io5'
import { adminAPI } from '../../utils/api'
import ToastNotification from '../shared/ToastNotification'

const STATUS_MAP = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#1A150B' },
  approved: { label: 'Approved', color: '#10B981', bg: '#05120B' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#1A0B0B' },
  verified: { label: 'Verified', color: '#A855F7', bg: '#120B1A' },
  banned: { label: 'Banned', color: '#EF4444', bg: '#1A0B0B' },
  deleted: { label: 'Deleted', color: '#6B7280', bg: '#141414' },
  bestChoice: { label: 'Best Choice', color: '#A855F7', bg: '#1A0B2E' },
}

function getListenerStatus(listener) {
  if (listener.isBanned) return STATUS_MAP.banned
  if (listener.isDeleted) return STATUS_MAP.deleted
  if (listener.isBestChoice) return STATUS_MAP.bestChoice
  if (listener.isVerified || listener.status === 'verified') return STATUS_MAP.verified
  if (listener.status === 'approved') return STATUS_MAP.approved
  if (listener.status === 'pending') return STATUS_MAP.pending
  if (listener.status === 'rejected') return STATUS_MAP.rejected
  return STATUS_MAP.pending
}

const colors = ['#A855F7', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#7C3AED', '#14B8A6', '#8B5CF6']
function getAvatarColor(name) {
  let hash = 0
  if (!name) return colors[0]
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
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

export default function ListenerDetailModal({ visible, listener, onClose, onBan, onDelete, onRefresh }) {
  const [isMessaging, setIsMessaging] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [confirmAction, setConfirmAction] = useState(null)
  const [localListener, setLocalListener] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const audioRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (listener) {
      setLocalListener(listener)
      setPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setAudioLoaded(false)
      setPlaybackRate(1)
      setMenuOpen(false)
    }
  }, [listener])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate)
    if (audioRef.current) audioRef.current.playbackRate = rate
    setMenuOpen(false)
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !audioLoaded) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration
      if (isFinite(d) && d > 0) {
        setDuration(d)
        setAudioLoaded(true)
      }
    }
  }

  const handleSeek = (e) => {
    if (!audioLoaded) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    if (audioRef.current) {
      audioRef.current.currentTime = pct * duration
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (t) => {
    if (!t || !isFinite(t) || t < 0) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!visible || !localListener) return null

  const l = localListener
  const status = getListenerStatus(l)

  const handleToggleBan = () => {
    setConfirmAction({
      type: 'ban',
      title: l.isBanned ? 'Unban Listener' : 'Ban Listener',
      desc: `Are you sure you want to ${l.isBanned ? 'unban' : 'ban'} ${l.name}?`,
      onConfirm: async () => {
        await adminAPI.toggleBanListener(l._id || l.id)
        setLocalListener(prev => ({ ...prev, isBanned: !prev.isBanned }))
        if (onBan) onBan(l._id || l.id, l.isBanned)
        setConfirmAction(null)
        setToast({ visible: true, message: l.isBanned ? 'Listener unbanned' : 'Listener banned', type: 'success' })
      },
    })
  }

  const handleApprove = () => {
    setConfirmAction({
      type: 'approve',
      title: 'Approve Listener',
      desc: `Approve ${l.name} as a listener? They will be able to accept calls.`,
      onConfirm: async () => {
        await adminAPI.approveListener(l._id || l.id)
        setLocalListener(prev => ({ ...prev, status: 'approved' }))
        if (onRefresh) onRefresh()
        setConfirmAction(null)
        setToast({ visible: true, message: 'Listener approved', type: 'success' })
      },
    })
  }

  const handleReject = () => {
    setConfirmAction({
      type: 'reject',
      title: 'Reject Listener',
      desc: `Reject ${l.name}'s application to become a listener?`,
      onConfirm: async () => {
        await adminAPI.rejectListener(l._id || l.id)
        setLocalListener(prev => ({ ...prev, status: 'rejected' }))
        if (onRefresh) onRefresh()
        setConfirmAction(null)
        setToast({ visible: true, message: 'Listener rejected', type: 'success' })
      },
    })
  }

  const handleToggleVerified = () => {
    setConfirmAction({
      type: 'verified',
      title: l.isVerified ? 'Remove Verified Status' : 'Mark as Verified',
      desc: l.isVerified
        ? `Remove verified badge from ${l.name}?`
        : `Give ${l.name} the verified badge?`,
      onConfirm: async () => {
        await adminAPI.toggleVerified(l._id || l.id)
        setLocalListener(prev => ({ ...prev, isVerified: !prev.isVerified }))
        if (onRefresh) onRefresh()
        setConfirmAction(null)
        setToast({ visible: true, message: l.isVerified ? 'Verified status removed' : 'Listener verified', type: 'success' })
      },
    })
  }

  const handleToggleBestChoice = () => {
    setConfirmAction({
      type: 'bestChoice',
      title: l.isBestChoice ? 'Remove Best Choice' : 'Mark as Best Choice',
      desc: l.isBestChoice
        ? `Remove "${l.name}" from Best Choice?`
        : `Add "${l.name}" to Best Choice?`,
      onConfirm: async () => {
        await adminAPI.toggleBestChoice(l._id || l.id)
        setLocalListener(prev => ({ ...prev, isBestChoice: !prev.isBestChoice }))
        if (onRefresh) onRefresh()
        setConfirmAction(null)
        setToast({ visible: true, message: l.isBestChoice ? 'Removed from Best Choice' : 'Added to Best Choice', type: 'success' })
      },
    })
  }

  const handleDelete = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Listener Permanently',
      desc: `This action cannot be undone. All data for ${l.name} will be permanently removed.`,
      onConfirm: async () => {
        await adminAPI.deleteListener(l._id || l.id)
        setConfirmAction(null)
        if (onDelete) onDelete(l._id || l.id)
        onClose()
        setToast({ visible: true, message: 'Listener deleted', type: 'success' })
      },
    })
  }

  const handleSendMessage = async () => {
    const trimmed = messageText.trim()
    if (!trimmed) return
    try {
      setSendingMessage(true)
      await adminAPI.sendAdminMessage(l._id || l.id, trimmed)
      setMessageText('')
      setIsMessaging(false)
      setToast({ visible: true, message: 'Message sent successfully', type: 'success' })
    } catch {
      setToast({ visible: true, message: 'Failed to send message', type: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  const avatarColor = getAvatarColor(l.name)

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }} onClick={onClose}>
        <div style={{
          width: '100%', maxWidth: 500,
          backgroundColor: 'var(--bg-secondary)', borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: '20px 20px 0',
          border: '1px solid var(--border)',
          maxHeight: '85vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 20, width: 32, height: 32,
            borderRadius: 16, backgroundColor: 'var(--bg-tertiary)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-primary)', zIndex: 10,
          }}>
            <IoClose size={22} />
          </button>

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: 40, flexShrink: 0,
            border: '3px solid var(--accent)', marginBottom: 10,
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>
              {getInitials(l.name)}
            </span>
          </div>

          {/* Name & Phone */}
          <div style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', textAlign: 'center',
          }}>
            {l.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{l.phone}</div>

          {/* Status Badge */}
          <div style={{
            padding: '4px 12px', borderRadius: 12, marginTop: 8, marginBottom: 12,
            backgroundColor: status.bg,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: status.color }}>
              {status.label}
            </span>
          </div>

          {/* Extra tags */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {l.isVerified && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                color: '#A855F7', backgroundColor: '#A855F71a', border: '1px solid #A855F733',
              }}>
                Verified
              </span>
            )}
            {l.isBestChoice && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                color: '#A855F7', backgroundColor: '#A855F71a', border: '1px solid #A855F733',
              }}>
                Best Choice
              </span>
            )}
            {l.isOnline && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                color: '#10B981', backgroundColor: '#10B9811a', border: '1px solid #10B98133',
              }}>
                Online
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', width: '100%', gap: 4, marginBottom: 16 }}>
            {[
              { label: 'Rating', value: l.avgRating != null ? `${l.avgRating.toFixed(1)} ⭐` : '—' },
              { label: 'Sessions', value: l.totalSessions ?? l.sessionCount ?? 0 },
              { label: 'Earnings', value: l.totalEarnings != null ? `$${l.totalEarnings.toLocaleString()}` : '—' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 16, padding: '12px 4px', border: '1px solid var(--border)',
              }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div style={{
            width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: 18,
            border: '1px solid var(--border)', marginBottom: 16,
          }}>
            {[
              { label: 'Gender', value: l.gender || 'Not specified', icon: IoPersonOutline },
              { label: 'Age', value: l.age != null ? `${l.age}` : '—', icon: IoPersonOutline },
              { label: 'Language', value: l.language || 'English', icon: IoGlobeOutline },
              { label: 'Email', value: l.email || '—', icon: IoGlobeOutline },
              { label: 'Coins', value: `🪙 ${l.coins || 0}`, icon: IoWalletOutline },
              { label: 'Joined', value: l.createdAt ? formatDate(l.createdAt) : '—', icon: IoCalendarOutline },
              { label: 'Last Active', value: l.lastActive || l.lastActiveAt ? formatDate(l.lastActive || l.lastActiveAt) : 'Recently', icon: IoTimeOutline },
            ].map((item, i, arr) => {
              const Icon = item.icon
              return (
                <div key={i}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={16} color="var(--text-muted)" />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                    <span style={{
                      fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'right',
                    }}>{item.value}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 16px' }} />}
                </div>
              )
            })}
          </div>

          {/* Skills */}
          {l.skills && l.skills.length > 0 && (
            <div style={{ width: '100%', marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8 }}>
                Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {l.skills.map((skill, i) => (
                  <span key={i} style={{
                    backgroundColor: '#1F2937', padding: '5px 12px', borderRadius: 14,
                    border: '1px solid #374151', fontSize: 12, color: '#D1D5DB',
                  }}>
                    {typeof skill === 'string' ? skill : skill.name || skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {l.bio && (
            <div style={{ width: '100%', marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 6 }}>
                Bio
              </div>
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
                margin: 0, backgroundColor: 'var(--bg-tertiary)', borderRadius: 14,
                padding: '10px 14px', border: '1px solid var(--border)',
              }}>
                {l.bio}
              </p>
            </div>
          )}

          {/* Intro Audio */}
          {l.introAudioUrl && (
            <div style={{ width: '100%', marginBottom: 16 }}>
              <div style={{
                fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <IoMic size={16} />
                Intro Audio
              </div>
              <audio
                ref={audioRef}
                src={l.introAudioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => { setPlaying(false); setCurrentTime(0) }}
                onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate }}
                preload="metadata"
                style={{ display: 'none' }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: 'var(--bg-tertiary)', borderRadius: 14,
                padding: '10px 14px', border: '1px solid var(--border)',
              }}>
                <button onClick={togglePlay} disabled={!audioLoaded} style={{
                  width: 36, height: 36, borderRadius: 18, border: 'none',
                  background: audioLoaded ? 'var(--accent-gradient)' : 'var(--border)',
                  cursor: audioLoaded ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'transform 0.15s',
                  opacity: audioLoaded ? 1 : 0.5,
                }}
                  onMouseEnter={e => { if (audioLoaded) e.currentTarget.style.transform = 'scale(1.08)' }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {playing ? <IoPause size={16} color="#fff" /> : <IoPlay size={16} color="#fff" style={{ marginLeft: 2 }} />}
                </button>
                <div onClick={handleSeek} style={{
                  flex: 1, height: 4, borderRadius: 4,
                  backgroundColor: 'var(--border)', cursor: audioLoaded ? 'pointer' : 'default',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    width: audioLoaded ? `${Math.min(progressPct, 100)}%` : '0%',
                    height: '100%', borderRadius: 4,
                    background: 'var(--accent-gradient)',
                    transition: 'width 0.1s linear',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 70,
                  textAlign: 'right',
                }}>
                  {audioLoaded
                    ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                    : '--:-- / --:--'
                  }
                </span>

                {audioLoaded && (
                  <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={() => setMenuOpen(o => !o)} style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'transparent', color: 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <IoEllipsisVertical size={16} />
                    </button>
                    {menuOpen && (
                      <div style={{
                        position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                        backgroundColor: 'var(--bg-secondary)', borderRadius: 12,
                        border: '1px solid var(--border)', padding: 6, minWidth: 170,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 10,
                      }}>
                        <div style={{
                          fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
                          textTransform: 'uppercase', padding: '4px 10px 6px',
                          letterSpacing: '0.5px',
                        }}>
                          Playback Speed
                        </div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                          <button key={rate} onClick={() => changePlaybackRate(rate)} style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '7px 10px',
                            borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: playbackRate === rate ? 'var(--accent-mid)' : 'transparent',
                            color: playbackRate === rate ? 'var(--accent)' : 'var(--text-secondary)',
                            fontSize: 12, fontWeight: playbackRate === rate ? 700 : 500,
                          }}>
                            <span>{rate}x</span>
                            {playbackRate === rate && (
                              <span style={{ fontSize: 10, color: 'var(--accent)' }}>✓</span>
                            )}
                          </button>
                        ))}
                        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />
                        <a href={l.introAudioUrl} download style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px', borderRadius: 8, textDecoration: 'none',
                          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
                        }}>
                          <IoDownload size={14} />
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button onClick={handleToggleBan}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                backgroundColor: l.isBanned ? 'var(--success-light)' : 'var(--error-light)',
                color: l.isBanned ? 'var(--success)' : 'var(--error)', fontSize: 14, fontWeight: 700,
              }}>
              <IoBan size={18} />
              {l.isBanned ? 'Unban' : 'Ban'}
            </button>
            <button onClick={() => setIsMessaging(true)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontSize: 14, fontWeight: 700,
              }}>
              <IoChatbubble size={18} />
              Message
            </button>
          </div>

          {/* Status-specific & Toggle actions */}
          <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
            {(l.status === 'pending') && (
              <>
                <button onClick={handleApprove}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                    backgroundColor: 'var(--success-light)', color: 'var(--success)', fontSize: 14, fontWeight: 700,
                  }}>
                  <IoCheckmarkCircle size={18} />
                  Approve
                </button>
                <button onClick={handleReject}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                    backgroundColor: 'var(--error-light)', color: 'var(--error)', fontSize: 14, fontWeight: 700,
                  }}>
                  <IoAlertCircle size={18} />
                  Reject
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
            <button onClick={handleToggleVerified}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                backgroundColor: l.isVerified ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                color: l.isVerified ? '#EF4444' : '#A855F7', fontSize: 14, fontWeight: 700,
              }}>
              <IoShieldCheckmark size={18} />
              {l.isVerified ? 'Remove Verified' : 'Verify'}
            </button>
            <button onClick={handleToggleBestChoice}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                backgroundColor: l.isBestChoice ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                color: l.isBestChoice ? '#EF4444' : '#A855F7', fontSize: 14, fontWeight: 700,
              }}>
              <IoStar size={18} />
              {l.isBestChoice ? 'Remove Best Choice' : 'Best Choice'}
            </button>
          </div>

          <button onClick={handleDelete}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer', marginTop: 8,
              backgroundColor: 'var(--error-light)', color: 'var(--error)', fontSize: 14, fontWeight: 700,
            }}>
            <IoTrashOutline size={18} />
            Delete Listener Permanently
          </button>

          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* Message Dialog */}
      {isMessaging && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '5%',
        }}>
          <div style={{
            width: '100%', maxWidth: 400, backgroundColor: 'var(--bg-secondary)',
            borderRadius: 24, padding: '24px 24px', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <IoChatbubble size={28} color="var(--accent)" />
            </div>
            <h3 style={{
              fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)', margin: '0 0 8px',
            }}>
              Send Message
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 20px' }}>
              Send a support message directly to {l.name}.
            </p>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              style={{
                width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 14, color: 'var(--text-primary)', padding: 12, fontSize: 13.5,
                outline: 'none', resize: 'none', marginBottom: 20, fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button onClick={() => { setIsMessaging(false); setMessageText('') }} disabled={sendingMessage}
                style={{
                  flex: 1, height: 44, borderRadius: 30, border: '1.5px solid #3F3F46',
                  backgroundColor: 'transparent', color: '#A1A1AA', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}
                style={{
                  flex: 1, height: 44, borderRadius: 30, border: 'none', cursor: 'pointer',
                  background: 'var(--accent-gradient)',
                  color: '#FFF', fontSize: 14, fontWeight: 700,
                }}>
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '5%',
        }}>
          <div style={{
            width: '100%', maxWidth: 400, backgroundColor: 'var(--bg-secondary)',
            borderRadius: 24, padding: '24px 24px', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: confirmAction.type === 'delete'
                ? 'var(--error-light)'
                : confirmAction.type === 'ban'
                  ? 'var(--error-light)'
                  : 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              {confirmAction.type === 'delete'
                ? <IoTrashOutline size={28} color="var(--error)" />
                : confirmAction.type === 'ban'
                  ? <IoBan size={28} color="var(--accent)" />
                  : confirmAction.type === 'reject'
                    ? <IoAlertCircle size={28} color="#EF4444" />
                    : <IoCheckmarkCircle size={28} color="#10B981" />
              }
            </div>
            <h3 style={{
              fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)', margin: '0 0 8px',
            }}>
              {confirmAction.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
              {confirmAction.desc}
            </p>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button onClick={() => setConfirmAction(null)}
                style={{
                  flex: 1, height: 44, borderRadius: 30, border: '1.5px solid #3F3F46',
                  backgroundColor: 'transparent', color: '#A1A1AA', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button onClick={confirmAction.onConfirm}
                style={{
                  flex: 1, height: 44, borderRadius: 30, border: 'none', cursor: 'pointer',
                  background: confirmAction.type === 'delete'
                    ? 'linear-gradient(to right, var(--error), #DC2626)'
                    : confirmAction.type === 'reject'
                      ? 'linear-gradient(to right, #EF4444, #DC2626)'
                      : 'var(--accent-gradient)',
                  color: '#FFF', fontSize: 14, fontWeight: 700,
                }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </>
  )
}
