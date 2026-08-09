import { IoChatbubble, IoGift, IoText, IoTimeOutline, IoStopCircle } from 'react-icons/io5'

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${month} ${day}, ${year} at ${h12}:${minutes} ${ampm}`
}

// Do two timestamps fall within the same clock minute?
export function sameMinute(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes()
  )
}

// Session boundary timestamp. Seconds are included when `includeSeconds` is
// set — used so a session that started and ended within the same minute never
// displays identical start/end times.
export function formatSessionTime(dateStr, includeSeconds = false) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  const time = includeSeconds ? `${h12}:${minutes}:${seconds}` : `${h12}:${minutes}`
  return `${month} ${day}, ${year} at ${time} ${ampm}`
}

// Format a session start → end range. If both boundaries fall within the same
// minute (a very short session), seconds are included so the two times don't
// look identical.
export function formatSessionRange(startTime, endTime) {
  if (!startTime) return ''
  if (!endTime) return `Started ${formatSessionTime(startTime)}`
  const includeSeconds = sameMinute(startTime, endTime)
  return `${formatSessionTime(startTime, includeSeconds)} → ${formatSessionTime(endTime, includeSeconds)}`
}

export function getGiftPriceByName(name) {
  if (!name) return 10
  const n = name.toLowerCase()
  if (n.includes('heart')) return 10
  if (n.includes('cane')) return 50
  if (n.includes('candy')) return 100
  if (n.includes('box')) return 300
  if (n.includes('wrapped') || n.includes('present')) return 500
  if (n.includes('coin') || n.includes('gold')) return 1000
  return 10
}

function SenderHeader({ name, avatarUrl, isSent, support }) {
  const avatar = support ? (
    <div style={{
      width: 24, height: 24, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(135deg, #FBBF24, #D97706)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, color: '#fff',
    }}>
      🛡️
    </div>
  ) : avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover', flexShrink: 0, backgroundColor: 'var(--border)' }}
      onError={e => { e.target.style.display = 'none' }}
    />
  ) : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      flexDirection: isSent ? 'row-reverse' : 'row',
      marginBottom: 5,
    }}>
      {avatar}
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: support ? '#FBBF24' : 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}
      </span>
    </div>
  )
}

export function MessageBubble({ item, avatarUrl, senderName, support = false }) {
  if (item.type === 'date') {
    return (
      <div style={{
        textAlign: 'center', padding: '8px 0', fontSize: 12,
        color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.3px',
      }}>
        {item.text}
      </div>
    )
  }

  if (item.type === 'system') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', margin: '8px 0',
      }}>
        <div style={{
          backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10,
          padding: '6px 14px', border: '1px solid rgba(245,158,11,0.3)',
          maxWidth: '85%', textAlign: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>{item.content}</span>
        </div>
      </div>
    )
  }

  if (item.type === 'gift') {
    const giftName = item.content ? item.content.replace('Sent a gift: ', '') : 'Gift'
    const giftIcon = item.mediaUrl || '🎁'
    const price = getGiftPriceByName(giftName)
    const giftCount = item.giftCount || 1

    let borderColors = ['#8B5CF6', '#EC4899']
    let bgColors = ['#0F0F1A', '#151522']
    let badgeText = 'Premium Surprise'
    let badgeBg = 'rgba(139, 92, 246, 0.15)'
    let textColor = '#C084FC'

    if (price >= 1000) {
      borderColors = ['#FBBF24', '#F59E0B']
      bgColors = ['#2E220F', '#181107']
      badgeText = '👑 Legendary Royal Gift'
      badgeBg = 'rgba(245, 158, 11, 0.2)'
      textColor = '#FBBF24'
    } else if (price >= 500) {
      borderColors = ['#F472B6', '#EC4899']
      bgColors = ['#2E101A', '#18080E']
      badgeText = '💝 Luxury Heart Gift'
      badgeBg = 'rgba(236, 72, 153, 0.2)'
      textColor = '#F472B6'
    } else if (price >= 300) {
      borderColors = ['#A78BFA', '#8B5CF6']
      bgColors = ['#1D0E35', '#0E071D']
      badgeText = '🎁 Special Gift Box'
      badgeBg = 'rgba(139, 92, 246, 0.2)'
      textColor = '#C084FC'
    } else if (price >= 100) {
      borderColors = ['#22D3EE', '#06B6D4']
      bgColors = ['#062330', '#031119']
      badgeText = '🍬 Delicious Gift'
      badgeBg = 'rgba(6, 182, 212, 0.2)'
      textColor = '#22D3EE'
    } else if (price >= 50) {
      borderColors = ['#FB7185', '#F43F5E']
      bgColors = ['#2A0E18', '#16070B']
      badgeText = '🍭 Sweet Treat'
      badgeBg = 'rgba(244, 63, 94, 0.2)'
      textColor = '#FB7185'
    } else {
      borderColors = ['#F87171', '#EF4444']
      bgColors = ['#250E0E', '#140707']
      badgeText = '❤️ Sweet Heart'
      badgeBg = 'rgba(239, 68, 68, 0.2)'
      textColor = '#F87171'
    }

    const isSent = item.senderModel === 'User' || item.isAdminMessage

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isSent ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}>
        <SenderHeader
          name={senderName}
          avatarUrl={avatarUrl}
          isSent={isSent}
          support={support}
        />
        <div style={{
          maxWidth: '85%', borderRadius: 16, padding: 14,
          background: `linear-gradient(135deg, ${bgColors[0]}, ${bgColors[1]})`,
          border: `1.5px solid ${borderColors[0]}40`,
          position: 'relative',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
          }}>
            <span style={{ fontSize: 24 }}>{giftIcon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
              {isSent ? (giftCount > 1 ? `Sent ${giftCount}X gifts` : 'You sent a gift!') : (giftCount > 1 ? `Received ${giftCount}X gifts` : 'Received a gift!')}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: textColor, marginBottom: 4 }}>
            {giftName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            🪙 {price * giftCount} Coins {giftCount > 1 ? `(${price} × ${giftCount})` : ''}
          </div>
          <div style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            backgroundColor: badgeBg, fontSize: 10, fontWeight: 700, color: textColor,
          }}>
            {badgeText}
          </div>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 6,
          }}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      </div>
    )
  }

  if (item.isAdminMessage) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', margin: '8px 0',
      }}>
        <div style={{
          maxWidth: '85%', borderRadius: 12, padding: '10px 14px',
          background: 'linear-gradient(135deg, #4F46E5, #1E1B4B)',
          border: '1.5px solid rgba(251, 191, 36, 0.4)',
        }}>
<div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #FBBF24, #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff',
          }}>
            🛡️
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24', letterSpacing: '0.8px' }}>
            MINGO SUPPORT
          </span>
        </div>
          <span style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>{item.content}</span>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 4,
          }}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      </div>
    )
  }

  const isSent = item.senderModel === 'User' || item.isAdminMessage

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isSent ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <SenderHeader
        name={senderName}
        avatarUrl={avatarUrl}
        isSent={isSent}
        support={support}
      />
      <div style={{
        maxWidth: '80%', borderRadius: 16, padding: '8px 12px',
        backgroundColor: isSent ? '#7C3AED' : '#1F2937',
        borderTopLeftRadius: isSent ? 16 : 4,
        borderTopRightRadius: isSent ? 4 : 16,
      }}>
        <span style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>{item.content}</span>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 2,
        }}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  )
}

export function insertDateLabels(msgs) {
  const result = []
  let lastDate = ''
  msgs.forEach((msg) => {
    const d = msg.createdAt ? new Date(msg.createdAt).toDateString() : ''
    if (d && d !== lastDate) {
      lastDate = d
      result.push({ id: `date-${d}`, type: 'date', text: formatDate(msg.createdAt) })
    }
    result.push(msg)
  })
  return result
}

export function ConversationSessionFooter({ session }) {
  if (!session) return null
  const active = session.active
  const statusColor = active ? '#22C55E' : '#9CA3AF'
  const statusBg = active ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.1)'

  const statStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '12px 14px', minWidth: 0,
  }

  return (
    <div style={{
      padding: 12, borderTop: '1px solid var(--border)',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 10, flexShrink: 0,
      backgroundColor: 'var(--bg-tertiary)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
    }}>
      {session.totalCoinsDeducted > 0 && (
        <div style={statStyle}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(251,191,36,0.12)', color: '#FBBF24',
          }}>
            <IoGift size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Coins Spent
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#FBBF24' }}>
              {session.totalCoinsDeducted.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {session.startTime && (
        <div style={statStyle}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(99,102,241,0.12)', color: '#818CF8',
          }}>
            <IoTimeOutline size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Started At
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatSessionTime(
                session.startTime,
                !!(session.endTime && sameMinute(session.startTime, session.endTime))
              )}
            </div>
          </div>
        </div>
      )}

      <div style={statStyle}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: statusBg, color: statusColor,
        }}>
          {active ? <IoText size={18} style={{ animation: 'pulse 2s infinite' }} /> : <IoStopCircle size={18} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              backgroundColor: statusColor, boxShadow: active ? `0 0 8px ${statusColor}` : 'none',
              animation: active ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: statusColor, textTransform: 'capitalize' }}>
              {active ? 'Active' : 'Ended'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmptyMessages({ icon = IoChatbubble, title = 'No messages in this conversation' }) {
  const Icon = icon
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
      <Icon size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
      <p style={{ fontSize: 13 }}>{title}</p>
    </div>
  )
}
