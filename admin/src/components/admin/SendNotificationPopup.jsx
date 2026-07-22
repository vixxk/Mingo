import { useState } from 'react'
import { IoClose, IoSend, IoPaperPlane } from 'react-icons/io5'
import IssueSentPopup from '../shared/IssueSentPopup'

export default function SendNotificationPopup({ visible, onClose }) {
  const [target, setTarget] = useState('all')
  const [heading, setHeading] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    setIsSending(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setShowSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setHeading('')
    setMessage('')
    setTarget('all')
    onClose()
  }

  if (!visible) return null

  return (
    <>
      {!showSuccess && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '5%',
        }} onClick={onClose}>
          <div style={{
            width: '100%', maxWidth: 400, backgroundColor: '#141414',
            borderRadius: 24, border: '1px solid #1F1F1F', padding: '5%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(168,85,247,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <IoPaperPlane size={20} color="#A855F7" />
              </div>
              <span style={{ flex: 1, fontSize: 18, fontWeight: 800, color: '#fff' }}>Send Notification</span>
              <button onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F1F1F',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#9CA3AF',
                }}>
                <IoClose size={20} />
              </button>
            </div>

            <label style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600, marginBottom: 8, display: 'block' }}>Send To</label>
            <div style={{
              display: 'flex', backgroundColor: '#000', borderRadius: 12,
              padding: 4, border: '1px solid #1F1F1F', marginBottom: 16,
            }}>
              {['all', 'users', 'listeners'].map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  style={{
                    flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 8,
                    border: 'none', background: target === t ? '#2D1B36' : 'transparent',
                    color: target === t ? '#A855F7' : '#6B7280',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600, marginBottom: 8, display: 'block' }}>Heading (Optional)</label>
            <div style={{
              backgroundColor: '#000', borderRadius: 12, border: '1px solid #1F1F1F',
              padding: '0 12px', marginBottom: 16,
            }}>
              <input
                value={heading}
                onChange={e => setHeading(e.target.value)}
                placeholder="e.g., Special Offer! 🎉"
                maxLength={50}
                style={{
                  width: '100%', background: 'none', border: 'none', color: '#fff',
                  fontSize: 14, padding: '12px 0', outline: 'none',
                }}
              />
            </div>

            <label style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Message Body <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here..."
              maxLength={200}
              rows={3}
              style={{
                width: '100%', backgroundColor: '#000', border: '1px solid #1F1F1F',
                borderRadius: 12, color: '#fff', padding: 12, fontSize: 14,
                outline: 'none', resize: 'none', marginBottom: 16, fontFamily: 'inherit',
              }}
            />

            <button onClick={handleSend} disabled={isSending}
              style={{
                width: '100%', border: 'none', borderRadius: 16, cursor: 'pointer',
                background: 'linear-gradient(to right, #A855F7, #7E22CE)',
                padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: '#fff', fontSize: 16, fontWeight: 700,
              }}>
              <IoSend size={16} />
              {isSending ? 'Sending...' : 'Send Push Notification'}
            </button>
          </div>
        </div>
      )}

      <IssueSentPopup
        visible={showSuccess}
        onClose={handleCloseSuccess}
        title="Notification Sent"
        description={`Notification successfully sent to ${target === 'all' ? 'everyone' : target}!`}
      />
    </>
  )
}
