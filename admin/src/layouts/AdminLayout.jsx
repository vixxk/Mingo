import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LogoutPopup from '../components/shared/LogoutPopup'
import { authAPI } from '../utils/api'
import {
  IoGrid, IoPeople, IoHeadset, IoCall, IoShieldCheckmark,
  IoSettings, IoLogOut, IoMenu, IoChevronForward, IoClose, IoChevronBack,
} from 'react-icons/io5'

const navItems = [
  { to: '/', icon: IoGrid, label: 'Dashboard' },
  { to: '/users', icon: IoPeople, label: 'Users' },
  { to: '/listeners', icon: IoHeadset, label: 'Listeners' },
  { to: '/sessions', icon: IoCall, label: 'Sessions' },
  { to: '/approvals', icon: IoShieldCheckmark, label: 'Approvals' },
  { to: '/settings', icon: IoSettings, label: 'Settings' },
]

function Tooltip({ label, visible, x, y }) {
  if (!visible) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translateY(-50%)',
        zIndex: 9999,
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        animation: 'scaleIn 0.15s ease-out',
      }}
    >
      {label}
    </div>
  )
}

export default function AdminLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutPopup, setShowLogoutPopup] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true'
  })
  const [hoveredItem, setHoveredItem] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('adminSidebarCollapsed', String(next))
      return next
    })
  }

  const sidebarWidth = collapsed ? 64 : 260

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // ignore
    }
    setShowLogoutPopup(false)
    navigate('/login')
  }

  const handleMouseEnterNavItem = (label, e) => {
    if (!collapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ x: rect.right + 12, y: rect.top + rect.height / 2 })
    setHoveredItem(label)
  }

  const handleMouseLeaveNavItem = () => {
    setHoveredItem(null)
  }

  const isActiveRoute = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
    }}>
      <style>{`@media (max-width: 600px) { .mobile-sidebar-open { width: 280px !important; } .mobile-main { margin-left: 0 !important; padding-top: 56px !important; } }`}</style>
      {/* Mobile menu toggle (hidden when sidebar open) */}
      <button
        onClick={() => setSidebarOpen(true)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 60,
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: isDesktop || sidebarOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
      >
        <IoMenu size={28} />
      </button>

      {/* Sidebar */}
      <aside
        className={isDesktop ? '' : (sidebarOpen ? 'mobile-sidebar-open' : '')}
        style={{
          width: sidebarWidth,
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 0',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isDesktop ? 'translateX(0)' : sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {
}
        <div style={{
          padding: collapsed ? '0' : '0 14px',
          marginBottom: collapsed ? 8 : 20,
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: collapsed ? 'center' : 'center',
          gap: collapsed ? 0 : 0,
          position: 'relative',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: collapsed ? 'center' : 'flex-start',
            flex: collapsed ? 0 : 1,
          }}>
            {/* Collapse toggle button (collapsed) */}
            {collapsed && isDesktop && (
              <button
                onClick={toggleCollapse}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  marginBottom: 12,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}                  >
                    <IoChevronForward size={14} />
              </button>
            )}
            <img
              src="/logo.png"
              alt="Mingo"
              style={{
                width: collapsed ? 40 : 50,
                height: collapsed ? 40 : 50,
                borderRadius: 12,
                objectFit: 'contain',
                flexShrink: 0,
                marginBottom: collapsed ? 6 : 12,
                transition: 'all 0.3s',
              }}
            />
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: collapsed ? 0 : 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              opacity: collapsed ? 0 : 1,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s, font-size 0.3s',
              lineHeight: 1.2,
            }}>
              Mingo
            </div>
            <div style={{
              fontSize: collapsed ? 0 : 14,
              color: 'var(--accent)',
              fontWeight: 600,
              opacity: collapsed ? 0 : 1,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}>
              Admin Panel
            </div>
          </div>
          {/* Collapse toggle button (expanded) */}
          {!collapsed && isDesktop && (
            <button
              onClick={toggleCollapse}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                marginTop: 2,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--accent)'
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.background = 'var(--accent-light)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'transparent'
              }}
>
                <IoChevronBack size={18} />
            </button>
          )}
          {/* Mobile close button inside sidebar */}
          {!isDesktop && sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--accent)'
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.background = 'var(--accent-light)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg-tertiary)'
              }}
            >
              <IoChevronBack size={24} />
            </button>
          )}
        </div>

        {/* Navigation */}          <nav style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          padding: collapsed ? '0 8px' : '0 10px',
          overflowY: 'auto',
          minHeight: 0,
        }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActiveRoute(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div
                  onMouseEnter={(e) => handleMouseEnterNavItem(item.label, e)}
                  onMouseLeave={handleMouseLeaveNavItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? '10px 8px' : '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    backgroundColor: active
                      ? collapsed
                        ? 'var(--accent-mid)'
                        : 'var(--accent-mid)'
                      : 'transparent',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                >
                  {/* Active indicator bar (collapsed) */}
                  {collapsed && active && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 22,
                      borderRadius: 4,
                      background: 'var(--accent-gradient)',
                    }} />
                  )}

                  {/* Icon with active glow */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  width: collapsed ? 28 : 22,
                  height: collapsed ? 28 : 22,
                    borderRadius: collapsed ? (active ? 'var(--radius-md)' : 'var(--radius-sm)') : 0,
                    backgroundColor: collapsed && active ? 'var(--accent-mid)' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                    <Icon
                      size={collapsed ? 20 : 20}
                      style={{
                        color: active ? 'var(--accent)' : undefined,
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>

                  {/* Label text */}
                  {!collapsed && (
                  <span style={{
                    opacity: 1,
                    transition: 'opacity 0.15s',
                    fontSize: 13.5,
                    backgroundImage: active ? 'var(--accent-gradient)' : undefined,
                    backgroundClip: active ? 'text' : undefined,
                    WebkitBackgroundClip: active ? 'text' : undefined,
                    WebkitTextFillColor: active ? 'transparent' : undefined,
                  }}>
                    {item.label}
                  </span>
                  )}
                </div>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom section - User + Logout */}
        <div style={{
          paddingLeft: collapsed ? '6px' : '12px',
          paddingRight: collapsed ? '6px' : '12px',
          paddingTop: 10,
          paddingBottom: 12,
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 5,
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {/* User avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '6px' : '10px 12px',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: collapsed ? 'var(--radius-md)' : '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              transition: 'border-radius 0.3s',
            }}>
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.15s',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
              }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--accent)',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}>
                Admin
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={() => setShowLogoutPopup(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
              width: '100%',
              padding: collapsed ? '10px 8px' : '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.12)'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <IoLogOut size={20} />
            {!collapsed && (
              <span style={{
                opacity: 1,
                transition: 'opacity 0.15s',
              }}>
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Custom tooltip for collapsed nav items */}
      {collapsed && hoveredItem && (
        <Tooltip label={hoveredItem} visible={true} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {/* Backdrop for mobile */}
      {sidebarOpen && !isDesktop && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 45,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Main content */}
      <main className="mobile-main" style={{
        flex: 1,
        marginLeft: isDesktop ? sidebarWidth : 0,
        paddingTop: isDesktop ? 0 : 60,
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          maxWidth: 'var(--container-max-width)',
          margin: '0 auto',
          padding: isDesktop ? 'var(--page-padding)' : '0',
        }}>
          <Outlet />
        </div>
      </main>

      <LogoutPopup
        visible={showLogoutPopup}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutPopup(false)}
      />
    </div>
  )
}
