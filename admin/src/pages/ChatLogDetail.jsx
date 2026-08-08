import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IoChatbubble, IoChevronBack,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'
import {
  MessageBubble, insertDateLabels, formatDate, ConversationSessionFooter, EmptyMessages,
} from '../components/admin/ChatMessage'

export default function ChatLogDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    setConversation(null)

    adminAPI.getChatLogDetail(id)
      .then(res => {
        const data = res.data || res
        const list = data.conversations || data.results || []
        setConversation(list[0] || null)
        if (!list[0]) setError('Conversation not found')
      })
      .catch(e => {
        console.error('Failed to fetch conversation:', e)
        setError(e.message || 'Failed to load conversation')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [conversation])

  const sessionStatusMeta = {
    active: { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    completed: { label: 'Completed', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
    cancelled: { label: 'Cancelled', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
    free: { label: 'Free Chat', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  }

  const getSenderInfo = (item) => {
    if (item.isAdminMessage) return { name: 'Mingo Support', support: true }
    const senderId = item.sender?.id
    const match = (conversation?.participants || []).find(p => String(p.id) === String(senderId))
    const base = 'https://mingo-avatars.s3.amazonaws.com'
    if (match) {
      return {
        name: match.name || 'Unknown',
        avatarUrl: `${base}/${match.gender || 'Female'}_${match.avatarIndex || 0}.png`,
        support: match.role === 'ADMIN' || String(match.role || '').endsWith('_ADMIN'),
      }
    }
    return { name: item.sender?.name || 'Unknown' }
  }

  // This card is ONE session — show its own status, duration and coin stats.
  const sInfo = conversation?.session || null
  const statusKey = sInfo ? sInfo.status : 'free'
  const status = sessionStatusMeta[statusKey] || { label: statusKey || 'Free Chat', color: '#9CA3AF', bg: 'var(--bg-tertiary)' }
  const rangeLabel = sInfo && sInfo.startTime
    ? (sInfo.endTime
        ? `${formatDate(sInfo.startTime)} → ${formatDate(sInfo.endTime)}`
        : `Started ${formatDate(sInfo.startTime)}`)
    : (conversation?.createdAt ? `Created ${formatDate(conversation.createdAt)}` : '')

  return (
    <div className="page-wrap" style={{ padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button className="back-btn"
          onClick={() => navigate('/chat-logs')}
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
            <IoChatbubble size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{
            fontSize: 'var(--header-font-size)', fontWeight: 800,
            color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px',
          }}>
            Chat Log Detail
          </h1>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={80} borderRadius={16} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <IoChatbubble size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{error}</p>
          <button
            onClick={() => navigate('/chat-logs')}
            style={{
              padding: '10px 24px', borderRadius: 999, border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-tertiary)', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', marginTop: 12,
            }}
          >
            Back to Chat Logs
          </button>
        </div>
      ) : conversation ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
          {/* Detail Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 0', borderBottom: '1px solid var(--border)',
            marginBottom: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'var(--border)', overflow: 'hidden', flexShrink: 0,
              border: conversation.isAdminConversation ? '2px solid #FBBF24' : 'none',
            }}>
              {conversation.isAdminConversation ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🛡️
                </div>
              ) : (
                <img
                  src={`https://mingo-avatars.s3.amazonaws.com/${conversation.otherParticipant?.gender || 'Female'}_${conversation.otherParticipant?.avatarIndex || 0}.png`}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: conversation.isAdminConversation ? '#FBBF24' : '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {conversation.isAdminConversation ? 'Mingo Support' : (conversation.otherParticipant?.name || 'Unknown')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {conversation.messageCount} messages · {status.label}
                {sInfo && sInfo.duration > 0 && ` · ${sInfo.duration} min`}
                {sInfo && sInfo.totalCoinsDeducted > 0 && ` · 🪙 ${sInfo.totalCoinsDeducted}`}
              </div>
              {rangeLabel && (
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {rangeLabel}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
                color: status.color, backgroundColor: status.bg, borderRadius: 6,
                padding: '3px 8px', whiteSpace: 'nowrap',
              }}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '8px 0',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {conversation.messages && conversation.messages.length === 0 ? (
              <EmptyMessages />
            ) : (
              insertDateLabels(conversation.messages || []).map((item, idx) => {
                const info = getSenderInfo(item)
                return (
                  <MessageBubble
                    key={item.id || idx}
                    item={item}
                    isListenerView={true}
                    avatarUrl={info.avatarUrl}
                    senderName={info.name}
                    support={info.support}
                  />
                )
              })
            )}
          </div>

          {/* Footer info */}
          <ConversationSessionFooter session={conversation.session} />
        </div>
      ) : null}
    </div>
  )
}
