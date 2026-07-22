import { useState, useEffect } from 'react'
import { IoClose, IoChatbubble, IoTrashOutline, IoBan, IoCheckmarkCircle, IoPersonOutline, IoGlobeOutline, IoWalletOutline, IoCalendarOutline, IoTimeOutline, IoTrashOutline as IoTrash, IoAdd } from 'react-icons/io5'
import { adminAPI } from '../../utils/api'
import ToastNotification from '../shared/ToastNotification'

const getAvatarUrl = (gender, index) => {
  const i = parseInt(index, 10) || 0
  const base = gender === 'Male' ? 'male_avatar_' : 'female_avatar_'
  const num = i + 1
  return `/images/${base}${num}_17769729${gender === 'Male' ? 1 : 3}${8440 + (num - 1) * 10000 || 5840 + (num - 1) * 10000}.png`
}

export default function UserDetailModal({ visible, user, onClose, onDelete, onBan }) {
  const [localInterests, setLocalInterests] = useState([])
  const [isEditingInterests, setIsEditingInterests] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [savingInterests, setSavingInterests] = useState(false)

  const [isMessaging, setIsMessaging] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => {
    if (user && user.interests) {
      setLocalInterests(user.interests)
    } else {
      setLocalInterests([])
    }
  }, [user])

  if (!user) return null

  const isBanned = user.isBanned || false

  const handleSaveInterests = async () => {
    try {
      setSavingInterests(true)
      await adminAPI.updateUserInterests(user.id, localInterests)
      user.interests = localInterests
      setIsEditingInterests(false)
      setToast({ visible: true, message: 'Interests updated successfully', type: 'success' })
    } catch {
      setToast({ visible: true, message: 'Failed to save interests', type: 'error' })
    } finally {
      setSavingInterests(false)
    }
  }

  const handleAddInterest = () => {
    const trimmed = newInterest.trim()
    if (trimmed && !localInterests.includes(trimmed)) {
      setLocalInterests([...localInterests, trimmed])
      setNewInterest('')
    }
  }

  const handleRemoveInterest = (indexToRemove) => {
    setLocalInterests(localInterests.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSendMessage = async () => {
    const trimmed = messageText.trim()
    if (!trimmed) return
    try {
      setSendingMessage(true)
      await adminAPI.sendAdminMessage(user.id, trimmed)
      setMessageText('')
      setIsMessaging(false)
      setToast({ visible: true, message: 'Message sent successfully', type: 'success' })
    } catch {
      setToast({ visible: true, message: 'Failed to send message', type: 'error' })
    } finally {
      setSendingMessage(false)
    }
  }

  const triggerBanConfirm = () => {
    setConfirmAction({
      type: 'ban',
      title: isBanned ? 'Unban User' : 'Ban User',
      desc: `Are you sure you want to ${isBanned ? 'unban' : 'ban'} ${user.name}?`,
      onConfirm: () => { onBan(user.id, isBanned); setConfirmAction(null) }
    })
  }

  const triggerDeleteConfirm = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete User Permanently',
      desc: `This action cannot be undone. All data for ${user.name} will be permanently removed.`,
      onConfirm: () => { onDelete(user.id); setConfirmAction(null) }
    })
  }

  if (!visible) return null

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

          <img src={getAvatarUrl(user.gender, user.avatarIndex)}
            style={{ width: 80, height: 80, borderRadius: 40, border: '3px solid var(--accent)', marginBottom: 10 }}
            alt="avatar"
          />
          <div style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}>
            {user.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.phone}</div>
          <div style={{
            padding: '4px 12px', borderRadius: 12, marginTop: 8, marginBottom: 12,
            backgroundColor: user.isBanned ? 'var(--error-light)' : user.isOnline ? 'var(--success-light)' : 'rgba(107,114,128,0.15)',
          }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: user.isBanned ? 'var(--error)' : user.isOnline ? 'var(--success)' : 'var(--text-muted)',
            }}>
              {user.isBanned ? 'Banned' : user.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', width: '100%', gap: 4, marginBottom: 16 }}>
            {[
              { label: 'App Opens', value: user.appOpens || 0 },
              { label: 'Time Spent', value: user.totalTimeSpent || '0h 0m' },
              { label: 'Calls', value: user.totalCalls || 0 },
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
              { label: 'Gender', value: user.gender || 'Not specified', icon: IoPersonOutline },
              { label: 'Language', value: user.language || 'English', icon: IoGlobeOutline },
              { label: 'Coins', value: `🪙 ${user.coins || 0}`, icon: IoWalletOutline },
              { label: 'Joined', value: user.joinDate || (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'), icon: IoCalendarOutline },
              { label: 'Last Active', value: user.lastActive || 'Recently', icon: IoTimeOutline },
              ...(user.isDeleted ? [{ label: 'Reason for Deletion', value: user.deletionReason || 'Not specified', icon: IoTrash }] : []),
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
                      fontSize: 13, color: item.label === 'Reason for Deletion' ? 'var(--warning)' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}>{item.value}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 16px' }} />}
                </div>
              )
            })}
          </div>

          {/* Interests */}
          <div style={{ width: '100%', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>Interests</span>
              {!isEditingInterests ? (
                <button onClick={() => setIsEditingInterests(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveInterests} disabled={savingInterests}
                    style={{ background: 'none', border: 'none', color: 'var(--success)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {savingInterests ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setIsEditingInterests(false); setLocalInterests(user.interests || []) }}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingInterests && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                  placeholder="Add new interest..."
                  onKeyDown={e => e.key === 'Enter' && handleAddInterest()}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: 12, color: 'var(--text-primary)', padding: '0 12px', height: 40,
                    fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={handleAddInterest}
                  style={{
                    width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--accent)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}>
                  <IoAdd size={20} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {localInterests.map((interest, i) => (
                <div key={i} style={{
                  backgroundColor: '#1F2937', padding: '5px 12px', borderRadius: 14,
                  border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 12, color: '#D1D5DB' }}>{interest}</span>
                  {isEditingInterests && (
                    <button onClick={() => handleRemoveInterest(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 0, display: 'flex' }}>
                      <IoClose size={14} />
                    </button>
                  )}
                </div>
              ))}
              {localInterests.length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>No interests listed</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button onClick={triggerBanConfirm}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                backgroundColor: isBanned ? 'var(--success-light)' : 'var(--error-light)',
                color: isBanned ? 'var(--success)' : 'var(--error)', fontSize: 14, fontWeight: 700,
              }}>
              <IoBan size={18} />
              {isBanned ? 'Unban User' : 'Ban User'}
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

          <button onClick={triggerDeleteConfirm}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer', marginTop: 8,
              backgroundColor: 'var(--error-light)', color: 'var(--error)', fontSize: 14, fontWeight: 700,
            }}>
            <IoTrashOutline size={18} />
            Delete User Permanently
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
              Send a support message directly to {user.name}.
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
              backgroundColor: confirmAction.type === 'delete' ? 'var(--error-light)' : 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              {confirmAction.type === 'delete'
                ? <IoTrashOutline size={28} color="var(--error)" />
                : <IoBan size={28} color="var(--accent)" />
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
