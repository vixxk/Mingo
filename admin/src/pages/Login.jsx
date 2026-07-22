import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'


export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async () => {
    if (!phone) return
    setLoading(true)
    setError('')
    try {
      await authAPI.loginSendOtp(phone)
      setStep('otp')
    } catch (e) {
      setError(e.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) return
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login({ phone, otp })
      const userData = res.data?.user
      const token = res.data?.token

      if (userData && token) {
        login(userData, token)
        navigate('/')
      } else {
        setError('Invalid credentials')
      }
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setOtp('')
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-30%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-40%',
        left: '-20%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="login-card" style={{
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border)',
        padding: 40,
        position: 'relative',
        animation: 'slideUp 0.4s ease-out',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logo.png"
            alt="Mingo"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: '0 auto 0',
              display: 'block',
              objectFit: 'contain',
            }}
          />
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '16px 0 4px',
            letterSpacing: '-0.3px',
          }}>
            Mingo
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 14,
            margin: 0,
          }}>
            {step === 'phone' ? 'Sign in to your admin account' : 'Enter the verification code'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--error-light)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: 'var(--error)',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 16,
            animation: 'slideDown 0.2s ease-out',
          }}>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <>
            <label style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Phone Number
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '14px 16px',
                fontSize: 15,
                outline: 'none',
                marginBottom: 20,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={handleSendOtp}
              disabled={loading || !phone}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: loading || !phone ? 'not-allowed' : 'pointer',
                background: loading || !phone ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                padding: '14px 0',
                color: loading || !phone ? 'var(--text-muted)' : '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                transition: 'opacity 0.2s',
                opacity: loading || !phone ? 0.6 : 1,
              }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }} />
                  Sending...
                </span>
              ) : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <label style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Verification Code
            </label>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="0000"
              type="text"
              maxLength={6}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '14px 16px',
                fontSize: 20,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                outline: 'none',
                marginBottom: 12,
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: 10,
              }}
            />
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 20,
            }}>
              Sent to <strong style={{ color: 'var(--text-secondary)' }}>{phone}</strong>
            </p>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || !otp}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: loading || !otp ? 'not-allowed' : 'pointer',
                background: loading || !otp ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                padding: '14px 0',
                color: loading || !otp ? 'var(--text-muted)' : '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                marginBottom: 12,
                transition: 'opacity 0.2s',
                opacity: loading || !otp ? 0.6 : 1,
              }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }} />
                  Verifying...
                </span>
              ) : 'Verify & Sign In'}
            </button>
            <button
              onClick={handleBack}
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: 'transparent',
                padding: '12px 0',
                color: 'var(--text-muted)',
                fontSize: 14,
                fontWeight: 600,
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border-light)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
