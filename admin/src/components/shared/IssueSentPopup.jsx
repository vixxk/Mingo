import { IoClose, IoCheckmarkCircle } from 'react-icons/io5'

export default function IssueSentPopup({ visible, onClose, title = 'Issue Sent', description = 'Your report has been received.' }) {
  if (!visible) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5%',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          animation: 'scaleIn 0.25s ease-out',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
        >
          <IoClose size={18} />
        </button>

        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          backgroundColor: 'var(--success-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <IoCheckmarkCircle size={44} color="var(--success)" />
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          color: 'var(--text-primary)',
          fontWeight: 800,
          margin: '0 0 12px',
          textAlign: 'center',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 14,
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.5,
          margin: '0 0 24px',
        }}>
          {description}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            background: 'var(--accent-gradient)',
            padding: '14px 0',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Okay
        </button>
      </div>
    </div>
  )
}
