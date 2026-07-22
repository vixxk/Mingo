import { useEffect, useState } from 'react'
import { IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoAlertCircle, IoClose } from 'react-icons/io5'

const icons = {
  success: { icon: IoCheckmarkCircle, color: 'var(--success)', borderColor: 'rgba(52,211,153,0.4)', bgColor: 'rgba(52,211,153,0.12)' },
  error: { icon: IoCloseCircle, color: 'var(--error)', borderColor: 'rgba(248,113,113,0.4)', bgColor: 'rgba(248,113,113,0.12)' },
  info: { icon: IoInformationCircle, color: 'var(--accent)', borderColor: 'var(--accent-mid)', bgColor: 'var(--accent-light)' },
  warning: { icon: IoAlertCircle, color: 'var(--warning)', borderColor: 'rgba(251,191,36,0.4)', bgColor: 'rgba(251,191,36,0.12)' },
}

export default function ToastNotification({ visible, message, type = 'success', onDismiss, duration = 3500 }) {
  const [show, setShow] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (visible && message) {
      setExiting(false)
      setShow(true)
      const timer = setTimeout(() => {
        setExiting(true)
        setTimeout(() => {
          setShow(false)
          onDismiss?.()
        }, 250)
      }, duration)
      return () => clearTimeout(timer)
    } else {
      setExiting(true)
      setTimeout(() => setShow(false), 250)
    }
  }, [visible, message, duration, onDismiss])

  if (!show) return null

  const config = icons[type] || icons.success
  const Icon = config.icon

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px 14px 16px',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
        backdropFilter: 'blur(16px)',
        gap: 12,
        minWidth: 320,
        maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
        animation: exiting ? 'slideUpFade 0.25s ease-in forwards' : 'slideDownFade 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: exiting ? 0 : 1,
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: `${config.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color={config.color} />
      </div>
      <span style={{
        color: 'var(--text-primary)',
        fontSize: 14,
        fontWeight: 600,
        flex: 1,
        fontFamily: 'var(--font-body)',
        lineHeight: 1.4,
      }}>
        {message}
      </span>
      <button
        onClick={() => {
          setExiting(true)
          setTimeout(() => {
            setShow(false)
            onDismiss?.()
          }, 250)
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        aria-label="Dismiss"
      >
        <IoClose size={16} />
      </button>
    </div>
  )
}
