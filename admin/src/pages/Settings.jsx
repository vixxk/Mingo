import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI, adminAPI } from '../utils/api'
import LogoutPopup from '../components/shared/LogoutPopup'
import {
  IoSettings, IoMegaphoneOutline, IoStatsChartOutline,
  IoWalletOutline, IoCashOutline, IoBanOutline, IoFlagOutline,
  IoStarOutline, IoChevronForward, IoLogOut, IoPersonCircleOutline,
  IoChevronBack, IoMusicalNotes, IoPlay, IoPause, IoCloudUploadOutline,
  IoCheckmarkCircle, IoAlertCircle, IoTrashOutline,
} from 'react-icons/io5'

const platformLinks = [
  { label: 'Push Campaigns', icon: IoMegaphoneOutline, path: '/notifications' },
  { label: 'Analytics', icon: IoStatsChartOutline, path: '/analytics' },
  { label: 'Wallet', icon: IoWalletOutline, path: '/wallet' },
  { label: 'Payouts', icon: IoCashOutline, path: '/payouts' },
]

const managementLinks = [
  { label: 'Banned Members', icon: IoBanOutline, path: '/banned' },
  { label: 'Reports', icon: IoFlagOutline, path: '/reports' },
  { label: 'Best Choice', icon: IoStarOutline, path: '/best-choice' },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showLogoutPopup, setShowLogoutPopup] = useState(false)

  // Ringtone State
  const [ringtoneUrl, setRingtoneUrl] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingRingtone, setSavingRingtone] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchSystemSettings()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchSystemSettings = async () => {
    try {
      setLoadingSettings(true)
      const res = await adminAPI.getSettings()
      if (res?.data?.customRingtoneUrl) {
        setRingtoneUrl(res.data.customRingtoneUrl)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoadingSettings(false)
    }
  }

  const navigateTo = (path) => {
    window.scrollTo(0, 0)
    navigate(path)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      console.warn('Logout error:', e)
    }
    setShowLogoutPopup(false)
    window.scrollTo(0, 0)
    navigate('/login')
  }

  const handlePlayToggle = () => {
    if (!ringtoneUrl) return
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(ringtoneUrl)
      audioRef.current = audio
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error('Audio playback error:', err)
        setFeedback({ type: 'error', message: 'Unable to play audio from URL' })
        setIsPlaying(false)
      })
      audio.onended = () => setIsPlaying(false)
    }
  }

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      setFeedback({ type: 'error', message: 'Please select a valid audio file (.mp3, .wav, .m4a)' })
      return
    }

    try {
      setUploadingAudio(true)
      setFeedback({ type: '', message: '' })

      const uploadUrlRes = await adminAPI.getRingtoneUploadUrl({
        fileName: file.name,
        fileType: file.type || 'audio/mpeg',
      })

      const { uploadUrl, fileUrl } = uploadUrlRes.data

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      setRingtoneUrl(fileUrl)
      setFeedback({ type: 'success', message: 'Audio uploaded successfully! Don\'t forget to click Save.' })
    } catch (err) {
      console.error('Upload error:', err)
      setFeedback({ type: 'error', message: err.message || 'Audio upload failed' })
    } finally {
      setUploadingAudio(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveRingtone = async () => {
    try {
      setSavingRingtone(true)
      setFeedback({ type: '', message: '' })
      await adminAPI.updateSettings({ customRingtoneUrl: ringtoneUrl.trim() })
      setFeedback({ type: 'success', message: 'Incoming call ringtone updated successfully!' })
      setTimeout(() => setFeedback({ type: '', message: '' }), 4000)
    } catch (err) {
      console.error('Save ringtone error:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to save ringtone' })
    } finally {
      setSavingRingtone(false)
    }
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <button className="back-btn" onClick={() => navigate(-1)}
          style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12,
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <IoChevronBack size={20} color="#fff" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div className="icon-box" style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IoSettings size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{ color: 'var(--text-primary)', fontSize: 'var(--header-font-size)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Settings</h1>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="profile-card" style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        padding: 'var(--card-padding)', marginBottom: 'var(--section-gap)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="profile-avatar" style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IoPersonCircleOutline size={36} color="var(--text-muted)" />
          </div>
          <div>
            <h2 className="profile-name" style={{
              fontSize: 20, fontWeight: 800, color: '#fff', margin: 0,
            }}>
              {user?.name || 'Admin'}
            </h2>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 4, padding: '3px 10px', borderRadius: 6,
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--accent)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Incoming Call Ringtone Settings ─── */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        padding: 'var(--card-padding)', marginBottom: 'var(--section-gap)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IoMusicalNotes size={20} color="#EF4444" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
              Incoming Call Ringtone
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Set custom audio played on listener's app during incoming call ring
            </p>
          </div>
        </div>

        {feedback.message && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12,
            marginBottom: 14, fontSize: 13, fontWeight: 600,
            backgroundColor: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            border: feedback.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
            color: feedback.type === 'error' ? '#FCA5A5' : '#86EFAC',
          }}>
            {feedback.type === 'error' ? <IoAlertCircle size={18} /> : <IoCheckmarkCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Paste audio file URL (.mp3, .wav) or upload below"
              value={ringtoneUrl}
              onChange={(e) => setRingtoneUrl(e.target.value)}
              disabled={loadingSettings || savingRingtone || uploadingAudio}
              style={{
                flex: 1, minWidth: 240, padding: '12px 16px', borderRadius: 14,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            {ringtoneUrl ? (
              <button
                onClick={handlePlayToggle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 44,
                  borderRadius: 14, backgroundColor: isPlaying ? '#EF4444' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border)', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {isPlaying ? <IoPause size={18} /> : <IoPlay size={18} />}
                <span>{isPlaying ? 'Pause' : 'Test Play'}</span>
              </button>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a"
              onChange={handleAudioUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAudio || savingRingtone}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                color: '#E5E7EB', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <IoCloudUploadOutline size={18} color="#A855F7" />
              <span>{uploadingAudio ? 'Uploading audio...' : 'Upload Ringtone File'}</span>
            </button>

            {ringtoneUrl && (
              <button
                onClick={() => setRingtoneUrl('')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 12,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#FCA5A5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <IoTrashOutline size={16} />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={handleSaveRingtone}
              disabled={savingRingtone || uploadingAudio}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12,
                background: 'linear-gradient(to right, #EF4444, #B91C1C)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              <span>{savingRingtone ? 'Saving...' : 'Save Ringtone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Control */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        padding: 'var(--card-padding)', marginBottom: 'var(--section-gap)',
      }}>
        <h3 style={{
        fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)',
        margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        Platform Control
      </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {platformLinks.map((link) => {
            const Icon = link.icon
            return (
              <button className="settings-link-btn"
                key={link.label}
                onClick={() => navigateTo(link.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 16,
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2F2F2F'
                  e.currentTarget.style.backgroundColor = '#1A1A1A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
              >
                <div className="settings-icon" style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} color="var(--accent)" />
                </div>
                <span className="settings-label" style={{
                  flex: 1, fontSize: 15, fontWeight: 600, color: '#E5E7EB',
                }}>
                  {link.label}
                </span>
                <IoChevronForward size={18} color="#4B5563" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Management */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
        padding: 'var(--card-padding)', marginBottom: 'var(--section-gap)',
      }}>
        <h3 style={{
        fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)',
        margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        Management
      </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {managementLinks.map((link) => {
            const Icon = link.icon
            return (
              <button className="settings-link-btn"
                key={link.label}
                onClick={() => navigateTo(link.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 16,
                  backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2F2F2F'
                  e.currentTarget.style.backgroundColor = '#1A1A1A'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
              >
                <div className="settings-icon" style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} color="var(--accent)" />
                </div>
                <span className="settings-label" style={{
                  flex: 1, fontSize: 15, fontWeight: 600, color: '#E5E7EB',
                }}>
                  {link.label}
                </span>
                <IoChevronForward size={18} color="#4B5563" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Logout */}
      <button className="logout-btn"
        onClick={() => setShowLogoutPopup(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '18px 24px', borderRadius: 16, border: 'none',
          background: 'linear-gradient(to right, #EF4444, #B91C1C)',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        <IoLogOut size={20} />
        Logout
      </button>

      <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
        <span style={{ fontSize: 12, color: '#4B5563' }}>
          Version 1.0.0
        </span>
      </div>

      <LogoutPopup
        visible={showLogoutPopup}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutPopup(false)}
      />
    </div>
  )
}
