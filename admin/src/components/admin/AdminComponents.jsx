export function StatCard({ title, value, icon, trend, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderLeftColor = 'var(--border-light)'
        e.currentTarget.style.borderRightColor = 'var(--border-light)'
        e.currentTarget.style.borderBottomColor = 'var(--border-light)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderLeftColor = ''
        e.currentTarget.style.borderRightColor = ''
        e.currentTarget.style.borderBottomColor = ''
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {title}
        </span>
        {icon && (
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 800,
        color: 'var(--text-primary)',
        lineHeight: 1.1,
        letterSpacing: '-0.5px',
      }}>
        {value}
      </div>
      {trend && (
        <div style={{
          fontSize: 11,
          color: trend > 0 ? 'var(--success)' : 'var(--error)',
          fontWeight: 600,
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span>{trend > 0 ? '↑' : '↓'}</span>
          {Math.abs(trend)}%
        </div>
      )}
      {subtitle && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

export function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 9999,
        backgroundColor: active ? 'var(--accent)' : 'var(--bg-tertiary)',
        border: active ? 'none' : '1px solid var(--border)',
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}

export function StatusBadge({ status, color }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 9999,
      backgroundColor: `${color}18`,
      border: `1px solid ${color}25`,
    }}>
      <div style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: color,
      }} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    </div>
  )
}

export function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 17,
      fontWeight: 700,
      color: 'var(--text-primary)',
      margin: '0 0 16px',
      letterSpacing: '-0.2px',
    }}>
      {children}
    </h2>
  )
}

export function ActivityItem({ activity, isLast }) {
  const color = activity.color || 'var(--info)'
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {activity.user}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 1,
          }}>
            {activity.action}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            {activity.time}
          </div>
          {activity.exactTime && (
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}>
              {activity.exactTime}
            </div>
          )}
        </div>
      </div>
      {!isLast && (
        <div style={{
          height: 1,
          backgroundColor: 'var(--border)',
          margin: '0 0 0 48px',
        }} />
      )}
    </div>
  )
}
