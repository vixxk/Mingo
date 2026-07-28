import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [digits, setDigits] = useState('')
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!digits || !passcode) return
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login({ phone: digits, otp: passcode })
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

  return (
    <div className="page-wrap" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        .login-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .login-blob--top {
          top: -50%;
          right: -30%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--accent-light) 0%, transparent 70%);
        }
        .login-blob--bottom {
          bottom: -40%;
          left: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--accent-light) 0%, transparent 70%);
        }
        @media (max-width: 600px) {
          .page-wrap {
            min-height: 100vh !important;
          }
          .login-blob--top {
            width: 300px;
            height: 300px;
            top: -30%;
            right: -40%;
          }
          .login-blob--bottom {
            width: 250px;
            height: 250px;
            bottom: -20%;
            left: -30%;
          }
        }
      `}</style>
      <div className="login-blob login-blob--top" />
      <div className="login-blob login-blob--bottom" />

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
          <h1 className="page-header-title" style={{
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
            Enter the digits and passcode to sign in
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

        <label style={{
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 8,
          display: 'block',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Enter the digits
        </label>
        <input
          value={digits}
          onChange={e => setDigits(e.target.value)}
          placeholder="Phone number or username"
          type="text"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
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

        <label style={{
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 8,
          display: 'block',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Enter the passcode
        </label>
        <input
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          placeholder="Passcode"
          type="password"
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
          onClick={handleLogin}
          disabled={loading || !digits || !passcode}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading || !digits || !passcode ? 'not-allowed' : 'pointer',
            background: loading || !digits || !passcode ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
            padding: '14px 0',
            color: loading || !digits || !passcode ? 'var(--text-muted)' : '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            transition: 'opacity 0.2s',
            opacity: loading || !digits || !passcode ? 0.6 : 1,
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
              Signing in...
            </span>
          ) : 'Login'}
        </button>
      </div>
    </div>
  )
}