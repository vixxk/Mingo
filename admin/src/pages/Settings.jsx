import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'
import LogoutPopup from '../components/shared/LogoutPopup'
import {
  IoSettingsOutline, IoMegaphoneOutline, IoStatsChartOutline,
  IoWalletOutline, IoCashOutline, IoBanOutline, IoFlagOutline,
  IoStarOutline, IoChevronForward, IoLogOut, IoPersonCircleOutline,
  IoChevronBack,
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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-header-title" style={{ color: 'var(--text-primary)', fontSize: 'var(--header-font-size)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Settings</h1>
          </div>
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
