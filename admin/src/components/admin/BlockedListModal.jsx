import { useState, useEffect } from 'react'
import { IoClose, IoBan, IoPersonOutline } from 'react-icons/io5'
import { adminAPI } from '../../utils/api'

const CLOUDFRONT_URL = 'https://d3arutsevouzgm.cloudfront.net';
const getAvatarUrl = (gender, index) => {
  const i = Math.min(Math.max(parseInt(index, 10) || 0, 0), 49);
  const g = gender === 'Male' ? 'male' : 'female';
  return `${CLOUDFRONT_URL}/avatars/${g}_${i + 1}.png`;
}

export default function BlockedListModal({ visible, userId, userName, onClose }) {
  const [blockedList, setBlockedList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (visible && userId) {
      fetchBlockedList()
    } else {
      setBlockedList([])
      setError(null)
    }
  }, [visible, userId])

  const fetchBlockedList = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await adminAPI.getUserBlockedList(userId)
      setBlockedList(res.data || [])
    } catch (err) {
      console.error('Error fetching blocked list:', err)
      setError(err.message || 'Failed to fetch blocked accounts')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '85vh',
        backgroundColor: '#18181B', borderRadius: 16,
        border: '1px solid #27272A', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #27272A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#EF4444',
            }}>
              <IoBan size={22} />
            </div>
            <div>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: '#F4F4F5',
                margin: 0, fontFamily: 'sans-serif',
              }}>
                Blocked Accounts
              </h3>
              <p style={{ fontSize: 13, color: '#A1A1AA', margin: '2px 0 0' }}>
                Blocked by <strong style={{ color: '#E4E4E7' }}>{userName || 'User'}</strong> ({blockedList.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 18, border: 'none',
              backgroundColor: '#27272A', color: '#A1A1AA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#FFF'}
            onMouseOut={(e) => e.currentTarget.style.color = '#A1A1AA'}
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Content List */}
        <div style={{
          flex: 1, padding: '20px 24px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#A1A1AA', fontSize: 14 }}>
              Loading blocked accounts...
            </div>
          ) : error ? (
            <div style={{
              padding: '16px', borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444', fontSize: 13.5, textAlign: 'center',
            }}>
              {error}
            </div>
          ) : blockedList.length === 0 ? (
            <div style={{
              padding: '48px 20px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: '#27272A', color: '#71717A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IoPersonOutline size={28} />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#A1A1AA', fontWeight: 500 }}>
                No blocked accounts found.
              </p>
            </div>
          ) : (
            blockedList.map((item) => (
              <div key={item._id || item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', backgroundColor: '#27272A',
                borderRadius: 16, border: '1px solid #3F3F46',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img
                    src={getAvatarUrl(item.gender, item.avatarIndex)}
                    alt={item.name}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      objectFit: 'cover', backgroundColor: '#3F3F46',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://d3arutsevouzgm.cloudfront.net/avatars/male_1.png';
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#F4F4F5' }}>
                        {item.name}
                      </span>
                      {item.isBanned && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444',
                        }}>
                          BANNED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
                      @{item.username || 'user'} {item.phone ? `• ${item.phone}` : ''}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  backgroundColor: item.role === 'LISTENER' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: item.role === 'LISTENER' ? '#C084FC' : '#60A5FA',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {item.role || 'USER'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #27272A',
          display: 'flex', justifyContent: 'flex-end', backgroundColor: '#18181B',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 30, border: '1px solid #3F3F46',
              backgroundColor: 'transparent', color: '#E4E4E7', fontSize: 13.5,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#27272A'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
